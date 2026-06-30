// ============================================================
// DEPARTMENTS ROUTER — shared HR department lookup
// AI Engagement (4-Lightspeed)
//
// `list` is open to any signed-in user (feeds pickers on Job Titles, PIP, and
// the Exit Survey). Create/update/remove are admin-only via `requireAdmin`.
// Mirrors the jobTitles router.
// ============================================================

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { departments } from '../db/schema/departments.js';
import { users } from '../db/schema/core.js';
import { pips } from '../db/schema/pip.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';

export const departmentsRouter = router({
  // Picker source — active by default; pass includeInactive for admin views.
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.departments.findMany({
        orderBy: [asc(departments.sortOrder), asc(departments.name)],
      });
      return input?.includeInactive ? all : all.filter((d) => d.isActive);
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      name: z.string().min(1).max(160),
      description: z.string().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dup = await ctx.db.query.departments.findFirst({ where: eq(departments.name, input.name) });
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'A department with that name already exists.' });
      const [row] = await ctx.db.insert(departments).values({
        name: input.name,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'departments', 'create');
      trackActivity(ctx.db, ctx.user.id, 'department_create', input.name).catch(() => {});
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(160).optional(),
      description: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.departments.findFirst({ where: eq(departments.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (input.name && input.name !== existing.name) {
        const dup = await ctx.db.query.departments.findFirst({ where: eq(departments.name, input.name) });
        if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'A department with that name already exists.' });
      }
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(departments)
        .set({ ...updates, updatedAt: new Date() }).where(eq(departments.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'departments', 'update');
      return row;
    }),

  // Hard delete only when nothing references it; otherwise deactivate.
  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const empRefs = await ctx.db.query.users.findMany({ where: eq(users.departmentId, input.id) });
      const pipRefs = await ctx.db.query.pips.findMany({ where: eq(pips.departmentId, input.id) });
      const n = empRefs.length + pipRefs.length;
      if (n > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `In use by ${empRefs.length} employee(s) and ${pipRefs.length} plan(s). Deactivate it instead of deleting.`,
        });
      }
      await ctx.db.delete(departments).where(eq(departments.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'departments', 'delete');
      return { ok: true };
    }),
});
