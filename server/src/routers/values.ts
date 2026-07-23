// ============================================================
// VALUES ROUTER
// AI Engagement (4-Lightspeed) — Reviews section (2026-07-08)
//
// Two concerns:
//  1) company_values — a READ-ONLY cache mirrored from ATA. `list` feeds the
//     evaluation form + the Core Data > Company Values viewer. There is NO
//     create/update/delete here on purpose: definitions are owned by ATA.
//     `syncFromSource` (admin) pulls the framework from ATA and upserts the
//     cache; `syncStatus` reports config + freshness.
//  2) value_evaluations / value_evaluation_scores — OWNED BY AIE. A manager
//     scores an EMPLOYEE 1-5 on each active value. Standard CRUD, manager-gated.
// ============================================================

import { z } from 'zod';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { companyValues, reviewPeriods } from '../db/schema/values.js';
import { reviews, reviewScores } from '../db/schema/reviews.js';
import { users } from '../db/schema/core.js';
import { requireAdmin, requireManager } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';
import { fetchRemoteValues, isValuesSyncConfigured, valuesSyncConfig } from '../services/valuesSync.js';

const ScoreInput = z.object({
  valueId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  notes: z.string().max(4000).optional(),
});

export const valuesRouter = router({
  // ---------- Company values (read-only cache) ----------

  // Active values by default; feeds the evaluation form + viewer.
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.companyValues.findMany({
        orderBy: [asc(companyValues.pillar), asc(companyValues.sortOrder), asc(companyValues.name)],
      });
      return input?.includeInactive ? all : all.filter((v) => v.active);
    }),

  syncStatus: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.companyValues.findMany();
    const synced = rows.filter((r) => r.source === 'ATA');
    const lastSyncedAt = synced.reduce<Date | null>((acc, r) => {
      if (!r.syncedAt) return acc;
      return !acc || r.syncedAt > acc ? r.syncedAt : acc;
    }, null);
    return {
      ...valuesSyncConfig(),
      total: rows.length,
      syncedCount: synced.length,
      seedCount: rows.filter((r) => r.source === 'seed').length,
      lastSyncedAt,
    };
  }),

  // Admin: pull the framework from ATA and refresh the local cache.
  syncFromSource: protectedProcedure
    .use(requireAdmin)
    .mutation(async ({ ctx }) => {
      if (!isValuesSyncConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Values sync is not configured yet. Set ATA_VALUES_API_URL + ATA_VALUES_API_KEY in the environment.',
        });
      }
      let remote;
      try {
        remote = await fetchRemoteValues();
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e?.message ?? 'ATA values fetch failed.' });
      }

      const now = new Date();
      const seenExternalIds: string[] = [];

      for (const v of remote) {
        seenExternalIds.push(v.externalId);
        await ctx.db.insert(companyValues)
          .values({
            externalId: v.externalId,
            name: v.name,
            pillar: v.pillar,
            category: v.category ?? null,
            description: v.description ?? null,
            rubric: (v.rubric ?? {}) as any,
            meta: (v.meta ?? {}) as any,
            sortOrder: v.sortOrder,
            active: v.active,
            source: 'ATA',
            syncedAt: now,
          })
          .onConflictDoUpdate({
            target: [companyValues.source, companyValues.externalId],
            set: {
              name: v.name,
              pillar: v.pillar,
              category: v.category ?? null,
              description: v.description ?? null,
              rubric: (v.rubric ?? {}) as any,
              meta: (v.meta ?? {}) as any,
              sortOrder: v.sortOrder,
              active: v.active,
              syncedAt: now,
              updatedAt: now,
            },
          });
      }

      // Deactivate ATA rows no longer present upstream (keep for referential
      // integrity of historical evaluation scores; don't hard-delete).
      const staleAta = (await ctx.db.query.companyValues.findMany({
        where: eq(companyValues.source, 'ATA'),
      })).filter((r) => r.externalId && !seenExternalIds.includes(r.externalId) && r.active);
      for (const r of staleAta) {
        await ctx.db.update(companyValues)
          .set({ active: false, updatedAt: now })
          .where(eq(companyValues.id, r.id));
      }

      // Local 'seed' placeholders were only a pre-sync bootstrap. Once real
      // ATA data has landed, retire them so the viewer shows one clean set.
      // Deactivate rather than delete in case a seed value was already scored.
      await ctx.db.update(companyValues)
        .set({ active: false, updatedAt: now })
        .where(and(eq(companyValues.source, 'seed'), eq(companyValues.active, true)));

      await auditChange(ctx.db, ctx.user.id, 'company_values', 'company_values', 'update');
      trackActivity(ctx.db, ctx.user.id, 'values_sync', `${remote.length} values`).catch(() => {});
      return { upserted: remote.length, deactivatedStale: staleAta.length };
    }),

  // ---------- Company values CRUD (locally managed) ----------
  // Values are managed here in AIE. `source` = 'local' for hand-created rows;
  // the optional ATA sync (syncFromSource) only touches 'seed'/'ATA' rows, so
  // local values and any synced values coexist without clobbering each other.

  import: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ rows: z.array(z.object({ name: z.string(), pillar: z.string().optional(), category: z.string().optional(), description: z.string().optional() })).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      let added = 0; let skipped = 0; const errors: string[] = [];
      const existing = new Set((await ctx.db.query.companyValues.findMany()).filter((v) => v.active).map((v) => v.name.trim().toLowerCase()));
      let order = existing.size * 10;
      for (const r of input.rows) {
        const name = (r.name ?? '').trim(); if (!name) { skipped++; continue; }
        if (existing.has(name.toLowerCase())) { skipped++; continue; }
        try { await ctx.db.insert(companyValues).values({ name, pillar: (r.pillar ?? '').trim() || 'General', category: r.category?.trim() || null, description: r.description?.trim() || null, sortOrder: order, source: 'local', active: true }); existing.add(name.toLowerCase()); order += 10; added++; }
        catch (e) { errors.push(`${name}: ${e instanceof Error ? e.message : 'insert failed'}`); }
      }
      return { added, skipped, errors };
    }),

  createValue: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      name: z.string().min(1).max(200),
      pillar: z.string().min(1).max(80),
      category: z.string().max(100).nullable().optional(),
      description: z.string().max(4000).nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dup = (await ctx.db.query.companyValues.findMany())
        .find((v) => v.active && v.name.toLowerCase() === input.name.toLowerCase());
      if (dup) throw new TRPCError({ code: 'CONFLICT', message: 'A value with that name already exists.' });
      const [row] = await ctx.db.insert(companyValues).values({
        name: input.name,
        pillar: input.pillar,
        category: input.category ?? null,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        source: 'local',
        active: true,
      }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'company_values', 'create');
      trackActivity(ctx.db, ctx.user.id, 'company_value_create', input.name).catch(() => {});
      return row;
    }),

  updateValue: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      pillar: z.string().min(1).max(80).optional(),
      category: z.string().max(100).nullable().optional(),
      description: z.string().max(4000).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.companyValues.findFirst({ where: eq(companyValues.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(companyValues)
        .set({ ...updates, updatedAt: new Date() }).where(eq(companyValues.id, id)).returning();
      await auditChange(ctx.db, ctx.user.id, id, 'company_values', 'update');
      return row;
    }),

  deleteValue: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const refs = await ctx.db.query.reviewScores.findMany({ where: eq(reviewScores.itemId, input.id) });
      if (refs.length > 0) {
        // Referenced by past evaluations -> deactivate (preserve history) instead of hard delete.
        await ctx.db.update(companyValues).set({ active: false, updatedAt: new Date() }).where(eq(companyValues.id, input.id));
        await auditChange(ctx.db, ctx.user.id, input.id, 'company_values', 'archive');
        return { ok: true, deactivated: true };
      }
      await ctx.db.delete(companyValues).where(eq(companyValues.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'company_values', 'delete');
      return { ok: true, deactivated: false };
    }),

  // ---------- Review periods (managed lookup) ----------

  listPeriods: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.reviewPeriods.findMany({
        orderBy: [desc(reviewPeriods.sortOrder), desc(reviewPeriods.createdAt)],
      });
      return input?.includeInactive ? all : all.filter((p) => p.active);
    }),

  // Managers can add a period from the Reviews "+" modal.
  createPeriod: protectedProcedure
    .use(requireManager)
    .input(z.object({ label: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const label = input.label.trim();
      const dup = await ctx.db.query.reviewPeriods.findFirst({ where: eq(reviewPeriods.label, label) });
      if (dup) {
        if (!dup.active) {
          const [row] = await ctx.db.update(reviewPeriods).set({ active: true, updatedAt: new Date() }).where(eq(reviewPeriods.id, dup.id)).returning();
          return row;
        }
        throw new TRPCError({ code: 'CONFLICT', message: 'That review period already exists.' });
      }
      const existing = await ctx.db.query.reviewPeriods.findMany();
      const maxSort = existing.reduce((m, p) => Math.max(m, p.sortOrder), 0);
      const [row] = await ctx.db.insert(reviewPeriods).values({ label, sortOrder: maxSort + 10 }).returning();
      await auditChange(ctx.db, ctx.user.id, row.id, 'review_periods', 'create');
      trackActivity(ctx.db, ctx.user.id, 'review_period_create', label).catch(() => {});
      return row;
    }),

  // ---------- Employee picker ----------

  listEmployees: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.users.findMany({
      columns: { id: true, name: true, email: true, jobTitleId: true, isActive: true },
      orderBy: [asc(users.name)],
    });
    return rows.filter((u) => u.isActive).map((u) => ({
      id: u.id, name: u.name, email: u.email, jobTitleId: u.jobTitleId,
    }));
  }),

  // ---------- Reviews (shared reviews/review_scores, type='values') ----------

  listEvaluations: protectedProcedure
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const evals = await ctx.db.query.reviews.findMany({
        where: and(eq(reviews.employeeId, input.employeeId), eq(reviews.type, 'values')),
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
      const values = await ctx.db.query.companyValues.findMany();
      const byId = new Map(values.map((v) => [v.id, v]));
      return {
        ...evaluation,
        scores: scores.map((s) => ({
          valueId: s.itemId, score: s.score, notes: s.notes,
          valueName: byId.get(s.itemId)?.name ?? '(retired value)',
          pillar: byId.get(s.itemId)?.pillar ?? null,
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
            type: 'values',
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
            input.scores.map((s) => ({ reviewId: evalId!, itemId: s.valueId, score: s.score, notes: s.notes ?? null })),
          );
        }
        return { id: evalId! };
      });
      await auditChange(ctx.db, ctx.user.id, result.id, 'reviews', input.id ? 'update' : 'create');
      trackActivity(ctx.db, ctx.user.id, 'value_evaluation_save', input.employeeId).catch(() => {});
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
