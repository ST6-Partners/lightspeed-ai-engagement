// ============================================================
// ACCESS SERVICE — resolves what a viewer may reach (AIE 2026-08-03)
//
// One question, answered in one place: "for this viewer, in this area,
// which people (if any) are in scope?"
//
// Three rules, in order:
//   1. The grid decides the CEILING — none / down_org / all, per area.
//   2. Down-org means the viewer's WHOLE subtree (every level down),
//      not just direct reports.
//   3. Manager powers come from the ORG CHART, not the label. Anyone with
//      people reporting to them can act on their own subtree even if their
//      access level is 'user'. This is what lets an ELT member who also
//      manages a team, or an HR person who manages a team, keep working
//      without a second field on their record.
//
// What this service must never do: widen a field-level HR-only rule
// (DD-018, DD-019) or lower the min-group-size-3 anonymity floor (DD-027).
// Those are enforced by their own call sites and are deliberately not
// expressible here.
// ============================================================

import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { middleware } from '../trpc.js';
import type { DrizzleClient } from '../db.js';
import { users } from '../db/schema/core.js';
import {
  accessGrants, AREAS_WITHOUT_DOWN_ORG,
  type AccessArea, type AccessLevel, type Reach,
} from '../db/schema/accessControl.js';

export type { AccessArea, AccessLevel, Reach };

/** Resolved answer for one viewer in one area. */
export interface AreaAccess {
  /** false = not permitted here at all; hide the nav entry and refuse the route. */
  visible: boolean;
  reach: Reach;
  /**
   * People in scope. undefined when reach is 'all' (no filter needed) or when
   * the area is not person-scoped. Always includes the viewer when populated.
   */
  scopeUserIds?: string[];
}

// ── Grid read, cached briefly ────────────────────────────────
// 35 rows that change only when a sysadmin saves the grid. Re-reading them
// on every procedure call would be a query per request for data that is
// effectively static, so hold them for a few seconds.
let gridCache: { at: number; rows: Map<string, Reach> } | null = null;
const GRID_TTL_MS = 5_000;

export function invalidateGridCache(): void {
  gridCache = null;
}

async function loadGrid(db: DrizzleClient): Promise<Map<string, Reach>> {
  if (gridCache && Date.now() - gridCache.at < GRID_TTL_MS) return gridCache.rows;
  const rows = await db.select({
    level: accessGrants.level, area: accessGrants.area, reach: accessGrants.reach,
  }).from(accessGrants);
  const map = new Map<string, Reach>();
  for (const r of rows) map.set(`${r.level}:${r.area}`, r.reach as Reach);
  gridCache = { at: Date.now(), rows: map };
  return map;
}

/**
 * Every id at or below `rootId` in the org chart. Iterative breadth-first over
 * one in-memory copy of the manager graph — the chart is ~220 rows, so this is
 * cheaper than a recursive CTE per call, and the visited set makes it safe
 * against a cycle if bad data ever creates one.
 */
export async function subtreeUserIds(db: DrizzleClient, rootId: string): Promise<string[]> {
  const all = await db.select({ id: users.id, managerId: users.managerId }).from(users);
  const childrenOf = new Map<string, string[]>();
  for (const u of all) {
    if (!u.managerId) continue;
    const list = childrenOf.get(u.managerId) ?? [];
    list.push(u.id);
    childrenOf.set(u.managerId, list);
  }
  const out: string[] = [];
  const seen = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length) {
    const id = queue.shift() as string;
    out.push(id);
    for (const child of childrenOf.get(id) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      queue.push(child);
    }
  }
  return out;
}

/** True when anyone reports to this person. Drives manager powers (rule 3). */
export async function hasReports(db: DrizzleClient, userId: string): Promise<boolean> {
  const row = await db.query.users.findFirst({
    where: eq(users.managerId, userId),
    columns: { id: true },
  });
  return !!row;
}

async function levelOf(db: DrizzleClient, userId: string): Promise<AccessLevel | null> {
  const u = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { accessLevel: true, isActive: true },
  });
  if (!u || !u.isActive) return null;
  return u.accessLevel as AccessLevel;
}

