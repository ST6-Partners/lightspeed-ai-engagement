// ============================================================
// CHECK-IN QUESTIONS ROUTER — the admin-managed question bank.
// list is open to any signed-in user (feeds the Check-ins form). create/update/
// remove are admin-only. Retire with isActive=false to keep history readable.
// ============================================================

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { checkinQuestions } from '../db/schema/checkins.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

const typeEnum = z.enum(['scale5', 'enps', 'text']);

export const checkinQuestionsRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.checkinQuestions.findMany({
        orderBy: [asc(checkinQuestions.sortOrder), asc(checkinQuestions.createdAt)],
      });
      return input?.includeInactive ? all : all.filter((q) => q.isActive);
    }),

  import: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ text: z.string(), category: z.string().optional(), driver: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const existing = new Set((await ctx.db.query.checkinQuestions.findMany()).map((q) => q.text.trim().toLowerCase()));
      let order = existing.size;
      for (const r of input.rows) {
        const text = (r.text ?? '').trim(); if (!text) { skipped++; continue; }
        if (existing.has(text.toLowerCase())) { skipped++; continue; }
        try { await ctx.db.insert(checkinQuestions).values({ text, type: 'scale5', category: r.category?.trim() || 'general', driver: r.driver?.trim() || null, included: false, sortOrder: order++ }); existing.add(text.toLowerCase()); added++; }
        catch (e) { errors.push(`${text.slice(0, 40)}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      return { added, skipped, errors };
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      text: z.string().min(1).max(1000),
      type: typeEnum.optional(),
      category: z.string().max(40).optional(),
      driver: z.string().max(40).nullable().optional(),
      included: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(checkinQuestions).values({
        text: input.text.trim(),
        type: input.type ?? 'scale5',
        category: input.category ?? 'general',
        driver: input.driver?.trim() || null,
        included: input.included ?? false,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'checkin_questions', 'create');
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      text: z.string().min(1).max(1000).optional(),
      type: typeEnum.optional(),
      category: z.string().max(40).optional(),
      driver: z.string().max(40).nullable().optional(),
      isActive: z.boolean().optional(),
      included: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.checkinQuestions.findFirst({ where: eq(checkinQuestions.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(checkinQuestions)
        .set({ ...updates, updatedAt: new Date() }).where(eq(checkinQuestions.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'checkin_questions', 'update');
      return row;
    }),

  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(checkinQuestions).where(eq(checkinQuestions.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'checkin_questions', 'delete');
      return { ok: true };
    }),
});
