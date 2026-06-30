// ============================================================
// PLANNING / OKR ROUTER — plan hierarchy + weekly check-in
// AI Engagement (4-Lightspeed)
//
// Ports Signal (RCDO) hierarchy logic, reduced:
//   - plan items: create / update(+move) / archive(cascade) / reorder / tree
//   - rules: tasks are leaves; type & category are immutable; OKR fields
//     only on objective/key_result; soft-delete cascades to descendants.
//   - priorities: "my top 3" (max 3 enforced here).
//   - check-in: weekly plan (wins/challenges/mood) + freeform commits that
//     OPTIONALLY link to a plan item.
// Same audit + telemetry + permission services as the sample entity router.
// ============================================================

import { z } from 'zod';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { planItems, userPriorities, weeklyPlans, commits } from '../db/schema/planning.js';
import { users } from '../db/schema/core.js';
import { checkPermission } from '../services/permissions.js';
import { auditChange, auditFieldChanges } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';

// ── validators ──────────────────────────────────────────────
const planType = z.enum(['theme', 'objective', 'key_result', 'task']);
const planCategory = z.enum(['strategic', 'standard']);
const stoplight = z.enum(['green', 'yellow', 'red']);
const planStatus = z.enum(['not_started', 'in_progress', 'on_hold', 'complete']);

// Fields that only make sense on objective / key_result (the measurable levels).
const MEASURABLE_TYPES = ['objective', 'key_result'];

