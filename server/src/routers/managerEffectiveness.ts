// ============================================================
// MANAGER EFFECTIVENESS ROUTER — insights roll-up (read-only).
// Manager-gated (requireManager). Combines two existing sources:
//   • Manager reviews (upward surveys) — managerSurveyResponses.ratings
//     (1..5 per question), attributed to the manager being rated.
//   • Check-ins — checkinResponses.answers where category === 'manager_support'
//     (scale5), attributed to each respondent's manager (users.managerId).
// Scope: admins and HR-access users see all managers; a plain manager sees
// only their own effectiveness. No writes, no schema changes.
// ============================================================

import { and, eq, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { requireManager, hasMinimumRole, type RoleTier } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { managerSurveyResponses, managerSurveyQuestions } from '../db/schema/managerSurvey.js';
import { checkinResponses, type CheckinAnswer } from '../db/schema/checkins.js';

const managerProcedure = protectedProcedure.use(requireManager);

const round1 = (n: number) => Number(n.toFixed(1));
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export const managerEffectivenessRouter = router({
  // Effectiveness roll-up for every manager in the viewer's scope.
  overview: managerProcedure.query(async ({ ctx }) => {
    // Viewer row — need isHrAccess (not on the lightweight ctx.user).
    const viewer = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
    const broad = !!viewer && (hasMinimumRole(viewer.role as RoleTier, 'admin') || !!viewer.isHrAccess);

    // Active directory + a name lookup.
    const allUsers = await ctx.db.query.users.findMany({ where: eq(users.isActive, true) });
    const nameOf = (id: string | null) => {
      if (!id) return 'Unknown';
      const u = allUsers.find((x) => x.id === id);
      return u ? (u.name ?? u.email) : 'Unknown';
    };
    const managerOfRespondent = new Map<string, string | null>();
    for (const u of allUsers) managerOfRespondent.set(u.id, u.managerId ?? null);

    // All upward reviews + question text lookup.
    const reviews = await ctx.db.query.managerSurveyResponses.findMany({
      orderBy: [desc(managerSurveyResponses.submittedAt)],
    });
    const questions = await ctx.db.query.managerSurveyQuestions.findMany();
    const qText = new Map(questions.map((q) => [q.id, q.text]));

    // All check-ins (for manager_support roll-up).
    const checkins = await ctx.db.query.checkinResponses.findMany();

    // Who counts as a "manager": anyone with reports, or anyone who has been
    // reviewed. Union of both so neither data source is silently dropped.
    const managerIds = new Set<string>();
    for (const u of allUsers) if (u.managerId) managerIds.add(u.managerId);
    for (const r of reviews) if (r.managerId) managerIds.add(r.managerId);

    // Scope down for non-broad viewers to just themselves.
    let scopeIds: string[];
    if (broad) {
      scopeIds = [...managerIds];
    } else {
      scopeIds = [ctx.user.id];
      managerIds.add(ctx.user.id);
    }

    // Manager-support check-in values attributed to each manager.
    const supportByManager = new Map<string, number[]>();
    for (const ci of checkins) {
      const mgr = ci.respondentId ? managerOfRespondent.get(ci.respondentId) ?? null : null;
      if (!mgr) continue;
      const answers = (Array.isArray(ci.answers) ? ci.answers : []) as CheckinAnswer[];
      for (const a of answers) {
        if (a.category === 'manager_support' && a.type === 'scale5' && typeof a.value === 'number') {
          const arr = supportByManager.get(mgr) ?? [];
          arr.push(a.value);
          supportByManager.set(mgr, arr);
        }
      }
    }

    const managers = scopeIds.map((mid) => {
      const mine = reviews.filter((r) => r.managerId === mid);
      const allValues: number[] = [];
      const perQ = new Map<string, number[]>();
      for (const r of mine) {
        const ratings = (r.ratings ?? {}) as Record<string, number>;
        for (const [qid, v] of Object.entries(ratings)) {
          if (typeof v === 'number') {
            allValues.push(v);
            const arr = perQ.get(qid) ?? [];
            arr.push(v);
            perQ.set(qid, arr);
          }
        }
      }
      const perQuestion = [...perQ.entries()]
        .map(([qid, vals]) => ({ questionId: qid, text: qText.get(qid) ?? 'Retired question', avg: avg(vals)!, count: vals.length }))
        .sort((a, b) => b.avg - a.avg);
      const support = supportByManager.get(mid) ?? [];
      return {
        managerId: mid,
        name: nameOf(mid),
        reviewCount: mine.length,
        avgScore: avg(allValues),
        ratingCount: allValues.length,
        managerSupportAvg: avg(support),
        managerSupportCount: support.length,
        perQuestion,
      };
    }).sort((a, b) => {
      if (a.avgScore == null && b.avgScore == null) return a.name.localeCompare(b.name);
      if (a.avgScore == null) return 1;
      if (b.avgScore == null) return -1;
      return b.avgScore - a.avgScore || a.name.localeCompare(b.name);
    });

    // Summary across everything in scope.
    const scopeSet = new Set(scopeIds);
    const scopeRatingValues: number[] = [];
    let totalReviews = 0;
    for (const r of reviews) {
      if (!r.managerId || !scopeSet.has(r.managerId)) continue;
      totalReviews += 1;
      const ratings = (r.ratings ?? {}) as Record<string, number>;
      for (const v of Object.values(ratings)) if (typeof v === 'number') scopeRatingValues.push(v);
    }
    const scopeSupport: number[] = [];
    for (const mid of scopeIds) for (const v of supportByManager.get(mid) ?? []) scopeSupport.push(v);

    return {
      scope: broad ? ('all' as const) : ('self' as const),
      summary: {
        managerCount: managers.length,
        overallAvgScore: avg(scopeRatingValues),
        totalReviews,
        avgManagerSupport: avg(scopeSupport),
        managerSupportResponses: scopeSupport.length,
      },
      managers,
    };
  }),
});
