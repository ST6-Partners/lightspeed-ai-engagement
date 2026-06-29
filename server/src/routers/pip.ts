// ============================================================
// PERFORMANCE IMPROVEMENT PLAN (PIP) ROUTER
// AI Engagement (4-Lightspeed)
//
// Full CRUD + business logic for the PIP feature behind pip-v1.html:
//   - pips:        list / get(+children) / create / update / setStatus /
//                  saveEmployeeComments / archive(cascade)
//   - concerns:    add / update / remove / reorder        (§3)
//   - goals:       add / update / remove / reorder         (§4)
//   - supports:    add / update / remove / reorder         (§5)
//   - checkins:    add / update / remove / reorder         (§6)
//   - signatures:  sign / unsign                           (§9)
//
// Business rules:
//   - status workflow: draft → active → (completed_met | completed_not_met
//     | extended); any non-terminal → cancelled. Illegal jumps rejected.
//   - editing the plan & its concern/goal/support/checkin rows requires
//     manager / HR / creator / admin. The EMPLOYEE (subject) may only edit
//     their own §8 comments and sign their own §9 row.
//   - create seeds supportive default language (purpose + both outcomes),
//     a starter check-in scaffold, and the four signature rows.
//
// Same audit + telemetry + permission services as the planning router.
// ============================================================

import { z } from 'zod';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import {
  pips, pipConcerns, pipGoals, pipSupports, pipCheckins, pipSignatures,
} from '../db/schema/pip.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { auditChange, auditFieldChanges } from '../services/audit.js';
import { trackActivity } from '../services/telemetry.js';
import {
  canTransition, isTerminal, isPipEditor, isSubject, canEditComments, canSignRole,
  type ActorLite,
} from './pip.logic.js';

// ── validators ──────────────────────────────────────────────
const pipStatus = z.enum([
  'draft', 'active', 'completed_met', 'completed_not_met', 'extended', 'cancelled',
]);
const goalStatus = z.enum([
  'pending', 'on_track', 'partial', 'off_track', 'met', 'not_met',
]);
const checkinStatus = z.enum(['on_track', 'partial', 'off_track']);
const signatureRole = z.enum(['employee', 'manager', 'hr', 'reviewer']);

// Status transition rules + permission predicates live in ./pip.logic.ts
// (pure, unit-tested) and are imported above — single source of truth.

// ── supportive default language (editable after create) ─────
const DEFAULT_PURPOSE =
  'The goal of this plan is to help you succeed. It identifies specific areas where ' +
  'your performance is not yet meeting the expectations of your role, defines what ' +
  'success looks like in clear and measurable terms, and lays out the support and ' +
  'resources we will provide. Meeting the expectations below within the plan period ' +
  'returns you to good standing.';

const DEFAULT_OUTCOME_MET =
  'You return to good standing. Sustained performance is expected going forward; your ' +
  'manager will continue regular 1:1 support.';

const DEFAULT_OUTCOME_NOT_MET =
  'Further action may follow, which could include an extension of the plan, role change, ' +
  'or termination of employment, consistent with company policy.';

// The four signature rows every PIP starts with (§9).
const DEFAULT_SIGNATURE_ROLES: Array<z.infer<typeof signatureRole>> =
  ['employee', 'manager', 'hr', 'reviewer'];

// A light starter scaffold for the check-in cadence (§6); fully editable.
const STARTER_CHECKINS = [
  { label: 'Mid-Point Review', attendees: 'Manager + Employee + HR' },
  { label: 'Final Review', attendees: 'Manager + Employee + HR' },
];

// ── helpers ─────────────────────────────────────────────────
async function loadPipOrThrow(db: any, id: string) {
  const pip = await db.query.pips.findFirst({ where: eq(pips.id, id) });
  if (!pip) throw new TRPCError({ code: 'NOT_FOUND', message: 'PIP not found' });
  return pip as typeof pips.$inferSelect;
}

// Manager / HR / creator / admin may edit the plan. (role-aware, pure rule)
function assertCanEdit(actor: ActorLite, pip: typeof pips.$inferSelect) {
  if (!isPipEditor(actor, pip)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the manager, HR partner, the plan creator, or an admin can edit this plan.',
    });
  }
}

// Look up the parent PIP for a child row, then assert edit rights.
async function assertCanEditChild(db: any, actor: ActorLite, pipId: string) {
  const pip = await loadPipOrThrow(db, pipId);
  assertCanEdit(actor, pip);
  return pip;
}