/**
 * The main entry point. Fails closed: an unknown level, a missing grid row, or
 * an inactive user all resolve to no access rather than to a default grant.
 */
export async function resolveAreaAccess(
  db: DrizzleClient,
  userId: string,
  area: AccessArea,
): Promise<AreaAccess> {
  const level = await levelOf(db, userId);
  if (!level) return { visible: false, reach: 'none' };

  const grid = await loadGrid(db);
  let reach = grid.get(`${level}:${area}`) ?? 'none';

  // Down-org is meaningless where the area holds config rather than people.
  if (reach === 'down_org' && AREAS_WITHOUT_DOWN_ORG.includes(area)) reach = 'none';

  // Rule 3 — having reports grants down-org even when the grid says none.
  // Only on person-scoped areas; it must not open Documents or Assessments,
  // which are config and sensitive-data surfaces respectively.
  if (reach === 'none' && !AREAS_WITHOUT_DOWN_ORG.includes(area) && area !== 'assessments') {
    if (await hasReports(db, userId)) reach = 'down_org';
  }

  if (reach === 'none') return { visible: false, reach: 'none' };
  if (reach === 'all') return { visible: true, reach: 'all' };
  return { visible: true, reach: 'down_org', scopeUserIds: await subtreeUserIds(db, userId) };
}

/** Every area at once — what the sidebar needs in a single round trip. */
export async function resolveAllAreas(
  db: DrizzleClient,
  userId: string,
): Promise<Record<AccessArea, Reach>> {
  const areas: AccessArea[] = ['planning', 'engagement', 'insights', 'documents', 'assessments'];
  const out = {} as Record<AccessArea, Reach>;
  for (const a of areas) out[a] = (await resolveAreaAccess(db, userId, a)).reach;
  return out;
}

/** True when the viewer may act on the target — same subtree, or full reach. */
export async function canReachUser(
  db: DrizzleClient,
  viewerId: string,
  targetId: string,
  area: AccessArea,
): Promise<boolean> {
  const acc = await resolveAreaAccess(db, viewerId, area);
  if (!acc.visible) return false;
  if (acc.reach === 'all') return true;
  return (acc.scopeUserIds ?? []).includes(targetId);
}

// ── Middleware ───────────────────────────────────────────────

/** Gate a procedure on an area. Throws FORBIDDEN when the grid says no. */
export const requireArea = (area: AccessArea) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const acc = await resolveAreaAccess(ctx.db, ctx.user.id, area);
    if (!acc.visible) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this area.' });
    }
    return next({ ctx: { ...ctx, areaAccess: acc } });
  });

/** Gate on an exact level — used by the Access grid tab and Employees. */
export const requireLevel = (...allowed: AccessLevel[]) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
    const level = await levelOf(ctx.db, ctx.user.id);
    if (!level || !allowed.includes(level)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this.' });
    }
    return next();
  });

export const requireSysadminLevel = requireLevel('sysadmin');
/** Person-profile editing and other HR-owned writes. */
export const requireHrOrSysadmin = requireLevel('hr', 'sysadmin');

// ── Legacy field sync ────────────────────────────────────────
// role / leaderBadge / isHrAccess stay in the table for one release as a
// rollback path, and a dozen call sites still read them. Any write to
// accessLevel derives them so the two models can never disagree.
// Delete this, and the three columns, once those call sites are migrated.
export function legacyFieldsFor(level: AccessLevel): {
  role: string; leaderBadge: 'ELT' | 'SLT' | null; isHrAccess: boolean;
} {
  switch (level) {
    case 'sysadmin': return { role: 'sysadmin', leaderBadge: null, isHrAccess: false };
    case 'elt': return { role: 'admin', leaderBadge: 'ELT', isHrAccess: false };
    case 'slt': return { role: 'manager', leaderBadge: 'SLT', isHrAccess: false };
    case 'hr': return { role: 'admin', leaderBadge: null, isHrAccess: true };
    case 'admin': return { role: 'admin', leaderBadge: null, isHrAccess: false };
    case 'manager': return { role: 'manager', leaderBadge: null, isHrAccess: false };
    default: return { role: 'user', leaderBadge: null, isHrAccess: false };
  }
}
