// ============================================================
// JOB TITLES ROUTER — shared HR title/level lookup
// AI Engagement (4-Lightspeed)
//
// `list` is open to any signed-in user (it feeds pickers on the PIP and
// Exit Survey forms). Create/update/remove are admin-only via the shared
// `requireAdmin` middleware (same gate the admin router uses).
// ============================================================

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { pips } from '../db/schema/pip.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';

export const jobTitlesRouter = router({
  // Picker source — active titles by default; pass includeInactive for admin views.
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.jobTitles.findMany({
        orderBy: [asc(jobTitles.sortOrder), asc(jobTitles.title)],
      });
      return input?.includeInactive ? all : all.filter((t) => t.isActive);
    }),

  // Bulk CSV import (admin). Rows: { title, level? }. Upsert by title —
  // existing titles are skipped, not overwritten.
  import: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      rows: z.array(z.object({ title: z.string(), level: z.string().optional() })).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const existing = new Set((await ctx.db.query.jobTitles.findMany()).map((t) => t.title.trim().toLowerCase()));
      let order = existing.size;
      for (const r of input.rows) {
        const title = (r.title ?? '').trim();
        if (!title) { skipped++; continue; }
        if (existing.has(title.toLowerCase())) { skipped++; continue; }
        try {
          await ctx.db.insert(jobTitles).values({ title, level: r.level?.trim() || null, sortOrder: order++ });
          existing.add(title.toLowerCase()); added++;
        } catch (e) { errors.push(`${title}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      if (added > 0) await auditChange(ctx.db, ctx.user.id, ctx.user.id, 'job_titles', 'create');
      return { added, skipped, errors };
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      title: z.string().min(1).max(200),
      level: z.string().max(60).optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dup = await ctx.db.query.jobTitles.findFirst({ where: eq(jobTitles.title, input.title) });
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'A title with that name already exists.' });
      const [row] = await ctx.db.insert(jobTitles).values({
        title: input.title,
        level: input.level ?? null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'job_titles', 'create');
      trackActivity(ctx.db, ctx.user.id, 'job_title_create', input.title).catch(() => {});
      return row;
    }),

  update: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      level: z.string().max(60).nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.jobTitles.findFirst({ where: eq(jobTitles.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (input.title && input.title !== existing.title) {
        const dup = await ctx.db.query.jobTitles.findFirst({ where: eq(jobTitles.title, input.title) });
        if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'A title with that name already exists.' });
      }
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(jobTitles)
        .set({ ...updates, updatedAt: new Date() }).where(eq(jobTitles.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'job_titles', 'update');
      return row;
    }),

  // Hard delete — only allowed when no PIP references the title; otherwise
  // the caller should deactivate (isActive = false) instead.
  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const refs = await ctx.db.query.pips.findMany({ where: eq(pips.jobTitleId, input.id) });
      if (refs.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `In use by ${refs.length} plan(s). Deactivate it instead of deleting.`,
        });
      }
      await ctx.db.delete(jobTitles).where(eq(jobTitles.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'job_titles', 'delete');
      return { ok: true };
    }),
});
