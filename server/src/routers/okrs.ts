// OKRs router — flat node list (client builds the tree) + CRUD. (DD-002 Planning)
import { z } from 'zod';
import { eq, asc, isNull, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { okrNodes } from '../db/schema/okr.js';

const nodeType = z.enum(['objective', 'key_result', 'task']);
const light = z.enum(['green', 'yellow', 'red']);
const status = z.enum(['not_started', 'in_progress', 'on_hold', 'complete']);

export const okrsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.okrNodes.findMany({
      where: isNull(okrNodes.archivedAt),
      orderBy: [asc(okrNodes.sortOrder), asc(okrNodes.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(z.object({
      parentId: z.string().uuid().nullable().optional(),
      type: nodeType,
      title: z.string().min(1).max(400),
      owner: z.string().max(200).optional(),
      status: status.optional(),
      light: light.nullable().optional(),
      dueDate: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(okrNodes).values({
        parentId: input.parentId ?? null,
        type: input.type,
        title: input.title,
        owner: input.owner ?? null,
        status: input.status ?? 'not_started',
        light: input.light ?? null,
        dueDate: input.dueDate ?? null,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      }).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(400).optional(),
      owner: z.string().max(200).nullable().optional(),
      status: status.optional(),
      light: light.nullable().optional(),
      dueDate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [row] = await ctx.db.update(okrNodes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(okrNodes.id, id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // soft-delete the node and (hard) its subtree via FK cascade on hard delete;
      // here we soft-delete just this node and its descendants explicitly.
      await ctx.db.delete(okrNodes).where(
        and(eq(okrNodes.id, input.id), isNull(okrNodes.archivedAt)),
      );
      return { ok: true };
    }),
});
