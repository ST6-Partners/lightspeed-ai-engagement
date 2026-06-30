// Weekly Plan router — per-user weekly check-in: read current + upsert. (DD-002 Planning)
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { weeklyCheckins, type WeeklyPriority } from '../db/schema/weeklyPlan.js';

// Monday (ISO) of the week containing `d`, as YYYY-MM-DD.
function mondayOf(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

export const weeklyPlanRouter = router({
  getCurrent: protectedProcedure
    .input(z.object({ weekStart: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const weekStart = input?.weekStart ?? mondayOf();
      const row = await ctx.db.query.weeklyCheckins.findFirst({
        where: and(eq(weeklyCheckins.userId, ctx.user.id), eq(weeklyCheckins.weekStart, weekStart)),
      });
      if (row) {
        // Legacy rows may hold plain strings; normalize so the client always gets objects.
        const raw = row.priorities as unknown as Array<string | WeeklyPriority>;
        row.priorities = raw.map((p) =>
          typeof p === 'string' ? { text: p, okrNodeId: null } : { text: p.text, okrNodeId: p.okrNodeId ?? null },
        );
      }
      return { weekStart, checkin: row ?? null };
    }),

  save: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      priorities: z.array(z.union([
        z.string(),
        z.object({ text: z.string(), okrNodeId: z.string().uuid().nullable().optional() }),
      ])).default([]).transform((arr) => arr.map((p) => (typeof p === 'string' ? { text: p } : { text: p.text, okrNodeId: p.okrNodeId ?? null }))),
      wins: z.string().optional(),
      blockers: z.string().optional(),
      mood: z.number().int().min(1).max(5).nullable().optional(),
      pulseAnswer: z.string().max(24).nullable().optional(),
      status: z.enum(['draft', 'saved']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const values = {
        userId: ctx.user.id,
        weekStart: input.weekStart,
        priorities: input.priorities,
        wins: input.wins ?? null,
        blockers: input.blockers ?? null,
        mood: input.mood ?? null,
        pulseAnswer: input.pulseAnswer ?? null,
        status: input.status ?? 'saved',
      };
      const [row] = await ctx.db.insert(weeklyCheckins).values(values)
        .onConflictDoUpdate({
          target: [weeklyCheckins.userId, weeklyCheckins.weekStart],
          set: {
            priorities: values.priorities,
            wins: values.wins,
            blockers: values.blockers,
            mood: values.mood,
            pulseAnswer: values.pulseAnswer,
            status: values.status,
            updatedAt: new Date(),
          },
        }).returning();
      return row;
    }),
});
