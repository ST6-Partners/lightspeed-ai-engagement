// Engagement Analytics router — reads survey_periods + survey_metrics (historical
// aggregates, incl. seeded demo data) and merges the current live period computed
// from engagement_survey_responses. Returns one payload the results tabs slice:
// company summary + trend, drivers, questions, and department breakdown.
// Results-tab reads are aggregate. The personCard query below adds an
// admin-gated, current-period-only individual read for the Org person card.
import { router, protectedProcedure } from '../trpc.js';
import { surveyPeriods, surveyMetrics } from '../db/schema/engagementAnalytics.js';
import { engagementSurveyResponses } from '../db/schema/engagementSurvey.js';
import { users } from '../db/schema/core.js';
import { departments } from '../db/schema/departments.js';
import { z } from 'zod';
import { hasMinimumRole, type RoleTier } from '../services/permissions.js';

type DriverKey =
  | 'purpose' | 'autonomy' | 'utilization' | 'capacity' | 'manager_relationship'
  | 'manager_effectiveness' | 'coworkers' | 'leadership' | 'rewards_fairness' | 'commitment';

const DRIVER_KEYS: DriverKey[] = [
  'purpose', 'autonomy', 'utilization', 'capacity', 'manager_relationship',
  'manager_effectiveness', 'coworkers', 'leadership', 'rewards_fairness', 'commitment',
];

// question id -> driver (mirror of src/lib/engagementSurvey.ts). Kept here so the
// live-period rollup does not depend on the client bundle.
const Q_DRIVER: Record<string, DriverKey> = {
  work_1: 'commitment', work_2: 'autonomy', work_3: 'capacity', work_4: 'purpose',
  work_5: 'purpose', work_6: 'commitment', work_7: 'utilization', work_8: 'utilization',
  work_9: 'commitment', work_10: 'capacity', work_11: 'capacity', work_12: 'purpose',
  work_13: 'autonomy', work_14: 'capacity', work_15: 'purpose', work_16: 'purpose',
  work_17: 'purpose', work_18: 'utilization', work_19: 'utilization', work_20: 'commitment',
  work_21: 'capacity', work_22: 'commitment', work_23: 'capacity', work_24: 'purpose',
  work_25: 'capacity', work_26: 'autonomy', work_27: 'capacity', work_28: 'capacity',
  work_29: 'purpose', work_30: 'purpose', work_31: 'commitment', work_32: 'utilization',
  work_33: 'utilization', work_34: 'leadership', work_35: 'commitment', work_36: 'purpose',
  lead_1: 'leadership', lead_2: 'rewards_fairness', lead_3: 'leadership', lead_4: 'rewards_fairness',
  lead_5: 'leadership', lead_6: 'leadership', lead_7: 'rewards_fairness', lead_8: 'leadership',
  lead_9: 'leadership', mgr_1: 'manager_relationship', mgr_2: 'manager_relationship', mgr_3: 'manager_relationship',
  mgr_4: 'manager_relationship', mgr_5: 'manager_relationship', mgr_6: 'manager_relationship', mgr_7: 'manager_relationship',
  mgr_8: 'manager_relationship', cowork_1: 'coworkers', cowork_2: 'coworkers', cowork_3: 'coworkers',
  cowork_4: 'coworkers', cowork_5: 'coworkers', mgreff_1: 'manager_effectiveness', mgreff_2: 'manager_effectiveness',
  mgreff_3: 'manager_effectiveness', mgreff_4: 'manager_effectiveness', mgreff_5: 'manager_effectiveness', mgreff_6: 'manager_effectiveness',
  mgreff_7: 'manager_effectiveness', mgreff_8: 'manager_effectiveness',
};

const n = (v: unknown): number | null => (v == null ? null : Number(v));
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const scoreFromMean = (mean: number) => Math.round(((mean - 1) / 4) * 100);

interface Agg { mean: number; favorablePct: number; unfavorablePct: number; count: number; }
function aggregate(values: number[]): Agg | null {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const fav = values.filter((v) => v >= 4).length;
  const unfav = values.filter((v) => v <= 2).length;
  return {
    mean: r2(sum / values.length),
    favorablePct: r1((fav / values.length) * 100),
    unfavorablePct: r1((unfav / values.length) * 100),
    count: values.length,
  };
}

