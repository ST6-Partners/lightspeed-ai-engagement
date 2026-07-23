// ============================================================
// MANAGER SURVEY QUESTIONS ROUTER — managed list of statements
// AI Engagement (4-Lightspeed)
//
// `list` is open to any signed-in user (feeds the Manager Survey form).
// Create/update/remove are admin-only. Mirrors the departments router;
// retire with isActive=false to keep historical responses meaningful.
// ============================================================

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { managerSurveyQuestions } from '../db/schema/managerSurvey.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

export const managerSurveyQuestionsRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.managerSurveyQuestions.findMany({
        orderBy: [asc(managerSurveyQuestions.sortOrder), asc(managerSurveyQuestions.createdAt)],
      });
      return input?.includeInactive ? all : all.filter((q) => q.isActive);
    }),

  import: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ text: z.string(), description: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const existing = new Set((await ctx.db.query.managerSurveyQuestions.findMany()).map((q) => q.text.trim().toLowerCase()));
      let order = existing.size;
      for (const r of input.rows) {
        const text = (r.text ?? '').trim(); if (!text) { skipped++; continue; }
        if (existing.has(text.toLowerCase())) { skipped++; continue; }
        try { await ctx.db.insert(managerSurveyQuestions).values({ text, description: r.description?.trim() || null, sortOrder: order++ }); existing.add(text.toLowerCase()); added++; }
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
      const [row] = await ctx.db.insert(managerSurveyQuestions).values({
        text: input.text.trim(),
        description: input.description?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'manager_survey_questions', 'create');
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
      const existing = await ctx.db.query.managerSurveyQuestions.findFirst({ where: eq(managerSurveyQuestions.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(managerSurveyQuestions)
        .set({ ...updates, updatedAt: new Date() }).where(eq(managerSurveyQuestions.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'manager_survey_questions', 'update');
      return row;
    }),

  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(managerSurveyQuestions).where(eq(managerSurveyQuestions.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'manager_survey_questions', 'delete');
      return { ok: true };
    }),
});
