// ============================================================
// METRICS ROUTER — manager insights dashboard.
// Manager-gated (requireManager). Scoped to the viewer's DIRECT REPORTS
// (users.managerId === ctx.user.id, active). Aggregates the current week's
// weekly-plan priorities + latest check-ins into: recap stats, concerns,
// per-person priority completion, and wins. Read-only.
// ============================================================

import { z } from 'zod';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { requireManager } from '../services/permissions.js';
import { users } from '../db/schema/core.js';
import { weeklyCheckins, type WeeklyPriority } from '../db/schema/weeklyPlan.js';
import { checkinResponses, type CheckinAnswer } from '../db/schema/checkins.js';

const managerProcedure = protectedProcedure.use(requireManager);

// Monday (ISO) of the week containing `d`, as YYYY-MM-DD. (Matches weeklyPlan.)
function mondayOf(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

const short = (t: string, n = 60) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

function normPriorities(arr: unknown): WeeklyPriority[] {
  return (Array.isArray(arr) ? arr : [])
    .map((p) =>
      typeof p === 'string'
        ? { text: p, done: false, archived: false }
        : { text: p.text, done: p.done ?? false, archived: p.archived ?? false },
    )
    .filter((p) => !p.archived);
}

export const metricsRouter = router({
  // Weekly insights for the signed-in manager's direct reports.
  weekly: managerProcedure
    .input(z.object({ weekStart: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const weekStart = input?.weekStart ?? mondayOf();

      // Direct reports (active).
      const team = await ctx.db.query.users.findMany({
        where: and(eq(users.managerId, ctx.user.id), eq(users.isActive, true)),
      });
      const teamIds = team.map((t) => t.id);
      const nameOf = (id: string) => {
        const u = team.find((t) => t.id === id);
        return u ? (u.name ?? u.email) : 'Unknown';
      };

      if (teamIds.length === 0) {
        return {
          weekStart,
          teamSize: 0,
          recap: { checkedIn: 0, teamSize: 0, avgMood: null, openConcerns: 0, completionPct: null, donePrio: 0, totalPrio: 0, notCheckedIn: [] as string[] },
          concerns: [] as { userId: string; name: string; reasons: string[] }[],
          priorities: [] as { userId: string; name: string; hasPlan: boolean; total: number; done: number }[],
          wins: [] as { userId: string; name: string; wins: string }[],
        };
      }

      // This week's weekly plans.
      const plans = await ctx.db.query.weeklyCheckins.findMany({
        where: and(inArray(weeklyCheckins.userId, teamIds), eq(weeklyCheckins.weekStart, weekStart)),
      });
      const planByUser = new Map(plans.map((p) => [p.userId, p]));

      // Latest check-in per team member (cadence-agnostic).
      const responses = await ctx.db.query.checkinResponses.findMany({
        where: inArray(checkinResponses.respondentId, teamIds),
        orderBy: [desc(checkinResponses.submittedAt)],
      });
      const latestCheckin = new Map<string, (typeof responses)[number]>();
      for (const r of responses) {
        if (r.respondentId && !latestCheckin.has(r.respondentId)) latestCheckin.set(r.respondentId, r);
      }

      // Per-person priority completion.
      const priorities = team.map((t) => {
        const plan = planByUser.get(t.id);
        const prios = plan ? normPriorities(plan.priorities) : [];
        return {
          userId: t.id,
          name: nameOf(t.id),
          hasPlan: !!plan && plan.status === 'saved',
          total: prios.length,
          done: prios.filter((p) => p.done).length,
        };
      });

      // Concerns - warning signs from this week's plan + latest check-in.
      const concerns: { userId: string; name: string; reasons: string[] }[] = [];
      for (const t of team) {
        const reasons: string[] = [];
        const plan = planByUser.get(t.id);
        if (plan) {
          if (plan.mood != null && plan.mood <= 2) reasons.push(`Low mood (${plan.mood}/5)`);
          if (plan.blockers && plan.blockers.trim()) reasons.push(`Blocker noted: “${short(plan.blockers.trim())}”`);
          if (plan.pulseAnswer === 'Disagree') reasons.push('Weekly pulse: Disagree');
        }
        const ci = latestCheckin.get(t.id);
        if (ci) {
          const answers = (Array.isArray(ci.answers) ? ci.answers : []) as CheckinAnswer[];
          for (const a of answers) {
            if (a.type === 'scale5' && a.value != null && a.value <= 2) reasons.push(`Low score: “${short(a.text)}” (${a.value}/5)`);
            if (a.type === 'enps' && a.value != null && a.value <= 6) reasons.push(`eNPS detractor (${a.value}/10)`);
          }
          if (ci.sentiment != null && ci.sentiment <= 2) reasons.push(`Low sentiment (${ci.sentiment}/5)`);
          if (ci.workload != null && ci.workload >= 5) reasons.push(`High workload (${ci.workload}/5)`);
        }
        if (reasons.length) concerns.push({ userId: t.id, name: nameOf(t.id), reasons });
      }

      // Wins logged this week.
      const wins = team
        .map((t) => {
          const plan = planByUser.get(t.id);
          return plan?.wins?.trim() ? { userId: t.id, name: nameOf(t.id), wins: plan.wins.trim() } : null;
        })
        .filter((x): x is { userId: string; name: string; wins: string } => x !== null);

      // Recap roll-up.
      const savedPlans = plans.filter((p) => p.status === 'saved');
      const checkedInIds = new Set(savedPlans.map((p) => p.userId));
      const notCheckedIn = team.filter((t) => !checkedInIds.has(t.id)).map((t) => nameOf(t.id));
      const moods = savedPlans.map((p) => p.mood).filter((m): m is number => m != null);
      const avgMood = moods.length ? Number((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)) : null;
      const totalPrio = priorities.reduce((a, p) => a + p.total, 0);
      const donePrio = priorities.reduce((a, p) => a + p.done, 0);
      const completionPct = totalPrio ? Math.round((donePrio / totalPrio) * 100) : null;

      return {
        weekStart,
        teamSize: team.length,
        recap: {
          checkedIn: checkedInIds.size,
          teamSize: team.length,
          avgMood,
          openConcerns: concerns.length,
          completionPct,
          donePrio,
          totalPrio,
          notCheckedIn,
        },
        concerns,
        priorities,
        wins,
      };
    }),
});
