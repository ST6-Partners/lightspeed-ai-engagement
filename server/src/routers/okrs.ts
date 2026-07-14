// OKRs router — flat node list (client builds the tree) + CRUD. (DD-002 Planning)
import { z } from 'zod';
import { eq, asc, isNull, isNotNull, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { okrNodes } from '../db/schema/okr.js';

const nodeType = z.enum(['objective', 'key_result', 'task']);
const light = z.enum(['green', 'yellow', 'red']);
const status = z.enum(['not_started', 'in_progress', 'on_hold', 'complete']);

// Collect a node id + every descendant id (adjacency walk over the flat list).
// Used so archive/restore act on the whole subtree, not just the clicked node.
function subtreeIds(all: { id: string; parentId: string | null }[], rootId: string): string[] {
  const byParent = new Map<string | null, string[]>();
  for (const n of all) {
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n.id);
    byParent.set(n.parentId, arr);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const child of byParent.get(id) ?? []) stack.push(child);
  }
  return out;
}

export const okrsRouter = router({
  // Per-person OKRs for the Org screen card. Matches on ownerUserId (reliable)
  // OR the denormalized owner name (fallback for seed data without a FK).
  byUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), name: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const all = await ctx.db.query.okrNodes.findMany({
        where: isNull(okrNodes.archivedAt),
        orderBy: [asc(okrNodes.sortOrder), asc(okrNodes.createdAt)],
      });
      const mine = (n: typeof all[number]) =>
        n.ownerUserId === input.userId || (!!input.name && n.owner === input.name);
      const objectives = all.filter((n) => n.type === 'objective' && mine(n)).map((o) => ({
        id: o.id, title: o.title, period: null as string | null,
        progress: o.status === 'complete' ? 100 : o.status === 'in_progress' ? 50 : 0,
        keyResults: all.filter((k) => k.type === 'key_result' && k.parentId === o.id).map((k) => ({
          id: k.id, title: k.title, target: null as string | null,
          progress: k.status === 'complete' ? 100 : k.status === 'in_progress' ? 50 : 0,
        })),
      }));
      return { hasData: objectives.length > 0, objectives };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.okrNodes.findMany({
      where: isNull(okrNodes.archivedAt),
      orderBy: [asc(okrNodes.sortOrder), asc(okrNodes.createdAt)],
    });
  }),

  // Archived OKRs for the Archive section.
  listArchived: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.okrNodes.findMany({
      where: isNotNull(okrNodes.archivedAt),
      orderBy: [asc(okrNodes.sortOrder), asc(okrNodes.createdAt)],
    });
  }),

  create: protectedProcedure
    .input(z.object({
      parentId: z.string().uuid().nullable().optional(),
      type: nodeType,
      title: z.string().min(1).max(400),
      owner: z.string().max(200).nullable().optional(),
      ownerUserId: z.string().uuid().nullable().optional(),
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
        ownerUserId: input.ownerUserId ?? null,
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
      ownerUserId: z.string().uuid().nullable().optional(),
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

  // Archive (soft-delete) — moves the node and its whole subtree to the Archive
  // section by stamping archived_at. Reversible via unarchive; nothing is lost.
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const all = await ctx.db.query.okrNodes.findMany({
        columns: { id: true, parentId: true },
      });
      const ids = subtreeIds(all, input.id);
      if (!ids.length) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.db.update(okrNodes)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(inArray(okrNodes.id, ids));
      return { ok: true, count: ids.length };
    }),

  // Restore an archived node and its subtree back to the active plan.
  unarchive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const all = await ctx.db.query.okrNodes.findMany({
        columns: { id: true, parentId: true },
      });
      const ids = subtreeIds(all, input.id);
      if (!ids.length) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.db.update(okrNodes)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(inArray(okrNodes.id, ids));
      return { ok: true, count: ids.length };
    }),

  // Hard delete — permanently removes the node; descendants go via FK cascade.
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(okrNodes).where(eq(okrNodes.id, input.id));
      return { ok: true };
    }),
});