// ── tree helper (Signal's buildTree, in TS) ─────────────────
type PlanNode = Record<string, any> & { id: string; parentId: string | null; children: PlanNode[] };
function buildTree(items: Array<Record<string, any>>): PlanNode[] {
  const byId = new Map<string, PlanNode>();
  items.forEach((it: any) => byId.set(it.id as string, { ...it, children: [] }));
  const roots: PlanNode[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export const planningRouter = router({
  // ─────────────────────────────────────────── PLAN ITEMS ──
  // Full nested tree (non-archived), with owner names attached.
  tree: protectedProcedure
    .input(z.object({ category: planCategory.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.planItems.findMany({
        where: input?.category
          ? and(isNull(planItems.archivedAt), eq(planItems.category, input.category))
          : isNull(planItems.archivedAt),
        orderBy: [asc(planItems.sortOrder)],
      });
      const allUsers = await ctx.db.query.users.findMany();
      const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
      const withOwner = items.map((it) => ({ ...it, ownerName: it.ownerId ? nameById.get(it.ownerId) ?? null : null }));
      return buildTree(withOwner);
    }),

  getItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.planItems.findFirst({ where: eq(planItems.id, input.id) });
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      return item;
    }),

  createItem: protectedProcedure
    .input(z.object({
      type: planType,
      category: planCategory.optional(),
      parentId: z.string().uuid().optional(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      ownerId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      spirit: z.string().optional(),
      problem: z.string().optional(),
      measure: z.string().optional(),
      target: z.string().max(255).optional(),
      forecast: z.string().optional(),
      stoplightCurrent: stoplight.optional(),
      stoplightForecast: stoplight.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve parent + enforce "tasks are leaves" + inherit category.
      let parent: typeof planItems.$inferSelect | undefined;
      if (input.parentId) {
        parent = await ctx.db.query.planItems.findFirst({ where: eq(planItems.id, input.parentId) });
        if (!parent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent not found' });
        if (parent.type === 'task') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tasks are leaves — they cannot have children' });
      }
      const category = input.category ?? (parent?.category as 'strategic' | 'standard' | undefined) ?? 'strategic';
      const measurable = MEASURABLE_TYPES.includes(input.type);

      // sort_order = end of siblings
      const siblings = await ctx.db.query.planItems.findMany({
        where: input.parentId ? eq(planItems.parentId, input.parentId) : isNull(planItems.parentId),
      });

      const [item] = await ctx.db.insert(planItems).values({
        type: input.type,
        category,
        parentId: input.parentId ?? null,
        sortOrder: siblings.length,
        title: input.title,
        description: input.description ?? null,
        ownerId: input.ownerId ?? ctx.user.id,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        // OKR fields only on measurable levels
        spirit: measurable ? input.spirit ?? null : null,
        problem: measurable ? input.problem ?? null : null,
        measure: measurable ? input.measure ?? null : null,
        target: measurable ? input.target ?? null : null,
        forecast: measurable ? input.forecast ?? null : null,
        stoplightCurrent: measurable ? input.stoplightCurrent ?? null : null,
        stoplightForecast: measurable ? input.stoplightForecast ?? null : null,
      }).returning();

      await auditChange(ctx.db, ctx.user.id, item.id, 'plan_items', 'create');
      trackActivity(ctx.db, ctx.user.id, 'create_item', 'plan_items', { itemId: item.id, type: input.type }).catch(() => {});
      return item;
    }),

  // Update fields and/or move (parentId). type & category are immutable.
  updateItem: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(500).optional(),
      description: z.string().nullable().optional(),
      parentId: z.string().uuid().nullable().optional(),
      ownerId: z.string().uuid().nullable().optional(),
      startDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      status: planStatus.optional(),
      spirit: z.string().nullable().optional(),
      problem: z.string().nullable().optional(),
      measure: z.string().nullable().optional(),
      target: z.string().max(255).nullable().optional(),
      forecast: z.string().nullable().optional(),
      stoplightCurrent: stoplight.nullable().optional(),
      stoplightForecast: stoplight.nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.planItems.findFirst({ where: eq(planItems.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const perm = await checkPermission(ctx.db, ctx.user.id, input.id, 'edit', { ownerId: existing.ownerId });
      if (!perm.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: perm.reason });

      // Validate a move, if requested.
      if (input.parentId !== undefined && input.parentId !== null) {
        if (input.parentId === input.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'An item cannot be its own parent' });
        const newParent = await ctx.db.query.planItems.findFirst({ where: eq(planItems.id, input.parentId) });
        if (!newParent) throw new TRPCError({ code: 'NOT_FOUND', message: 'New parent not found' });
        if (newParent.type === 'task') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tasks are leaves — they cannot have children' });
      }

      const { id, ...rest } = input;
      // Only include keys that were actually provided.
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) updates[k] = v;
      }

      const [item] = await ctx.db.update(planItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(planItems.id, id))
        .returning();

      await auditFieldChanges(ctx.db, ctx.user.id, id, 'plan_items', existing, updates);
      trackActivity(ctx.db, ctx.user.id, 'update_item', 'plan_items', { itemId: id }).catch(() => {});
      return item;
    }),

  // Soft-delete the item AND all descendants (recursive CTE, Signal pattern).
  archiveItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.planItems.findFirst({ where: eq(planItems.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const perm = await checkPermission(ctx.db, ctx.user.id, input.id, 'archive', { ownerId: existing.ownerId });
      if (!perm.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: perm.reason });

      await ctx.db.execute(sql`
        WITH RECURSIVE descendants AS (
          SELECT id FROM plan_items WHERE id = ${input.id}
          UNION ALL
          SELECT pi.id FROM plan_items pi JOIN descendants d ON pi.parent_id = d.id
        )
        UPDATE plan_items
        SET archived_at = NOW(), archived_by = ${ctx.user.id}
        WHERE id IN (SELECT id FROM descendants)
      `);

      await auditChange(ctx.db, ctx.user.id, input.id, 'plan_items', 'archive');
      trackActivity(ctx.db, ctx.user.id, 'archive_item', 'plan_items', { itemId: input.id }).catch(() => {});
      return { ok: true };
    }),

  // Reorder siblings — pass ids in the desired order.
  reorderItems: protectedProcedure
    .input(z.object({ itemIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      for (let i = 0; i < input.itemIds.length; i++) {
        await ctx.db.update(planItems)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(eq(planItems.id, input.itemIds[i]));
      }
      return { ok: true };
    }),

  // ─────────────────────────────────────────── PRIORITIES ──
  listPriorities: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.userPriorities.findMany({
      where: eq(userPriorities.userId, ctx.user.id),
      orderBy: [asc(userPriorities.priorityOrder)],
    });
    const itemIds = rows.map((r) => r.planItemId);
    const items = itemIds.length
      ? await ctx.db.query.planItems.findMany()
      : [];
    const itemById = new Map(items.map((i) => [i.id, i]));
    return rows.map((r) => ({ ...r, item: itemById.get(r.planItemId) ?? null }));
  }),

  addPriority: protectedProcedure
    .input(z.object({ planItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.query.userPriorities.findMany({ where: eq(userPriorities.userId, ctx.user.id) });
      if (current.length >= 3) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You can have at most 3 priorities. Remove one first.' });
      }
      const [row] = await ctx.db.insert(userPriorities).values({
        userId: ctx.user.id,
        planItemId: input.planItemId,
        priorityOrder: current.length + 1,
      }).returning();
      return row;
    }),

  removePriority: protectedProcedure
    .input(z.object({ planItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(userPriorities)
        .where(and(eq(userPriorities.userId, ctx.user.id), eq(userPriorities.planItemId, input.planItemId)));
      return { ok: true };
    }),

  // ─────────────────────────────────────────── CHECK-IN ──
  // Get (or null) the current user's weekly plan + its commits for a week.
  getWeek: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.query.weeklyPlans.findFirst({
        where: and(eq(weeklyPlans.userId, ctx.user.id), eq(weeklyPlans.weekStart, input.weekStart)),
      });
      if (!plan) return { plan: null, commits: [] as Array<typeof commits.$inferSelect> };
      const planCommits = await ctx.db.query.commits.findMany({
        where: eq(commits.weeklyPlanId, plan.id),
        orderBy: [asc(commits.sortOrder)],
      });
      return { plan, commits: planCommits };
    }),

  // Create or update the weekly check-in (wins / challenges / mood / status).
  upsertWeek: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      wins: z.string().nullable().optional(),
      challenges: z.string().nullable().optional(),
      mood: z.number().int().min(1).max(5).nullable().optional(),
      status: z.enum(['draft', 'submitted']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.weeklyPlans.findFirst({
        where: and(eq(weeklyPlans.userId, ctx.user.id), eq(weeklyPlans.weekStart, input.weekStart)),
      });
      const { weekStart, ...rest } = input;
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) fields[k] = v;

      if (existing) {
        const [plan] = await ctx.db.update(weeklyPlans)
          .set({ ...fields, updatedAt: new Date() })
          .where(eq(weeklyPlans.id, existing.id))
          .returning();
        return plan;
      }
      const [plan] = await ctx.db.insert(weeklyPlans).values({
        userId: ctx.user.id,
        weekStart,
        ...fields,
      }).returning();
      return plan;
    }),

  // Add a freeform priority ("commit"); planItemId is the OPTIONAL plan link.
  addCommit: protectedProcedure
    .input(z.object({
      weeklyPlanId: z.string().uuid(),
      // Allow an empty title so the UI can add a blank priority row to fill in.
      title: z.string().max(500).default(''),
      planItemId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.query.weeklyPlans.findFirst({ where: eq(weeklyPlans.id, input.weeklyPlanId) });
      if (!plan || plan.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      const existing = await ctx.db.query.commits.findMany({ where: eq(commits.weeklyPlanId, input.weeklyPlanId) });
      const [commit] = await ctx.db.insert(commits).values({
        weeklyPlanId: input.weeklyPlanId,
        title: input.title,
        planItemId: input.planItemId ?? null,
        sortOrder: existing.length,
      }).returning();
      return commit;
    }),

  // Update a commit's text or its (optional) plan link. Pass planItemId: null to unlink.
  updateCommit: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(500).optional(),
      planItemId: z.string().uuid().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const commit = await ctx.db.query.commits.findFirst({ where: eq(commits.id, input.id) });
      if (!commit) throw new TRPCError({ code: 'NOT_FOUND' });
      const plan = await ctx.db.query.weeklyPlans.findFirst({ where: eq(weeklyPlans.id, commit.weeklyPlanId) });
      if (!plan || plan.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

      const { id, ...rest } = input;
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) fields[k] = v;

      const [updated] = await ctx.db.update(commits).set(fields).where(eq(commits.id, id)).returning();
      return updated;
    }),

  removeCommit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const commit = await ctx.db.query.commits.findFirst({ where: eq(commits.id, input.id) });
      if (!commit) throw new TRPCError({ code: 'NOT_FOUND' });
      const plan = await ctx.db.query.weeklyPlans.findFirst({ where: eq(weeklyPlans.id, commit.weeklyPlanId) });
      if (!plan || plan.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      await ctx.db.delete(commits).where(eq(commits.id, input.id));
      return { ok: true };
    }),
});
