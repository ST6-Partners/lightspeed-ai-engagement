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
import { requireManager, requireAdmin, hasMinimumRole } from '../services/permissions.js';
import type { RoleTier } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';
import { okrNodes } from '../db/schema/okr.js';
import { priorities, nineBoxRatings, engagementSnapshots } from '../db/schema/orgScreen.js';
import {
  assessmentSummaries, assessmentCcatSections, assessmentEppAttributes,
  assessmentInsightProfiles, reviewCycles, reviewValueDetails,
} from '../db/schema/orgScreen.js';

const itemType = z.enum(['objective', 'key_result', 'task', 'ktbr']);

// numeric columns come back from pg as strings; coerce to number|null for the client.
const toNum = (v: string | null | undefined) => (v == null ? null : Number(v));
// numeric column writes want string|null.
const toDb = (v: number | null | undefined) => (v == null ? null : String(v));
const numIn = z.number().nullable().optional();

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
            okrNodeId: r.okrNodeId,
            label: r.itemType === 'ktbr' ? (r.ktbrLabel ?? '') : (node?.title ?? '(missing item)'),
            sortOrder: r.sortOrder,
          };
        }),
      };
    }),

  // ---- Priorities tab (write, manager-gated) — pick up to 3 OKR items ----
  // Current-state only (weekStart NULL); no time-pacing — changing the set
  // changes current state. Setting/removing a person's priorities is the same
  // authority as 9 Box rating (requireManager). Priorities are always chosen
  // from existing OKR nodes (objective | key_result | task).
  prioritiesAdd: protectedProcedure
    .use(requireManager)
    .input(z.object({ userId: z.string().uuid(), okrNodeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const node = await ctx.db.query.okrNodes.findFirst({ where: eq(okrNodes.id, input.okrNodeId) });
      if (!node) throw new TRPCError({ code: 'NOT_FOUND', message: 'OKR item not found.' });
      const current = await ctx.db.query.priorities.findMany({
        where: and(eq(priorities.userId, input.userId), isNull(priorities.weekStart)),
      });
      // Idempotent: same node already a current priority -> return it unchanged.
      const dupe = current.find((p) => p.okrNodeId === input.okrNodeId);
      if (dupe) return dupe;
      if (current.length >= 3) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Up to 3 priorities. Remove one first.' });
      }
      const [row] = await ctx.db.insert(priorities).values({
        userId: input.userId,
        itemType: node.type, // 'objective' | 'key_result' | 'task'
        okrNodeId: node.id,
        weekStart: null,
        sortOrder: current.length,
      }).returning();
      return row;
    }),

  prioritiesEdit: protectedProcedure
    .use(requireManager)
    .input(z.object({ id: z.string().uuid(), okrNodeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const node = await ctx.db.query.okrNodes.findFirst({ where: eq(okrNodes.id, input.okrNodeId) });
      if (!node) throw new TRPCError({ code: 'NOT_FOUND', message: 'OKR item not found.' });
      const [row] = await ctx.db.update(priorities)
        .set({ okrNodeId: node.id, itemType: node.type })
        .where(and(eq(priorities.id, input.id), isNull(priorities.weekStart)))
        .returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  prioritiesDelete: protectedProcedure
    .use(requireManager)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(priorities).where(eq(priorities.id, input.id));
      return { ok: true };
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

  // Clear a person's 9-box placement entirely (all their rating rows) so they
  // return to Unrated. Manager-gated, matching nineboxRate (removing a rating
  // is the same authority as setting one).
  nineboxClear: protectedProcedure.use(requireManager)
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(nineBoxRatings).where(eq(nineBoxRatings.userId, input.userId));
      return { ok: true };
    }),
  // ================= Stage 2: Assessments (read) =================
  assessmentsByUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [summary, sections, attrs, profiles] = await Promise.all([
        ctx.db.query.assessmentSummaries.findFirst({ where: eq(assessmentSummaries.userId, input.userId) }),
        ctx.db.query.assessmentCcatSections.findMany({ where: eq(assessmentCcatSections.userId, input.userId), orderBy: [asc(assessmentCcatSections.sortOrder)] }),
        ctx.db.query.assessmentEppAttributes.findMany({ where: eq(assessmentEppAttributes.userId, input.userId), orderBy: [asc(assessmentEppAttributes.sortOrder)] }),
        ctx.db.query.assessmentInsightProfiles.findMany({ where: eq(assessmentInsightProfiles.userId, input.userId), orderBy: [asc(assessmentInsightProfiles.sortOrder)] }),
      ]);
      if (!summary && sections.length === 0 && attrs.length === 0 && profiles.length === 0) {
        return { hasData: false as const, ccat: null, epp: null, insights: null };
      }
      return {
        hasData: true as const,
        ccat: {
          colorCode: summary?.ccatColor ?? null,
          sections: sections.map((s) => ({ label: s.label, score: toNum(s.score) })),
        },
        epp: {
          colorCode: summary?.eppColor ?? null,
          profileName: summary?.eppProfile ?? null,
          displayScore: toNum(summary?.eppScore),
          priorityAttributes: attrs.map((a) => ({
            name: a.name, st6Score: toNum(a.st6Score), eppScore: toNum(a.eppScore),
            finalScore: toNum(a.finalScore), weightage: toNum(a.weightage), colorHex: a.colorHex ?? null,
          })),
        },
        insights: {
          profiles: profiles.map((p) => ({
            color: p.color, consciousScore: toNum(p.consciousScore),
            lessConsciousScore: toNum(p.lessConsciousScore), isPrimary: p.isPrimary,
          })),
        },
      };
    }),

  // ================= Stage 2: Performance Review (read, two gated zones) =================
  // performance = manager+, compensation = admin+. Server strips a zone the
  // viewer can't see and 403s only if BOTH deny (spec §7.4).
  performanceReviewByUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.user.role || 'user') as RoleTier;
      const access = {
        performance: hasMinimumRole(role, 'manager'),
        compensation: hasMinimumRole(role, 'admin'),
      };
      if (!access.performance && !access.compensation) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to reviews.' });
      }
      const cycles = await ctx.db.query.reviewCycles.findMany({
        where: eq(reviewCycles.userId, input.userId),
        orderBy: [asc(reviewCycles.sortOrder)],
      });
      const cycleIds = cycles.map((c) => c.id);
      const details = cycleIds.length
        ? await ctx.db.query.reviewValueDetails.findMany({
            where: inArray(reviewValueDetails.cycleId, cycleIds),
            orderBy: [asc(reviewValueDetails.sortOrder)],
          })
        : [];
      const byCycle = new Map<string, typeof details>();
      for (const d of details) { const a = byCycle.get(d.cycleId) ?? []; a.push(d); byCycle.set(d.cycleId, a); }
      return {
        userId: input.userId,
        access,
        cycles: cycles.map((c) => ({
          id: c.id,
          cycle: { label: c.label, status: c.status },
          scores: access.performance
            ? { total: toNum(c.scoreTotal), values: toNum(c.scoreValues), performance: toNum(c.scorePerformance) }
            : null,
          placement: access.performance ? { rank: c.rank, rankOf: c.rankOf, tier: c.tier } : null,
          valueDetails: access.performance
            ? (byCycle.get(c.id) ?? []).map((d) => ({ name: d.name, score: toNum(d.score) }))
            : [],
          comp: access.compensation
            ? {
                startBase: toNum(c.startBase),
                startBonusPct: toNum(c.startBonusPct),
                merit: { basePct: toNum(c.meritBasePct) },
                promotion: c.hasPromotion,
                finalSalaryIncrease: toNum(c.finalSalaryIncrease),
                finalNewOTE: toNum(c.finalNewOte),
              }
            : null,
        })),
      };
    }),

  // ================= Stage 2: Admin CRUD (write path, spec §7.6) =================
  // ---- Assessment summary (one per user) ----
  assessmentSummaryList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => ctx.db.query.assessmentSummaries.findMany({
      where: input?.userId ? eq(assessmentSummaries.userId, input.userId) : undefined,
    })),
  assessmentSummaryUpsert: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(), ccatColor: z.string().nullable().optional(),
      eppColor: z.string().nullable().optional(), eppProfile: z.string().nullable().optional(),
      eppScore: numIn,
    }))
    .mutation(async ({ ctx, input }) => {
      const vals = {
        ccatColor: input.ccatColor ?? null, eppColor: input.eppColor ?? null,
        eppProfile: input.eppProfile ?? null, eppScore: toDb(input.eppScore), updatedAt: new Date(),
      };
      const existing = await ctx.db.query.assessmentSummaries.findFirst({ where: eq(assessmentSummaries.userId, input.userId) });
      if (existing) {
        const [row] = await ctx.db.update(assessmentSummaries).set(vals).where(eq(assessmentSummaries.userId, input.userId)).returning();
        return row;
      }
      const [row] = await ctx.db.insert(assessmentSummaries).values({ userId: input.userId, ...vals }).returning();
      return row;
    }),
  assessmentSummaryRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await ctx.db.delete(assessmentSummaries).where(eq(assessmentSummaries.userId, input.userId)); return { ok: true }; }),

  // ---- CCAT sections ----
  ccatSectionsList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => ctx.db.query.assessmentCcatSections.findMany({
      where: input?.userId ? eq(assessmentCcatSections.userId, input.userId) : undefined,
      orderBy: [asc(assessmentCcatSections.sortOrder)],
    })),
  ccatSectionCreate: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid(), label: z.string(), score: numIn, sortOrder: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(assessmentCcatSections).values({
        userId: input.userId, label: input.label, score: toDb(input.score), sortOrder: input.sortOrder ?? 0,
      }).returning();
      return row;
    }),
  ccatSectionUpdate: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), label: z.string().optional(), score: numIn, sortOrder: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const u: Record<string, unknown> = {};
      if (input.label !== undefined) u.label = input.label;
      if (input.score !== undefined) u.score = toDb(input.score);
      if (input.sortOrder !== undefined) u.sortOrder = input.sortOrder;
      const [row] = await ctx.db.update(assessmentCcatSections).set(u).where(eq(assessmentCcatSections.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),
  ccatSectionRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await ctx.db.delete(assessmentCcatSections).where(eq(assessmentCcatSections.id, input.id)); return { ok: true }; }),

  // ---- EPP attributes ----
  eppAttributesList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => ctx.db.query.assessmentEppAttributes.findMany({
      where: input?.userId ? eq(assessmentEppAttributes.userId, input.userId) : undefined,
      orderBy: [asc(assessmentEppAttributes.sortOrder)],
    })),
  eppAttributeCreate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(), name: z.string(), st6Score: numIn, eppScore: numIn,
      finalScore: numIn, weightage: numIn, colorHex: z.string().nullable().optional(), sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(assessmentEppAttributes).values({
        userId: input.userId, name: input.name, st6Score: toDb(input.st6Score), eppScore: toDb(input.eppScore),
        finalScore: toDb(input.finalScore), weightage: toDb(input.weightage), colorHex: input.colorHex ?? null, sortOrder: input.sortOrder ?? 0,
      }).returning();
      return row;
    }),
  eppAttributeUpdate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(), name: z.string().optional(), st6Score: numIn, eppScore: numIn,
      finalScore: numIn, weightage: numIn, colorHex: z.string().nullable().optional(), sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const u: Record<string, unknown> = {};
      if (input.name !== undefined) u.name = input.name;
      if (input.st6Score !== undefined) u.st6Score = toDb(input.st6Score);
      if (input.eppScore !== undefined) u.eppScore = toDb(input.eppScore);
      if (input.finalScore !== undefined) u.finalScore = toDb(input.finalScore);
      if (input.weightage !== undefined) u.weightage = toDb(input.weightage);
      if (input.colorHex !== undefined) u.colorHex = input.colorHex;
      if (input.sortOrder !== undefined) u.sortOrder = input.sortOrder;
      const [row] = await ctx.db.update(assessmentEppAttributes).set(u).where(eq(assessmentEppAttributes.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),
  eppAttributeRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await ctx.db.delete(assessmentEppAttributes).where(eq(assessmentEppAttributes.id, input.id)); return { ok: true }; }),

  // ---- Insight profiles ----
  insightProfilesList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => ctx.db.query.assessmentInsightProfiles.findMany({
      where: input?.userId ? eq(assessmentInsightProfiles.userId, input.userId) : undefined,
      orderBy: [asc(assessmentInsightProfiles.sortOrder)],
    })),
  insightProfileCreate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(), color: z.string().nullable().optional(), consciousScore: numIn,
      lessConsciousScore: numIn, isPrimary: z.boolean().optional(), sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(assessmentInsightProfiles).values({
        userId: input.userId, color: input.color ?? null, consciousScore: toDb(input.consciousScore),
        lessConsciousScore: toDb(input.lessConsciousScore), isPrimary: input.isPrimary ?? false, sortOrder: input.sortOrder ?? 0,
      }).returning();
      return row;
    }),
  insightProfileUpdate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(), color: z.string().nullable().optional(), consciousScore: numIn,
      lessConsciousScore: numIn, isPrimary: z.boolean().optional(), sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const u: Record<string, unknown> = {};
      if (input.color !== undefined) u.color = input.color;
      if (input.consciousScore !== undefined) u.consciousScore = toDb(input.consciousScore);
      if (input.lessConsciousScore !== undefined) u.lessConsciousScore = toDb(input.lessConsciousScore);
      if (input.isPrimary !== undefined) u.isPrimary = input.isPrimary;
      if (input.sortOrder !== undefined) u.sortOrder = input.sortOrder;
      const [row] = await ctx.db.update(assessmentInsightProfiles).set(u).where(eq(assessmentInsightProfiles.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),
  insightProfileRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await ctx.db.delete(assessmentInsightProfiles).where(eq(assessmentInsightProfiles.id, input.id)); return { ok: true }; }),

  // ---- Review cycles ----
  reviewCyclesList: protectedProcedure.use(requireAdmin)
    .input(z.object({ userId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => ctx.db.query.reviewCycles.findMany({
      where: input?.userId ? eq(reviewCycles.userId, input.userId) : undefined,
      orderBy: [asc(reviewCycles.sortOrder)],
    })),
  reviewCycleCreate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(), label: z.string(), status: z.string().nullable().optional(), sortOrder: z.number().int().optional(),
      scoreTotal: numIn, scoreValues: numIn, scorePerformance: numIn,
      rank: z.number().int().nullable().optional(), rankOf: z.number().int().nullable().optional(), tier: z.string().nullable().optional(),
      startBase: numIn, startBonusPct: numIn, meritBasePct: numIn,
      hasPromotion: z.boolean().optional(), finalSalaryIncrease: numIn, finalNewOte: numIn,
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(reviewCycles).values({
        userId: input.userId, label: input.label, status: input.status ?? null, sortOrder: input.sortOrder ?? 0,
        scoreTotal: toDb(input.scoreTotal), scoreValues: toDb(input.scoreValues), scorePerformance: toDb(input.scorePerformance),
        rank: input.rank ?? null, rankOf: input.rankOf ?? null, tier: input.tier ?? null,
        startBase: toDb(input.startBase), startBonusPct: toDb(input.startBonusPct), meritBasePct: toDb(input.meritBasePct),
        hasPromotion: input.hasPromotion ?? false, finalSalaryIncrease: toDb(input.finalSalaryIncrease), finalNewOte: toDb(input.finalNewOte),
      }).returning();
      return row;
    }),
  reviewCycleUpdate: protectedProcedure.use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(), label: z.string().optional(), status: z.string().nullable().optional(), sortOrder: z.number().int().optional(),
      scoreTotal: numIn, scoreValues: numIn, scorePerformance: numIn,
      rank: z.number().int().nullable().optional(), rankOf: z.number().int().nullable().optional(), tier: z.string().nullable().optional(),
      startBase: numIn, startBonusPct: numIn, meritBasePct: numIn,
      hasPromotion: z.boolean().optional(), finalSalaryIncrease: numIn, finalNewOte: numIn,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const numKeys = new Set(['scoreTotal','scoreValues','scorePerformance','startBase','startBonusPct','meritBasePct','finalSalaryIncrease','finalNewOte']);
      const u: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue;
        u[k] = numKeys.has(k) ? toDb(v as number | null) : v;
      }
      const [row] = await ctx.db.update(reviewCycles).set(u).where(eq(reviewCycles.id, id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),
  reviewCycleRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await ctx.db.delete(reviewCycles).where(eq(reviewCycles.id, input.id)); return { ok: true }; }),

  // ---- Review value details ----
  reviewValueDetailsList: protectedProcedure.use(requireAdmin)
    .input(z.object({ cycleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => ctx.db.query.reviewValueDetails.findMany({
      where: eq(reviewValueDetails.cycleId, input.cycleId),
      orderBy: [asc(reviewValueDetails.sortOrder)],
    })),
  reviewValueDetailCreate: protectedProcedure.use(requireAdmin)
    .input(z.object({ cycleId: z.string().uuid(), name: z.string(), score: numIn, sortOrder: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(reviewValueDetails).values({
        cycleId: input.cycleId, name: input.name, score: toDb(input.score), sortOrder: input.sortOrder ?? 0,
      }).returning();
      return row;
    }),
  reviewValueDetailUpdate: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), name: z.string().optional(), score: numIn, sortOrder: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const u: Record<string, unknown> = {};
      if (input.name !== undefined) u.name = input.name;
      if (input.score !== undefined) u.score = toDb(input.score);
      if (input.sortOrder !== undefined) u.sortOrder = input.sortOrder;
      const [row] = await ctx.db.update(reviewValueDetails).set(u).where(eq(reviewValueDetails.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),
  reviewValueDetailRemove: protectedProcedure.use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await ctx.db.delete(reviewValueDetails).where(eq(reviewValueDetails.id, input.id)); return { ok: true }; }),

});
