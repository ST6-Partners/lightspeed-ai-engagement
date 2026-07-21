// ============================================================
// PEER REVIEW ROUTER — lateral peer-feedback submissions.
// AI Engagement (4-Lightspeed) — 2026-07-21. Mirrors managerSurvey.
// submit / list. `ratings` maps question id -> 1..5. Attributes the respondent
// and the peer being reviewed; names denormalized. People-picker uses pip.listUsers.
// ============================================================

import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { peerReviewResponses } from '../db/schema/peerReview.js';
import { users } from '../db/schema/core.js';

const ratingsSchema = z.record(z.string().uuid(), z.number().int().min(1).max(5));

export const peerReviewRouter = router({
  submit: protectedProcedure
    .input(z.object({
      respondentId: z.string().uuid(),
      peerId: z.string().uuid(),
      reviewDate: z.string().min(1),
      ratings: ratingsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      if (Object.keys(input.ratings).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Rate at least one question before submitting.' });
      }
      if (input.respondentId === input.peerId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reviewer and peer must be different people.' });
      }
      const respondent = await ctx.db.query.users.findFirst({ where: eq(users.id, input.respondentId) });
      const peer = await ctx.db.query.users.findFirst({ where: eq(users.id, input.peerId) });
      const [row] = await ctx.db.insert(peerReviewResponses).values({
        respondentId: input.respondentId,
        respondentName: respondent?.name ?? null,
        peerId: input.peerId,
        peerName: peer?.name ?? null,
        reviewDate: input.reviewDate,
        ratings: input.ratings,
        status: 'complete',
      }).returning();
      return row;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.peerReviewResponses.findMany({
      orderBy: [desc(peerReviewResponses.submittedAt)],
    });
  }),
});