interface PeriodInfo { id: string; label: string; periodDate: string; eligibleCount: number; responseCount: number; source: string; isCurrent: boolean; scaleMax: number; }

export const engagementAnalyticsRouter = router({
  results: protectedProcedure
    .input(z.object({ periodId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const periodRows = await ctx.db.query.surveyPeriods.findMany();
    const metricRows = await ctx.db.query.surveyMetrics.findMany();

    // Department roster from the org chart (active users grouped by department).
    // Lets the Breakdown tab show real teams + headcount even before a period
    // has per-department survey scores.
    const rosterUsers = await ctx.db.query.users.findMany();
    const rosterDepts = await ctx.db.query.departments.findMany();
    const rosterDeptName = new Map(rosterDepts.map((d) => [d.id, d.name]));
    const rosterCounts = new Map<string, number>();
    for (const u of rosterUsers) {
      if (!u.isActive) continue;
      const dn = u.departmentId ? rosterDeptName.get(u.departmentId) : null;
      if (dn) rosterCounts.set(dn, (rosterCounts.get(dn) ?? 0) + 1);
    }
    const departmentRoster = [...rosterCounts.entries()]
      .map(([name, headcount]) => ({ name, headcount }))
      .sort((a, b) => b.headcount - a.headcount);

    // metric lookup: periodId -> scope -> dept('' for company) -> dimension -> key('' for overall)
    type M = { mean: number | null; favorablePct: number | null; unfavorablePct: number | null; responseCount: number; eligibleCount: number | null };
    const mkey = (periodId: string, scope: string, dept: string, dim: string, key: string) => `${periodId}|${scope}|${dept}|${dim}|${key}`;
    const metricMap = new Map<string, M>();
    for (const m of metricRows) {
      metricMap.set(mkey(m.periodId, m.scope, m.department ?? '', m.dimension, m.metricKey ?? ''), {
        mean: n(m.mean), favorablePct: n(m.favorablePct), unfavorablePct: n(m.unfavorablePct),
        responseCount: m.responseCount, eligibleCount: m.eligibleCount,
      });
    }

    // ── Live period from confidential responses ──────────────────────────────
    const responses = await ctx.db.query.engagementSurveyResponses.findMany();
    let livePeriod: PeriodInfo | null = null;
    // live aggregates: keyed the same way as metricMap under period id 'live'
    const liveAgg = new Map<string, Agg>();
    let liveDeptNames: string[] = [];
    if (responses.length > 0) {
      const allUsers = await ctx.db.query.users.findMany();
      const allDepts = await ctx.db.query.departments.findMany();
      const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]));
      const deptByUser = new Map(allUsers.map((u) => [u.id, u.departmentId ? deptNameById.get(u.departmentId) ?? null : null]));
      const activeEligible = allUsers.filter((u) => u.isActive).length;

      // collect answer values by (scope/dept, dimension, key)
      const buckets = new Map<string, number[]>();
      const push = (k: string, v: number) => { const a = buckets.get(k) ?? []; a.push(v); buckets.set(k, a); };
      const deptSet = new Set<string>();

      for (const resp of responses) {
        const answers = (resp.answers ?? {}) as Record<string, number>;
        // Prefer the department the respondent selected on the survey; fall back to their profile.
        const dept = (resp.department && resp.department.trim())
          || (resp.respondentId ? deptByUser.get(resp.respondentId) ?? null : null)
          || null;
        if (dept) deptSet.add(dept);
        const perDriver: Record<string, number[]> = {};
        const allVals: number[] = [];
        for (const [qid, val] of Object.entries(answers)) {
          if (typeof val !== 'number') continue;
          const dk = Q_DRIVER[qid];
          allVals.push(val);
          push(`company||question|${qid}`, val);
          if (dk) { push(`company||driver|${dk}`, val); (perDriver[dk] ??= []).push(val); }
          if (dept) {
            push(`department|${dept}|overall|`, val);
            if (dk) push(`department|${dept}|driver|${dk}`, val);
          }
        }
        for (const v of allVals) push('company||overall|', v);
      }
      for (const [k, vals] of buckets) {
        const a = aggregate(vals);
        if (a) liveAgg.set(k, a);
      }
      liveDeptNames = [...deptSet];

      // distinct respondents (confidential — count only)
      const respondents = new Set(responses.map((x) => x.respondentId).filter(Boolean));
      livePeriod = {
        id: 'live',
        label: `${new Date().getFullYear()} (in progress)`,
        periodDate: new Date().toISOString().slice(0, 10),
        eligibleCount: activeEligible,
        responseCount: respondents.size || responses.length,
        source: 'live',
        isCurrent: true,
        scaleMax: 5,
      };
    }

    // ── Ordered period series (historical asc + live last) ───────────────────
    const historical: PeriodInfo[] = periodRows
      .map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate, eligibleCount: p.eligibleCount, responseCount: p.responseCount, source: p.source, isCurrent: p.isCurrent, scaleMax: p.scaleMax }))
      .sort((a, b) => a.periodDate.localeCompare(b.periodDate));
    const periods: PeriodInfo[] = livePeriod ? [...historical, livePeriod] : historical;

    // favorability accessor that works for both historical + live
    const favOf = (period: PeriodInfo, scope: string, dept: string, dim: string, key: string): number | null => {
      if (period.id === 'live') return liveAgg.get(`${scope}|${dept}|${dim}|${key}`)?.favorablePct ?? null;
      return metricMap.get(mkey(period.id, scope, dept, dim, key))?.favorablePct ?? null;
    };
    const meanOf = (period: PeriodInfo, scope: string, dept: string, dim: string, key: string): number | null => {
      if (period.id === 'live') return liveAgg.get(`${scope}|${dept}|${dim}|${key}`)?.mean ?? null;
      return metricMap.get(mkey(period.id, scope, dept, dim, key))?.mean ?? null;
    };
    const unfavOf = (period: PeriodInfo, scope: string, dept: string, dim: string, key: string): number | null => {
      if (period.id === 'live') return liveAgg.get(`${scope}|${dept}|${dim}|${key}`)?.unfavorablePct ?? null;
      return metricMap.get(mkey(period.id, scope, dept, dim, key))?.unfavorablePct ?? null;
    };

    if (periods.length === 0) {
      return { hasData: false as const };
    }

    // `latest` is the selected period (defaults to the newest). `prev` is the
    // period immediately before it, for change-vs-prior deltas.
    const selIdx = input?.periodId ? periods.findIndex((p) => p.id === input.periodId) : -1;
    const latest = selIdx >= 0 ? periods[selIdx] : periods[periods.length - 1];
    const li = periods.indexOf(latest);
    const prev = li > 0 ? periods[li - 1] : null;

    // ── Company summary + trend ──────────────────────────────────────────────
    const compMean = meanOf(latest, 'company', '', 'overall', '');
    const compFav = favOf(latest, 'company', '', 'overall', '');
    const compUnfav = unfavOf(latest, 'company', '', 'overall', '');
    const prevFav = prev ? favOf(prev, 'company', '', 'overall', '') : null;
    const company = {
      label: latest.label,
      scaleMax: latest.scaleMax,
      favorablePct: compFav,
      unfavorablePct: compUnfav,
      mean: compMean,
      score: compMean != null ? scoreFromMean(compMean) : null,
      responseCount: latest.responseCount,
      eligibleCount: latest.eligibleCount,
      participationPct: latest.eligibleCount ? r1((latest.responseCount / latest.eligibleCount) * 100) : null,
      prevFavorablePct: prevFav,
      trend: periods.map((p) => ({ label: p.label, favorablePct: favOf(p, 'company', '', 'overall', ''), mean: meanOf(p, 'company', '', 'overall', '') })),
    };

    // ── Drivers (latest) with trend + delta ──────────────────────────────────
    const drivers = DRIVER_KEYS.map((key) => {
      const fav = favOf(latest, 'company', '', 'driver', key);
      const pf = prev ? favOf(prev, 'company', '', 'driver', key) : null;
      return {
        key,
        favorablePct: fav,
        unfavorablePct: unfavOf(latest, 'company', '', 'driver', key),
        mean: meanOf(latest, 'company', '', 'driver', key),
        prevFavorablePct: pf,
        delta: fav != null && pf != null ? r1(fav - pf) : null,
        trend: periods.map((p) => ({ label: p.label, favorablePct: favOf(p, 'company', '', 'driver', key) })),
      };
    }).filter((d) => d.favorablePct != null)
      .sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));

    // ── Questions (latest company) for celebrate/improve + drill ─────────────
    const latestQ = metricRows.filter((m) => m.periodId === latest.id && m.scope === 'company' && m.dimension === 'question');
    const liveQ = latest.id === 'live'
      ? [...liveAgg.entries()].filter(([k]) => k.startsWith('company||question|'))
      : [];
    let questions: Array<{ id: string; driver: DriverKey | null; favorablePct: number | null; unfavorablePct: number | null; mean: number | null; prevFavorablePct: number | null; delta: number | null }> = [];
    if (latest.id === 'live') {
      questions = liveQ.map(([k, a]) => {
        const id = k.split('|').pop() as string;
        return { id, driver: Q_DRIVER[id] ?? null, favorablePct: a.favorablePct, unfavorablePct: a.unfavorablePct, mean: a.mean, prevFavorablePct: null, delta: null };
      });
    } else {
      const prevQMap = new Map<string, number | null>();
      if (prev) {
        for (const m of metricRows.filter((mm) => mm.periodId === prev.id && mm.scope === 'company' && mm.dimension === 'question')) {
          prevQMap.set(m.metricKey ?? '', n(m.favorablePct));
        }
      }
      questions = latestQ.map((m) => {
        const id = m.metricKey ?? '';
        const fav = n(m.favorablePct);
        const pf = prevQMap.get(id) ?? null;
        return { id, driver: Q_DRIVER[id] ?? null, favorablePct: fav, unfavorablePct: n(m.unfavorablePct), mean: n(m.mean), prevFavorablePct: pf, delta: fav != null && pf != null ? r1(fav - pf) : null };
      });
    }

    // ── Departments (latest) with prev delta + by-driver ─────────────────────
    let deptNames: string[];
    if (latest.id === 'live') {
      deptNames = liveDeptNames;
    } else {
      deptNames = [...new Set(metricRows.filter((m) => m.periodId === latest.id && m.scope === 'department').map((m) => m.department ?? ''))].filter(Boolean);
    }
    const departmentsOut = deptNames.map((name) => {
      const fav = favOf(latest, 'department', name, 'overall', '');
      const pf = prev ? favOf(prev, 'department', name, 'overall', '') : null;
      let respCount = 0;
      let eligCount: number | null = null;
      if (latest.id === 'live') {
        respCount = liveAgg.get(`department|${name}|overall|`)?.count ?? 0;
      } else {
        const row = metricMap.get(mkey(latest.id, 'department', name, 'overall', ''));
        respCount = row?.responseCount ?? 0;
        eligCount = row?.eligibleCount ?? null;
      }
      return {
        name,
        favorablePct: fav,
        mean: meanOf(latest, 'department', name, 'overall', ''),
        responseCount: respCount,
        eligibleCount: eligCount,
        participationPct: eligCount ? r1((respCount / eligCount) * 100) : null,
        prevFavorablePct: pf,
        // Only compare like-to-like: imported 15Five departments hold a 0-100 engagement SCORE,
        // not favorability, so no delta vs a different-basis period and no vs-company (company is favorability).
        delta: (fav != null && pf != null && prev && prev.source === latest.source) ? r1(fav - pf) : null,
        vsCompany: (latest.source !== 'import' && fav != null && compFav != null) ? r1(fav - compFav) : null,
        byDriver: DRIVER_KEYS.map((key) => ({ key, favorablePct: favOf(latest, 'department', name, 'driver', key), mean: meanOf(latest, 'department', name, 'driver', key) }))
          .filter((d) => d.favorablePct != null),
      };
    }).sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));

    return {
      hasData: true as const,
      selectedId: latest.id,
      departmentRoster,
      periods,
      company,
      drivers,
      questions,
      departments: departmentsOut,
      departmentBasis: latest.source === 'import' ? 'score' as const : 'favorability' as const,
    };
  }),

  // ── Period list for the Org-screen engagement selector ───────────────────
  periods: protectedProcedure.query(async ({ ctx }) => {
    const periodRows = await ctx.db.query.surveyPeriods.findMany();
    const responses = await ctx.db.query.engagementSurveyResponses.findMany();
    const historical = periodRows
      .map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate }))
      .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
      .map((p) => ({ id: p.id, label: p.label }));
    const list = responses.length > 0
      ? [...historical, { id: 'live', label: `${new Date().getFullYear()} (in progress)` }]
      : historical;
    return { periods: list, latestId: list.length ? list[list.length - 1].id : null };
  }),

  // ── Person-card engagement summary (Org screen) ──────────────────────────
  // Department-context favorability for every viewer; an individual
  // (confidential) read for admin+ only, and only for the current/live period
  // (historical periods were imported as aggregates — no per-person answers).
  personCard: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), periodId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const SUPPRESS_MIN = 4;
      const viewerRole = (ctx.user?.role ?? 'user') as RoleTier;
      const canSeeIndividual = hasMinimumRole(viewerRole, 'admin');

      const periodRows = await ctx.db.query.surveyPeriods.findMany();
      const metricRows = await ctx.db.query.surveyMetrics.findMany();
      const responses = await ctx.db.query.engagementSurveyResponses.findMany();
      const allUsers = await ctx.db.query.users.findMany();
      const allDepts = await ctx.db.query.departments.findMany();

      const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]));
      const person = allUsers.find((u) => u.id === input.userId) ?? null;
      const personDept = person?.departmentId ? deptNameById.get(person.departmentId) ?? null : null;

      const mkey = (periodId: string, scope: string, dept: string, dim: string, key: string) => `${periodId}|${scope}|${dept}|${dim}|${key}`;
      const metricMap = new Map<string, { mean: number | null; favorablePct: number | null; responseCount: number; eligibleCount: number | null }>();
      for (const m of metricRows) {
        metricMap.set(mkey(m.periodId, m.scope, m.department ?? '', m.dimension, m.metricKey ?? ''), {
          mean: n(m.mean), favorablePct: n(m.favorablePct), responseCount: m.responseCount, eligibleCount: m.eligibleCount,
        });
      }

      const liveAgg = new Map<string, Agg>();
      let hasLive = false;
      {
        const deptByUser = new Map(allUsers.map((u) => [u.id, u.departmentId ? deptNameById.get(u.departmentId) ?? null : null]));
        const buckets = new Map<string, number[]>();
        const push = (k: string, v: number) => { const a = buckets.get(k) ?? []; a.push(v); buckets.set(k, a); };
        for (const resp of responses) {
          hasLive = true;
          const answers = (resp.answers ?? {}) as Record<string, number>;
          const dept = (resp.department && resp.department.trim())
            || (resp.respondentId ? deptByUser.get(resp.respondentId) ?? null : null) || null;
          for (const [qid, val] of Object.entries(answers)) {
            if (typeof val !== 'number') continue;
            const dk = Q_DRIVER[qid];
            push('company||overall|', val);
            if (dk) push(`company||driver|${dk}`, val);
            if (dept) {
              push(`department|${dept}|overall|`, val);
              if (dk) push(`department|${dept}|driver|${dk}`, val);
            }
          }
        }
        for (const [k, vals] of buckets) { const a = aggregate(vals); if (a) liveAgg.set(k, a); }
      }

      const historical = periodRows
        .map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate, source: p.source }))
        .sort((a, b) => a.periodDate.localeCompare(b.periodDate));
      const liveEntry = hasLive ? { id: 'live', label: `${new Date().getFullYear()} (in progress)`, periodDate: new Date().toISOString().slice(0, 10), source: 'live' } : null;
      const periods = liveEntry ? [...historical, liveEntry] : historical;
      if (periods.length === 0) {
        return { hasData: false as const, periods: [] as { id: string; label: string }[], selectedId: null as string | null, canSeeIndividual, department: null, individual: null };
      }

      const selIdx = input.periodId ? periods.findIndex((p) => p.id === input.periodId) : -1;
      const selected = selIdx >= 0 ? periods[selIdx] : periods[periods.length - 1];
      const si = periods.indexOf(selected);
      const prev = si > 0 ? periods[si - 1] : null;
      const isLive = selected.id === 'live';

      const favOf = (periodId: string, scope: string, dept: string, dim: string, key: string): number | null => {
        if (periodId === 'live') return liveAgg.get(`${scope}|${dept}|${dim}|${key}`)?.favorablePct ?? null;
        return metricMap.get(mkey(periodId, scope, dept, dim, key))?.favorablePct ?? null;
      };
      const meanOf = (periodId: string, scope: string, dept: string, dim: string, key: string): number | null => {
        if (periodId === 'live') return liveAgg.get(`${scope}|${dept}|${dim}|${key}`)?.mean ?? null;
        return metricMap.get(mkey(periodId, scope, dept, dim, key))?.mean ?? null;
      };

      const companyFav = favOf(selected.id, 'company', '', 'overall', '');
      const headcount = personDept ? allUsers.filter((u) => u.isActive && u.departmentId && deptNameById.get(u.departmentId) === personDept).length : 0;

      let department: unknown = null;
      if (personDept) {
        let respCount = 0;
        let eligible: number | null = null;
        if (isLive) {
          respCount = liveAgg.get(`department|${personDept}|overall|`)?.count ?? 0;
          eligible = headcount || null;
        } else {
          const row = metricMap.get(mkey(selected.id, 'department', personDept, 'overall', ''));
          respCount = row?.responseCount ?? 0;
          eligible = row?.eligibleCount ?? (headcount || null);
        }
        const deptFav = favOf(selected.id, 'department', personDept, 'overall', '');
        if (respCount > 0 && respCount < SUPPRESS_MIN) {
          department = { name: personDept, headcount, responseCount: respCount, suppressed: true };
        } else if (deptFav == null) {
          department = { name: personDept, headcount, responseCount: respCount, suppressed: false, noData: true };
        } else {
          const prevFav = prev ? favOf(prev.id, 'department', personDept, 'overall', '') : null;
          const drv = DRIVER_KEYS
            .map((key) => ({ key, favorablePct: favOf(selected.id, 'department', personDept, 'driver', key) }))
            .filter((d): d is { key: DriverKey; favorablePct: number } => d.favorablePct != null);
          const sortedDesc = [...drv].sort((a, b) => b.favorablePct - a.favorablePct);
          department = {
            name: personDept,
            headcount,
            responseCount: respCount,
            suppressed: false,
            favorablePct: deptFav,
            mean: meanOf(selected.id, 'department', personDept, 'overall', ''),
            delta: (deptFav != null && prevFav != null && prev && prev.source === selected.source) ? r1(deptFav - prevFav) : null,
            vsCompany: (selected.source !== 'import' && deptFav != null && companyFav != null) ? r1(deptFav - companyFav) : null,
            participationPct: eligible ? r1((respCount / eligible) * 100) : null,
            strongest: sortedDesc.slice(0, 2),
            needsAttention: sortedDesc.slice(-2).reverse(),
          };
        }
      }

      let individual: unknown = null;
      if (canSeeIndividual) {
        if (!isLive) {
          individual = { available: false, reason: 'historical' };
        } else {
          const mine = responses
            .filter((r) => r.respondentId === input.userId && r.status === 'complete')
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          const latest = mine[0] ?? null;
          if (!latest) {
            individual = { available: false, reason: 'no-responses' };
          } else {
            const answers = (latest.answers ?? {}) as Record<string, number>;
            const all: number[] = [];
            const byDriver: Record<string, number[]> = {};
            for (const [qid, val] of Object.entries(answers)) {
              if (typeof val !== 'number') continue;
              all.push(val);
              const dk = Q_DRIVER[qid];
              if (dk) (byDriver[dk] ??= []).push(val);
            }
            const overall = aggregate(all);
            const drv = DRIVER_KEYS
              .map((key) => { const a = aggregate(byDriver[key] ?? []); return a ? { key, favorablePct: a.favorablePct } : null; })
              .filter((d): d is { key: DriverKey; favorablePct: number } => d != null);
            const sortedDesc = [...drv].sort((a, b) => b.favorablePct - a.favorablePct);
            individual = {
              available: true,
              score: overall ? scoreFromMean(overall.mean) : null,
              favorablePct: overall ? overall.favorablePct : null,
              enps: latest.enpsScore ?? null,
              strongest: sortedDesc.slice(0, 2),
              needsAttention: sortedDesc.slice(-2).reverse(),
            };
          }
        }
      }

      return {
        hasData: true as const,
        periods: periods.map((p) => ({ id: p.id, label: p.label })),
        selectedId: selected.id,
        canSeeIndividual,
        department,
        individual,
      };
    }),
});
