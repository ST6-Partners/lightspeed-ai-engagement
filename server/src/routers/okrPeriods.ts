// ============================================================
// OKR PERIODS ROUTER — goal-setting cycles + period-end analytics
// AI Engagement (4-Lightspeed), 2026-07-22
//
//   list            — every period (current first) for the selector
//   create          — admin: define a new period
//   update          — admin: rename / adjust dates / status
//   setCurrent      — admin: make one period the live cycle (unsets the rest)
//   close           — admin: freeze the period + snapshot its scorecard
//   scorecard       — the Period Scorecard (cached for closed periods, else live)
//   generateSummary — admin: AI plain-English recap, cached onto the period
//
// The pure analytics live in services/okrScorecard.ts; this router only loads
// the nodes + org lookups, resolves each objective's team, and (for the recap)
// calls the model with a deterministic fallback.
// ============================================================
import { z } from 'zod';
import { eq, asc, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { router, protectedProcedure } from '../trpc.js';
import { requireAdmin } from '../services/permissions.js';
import { okrNodes } from '../db/schema/okr.js';
import { okrPeriods } from '../db/schema/okrPeriods.js';
import { departments } from '../db/schema/departments.js';
import { users } from '../db/schema/core.js';
import { computeScorecard, type OkrNodeLite, type PeriodScorecard } from '../services/okrScorecard.js';

// Load the period's nodes + org lookups and compute a fresh scorecard.
async function computeForPeriod(ctx: any, periodId: string): Promise<PeriodScorecard> {
  const [nodes, deptRows, userRows] = await Promise.all([
    ctx.db.query.okrNodes.findMany({ where: eq(okrNodes.periodId, periodId) }),
    ctx.db.query.departments.findMany(),
    ctx.db.query.users.findMany({ columns: { id: true, departmentId: true } }),
  ]);
  const deptById = new Map<string, string>(deptRows.map((d: any) => [d.id, d.name]));
  const userDept = new Map<string, string | null>(userRows.map((u: any) => [u.id, u.departmentId ?? null]));

  const teamOf = (n: OkrNodeLite): string => {
    if (n.departmentId && deptById.has(n.departmentId)) return deptById.get(n.departmentId)!;
    if (n.ownerUserId) {
      const d = userDept.get(n.ownerUserId);
      if (d && deptById.has(d)) return deptById.get(d)!;
    }
    return 'Unassigned';
  };
  return computeScorecard(nodes as OkrNodeLite[], teamOf);
}

// Deterministic recap used when no model key is configured (keeps the feature
// working offline and gives the model a factual skeleton to build on).
function deterministicNarrative(label: string, sc: PeriodScorecard): string {
  if (sc.objectiveCount === 0) return `${label}: no objectives were set for this period yet.`;
  const parts: string[] = [];
  parts.push(`${label} closed at ${sc.companyAttainmentPct}% company-wide attainment — ${sc.completedCount} of ${sc.objectiveCount} objectives fully met.`);
  if (sc.topTeam) parts.push(`Top team: ${sc.topTeam.team} at ${sc.topTeam.attainmentPct}%.`);
  if (sc.bottomTeam) parts.push(`Most room to grow: ${sc.bottomTeam.team} at ${sc.bottomTeam.attainmentPct}% (missed by ${sc.bottomTeam.missPct}%).`);
  parts.push(`Distribution: ${sc.distribution.met} met, ${sc.distribution.partial} partial, ${sc.distribution.missed} missed.`);
  if (sc.integrityFlags.length) parts.push(`${sc.integrityFlags.length} objective(s) marked complete still have open key results — worth a review.`);
  return parts.join(' ');
}

async function aiNarrative(label: string, sc: PeriodScorecard): Promise<string> {
  const fallback = deterministicNarrative(label, sc);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || sc.objectiveCount === 0) return fallback;
  const teamLines = sc.teams
    .map((t) => `- ${t.team}: ${t.attainmentPct}% attainment, ${t.completedCount}/${t.objectiveCount} objectives met`)
    .join('\n');
  const system = [
    'You are an experienced Chief of Staff writing a concise, plain-English period-end recap of company OKR results for leadership.',
    'Tone: clear, balanced, and constructive — celebrate wins, name struggles without blame, and end with one recommended focus for next period.',
    'Ground every claim ONLY in the numbers provided. Do not invent teams, people, or figures.',
    'Return 2 short paragraphs (no headings, no bullet lists, no markdown): (1) how the period went overall and who stood out; (2) where to focus next period.',
  ].join('\n');
  const user = [
    `Period: ${label}`,
    `Company attainment: ${sc.companyAttainmentPct}% (${sc.completedCount}/${sc.objectiveCount} objectives fully met).`,
    `Distribution — met: ${sc.distribution.met}, partial: ${sc.distribution.partial}, missed: ${sc.distribution.missed}.`,
    sc.topTeam ? `Strongest team: ${sc.topTeam.team} (${sc.topTeam.attainmentPct}%).` : '',
    sc.bottomTeam ? `Weakest team: ${sc.bottomTeam.team} (${sc.bottomTeam.attainmentPct}%, missed by ${sc.bottomTeam.missPct}%).` : '',
    sc.integrityFlags.length ? `${sc.integrityFlags.length} objective(s) complete but with open key results.` : '',
    sc.hygieneFlags.length ? `${sc.hygieneFlags.length} objective(s) have no owner or team.` : '',
    '',
    'Per-team results:',
    teamLines,
  ].filter(Boolean).join('\n');
  try {
    const anthropic = createAnthropic({ apiKey });
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system,
      messages: [{ role: 'user', content: user }],
      maxOutputTokens: 700,
    });
    const text = (result.text ?? '').trim();
    return text || fallback;
  } catch (err: any) {
    console.error('[okrPeriods] aiNarrative error:', err?.message ?? err);
    return fallback;
  }
}

