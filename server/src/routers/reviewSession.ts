// ============================================================
// REVIEW SESSION ROUTER — the Reviews container + go-forward (2026-07-14)
//
// A review session groups the two rearview passes (values + performance) and
// the go-forward coaching plan for one employee + period. This router owns:
//   • status         — readiness/gate for an employee+period (both passes? perf final?)
//   • draftFromSession— preview an AI go-forward draft synthesized from BOTH passes
//   • createFromSession — gate on performance-complete, then create the coaching plan
//   • forkToPip       — the fork: attach a PIP seeded from the review's weak items
//
// The go-forward reads BOTH instruments (unlike coaching.createFromReview, which
// reads a single values review and is retained for back-compat). Manager-gated.
// ============================================================

import { z } from 'zod';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { router, protectedProcedure } from '../trpc.js';
import { reviewSessions } from '../db/schema/reviewSessions.js';
import { reviews, reviewScores } from '../db/schema/reviews.js';
import { coachingPlans, coachingPlanFocusAreas } from '../db/schema/coaching.js';
import { companyValues } from '../db/schema/values.js';
import { performanceCriteria } from '../db/schema/performance.js';
import { pips, pipConcerns, pipGoals, pipSignatures, pipCheckins } from '../db/schema/pip.js';
import { users } from '../db/schema/core.js';
import { requireManager, hasMinimumRole } from '../services/permissions.js';
import type { RoleTier } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';

// ---- Types --------------------------------------------------

type Instrument = 'value' | 'criterion';
type CombiRow = { itemType: Instrument; itemId: string; label: string; pillar: string | null; score: number; notes: string | null };
type CombiFocus = { itemType: Instrument | null; itemId: string | null; title: string; coachingNote: string };
type CombiDraft = { summaryNarrative: string; strengths: string; focusAreas: CombiFocus[]; aiGenerated: boolean };

const samePeriod = (a: string | null | undefined, b: string | null | undefined) => (a ?? null) === (b ?? null);

// ---- PIP seed defaults (mirror pip.create) ------------------

const DEFAULT_PURPOSE =
  'The goal of this plan is to help you succeed. It identifies specific areas where ' +
  'your performance is not yet meeting the expectations of your role, defines what ' +
  'success looks like in clear and measurable terms, and lays out the support and ' +
  'resources we will provide. Meeting the expectations below within the plan period ' +
  'returns you to good standing.';
const DEFAULT_OUTCOME_MET =
  'You return to good standing. Sustained performance is expected going forward; your ' +
  'manager will continue regular 1:1 support.';
const DEFAULT_OUTCOME_NOT_MET =
  'Further action may follow, which could include an extension of the plan, role change, ' +
  'or termination of employment, consistent with company policy.';
const DEFAULT_SIGNATURE_ROLES = ['employee', 'manager', 'hr', 'reviewer'] as const;
const STARTER_CHECKINS = [
  { label: 'Mid-Point Review', attendees: 'Manager + Employee + HR' },
  { label: 'Final Review', attendees: 'Manager + Employee + HR' },
];

// ---- Loader: both passes for an employee + period -----------

async function loadSessionData(db: any, employeeId: string, periodLabel: string | null) {
  const all = await db.query.reviews.findMany({ where: eq(reviews.employeeId, employeeId) });
  const inPeriod = all.filter((r: any) => samePeriod(r.periodLabel, periodLabel));
  const pick = (type: string) =>
    inPeriod.filter((r: any) => r.type === type)
      .sort((a: any, b: any) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())[0] ?? null;
  const valuesReview = pick('values');
  const perfReview = pick('performance');

  const values = await db.query.companyValues.findMany();
  const criteria = await db.query.performanceCriteria.findMany();
  const vById = new Map<string, any>(values.map((v: any) => [v.id, v]));
  const cById = new Map<string, any>(criteria.map((c: any) => [c.id, c]));

  const rows: CombiRow[] = [];
  if (valuesReview) {
    const sc = await db.query.reviewScores.findMany({ where: eq(reviewScores.reviewId, valuesReview.id) });
    for (const s of sc) rows.push({ itemType: 'value', itemId: s.itemId, label: vById.get(s.itemId)?.name ?? '(retired value)', pillar: vById.get(s.itemId)?.pillar ?? null, score: s.score, notes: s.notes ?? null });
  }
  if (perfReview) {
    const sc = await db.query.reviewScores.findMany({ where: eq(reviewScores.reviewId, perfReview.id) });
    for (const s of sc) rows.push({ itemType: 'criterion', itemId: s.itemId, label: cById.get(s.itemId)?.name ?? '(retired criterion)', pillar: null, score: s.score, notes: s.notes ?? null });
  }
  const employee = await db.query.users.findFirst({ where: eq(users.id, employeeId), columns: { id: true, name: true, email: true } });
  const overallNotes = [valuesReview?.overallNotes, perfReview?.overallNotes].filter(Boolean).join(' ') || null;
  return { valuesReview, perfReview, rows, employeeName: employee?.name ?? employee?.email ?? 'the employee', overallNotes };
}

