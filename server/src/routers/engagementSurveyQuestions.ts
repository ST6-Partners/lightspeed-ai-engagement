// ============================================================
// ENGAGEMENT SURVEY QUESTIONS ROUTER — the admin-managed question bank.
// `listActive` feeds the Take Survey form; `list` (admin) shows the full bank
// incl. inactive. create/update/remove/setActive are admin-only. Core questions
// (the original 66) can be deactivated but not deleted — history stays keyed.
// ============================================================
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { engagementSurveyQuestions } from '../db/schema/engagementSurveyQuestions.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

const typeEnum = z.enum(['likert5', 'text']);

export const engagementSurveyQuestionsRouter = router({
  // Admin: full bank (active + inactive), ordered.
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.engagementSurveyQuestions.findMany({
      orderBy: [asc(engagementSurveyQuestions.sortOrder), asc(engagementSurveyQuestions.createdAt)],
    });
  }),

  // Survey form: only the questions currently ON the survey.
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.query.engagementSurveyQuestions.findMany({
      orderBy: [asc(engagementSurveyQuestions.sortOrder), asc(engagementSurveyQuestions.createdAt)],
    });
    return all.filter((q) => q.isActive);
  }),

  import: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ text: z.string(), driver: z.string().optional(), section: z.string().optional(), sectiontitle: z.string().optional(), sectionTitle: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const rowsAll = await ctx.db.query.engagementSurveyQuestions.findMany();
      const existing = new Set(rowsAll.map((q) => q.text.trim().toLowerCase()));
      let order = rowsAll.reduce((m, q) => Math.max(m, q.sortOrder), 0) + 1;
      for (const r of input.rows) {
        const text = (r.text ?? '').trim(); if (!text) { skipped++; continue; }
        if (existing.has(text.toLowerCase())) { skipped++; continue; }
        const section = (r.section ?? '').trim() || 'custom';
        const sectionTitle = (r.sectionTitle ?? r.sectiontitle ?? '').trim() || 'Custom Questions';
        const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        try { await ctx.db.insert(engagementSurveyQuestions).values({ id, text, driver: r.driver?.trim() || null, section, sectionTitle, sectionIntro: '', type: 'likert5', isActive: true, isCore: false, sortOrder: order++ }); existing.add(text.toLowerCase()); added++; }
        catch (e) { errors.push(`${text.slice(0, 40)}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      return { added, skipped, errors };
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      text: z.string().min(1).max(1000),
      driver: z.string().max(40).nullable().optional(),
      section: z.string().min(1).max(40),
      sectionTitle: z.string().min(1).max(120),
      sectionIntro: z.string().max(2000).optional(),
      type: typeEnum.optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const rows = await ctx.db.query.engagementSurveyQuestions.findMany();
        sortOrder = rows.reduce((m, r) => Math.max(m, r.sortOrder), 0) + 1;
      }
      const [row] = await ctx.db.insert(engagementSurveyQuestions).values({
        id,
        text: input.text.trim(),
        driver: input.driver?.trim() || null,
        section: input.section.trim(),
        sectionTitle: input.sectionTitle.trim(),
        sectionIntro: input.sectionIntro?.trim() ?? '',
        type: input.type ?? 'likert5',
        isActive: input.isActive ?? true,
        isCore: false,
        sortOrder,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'engagement_survey_questions', 'create');
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().max(64),
      text: z.string().min(1).max(1000).optional(),
      driver: z.string().max(40).nullable().optional(),
      section: z.string().max(40).optional(),
      sectionTitle: z.string().max(120).optional(),
      sectionIntro: z.string().max(2000).optional(),
      type: typeEnum.optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.engagementSurveyQuestions.findFirst({ where: eq(engagementSurveyQuestions.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...rest } = input;
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(engagementSurveyQuestions)
        .set(updates).where(eq(engagementSurveyQuestions.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'engagement_survey_questions', 'update');
      return row;
    }),

  // Convenience toggle used by the bank UI switches.
  setActive: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().max(64), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.update(engagementSurveyQuestions)
        .set({ isActive: input.isActive }).where(eq(engagementSurveyQuestions.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await auditChange(ctx.db, ctx.user.id, input.id, 'engagement_survey_questions', 'update');
      return row;
    }),

  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().max(64) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.engagementSurveyQuestions.findFirst({ where: eq(engagementSurveyQuestions.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (existing.isCore) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Core questions cannot be deleted — deactivate them instead.' });
      await ctx.db.delete(engagementSurveyQuestions).where(eq(engagementSurveyQuestions.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'engagement_survey_questions', 'delete');
      return { ok: true };
    }),
});
