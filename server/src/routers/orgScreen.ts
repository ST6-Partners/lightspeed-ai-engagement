// ============================================================
// ORG SCREEN router — tree + Priorities / Engagement / 9 Box tabs
// AI Engagement (4-Lightspeed) — spec: AIE Org Screen Spec v1
//
// Built on the existing `users` table (org via users.managerId). tRPC, not
// REST (app convention). Read procedures are protected; write/admin
// procedures gate by role (requireManager to rate 9 Box, requireAdmin for CRUD).
// ============================================================

import { z } from 'zod';
import { eq, inArray, asc, desc, and, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { requireManager, requireAdmin } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';
import { okrNodes } from '../db/schema/okr.js';
import { priorities, nineBoxRatings, engagementSnapshots } from '../db/schema/orgScreen.js';

const itemType = z.enum(['objective', 'key_result', 'task', 'ktbr']);

export const orgScreenRouter = router({
  // ---- Tree: all active users with resolved title/dept, for the org tree ----
  tree: protectedProcedure.query(async ({ ctx }) => {
    const [people, titles, depts] = await Promise.all([
      ctx.db.query.users.findMany(),
      ctx.db.query.jobTitles.findMany(),
      ctx.db.query.departments.findMany(),
    ]);
    const titleById = new Map(titles.map((t) => [t.id, t.title]));
    const deptById = new Map(depts.map((d) => [d.id, d.name]));
    return {
      people: people
        .filter((u) => u.isActive)
        .map((u) => ({
          id: u.id,
          name: u.name ?? u.email,
          title: (u.jobTitleId ? titleById.get(u.jobTitleId) : null) ?? u.title ?? null,
          dept: u.departmentId ? deptById.get(u.departmentId) ?? null : null,
          managerId: u.managerId ?? null,
          leaderBadge: u.leaderBadge ?? null,
          role: u.role,
        })),
    };
  }),

  // ---- Priorities tab (read) ----
  prioritiesByUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.priorities.findMany({
        where: and(eq(priorities.userId, input.userId), isNull(priorities.weekStart)),
        orderBy: [asc(priorities.sortOrder), asc(priorities.createdAt)],
      });
      const nodeIds = rows.map((r) => r.okrNodeId).filter((x): x is string => !!x);
      const nodes = nodeIds.length
        ? await ctx.db.query.okrNodes.findMany({ where: inArray(okrNodes.id, nodeIds) })
        : [];
      const nodeById = new Map(nodes.map((n) => [n.id, n]));
      return {
        hasData: rows.length > 0,
        items: rows.map((r) => {
          const node = r.okrNodeId ? nodeById.get(r.okrNodeId) : null;
          return {
            id: r.id,
            itemType: r.itemType,
            label: r.itemType === 'ktbr' ? (r.ktbrLabel ?? '') : (node?.title ?? '(missing item)'),
            sortOrder: r.sortOrder,
          };
        }),
      };
    }),

  // ---- Engagement tab (read) — headline score + trend + drivers ----
  engagementByUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const snaps = await ctx.db.query.engagementSnapshots.findMany({
        where: eq(engagementSnapshots.userId, input.userId),
        orderBy: [asc(engagementSnapshots.asOf)],
      });
      if (snaps.length === 0) return { hasData: false, score: null, trend: [], drivers: [] };
      const latest = snaps[snaps.length - 1];
      return {
        hasData: true,
        score: latest.score,
        trend: snaps.map((s) => ({ asOf: s.asOf, score: s.score })),
        drivers: latest.drivers ?? [],
      };
    }),

  // ---- 9 Box (read + inline rate) ----
  nineboxByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .query(async ({ ctx, input }) => {
      if (input.ids.length === 0) return { people: [] };
      const [people, ratings] = await Promise.all([
        ctx.db.query.users.findMany({ where: inArray(users.id, input.ids) }),
        ctx.db.query.nineBoxRatings.findMany({
          where: inArray(nineBoxRatings.userId, input.ids),
          orderBy: [desc(nineBoxRatings.ratedAt)],
        }),
      ]);
      const latestByUser = new Map<string, typeof ratings[number]>();
      for (const r of ratings) if (!latestByUser.has(r.userId)) latestByUser.set(r.userId, r);
      const nameById = new Map(people.map((p) => [p.id, p.name ?? p.email]));
      return {
        people: input.ids.map((id) => {
          const r = latestByUser.get(id);
          return {
            userId: id,
            name: nameById.get(id) ?? '(unknown)',
            box: r?.box ?? null,
            ratedAt: r?.ratedAt ?? null,
          };
        }),
      };
    }),

  nineboxRate: protectedProcedure
    .use(requireManager)
    .input(z.object({ userId: z.string().uuid(), box: z.number().int().min(1).max(9), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().slice(0, 10);
      // Upsert today's rating: replace an existing same-day row, else insert.
      const existing = await ctx.db.query.nineBoxRatings.findFirst({
        where: and(eq(nineBoxRatings.userId, input.userId), eq(nineBoxRatings.ratedAt, today)),
      });
      if (existing) {
        const [row] = await ctx.db.update(nineBoxRatings)
          .set({ box: input.box, note: input.note ?? null, ratedBy: ctx.user.id })
          .where(eq(nineBoxRatings.id, existing.id)).returning();
        return row;
      }
      const [row] = await ctx.db.insert(nineBoxRatings)
        .values({ userId: input.userId, box: input.box, note: input.note ?? null, ratedBy: ctx.user.id })
        .returning();
      return row;
    }),

  // ================= Admin CRUD (backstop write path, spec §7.6) =================
  // Priorities
  prioritiesList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.priorities.findMany({
        where: input?.userId ? eq(priorities.userId, input.userId) : undefined,
        orderBy: [asc(priorities.sortOrder)],
      });
    }),
  prioritiesCreate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(), itemType,
      okrNodeId: z.string().uuid().nullable().optional(),
      ktbrLabel: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.itemType === 'ktbr' ? !input.ktbrLabel : !input.okrNodeId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Set exactly one of okrNodeId (for objective/KR/task) or ktbrLabel (for KTBR).' });
      }
      const [row] = await ctx.db.insert(priorities).values({
        userId: input.userId, itemType: input.itemType,
        okrNodeId: input.itemType === 'ktbr' ? null : (input.okrNodeId ?? null),
        ktbrLabel: input.itemType === 'ktbr' ? (input.ktbrLabel ?? null) : null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      return row;
    }),
  prioritiesUpdate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(), itemType: itemType.optional(),
      okrNodeId: z.string().uuid().nullable().optional(),
      ktbrLabel: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(priorities).set(updates).where(eq(priorities.id, id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),
  prioritiesRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(priorities).where(eq(priorities.id, input.id));
      return { ok: true };
    }),

  // Engagement snapshots
  engagementList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.engagementSnapshots.findMany({
        where: input?.userId ? eq(engagementSnapshots.userId, input.userId) : undefined,
        orderBy: [desc(engagementSnapshots.asOf)],
      });
    }),
  engagementUpsert: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(), asOf: z.string(),
      score: z.number().int().min(0).max(100).nullable().optional(),
      drivers: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.engagementSnapshots.findFirst({
        where: and(eq(engagementSnapshots.userId, input.userId), eq(engagementSnapshots.asOf, input.asOf)),
      });
      if (existing) {
        const [row] = await ctx.db.update(engagementSnapshots)
          .set({ score: input.score ?? null, drivers: input.drivers ?? [] })
          .where(and(eq(engagementSnapshots.userId, input.userId), eq(engagementSnapshots.asOf, input.asOf)))
          .returning();
        return row;
      }
      const [row] = await ctx.db.insert(engagementSnapshots)
        .values({ userId: input.userId, asOf: input.asOf, score: input.score ?? null, drivers: input.drivers ?? [] })
        .returning();
      return row;
    }),
  engagementRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid(), asOf: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(engagementSnapshots)
        .where(and(eq(engagementSnapshots.userId, input.userId), eq(engagementSnapshots.asOf, input.asOf)));
      return { ok: true };
    }),

  // 9 Box (admin list + delete backstop; rating uses nineboxRate)
  nineboxList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.nineBoxRatings.findMany({
        where: input?.userId ? eq(nineBoxRatings.userId, input.userId) : undefined,
        orderBy: [desc(nineBoxRatings.ratedAt)],
      });
    }),
  nineboxRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(nineBoxRatings).where(eq(nineBoxRatings.id, input.id));
      return { ok: true };
    }),
});
