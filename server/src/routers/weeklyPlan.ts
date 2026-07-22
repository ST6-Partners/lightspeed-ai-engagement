// Weekly Plan router — per-user weekly check-in: read current + upsert. (DD-002 Planning)
import { z } from 'zod';
import { and, eq, isNull, asc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { weeklyCheckins, type WeeklyPriority } from '../db/schema/weeklyPlan.js';
import { priorities } from '../db/schema/orgScreen.js';
import { okrNodes } from '../db/schema/okr.js';
import { users } from '../db/schema/core.js';
import { hasMinimumRole, type RoleTier } from '../services/permissions.js';

// Add `n` days to a YYYY-MM-DD string (UTC), returning YYYY-MM-DD.
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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
          typeof p === 'string'
            ? { text: p, okrNodeId: null, done: false, archived: false }
            : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false, archived: p.archived ?? false },
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
      const labelOf = (r: typeof assignedRows[number]) => {
        const node = r.okrNodeId ? nodeById.get(r.okrNodeId) : null;
        return r.itemType === 'ktbr' ? (r.ktbrLabel ?? '') : (node?.title ?? '(missing item)');
      };
      const mgrNameOf = (r: typeof assignedRows[number]) => {
        const mgr = r.assignedBy ? mgrById.get(r.assignedBy) : null;
        return mgr ? (mgr.name ?? mgr.email) : null;
      };
      const weekOfDate = (d: Date | string | null) => (d ? mondayOf(new Date(d)) : weekStart);

      // Split assigned priorities into ACTIVE (shown in the box) vs FILED (Completed
      // section). Filed = archived, OR completed in a week other than the current one
      // (end-of-week auto-file). Completed-this-week (not archived) stays in the box.
      type FiledItem = { id: string; label: string; okrNodeId: string | null; done: boolean; archived: boolean; source: 'own' | 'assigned'; assignedByName: string | null };
      const assignedActive: Array<{ id: string; itemType: string; okrNodeId: string | null; label: string; assignedByName: string | null; done: boolean; archived: boolean }> = [];
      const filed: { weekStart: string; item: FiledItem }[] = [];
      for (const r of assignedRows) {
        const cWeek = weekOfDate(r.archived ? r.archivedAt : r.completedAt);
        const isFiled = r.archived || ((r.done ?? false) && cWeek !== weekStart);
        if (isFiled) {
          filed.push({ weekStart: cWeek, item: { id: r.id, label: labelOf(r), okrNodeId: r.okrNodeId, done: r.done ?? false, archived: r.archived ?? false, source: 'assigned', assignedByName: mgrNameOf(r) } });
        } else {
          assignedActive.push({ id: r.id, itemType: r.itemType, okrNodeId: r.okrNodeId, label: labelOf(r), assignedByName: mgrNameOf(r), done: r.done ?? false, archived: r.archived ?? false });
        }
      }
      assignedActive.sort((a, b) => Number(a.done) - Number(b.done)); // completed to the bottom

      // Own-priority completed history across all of this user's weeks.
      const allWeeks = await ctx.db.query.weeklyCheckins.findMany({ where: eq(weeklyCheckins.userId, ctx.user.id) });
      const normOwn = (arr: unknown) =>
        (arr as Array<string | { text: string; okrNodeId?: string | null; done?: boolean; archived?: boolean }>).map((p) =>
          typeof p === 'string'
            ? { text: p, okrNodeId: null as string | null, done: false, archived: false }
            : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false, archived: p.archived ?? false });
      for (const wc of allWeeks) {
        normOwn(wc.priorities).forEach((p, idx) => {
          if (!p.done) return;
          // current week: only archived items file (done-not-archived stay in the box);
          // prior weeks: every completed item files under its week.
          if (wc.weekStart === weekStart && !p.archived) return;
          filed.push({ weekStart: wc.weekStart, item: { id: `own-${wc.weekStart}-${idx}`, label: p.text, okrNodeId: p.okrNodeId, done: true, archived: p.archived, source: 'own', assignedByName: null } });
        });
      }

      const byWeek = new Map<string, FiledItem[]>();
      for (const f of filed) { const a = byWeek.get(f.weekStart) ?? []; a.push(f.item); byWeek.set(f.weekStart, a); }
      const completedByWeek = [...byWeek.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([w, items]) => ({ weekStart: w, items }));

      // PAST PRIORITIES — own priorities from PRIOR weeks that were never
      // completed (and not dismissed/archived). Previously these just fell off
      // the current-week view at end of week; now they surface in a dedicated
      // "Past priorities" box so nothing is silently lost. The user can carry
      // one forward to the current week or dismiss it. Assigned (manager)
      // priorities are weekStart-NULL and persist on their own, so they are not
      // included here.
      const pastByWeek = new Map<string, { id: string; label: string; okrNodeId: string | null }[]>();
      for (const wc of allWeeks) {
        if (wc.weekStart === weekStart) continue;
        normOwn(wc.priorities).forEach((p, idx) => {
          if (p.done || p.archived) return;
          if (!p.text.trim() && !p.okrNodeId) return;
          const a = pastByWeek.get(wc.weekStart) ?? [];
          a.push({ id: `own-${wc.weekStart}-${idx}`, label: p.text, okrNodeId: p.okrNodeId });
          pastByWeek.set(wc.weekStart, a);
        });
      }
      const pastPriorities = [...pastByWeek.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([w, items]) => ({ weekStart: w, items }));

      return { weekStart, checkin: row ?? null, assigned: assignedActive, completedByWeek, pastPriorities };
    }),

  save: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      priorities: z.array(z.union([
        z.string(),
        z.object({ text: z.string(), okrNodeId: z.string().uuid().nullable().optional(), done: z.boolean().optional(), archived: z.boolean().optional() }),
      ])).default([]).transform((arr) => arr.map((p) => (typeof p === 'string' ? { text: p, done: false, archived: false } : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false, archived: p.archived ?? false }))),
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

  // Dismiss (archive) or restore a single OWN priority in a specific week's row.
  // Used by the "Past priorities" box to move an unfinished item out of view
  // (on its own, or after carrying it forward into the current week).
  setOwnPriorityArchived: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      index: z.number().int().min(0),
      archived: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.weeklyCheckins.findFirst({
        where: and(eq(weeklyCheckins.userId, ctx.user.id), eq(weeklyCheckins.weekStart, input.weekStart)),
      });
      if (!row) return { ok: false as const };
      const arr = (row.priorities as unknown as Array<string | WeeklyPriority>).map((p) =>
        typeof p === 'string'
          ? { text: p, okrNodeId: null as string | null, done: false, archived: false }
          : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false, archived: p.archived ?? false });
      if (input.index < 0 || input.index >= arr.length) return { ok: false as const };
      arr[input.index] = { ...arr[input.index], archived: input.archived };
      await ctx.db.update(weeklyCheckins)
        .set({ priorities: arr, updatedAt: new Date() })
        .where(eq(weeklyCheckins.id, row.id));
      return { ok: true as const };
    }),

  // Admin-only demo seeder. Populates a few PAST weeks (mix of completed and
  // unfinished own priorities) plus some manager-assigned priorities, all for
  // the CURRENT user, so the Weekly Plan surfaces — Past priorities, Completed
  // priorities (by week), and manager-assigned — can be demoed with data.
  // Idempotent: skips a past week that already has a row, and skips assigned
  // seeding if the user already has manager-assigned priorities. Never touches
  // the current week's own check-in.
  seedSampleData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });
      }
      const cur = mondayOf();

      // Three prior weeks with a done/not-done mix.
      const sampleWeeks: { weekStart: string; priorities: WeeklyPriority[]; wins: string; blockers: string; mood: number }[] = [
        { weekStart: addDays(cur, -21),
          priorities: [
            { text: 'Ship the onboarding email revamp', okrNodeId: null, done: true, archived: false },
            { text: 'Close out Q2 engagement recap', okrNodeId: null, done: true, archived: false },
            { text: 'Draft the manager enablement guide', okrNodeId: null, done: false, archived: false },
          ], wins: 'Onboarding revamp shipped ahead of schedule.', blockers: 'Waiting on brand assets.', mood: 4 },
        { weekStart: addDays(cur, -14),
          priorities: [
            { text: 'Run the pulse-survey pilot with the CS team', okrNodeId: null, done: true, archived: false },
            { text: 'Rework the 9-box calibration deck', okrNodeId: null, done: false, archived: false },
            { text: 'Interview 3 candidates for the PM role', okrNodeId: null, done: false, archived: false },
          ], wins: 'Pulse pilot hit 82% participation.', blockers: 'Calibration deck blocked on data.', mood: 3 },
        { weekStart: addDays(cur, -7),
          priorities: [
            { text: 'Finalize Q3 OKR drafts with leads', okrNodeId: null, done: false, archived: false },
            { text: 'Publish the weekly engagement digest', okrNodeId: null, done: true, archived: false },
          ], wins: 'Digest went out on time.', blockers: 'OKR drafts still in review.', mood: 4 },
      ];

      let weeksSeeded = 0;
      for (const w of sampleWeeks) {
        const existing = await ctx.db.query.weeklyCheckins.findFirst({
          where: and(eq(weeklyCheckins.userId, ctx.user.id), eq(weeklyCheckins.weekStart, w.weekStart)),
        });
        if (existing) continue;
        await ctx.db.insert(weeklyCheckins).values({
          userId: ctx.user.id,
          weekStart: w.weekStart,
          priorities: w.priorities,
          wins: w.wins,
          blockers: w.blockers,
          mood: w.mood,
          status: 'saved',
        });
        weeksSeeded++;
      }

      // Manager-assigned priorities (weekStart NULL = current-state). assignedBy
      // left NULL so the UI shows the neutral "Assigned by your manager" badge.
      let assignedSeeded = 0;
      const existingAssigned = await ctx.db.query.priorities.findFirst({
        where: and(eq(priorities.userId, ctx.user.id), isNull(priorities.weekStart)),
      });
      if (!existingAssigned) {
        await ctx.db.insert(priorities).values([
          { userId: ctx.user.id, weekStart: null, itemType: 'ktbr', ktbrLabel: 'Present hiring plan at the leadership sync', sortOrder: 0, assignedBy: null, assignedAt: new Date(), done: false, archived: false },
          { userId: ctx.user.id, weekStart: null, itemType: 'ktbr', ktbrLabel: 'Finalize the interview scorecard rubric', sortOrder: 1, assignedBy: null, assignedAt: new Date(), done: false, archived: false },
          { userId: ctx.user.id, weekStart: null, itemType: 'ktbr', ktbrLabel: 'Send the Q2 engagement recap to the ELT', sortOrder: 2, assignedBy: null, assignedAt: new Date(), done: true, completedAt: new Date(), archived: false },
        ]);
        assignedSeeded = 3;
      }

      return { ok: true as const, weeksSeeded, assignedSeeded };
    }),
});
