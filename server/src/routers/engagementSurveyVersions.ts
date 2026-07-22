// ============================================================
// ENGAGEMENT SURVEY VERSIONS ROUTER. HR builds named variants of the survey
// (e.g. V1 for Marketing, V2 for Sales), each with its own question set drawn
// from the bank. `setQuestions` is the explicit Save (replaces a version's
// membership). `getQuestions` feeds the Take Survey tab for a chosen version.
// Mutations are admin-only.
// ============================================================
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { engagementSurveyVersions, engagementSurveyVersionQuestions } from '../db/schema/engagementSurveyVersions.js';
import { engagementSurveyQuestions } from '../db/schema/engagementSurveyQuestions.js';
import { requireAdmin } from '../services/permissions.js';
import { auditChange } from '../services/audit.js';

export const engagementSurveyVersionsRouter = router({
  // All versions (ordered), each with its selected question ids.
  list: protectedProcedure.query(async ({ ctx }) => {
    const versions = await ctx.db.query.engagementSurveyVersions.findMany({
      orderBy: [asc(engagementSurveyVersions.sortOrder), asc(engagementSurveyVersions.createdAt)],
    });
    const links = await ctx.db.query.engagementSurveyVersionQuestions.findMany();
    return versions.map((v) => ({
      ...v,
      questionIds: links.filter((l) => l.versionId === v.id).map((l) => l.questionId),
    }));
  }),

  // Full ordered question objects for one version (Take Survey). Defaults to the
  // default version when no id is given. Only active bank questions are returned.
  getQuestions: protectedProcedure
    .input(z.object({ versionId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const bank = await ctx.db.query.engagementSurveyQuestions.findMany();
      type QRow = (typeof bank)[number];
      const empty: QRow[] = [];
      const versions = await ctx.db.query.engagementSurveyVersions.findMany();
      if (versions.length === 0) return { version: null as { id: string; name: string } | null, questions: empty };
      const target = (input?.versionId && versions.find((v) => v.id === input.versionId))
        || versions.find((v) => v.isDefault) || versions[0];
      const links = (await ctx.db.query.engagementSurveyVersionQuestions.findMany())
        .filter((l) => l.versionId === target.id);
      const byId = new Map(bank.map((q) => [q.id, q]));
      const questions: QRow[] = links
        .map((l) => byId.get(l.questionId))
        .filter((q): q is QRow => !!q)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return { version: { id: target.id, name: target.name } as { id: string; name: string } | null, questions };
    }),

  create: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ name: z.string().min(1).max(120), copyFromVersionId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const all = await ctx.db.query.engagementSurveyVersions.findMany();
      const maxSort = all.reduce((m, v) => Math.max(m, v.sortOrder), 0);
      const [row] = await ctx.db.insert(engagementSurveyVersions)
        .values({ name: input.name.trim(), isDefault: all.length === 0, sortOrder: maxSort + 1 }).returning();
      // Seed membership by copying an existing version (defaults to the default version).
      const source = input.copyFromVersionId ?? all.find((v) => v.isDefault)?.id;
      if (source) {
        const links = (await ctx.db.query.engagementSurveyVersionQuestions.findMany()).filter((l) => l.versionId === source);
        if (links.length) {
          await ctx.db.insert(engagementSurveyVersionQuestions)
            .values(links.map((l) => ({ versionId: row.id, questionId: l.questionId, sortOrder: l.sortOrder })));
        }
      }
      await auditChange(ctx.db, ctx.user.id, row.id, 'engagement_survey_versions', 'create');
      return row;
    }),

  rename: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.update(engagementSurveyVersions)
        .set({ name: input.name.trim() }).where(eq(engagementSurveyVersions.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await auditChange(ctx.db, ctx.user.id, input.id, 'engagement_survey_versions', 'update');
      return row;
    }),

  setDefault: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(engagementSurveyVersions).set({ isDefault: false });
      const [row] = await ctx.db.update(engagementSurveyVersions)
        .set({ isDefault: true }).where(eq(engagementSurveyVersions.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  remove: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const all = await ctx.db.query.engagementSurveyVersions.findMany();
      const target = all.find((v) => v.id === input.id);
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' });
      if (target.isDefault) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Set another version as default before deleting this one.' });
      if (all.length <= 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'At least one survey version is required.' });
      await ctx.db.delete(engagementSurveyVersions).where(eq(engagementSurveyVersions.id, input.id));
      await auditChange(ctx.db, ctx.user.id, input.id, 'engagement_survey_versions', 'delete');
      return { ok: true };
    }),

  // Explicit Save: replace a version's question set with the given ids (ordered
  // by their position in the bank so sections render consistently).
  setQuestions: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ id: z.string().uuid(), questionIds: z.array(z.string().max(64)) }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.query.engagementSurveyVersions.findFirst({ where: eq(engagementSurveyVersions.id, input.id) });
      if (!version) throw new TRPCError({ code: 'NOT_FOUND' });
      const bank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const order = new Map(bank.map((q) => [q.id, q.sortOrder]));
      const valid = input.questionIds.filter((qid) => order.has(qid));
      await ctx.db.delete(engagementSurveyVersionQuestions).where(eq(engagementSurveyVersionQuestions.versionId, input.id));
      if (valid.length) {
        await ctx.db.insert(engagementSurveyVersionQuestions)
          .values(valid.map((qid) => ({ versionId: input.id, questionId: qid, sortOrder: order.get(qid) ?? 0 })));
      }
      await auditChange(ctx.db, ctx.user.id, input.id, 'engagement_survey_versions', 'update');
      return { ok: true, count: valid.length };
    }),
});
