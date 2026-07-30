// ============================================================
// ORG SCREEN router — tree + Priorities / Engagement / 9 Box tabs
// AI Engagement (4-Lightspeed) — spec: AIE Org Screen Spec v1
//
// Built on the existing `users` table (org via users.managerId). tRPC, not
// REST (app convention). Read procedures are protected; write/admin
// procedures gate by role (requireManager to rate 9 Box, requireAdmin for CRUD).
// ============================================================

import { z } from 'zod';
import { eq, inArray, asc, desc, and, isNull, gte, lt, or, ne } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { requireManager, requireAdmin, hasMinimumRole } from '../services/permissions.js';
import type { RoleTier } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { notifications } from '../db/schema/notifications.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';
import { okrNodes } from '../db/schema/okr.js';
import { priorities, nineBoxRatings, engagementSnapshots } from '../db/schema/orgScreen.js';
import { cadenceSettings } from '../db/schema/cadence.js';
import { periodKeyLabel, prevPeriodStart, type Cadence } from './cadence.js';

async function currentPrioritiesKey(db: any): Promise<string> {
  const s = await db.query.cadenceSettings.findFirst();
  const cad = (s?.prioritiesCadence ?? 'annual') as Cadence;
  return periodKeyLabel(cad, new Date()).key;
}

// Current + previous priorities period keys, for the rollover carry-over.
async function prioritiesPeriodKeys(db: any): Promise<{ cur: string; prev: string; curLabel: string; prevLabel: string }> {
  const s = await db.query.cadenceSettings.findFirst();
  const cad = (s?.prioritiesCadence ?? 'annual') as Cadence;
  const now = new Date();
  const c = periodKeyLabel(cad, now);
  const p = periodKeyLabel(cad, prevPeriodStart(cad, now));
  return { cur: c.key, prev: p.key, curLabel: c.label, prevLabel: p.label };
}
import {
  assessmentSummaries, assessmentCcatSections, assessmentEppAttributes,
  assessmentInsightProfiles, reviewCycles, reviewValueDetails,
} from '../db/schema/orgScreen.js';
import { parseAssessmentPdf, type AssessmentKind } from '../services/assessmentPdf.js';

const itemType = z.enum(['objective', 'key_result', 'task', 'ktbr']);

// numeric columns come back from pg as strings; coerce to number|null for the client.
const toNum = (v: string | null | undefined) => (v == null ? null : Number(v));
// numeric column writes want string|null.
const toDb = (v: number | null | undefined) => (v == null ? null : String(v));
const numIn = z.number().nullable().optional();

// Who may READ assessments (CCAT / EPP / Insights): HR and admins ONLY.
// Deliberately narrower than the other tabs — managers and ELT are excluded.
// Cognitive and personality data is the most sensitive material on the person
// card, and the Org Screen Spec (§ recommendation 5) called for gating it
// server-side rather than only hiding the tab. Hiding a tab is not access
// control: the procedure is reachable directly.
async function assertCanReadAssessments(ctx: any): Promise<void> {
  const viewer = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.user.id as string),
    columns: { role: true, isHrAccess: true },
  });
  const role = (viewer?.role ?? 'user') as RoleTier;
  if (viewer && (hasMinimumRole(role, 'admin') || viewer.isHrAccess)) return;
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Assessments are visible to HR and admins only.',
  });
}

