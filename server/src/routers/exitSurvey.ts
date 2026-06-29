// Exit Survey router — two-part exit diagnostic, manager-signal (DD-002 Engagement).
// list / get / create / update / saveResponse / remove.
// Full Part A + Part B answers live in the partA / partB jsonb columns; the two
// surprise scores are promoted to columns for the HR comparison read. Status is
// derived from response completion: draft -> part_a_done -> complete.
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { exitSurveys } from '../db/schema/exitSurvey.js';

const answersSchema = z.record(z.string(), z.union([z.number(), z.string()]));

function deriveStatus(a: unknown, b: unknown): 'draft' | 'part_a_done' | 'complete' {
  const aDone = !!a && Object.keys(a as object).length > 0;
  const bDone = !!b && Object.keys(b as object).length > 0;
  if (aDone && bDone) return 'complete';
  if (aDone || bDone) return 'part_a_done';
  return 'draft';
}

export const exitSurveyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.exitSurveys.findMany({
      orderBy: [desc(exitSurveys.leftOn), desc(exitSurveys.createdAt)],
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.exitSurveys.findFirst({ where: eq(exitSurveys.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  create: protectedProcedure
    .input(z.object({
      subjectName: z.string().min(1).max(200),
      subjectRole: z.string().max(200).optional(),
      managerName: z.string().max(200).optional(),
      exitType: z.enum(['vol', 'invol']).default('vol'),
      leftOn: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(exitSurveys).values({
        subjectName: input.subjectName,
        subjectRole: input.subjectRole ?? null,
        managerName: input.managerName ?? null,
        exitType: input.exitType,
        leftOn: input.leftOn ?? null,
        createdById: ctx.user.id,
      }).returning();
      return row;
    }),

  // Edit the record header (people / type / last day).
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      subjectName: z.string().min(1).max(200),
      subjectRole: z.string().max(200).optional(),
      managerName: z.string().max(200).optional(),
      exitType: z.enum(['vol', 'invol']),
      leftOn: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.update(exitSurveys).set({
        subjectName: input.subjectName,
        subjectRole: input.subjectRole ?? null,
        managerName: input.managerName ?? null,
        exitType: input.exitType,
        leftOn: input.leftOn ?? null,
        updatedAt: new Date(),
      }).where(eq(exitSurveys.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  // Persist one side's answers. Promotes the surprise score to its column and
  // re-derives status from whether both sides are now present.
  saveResponse: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      part: z.enum(['A', 'B']),
      answers: answersSchema,
      surprise: z.number().int().min(1).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.exitSurveys.findFirst({ where: eq(exitSurveys.id, input.id) });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const partA = input.part === 'A' ? input.answers : existing.partA;
      const partB = input.part === 'B' ? input.answers : existing.partB;

      const [row] = await ctx.db.update(exitSurveys).set({
        partA,
        partB,
        surpriseEmployee: input.part === 'A' && input.surprise != null ? input.surprise : existing.surpriseEmployee,
        surpriseManager: input.part === 'B' && input.surprise != null ? input.surprise : existing.surpriseManager,
        status: deriveStatus(partA, partB),
        updatedAt: new Date(),
      }).where(eq(exitSurveys.id, input.id)).returning();
      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(exitSurveys).where(eq(exitSurveys.id, input.id));
      return { ok: true };
    }),
});
