// OKRs router — flat node list (client builds the tree) + CRUD. (DD-002 Planning)
// Period-aware (2026-07-22): every query can be scoped to a goal-setting period,
// and new nodes inherit their parent's period (objectives default to current).
import { z } from 'zod';
import { eq, and, asc, isNull, isNotNull, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { okrNodes } from '../db/schema/okr.js';
import { okrPeriods } from '../db/schema/okrPeriods.js';

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

// Resolve the period a new node belongs to: inherit the parent's period, else
// the explicitly requested period, else the current period.
async function resolvePeriodId(
  ctx: { db: any },
  parentId: string | null | undefined,
  requested: string | null | undefined,
): Promise<string | null> {
  if (parentId) {
    const parent = await ctx.db.query.okrNodes.findFirst({
      where: eq(okrNodes.id, parentId),
      columns: { periodId: true },
    });
    if (parent?.periodId) return parent.periodId;
  }
  if (requested) return requested;
  const cur = await ctx.db.query.okrPeriods.findFirst({ where: eq(okrPeriods.isCurrent, true) });
  return cur?.id ?? null;
}

export const okrsRouter = router({
  // Per-person OKRs for the Org screen card. Matches on ownerUserId (reliable)
  // OR the denormalized owner name (fallback for seed data without a FK).
  byUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), name: z.string().optional(), periodId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.periodId
        ? and(isNull(okrNodes.archivedAt), eq(okrNodes.periodId, input.periodId))
        : isNull(okrNodes.archivedAt);
      const all = await ctx.db.query.okrNodes.findMany({
        where,
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

  list: protectedProcedure
    .input(z.object({ periodId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.periodId
        ? and(isNull(okrNodes.archivedAt), eq(okrNodes.periodId, input.periodId))
        : isNull(okrNodes.archivedAt);
      return ctx.db.query.okrNodes.findMany({
        where,
        orderBy: [asc(okrNodes.sortOrder), asc(okrNodes.createdAt)],
      });
    }),

  // Archived OKRs for the Archive section (optionally scoped to a period).
  listArchived: protectedProcedure
    .input(z.object({ periodId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.periodId
        ? and(isNotNull(okrNodes.archivedAt), eq(okrNodes.periodId, input.periodId))
        : isNotNull(okrNodes.archivedAt);
      return ctx.db.query.okrNodes.findMany({
        where,
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
      departmentId: z.string().uuid().nullable().optional(),
      periodId: z.string().uuid().nullable().optional(),
      status: status.optional(),
      light: light.nullable().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().int().optional(),
      weight: z.number().int().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const periodId = await resolvePeriodId(ctx, input.parentId ?? null, input.periodId ?? null);
      const [row] = await ctx.db.insert(okrNodes).values({
        parentId: input.parentId ?? null,
        type: input.type,
        title: input.title,
        owner: input.owner ?? null,
        ownerUserId: input.ownerUserId ?? null,
        departmentId: input.departmentId ?? null,
        periodId,
        status: input.status ?? 'not_started',
        light: input.light ?? null,
        startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
        dueDate: input.dueDate ?? null,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        weight: input.weight ?? 1,
      }).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(400).optional(),
      owner: z.string().max(200).nullable().optional(),
      ownerUserId: z.string().uuid().nullable().optional(),
      departmentId: z.string().uuid().nullable().optional(),
      periodId: z.string().uuid().nullable().optional(),
      status: status.optional(),
      light: light.nullable().optional(),
      startDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
      weight: z.number().int().min(1).optional(),
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

  // Restore ONLY the selected archived node (not its subtree/siblings). If its
  // parent is still archived, the Plan view surfaces it as a top-level orphan
  // so it stays visible until the parent is restored too.
  unarchive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.update(okrNodes)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(eq(okrNodes.id, input.id)).returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return { ok: true };
    }),

  // Hard delete — permanently removes the node; descendants go via FK cascade.
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(okrNodes).where(eq(okrNodes.id, input.id));
      return { ok: true };
    }),
});