export const okrPeriodsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.okrPeriods.findMany({
      orderBy: [desc(okrPeriods.isCurrent), desc(okrPeriods.startDate), desc(okrPeriods.createdAt)],
    });
  }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      label: z.string().min(1).max(120),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      status: z.enum(['draft', 'active', 'closed']).optional(),
      makeCurrent: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(okrPeriods).values({
        label: input.label,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: input.status ?? (input.makeCurrent ? 'active' : 'draft'),
        isCurrent: false,
      }).returning();
      if (input.makeCurrent) {
        await ctx.db.update(okrPeriods).set({ isCurrent: false, updatedAt: new Date() });
        await ctx.db.update(okrPeriods)
          .set({ isCurrent: true, status: 'active', updatedAt: new Date() })
          .where(eq(okrPeriods.id, row.id));
      }
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      label: z.string().min(1).max(120).optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      status: z.enum(['draft', 'active', 'closed']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(okrPeriods)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(okrPeriods.id, id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  // Make one period the live cycle; unset the rest.
  setCurrent: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(okrPeriods).set({ isCurrent: false, updatedAt: new Date() });
      const [row] = await ctx.db.update(okrPeriods)
        .set({ isCurrent: true, status: 'active', closedAt: null, updatedAt: new Date() })
        .where(eq(okrPeriods.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  // Freeze a period: snapshot the scorecard (with AI recap) and mark it closed.
  close: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), withSummary: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const period = await ctx.db.query.okrPeriods.findFirst({ where: eq(okrPeriods.id, input.id) });
      if (!period) throw new TRPCError({ code: 'NOT_FOUND' });
      const sc = await computeForPeriod(ctx, input.id);
      if (input.withSummary !== false) sc.narrative = await aiNarrative(period.label, sc);
      const [row] = await ctx.db.update(okrPeriods)
        .set({ status: 'closed', isCurrent: false, closedAt: new Date(), scorecard: sc, updatedAt: new Date() })
        .where(eq(okrPeriods.id, input.id)).returning();
      return row;
    }),

  // The Period Scorecard. Closed periods return their frozen snapshot; open
  // periods (or a forced refresh) compute live.
  scorecard: protectedProcedure
    .input(z.object({ periodId: z.string().uuid(), refresh: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const period = await ctx.db.query.okrPeriods.findFirst({ where: eq(okrPeriods.id, input.periodId) });
      if (!period) throw new TRPCError({ code: 'NOT_FOUND' });
      if (period.status === 'closed' && period.scorecard && !input.refresh) {
        const snap = period.scorecard as PeriodScorecard;
        // Older frozen snapshots predate the Plan tree — recompute it live so the
        // Plan tab still renders (the frozen company/team numbers are preserved).
        if (!snap.plan) snap.plan = (await computeForPeriod(ctx, input.periodId)).plan;
        return snap;
      }
      return computeForPeriod(ctx, input.periodId);
    }),

  // Generate (or regenerate) the AI recap on demand and cache it onto the period.
  generateSummary: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const period = await ctx.db.query.okrPeriods.findFirst({ where: eq(okrPeriods.id, input.periodId) });
      if (!period) throw new TRPCError({ code: 'NOT_FOUND' });
      const sc = await computeForPeriod(ctx, input.periodId);
      sc.narrative = await aiNarrative(period.label, sc);
      await ctx.db.update(okrPeriods)
        .set({ scorecard: sc, updatedAt: new Date() })
        .where(eq(okrPeriods.id, input.periodId));
      return sc;
    }),
});
