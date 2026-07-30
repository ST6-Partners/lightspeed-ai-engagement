// ============================================================
// CADENCE OVERDUE NOTIFY — scheduled job that creates in-app
// notifications when a person's 9 Box / Priorities / Review is overdue
// for the current cadence period. AI Engagement, 2026-07-27.
//   9 Box  overdue -> notify the person's MANAGER
//   Review overdue -> notify the person's MANAGER
//   Priorities overdue -> notify the PERSON (self)
//
// 2026-07-30 (PM): `cadence_new_period` is now ONE SUMMARY per owner per activity
// per period, not one row per report. A manager with 17 directs was getting 34
// notifications the moment a period turned over, which made the notification
// centre unreadable and a period modal impossible. `cadence_overdue` stays
// per-person, because there you specifically need to know WHO is late.
//
// Dedup: overdue is keyed owner+target+activity+period; the new-period summary is
// keyed owner+activity+period (null referenceId). The previous code deduped
// ACROSS both types on owner+target+activity, which meant a 'due' ping early in a
// period permanently suppressed the later 'overdue' ping for that same person —
// overdue notices were being silently swallowed. Now they are independent.
// Runs at boot (~30s) and daily via a setInterval in server.ts; also
// manually triggerable from the System Jobs admin panel.
// ============================================================
import { and, eq, gte, inArray, isNull } from 'drizzle-orm';
import { db } from '../db.js';
import { registerJob, type JobResult } from './job-runner.js';
import { notifications } from '../db/schema/notifications.js';
import { users } from '../db/schema/core.js';
import { nineBoxRatings, priorities } from '../db/schema/orgScreen.js';
import { reviews } from '../db/schema/reviews.js';
import { cadenceSettings } from '../db/schema/cadence.js';
import { periodStart, periodKeyLabel, statusFor, type Cadence } from '../routers/cadence.js';

type Activity = 'ninebox' | 'priorities' | 'reviews';

function latestByUser(rows: Array<{ id: string | null; d: unknown }>): Map<string, Date> {
  const m = new Map<string, Date>();
  for (const r of rows) {
    if (!r.id || r.d == null) continue;
    const dt = r.d instanceof Date ? r.d : new Date(String(r.d));
    if (isNaN(dt.getTime())) continue;
    const prev = m.get(r.id);
    if (!prev || dt > prev) m.set(r.id, dt);
  }
  return m;
}

