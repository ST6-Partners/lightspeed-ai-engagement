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
import { and, eq, gte, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { registerJob, type JobResult } from './job-runner.js';
import { notifications } from '../db/schema/notifications.js';
import { users } from '../db/schema/core.js';
import { nineBoxRatings, priorities } from '../db/schema/orgScreen.js';
import { reviews } from '../db/schema/reviews.js';
import { cadenceSettings } from '../db/schema/cadence.js';
import { periodStart, statusFor, type Cadence } from '../routers/cadence.js';

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
    db.query.priorities.findMany({ where: inArray(priorities.userId, ids), columns: { userId: true, createdAt: true } }),
    db.query.reviews.findMany({ where: inArray(reviews.employeeId, ids), columns: { employeeId: true, evaluatedAt: true } }),
  ]);
  const nb = latestByUser(nbRows.map((r: any) => ({ id: r.userId, d: r.ratedAt })));
  const pr = latestByUser(prRows.map((r: any) => ({ id: r.userId, d: r.createdAt })));
  const rv = latestByUser(rvRows.map((r: any) => ({ id: r.employeeId, d: r.evaluatedAt })));

  const now = new Date();
  let affected = 0;

  const notifyOnce = async (ownerId: string, targetId: string, activity: Activity, message: string) => {
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

  for (const u of activeUsers) {
    if (statusFor(nb.get(u.id) ?? null, cad.ninebox, now) === 'overdue' && u.managerId && activeSet.has(u.managerId)) {
      await notifyOnce(u.managerId, u.id, 'ninebox', `9 Box rating for ${nameById.get(u.id)} is overdue.`);
    }
    if (statusFor(rv.get(u.id) ?? null, cad.reviews, now) === 'overdue' && u.managerId && activeSet.has(u.managerId)) {
      await notifyOnce(u.managerId, u.id, 'reviews', `Performance review for ${nameById.get(u.id)} is overdue.`);
    }
    if (statusFor(pr.get(u.id) ?? null, cad.priorities, now) === 'overdue') {
      await notifyOnce(u.id, u.id, 'priorities', 'Your priorities are overdue — please update them.');
    }
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
