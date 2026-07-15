// Weekly Plan router — per-user weekly check-in: read current + upsert. (DD-002 Planning)
import { z } from 'zod';
import { and, eq, isNull, asc, inArray } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { weeklyCheckins, type WeeklyPriority } from '../db/schema/weeklyPlan.js';
import { priorities } from '../db/schema/orgScreen.js';
import { okrNodes } from '../db/schema/okr.js';
import { users } from '../db/schema/core.js';

// Monday (ISO) of the week containing `d`, as YYYY-MM-DD.
function mondayOf(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

export const weeklyPlanRouter = router({
  getCurrent: protectedProcedure
    .input(z.object({ weekStart: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const weekStart = input?.weekStart ?? mondayOf();
      const row = await ctx.db.query.weeklyCheckins.findFirst({
        where: and(eq(weeklyCheckins.userId, ctx.user.id), eq(weeklyCheckins.weekStart, weekStart)),
      });
      if (row) {
        // Legacy rows may hold plain strings; normalize so the client always gets objects.
        const raw = row.priorities as unknown as Array<string | WeeklyPriority>;
        row.priorities = raw.map((p) =>
          typeof p === 'string' ? { text: p, okrNodeId: null, done: false } : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false },
        );
      }
      // Manager-assigned priorities (set from the Org screen; current-state,
      // weekStart NULL) for THIS user — surfaced read-only in the Weekly Plan
      // priorities box, badged "assigned by your manager".
      const assignedRows = await ctx.db.query.priorities.findMany({
        where: and(eq(priorities.userId, ctx.user.id), isNull(priorities.weekStart)),
        orderBy: [asc(priorities.sortOrder), asc(priorities.createdAt)],
      });
      const nodeIds = assignedRows.map((r) => r.okrNodeId).filter((x): x is string => !!x);
      const mgrIds = assignedRows.map((r) => r.assignedBy).filter((x): x is string => !!x);
      const [nodes, mgrs] = await Promise.all([
        nodeIds.length ? ctx.db.query.okrNodes.findMany({ where: inArray(okrNodes.id, nodeIds) }) : Promise.resolve([]),
        mgrIds.length ? ctx.db.query.users.findMany({ where: inArray(users.id, mgrIds) }) : Promise.resolve([]),
      ]);
      const nodeById = new Map(nodes.map((n) => [n.id, n]));
      const mgrById = new Map(mgrs.map((m) => [m.id, m]));
      const assigned = assignedRows.map((r) => {
        const node = r.okrNodeId ? nodeById.get(r.okrNodeId) : null;
        const mgr = r.assignedBy ? mgrById.get(r.assignedBy) : null;
        return {
          id: r.id,
          itemType: r.itemType,
          okrNodeId: r.okrNodeId,
          label: r.itemType === 'ktbr' ? (r.ktbrLabel ?? '') : (node?.title ?? '(missing item)'),
          assignedByName: mgr ? (mgr.name ?? mgr.email) : null,
          assignedAt: r.assignedAt ?? null,
        };
      });

      return { weekStart, checkin: row ?? null, assigned };
    }),

  save: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      priorities: z.array(z.union([
        z.string(),
        z.object({ text: z.string(), okrNodeId: z.string().uuid().nullable().optional(), done: z.boolean().optional() }),
      ])).default([]).transform((arr) => arr.map((p) => (typeof p === 'string' ? { text: p, done: false } : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false }))),
      wins: z.string().optional(),
      blockers: z.string().optional(),
      mood: z.number().int().min(1).max(5).nullable().optional(),
      pulseAnswer: z.string().max(24).nullable().optional(),
      status: z.enum(['draft', 'saved']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const values = {
        userId: ctx.user.id,
        weekStart: input.weekStart,
        priorities: input.priorities,
        wins: input.wins ?? null,
        blockers: input.blockers ?? null,
        mood: input.mood ?? null,
        pulseAnswer: input.pulseAnswer ?? null,
        status: input.status ?? 'saved',
      };
      const [row] = await ctx.db.insert(weeklyCheckins).values(values)
        .onConflictDoUpdate({
          target: [weeklyCheckins.userId, weeklyCheckins.weekStart],
          set: {
            priorities: values.priorities,
            wins: values.wins,
            blockers: values.blockers,
            mood: values.mood,
            pulseAnswer: values.pulseAnswer,
            status: values.status,
            updatedAt: new Date(),
          },
        }).returning();
      return row;
    }),
});
