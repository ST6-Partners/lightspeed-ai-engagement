// ============================================================
// PERFORMANCE ROUTER
// AI Engagement (4-Lightspeed) — Reviews section (2026-07-09)
//
// Companion to the values router. Two concerns:
//  1) performance_criteria — AIE-owned CRUD (requireAdmin). `listCriteria`
//     feeds the review form + the Core Data > Performance Criteria page.
//  2) performance_evaluations / performance_evaluation_scores — a manager
//     scores an EMPLOYEE 1-5 against each active criterion. Manager-gated CRUD.
// Review periods + the employee picker are reused from the values router
// (values.listPeriods / values.listEmployees) — one shared lookup.
// ============================================================

import { z } from 'zod';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { performanceCriteria } from '../db/schema/performance.js';
import { reviews, reviewScores } from '../db/schema/reviews.js';
import { users } from '../db/schema/core.js';
import { requireAdmin, requireManager } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';

const ScoreInput = z.object({
  criterionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  notes: z.string().max(4000).optional(),
});

export const performanceRouter = router({
  // ---------- Performance criteria (AIE-owned CRUD) ----------

  listCriteria: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.performanceCriteria.findMany({
        orderBy: [asc(performanceCriteria.sortOrder), asc(performanceCriteria.name)],
      });
      return input?.includeInactive ? all : all.filter((c) => c.active);
    }),

  createCriterion: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      name: z.string().min(1).max(200),
      definition: z.string().max(4000).nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dup = (await ctx.db.query.performanceCriteria.findMany())
        .find((c) => c.active && c.name.toLowerCase() === input.name.toLowerCase());
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'A criterion with that name already exists.' });
      const existing = await ctx.db.query.performanceCriteria.findMany();
      const maxSort = existing.reduce((m, c) => Math.max(m, c.sortOrder), 0);
      const [row] = await ctx.db.insert(performanceCriteria).values({
        name: input.name,
        definition: input.definition ?? null,
        sortOrder: input.sortOrder ?? maxSort + 10,
        source: 'local',
        active: true,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'performance_criteria', 'create');
      trackActivity(ctx.db, ctx.user.id, 'performance_criterion_create', input.name).catch(() => {});
      return row;
    }),

  updateCriterion: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      definition: z.string().max(4000).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.performanceCriteria.findFirst({ where: eq(performanceCriteria.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(performanceCriteria)
        .set({ ...updates, updatedAt: new Date() }).where(eq(performanceCriteria.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'performance_criteria', 'update');
      return row;
    }),

  deleteCriterion: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const refs = await ctx.db.query.reviewScores.findMany({ where: eq(reviewScores.itemId, input.id) });
      if (refs.length > 0) {
        await ctx.db.update(performanceCriteria).set({ active: false, updatedAt: new Date() }).where(eq(performanceCriteria.id, input.id));
        await auditChange(ctx.db, ctx.user.id, input.id, 'performance_criteria', 'archive');
        return { ok: true, deactivated: true };
      }
      await ctx.db.delete(performanceCriteria).where(eq(performanceCriteria.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'performance_criteria', 'delete');
      return { ok: true, deactivated: false };
    }),

  // ---------- Reviews (shared reviews/review_scores, type='performance') ----------

  listEvaluations: protectedProcedure
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const evals = await ctx.db.query.reviews.findMany({
        where: and(eq(reviews.employeeId, input.employeeId), eq(reviews.type, 'performance')),
        orderBy: [desc(reviews.evaluatedAt)],
      });
      if (evals.length === 0) return [];
      const ids = evals.map((e) => e.id);
      const scores = await ctx.db.query.reviewScores.findMany({ where: inArray(reviewScores.reviewId, ids) });
      const reviewerIds = Array.from(new Set(evals.map((e) => e.reviewerId).filter(Boolean))) as string[];
      const reviewers = reviewerIds.length
        ? await ctx.db.query.users.findMany({ where: inArray(users.id, reviewerIds), columns: { id: true, name: true } })
        : [];
      const reviewerName = new Map(reviewers.map((r) => [r.id, r.name]));
      return evals.map((e) => {
        const s = scores.filter((x) => x.reviewId === e.id);
        const avg = s.length ? s.reduce((a, x) => a + x.score, 0) / s.length : null;
        return {
          id: e.id, periodLabel: e.periodLabel, status: e.status, overallNotes: e.overallNotes,
          evaluatedAt: e.evaluatedAt, reviewerId: e.reviewerId,
          reviewerName: e.reviewerId ? reviewerName.get(e.reviewerId) ?? null : null,
          scoredCount: s.length, avgScore: avg,
        };
      });
    }),

  getEvaluation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const evaluation = await ctx.db.query.reviews.findFirst({ where: eq(reviews.id, input.id) });
      if (!evaluation) throw new TRPCError({ code: 'NOT_FOUND' });
      const scores = await ctx.db.query.reviewScores.findMany({ where: eq(reviewScores.reviewId, input.id) });
      const criteria = await ctx.db.query.performanceCriteria.findMany();
      const byId = new Map(criteria.map((c) => [c.id, c]));
      return {
        ...evaluation,
        scores: scores.map((s) => ({
          criterionId: s.itemId, score: s.score, notes: s.notes,
          criterionName: byId.get(s.itemId)?.name ?? '(retired criterion)',
          definition: byId.get(s.itemId)?.definition ?? null,
        })),
      };
    }),

  saveEvaluation: protectedProcedure
    .use(requireManager)
    .input(z.object({
      id: z.string().uuid().optional(),
      employeeId: z.string().uuid(),
      reviewerId: z.string().uuid().nullable().optional(),
      periodLabel: z.string().max(120).nullable().optional(),
      status: z.enum(['draft', 'final']).optional(),
      overallNotes: z.string().max(8000).nullable().optional(),
      scores: z.array(ScoreInput).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const reviewerId = input.reviewerId === undefined ? ctx.user.id : input.reviewerId;
      const result = await ctx.db.transaction(async (tx) => {
        let evalId = input.id;
        if (evalId) {
          const existing = await tx.query.reviews.findFirst({ where: eq(reviews.id, evalId) });
          if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
          await tx.update(reviews).set({
            employeeId: input.employeeId, reviewerId,
            periodLabel: input.periodLabel ?? null,
            status: input.status ?? existing.status,
            overallNotes: input.overallNotes ?? null, updatedAt: new Date(),
          }).where(eq(reviews.id, evalId));
        } else {
          const [row] = await tx.insert(reviews).values({
            type: 'performance',
            employeeId: input.employeeId, reviewerId,
            periodLabel: input.periodLabel ?? null,
            status: input.status ?? 'draft',
            overallNotes: input.overallNotes ?? null,
          }).returning();
          evalId = row.id;
        }
        await tx.delete(reviewScores).where(eq(reviewScores.reviewId, evalId));
        if (input.scores.length) {
          await tx.insert(reviewScores).values(
            input.scores.map((s) => ({ reviewId: evalId!, itemId: s.criterionId, score: s.score, notes: s.notes ?? null })),
          );
        }
        return { id: evalId! };
      });
      await auditChange(ctx.db, ctx.user.id, result.id, 'reviews', input.id ? 'update' : 'create');
      trackActivity(ctx.db, ctx.user.id, 'performance_evaluation_save', input.employeeId).catch(() => {});
      return result;
    }),

  deleteEvaluation: protectedProcedure
    .use(requireManager)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(reviews).where(eq(reviews.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'reviews', 'delete');
      return { ok: true };
    }),
});
