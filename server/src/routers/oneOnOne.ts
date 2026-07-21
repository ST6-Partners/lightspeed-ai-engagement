// ============================================================
// 1:1 HUB router — pair-scoped talking points, action items, notes that
// live under the Reviews page. AI Engagement (4-Lightspeed), 2026-07-21 (bf).
//
// Access model: everything is scoped to a manager<->employee PAIR anchored on
// employeeId. A caller may touch a pair only if they ARE the employee, are the
// employee's manager (users.managerId), or are admin+. Private notes are
// returned ONLY to their author — never to the other side. tRPC, app convention.
// ============================================================

import { z } from 'zod';
import { eq, and, asc, desc, isNull, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { hasMinimumRole } from '../services/permissions.js';
import type { RoleTier } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { talkingPoints, actionItems, oneOnOneNotes } from '../db/schema/oneOnOne.js';
import { notifications } from '../db/schema/notifications.js';

// Throw unless the caller may access this employee's 1:1 pair.
async function assertPairAccess(
  ctx: { db: any; user: { id: string; role?: string | null } },
  employeeId: string,
) {
  if (employeeId === ctx.user.id) return; // the employee, viewing their own space
  const emp = await ctx.db.query.users.findFirst({ where: eq(users.id, employeeId) });
  const isTheirManager = !!emp && emp.managerId === ctx.user.id;
  const isAdmin = hasMinimumRole((ctx.user.role || 'user') as RoleTier, 'admin');
  if (!isTheirManager && !isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: "Not your 1:1." });
  }
}

// Resolve created_by ids -> display names for "added by" badges.
async function nameMap(ctx: { db: any }, ids: (string | null)[]) {
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (!uniq.length) return new Map<string, string>();
  const rows = await ctx.db.query.users.findMany({ where: inArray(users.id, uniq) });
  return new Map(rows.map((r: { id: string; name: string | null }) => [r.id, r.name ?? '']));
}

const empInput = z.object({ employeeId: z.string().uuid() });

