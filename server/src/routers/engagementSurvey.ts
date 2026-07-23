// Engagement Survey router — periodic engagement survey (15Five "Engage" parity).
// submit / list / stats. The 66 Likert answers are stored in the `answers` jsonb
// keyed by question id (value 1..5); the eNPS 0..10 score + open-text reason are
// promoted to columns. Responses are confidential; list/stats are for the
// aggregate People-team read, not per-person attribution.
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { engagementSurveyResponses } from '../db/schema/engagementSurvey.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';

const answersSchema = z.record(z.string(), z.number().int().min(1).max(5));

export const engagementSurveyRouter = router({
  // Store one completed submission. Attributed to the signed-in user for
  // dedupe/audit, but treated as confidential in every read surface.
  submit: protectedProcedure
    .input(z.object({
      answers: answersSchema,
      textAnswers: z.record(z.string(), z.string().max(4000)).optional(),
      versionId: z.string().uuid().optional(),
      enpsScore: z.number().int().min(0).max(10).optional(),
      enpsReason: z.string().max(4000).optional(),
      periodId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Identity + org attributes come from the signed-in user's PROFILE — the
      // survey never asks "who are you". We snapshot the profile attributes onto
      // the response so later profile/org changes don't rewrite historical results.
      // Responses stay confidential: respondentId is never stored.
      const me = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });

      let jobTitle: string | null = null;
      if (me?.jobTitleId) {
        const jt = await ctx.db.query.jobTitles.findFirst({ where: eq(jobTitles.id, me.jobTitleId) });
        jobTitle = jt?.title ?? null;
      }
      let department: string | null = null;
      if (me?.departmentId) {
        const d = await ctx.db.query.departments.findFirst({ where: eq(departments.id, me.departmentId) });
        department = d?.name ?? null;
      }
      let managerName: string | null = null;
      if (me?.managerId) {
        const mgr = await ctx.db.query.users.findFirst({ where: eq(users.id, me.managerId) });
        managerName = mgr?.name ?? null;
      }
      // ELT leader = nearest ancestor up the manager chain carrying an ELT badge.
      let eltLeader: string | null = null;
      let cursor: string | null = me?.managerId ?? null;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const anc = await ctx.db.query.users.findFirst({ where: eq(users.id, cursor) });
        if (!anc) break;
        if (anc.leaderBadge === 'ELT') { eltLeader = anc.name ?? null; break; }
        cursor = anc.managerId ?? null;
      }

      const [row] = await ctx.db.insert(engagementSurveyResponses).values({
        respondentId: null,
        respondentName: null,
        jobTitle,
        department,
        team: me?.team ?? null,
        location: me?.location ?? null,
        businessUnit: me?.businessUnit ?? null,
        managerName,
        eltLeader,
        startYear: me?.hireYear ?? null,
        periodId: input.periodId ?? null,
        answers: input.answers,
        textAnswers: input.textAnswers ?? {},
        versionId: input.versionId ?? null,
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
