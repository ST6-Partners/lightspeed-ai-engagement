// Engagement Analytics router — reads survey_periods + survey_metrics (historical
// aggregates, incl. seeded demo data) and merges the current live period computed
// from engagement_survey_responses. Returns one payload the results tabs slice:
// company summary + trend, drivers, questions, and department breakdown.
// All reads are aggregate — no individual response is ever returned.
import { router, protectedProcedure } from '../trpc.js';
import { surveyPeriods, surveyMetrics } from '../db/schema/engagementAnalytics.js';
import { engagementSurveyResponses } from '../db/schema/engagementSurvey.js';
import { users } from '../db/schema/core.js';
import { departments } from '../db/schema/departments.js';

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

interface PeriodInfo { id: string; label: string; periodDate: string; eligibleCount: number; responseCount: number; source: string; isCurrent: boolean; }

export const engagementAnalyticsRouter = router({
  results: protectedProcedure.query(async ({ ctx }) => {
    const periodRows = await ctx.db.query.surveyPeriods.findMany();
    const metricRows = await ctx.db.query.surveyMetrics.findMany();

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
        const dept = resp.respondentId ? deptByUser.get(resp.respondentId) ?? null : null;
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
        label: 'Current',
        periodDate: new Date().toISOString().slice(0, 10),
        eligibleCount: activeEligible,
        responseCount: respondents.size || responses.length,
        source: 'live',
        isCurrent: true,
      };
    }

    // ── Ordered period series (historical asc + live last) ───────────────────
    const historical: PeriodInfo[] = periodRows
      .map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate, eligibleCount: p.eligibleCount, responseCount: p.responseCount, source: p.source, isCurrent: p.isCurrent }))
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

    const latest = periods[periods.length - 1];
    const prev = periods.length > 1 ? periods[periods.length - 2] : null;

    // ── Company summary + trend ──────────────────────────────────────────────
    const compMean = meanOf(latest, 'company', '', 'overall', '');
    const compFav = favOf(latest, 'company', '', 'overall', '');
    const compUnfav = unfavOf(latest, 'company', '', 'overall', '');
    const prevFav = prev ? favOf(prev, 'company', '', 'overall', '') : null;
    const company = {
      label: latest.label,
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
        delta: fav != null && pf != null ? r1(fav - pf) : null,
        vsCompany: fav != null && compFav != null ? r1(fav - compFav) : null,
        byDriver: DRIVER_KEYS.map((key) => ({ key, favorablePct: favOf(latest, 'department', name, 'driver', key), mean: meanOf(latest, 'department', name, 'driver', key) }))
          .filter((d) => d.favorablePct != null),
      };
    }).sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));

    return {
      hasData: true as const,
      periods,
      company,
      drivers,
      questions,
      departments: departmentsOut,
    };
  }),
});
