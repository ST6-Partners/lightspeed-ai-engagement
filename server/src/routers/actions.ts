// ============================================================
// ACTIONS ROUTER — manager-assigned action items for the Manager Brief.
// Built on the existing `action_items` table (shared with the 1:1 space).
// Manager-gated list/create; assignment writes a notification to the
// assignee (the manager-to-report ping). Toggle-done is allowed for the
// assignee (owner) OR a manager.
// ============================================================

import { z } from 'zod';
import { and, eq, or, inArray, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { requireManager, hasMinimumRole, type RoleTier } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { actionItems } from '../db/schema/oneOnOne.js';
import { notifications } from '../db/schema/notifications.js';

const managerProcedure = protectedProcedure.use(requireManager);

export const actionsRouter = router({
  // Actions the signed-in manager assigned, plus any assigned to their team.
  listForManager: managerProcedure.query(async ({ ctx }) => {
    const team = await ctx.db.query.users.findMany({
      where: and(eq(users.managerId, ctx.user.id), eq(users.isActive, true)),
      columns: { id: true, name: true, email: true },
    });
    const teamIds = team.map((t) => t.id);
    const rows = await ctx.db.query.actionItems.findMany({
      where: teamIds.length
        ? and(
            eq(actionItems.archived, false),
            or(eq(actionItems.createdBy, ctx.user.id), inArray(actionItems.employeeId, teamIds)),
          )
        : and(eq(actionItems.archived, false), eq(actionItems.createdBy, ctx.user.id)),
      orderBy: [desc(actionItems.createdAt)],
    });
    const nameById = new Map<string, string>(team.map((t) => [t.id, t.name ?? t.email ?? '—']));
    return rows.map((r) => ({
      id: r.id,
      title: r.text,
      assigneeId: r.employeeId,
      assigneeName: nameById.get(r.employeeId) ?? '—',
      priority: r.priority,
      dueDate: r.dueDate,
      done: r.done,
    }));
  }),

  // Create + assign an action to a direct report; notify the assignee.
  create: managerProcedure
    .input(z.object({
      title: z.string().min(1, 'Give the action a title.'),
      assigneeId: z.string().uuid(),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      dueDate: z.string().optional(), // YYYY-MM-DD
    }))
    .mutation(async ({ ctx, input }) => {
      const assignee = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.assigneeId),
        columns: { id: true },
      });
      if (!assignee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Assignee not found.' });
      const title = input.title.trim();
      // Same rule as the 1:1 surface (oneOnOne.actionItemsAdd + migration 0098):
      // an action someone ELSE puts on you lands in your Weekly Plan straight
      // away. in_weekly_plan defaults to false and only the employee can flip it,
      // so without this an action assigned from the Insights Dashboard sat
      // invisible — the notification arrived but the Weekly Plan never showed it.
      // Self-assignment keeps the flag as the assignee's own choice.
      const managerAssigned = input.assigneeId !== ctx.user.id;
      const [row] = await ctx.db.insert(actionItems).values({
        employeeId: input.assigneeId,
        createdBy: ctx.user.id,
        text: title,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        inWeeklyPlan: managerAssigned,
      }).returning();
      // Notify the assignee — the manager-to-report ping. type/referenceType match
      // the 1:1 path exactly so this notice gets the bell icon + "Assigned to you"
      // label, fires the assignment popup (AssignmentNoticeModal), and deep-links
      // to /weekly-plan (NotificationBell.linkFor). The former 'action_assigned' /
      // 'action_item' pair was in none of those maps, so the notice was unstyled
      // and clicking it went nowhere.
      await ctx.db.insert(notifications).values({
        userId: input.assigneeId,
        type: 'action_item_assigned',
        message: `${ctx.user.name ?? 'Your manager'} assigned you an action: “${title}”`,
        referenceId: row.id,
        referenceType: 'assigned_action_item',
      });
      return row;
    }),

  // Toggle completion — the assignee (owner) OR a manager can complete it.
  toggleDone: protectedProcedure
    .input(z.object({ id: z.string().uuid(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.actionItems.findFirst({ where: eq(actionItems.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const isOwner = row.employeeId === ctx.user.id;
      const isManager = hasMinimumRole((ctx.user.role || 'user') as RoleTier, 'manager');
      if (!isOwner && !isManager) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed.' });
      const [updated] = await ctx.db.update(actionItems)
        .set({ done: input.done, completedAt: input.done ? new Date() : null })
        .where(eq(actionItems.id, input.id)).returning();
      return updated;
    }),
});
