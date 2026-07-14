// ============================================================
// COACHING ROUTER
// AI Engagement (4-Lightspeed) — Coaching Plans tab (2026-07-09)
//
// A coaching plan is crafted FROM one employee review (value_evaluations). The
// narrative summary + strengths are drafted by AI (claude-sonnet-4-6, same
// @ai-sdk/anthropic client as the chat router) from the review's per-value
// scores + notes, then edited by the manager. 1-3 growth focus areas (lowest
// scoring values) are pre-selected and editable. Exported to PDF (browser
// print) for the feedback conversation. Manager-gated writes.
// ============================================================

import { z } from 'zod';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { router, protectedProcedure } from '../trpc.js';
import { coachingPlans, coachingPlanFocusAreas } from '../db/schema/coaching.js';
import { companyValues } from '../db/schema/values.js';
import { performanceCriteria } from '../db/schema/performance.js';
import { reviews, reviewScores } from '../db/schema/reviews.js';
import { users } from '../db/schema/core.js';
import { requireManager } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';

// ---- Shapes -------------------------------------------------

type ScoreRow = { valueId: string; score: number; notes: string | null; valueName: string; pillar: string | null };
type DraftFocus = { valueId: string | null; title: string; coachingNote: string };
type Draft = { summaryNarrative: string; strengths: string; focusAreas: DraftFocus[]; aiGenerated: boolean };

const FocusInput = z.object({
  valueId: z.string().uuid().nullable().optional(),
  itemType: z.enum(['value', 'criterion']).nullable().optional(),
  itemId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  coachingNote: z.string().max(4000).nullable().optional(),
});

// ---- Review loader -----------------------------------------

