// ============================================================
// MANAGER RATING SCALE ROUTER — the 1..5 rating legend
// AI Engagement (4-Lightspeed)
//
// `list` is open to any signed-in user (feeds the Manager Survey legend +
// rating selectors). Create/update/remove are admin-only. `value` is unique.
// ============================================================

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { managerRatingScale } from '../db/schema/managerSurvey.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

export const managerRatingScaleRouter = router({
  // Highest value first (5..1) — matches how the legend reads top-to-bottom.
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.managerRatingScale.findMany({
        orderBy: [asc(managerRatingScale.value)],
      });
      const sorted = all.sort((a, b) => b.value - a.value);
      return input?.includeInactive ? sorted : sorted.filter((r) => r.isActive);
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      value: z.number().int().min(0).max(100),
      label: z.string().min(1).max(120),
      definition: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dup = await ctx.db.query.managerRatingScale.findFirst({ where: eq(managerRatingScale.value, input.value) });
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: `A rating with value ${input.value} already exists.` });
      const [row] = await ctx.db.insert(managerRatingScale).values({
        value: input.value,
        label: input.label.trim(),
        definition: input.definition?.trim() || null,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'manager_rating_scale', 'create');
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      value: z.number().int().min(0).max(100).optional(),
      label: z.string().min(1).max(120).optional(),
      definition: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.managerRatingScale.findFirst({ where: eq(managerRatingScale.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (input.value !== undefined && input.value !== existing.value) {
        const dup = await ctx.db.query.managerRatingScale.findFirst({ where: eq(managerRatingScale.value, input.value) });
        if (dup) throw new TRPCError({ code: 'CONFLICT', message: `A rating with value ${input.value} already exists.` });
      }
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(managerRatingScale)
        .set({ ...updates, updatedAt: new Date() }).where(eq(managerRatingScale.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'manager_rating_scale', 'update');
      return row;
    }),

  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(managerRatingScale).where(eq(managerRatingScale.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'manager_rating_scale', 'delete');
      return { ok: true };
    }),
});