// ---- Find-or-create the container ---------------------------

async function ensureSession(db: any, employeeId: string, periodLabel: string | null, reviewerId: string) {
  const existing = (await db.query.reviewSessions.findMany({ where: eq(reviewSessions.employeeId, employeeId) }))
    .find((s: any) => samePeriod(s.periodLabel, periodLabel));
  if (existing) return existing;
  const [row] = await db.insert(reviewSessions).values({ employeeId, periodLabel: periodLabel ?? null, reviewerId, status: 'rearview_complete' }).returning();
  // Link any unlinked passes for this employee+period to the new session.
  const passes = (await db.query.reviews.findMany({ where: eq(reviews.employeeId, employeeId) })).filter((r: any) => samePeriod(r.periodLabel, periodLabel) && !r.sessionId);
  if (passes.length) await db.update(reviews).set({ sessionId: row.id }).where(inArray(reviews.id, passes.map((p: any) => p.id)));
  return row;
}

// ---- Drafts (deterministic + AI, both instruments) ----------

function listWords(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{'); const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

function deterministicDraft(name: string, period: string | null, rows: CombiRow[], overallNotes: string | null): CombiDraft {
  const strong = rows.filter((r) => r.score >= 4).sort((a, b) => b.score - a.score);
  const growth = rows.filter((r) => r.score <= 3).sort((a, b) => a.score - b.score).slice(0, 3);
  const p = period ? ` for ${period}` : '';
  const strengths = strong.length
    ? `${name} shows real strength in ${listWords(strong.map((s) => s.label))}. ` +
      strong.map((s) => `On ${s.label} (${s.itemType === 'value' ? 'value' : 'performance'}), ${name} scored ${s.score}/5${s.notes ? ` — ${s.notes}` : '.'}`).join(' ')
    : `This review did not surface a standout strength; use the conversation to find where ${name} feels most effective.`;
  const summaryNarrative =
    `This coaching plan summarizes ${name}'s review${p}, drawing on both the values and performance assessments. ` +
    (overallNotes ? `${overallNotes} ` : '') +
    (strong.length ? `Overall, ${name} is performing well on ${listWords(strong.map((s) => s.label))}. ` : '') +
    (growth.length ? `To keep growing, the plan focuses on ${listWords(growth.map((g) => g.label))}.` : `No pressing growth areas were flagged; the focus is on sustaining momentum.`);
  const focusAreas: CombiFocus[] = growth.map((g) => ({
    itemType: g.itemType, itemId: g.itemId, title: g.label,
    coachingNote: `Current level: ${g.score}/5.` + (g.notes ? ` Reviewer note: ${g.notes}.` : '') + ` Agree on one concrete action and a check-in date to build strength here.`,
  }));
  return { summaryNarrative, strengths, focusAreas, aiGenerated: false };
}

async function generateDraft(name: string, period: string | null, rows: CombiRow[], overallNotes: string | null): Promise<CombiDraft> {
  const fallback = deterministicDraft(name, period, rows, overallNotes);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || rows.length === 0) return fallback;
  const growth = rows.filter((r) => r.score <= 3).sort((a, b) => a.score - b.score).slice(0, 3);
  const scoreLines = rows.slice().sort((a, b) => a.score - b.score)
    .map((r) => `- [${r.itemType === 'value' ? 'Value' : 'Performance'}] ${r.label}${r.pillar ? ` (${r.pillar})` : ''}: ${r.score}/5${r.notes ? ` — ${r.notes}` : ''}`).join('\n');
  const system = [
    'You are an experienced people manager writing a coaching plan that will be printed and handed to an employee during a feedback conversation.',
    'Tone: warm, specific, encouraging, and honest. Address the employee in the third person by name. Never harsh; frame growth as opportunity.',
    'The plan is built from a review with TWO instruments: company VALUES and PERFORMANCE criteria, each scored 1-5 (higher = stronger). Draw on both.',
    'Return STRICT JSON only, no prose around it, matching exactly:',
    '{"summaryNarrative": string, "strengths": string, "focusAreas": [{"label": string, "title": string, "coachingNote": string}]}',
    'summaryNarrative: 2-4 sentences summarizing the whole review across both instruments. strengths: 2-4 sentences grounded in the high-scoring items.',
    'focusAreas: 1-3 growth areas from the LOWEST-scoring items (either instrument); each coachingNote is 1-2 concrete, actionable sentences. Use only the item labels provided.',
  ].join('\n');
  const user = [
    `Employee: ${name}`, period ? `Review period: ${period}` : '', overallNotes ? `Reviewer overall notes: ${overallNotes}` : '', '',
    'Scores (lowest first, across both instruments):', scoreLines, '',
    growth.length ? `Suggested growth focus (lowest): ${growth.map((g) => g.label).join(', ')}.` : 'Nothing scored at or below 3; choose the most useful growth angle.',
  ].filter(Boolean).join('\n');
  try {
    const anthropic = createAnthropic({ apiKey });
    const result = await generateText({ model: anthropic('claude-sonnet-4-6'), system, messages: [{ role: 'user', content: user }], maxOutputTokens: 1200 });
    const parsed = JSON.parse(extractJson(result.text)) as { summaryNarrative?: string; strengths?: string; focusAreas?: { label?: string; title?: string; coachingNote?: string }[] };
    const byLabel = new Map(rows.map((r) => [r.label.toLowerCase(), r]));
    const focusAreas: CombiFocus[] = (parsed.focusAreas ?? []).slice(0, 3).map((f) => {
      const match = f.label ? byLabel.get(f.label.toLowerCase()) : undefined;
      return { itemType: match?.itemType ?? null, itemId: match?.itemId ?? null, title: (f.title || f.label || 'Growth area').slice(0, 200), coachingNote: f.coachingNote ?? '' };
    });
    return {
      summaryNarrative: parsed.summaryNarrative?.trim() || fallback.summaryNarrative,
      strengths: parsed.strengths?.trim() || fallback.strengths,
      focusAreas: focusAreas.length ? focusAreas : fallback.focusAreas,
      aiGenerated: true,
    };
  } catch (err) {
    console.error('[reviewSession] AI draft failed, using deterministic fallback:', (err as any)?.message ?? err);
    return fallback;
  }
}

// ---- Router -------------------------------------------------

const empPeriod = z.object({ employeeId: z.string().uuid(), periodLabel: z.string().max(120).nullable().optional() });

export const reviewSessionRouter = router({
  // Readiness/gate for an employee + period.
  status: protectedProcedure.input(empPeriod).query(async ({ ctx, input }) => {
    const period = input.periodLabel ?? null;
    const { valuesReview, perfReview } = await loadSessionData(ctx.db, input.employeeId, period);
    const plans = (await ctx.db.query.coachingPlans.findMany({ where: eq(coachingPlans.employeeId, input.employeeId), orderBy: [desc(coachingPlans.createdAt)] }))
      .filter((p: any) => samePeriod(p.periodLabel, period));
    const plan = plans[0] ?? null;
    return {
      hasValues: !!valuesReview, valuesFinal: valuesReview?.status === 'final',
      hasPerformance: !!perfReview, performanceFinal: perfReview?.status === 'final',
      canDraft: perfReview?.status === 'final',
      planId: plan?.id ?? null, planTrack: plan?.track ?? null,
    };
  }),

  // Preview an AI draft synthesized from both passes (no write). Used by "Regenerate".
  draftFromSession: protectedProcedure.use(requireManager).input(empPeriod).mutation(async ({ ctx, input }) => {
    const period = input.periodLabel ?? null;
    const data = await loadSessionData(ctx.db, input.employeeId, period);
    if (!data.perfReview || data.perfReview.status !== 'final')
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Complete the performance review (mark it final) before drafting the go-forward.' });
    return generateDraft(data.employeeName, period, data.rows, data.overallNotes);
  }),

  // Create the go-forward coaching plan from the whole review session.
  createFromSession: protectedProcedure.use(requireManager).input(empPeriod).mutation(async ({ ctx, input }) => {
    const period = input.periodLabel ?? null;
    const data = await loadSessionData(ctx.db, input.employeeId, period);
    if (!data.perfReview || data.perfReview.status !== 'final')
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Complete the performance review (mark it final) before creating the go-forward plan.' });
    const session = await ensureSession(ctx.db, input.employeeId, period, ctx.user.id);
    const draft = await generateDraft(data.employeeName, period, data.rows, data.overallNotes);
    const id = await ctx.db.transaction(async (tx: any) => {
      const [plan] = await tx.insert(coachingPlans).values({
        employeeId: input.employeeId, sessionId: session.id, evaluationId: data.valuesReview?.id ?? null,
        authorId: ctx.user.id, periodLabel: period, status: 'draft', track: 'coaching',
        summaryNarrative: draft.summaryNarrative, strengths: draft.strengths, aiGenerated: draft.aiGenerated,
      }).returning();
      if (draft.focusAreas.length) {
        await tx.insert(coachingPlanFocusAreas).values(draft.focusAreas.map((f, i) => ({
          planId: plan.id, itemType: f.itemType, itemId: f.itemId,
          valueId: f.itemType === 'value' ? f.itemId : null,
          title: f.title, coachingNote: f.coachingNote || null, sortOrder: (i + 1) * 10,
        })));
      }
      await tx.update(reviewSessions).set({ status: 'plan_drafted', updatedAt: new Date() }).where(eq(reviewSessions.id, session.id));
      return plan.id as string;
    });
    await auditChange(ctx.db, ctx.user.id, id, 'coaching_plans', 'create');
    trackActivity(ctx.db, ctx.user.id, 'coaching_plan_create_from_session', input.employeeId).catch(() => {});
    return { id };
  }),

  // The fork: attach a PIP seeded from the review's weak items + the plan's focus areas.
  forkToPip: protectedProcedure.use(requireManager).input(z.object({ planId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const plan = await ctx.db.query.coachingPlans.findFirst({ where: eq(coachingPlans.id, input.planId) });
    if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coaching plan not found.' });
    if (!plan.sessionId) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This plan is not linked to a review session, so a PIP cannot be forked from it.' });
    const data = await loadSessionData(ctx.db, plan.employeeId, plan.periodLabel ?? null);
    const weak = data.rows.filter((r) => r.score <= 2).sort((a, b) => a.score - b.score);
    const focus = await ctx.db.query.coachingPlanFocusAreas.findMany({ where: eq(coachingPlanFocusAreas.planId, plan.id) });
    const periodTxt = plan.periodLabel ? `Raised in the ${plan.periodLabel} review` : 'Raised in the most recent review';

    const pipId = await ctx.db.transaction(async (tx: any) => {
      const [pip] = await tx.insert(pips).values({
        employeeId: plan.employeeId, managerId: ctx.user.id, sourceSessionId: plan.sessionId,
        durationDays: 60, purpose: DEFAULT_PURPOSE, outcomeMet: DEFAULT_OUTCOME_MET, outcomeNotMet: DEFAULT_OUTCOME_NOT_MET,
        status: 'draft', createdBy: ctx.user.id,
      }).returning();
      await tx.insert(pipSignatures).values(DEFAULT_SIGNATURE_ROLES.map((role, i) => ({ pipId: pip.id, role, sortOrder: i })));
      await tx.insert(pipCheckins).values(STARTER_CHECKINS.map((c, i) => ({ pipId: pip.id, label: c.label, attendees: c.attendees, sortOrder: i })));
      // Concerns from the weakest scored items (score <= 2), across both instruments.
      if (weak.length) {
        await tx.insert(pipConcerns).values(weak.map((w, i) => ({
          pipId: pip.id, sortOrder: i,
          area: `${w.label} (${w.itemType === 'value' ? 'value' : 'performance'})`,
          observations: w.notes ?? null, expectation: null, previouslyRaised: periodTxt,
        })));
      }
      // Goals from the plan's focus areas.
      if (focus.length) {
        await tx.insert(pipGoals).values(focus.map((f: any, i: number) => ({
          pipId: pip.id, sortOrder: i, title: (f.title as string).slice(0, 400),
          successCriteria: f.coachingNote ?? null, status: 'pending',
        })));
      }
      await tx.update(coachingPlans).set({ track: 'pip', updatedAt: new Date() }).where(eq(coachingPlans.id, plan.id));
      return pip.id as string;
    });
    await auditChange(ctx.db, ctx.user.id, pipId, 'pips', 'create');
    trackActivity(ctx.db, ctx.user.id, 'pip_fork_from_review', plan.employeeId).catch(() => {});
    return { pipId };
  }),

  // Compact executive summary for the Org-screen Review tab person card.
  // Read-only assembly over the REAL review data (reviews/scores + coaching
  // plan + PIP) for one employee + period — no duplicate storage. Manager-gated
  // (this is the performance zone; compensation is not surfaced on the card).
  cardSummary: protectedProcedure.input(empPeriod).query(async ({ ctx, input }) => {
    const role = (ctx.user.role || 'user') as RoleTier;
    if (!hasMinimumRole(role, 'manager')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to reviews.' });
    }
    const period = input.periodLabel ?? null;
    const { valuesReview, perfReview, rows } = await loadSessionData(ctx.db, input.employeeId, period);
    const hasData = !!valuesReview || !!perfReview;

    const avg = (t: Instrument): number | null => {
      const xs = rows.filter((r) => r.itemType === t).map((r) => r.score);
      return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
    };
    const values = avg('value');
    const performance = avg('criterion');
    const performanceFinal = perfReview?.status === 'final';

    // The review-session container for this employee + period (for status).
    const session = (await ctx.db.query.reviewSessions.findMany({ where: eq(reviewSessions.employeeId, input.employeeId) }))
      .find((s: any) => samePeriod(s.periodLabel, period)) ?? null;

    // Go-forward: the latest coaching plan for this employee + period.
    const plan = (await ctx.db.query.coachingPlans.findMany({
      where: eq(coachingPlans.employeeId, input.employeeId),
      orderBy: [desc(coachingPlans.createdAt)],
    })).find((p: any) => samePeriod(p.periodLabel, period)) ?? null;

    let focusAreas: { title: string; itemType: string | null }[] = [];
    if (plan) {
      const fa = await ctx.db.query.coachingPlanFocusAreas.findMany({
        where: eq(coachingPlanFocusAreas.planId, plan.id),
        orderBy: [asc(coachingPlanFocusAreas.sortOrder)],
      });
      focusAreas = fa.map((f: any) => ({ title: f.title as string, itemType: (f.itemType as string | null) ?? null }));
    }

    // The fork: a PIP attached to this review session.
    let pip: { status: string; reviewBy: string | null } | null = null;
    if (plan?.sessionId) {
      const p = await ctx.db.query.pips.findFirst({ where: eq(pips.sourceSessionId, plan.sessionId) });
      if (p) pip = { status: p.status, reviewBy: (p.finalReviewDate as string | null) ?? null };
    }

    const statusLabel = session?.status === 'closed' ? 'Closed'
      : plan ? 'Delivered'
      : performanceFinal ? 'Scored'
      : 'Draft';

    return {
      access: { performance: true },
      period,
      hasData,
      statusLabel,
      values,
      performance,
      performanceFinal,
      summary: (plan?.summaryNarrative as string | null) ?? null,
      focusAreas,
      track: (plan?.track ?? null) as 'coaching' | 'pip' | null,
      pip,
      planId: (plan?.id as string | null) ?? null,
    };
  }),
});