async function loadReview(db: any, evaluationId: string) {
  const evaluation = await db.query.reviews.findFirst({ where: eq(reviews.id, evaluationId) });
  if (!evaluation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source review not found.' });
  const scoreRows = await db.query.reviewScores.findMany({ where: eq(reviewScores.reviewId, evaluationId) });
  const values = await db.query.companyValues.findMany();
  const byId = new Map<string, any>(values.map((v: any) => [v.id, v]));
  const scores: ScoreRow[] = scoreRows.map((s: any) => ({
    valueId: s.itemId, score: s.score, notes: s.notes ?? null,
    valueName: byId.get(s.itemId)?.name ?? '(retired value)',
    pillar: byId.get(s.itemId)?.pillar ?? null,
  }));
  const employee = await db.query.users.findFirst({ where: eq(users.id, evaluation.employeeId), columns: { id: true, name: true, email: true } });
  return { evaluation, scores, employeeName: employee?.name ?? employee?.email ?? 'the employee' };
}

// ---- Deterministic draft (fallback + shape source) ----------

function deterministicDraft(employeeName: string, periodLabel: string | null, scores: ScoreRow[], overallNotes: string | null): Draft {
  const strengthsRows = scores.filter((s) => s.score >= 4).sort((a, b) => b.score - a.score);
  const growthRows = scores.filter((s) => s.score <= 3).sort((a, b) => a.score - b.score).slice(0, 3);
  const period = periodLabel ? ` for ${periodLabel}` : '';

  const strengthNames = strengthsRows.map((s) => s.valueName);
  const strengths = strengthNames.length
    ? `${employeeName} shows real strength in ${listWords(strengthNames)}. ` +
      strengthsRows.map((s) => `On ${s.valueName}, ${employeeName} scored ${s.score}/5${s.notes ? ` — ${s.notes}` : '.'}`).join(' ')
    : `This review did not surface a standout strength area; use the conversation to identify where ${employeeName} feels most effective.`;

  const summaryNarrative =
    `This coaching plan summarizes ${employeeName}'s review${period}. ` +
    (overallNotes ? `${overallNotes} ` : '') +
    (strengthNames.length ? `Overall, ${employeeName} is performing well on ${listWords(strengthNames)}. ` : '') +
    (growthRows.length
      ? `To keep growing, the plan focuses on ${listWords(growthRows.map((g) => g.valueName))}.`
      : `No pressing growth areas were flagged; the focus is on sustaining momentum.`);

  const focusAreas: DraftFocus[] = growthRows.map((g) => ({
    valueId: g.valueId,
    title: g.valueName,
    coachingNote:
      `Current level: ${g.score}/5.` +
      (g.notes ? ` Reviewer note: ${g.notes}.` : '') +
      ` Agree on one concrete action and a check-in date to build strength here.`,
  }));

  return { summaryNarrative, strengths, focusAreas, aiGenerated: false };
}

function listWords(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// ---- AI draft (claude-sonnet-4-6) with graceful fallback ----

async function generateDraft(employeeName: string, periodLabel: string | null, scores: ScoreRow[], overallNotes: string | null): Promise<Draft> {
  const fallback = deterministicDraft(employeeName, periodLabel, scores, overallNotes);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || scores.length === 0) return fallback;

  const growthCandidates = scores.filter((s) => s.score <= 3).sort((a, b) => a.score - b.score).slice(0, 3);
  const scoreLines = scores
    .sort((a, b) => a.score - b.score)
    .map((s) => `- ${s.valueName}${s.pillar ? ` (${s.pillar})` : ''}: ${s.score}/5${s.notes ? ` — ${s.notes}` : ''}`)
    .join('\n');

  const system = [
    'You are an experienced people manager writing a coaching plan that will be printed and handed to an employee during a feedback conversation.',
    'Tone: warm, specific, encouraging, and honest. Address the employee in the third person by name. Never harsh; frame growth as opportunity.',
    'The plan is built from a values-based performance review (each company value scored 1-5). Higher = stronger.',
    'Return STRICT JSON only, no prose around it, matching exactly:',
    '{"summaryNarrative": string, "strengths": string, "focusAreas": [{"valueName": string, "title": string, "coachingNote": string}]}',
    'summaryNarrative: 2-4 sentence narrative summary of the review. strengths: 2-4 sentences of positive feedback grounded in the high-scoring values.',
    'focusAreas: 1-3 growth areas drawn from the LOWEST-scoring values; each coachingNote is 1-2 concrete, actionable sentences. Use only the value names provided.',
  ].join('\n');

  const user = [
    `Employee: ${employeeName}`,
    periodLabel ? `Review period: ${periodLabel}` : '',
    overallNotes ? `Reviewer overall notes: ${overallNotes}` : '',
    '',
    'Value scores (lowest first):',
    scoreLines,
    '',
    growthCandidates.length
      ? `Suggested growth focus (lowest scores): ${growthCandidates.map((g) => g.valueName).join(', ')}.`
      : 'No values scored at or below 3; choose the most useful growth angle.',
  ].filter(Boolean).join('\n');

  try {
    const anthropic = createAnthropic({ apiKey });
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system,
      messages: [{ role: 'user', content: user }],
      maxOutputTokens: 1200,
    });
    const jsonText = extractJson(result.text);
    const parsed = JSON.parse(jsonText) as {
      summaryNarrative?: string; strengths?: string;
      focusAreas?: { valueName?: string; title?: string; coachingNote?: string }[];
    };
    const nameToId = new Map(scores.map((s) => [s.valueName.toLowerCase(), s.valueId]));
    const focusAreas: DraftFocus[] = (parsed.focusAreas ?? []).slice(0, 3).map((f) => {
      const title = (f.title || f.valueName || 'Growth area').slice(0, 200);
      const vid = f.valueName ? nameToId.get(f.valueName.toLowerCase()) ?? null : null;
      return { valueId: vid, title, coachingNote: f.coachingNote ?? '' };
    });
    return {
      summaryNarrative: parsed.summaryNarrative?.trim() || fallback.summaryNarrative,
      strengths: parsed.strengths?.trim() || fallback.strengths,
      focusAreas: focusAreas.length ? focusAreas : fallback.focusAreas,
      aiGenerated: true,
    };
  } catch (err) {
    console.error('[coaching] AI draft failed, using deterministic fallback:', (err as any)?.message ?? err);
    return fallback;
  }
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

