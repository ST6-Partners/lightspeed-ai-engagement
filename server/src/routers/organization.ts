// Organization router — active people + engagement read derived from weekly
// check-ins (recency + mood). "Signal, not alarm" — DD-002 Planning / DD-003.
import { desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc.js';
import { users } from '../db/schema/core.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { weeklyCheckins } from '../db/schema/weeklyPlan.js';

type Status = 'thrive' | 'watch' | 'risk' | 'none';
type Trend = 'up' | 'down' | 'flat';

function statusFromMood(mood: number | null | undefined): Status {
  if (mood == null) return 'none';
  if (mood >= 4) return 'thrive';
  if (mood === 3) return 'watch';
  return 'risk';
}
function mondayOf(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

export const organizationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const people = await ctx.db.query.users.findMany();
    const active = people.filter((u) => u.isActive);
    // Title comes from the managed Job Titles lookup (the same source the
    // Employees section edits via jobTitleId), so the Organization tab stays
    // consistent with Core Data. Falls back to the free-text title, then role.
    const titleRows = await ctx.db.query.jobTitles.findMany();
    const titleById = new Map(titleRows.map((t) => [t.id, t.title]));
    const checkins = await ctx.db.query.weeklyCheckins.findMany({
      orderBy: [desc(weeklyCheckins.weekStart)],
    });

    const byUser = new Map<string, typeof checkins>();
    for (const c of checkins) {
      const arr = byUser.get(c.userId) ?? [];
      arr.push(c);
      byUser.set(c.userId, arr);
    }

    const thisWeek = mondayOf();
    const members = active.map((u) => {
      const cs = byUser.get(u.id) ?? []; // already newest-first
      const moods = cs.map((c) => c.mood).filter((m): m is number => m != null);
      const status = statusFromMood(cs[0]?.mood ?? null);
      const trend: Trend =
        moods.length < 2 ? 'flat' : moods[0] > moods[1] ? 'up' : moods[0] < moods[1] ? 'down' : 'flat';
      const spark = moods.slice(0, 6).reverse();
      return {
        id: u.id,
        name: u.name ?? u.email,
        role: (u.jobTitleId ? titleById.get(u.jobTitleId) : null) ?? u.title ?? u.role,
        status,
        trend,
        spark,
        lastCheckIn: cs[0]?.weekStart ?? null,
        checkinCount: cs.length,
      };
    });

    const counts = { thrive: 0, watch: 0, risk: 0, none: 0 };
    for (const m of members) counts[m.status] += 1;
    const withReads = members.length - counts.none;
    const checkedInThisWeek = checkins.filter((c) => c.weekStart === thisWeek).length;

    return {
      members,
      stats: {
        total: members.length,
        thrivingPct: withReads ? Math.round((counts.thrive / withReads) * 100) : 0,
        watch: counts.watch,
        atRisk: counts.risk,
        checkinRate: members.length ? Math.round((checkedInThisWeek / members.length) * 100) : 0,
      },
    };
  }),
});
