// ============================================================
// MANAGER SURVEY ROUTER — upward-feedback submissions
// AI Engagement (4-Lightspeed)
//
// submit / list. One row per completed review. `ratings` maps question id ->
// 1..5. Attributes the respondent (employee giving feedback) and the manager
// being rated; names are denormalized so historical rows stay readable even if
// a question or user changes. People-picker uses pip.listUsers.
// ============================================================

import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { managerSurveyResponses } from '../db/schema/managerSurvey.js';
import { users } from '../db/schema/core.js';

const ratingsSchema = z.record(z.string().uuid(), z.number().int().min(1).max(5));

export const managerSurveyRouter = router({
  submit: protectedProcedure
    .input(z.object({
      respondentId: z.string().uuid().optional(),
      managerId: z.string().uuid(),
      reviewDate: z.string().min(1),          // YYYY-MM-DD
      ratings: ratingsSchema,
      comments: z.record(z.string().uuid(), z.string()).optional(),
      anonymous: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (Object.keys(input.ratings).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Rate at least one question before submitting.' });
      }
      const anonymous = !!input.anonymous;
      if (!anonymous && !input.respondentId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select the employee giving the rating, or submit anonymously.' });
      }
      const respondent = (!anonymous && input.respondentId)
        ? await ctx.db.query.users.findFirst({ where: eq(users.id, input.respondentId) })
        : null;
      const manager = await ctx.db.query.users.findFirst({ where: eq(users.id, input.managerId) });
      const [row] = await ctx.db.insert(managerSurveyResponses).values({
        respondentId: anonymous ? null : (input.respondentId ?? null),
        respondentName: anonymous ? null : (respondent?.name ?? null),
        managerId: input.managerId,
        managerName: manager?.name ?? null,
        reviewDate: input.reviewDate,
        ratings: input.ratings,
        comments: input.comments ?? {},
        anonymous,
        status: 'complete',
      }).returning();
      return row;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.managerSurveyResponses.findMany({
      orderBy: [desc(managerSurveyResponses.submittedAt)],
    });
  }),
});
