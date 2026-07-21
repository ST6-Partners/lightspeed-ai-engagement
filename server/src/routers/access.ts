// ============================================================
// ACCESS ROUTER — role-driven access + self-service requests.
// request() notifies IT (all admins/sysadmins) via a notification.
// decide() lets an admin approve (raises role) or deny a request.
// ============================================================

import { z } from 'zod';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { requireAdmin, hasMinimumRole, type RoleTier } from '../services/permissions.js';
import { accessRequests } from '../db/schema/accessRequests.js';
import { notifications } from '../db/schema/notifications.js';
import { users } from '../db/schema/core.js';

const SECTION_ROLE: Record<string, RoleTier> = {
  everyday: 'user', account: 'user', planning: 'manager', 'core-data': 'manager', admin: 'admin',
};

export const accessRouter = router({
  // Sections the current user has already requested (drives the "Requested" state).
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select({
      sectionKey: accessRequests.sectionKey,
      status: accessRequests.status,
      createdAt: accessRequests.createdAt,
    }).from(accessRequests)
      .where(eq(accessRequests.userId, ctx.user.id))
      .orderBy(desc(accessRequests.createdAt));
  }),

  // Request access to a locked section → notify every admin (IT).
  request: protectedProcedure
    .input(z.object({ sectionKey: z.string(), sectionLabel: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const requiredRole = SECTION_ROLE[input.sectionKey] ?? 'admin';

      // Dedupe: one open (pending) request per user per section.
      const existing = await ctx.db.query.accessRequests.findFirst({
        where: and(
          eq(accessRequests.userId, ctx.user.id),
          eq(accessRequests.sectionKey, input.sectionKey),
          eq(accessRequests.status, 'pending'),
        ),
      });
      if (existing) return { success: true, alreadyPending: true };

      const [reqRow] = await ctx.db.insert(accessRequests).values({
        userId: ctx.user.id,
        sectionKey: input.sectionKey,
        sectionLabel: input.sectionLabel,
        requestedRole: requiredRole,
      }).returning();

      const admins = await ctx.db.query.users.findMany({
        where: inArray(users.role, ['admin', 'sysadmin']),
        columns: { id: true },
      });
      const who = ctx.user.name || ctx.user.email;
      if (admins.length) {
        await ctx.db.insert(notifications).values(admins.map((a) => ({
          userId: a.id,
          type: 'access_request',
          message: `${who} requested access to "${input.sectionLabel}".`,
          referenceId: reqRow.id,
          referenceType: 'access_request',
        })));
      }
      return { success: true, alreadyPending: false };
    }),

  // Admin (IT): pending requests to review.
  listRequests: protectedProcedure
    .use(requireAdmin)
    .query(async ({ ctx }) => {
      return ctx.db.select({
        id: accessRequests.id,
        userId: accessRequests.userId,
        sectionKey: accessRequests.sectionKey,
        sectionLabel: accessRequests.sectionLabel,
        requestedRole: accessRequests.requestedRole,
        status: accessRequests.status,
        createdAt: accessRequests.createdAt,
        userName: users.name,
        userEmail: users.email,
      }).from(accessRequests)
        .leftJoin(users, eq(accessRequests.userId, users.id))
        .where(eq(accessRequests.status, 'pending'))
        .orderBy(desc(accessRequests.createdAt));
    }),

  // Admin (IT): approve (raises the requester's role to the section tier) or deny.
  decide: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), decision: z.enum(['approved', 'denied']) }))
    .mutation(async ({ ctx, input }) => {
      const reqRow = await ctx.db.query.accessRequests.findFirst({ where: eq(accessRequests.id, input.id) });
      if (!reqRow) throw new TRPCError({ code: 'NOT_FOUND' });
      if (reqRow.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'This request was already decided.' });

      await ctx.db.update(accessRequests)
        .set({ status: input.decision, decidedBy: ctx.user.id, decidedAt: new Date() })
        .where(eq(accessRequests.id, input.id));

      if (input.decision === 'approved') {
        const target = await ctx.db.query.users.findFirst({ where: eq(users.id, reqRow.userId) });
        if (target && !hasMinimumRole(target.role as RoleTier, reqRow.requestedRole as RoleTier)) {
          await ctx.db.update(users)
            .set({ role: reqRow.requestedRole, updatedAt: new Date() })
            .where(eq(users.id, reqRow.userId));
        }
      }

      await ctx.db.insert(notifications).values({
        userId: reqRow.userId,
        type: 'access_request',
        message: input.decision === 'approved'
          ? `Your access to "${reqRow.sectionLabel}" was approved.`
          : `Your access request for "${reqRow.sectionLabel}" was declined.`,
        referenceId: reqRow.id,
        referenceType: 'access_request',
      });
      return { success: true };
    }),
});