export const oneOnOneRouter = router({
  // ---- Manager's employee switcher: this user's direct reports ----
  myReports: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.users.findMany({
      where: and(eq(users.managerId, ctx.user.id), eq(users.isActive, true)),
    });
    return rows
      .map((r) => ({ id: r.id, name: r.name ?? '', title: r.title ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }),

  // ================= Talking points =================
  talkingPointsList: protectedProcedure.input(empInput).query(async ({ ctx, input }) => {
    await assertPairAccess(ctx, input.employeeId);
    const rows = await ctx.db.query.talkingPoints.findMany({
      where: eq(talkingPoints.employeeId, input.employeeId),
      orderBy: [asc(talkingPoints.sortOrder), asc(talkingPoints.createdAt)],
    });
    const names = await nameMap(ctx, rows.map((r) => r.createdBy));
    const shape = (r: typeof rows[number]) => ({
      id: r.id, text: r.text, done: r.done, archived: r.archived,
      createdBy: r.createdBy, createdByName: r.createdBy ? (names.get(r.createdBy) ?? '') : '',
      createdAt: r.createdAt, completedAt: r.completedAt, archivedAt: r.archivedAt,
    });
    return {
      active: rows.filter((r) => !r.archived).map(shape),
      archived: rows.filter((r) => r.archived).map(shape),
    };
  }),

  talkingPointsAdd: protectedProcedure
    .input(empInput.extend({ text: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await assertPairAccess(ctx, input.employeeId);
      const existing = await ctx.db.query.talkingPoints.findMany({
        where: eq(talkingPoints.employeeId, input.employeeId),
      });
      const [row] = await ctx.db.insert(talkingPoints).values({
        employeeId: input.employeeId, createdBy: ctx.user.id, text: input.text,
        sortOrder: existing.length,
      }).returning();
      // Notify the employee's manager when a talking point is added by anyone
      // other than the manager (typically the employee). Pull-based: surfaces on
      // the manager's Insights dashboard + notification bell. referenceId is the
      // employee so alerts group per-person and clear when the manager opens the 1:1.
      const emp = await ctx.db.query.users.findFirst({ where: eq(users.id, input.employeeId) });
      if (emp?.managerId && emp.managerId !== ctx.user.id) {
        const snippet = input.text.length > 80 ? input.text.slice(0, 77) + '…' : input.text;
        await ctx.db.insert(notifications).values({
          userId: emp.managerId,
          type: 'talking_point',
          message: `${emp.name ?? 'A team member'} added a talking point: ${snippet}`,
          referenceId: input.employeeId,
          referenceType: 'talking_point',
        });
      }
      return row;
    }),

  // Manager Insights: current user's unseen "talking point added" alerts,
  // grouped by the employee whose 1:1 they belong to (most recent first).
  talkingPointAlerts: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, ctx.user.id),
        eq(notifications.type, 'talking_point'),
        isNull(notifications.readAt),
      ),
      orderBy: [desc(notifications.createdAt)],
    });
    const names = await nameMap(ctx, rows.map((r: any) => r.referenceId));
    type Group = { employeeId: string; employeeName: string; count: number; latestAt: Date; items: { id: string; message: string; createdAt: Date }[] };
    const byEmp = new Map<string, Group>();
    for (const r of rows as any[]) {
      const empId: string | null = r.referenceId;
      if (!empId) continue;
      const existing = byEmp.get(empId);
      const g: Group = existing ?? {
        employeeId: empId,
        employeeName: (names.get(empId) as string | undefined) ?? 'A team member',
        count: 0,
        latestAt: r.createdAt as Date,
        items: [],
      };
      if (!existing) byEmp.set(empId, g);
      g.count += 1;
      g.items.push({ id: r.id, message: r.message, createdAt: r.createdAt });
      if (r.createdAt > g.latestAt) g.latestAt = r.createdAt;
    }
    return Array.from(byEmp.values()).sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));
  }),

  // Clear the talking-point alerts for one employee — called when the manager
  // opens that person's 1:1 space (auto-mark-seen).
  markTalkingPointAlertsSeen: protectedProcedure
    .input(empInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.type, 'talking_point'),
          eq(notifications.referenceId, input.employeeId),
          isNull(notifications.readAt),
        ));
      return { success: true };
    }),

  talkingPointsToggleDone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.talkingPoints.findFirst({ where: eq(talkingPoints.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertPairAccess(ctx, row.employeeId);
      const [updated] = await ctx.db.update(talkingPoints)
        .set({ done: input.done, completedAt: input.done ? new Date() : null })
        .where(eq(talkingPoints.id, input.id)).returning();
      return updated;
    }),

  talkingPointsSetArchived: protectedProcedure
    .input(z.object({ id: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.talkingPoints.findFirst({ where: eq(talkingPoints.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertPairAccess(ctx, row.employeeId);
      const now = new Date();
      const [updated] = await ctx.db.update(talkingPoints)
        .set({
          archived: input.archived,
          archivedAt: input.archived ? now : null,
          done: input.archived ? true : row.done,
          completedAt: input.archived && !row.completedAt ? now : row.completedAt,
        })
        .where(eq(talkingPoints.id, input.id)).returning();
      return updated;
    }),

  // ================= Action items =================
  actionItemsList: protectedProcedure.input(empInput).query(async ({ ctx, input }) => {
    await assertPairAccess(ctx, input.employeeId);
    const rows = await ctx.db.query.actionItems.findMany({
      where: eq(actionItems.employeeId, input.employeeId),
      orderBy: [asc(actionItems.sortOrder), asc(actionItems.createdAt)],
    });
    const names = await nameMap(ctx, rows.map((r) => r.createdBy));
    const shape = (r: typeof rows[number]) => ({
      id: r.id, text: r.text, dueDate: r.dueDate, inWeeklyPlan: r.inWeeklyPlan,
      done: r.done, archived: r.archived,
      createdBy: r.createdBy, createdByName: r.createdBy ? (names.get(r.createdBy) ?? '') : '',
      createdAt: r.createdAt, completedAt: r.completedAt, archivedAt: r.archivedAt,
    });
    return {
      active: rows.filter((r) => !r.archived).map(shape),
      archived: rows.filter((r) => r.archived).map(shape),
    };
  }),

  actionItemsAdd: protectedProcedure
    .input(empInput.extend({
      text: z.string().trim().min(1).max(2000),
      dueDate: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertPairAccess(ctx, input.employeeId);
      const existing = await ctx.db.query.actionItems.findMany({
        where: eq(actionItems.employeeId, input.employeeId),
      });
      const [row] = await ctx.db.insert(actionItems).values({
        employeeId: input.employeeId, createdBy: ctx.user.id, text: input.text,
        dueDate: input.dueDate ?? null, sortOrder: existing.length,
      }).returning();
      return row;
    }),

  actionItemsToggleDone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.actionItems.findFirst({ where: eq(actionItems.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertPairAccess(ctx, row.employeeId);
      const [updated] = await ctx.db.update(actionItems)
        .set({ done: input.done, completedAt: input.done ? new Date() : null })
        .where(eq(actionItems.id, input.id)).returning();
      return updated;
    }),

  actionItemsSetArchived: protectedProcedure
    .input(z.object({ id: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.actionItems.findFirst({ where: eq(actionItems.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertPairAccess(ctx, row.employeeId);
      const now = new Date();
      const [updated] = await ctx.db.update(actionItems)
        .set({
          archived: input.archived,
          archivedAt: input.archived ? now : null,
          done: input.archived ? true : row.done,
          completedAt: input.archived && !row.completedAt ? now : row.completedAt,
        })
        .where(eq(actionItems.id, input.id)).returning();
      return updated;
    }),

  // The employee pulls an action item into (or out of) their Weekly Plan box.
  actionItemsSetInWeeklyPlan: protectedProcedure
    .input(z.object({ id: z.string().uuid(), inWeeklyPlan: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.actionItems.findFirst({ where: eq(actionItems.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertPairAccess(ctx, row.employeeId);
      const [updated] = await ctx.db.update(actionItems)
        .set({ inWeeklyPlan: input.inWeeklyPlan })
        .where(eq(actionItems.id, input.id)).returning();
      return updated;
    }),

  // Weekly Plan "Action Items" box: the CURRENT user's own pulled-in items.
  myWeeklyPlanActionItems: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.actionItems.findMany({
      where: and(
        eq(actionItems.employeeId, ctx.user.id),
        eq(actionItems.inWeeklyPlan, true),
        eq(actionItems.archived, false),
      ),
      orderBy: [asc(actionItems.sortOrder), asc(actionItems.createdAt)],
    });
    return rows.map((r) => ({ id: r.id, text: r.text, done: r.done, dueDate: r.dueDate }));
  }),

  // ================= Notes (shared + private) =================
  notesGet: protectedProcedure.input(empInput).query(async ({ ctx, input }) => {
    await assertPairAccess(ctx, input.employeeId);
    const rows = await ctx.db.query.oneOnOneNotes.findMany({
      where: eq(oneOnOneNotes.employeeId, input.employeeId),
    });
    const shared = rows.filter((r) => r.scope === 'shared');
    const names = await nameMap(ctx, shared.map((r) => r.authorId));
    // Private notes: only the caller's own row is ever returned.
    const myPrivate = rows.find((r) => r.scope === 'private' && r.authorId === ctx.user.id);
    return {
      shared: shared.map((r) => ({
        authorId: r.authorId, authorName: names.get(r.authorId) ?? '',
        isMine: r.authorId === ctx.user.id, body: r.body, updatedAt: r.updatedAt,
      })),
      myPrivateBody: myPrivate?.body ?? '',
    };
  }),

  notesSave: protectedProcedure
    .input(empInput.extend({
      scope: z.enum(['shared', 'private']),
      body: z.string().max(20000),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertPairAccess(ctx, input.employeeId);
      await ctx.db.insert(oneOnOneNotes)
        .values({ employeeId: input.employeeId, authorId: ctx.user.id, scope: input.scope, body: input.body })
        .onConflictDoUpdate({
          target: [oneOnOneNotes.employeeId, oneOnOneNotes.authorId, oneOnOneNotes.scope],
          set: { body: input.body, updatedAt: new Date() },
        });
      return { ok: true };
    }),
});
