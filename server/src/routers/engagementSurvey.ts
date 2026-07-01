// Engagement Survey router — periodic engagement survey (15Five "Engage" parity).
// submit / list / stats. The 66 Likert answers are stored in the `answers` jsonb
// keyed by question id (value 1..5); the eNPS 0..10 score + open-text reason are
// promoted to columns. Responses are confidential; list/stats are for the
// aggregate People-team read, not per-person attribution.
import { z } from 'zod';
import { desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { engagementSurveyResponses } from '../db/schema/engagementSurvey.js';

const answersSchema = z.record(z.string(), z.number().int().min(1).max(5));

export const engagementSurveyRouter = router({
  // Store one completed submission. Attributed to the signed-in user for
  // dedupe/audit, but treated as confidential in every read surface.
  submit: protectedProcedure
    .input(z.object({
      answers: answersSchema,
      enpsScore: z.number().int().min(0).max(10).optional(),
      enpsReason: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(engagementSurveyResponses).values({
        respondentId: ctx.user.id,
        answers: input.answers,
        enpsScore: input.enpsScore ?? null,
        enpsReason: input.enpsReason?.trim() || null,
        status: 'complete',
      }).returning();
      return row;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.engagementSurveyResponses.findMany({
      orderBy: [desc(engagementSurveyResponses.submittedAt)],
    });
  }),

  // Aggregate read: response count, per-question averages, overall favorability
  // (% of Likert answers that are 4 or 5), and average eNPS. All aggregate —
  // never returns an individual's answers.
  stats: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.engagementSurveyResponses.findMany();
    const count = rows.length;
    const sums: Record<string, { total: number; n: number }> = {};
    let favNum = 0;
    let favDen = 0;
    let enpsSum = 0;
    let enpsN = 0;
    for (const r of rows) {
      const answers = (r.answers ?? {}) as Record<string, number>;
      for (const [k, v] of Object.entries(answers)) {
        if (typeof v !== 'number') continue;
        (sums[k] ??= { total: 0, n: 0 });
        sums[k].total += v;
        sums[k].n += 1;
        favDen += 1;
        if (v >= 4) favNum += 1;
      }
      if (typeof r.enpsScore === 'number') {
        enpsSum += r.enpsScore;
        enpsN += 1;
      }
    }
    const averages: Record<string, number> = {};
    for (const [k, s] of Object.entries(sums)) {
      averages[k] = s.n ? s.total / s.n : 0;
    }
    return {
      count,
      averages,
      favorabilityPct: favDen ? Math.round((favNum / favDen) * 100) : null,
      avgEnps: enpsN ? Math.round((enpsSum / enpsN) * 10) / 10 : null,
    };
  }),
});
