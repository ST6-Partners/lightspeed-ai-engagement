// Exit Survey router — list / get / create the two-part exit diagnostic. (DD-002 Engagement)
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { exitSurveys } from '../db/schema/exitSurvey.js';

export const exitSurveyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.exitSurveys.findMany({ orderBy: [desc(exitSurveys.leftOn), desc(exitSurveys.createdAt)] });
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
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(exitSurveys).values({
        subjectName: input.subjectName,
        subjectRole: input.subjectRole ?? null,
        managerName: input.managerName ?? null,
        exitType: input.exitType,
        createdById: ctx.user.id,
      }).returning();
      return row;
    }),
});
