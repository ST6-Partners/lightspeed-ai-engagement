// ============================================================
// CHECK-IN ROUTER — configurable weekly pulse submissions.
// submit / list. `answers` carries the per-question answers (scaled value or
// written text) with the question text denormalized so history stays readable.
// Respondent is attributed (not anonymized).
// ============================================================

import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { checkinResponses } from '../db/schema/checkins.js';
import { users } from '../db/schema/core.js';

const answerSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  type: z.enum(['scale5', 'enps', 'text']),
  category: z.string().optional(),
  driver: z.string().optional(),
  value: z.number().int().min(0).max(10).optional(),
  answerText: z.string().optional(),
});

export const checkinsRouter = router({
  submit: protectedProcedure
    .input(z.object({
      respondentId: z.string().uuid(),
      periodStart: z.string().min(1),             // YYYY-MM-DD
      answers: z.array(answerSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const answered = input.answers.some((a) => a.value != null || (a.answerText && a.answerText.trim()));
      if (!answered) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Answer at least one question before submitting.' });
      const respondent = await ctx.db.query.users.findFirst({ where: eq(users.id, input.respondentId) });
      const [row] = await ctx.db.insert(checkinResponses).values({
        respondentId: input.respondentId,
        respondentName: respondent?.name ?? null,
        weekOf: input.periodStart,
        rotationIndex: 0,
        answers: input.answers,
      }).returning();
      return row;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.checkinResponses.findMany({
      orderBy: [desc(checkinResponses.submittedAt)],
    });
  }),
});
