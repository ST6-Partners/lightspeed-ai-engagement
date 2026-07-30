// ============================================================
// CADENCE OVERDUE NOTIFY — scheduled job that creates in-app
// notifications when a person's 9 Box / Priorities / Review is overdue
// for the current cadence period. AI Engagement, 2026-07-27.
//   9 Box  overdue -> notify the person's MANAGER
//   Review overdue -> notify the person's MANAGER
//   Priorities overdue -> notify the PERSON (self)
// De-duplicated per owner+target+activity+period so it never spams.
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

  const notifyOnce = async (ownerId: string, targetId: string, activity: Activity, type: 'cadence_overdue' | 'cadence_new_period', message: string) => {
    const start = periodStart(cad[activity], now);
    // Dedup across BOTH cadence types for the same owner+target+activity within
    // the current period, so a person gets at most one cadence ping per period.
    const existing = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, ownerId),
        inArray(notifications.type, ['cadence_overdue', 'cadence_new_period']),
        eq(notifications.referenceType, activity),
        eq(notifications.referenceId, targetId),
        gte(notifications.createdAt, start),
      ),
    });
    if (existing) return;
    await db.insert(notifications).values({ userId: ownerId, type, referenceType: activity, referenceId: targetId, message });
    affected += 1;
  };

  const lbl = {
    ninebox: periodKeyLabel(cad.ninebox, now).label,
    reviews: periodKeyLabel(cad.reviews, now).label,
    priorities: periodKeyLabel(cad.priorities, now).label,
  };
  for (const u of activeUsers) {
    const name = nameById.get(u.id);
    // 9 Box -> manager
    const nbSt = statusFor(nb.get(u.id) ?? null, cad.ninebox, now);
    if ((nbSt === 'due' || nbSt === 'overdue') && u.managerId && activeSet.has(u.managerId)) {
      if (nbSt === 'overdue') await notifyOnce(u.managerId, u.id, 'ninebox', 'cadence_overdue', `9 Box rating for ${name} is overdue (${lbl.ninebox}).`);
      else await notifyOnce(u.managerId, u.id, 'ninebox', 'cadence_new_period', `New period ${lbl.ninebox} — a 9 Box rating for ${name} is now due.`);
    }
    // Reviews -> manager
    const rvSt = statusFor(rv.get(u.id) ?? null, cad.reviews, now);
    if ((rvSt === 'due' || rvSt === 'overdue') && u.managerId && activeSet.has(u.managerId)) {
      if (rvSt === 'overdue') await notifyOnce(u.managerId, u.id, 'reviews', 'cadence_overdue', `Performance review for ${name} is overdue (${lbl.reviews}).`);
      else await notifyOnce(u.managerId, u.id, 'reviews', 'cadence_new_period', `New period ${lbl.reviews} — a review for ${name} is now due.`);
    }
    // Priorities -> self
    const prSt = statusFor(pr.get(u.id) ?? null, cad.priorities, now);
    if (prSt === 'overdue') await notifyOnce(u.id, u.id, 'priorities', 'cadence_overdue', `Your priorities are overdue (${lbl.priorities}) — please update them.`);
    else if (prSt === 'due') await notifyOnce(u.id, u.id, 'priorities', 'cadence_new_period', `New period ${lbl.priorities} — set your priorities.`);
  }
  return { affected, details: `Created ${affected} overdue notification(s).` };
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
