// ============================================================
// WEEKLY CHECK-IN ROUTER — standalone weekly pulse submissions.
// submit / list. One row per pulse. The client computes the rotation from the
// week (src/lib/weeklyCheckin.ts) and sends the asked questions alongside the
// answers so history stays readable. Respondent is attributed (not anonymized).
// ============================================================

import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { checkinResponses } from '../db/schema/checkins.js';
import { users } from '../db/schema/core.js';

const rotatingSchema = z.object({
  key: z.string(),
  text: z.string(),
  driver: z.string().optional(),
  value: z.number().int().min(0).max(10).optional(),
}).nullable().optional();

export const checkinsRouter = router({
  submit: protectedProcedure
    .input(z.object({
      respondentId: z.string().uuid(),
      weekOf: z.string().min(1),               // YYYY-MM-DD
      rotationIndex: z.number().int().min(0).max(11),
      bestSelf: z.number().int().min(1).max(5).optional(),
      sentiment: z.number().int().min(1).max(5).optional(),
      workload: z.number().int().min(1).max(5).optional(),
      driver: rotatingSchema,
      valueItem: rotatingSchema,
      enps: z.number().int().min(0).max(10).optional(),
      openPrompt: z.string().optional(),
      openText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.bestSelf == null && input.sentiment == null && input.workload == null) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Answer at least one question before submitting.' });
      }
      const respondent = await ctx.db.query.users.findFirst({ where: eq(users.id, input.respondentId) });
      const [row] = await ctx.db.insert(checkinResponses).values({
        respondentId: input.respondentId,
        respondentName: respondent?.name ?? null,
        weekOf: input.weekOf,
        rotationIndex: input.rotationIndex,
        bestSelf: input.bestSelf ?? null,
        sentiment: input.sentiment ?? null,
        workload: input.workload ?? null,
        driver: input.driver ?? null,
        valueItem: input.valueItem ?? null,
        enps: input.enps ?? null,
        openPrompt: input.openPrompt || null,
        openText: input.openText || null,
      }).returning();
      return row;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.checkinResponses.findMany({
      orderBy: [desc(checkinResponses.submittedAt)],
    });
  }),
});