// ---- Router -------------------------------------------------

export const coachingRouter = router({
  // Landing list of all coaching plans.
  list: protectedProcedure.query(async ({ ctx }) => {
    const plans = await ctx.db.query.coachingPlans.findMany({ orderBy: [desc(coachingPlans.createdAt)] });
    if (plans.length === 0) return [];
    const empIds = Array.from(new Set(plans.map((p) => p.employeeId)));
    const authorIds = Array.from(new Set(plans.map((p) => p.authorId).filter(Boolean))) as string[];
    const people = await ctx.db.query.users.findMany({
      where: inArray(users.id, Array.from(new Set([...empIds, ...authorIds]))),
      columns: { id: true, name: true, email: true },
    });
    const nameById = new Map(people.map((u) => [u.id, u.name ?? u.email]));
    const focusRows = await ctx.db.query.coachingPlanFocusAreas.findMany({
      where: inArray(coachingPlanFocusAreas.planId, plans.map((p) => p.id)),
    });
    const focusCount = new Map<string, number>();
    for (const f of focusRows) focusCount.set(f.planId, (focusCount.get(f.planId) ?? 0) + 1);
    return plans.map((p) => ({
      id: p.id,
      employeeName: nameById.get(p.employeeId) ?? '—',
      authorName: p.authorId ? nameById.get(p.authorId) ?? null : null,
      periodLabel: p.periodLabel,
      status: p.status,
      aiGenerated: p.aiGenerated,
      focusCount: focusCount.get(p.id) ?? 0,
      createdAt: p.createdAt,
    }));
  }),

  // Full plan + focus areas (with value names) + employee name.
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.query.coachingPlans.findFirst({ where: eq(coachingPlans.id, input.id) });
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND' });
      const focus = await ctx.db.query.coachingPlanFocusAreas.findMany({
        where: eq(coachingPlanFocusAreas.planId, plan.id),
        orderBy: [asc(coachingPlanFocusAreas.sortOrder)],
      });
      const values = await ctx.db.query.companyValues.findMany();
      const valById = new Map(values.map((v) => [v.id, v]));
      const criteria = await ctx.db.query.performanceCriteria.findMany();
      const critById = new Map(criteria.map((c: any) => [c.id, c]));
      const employee = await ctx.db.query.users.findFirst({ where: eq(users.id, plan.employeeId), columns: { id: true, name: true, email: true } });
      const author = plan.authorId
        ? await ctx.db.query.users.findFirst({ where: eq(users.id, plan.authorId), columns: { id: true, name: true } })
        : null;
      return {
        ...plan,
        employeeName: employee?.name ?? employee?.email ?? '—',
        authorName: author?.name ?? null,
        focusAreas: focus.map((f: any) => {
          const itemName = f.itemType === 'criterion'
            ? (f.itemId ? critById.get(f.itemId)?.name ?? null : null)
            : (f.itemId ?? f.valueId ? valById.get(f.itemId ?? f.valueId)?.name ?? null : null);
          return {
            id: f.id, valueId: f.valueId, itemType: f.itemType ?? (f.valueId ? 'value' : null), itemId: f.itemId ?? f.valueId ?? null,
            title: f.title, coachingNote: f.coachingNote, sortOrder: f.sortOrder,
            valueName: itemName,
          };
        }),
      };
    }),

  // Preview an AI draft from a review WITHOUT saving (used by "Regenerate").
  draftFromReview: protectedProcedure
    .use(requireManager)
    .input(z.object({ evaluationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { evaluation, scores, employeeName } = await loadReview(ctx.db, input.evaluationId);
      return generateDraft(employeeName, evaluation.periodLabel, scores, evaluation.overallNotes);
    }),

  // Create a plan from a review: generate the AI draft and persist it, return id.
  createFromReview: protectedProcedure
    .use(requireManager)
    .input(z.object({ evaluationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { evaluation, scores, employeeName } = await loadReview(ctx.db, input.evaluationId);
      const draft = await generateDraft(employeeName, evaluation.periodLabel, scores, evaluation.overallNotes);
      const id = await ctx.db.transaction(async (tx: any) => {
        const [plan] = await tx.insert(coachingPlans).values({
          employeeId: evaluation.employeeId,
          evaluationId: evaluation.id,
          authorId: ctx.user.id,
          periodLabel: evaluation.periodLabel ?? null,
          status: 'draft',
          summaryNarrative: draft.summaryNarrative,
          strengths: draft.strengths,
          aiGenerated: draft.aiGenerated,
        }).returning();
        if (draft.focusAreas.length) {
          await tx.insert(coachingPlanFocusAreas).values(
            draft.focusAreas.map((f, i) => ({
              planId: plan.id, valueId: f.valueId ?? null, title: f.title,
              coachingNote: f.coachingNote || null, sortOrder: (i + 1) * 10,
            })),
          );
        }
        return plan.id as string;
      });
      await auditChange(ctx.db, ctx.user.id, id, 'coaching_plans', 'create');
      trackActivity(ctx.db, ctx.user.id, 'coaching_plan_create', evaluation.employeeId).catch(() => {});
      return { id };
    }),

  // Save edits: plan fields + full replace of focus areas.
  save: protectedProcedure
    .use(requireManager)
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['draft', 'final']).optional(),
      track: z.enum(['coaching', 'pip']).optional(),
      periodLabel: z.string().max(120).nullable().optional(),
      summaryNarrative: z.string().max(20000).nullable().optional(),
      strengths: z.string().max(20000).nullable().optional(),
      aiGenerated: z.boolean().optional(),
      focusAreas: z.array(FocusInput).max(3).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.coachingPlans.findFirst({ where: eq(coachingPlans.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.db.transaction(async (tx: any) => {
        await tx.update(coachingPlans).set({
          status: input.status ?? existing.status,
          track: input.track ?? (existing as any).track ?? 'coaching',
          periodLabel: input.periodLabel === undefined ? existing.periodLabel : input.periodLabel,
          summaryNarrative: input.summaryNarrative === undefined ? existing.summaryNarrative : input.summaryNarrative,
          strengths: input.strengths === undefined ? existing.strengths : input.strengths,
          aiGenerated: input.aiGenerated ?? existing.aiGenerated,
          updatedAt: new Date(),
        }).where(eq(coachingPlans.id, input.id));
        await tx.delete(coachingPlanFocusAreas).where(eq(coachingPlanFocusAreas.planId, input.id));
        if (input.focusAreas.length) {
          await tx.insert(coachingPlanFocusAreas).values(
            input.focusAreas.map((f, i) => {
              const itemType = f.itemType ?? (f.valueId ? 'value' : null);
              const itemId = f.itemId ?? f.valueId ?? null;
              return {
                planId: input.id, valueId: itemType === 'value' ? itemId : (f.valueId ?? null),
                itemType, itemId, title: f.title,
                coachingNote: f.coachingNote ?? null, sortOrder: (i + 1) * 10,
              };
            }),
          );
        }
      });
      await auditChange(ctx.db, ctx.user.id, input.id, 'coaching_plans', 'update');
      trackActivity(ctx.db, ctx.user.id, 'coaching_plan_save', input.id).catch(() => {});
      return { id: input.id };
    }),

  remove: protectedProcedure
    .use(requireManager)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(coachingPlans).where(eq(coachingPlans.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'coaching_plans', 'delete');
      return { ok: true };
    }),
});
