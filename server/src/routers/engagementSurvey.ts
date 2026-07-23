// Engagement Survey router — periodic engagement survey (15Five "Engage" parity).
// submit / list / stats. The 66 Likert answers are stored in the `answers` jsonb
// keyed by question id (value 1..5); the eNPS 0..10 score + open-text reason are
// promoted to columns. Responses are confidential; list/stats are for the
// aggregate People-team read, not per-person attribution.
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import type { DrizzleClient } from '../db.js';
import { engagementSurveyResponses, engagementSurveyCompletions } from '../db/schema/engagementSurvey.js';
import { surveyPeriods } from '../db/schema/engagementAnalytics.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';
import { hasMinimumRole, type RoleTier } from '../services/permissions.js';

const answersSchema = z.record(z.string(), z.number().int().min(1).max(5));

type PeriodRow = typeof surveyPeriods.$inferSelect;

// The survey is takeable only while a live period is 'open' AND now is inside
// its release/close window (either bound may be null = unbounded on that side).
function isWithinWindow(p: PeriodRow, now = new Date()): boolean {
  if (p.status !== 'open') return false;
  if (p.releaseAt && now < p.releaseAt) return false;
  if (p.closeAt && now > p.closeAt) return false;
  return true;
}

// The single active in-app survey period (admin-managed).
function currentLivePeriod(db: DrizzleClient) {
  return db.query.surveyPeriods.findFirst({
    where: and(eq(surveyPeriods.source, 'live'), eq(surveyPeriods.isCurrent, true)),
  });
}

// Period management is limited to HR or ELT (admins/sysadmins, HR-access, or an
// ELT leadership badge). Managers cannot set release/close dates.
async function assertHrOrElt(db: DrizzleClient, userId: string) {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const ok = !!u && (hasMinimumRole(u.role as RoleTier, 'admin') || u.isHrAccess || u.leaderBadge === 'ELT');
  if (!ok) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only HR or ELT can manage survey periods.' });
}

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
    }))
    .mutation(async ({ ctx, input }) => {
      // ── Period gate: the survey must be open, and each person may submit once
      // per period. Completion is tracked in a separate ledger (below) so the
      // answers themselves stay unattributed. ──
      const period = await currentLivePeriod(ctx.db);
      if (!period || !isWithinWindow(period)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'The engagement survey is not open right now.' });
      }
      const already = await ctx.db.query.engagementSurveyCompletions.findFirst({
        where: and(
          eq(engagementSurveyCompletions.periodId, period.id),
          eq(engagementSurveyCompletions.userId, ctx.user.id),
        ),
      });
      if (already) {
        throw new TRPCError({ code: 'CONFLICT', message: 'You have already completed this period\u2019s survey.' });
      }

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
      // Walk the manager chain once: capture the full ancestor path (user ids) for
      // hierarchy roll-up + manager-scoped analytics, and the nearest ELT ancestor.
      let eltLeader: string | null = null;
      const managerPath: string[] = [];
      let cursor: string | null = me?.managerId ?? null;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        managerPath.push(cursor);
        const anc = await ctx.db.query.users.findFirst({ where: eq(users.id, cursor) });
        if (!anc) break;
        if (!eltLeader && anc.leaderBadge === 'ELT') { eltLeader = anc.name ?? null; }
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
        periodId: period.id,
        managerPath,
        answers: input.answers,
        textAnswers: input.textAnswers ?? {},
        versionId: input.versionId ?? null,
        enpsScore: input.enpsScore ?? null,
        enpsReason: input.enpsReason?.trim() || null,
        status: 'complete',
      }).returning();

      // Once-per-period ledger — records WHO finished, separate from the
      // confidential answers (no answer content stored here).
      await ctx.db.insert(engagementSurveyCompletions)
        .values({ periodId: period.id, userId: ctx.user.id })
        .onConflictDoNothing();
      return row;
    }),

  // Current live period + open state (drives the take-survey gate UI).
  currentPeriod: protectedProcedure.query(async ({ ctx }) => {
    const period = await currentLivePeriod(ctx.db);
    if (!period) return { exists: false as const };
    const now = new Date();
    return {
      exists: true as const,
      id: period.id,
      label: period.label,
      status: period.status,
      releaseAt: period.releaseAt,
      closeAt: period.closeAt,
      isOpen: isWithinWindow(period, now),
      beforeRelease: !!period.releaseAt && now < period.releaseAt,
      afterClose: !!period.closeAt && now > period.closeAt,
    };
  }),

  // Has THIS user already completed the current period?
  myPeriodStatus: protectedProcedure.query(async ({ ctx }) => {
    const period = await currentLivePeriod(ctx.db);
    if (!period) return { hasPeriod: false, completed: false };
    const done = await ctx.db.query.engagementSurveyCompletions.findFirst({
      where: and(
        eq(engagementSurveyCompletions.periodId, period.id),
        eq(engagementSurveyCompletions.userId, ctx.user.id),
      ),
    });
    return { hasPeriod: true, completed: !!done, periodId: period.id };
  }),

  // ── Admin (HR/ELT only): manage the survey period window ──
  adminListPeriods: protectedProcedure.query(async ({ ctx }) => {
    await assertHrOrElt(ctx.db, ctx.user.id);
    return ctx.db.query.surveyPeriods.findMany({ orderBy: [desc(surveyPeriods.createdAt)] });
  }),

  adminCreatePeriod: protectedProcedure
    .input(z.object({
      label: z.string().min(1).max(80),
      releaseAt: z.string().optional().nullable(),
      closeAt: z.string().optional().nullable(),
      status: z.enum(['draft', 'open', 'closed']).default('open'),
      makeCurrent: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertHrOrElt(ctx.db, ctx.user.id);
      if (input.makeCurrent) {
        await ctx.db.update(surveyPeriods).set({ isCurrent: false }).where(eq(surveyPeriods.source, 'live'));
      }
      const [row] = await ctx.db.insert(surveyPeriods).values({
        label: input.label,
        periodDate: new Date().toISOString().slice(0, 10),
        source: 'live',
        isCurrent: input.makeCurrent,
        status: input.status,
        releaseAt: input.releaseAt ? new Date(input.releaseAt) : null,
        closeAt: input.closeAt ? new Date(input.closeAt) : null,
      }).returning();
      return row;
    }),

  adminUpdatePeriod: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      label: z.string().min(1).max(80).optional(),
      releaseAt: z.string().optional().nullable(),
      closeAt: z.string().optional().nullable(),
      status: z.enum(['draft', 'open', 'closed']).optional(),
      makeCurrent: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertHrOrElt(ctx.db, ctx.user.id);
      const updates: Record<string, unknown> = {};
      if (input.label !== undefined) updates.label = input.label;
      if (input.releaseAt !== undefined) updates.releaseAt = input.releaseAt ? new Date(input.releaseAt) : null;
      if (input.closeAt !== undefined) updates.closeAt = input.closeAt ? new Date(input.closeAt) : null;
      if (input.status !== undefined) updates.status = input.status;
      if (input.makeCurrent) {
        await ctx.db.update(surveyPeriods).set({ isCurrent: false }).where(eq(surveyPeriods.source, 'live'));
        updates.isCurrent = true;
      }
      if (Object.keys(updates).length) {
        await ctx.db.update(surveyPeriods).set(updates).where(eq(surveyPeriods.id, input.id));
      }
      return { success: true };
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