// Who may PLACE (rate / clear) a given person on the 9 Box (Stage 2): admins,
// HR-access users, and the person's PRIMARY-manager chain (their primary
// manager or anyone above them). A non-primary (secondary) manager cannot.
async function assertCanPlace(ctx: any, targetId: string): Promise<void> {
  const raterId = ctx.user.id as string;
  const rater = await ctx.db.query.users.findFirst({ where: eq(users.id, raterId), columns: { role: true, isHrAccess: true } });
  if (rater && (rater.role === 'admin' || rater.role === 'sysadmin' || rater.isHrAccess)) return;
  const rows = await ctx.db.select({ id: users.id, managerId: users.managerId }).from(users);
  const mgrOf = new Map<string, string | null>(rows.map((r: { id: string; managerId: string | null }) => [r.id, r.managerId]));
  let cur = mgrOf.get(targetId) ?? null;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === raterId) return;
    seen.add(cur);
    cur = mgrOf.get(cur) ?? null;
  }
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Only this person\u2019s primary manager (or someone above them, HR, or an admin) can place them.' });
}

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
          location: u.location ?? null,
          businessUnit: u.businessUnit ?? null,
          eltLeader: u.eltLeader ?? null,
          hireYear: u.hireYear ?? null,
          hireMonth: u.hireMonth ?? null,
          hireDay: u.hireDay ?? null,
        })),
    };
  }),

  // ---- Priorities tab (read) ----
  prioritiesByUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), periodKey: z.string().max(32).optional() }))
    .query(async ({ ctx, input }) => {
      let whereClause;
      if (input.periodKey) {
        const curKey = await currentPrioritiesKey(ctx.db);
        // Untagged rows (legacy/seeded, period_key NULL) belong to the current period.
        whereClause = input.periodKey === curKey
          ? and(eq(priorities.userId, input.userId), or(eq(priorities.periodKey, input.periodKey), isNull(priorities.periodKey)))
          : and(eq(priorities.userId, input.userId), eq(priorities.periodKey, input.periodKey));
      } else {
        whereClause = and(eq(priorities.userId, input.userId), isNull(priorities.weekStart));
      }
      const rows = await ctx.db.query.priorities.findMany({
        where: whereClause,
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
      const periodKey = await currentPrioritiesKey(ctx.db);
      const current = await ctx.db.query.priorities.findMany({
        where: and(eq(priorities.userId, input.userId), eq(priorities.periodKey, periodKey)),
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
        periodKey,
        sortOrder: current.length,
        assignedBy: ctx.user.id,
        assignedAt: new Date(),
      }).returning();
      // Tell the assignee. Priorities are manager-assigned, so before this the
      // only signal an employee got was a chip quietly appearing in their Weekly
      // Plan. Self-assignment (a manager setting their own) is not notified.
      // referenceType routes to the Weekly Plan, where the employee sees their
      // manager-assigned priorities — NOT the Organization tab, which is the
      // manager's authoring surface and read-only to them.
      if (input.userId !== ctx.user.id) {
        const assigner = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
        await ctx.db.insert(notifications).values({
          userId: input.userId,
          type: 'priority_assigned',
          message: `${assigner?.name ?? 'Your manager'} assigned you a priority: ${node.title}`,
          referenceId: row.id,
          referenceType: 'assigned_priority',
        });
      }
      return row;
    }),

  prioritiesEdit: protectedProcedure
    .use(requireManager)
    .input(z.object({ id: z.string().uuid(), okrNodeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const node = await ctx.db.query.okrNodes.findFirst({ where: eq(okrNodes.id, input.okrNodeId) });
      if (!node) throw new TRPCError({ code: 'NOT_FOUND', message: 'OKR item not found.' });
      const existing = await ctx.db.query.priorities.findFirst({ where: eq(priorities.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const curKey = await currentPrioritiesKey(ctx.db);
      if (existing.periodKey && existing.periodKey !== curKey) throw new TRPCError({ code: 'FORBIDDEN', message: 'Past period is view-only.' });
      // Changing WHAT someone's priority is, is materially a new assignment, so it
      // notifies on the same terms as prioritiesAdd. Previously only add wrote a
      // notice, so a manager could swap an employee's priority for a different OKR
      // and the employee got nothing — the chip in their Weekly Plan silently
      // changed meaning. Self-edits are not notified, same guard as add.
      if (existing.userId !== ctx.user.id) {
        const assigner = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
        await ctx.db.insert(notifications).values({
          userId: existing.userId,
          type: 'priority_assigned',
          message: `${assigner?.name ?? 'Your manager'} changed one of your priorities to: ${node.title}`,
          referenceId: existing.id,
          referenceType: 'assigned_priority',
        });
      }
      // Re-pointing a priority at a DIFFERENT OKR makes it different work, so the
      // completion state must not carry over. Without this the edit kept done /
      // completedAt from the old item, so the "new" priority was born already
      // finished and weeklyPlan.getCurrent filed it into Completed for whatever
      // week the OLD one was ticked off in — never appearing in the employee's
      // active Priorities box. That is exactly the "I added a priority and it
      // never showed up in my Weekly Plan" report. Same-node edits keep their
      // state, so this cannot un-complete work by accident.
      const repointed = existing.okrNodeId !== node.id;
      const [row] = await ctx.db.update(priorities)
        .set({
          okrNodeId: node.id,
          itemType: node.type,
          assignedBy: ctx.user.id,
          assignedAt: new Date(),
          ...(repointed
            ? { done: false, completedAt: null, archived: false, archivedAt: null }
            : {}),
        })
        .where(eq(priorities.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  prioritiesDelete: protectedProcedure
    .use(requireManager)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.priorities.findFirst({ where: eq(priorities.id, input.id) });
      if (existing?.periodKey) {
        const curKey = await currentPrioritiesKey(ctx.db);
        if (existing.periodKey !== curKey) throw new TRPCError({ code: 'FORBIDDEN', message: 'Past period is view-only.' });
      }
      await ctx.db.delete(priorities).where(eq(priorities.id, input.id));
      return { ok: true };
    }),

  // Toggle completion on a priority. The assignee (owner) OR a manager can do
  // this — the person completes their own assigned priority from the Weekly Plan.
  // ---- Period rollover carry-over (self-service) ----
  //
  // Priorities are period-scoped (periodKey, migration 0095) and a past period is
  // locked server-side. So the instant a period rolls over the person's list is
  // empty — and they cannot populate it themselves, because prioritiesAdd is
  // requireManager and takes an okrNodeId. That leaves an employee staring at an
  // empty locked-out list with no action available.
  //
  // Carry-over resolves that WITHOUT granting authoring rights: it only copies
  // forward rows a manager already approved in the previous period, and preserves
  // assignedBy/assignedAt so a manager-assigned priority stays attributed rather
  // than being laundered into a self-set one. Creating genuinely new priorities
  // remains manager-only.
  prioritiesRolloverPreview: protectedProcedure
    .query(async ({ ctx }) => {
      const { cur, prev, curLabel, prevLabel } = await prioritiesPeriodKeys(ctx.db);
      // Untagged rows (legacy/seeded, period_key NULL) count as current — same
      // convention as prioritiesByUser, so this cannot double-prompt.
      const curRows = await ctx.db.query.priorities.findMany({
        where: and(
          eq(priorities.userId, ctx.user.id),
          isNull(priorities.weekStart),
          or(eq(priorities.periodKey, cur), isNull(priorities.periodKey)),
        ),
        columns: { id: true },
      });
      const empty = { showPrompt: false as const, currentPeriodKey: cur, currentPeriodLabel: curLabel, previousPeriodLabel: prevLabel, items: [] as Array<{ id: string; label: string; assigned: boolean }> };
      if (curRows.length > 0) return empty;

      const prevRows = await ctx.db.query.priorities.findMany({
        where: and(
          eq(priorities.userId, ctx.user.id),
          isNull(priorities.weekStart),
          eq(priorities.periodKey, prev),
          eq(priorities.done, false),
        ),
        orderBy: [asc(priorities.sortOrder), asc(priorities.createdAt)],
      });
      if (!prevRows.length) return empty;

      const nodeIds = prevRows.map((r: any) => r.okrNodeId).filter((x: any): x is string => !!x);
      const nodes = nodeIds.length ? await ctx.db.query.okrNodes.findMany({ where: inArray(okrNodes.id, nodeIds) }) : [];
      const nodeById = new Map(nodes.map((n: any) => [n.id, n]));
      return {
        showPrompt: true as const,
        currentPeriodKey: cur,
        currentPeriodLabel: curLabel,
        previousPeriodLabel: prevLabel,
        items: prevRows.map((r: any) => ({
          id: r.id,
          label: r.itemType === 'ktbr' ? (r.ktbrLabel ?? '') : (nodeById.get(r.okrNodeId)?.title ?? '(missing item)'),
          assigned: !!r.assignedBy,
        })),
      };
    }),

  prioritiesCarryOver: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { cur, prev } = await prioritiesPeriodKeys(ctx.db);
      // Source rows must be the caller's own, from the previous period, unfinished.
      const src = await ctx.db.query.priorities.findMany({
        where: and(
          eq(priorities.userId, ctx.user.id),
          isNull(priorities.weekStart),
          eq(priorities.periodKey, prev),
          eq(priorities.done, false),
          inArray(priorities.id, input.ids),
        ),
        orderBy: [asc(priorities.sortOrder), asc(priorities.createdAt)],
      });
      if (!src.length) return { carried: 0 };

      const existing = await ctx.db.query.priorities.findMany({
        where: and(
          eq(priorities.userId, ctx.user.id),
          isNull(priorities.weekStart),
          or(eq(priorities.periodKey, cur), isNull(priorities.periodKey)),
        ),
        columns: { id: true, okrNodeId: true, ktbrLabel: true },
      });
      // Honour the same 3-priority cap the manager path enforces.
      const room = Math.max(0, 3 - existing.length);
      if (room === 0) return { carried: 0 };

      const seen = new Set(existing.map((e: any) => e.okrNodeId ?? `ktbr:${e.ktbrLabel ?? ''}`));
      const toInsert = [];
      for (const r of src) {
        const key = r.okrNodeId ?? `ktbr:${r.ktbrLabel ?? ''}`;
        if (seen.has(key)) continue; // idempotent across repeat clicks
        seen.add(key);
        toInsert.push({
          userId: ctx.user.id,
          itemType: r.itemType,
          okrNodeId: r.okrNodeId,
          ktbrLabel: r.ktbrLabel,
          weekStart: null,
          periodKey: cur,
          sortOrder: existing.length + toInsert.length,
          // Preserve provenance: a manager-assigned priority carried forward is
          // still that manager's assignment, not a self-set item.
          assignedBy: r.assignedBy,
          assignedAt: r.assignedAt,
          done: false,
          archived: false,
        });
        if (toInsert.length >= room) break;
      }
      if (!toInsert.length) return { carried: 0 };
      await ctx.db.insert(priorities).values(toInsert);
      return { carried: toInsert.length };
    }),

  // ---- Rollover demo seed (admin only, dev aid) ----
  // Puts the caller's own account into the "period just rolled over" state so the
  // Weekly Plan rollover modal can be seen without waiting for a real period
  // boundary: re-stamps their current-period priorities to the previous period and
  // adds two unfinished demo rows there, leaving the current period empty.
  //
  // Returns the ids it moved so the caller can hand them straight back to
  // seedRolloverDemoUndo. Nothing is deleted and nothing is inferred on undo —
  // guessing which previous-period rows "used to be" current would risk dragging
  // genuinely old priorities into the live period.
  seedRolloverDemo: protectedProcedure
    .use(requireAdmin)
    .mutation(async ({ ctx }) => {
      const { cur, prev, prevLabel } = await prioritiesPeriodKeys(ctx.db);
      const current = await ctx.db.query.priorities.findMany({
        where: and(
          eq(priorities.userId, ctx.user.id),
          isNull(priorities.weekStart),
          or(eq(priorities.periodKey, cur), isNull(priorities.periodKey)),
        ),
        columns: { id: true },
      });
      const movedIds = current.map((r: any) => r.id);
      if (movedIds.length) {
        await ctx.db.update(priorities).set({ periodKey: prev })
          .where(inArray(priorities.id, movedIds));
      }
      const demo = [
        'Demo · Draft the manager enablement guide',
        'Demo · Rework the 9-box calibration deck',
      ];
      const inserted = await ctx.db.insert(priorities).values(
        demo.map((label, i) => ({
          userId: ctx.user.id,
          itemType: 'ktbr' as const,
          okrNodeId: null,
          ktbrLabel: label,
          weekStart: null,
          periodKey: prev,
          sortOrder: 90 + i,
          assignedBy: null,
          assignedAt: new Date(),
          done: false,
          archived: false,
        })),
      ).returning({ id: priorities.id });

      return {
        ok: true as const,
        movedIds,
        demoIds: inserted.map((r: any) => r.id),
        previousPeriodLabel: prevLabel,
      };
    }),

  seedRolloverDemoUndo: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ movedIds: z.array(z.string().uuid()), demoIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      const { cur } = await prioritiesPeriodKeys(ctx.db);
      // Remove anything carried over from the demo run, plus the demo rows.
      if (input.demoIds.length) {
        await ctx.db.delete(priorities).where(and(
          eq(priorities.userId, ctx.user.id),
          inArray(priorities.id, input.demoIds),
        ));
      }
      const carried = await ctx.db.query.priorities.findMany({
        where: and(
          eq(priorities.userId, ctx.user.id),
          isNull(priorities.weekStart),
          eq(priorities.periodKey, cur),
        ),
        columns: { id: true, ktbrLabel: true },
      });
      const demoCarried = carried.filter((r: any) => (r.ktbrLabel ?? '').startsWith('Demo · ')).map((r: any) => r.id);
      if (demoCarried.length) {
        await ctx.db.delete(priorities).where(inArray(priorities.id, demoCarried));
      }
      if (input.movedIds.length) {
        await ctx.db.update(priorities).set({ periodKey: cur })
          .where(and(eq(priorities.userId, ctx.user.id), inArray(priorities.id, input.movedIds)));
      }
      return { ok: true as const, restored: input.movedIds.length, removed: input.demoIds.length + demoCarried.length };
    }),

  // ---- Assignment demo seed (admin only, dev aid) ----
  // A manager assigning to THEMSELVES is deliberately not notified, which makes
  // the employee-facing assignment flow impossible to test on your own account.
  // This stages it faithfully instead of loosening the guard: it writes a priority
  // on the caller stamped assignedBy = someone else, plus the same
  // priority_assigned notice prioritiesAdd would have written. The caller then
  // sees exactly what a real employee sees — the popup and the Weekly Plan row.
  seedAssignmentDemo: protectedProcedure
    .use(requireAdmin)
    .mutation(async ({ ctx }) => {
      const me = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
      // Prefer the caller's real manager as the pretend assigner; otherwise any
      // other active user, so the notice names a real person.
      let assigner = me?.managerId
        ? await ctx.db.query.users.findFirst({ where: eq(users.id, me.managerId) })
        : null;
      if (!assigner) {
        const others = await ctx.db.query.users.findMany({
          where: and(eq(users.isActive, true), ne(users.id, ctx.user.id)),
          columns: { id: true, name: true, email: true },
          limit: 1,
        });
        assigner = (others[0] as any) ?? null;
      }
      if (!assigner) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No other user available to act as the assigner.' });

      const periodKey = await currentPrioritiesKey(ctx.db);
      const mine = await ctx.db.query.priorities.findMany({
        where: and(eq(priorities.userId, ctx.user.id), isNull(priorities.weekStart)),
        columns: { okrNodeId: true },
      });
      const taken = new Set(mine.map((r: any) => r.okrNodeId).filter(Boolean));
      const candidates = await ctx.db.query.okrNodes.findMany({
        where: isNull(okrNodes.archivedAt),
        orderBy: [asc(okrNodes.sortOrder), asc(okrNodes.createdAt)],
      });
      const node = candidates.find((n: any) => !taken.has(n.id) && (n.type === 'key_result' || n.type === 'objective'));
      if (!node) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No spare OKR item to assign.' });

      const [row] = await ctx.db.insert(priorities).values({
        userId: ctx.user.id,
        itemType: node.type,
        okrNodeId: node.id,
        weekStart: null,
        periodKey,
        sortOrder: mine.length,
        assignedBy: assigner.id,
        assignedAt: new Date(),
        done: false,
        archived: false,
      }).returning();

      const [notice] = await ctx.db.insert(notifications).values({
        userId: ctx.user.id,
        type: 'priority_assigned',
        message: `${assigner.name ?? assigner.email ?? 'Your manager'} assigned you a priority: ${node.title}`,
        referenceId: row.id,
        referenceType: 'assigned_priority',
      }).returning();

      return { ok: true as const, priorityId: row.id, notificationId: notice.id, assignerName: assigner.name ?? null, okrTitle: node.title };
    }),

  seedAssignmentDemoUndo: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ priorityId: z.string().uuid(), notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(priorities).where(and(
        eq(priorities.userId, ctx.user.id), eq(priorities.id, input.priorityId),
      ));
      await ctx.db.delete(notifications).where(and(
        eq(notifications.userId, ctx.user.id), eq(notifications.id, input.notificationId),
      ));
      return { ok: true as const };
    }),

  prioritiesToggleDone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.priorities.findFirst({ where: eq(priorities.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const isOwner = row.userId === ctx.user.id;
      const isManager = hasMinimumRole((ctx.user.role || 'user') as RoleTier, 'manager');
      if (!isOwner && !isManager) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed.' });
      const [updated] = await ctx.db.update(priorities)
        .set({ done: input.done, completedAt: input.done ? new Date() : null })
        .where(eq(priorities.id, input.id)).returning();
      // Move the linked OKR. Assigned priorities are ALWAYS OKR-linked
      // (prioritiesAdd requires an okrNodeId), yet this path never touched
      // okr_nodes — so the one list guaranteed to have an OKR behind it was the
      // only one that did not move its progress bar, while the free-text weekly
      // list did via WeeklyPlan's toggleLinked. Un-completing goes to
      // 'in_progress', not 'not_started': the work was demonstrably underway, and
      // resetting to not_started would drop the bar to 0 and lose that.
      if (row.okrNodeId) {
        await ctx.db.update(okrNodes)
          .set({ status: input.done ? 'complete' : 'in_progress', updatedAt: new Date() })
          .where(eq(okrNodes.id, row.okrNodeId));
      }
      return updated;
    }),

  // Archive / unarchive a priority — declutter a completed item off the active
  // Weekly-Plan list. Owner or manager. Archiving a not-done item also marks it
  // done (you only archive things you're finished with).
  prioritiesSetArchived: protectedProcedure
    .input(z.object({ id: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.priorities.findFirst({ where: eq(priorities.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const isOwner = row.userId === ctx.user.id;
      const isManager = hasMinimumRole((ctx.user.role || 'user') as RoleTier, 'manager');
      if (!isOwner && !isManager) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed.' });
      const now = new Date();
      const [updated] = await ctx.db.update(priorities)
        .set({
          archived: input.archived,
          archivedAt: input.archived ? now : null,
          done: input.archived ? true : row.done,
          completedAt: input.archived && !row.completedAt ? now : row.completedAt,
        })
        .where(eq(priorities.id, input.id)).returning();
      return updated;
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
    .input(z.object({ ids: z.array(z.string().uuid()), startISO: z.string().optional(), endISO: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.ids.length === 0) return { people: [] };
      const start = input.startISO ? input.startISO.slice(0, 10) : null;
      const end = input.endISO ? input.endISO.slice(0, 10) : null;
      const [people, ratings] = await Promise.all([
        ctx.db.query.users.findMany({ where: inArray(users.id, input.ids) }),
        ctx.db.query.nineBoxRatings.findMany({
          where: start && end
            ? and(inArray(nineBoxRatings.userId, input.ids), gte(nineBoxRatings.ratedAt, start), lt(nineBoxRatings.ratedAt, end))
            : inArray(nineBoxRatings.userId, input.ids),
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
    .input(z.object({ userId: z.string().uuid(), box: z.number().int().min(1).max(9), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanPlace(ctx, input.userId);
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
      const existing = await ctx.db.query.priorities.findFirst({ where: eq(priorities.id, input.id) });
      if (existing?.periodKey) {
        const curKey = await currentPrioritiesKey(ctx.db);
        if (existing.periodKey !== curKey) throw new TRPCError({ code: 'FORBIDDEN', message: 'Past period is view-only.' });
      }
      await ctx.db.delete(priorities).where(eq(priorities.id, input.id));
      return { ok: true };
    }),

  // ---- CSV imports (admin). All resolve the employee by email. ----
  importPriorities: protectedProcedure.use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ email: z.string(), label: z.string() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const idByEmail = new Map((await ctx.db.query.users.findMany()).map((u) => [u.email.toLowerCase(), u.id]));
      let order = 0;
      for (const r of input.rows) {
        const email = (r.email ?? '').trim().toLowerCase(); const label = (r.label ?? '').trim();
        if (!email || !label) { skipped++; continue; }
        const uid = idByEmail.get(email); if (!uid) { skipped++; errors.push(`${email}: no matching employee`); continue; }
        try { await ctx.db.insert(priorities).values({ userId: uid, itemType: 'ktbr', ktbrLabel: label, sortOrder: order++ }); added++; }
        catch (e) { errors.push(`${email}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      return { added, skipped, errors: errors.slice(0, 50) };
    }),
  importEngagement: protectedProcedure.use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ email: z.string(), asof: z.string().optional(), asOf: z.string().optional(), score: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let updated = 0; let skipped = 0; const errors: string[] = [];
      const idByEmail = new Map((await ctx.db.query.users.findMany()).map((u) => [u.email.toLowerCase(), u.id]));
      const today = new Date().toISOString().slice(0, 10);
      for (const r of input.rows) {
        const email = (r.email ?? '').trim().toLowerCase(); if (!email) { skipped++; continue; }
        const uid = idByEmail.get(email); if (!uid) { skipped++; errors.push(`${email}: no matching employee`); continue; }
        const asOf = (r.asOf ?? r.asof ?? '').trim() || today;
        const raw = (r.score ?? '').trim();
        const score = raw !== '' && !Number.isNaN(Number(raw)) ? Math.max(0, Math.min(100, Math.round(Number(raw)))) : null;
        try {
          const ex = await ctx.db.query.engagementSnapshots.findFirst({ where: and(eq(engagementSnapshots.userId, uid), eq(engagementSnapshots.asOf, asOf)) });
          if (ex) { await ctx.db.update(engagementSnapshots).set({ score }).where(and(eq(engagementSnapshots.userId, uid), eq(engagementSnapshots.asOf, asOf))); updated++; }
          else { await ctx.db.insert(engagementSnapshots).values({ userId: uid, asOf, score, drivers: [] }); added++; }
        } catch (e) { errors.push(`${email}: ${e instanceof Error ? e.message : 'write failed'}`); }
      }
      return { added, updated, skipped, errors: errors.slice(0, 50) };
    }),
  importNinebox: protectedProcedure.use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ email: z.string(), box: z.string().optional(), note: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const idByEmail = new Map((await ctx.db.query.users.findMany()).map((u) => [u.email.toLowerCase(), u.id]));
      for (const r of input.rows) {
        const email = (r.email ?? '').trim().toLowerCase(); if (!email) { skipped++; continue; }
        const uid = idByEmail.get(email); if (!uid) { skipped++; errors.push(`${email}: no matching employee`); continue; }
        const box = Math.round(Number(r.box));
        if (!Number.isFinite(box) || box < 1 || box > 9) { skipped++; errors.push(`${email}: box must be 1-9`); continue; }
        try { await ctx.db.insert(nineBoxRatings).values({ userId: uid, box, note: r.note?.trim() || null, ratedBy: ctx.user.id }); added++; }
        catch (e) { errors.push(`${email}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      return { added, skipped, errors: errors.slice(0, 50) };
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
  nineboxClear: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanPlace(ctx, input.userId);
      await ctx.db.delete(nineBoxRatings).where(eq(nineBoxRatings.userId, input.userId));
      return { ok: true };
    }),
  // ================= Stage 2: Assessments (read) =================
  assessmentsByUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertCanReadAssessments(ctx);
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

  /** Can the current viewer see assessments? Lets the UI hide the tab/page
   *  instead of rendering something that will 403. Not a security boundary —
   *  assertCanReadAssessments on each procedure is. */
  assessmentAccess: protectedProcedure
    .query(async ({ ctx }) => {
      const viewer = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id as string),
        columns: { role: true, isHrAccess: true },
      });
      const role = (viewer?.role ?? 'user') as RoleTier;
      return { canRead: !!viewer && (hasMinimumRole(role, 'admin') || !!viewer.isHrAccess) };
    }),

  // ================= Assessment PDF import (parse -> confirm -> commit) =================
  // Two steps on purpose. `assessmentImportParse` NEVER writes: it extracts the
  // vendor PDF, returns an editable draft plus notes on anything it could not
  // find, and flags a name mismatch against the chosen person. The admin
  // corrects the draft, then `assessmentImportCommit` writes it. A mis-parse
  // therefore costs a correction, not wrong cognitive/personality data on a
  // real person's record. See services/assessmentPdf.ts.

  /** Parse only. Returns a draft for confirmation — writes nothing. */
  assessmentImportParse: protectedProcedure.use(requireAdmin)
    .input(z.object({
      fileName: z.string().min(1),
      fileBase64: z.string().min(1),
      kind: z.enum(['ccat', 'epp', 'insights']).optional(),
      userId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Belt and braces: the express.json limit for /api/trpc is 25mb, which a
      // base64 payload hits at roughly an 18mb file. Checking here turns a
      // transport-level 413 into a sentence the user can act on.
      const approxBytes = Math.floor((input.fileBase64.length * 3) / 4);
      const MAX_BYTES = 18 * 1024 * 1024;
      if (approxBytes > MAX_BYTES) {
        throw new TRPCError({
          code: 'PAYLOAD_TOO_LARGE',
          message: `"${input.fileName}" is ${(approxBytes / 1024 / 1024).toFixed(1)}MB — the limit is 18MB. Assessment reports are normally well under 5MB, so check this is the right file.`,
        });
      }
      const parsed = await parseAssessmentPdf(input.fileBase64, input.fileName, input.kind as AssessmentKind | undefined);

      // Attribution safety net: warn (never block) when the name printed on the
      // report doesn't look like the person selected. Compare on normalized
      // first+last so "Brooke S. Friedman" still matches "Brooke Friedman".
      let nameMismatch: { pdfName: string; personName: string } | null = null;
      if (input.userId && parsed.detectedName) {
        const person = await ctx.db.query.users.findFirst({
          where: eq(users.id, input.userId), columns: { name: true, email: true },
        });
        const key = (v: string) => {
          const parts = v.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
          return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts.join(' ');
        };
        const personName = person?.name ?? '';
        if (personName && key(personName) !== key(parsed.detectedName)) {
          nameMismatch = { pdfName: parsed.detectedName, personName };
        }
      }
      return { ...parsed, nameMismatch };
    }),

  /** Commit a confirmed draft. Replaces that assessment type for that person. */
  assessmentImportCommit: protectedProcedure.use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(),
      kind: z.enum(['ccat', 'epp', 'insights']),
      sourceFile: z.string().optional(),
      ccat: z.object({
        sections: z.array(z.object({
          label: z.string().min(1), score: numIn, sortOrder: z.number().int().optional(),
        })),
      }).optional(),
      epp: z.object({
        profileName: z.string().nullable().optional(),
        score: numIn,
        attributes: z.array(z.object({
          name: z.string().min(1), st6Score: numIn, sortOrder: z.number().int().optional(),
        })),
      }).optional(),
      insights: z.object({
        insightsType: z.string().nullable().optional(),
        consciousWheel: z.string().nullable().optional(),
        lessWheel: z.string().nullable().optional(),
        preferenceFlow: numIn,
        completedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        profiles: z.array(z.object({
          color: z.enum(['blue', 'green', 'yellow', 'red']),
          consciousScore: numIn, lessConsciousScore: numIn,
          isPrimary: z.boolean().optional(), sortOrder: z.number().int().optional(),
        })),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Person attribution is the whole point of the flow — never infer it.
      const person = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId), columns: { id: true, name: true, email: true },
      });
      if (!person) throw new TRPCError({ code: 'NOT_FOUND', message: 'That person no longer exists — pick someone else.' });

      const payload = input[input.kind];
      if (!payload) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `No ${input.kind.toUpperCase()} data was supplied to save.` });
      }

      // Every assessment type needs the summary row to exist (it holds the
      // badge colours and the Insights header meta, and it is the FK parent
      // the Organization card reads first).
      const existingSummary = await ctx.db.query.assessmentSummaries.findFirst({
        where: eq(assessmentSummaries.userId, input.userId),
      });
      if (!existingSummary) {
        await ctx.db.insert(assessmentSummaries).values({ userId: input.userId }).onConflictDoNothing();
      }

      let rowsWritten = 0;

      if (input.kind === 'ccat' && input.ccat) {
        // Replace, don't append — re-uploading a corrected report should not
        // leave the old bars behind next to the new ones.
        await ctx.db.delete(assessmentCcatSections).where(eq(assessmentCcatSections.userId, input.userId));
        const rows = input.ccat.sections
          .filter((s) => s.label.trim() !== '')
          .map((s, i) => ({
            userId: input.userId, label: s.label.trim(),
            score: toDb(s.score ?? null), sortOrder: s.sortOrder ?? i * 10,
          }));
        if (rows.length) await ctx.db.insert(assessmentCcatSections).values(rows);
        rowsWritten = rows.length;
      }

      if (input.kind === 'epp' && input.epp) {
        await ctx.db.delete(assessmentEppAttributes).where(eq(assessmentEppAttributes.userId, input.userId));
        const rows = input.epp.attributes
          .filter((a) => a.name.trim() !== '')
          .map((a, i) => ({
            userId: input.userId, name: a.name.trim(),
            st6Score: toDb(a.st6Score ?? null), sortOrder: a.sortOrder ?? i * 10,
          }));
        if (rows.length) await ctx.db.insert(assessmentEppAttributes).values(rows);
        rowsWritten = rows.length;
        await ctx.db.update(assessmentSummaries).set({
          eppProfile: input.epp.profileName?.trim() || null,
          eppScore: toDb(input.epp.score ?? null),
          updatedAt: new Date(),
        }).where(eq(assessmentSummaries.userId, input.userId));
      }

      if (input.kind === 'insights' && input.insights) {
        await ctx.db.delete(assessmentInsightProfiles).where(eq(assessmentInsightProfiles.userId, input.userId));
        const rows = input.insights.profiles.map((p, i) => ({
          userId: input.userId, color: p.color,
          consciousScore: toDb(p.consciousScore ?? null),
          lessConsciousScore: toDb(p.lessConsciousScore ?? null),
          isPrimary: p.isPrimary ?? false, sortOrder: p.sortOrder ?? i * 10,
        }));
        if (rows.length) await ctx.db.insert(assessmentInsightProfiles).values(rows);
        rowsWritten = rows.length;
        await ctx.db.update(assessmentSummaries).set({
          insightsType: input.insights.insightsType?.trim() || null,
          insightsConsciousWheel: input.insights.consciousWheel?.trim() || null,
          insightsLessWheel: input.insights.lessWheel?.trim() || null,
          insightsPreferenceFlow: toDb(input.insights.preferenceFlow ?? null),
          insightsCompletedAt: input.insights.completedAt || null,
          insightsSource: 'uploaded',
          updatedAt: new Date(),
        }).where(eq(assessmentSummaries.userId, input.userId));
      }

      return {
        ok: true as const,
        kind: input.kind,
        userId: input.userId,
        personName: person.name ?? person.email ?? 'that person',
        rowsWritten,
        sourceFile: input.sourceFile ?? null,
      };
    }),

});
