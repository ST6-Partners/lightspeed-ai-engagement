// ============================================================
// PEER REVIEW QUESTIONS ROUTER — managed list of peer-review statements.
// AI Engagement (4-Lightspeed) — 2026-07-21. Mirrors managerSurveyQuestions.
// `list` open to any signed-in user (feeds the Peer Review form); create/update/
// remove are admin-only. Retire with isActive=false to keep history meaningful.
// ============================================================

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { peerReviewQuestions } from '../db/schema/peerReview.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

export const peerReviewQuestionsRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.peerReviewQuestions.findMany({
        orderBy: [asc(peerReviewQuestions.sortOrder), asc(peerReviewQuestions.createdAt)],
      });
      return input?.includeInactive ? all : all.filter((q) => q.isActive);
    }),

  import: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ text: z.string(), description: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const existing = new Set((await ctx.db.query.peerReviewQuestions.findMany()).map((q) => q.text.trim().toLowerCase()));
      let order = existing.size;
      for (const r of input.rows) {
        const text = (r.text ?? '').trim(); if (!text) { skipped++; continue; }
        if (existing.has(text.toLowerCase())) { skipped++; continue; }
        try { await ctx.db.insert(peerReviewQuestions).values({ text, description: r.description?.trim() || null, sortOrder: order++ }); existing.add(text.toLowerCase()); added++; }
        catch (e) { errors.push(`${text.slice(0, 40)}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      return { added, skipped, errors };
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      text: z.string().min(1).max(1000),
      description: z.string().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(peerReviewQuestions).values({
        text: input.text.trim(),
        description: input.description?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'peer_review_questions', 'create');
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      text: z.string().min(1).max(1000).optional(),
      description: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.peerReviewQuestions.findFirst({ where: eq(peerReviewQuestions.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(peerReviewQuestions)
        .set({ ...updates, updatedAt: new Date() }).where(eq(peerReviewQuestions.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'peer_review_questions', 'update');
      return row;
    }),

  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(peerReviewQuestions).where(eq(peerReviewQuestions.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'peer_review_questions', 'delete');
      return { ok: true };
    }),
});
