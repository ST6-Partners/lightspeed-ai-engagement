// ============================================================
// CADENCE ROUTER — required completion cadence + per-person status.
// AI Engagement, 2026-07-27.
//   getSettings   — current cadence per activity (any signed-in user)
//   updateSettings— admin-only; adjust each activity's cadence
//   status        — for a set of users, compute done / due / overdue per
//                   activity vs. the current calendar period.
// Completion sources: 9 Box = nine_box_ratings.ratedAt; Priorities =
// priorities.createdAt; Reviews = reviews.evaluatedAt (by employeeId).
// "done"    = an entry exists in the current period.
// "due"     = none this period, but one existed in the immediately prior
//             period (they now owe a fresh one this period).
// "overdue" = none this period AND none last period (or never).
// ============================================================
import { z } from 'zod';
import { inArray, eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { requireAdmin } from '../services/permissions.js';
import { cadenceSettings } from '../db/schema/cadence.js';
import { nineBoxRatings, priorities } from '../db/schema/orgScreen.js';
import { reviews } from '../db/schema/reviews.js';
import { auditChange } from '../services/audit.js';

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type CadenceStatus = 'done' | 'due' | 'overdue';
const cadenceEnum = z.enum(['weekly', 'monthly', 'quarterly', 'semiannual', 'annual']);

// Start (UTC midnight) of the calendar period containing `d` for a cadence.
export function periodStart(c: Cadence, d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-11
  if (c === 'weekly') {
    // Monday-start calendar week (UTC).
    const s0 = new Date(Date.UTC(y, m, d.getUTCDate()));
    const diff = (s0.getUTCDay() + 6) % 7; // 0=Mon..6=Sun -> days since Monday
    s0.setUTCDate(s0.getUTCDate() - diff);
    return s0;
  }
  if (c === 'monthly') return new Date(Date.UTC(y, m, 1));
  if (c === 'quarterly') return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
  if (c === 'semiannual') return new Date(Date.UTC(y, m < 6 ? 0 : 6, 1));
  return new Date(Date.UTC(y, 0, 1)); // annual
}
// Start of the period immediately before the one containing `d`.
export function prevPeriodStart(c: Cadence, d: Date): Date {
  const cur = periodStart(c, d);
  const before = new Date(cur.getTime() - 86400000); // one day before the current period
  return periodStart(c, before);
}
export function statusFor(last: Date | null, c: Cadence, now: Date): CadenceStatus {
  if (!last) return 'overdue';
  if (last >= periodStart(c, now)) return 'done';
  if (last >= prevPeriodStart(c, now)) return 'due';
  return 'overdue';
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Stable key + human label for the calendar period containing `d`.
export function periodKeyLabel(c: Cadence, d: Date): { key: string; label: string } {
  const s = periodStart(c, d);
  const y = s.getUTCFullYear();
  const m = s.getUTCMonth();
  if (c === 'weekly') {
    const key = `W-${y}-${String(m + 1).padStart(2, '0')}-${String(s.getUTCDate()).padStart(2, '0')}`;
    return { key, label: `Week of ${MON[m]} ${s.getUTCDate()}, ${y}` };
  }
  if (c === 'monthly') return { key: `${y}-M${String(m + 1).padStart(2, '0')}`, label: `${MON[m]} ${y}` };
  if (c === 'quarterly') { const q = Math.floor(m / 3) + 1; return { key: `${y}-Q${q}`, label: `Q${q} ${y}` }; }
  if (c === 'semiannual') { const h = m < 6 ? 1 : 2; return { key: `${y}-H${h}`, label: `H${h} ${y}` }; }
  return { key: `${y}`, label: `${y}` };
}

async function ensureSettings(db: any) {
  const existing = await db.query.cadenceSettings.findFirst();
  if (existing) return existing;
  const [row] = await db.insert(cadenceSettings).values({}).returning();
  return row;
}

// Reduce rows [{u, d}] to a Map of userId -> latest Date.
function latestByUser(rows: Array<{ u: string | null; d: unknown }>): Map<string, Date> {
  const m = new Map<string, Date>();
  for (const r of rows) {
    if (!r.u || r.d == null) continue;
    const dt = r.d instanceof Date ? r.d : new Date(String(r.d));
    if (isNaN(dt.getTime())) continue;
    const prev = m.get(r.u);
    if (!prev || dt > prev) m.set(r.u, dt);
  }
  return m;
}

export const cadenceRouter = router({
  getSettings: protectedProcedure.query(({ ctx }) => ensureSettings(ctx.db)),

  updateSettings: protectedProcedure
    .use(requireAdmin)
    .input(z.object({
      ninebox: cadenceEnum.optional(),
      priorities: cadenceEnum.optional(),
      reviews: cadenceEnum.optional(),
      autoAdvance: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cur = await ensureSettings(ctx.db);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.ninebox) patch.nineboxCadence = input.ninebox;
      if (input.priorities) patch.prioritiesCadence = input.priorities;
      if (input.reviews) patch.reviewsCadence = input.reviews;
      if (input.autoAdvance !== undefined) {
        patch.autoAdvance = input.autoAdvance;
        const now = new Date();
        if (input.autoAdvance === false) {
          // Freeze each activity's active period at the current calendar period.
          patch.nineboxActiveKey = periodKeyLabel((input.ninebox ?? cur.nineboxCadence) as Cadence, now).key;
          patch.prioritiesActiveKey = periodKeyLabel((input.priorities ?? cur.prioritiesCadence) as Cadence, now).key;
          patch.reviewsActiveKey = periodKeyLabel((input.reviews ?? cur.reviewsCadence) as Cadence, now).key;
        } else {
          // Auto mode ignores the frozen keys.
          patch.nineboxActiveKey = null;
          patch.prioritiesActiveKey = null;
          patch.reviewsActiveKey = null;
        }
      }
      const [row] = await ctx.db.update(cadenceSettings).set(patch)
        .where(eq(cadenceSettings.id, cur.id)).returning();
      await auditChange(ctx.db, ctx.user.id, cur.id, 'cadence_settings', 'update');
      return row;
    }),

  status: protectedProcedure
    .input(z.object({ userIds: z.array(z.string().uuid()).max(2000) }))
    .query(async ({ ctx, input }) => {
      const s = await ensureSettings(ctx.db);
      const cadences = {
        ninebox: s.nineboxCadence as Cadence,
        priorities: s.prioritiesCadence as Cadence,
        reviews: s.reviewsCadence as Cadence,
      };
      const ids = input.userIds;
      if (!ids.length) return { cadence: cadences, people: [] as Array<{ userId: string; ninebox: CadenceStatus; priorities: CadenceStatus; reviews: CadenceStatus }> };

      const [nbRows, prRows, rvRows] = await Promise.all([
        ctx.db.query.nineBoxRatings.findMany({ where: inArray(nineBoxRatings.userId, ids), columns: { userId: true, ratedAt: true } }),
        ctx.db.query.priorities.findMany({ where: inArray(priorities.userId, ids), columns: { userId: true, createdAt: true } }),
        ctx.db.query.reviews.findMany({ where: inArray(reviews.employeeId, ids), columns: { employeeId: true, evaluatedAt: true } }),
      ]);
      const nb = latestByUser(nbRows.map((r: any) => ({ u: r.userId, d: r.ratedAt })));
      const pr = latestByUser(prRows.map((r: any) => ({ u: r.userId, d: r.createdAt })));
      const rv = latestByUser(rvRows.map((r: any) => ({ u: r.employeeId, d: r.evaluatedAt })));

      const now = new Date();
      const people = ids.map((id) => ({
        userId: id,
        ninebox: statusFor(nb.get(id) ?? null, cadences.ninebox, now),
        priorities: statusFor(pr.get(id) ?? null, cadences.priorities, now),
        reviews: statusFor(rv.get(id) ?? null, cadences.reviews, now),
      }));
      return { cadence: cadences, people };
    }),

  // Active period per activity (respects auto_advance). In auto mode the active
  // period is the calendar-current one; in manual mode it is the frozen key
  // until an admin advances it. `behind` = a newer calendar period is available.
  currentPeriods: protectedProcedure.query(async ({ ctx }) => {
    const s = await ensureSettings(ctx.db);
    const now = new Date();
    const auto = s.autoAdvance ?? true;
    const mk = (c: Cadence, storedKey: string | null) => {
      const cal = periodKeyLabel(c, now);
      if (auto || !storedKey) return { cadence: c, activeKey: cal.key, activeLabel: cal.label, calendarKey: cal.key, calendarLabel: cal.label, behind: false };
      return { cadence: c, activeKey: storedKey, activeLabel: storedKey === cal.key ? cal.label : storedKey, calendarKey: cal.key, calendarLabel: cal.label, behind: storedKey !== cal.key };
    };
    return {
      autoAdvance: auto,
      ninebox: mk(s.nineboxCadence as Cadence, s.nineboxActiveKey),
      priorities: mk(s.prioritiesCadence as Cadence, s.prioritiesActiveKey),
      reviews: mk(s.reviewsCadence as Cadence, s.reviewsActiveKey),
    };
  }),

  // Manual-mode: advance one activity's active period to the current calendar period.
  advancePeriod: protectedProcedure
    .use(requireAdmin)
    .input(z.object({ activity: z.enum(['ninebox', 'priorities', 'reviews']) }))
    .mutation(async ({ ctx, input }) => {
      const s = await ensureSettings(ctx.db);
      const now = new Date();
      const cadOf: Record<string, Cadence> = {
        ninebox: s.nineboxCadence as Cadence,
        priorities: s.prioritiesCadence as Cadence,
        reviews: s.reviewsCadence as Cadence,
      };
      const key = periodKeyLabel(cadOf[input.activity], now).key;
      const col: Record<string, string> = { ninebox: 'nineboxActiveKey', priorities: 'prioritiesActiveKey', reviews: 'reviewsActiveKey' };
      const [row] = await ctx.db.update(cadenceSettings)
        .set({ [col[input.activity]]: key, updatedAt: new Date() })
        .where(eq(cadenceSettings.id, s.id)).returning();
      await auditChange(ctx.db, ctx.user.id, s.id, 'cadence_settings', 'update');
      return row;
    }),
});
