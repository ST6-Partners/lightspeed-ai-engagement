// ============================================================
// NOTIFICATIONS ROUTER — user notifications management
// Tables: notifications
// ============================================================

import { z } from 'zod';
import { eq, and, desc, isNull, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { notifications } from '../db/schema/notifications.js';
import { requireAdmin } from '../services/permissions.js';

export const notificationsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          message: notifications.message,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          referenceId: notifications.referenceId,
          referenceType: notifications.referenceType,
        })
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      return rows;
    }),

  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await ctx.db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, ctx.user.id),
          isNull(notifications.readAt)
        ));

      return result[0].count;
    }),

  markRead: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const notification = await ctx.db.query.notifications.findFirst({
        where: eq(notifications.id, input.id),
      });

      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (notification.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Can only mark your own notifications as read' });
      }

      const [updated] = await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, input.id))
        .returning();

      return updated;
    }),

  // Dismiss the new-period notice. Marks only the unread `cadence_new_period`
  // rows read — deliberately NOT markAllRead, which would also swallow unrelated
  // unread notifications. `readAt` doubles as the "already saw the period modal"
  // flag: it is server-side, so dismissing on a laptop also dismisses on a phone,
  // which a localStorage flag could not do. The rows stay in the bell as read, so
  // the notice is recoverable rather than destroyed.
  markPeriodNoticesRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const updated = await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.type, 'cadence_new_period'),
          isNull(notifications.readAt)
        ))
        .returning({ id: notifications.id });

      return { dismissed: updated.length };
    }),

  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId, ctx.user.id),
          isNull(notifications.readAt)
        ));

      return { success: true };
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      userId: z.string().uuid(),
      type: z.string(),
      message: z.string(),
      referenceId: z.string().uuid().optional(),
      referenceType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [notification] = await ctx.db
        .insert(notifications)
        .values({
          userId: input.userId,
          type: input.type,
          message: input.message,
          referenceId: input.referenceId,
          referenceType: input.referenceType,
        })
        .returning();

      return notification;
    }),
});
