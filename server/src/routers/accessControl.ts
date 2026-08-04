// ============================================================
// ACCESS ROUTER — the Reach grid (AIE 2026-08-03)
//
// Two audiences:
//   - every signed-in client calls `myAreas` once on load, so the sidebar
//     knows which groups to draw;
//   - sysadmins read and write the grid itself.
//
// Writing the grid is sysadmin-only and deliberately narrow: you may change
// a reach value, nothing else. Levels and areas are fixed in code, not data,
// so a bad write cannot invent a level that no procedure checks for.
// ============================================================

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import {
  accessGrants, ACCESS_LEVELS, ACCESS_AREAS, REACH_VALUES, AREAS_WITHOUT_DOWN_ORG,
  type AccessArea, type AccessLevel, type Reach,
} from '../db/schema/accessControl.js';
import {
  resolveAllAreas, requireSysadminLevel, invalidateGridCache,
  realLevelOf, effectiveLevelOf,
} from '../services/access.js';

const levelEnum = z.enum(ACCESS_LEVELS);
const areaEnum = z.enum(ACCESS_AREAS);
const reachEnum = z.enum(REACH_VALUES);

/** Reject down_org on areas that hold config rather than people. */
function assertReachAllowed(area: AccessArea, reach: Reach) {
  if (reach === 'down_org' && AREAS_WITHOUT_DOWN_ORG.includes(area)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Down org does not apply to Documents — that area holds settings, not people.',
    });
  }
}

export const accessControlRouter = router({
  // What the current viewer can reach, per area. Drives the sidebar.
  myAreas: protectedProcedure.query(async ({ ctx }) => {
    return resolveAllAreas(ctx.db, ctx.user.id, ctx.req.session?.previewLevel);
  }),

  // ── "View as" preview ──────────────────────────────────────
  // Lets a sysadmin experience the app as another level WITHOUT changing their
  // own record. Nothing is written to the users table, so there is no state to
  // recover from — closing the session or pressing Stop returns things to
  // normal. This exists so access can be tested without the obvious trap:
  // demote yourself to User and you can no longer reach the screen that would
  // promote you back.
  previewState: protectedProcedure.query(async ({ ctx }) => {
    const real = await realLevelOf(ctx.db, ctx.user.id);
    const raw = ctx.req.session?.previewLevel ?? null;
    const previewing = real === 'sysadmin' && !!raw;
    return {
      realLevel: real,
      previewLevel: previewing ? raw : null,
      canPreview: real === 'sysadmin',
      effectiveLevel: await effectiveLevelOf(ctx.db, ctx.user.id, raw),
    };
  }),

  startPreview: protectedProcedure
    .use(requireSysadminLevel)
    .input(z.object({ level: levelEnum }))
    .mutation(async ({ ctx, input }) => {
      ctx.req.session.previewLevel = input.level === 'sysadmin' ? undefined : input.level;
      return { success: true, previewLevel: ctx.req.session.previewLevel ?? null };
    }),

  // The way back. Checks the REAL stored level, never the previewed one —
  // otherwise previewing as User would disable the button that undoes it.
  stopPreview: protectedProcedure.mutation(async ({ ctx }) => {
    const real = await realLevelOf(ctx.db, ctx.user.id);
    if (real !== 'sysadmin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only a sysadmin can use preview mode.' });
    }
    ctx.req.session.previewLevel = undefined;
    return { success: true };
  }),

  // The whole grid, as a level -> area -> reach map. Sysadmin only.
  grid: protectedProcedure
    .use(requireSysadminLevel)
    .query(async ({ ctx }) => {
      const rows = await ctx.db.select({
        level: accessGrants.level, area: accessGrants.area,
        reach: accessGrants.reach, updatedAt: accessGrants.updatedAt,
      }).from(accessGrants);

      const byLevel = {} as Record<AccessLevel, Record<AccessArea, Reach>>;
      for (const level of ACCESS_LEVELS) {
        byLevel[level] = {} as Record<AccessArea, Reach>;
        for (const area of ACCESS_AREAS) byLevel[level][area] = 'none';
      }
      let lastUpdated: Date | null = null;
      for (const r of rows) {
        const level = r.level as AccessLevel;
        const area = r.area as AccessArea;
        if (!byLevel[level] || !ACCESS_AREAS.includes(area)) continue;
        byLevel[level][area] = r.reach as Reach;
        if (!lastUpdated || r.updatedAt > lastUpdated) lastUpdated = r.updatedAt;
      }
      return { grid: byLevel, lastUpdated };
    }),

  // Save changed cells. Sent as a sparse list so an unchanged grid is a no-op.
  setGrid: protectedProcedure
    .use(requireSysadminLevel)
    .input(z.object({
      cells: z.array(z.object({
        level: levelEnum, area: areaEnum, reach: reachEnum,
      })).min(1).max(ACCESS_LEVELS.length * ACCESS_AREAS.length),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const c of input.cells) assertReachAllowed(c.area, c.reach);

      // A sysadmin who removes their own access to the grid could not undo it.
      const selfLockout = input.cells.some(
        (c) => c.level === 'sysadmin' && c.area === 'documents' && c.reach === 'none',
      );
      if (selfLockout) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Sysadmin needs Documents access — removing it would lock you out of these settings.',
        });
      }

      for (const c of input.cells) {
        await ctx.db.insert(accessGrants)
          .values({ level: c.level, area: c.area, reach: c.reach, updatedBy: ctx.user.id })
          .onConflictDoUpdate({
            target: [accessGrants.level, accessGrants.area],
            set: { reach: c.reach, updatedBy: ctx.user.id, updatedAt: new Date() },
          });
      }
      invalidateGridCache();
      return { success: true, saved: input.cells.length };
    }),

  // Put every cell back to the values agreed at design time (migration 0099).
  resetGrid: protectedProcedure
    .use(requireSysadminLevel)
    .mutation(async ({ ctx }) => {
      const D: Record<AccessLevel, Record<AccessArea, Reach>> = {
        sysadmin: { planning: 'all', engagement: 'all', insights: 'all', documents: 'all', assessments: 'all' },
        elt:      { planning: 'all', engagement: 'all', insights: 'all', documents: 'none', assessments: 'all' },
        slt:      { planning: 'down_org', engagement: 'down_org', insights: 'down_org', documents: 'none', assessments: 'none' },
        hr:       { planning: 'all', engagement: 'all', insights: 'all', documents: 'all', assessments: 'all' },
        admin:    { planning: 'all', engagement: 'all', insights: 'all', documents: 'all', assessments: 'none' },
        manager:  { planning: 'down_org', engagement: 'down_org', insights: 'down_org', documents: 'none', assessments: 'none' },
        user:     { planning: 'down_org', engagement: 'down_org', insights: 'none', documents: 'none', assessments: 'none' },
      };
      for (const level of ACCESS_LEVELS) {
        for (const area of ACCESS_AREAS) {
          await ctx.db.update(accessGrants)
            .set({ reach: D[level][area], updatedBy: ctx.user.id, updatedAt: new Date() })
            .where(and(eq(accessGrants.level, level), eq(accessGrants.area, area)));
        }
      }
      invalidateGridCache();
      return { success: true };
    }),
});