async function nextSort(db: any, table: any, pipId: string): Promise<number> {
  const rows = await db.select({ id: table.id }).from(table).where(eq(table.pipId, pipId));
  return rows.length;
}

export const pipRouter = router({
  // People picker source (employee / manager / HR selects on the form).
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const all = await ctx.db.query.users.findMany();
    return all
      .map((u) => ({ id: u.id, name: u.name ?? '(no name)', role: u.role ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }),

  // ───────────────────────────────────────────────── PIPS ──
  // List (non-archived) with employee/manager names resolved.
  list: protectedProcedure
    .input(z.object({ status: pipStatus.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.pips.findMany({
        where: input?.status
          ? and(isNull(pips.archivedAt), eq(pips.status, input.status))
          : isNull(pips.archivedAt),
        orderBy: [sql`${pips.updatedAt} DESC`],
      });
      const allUsers = await ctx.db.query.users.findMany();
      const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
      const titles = await ctx.db.query.jobTitles.findMany();
      const titleById = new Map(titles.map((t) => [t.id, t.title]));
      return rows.map((p) => ({
        ...p,
        employeeName: p.employeeId ? nameById.get(p.employeeId) ?? null : null,
        managerName: p.managerId ? nameById.get(p.managerId) ?? null : null,
        hrPartnerName: p.hrPartnerId ? nameById.get(p.hrPartnerId) ?? null : null,
        // Derived display label for the FK (frontends read `roleLevel`).
        roleLevel: p.jobTitleId ? titleById.get(p.jobTitleId) ?? null : null,
      }));
    }),

  // Full PIP with all child sections, names resolved, and an edit flag.
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pip = await loadPipOrThrow(ctx.db, input.id);

      const [concerns, goals, supports, checkins, signatures, allUsers] = await Promise.all([
        ctx.db.query.pipConcerns.findMany({ where: eq(pipConcerns.pipId, input.id), orderBy: [asc(pipConcerns.sortOrder)] }),
        ctx.db.query.pipGoals.findMany({ where: eq(pipGoals.pipId, input.id), orderBy: [asc(pipGoals.sortOrder)] }),
        ctx.db.query.pipSupports.findMany({ where: eq(pipSupports.pipId, input.id), orderBy: [asc(pipSupports.sortOrder)] }),
        ctx.db.query.pipCheckins.findMany({ where: eq(pipCheckins.pipId, input.id), orderBy: [asc(pipCheckins.sortOrder)] }),
        ctx.db.query.pipSignatures.findMany({ where: eq(pipSignatures.pipId, input.id), orderBy: [asc(pipSignatures.sortOrder)] }),
        ctx.db.query.users.findMany(),
      ]);

      const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
      const jt = pip.jobTitleId
        ? await ctx.db.query.jobTitles.findFirst({ where: eq(jobTitles.id, pip.jobTitleId) })
        : null;

      return {
        ...pip,
        employeeName: pip.employeeId ? nameById.get(pip.employeeId) ?? null : null,
        managerName: pip.managerId ? nameById.get(pip.managerId) ?? null : null,
        hrPartnerName: pip.hrPartnerId ? nameById.get(pip.hrPartnerId) ?? null : null,
        roleLevel: jt?.title ?? null, // derived label for the jobTitleId FK
        isEmployee: isSubject(ctx.user, pip),
        canEdit: isPipEditor(ctx.user, pip),
        concerns, goals, supports, checkins, signatures,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      employeeId: z.string().uuid().optional(),
      managerId: z.string().uuid().optional(),
      hrPartnerId: z.string().uuid().optional(),
      jobTitleId: z.string().uuid().optional(),
      team: z.string().max(200).optional(),
      durationDays: z.number().int().min(1).max(365).optional(),
      startDate: z.string().optional(),
      midpointDate: z.string().optional(),
      finalReviewDate: z.string().optional(),
      purpose: z.string().optional(),
      seedScaffold: z.boolean().optional(), // seed starter check-ins (default true)
    }))
    .mutation(async ({ ctx, input }) => {
      const [pip] = await ctx.db.insert(pips).values({
        employeeId: input.employeeId ?? null,
        managerId: input.managerId ?? ctx.user.id, // creator is the manager by default
        hrPartnerId: input.hrPartnerId ?? null,
        jobTitleId: input.jobTitleId ?? null,
        team: input.team ?? null,
        durationDays: input.durationDays ?? 60,
        startDate: input.startDate ?? null,
        midpointDate: input.midpointDate ?? null,
        finalReviewDate: input.finalReviewDate ?? null,
        purpose: input.purpose ?? DEFAULT_PURPOSE,
        outcomeMet: DEFAULT_OUTCOME_MET,
        outcomeNotMet: DEFAULT_OUTCOME_NOT_MET,
        status: 'draft',
        createdBy: ctx.user.id,
      }).returning();

      // Seed the four signature rows (§9).
      await ctx.db.insert(pipSignatures).values(
        DEFAULT_SIGNATURE_ROLES.map((role, i) => ({ pipId: pip.id, role, sortOrder: i })),
      );

      // Optional starter check-in scaffold (§6).
      if (input.seedScaffold !== false) {
        await ctx.db.insert(pipCheckins).values(
          STARTER_CHECKINS.map((c, i) => ({ pipId: pip.id, label: c.label, attendees: c.attendees, sortOrder: i })),
        );
      }

      await auditChange(ctx.db, ctx.user.id, pip.id, 'pips', 'create');
      trackActivity(ctx.db, ctx.user.id, 'create_pip', 'pips', { pipId: pip.id }).catch(() => {});
      return pip;
    }),

  // Update header fields (§1, §2, §7). type/status handled by setStatus.
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      employeeId: z.string().uuid().nullable().optional(),
      managerId: z.string().uuid().nullable().optional(),
      hrPartnerId: z.string().uuid().nullable().optional(),
      jobTitleId: z.string().uuid().nullable().optional(),
      team: z.string().max(200).nullable().optional(),
      durationDays: z.number().int().min(1).max(365).optional(),
      startDate: z.string().nullable().optional(),
      midpointDate: z.string().nullable().optional(),
      finalReviewDate: z.string().nullable().optional(),
      purpose: z.string().nullable().optional(),
      outcomeMet: z.string().nullable().optional(),
      outcomeNotMet: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadPipOrThrow(ctx.db, input.id);
      assertCanEdit(ctx.user,existing);

      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;

      const [pip] = await ctx.db.update(pips)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(pips.id, id))
        .returning();

      await auditFieldChanges(ctx.db, ctx.user.id, id, 'pips', existing, updates);
      trackActivity(ctx.db, ctx.user.id, 'update_pip', 'pips', { pipId: id }).catch(() => {});
      return pip;
    }),

  // Status workflow with transition guard (§ lifecycle).
  setStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: pipStatus }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadPipOrThrow(ctx.db, input.id);
      assertCanEdit(ctx.user,existing);

      if (!canTransition(existing.status as any, input.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot move a plan from "${existing.status}" to "${input.status}".`,
        });
      }

      const patch: Record<string, any> = { status: input.status, updatedAt: new Date() };
      if (input.status === 'active' && !existing.activatedAt) patch.activatedAt = new Date();
      if (isTerminal(input.status)) patch.closedAt = new Date();

      const [pip] = await ctx.db.update(pips).set(patch).where(eq(pips.id, input.id)).returning();
      // audit `action` is a strict union ('create'|'update'|'archive'|'delete');
      // the human detail (target status) goes in the free-form telemetry value.
      await auditChange(ctx.db, ctx.user.id, input.id, 'pips', 'update');
      trackActivity(ctx.db, ctx.user.id, 'pip_status', input.status, { pipId: input.id }).catch(() => {});
      return pip;
    }),

  // §8 — the employee's own comments (subject OR an editor may write).
  saveEmployeeComments: protectedProcedure
    .input(z.object({ id: z.string().uuid(), employeeComments: z.string().max(8000) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadPipOrThrow(ctx.db, input.id);
      if (!canEditComments(ctx.user, existing)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the employee or an editor may change these comments.' });
      }
      const [pip] = await ctx.db.update(pips)
        .set({ employeeComments: input.employeeComments, updatedAt: new Date() })
        .where(eq(pips.id, input.id))
        .returning();
      trackActivity(ctx.db, ctx.user.id, 'pip_comment', 'pips', { pipId: input.id }).catch(() => {});
      return pip;
    }),

  // Soft-delete the plan (children remain FK-linked; list hides archived).
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await loadPipOrThrow(ctx.db, input.id);
      assertCanEdit(ctx.user,existing);
      const [pip] = await ctx.db.update(pips)
        .set({ archivedAt: new Date(), archivedBy: ctx.user.id, updatedAt: new Date() })
        .where(eq(pips.id, input.id))
        .returning();
      await auditChange(ctx.db, ctx.user.id, input.id, 'pips', 'archive');
      return pip;
    }),

  // ───────────────────────────────────────────── CONCERNS (§3) ──
  addConcern: protectedProcedure
    .input(z.object({
      pipId: z.string().uuid(),
      area: z.string().min(1).max(300),
      observations: z.string().optional(),
      expectation: z.string().optional(),
      previouslyRaised: z.string().max(400).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      const sortOrder = await nextSort(ctx.db, pipConcerns, input.pipId);
      const [row] = await ctx.db.insert(pipConcerns).values({
        pipId: input.pipId,
        area: input.area,
        observations: input.observations ?? null,
        expectation: input.expectation ?? null,
        previouslyRaised: input.previouslyRaised ?? null,
        sortOrder,
      }).returning();
      return row;
    }),

  updateConcern: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      area: z.string().min(1).max(300).optional(),
      observations: z.string().nullable().optional(),
      expectation: z.string().nullable().optional(),
      previouslyRaised: z.string().max(400).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipConcerns.findFirst({ where: eq(pipConcerns.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [updated] = await ctx.db.update(pipConcerns)
        .set({ ...updates, updatedAt: new Date() }).where(eq(pipConcerns.id, id)).returning();
      return updated;
    }),

  removeConcern: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipConcerns.findFirst({ where: eq(pipConcerns.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      await ctx.db.delete(pipConcerns).where(eq(pipConcerns.id, input.id));
      return { ok: true };
    }),

  reorderConcerns: protectedProcedure
    .input(z.object({ pipId: z.string().uuid(), ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      for (let i = 0; i < input.ids.length; i++) {
        await ctx.db.update(pipConcerns).set({ sortOrder: i }).where(eq(pipConcerns.id, input.ids[i]));
      }
      return { ok: true };
    }),

  // ───────────────────────────────────────────── GOALS (§4) ──
  addGoal: protectedProcedure
    .input(z.object({
      pipId: z.string().uuid(),
      title: z.string().min(1).max(400),
      successCriteria: z.string().optional(),
      measurement: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      const sortOrder = await nextSort(ctx.db, pipGoals, input.pipId);
      const [row] = await ctx.db.insert(pipGoals).values({
        pipId: input.pipId,
        title: input.title,
        successCriteria: input.successCriteria ?? null,
        measurement: input.measurement ?? null,
        status: 'pending',
        sortOrder,
      }).returning();
      return row;
    }),

  updateGoal: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(400).optional(),
      successCriteria: z.string().nullable().optional(),
      measurement: z.string().nullable().optional(),
      status: goalStatus.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipGoals.findFirst({ where: eq(pipGoals.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [updated] = await ctx.db.update(pipGoals)
        .set({ ...updates, updatedAt: new Date() }).where(eq(pipGoals.id, id)).returning();
      return updated;
    }),

  removeGoal: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipGoals.findFirst({ where: eq(pipGoals.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      await ctx.db.delete(pipGoals).where(eq(pipGoals.id, input.id));
      return { ok: true };
    }),

  reorderGoals: protectedProcedure
    .input(z.object({ pipId: z.string().uuid(), ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      for (let i = 0; i < input.ids.length; i++) {
        await ctx.db.update(pipGoals).set({ sortOrder: i }).where(eq(pipGoals.id, input.ids[i]));
      }
      return { ok: true };
    }),

  // ───────────────────────────────────────────── SUPPORTS (§5) ──
  addSupport: protectedProcedure
    .input(z.object({
      pipId: z.string().uuid(),
      support: z.string().min(1).max(400),
      owner: z.string().max(200).optional(),
      cadence: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      const sortOrder = await nextSort(ctx.db, pipSupports, input.pipId);
      const [row] = await ctx.db.insert(pipSupports).values({
        pipId: input.pipId,
        support: input.support,
        owner: input.owner ?? null,
        cadence: input.cadence ?? null,
        sortOrder,
      }).returning();
      return row;
    }),

  updateSupport: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      support: z.string().min(1).max(400).optional(),
      owner: z.string().max(200).nullable().optional(),
      cadence: z.string().max(200).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipSupports.findFirst({ where: eq(pipSupports.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [updated] = await ctx.db.update(pipSupports)
        .set({ ...updates, updatedAt: new Date() }).where(eq(pipSupports.id, id)).returning();
      return updated;
    }),

  removeSupport: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipSupports.findFirst({ where: eq(pipSupports.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      await ctx.db.delete(pipSupports).where(eq(pipSupports.id, input.id));
      return { ok: true };
    }),

  reorderSupports: protectedProcedure
    .input(z.object({ pipId: z.string().uuid(), ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      for (let i = 0; i < input.ids.length; i++) {
        await ctx.db.update(pipSupports).set({ sortOrder: i }).where(eq(pipSupports.id, input.ids[i]));
      }
      return { ok: true };
    }),

  // ───────────────────────────────────────────── CHECK-INS (§6) ──
  addCheckin: protectedProcedure
    .input(z.object({
      pipId: z.string().uuid(),
      label: z.string().min(1).max(200),
      checkinDate: z.string().optional(),
      attendees: z.string().max(300).optional(),
      notes: z.string().optional(),
      status: checkinStatus.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      const sortOrder = await nextSort(ctx.db, pipCheckins, input.pipId);
      const [row] = await ctx.db.insert(pipCheckins).values({
        pipId: input.pipId,
        label: input.label,
        checkinDate: input.checkinDate ?? null,
        attendees: input.attendees ?? null,
        notes: input.notes ?? null,
        status: input.status ?? null,
        sortOrder,
      }).returning();
      return row;
    }),

  updateCheckin: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      label: z.string().min(1).max(200).optional(),
      checkinDate: z.string().nullable().optional(),
      attendees: z.string().max(300).nullable().optional(),
      notes: z.string().nullable().optional(),
      status: checkinStatus.nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipCheckins.findFirst({ where: eq(pipCheckins.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      const { id, ...rest } = input;
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) updates[k] = v;
      const [updated] = await ctx.db.update(pipCheckins)
        .set({ ...updates, updatedAt: new Date() }).where(eq(pipCheckins.id, id)).returning();
      return updated;
    }),

  removeCheckin: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipCheckins.findFirst({ where: eq(pipCheckins.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanEditChild(ctx.db, ctx.user,row.pipId);
      await ctx.db.delete(pipCheckins).where(eq(pipCheckins.id, input.id));
      return { ok: true };
    }),

  reorderCheckins: protectedProcedure
    .input(z.object({ pipId: z.string().uuid(), ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditChild(ctx.db, ctx.user,input.pipId);
      for (let i = 0; i < input.ids.length; i++) {
        await ctx.db.update(pipCheckins).set({ sortOrder: i }).where(eq(pipCheckins.id, input.ids[i]));
      }
      return { ok: true };
    }),

  // ───────────────────────────────────────────── SIGNATURES (§9) ──
  // Sign a row. The employee may only sign the 'employee' row; editors may
  // sign manager/hr/reviewer (or counter-sign on someone's behalf with a name).
  sign: protectedProcedure
    .input(z.object({ id: z.string().uuid(), signerName: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipSignatures.findFirst({ where: eq(pipSignatures.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const pip = await loadPipOrThrow(ctx.db, row.pipId);

      if (!canSignRole(ctx.user, pip, row.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `You cannot sign the ${row.role} line on this plan.` });
      }

      const [updated] = await ctx.db.update(pipSignatures)
        .set({ signerName: input.signerName ?? null, signedById: ctx.user.id, signedAt: new Date() })
        .where(eq(pipSignatures.id, input.id))
        .returning();
      await auditChange(ctx.db, ctx.user.id, pip.id, 'pip_signatures', 'update');
      trackActivity(ctx.db, ctx.user.id, 'pip_sign', row.role, { pipId: pip.id }).catch(() => {});
      return updated;
    }),

  unsign: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.pipSignatures.findFirst({ where: eq(pipSignatures.id, input.id) });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const pip = await loadPipOrThrow(ctx.db, row.pipId);
      const isEmployee = pip.employeeId === ctx.user.id && row.role === 'employee';
      if (!isEmployee) assertCanEdit(ctx.user,pip);
      const [updated] = await ctx.db.update(pipSignatures)
        .set({ signerName: null, signedById: null, signedAt: null })
        .where(eq(pipSignatures.id, input.id))
        .returning();
      return updated;
    }),
});
