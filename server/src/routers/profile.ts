// ============================================================
// PROFILE ROUTER — the signed-in user's own profile (AIE 2026-07-23).
// Backs the Profile page reached from the avatar (bottom-left).
//
// `get` returns the full profile the app reads for survey attribution, with
// org fields resolved to names. `updateSelf` lets a person edit ONLY their
// personal fields + start date. Org-structure fields (team, department, manager,
// location, business unit, job title, ELT badge) and access/role are managed by
// admins via the employee upload and are NOT writable here — that guarantee is
// what keeps engagement analytics trustworthy.
// ============================================================
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { departments } from '../db/schema/departments.js';

export const profileRouter = router({
  // Full self-profile with resolved names. Read-only fields are flagged so the
  // UI can lock them without hard-coding the list.
  get: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
    if (!me) return null;

    const jt = me.jobTitleId
      ? await ctx.db.query.jobTitles.findFirst({ where: eq(jobTitles.id, me.jobTitleId) }) : null;
    const dept = me.departmentId
      ? await ctx.db.query.departments.findFirst({ where: eq(departments.id, me.departmentId) }) : null;
    const mgr = me.managerId
      ? await ctx.db.query.users.findFirst({ where: eq(users.id, me.managerId) }) : null;

    // ELT leader = nearest ancestor up the manager chain with an ELT badge.
    let eltLeader: string | null = null;
    let cursor: string | null = me.managerId ?? null;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const anc = await ctx.db.query.users.findFirst({ where: eq(users.id, cursor) });
      if (!anc) break;
      if (anc.leaderBadge === 'ELT') { eltLeader = anc.name ?? null; break; }
      cursor = anc.managerId ?? null;
    }

    return {
      // editable by the user
      id: me.id,
      name: me.name,
      email: me.email,
      avatarUrl: me.avatarUrl,
      timezone: me.timezone,
      hireYear: me.hireYear,
      hireMonth: me.hireMonth,
      hireDay: me.hireDay,
      // managed by admin (read-only in the UI)
      jobTitle: jt?.title ?? null,
      department: dept?.name ?? null,
      team: me.team,
      location: me.location,
      businessUnit: me.businessUnit,
      manager: mgr?.name ?? null,
      eltLeader,
      leaderBadge: me.leaderBadge,
      role: me.role,
      isHrAccess: me.isHrAccess,
    };
  }),

  // Update ONLY the user's own editable fields. Any org/access field is ignored
  // even if sent — org data comes from the admin upload.
  updateSelf: protectedProcedure
    .input(z.object({
      name: z.string().max(255).optional(),
      avatarUrl: z.string().max(2000).nullable().optional(),
      timezone: z.string().max(100).nullable().optional(),
      // Start date: YEAR required when setting a start date; month/day optional.
      hireYear: z.number().int().min(1900).max(2100).nullable().optional(),
      hireMonth: z.number().int().min(1).max(12).nullable().optional(),
      hireDay: z.number().int().min(1).max(31).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name.trim() || null;
      if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl || null;
      if (input.timezone !== undefined) updates.timezone = input.timezone || null;
      if (input.hireYear !== undefined) updates.hireYear = input.hireYear;
      if (input.hireMonth !== undefined) updates.hireMonth = input.hireMonth;
      if (input.hireDay !== undefined) updates.hireDay = input.hireDay;

      // Guard: month/day can't be set without a year (year is the mandatory part).
      const y = input.hireYear !== undefined ? input.hireYear : undefined;
      if ((input.hireMonth || input.hireDay) && y === null) {
        updates.hireMonth = null; updates.hireDay = null;
      }
      if (Object.keys(updates).length === 0) return { success: true };
      await ctx.db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
});
