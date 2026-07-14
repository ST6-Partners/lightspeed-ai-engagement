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

  // The signed-in user's most recent check-in 'priorities' answer, split into
  // individual to-do items so the Weekly Plan can offer them for one-click add.
  myLatestPriorities: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.checkinResponses.findMany({
      where: eq(checkinResponses.respondentId, ctx.user.id),
      orderBy: [desc(checkinResponses.submittedAt)],
    });
    const splitItems = (t: string): string[] =>
      t.split(/\r?\n|\u2022|\u00b7/).map((x) => x.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim()).filter(Boolean);
    type A = { type: string; category?: string | null; text: string; answerText?: string | null };
    for (const r of rows) {
      const ans = (Array.isArray(r.answers) ? r.answers : []) as A[];
      let prio = ans.filter((a) => a.type === 'text' && (a.category ?? '') === 'priorities' && !!a.answerText && a.answerText.trim().length > 0);
      if (prio.length === 0) prio = ans.filter((a) => a.type === 'text' && /priorit/i.test(a.text) && !!a.answerText && a.answerText.trim().length > 0);
      if (prio.length > 0) {
        const items = prio.flatMap((a) => splitItems(a.answerText as string));
        if (items.length > 0) return { weekOf: r.weekOf, submittedAt: r.submittedAt, questionText: prio[0].text, items };
      }
    }
    return null;
  }),
});