async function handler(): Promise<JobResult> {
  const settings = await db.query.cadenceSettings.findFirst();
  const cad: Record<Activity, Cadence> = {
    ninebox: (settings?.nineboxCadence ?? 'semiannual') as Cadence,
    priorities: (settings?.prioritiesCadence ?? 'annual') as Cadence,
    reviews: (settings?.reviewsCadence ?? 'weekly') as Cadence,
  };

  const activeUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
    columns: { id: true, name: true, email: true, managerId: true },
  });
  const ids = activeUsers.map((u) => u.id);
  if (!ids.length) return { affected: 0, details: 'No active users.' };
  const activeSet = new Set(ids);
  const nameById = new Map(activeUsers.map((u) => [u.id, u.name ?? u.email ?? 'Someone']));

  const [nbRows, prRows, rvRows] = await Promise.all([
    db.query.nineBoxRatings.findMany({ where: inArray(nineBoxRatings.userId, ids), columns: { userId: true, ratedAt: true } }),
    db.query.priorities.findMany({ where: and(inArray(priorities.userId, ids), isNull(priorities.weekStart)), columns: { userId: true, createdAt: true } }),
    db.query.reviews.findMany({ where: inArray(reviews.employeeId, ids), columns: { employeeId: true, evaluatedAt: true } }),
  ]);
  const nb = latestByUser(nbRows.map((r: any) => ({ id: r.userId, d: r.ratedAt })));
  const pr = latestByUser(prRows.map((r: any) => ({ id: r.userId, d: r.createdAt })));
  const rv = latestByUser(rvRows.map((r: any) => ({ id: r.employeeId, d: r.evaluatedAt })));

  const now = new Date();
  let affected = 0;

  // Per-person overdue notice — one per owner+target+activity+period.
  const notifyOverdueOnce = async (ownerId: string, targetId: string, activity: Activity, message: string) => {
    const start = periodStart(cad[activity], now);
    const existing = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, ownerId),
        eq(notifications.type, 'cadence_overdue'),
        eq(notifications.referenceType, activity),
        eq(notifications.referenceId, targetId),
        gte(notifications.createdAt, start),
      ),
    });
    if (existing) return;
    await db.insert(notifications).values({ userId: ownerId, type: 'cadence_overdue', referenceType: activity, referenceId: targetId, message });
    affected += 1;
  };

  // Aggregated new-period notice — one per owner+activity+period, null referenceId.
  // The count lives in the message so the period modal can render the row verbatim
  // and stay agnostic about how many underlying rows produced it.
  const notifyNewPeriodOnce = async (ownerId: string, activity: Activity, message: string) => {
    const start = periodStart(cad[activity], now);
    const existing = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, ownerId),
        eq(notifications.type, 'cadence_new_period'),
        eq(notifications.referenceType, activity),
        isNull(notifications.referenceId),
        gte(notifications.createdAt, start),
      ),
    });
    if (existing) return;
    await db.insert(notifications).values({ userId: ownerId, type: 'cadence_new_period', referenceType: activity, referenceId: null, message });
    affected += 1;
  };

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const lbl = {
    ninebox: periodKeyLabel(cad.ninebox, now).label,
    reviews: periodKeyLabel(cad.reviews, now).label,
    priorities: periodKeyLabel(cad.priorities, now).label,
  };
  // Pass 1 — per-person overdue notices, and tally what is newly due per owner.
  const dueTally = new Map<string, Map<Activity, number>>();
  const tally = (ownerId: string, activity: Activity) => {
    const m = dueTally.get(ownerId) ?? new Map<Activity, number>();
    m.set(activity, (m.get(activity) ?? 0) + 1);
    dueTally.set(ownerId, m);
  };

  for (const u of activeUsers) {
    const name = nameById.get(u.id);
    const mgrOk = !!u.managerId && activeSet.has(u.managerId);
    // 9 Box -> manager
    const nbSt = statusFor(nb.get(u.id) ?? null, cad.ninebox, now);
    if ((nbSt === 'due' || nbSt === 'overdue') && mgrOk) {
      if (nbSt === 'overdue') await notifyOverdueOnce(u.managerId!, u.id, 'ninebox', `9 Box rating for ${name} is overdue (${lbl.ninebox}).`);
      tally(u.managerId!, 'ninebox');
    }
    // Reviews -> manager
    const rvSt = statusFor(rv.get(u.id) ?? null, cad.reviews, now);
    if ((rvSt === 'due' || rvSt === 'overdue') && mgrOk) {
      if (rvSt === 'overdue') await notifyOverdueOnce(u.managerId!, u.id, 'reviews', `Performance review for ${name} is overdue (${lbl.reviews}).`);
      tally(u.managerId!, 'reviews');
    }
    // Priorities -> self
    const prSt = statusFor(pr.get(u.id) ?? null, cad.priorities, now);
    if (prSt === 'overdue') await notifyOverdueOnce(u.id, u.id, 'priorities', `Your priorities are overdue (${lbl.priorities}) — please update them.`);
    if (prSt === 'due' || prSt === 'overdue') tally(u.id, 'priorities');
  }

  // Pass 2 — one aggregated new-period notice per owner per activity.
  for (const [ownerId, byActivity] of dueTally) {
    const nbN = byActivity.get('ninebox') ?? 0;
    const rvN = byActivity.get('reviews') ?? 0;
    const prN = byActivity.get('priorities') ?? 0;
    if (nbN) await notifyNewPeriodOnce(ownerId, 'ninebox', `New period ${lbl.ninebox} — ${plural(nbN, '9 Box rating', '9 Box ratings')} now due for your team.`);
    if (rvN) await notifyNewPeriodOnce(ownerId, 'reviews', `New period ${lbl.reviews} — ${plural(rvN, 'performance review', 'performance reviews')} now due for your team.`);
    if (prN) await notifyNewPeriodOnce(ownerId, 'priorities', `New period ${lbl.priorities} — set your priorities.`);
  }

  return { affected, details: `Created ${affected} cadence notification(s).` };
}

export function registerCadenceNotifyJob(): void {
  registerJob({
    name: 'cadence-overdue-notify',
    label: 'Cadence Overdue Notify',
    description: 'Notify owners of overdue 9 Box / Priorities / Reviews for the current cadence period.',
    color: '#dc2626',
    jobType: 'manual',
    handler,
  });
}
