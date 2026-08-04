// Engagement Analytics router — reads survey_periods + survey_metrics (historical
// aggregates, incl. seeded demo data) and merges the current live period computed
// from engagement_survey_responses. Returns one payload the results tabs slice:
// company summary + trend, drivers, questions, and department breakdown.
// Results-tab reads are aggregate. The personCard query below adds an
// admin-gated, current-period-only individual read for the Org person card.
import { router, protectedProcedure } from '../trpc.js';
import { surveyPeriods, surveyMetrics } from '../db/schema/engagementAnalytics.js';
import { engagementSurveyResponses } from '../db/schema/engagementSurvey.js';
import { engagementImportRows } from '../db/schema/engagementImportRows.js';
import { users } from '../db/schema/core.js';
import { departments } from '../db/schema/departments.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { nineBoxRatings } from '../db/schema/orgScreen.js';
import { eq } from 'drizzle-orm';
import {
  detectColumns, detectShape, normalizeRows, statementKey, deriveMetrics, mapDimension,
  type NormalizedRow,
} from '../services/fifteenFiveImport.js';
import { parseUploadedTable } from '../services/tableUpload.js';
import { z } from 'zod';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { hasMinimumRole, type RoleTier } from '../services/permissions.js';
import { TRPCError } from '@trpc/server';
import { effectiveLevelOf, resolveAreaAccess } from '../services/access.js';
import { canDo } from '../services/capabilities.js';

type DriverKey =
  | 'purpose' | 'autonomy' | 'utilization' | 'capacity' | 'manager_relationship'
  | 'manager_effectiveness' | 'coworkers' | 'leadership' | 'rewards_fairness' | 'commitment'
  | 'dei' | 'wellbeing' | 'remote_work' | 'retention' | (string & {});

const BASE_DRIVER_KEYS: DriverKey[] = [
  'purpose', 'autonomy', 'utilization', 'capacity', 'manager_relationship',
  'manager_effectiveness', 'coworkers', 'leadership', 'rewards_fairness', 'commitment',
];

// question id -> driver (mirror of src/lib/engagementSurvey.ts). Kept here so the
// live-period rollup does not depend on the client bundle.
const Q_DRIVER_FALLBACK: Record<string, DriverKey> = {
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


// Performance tier from a 9-box value. See the note in the router.
export function performanceTierOf(box: number | null | undefined): 'high' | 'mid' | 'bottom' | null {
  if (box == null || box < 1 || box > 9) return null;
  const col = box % 3;              // 0 = right column, 2 = middle, 1 = left
  return col === 0 ? 'high' : col === 2 ? 'mid' : 'bottom';
}

export const ENGAGEMENT_TIERS = [
  { key: 'extremely', label: 'Extremely engaged', min: 90 },
  { key: 'highly', label: 'Highly engaged', min: 80 },
  { key: 'moderately', label: 'Moderately engaged', min: 65 },
  { key: 'somewhat', label: 'Somewhat engaged', min: 50 },
  { key: 'disengaged', label: 'Disengaged', min: 0 },
] as const;

/** Mean answer -> percent of the available scale -> tier key. */
export function engagementTierOf(answers: Record<string, number>, scaleMax: number): string | null {
  const vals = Object.values(answers ?? {}).filter((v) => typeof v === 'number' && v > 0);
  if (vals.length === 0) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const span = Math.max(1, scaleMax - 1);
  // Rounded before comparison: (4.6-1)/4 evaluates to 0.8999999999999999 in
  // floating point, which would drop an exactly-90% respondent a whole tier.
  const pctOfScale = Math.round((((mean - 1) / span) * 100) * 1e6) / 1e6;
  return (ENGAGEMENT_TIERS.find((t) => pctOfScale >= t.min) ?? ENGAGEMENT_TIERS[ENGAGEMENT_TIERS.length - 1]).key;
}


// ── Viewer scope, shared by every read in this file ──────────
// Ten separate procedures each ran `engagementSurveyResponses.findMany()` with
// no scope. Two were fixed by hand and the other eight still returned every
// response in the company, so a manager saw the whole organisation's answers.
// Both concerns now live in one place: may you see results at all, and whose.
async function assertCanViewResults(ctx: any) {
  const level = await effectiveLevelOf(ctx.db, ctx.user.id, ctx.req.session?.previewLevel);
  if (!level || !canDo(level, 'survey.viewResults')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to survey results.' });
  }
}

/**
 * Every response the viewer is allowed to count. Full reach returns all of
 * them; anything narrower keeps only responses whose manager path runs through
 * someone in the viewer's subtree — which is how a manager sees their own
 * branch, all the way down, and nothing beside it.
 */
type ResponseRow = typeof engagementSurveyResponses.$inferSelect;

async function readResponses(ctx: any): Promise<ResponseRow[]> {
  const rows: ResponseRow[] = await ctx.db.query.engagementSurveyResponses.findMany();
  const acc = await resolveAreaAccess(ctx.db, ctx.user.id, 'insights', ctx.req.session?.previewLevel);
  if (acc.reach === 'all') return rows;
  const scope = new Set(acc.scopeUserIds ?? [ctx.user.id]);
  return rows.filter((r) => (r.managerPath ?? []).some((id: string) => scope.has(id)));
}


/**
 * Historical results live in `survey_metrics` as PRE-COMPUTED aggregates, one
 * row per (period, scope, department, dimension). Scoping raw responses did
 * nothing for them — this is the table the results page actually reads for any
 * past period, which is why a manager still saw the whole company.
 *
 * They cannot be re-scoped by subtree, because the numbers were rolled up at
 * import time. So for a narrower viewer we drop every company-scope row and
 * keep only departments that exist inside their own branch. What is left is
 * genuinely theirs; anything else would be the organisation's figures wearing
 * a manager's label.
 */
type MetricRow = typeof surveyMetrics.$inferSelect;

async function readMetrics(ctx: any): Promise<MetricRow[]> {
  const rows: MetricRow[] = await ctx.db.query.surveyMetrics.findMany();
  const acc = await resolveAreaAccess(ctx.db, ctx.user.id, 'insights', ctx.req.session?.previewLevel);
  if (acc.reach === 'all') return rows;

  const scope = new Set(acc.scopeUserIds ?? [ctx.user.id]);
  const [people, depts] = await Promise.all([
    ctx.db.query.users.findMany(),
    ctx.db.query.departments.findMany(),
  ]);
  const deptNameById = new Map(depts.map((d: any) => [d.id, d.name]));
  const myDepts = new Set(
    people
      .filter((u: any) => scope.has(u.id) && u.departmentId)
      .map((u: any) => deptNameById.get(u.departmentId))
      .filter(Boolean),
  );
  return rows.filter((m) => m.scope === 'department' && !!m.department && myDepts.has(m.department));
}

export const engagementAnalyticsRouter = router({
  // ── Filter options for the analytics filter bar (from in-app responses + roster) ──
  filterOptions: protectedProcedure.query(async ({ ctx }) => {
    await assertCanViewResults(ctx);
    const rows = await readResponses(ctx);
    const uniq = (xs: (string | null | undefined)[]) =>
      [...new Set(xs.map((x) => (x ?? '').trim()).filter(Boolean))].sort();
    // Hierarchy roll-up options = everyone who appears as an ancestor in any
    // response's manager path, resolved to a name.
    const ancestorIds = new Set<string>();
    for (const r of rows) for (const id of (r.managerPath ?? [])) ancestorIds.add(id);
    // Roster (active employees) ALSO seeds the option lists, so the analytics
    // filters populate straight from the employee directory even before any
    // survey is taken — matches the Organization People filters (AIE 2026-07-27).
    const roster = await ctx.db.query.users.findMany();
    const deptRows = await ctx.db.query.departments.findMany();
    const deptName = new Map(deptRows.map((d) => [d.id, d.name]));
    const titleRows = await ctx.db.select().from(jobTitles);
    const titleName = new Map(titleRows.map((t) => [t.id, t.title]));
    const active = roster.filter((u) => u.isActive);
    const leaders = ancestorIds.size ? roster : [];
    const hierarchies = leaders
      .filter((u) => ancestorIds.has(u.id))
      .map((u) => ({ id: u.id, name: u.name ?? '(unnamed)' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      teams: uniq([...rows.map((r) => r.team), ...active.map((u) => u.team)]),
      locations: uniq([...rows.map((r) => r.location), ...active.map((u) => u.location)]),
      businessUnits: uniq([...rows.map((r) => r.businessUnit), ...active.map((u) => u.businessUnit)]),
      departments: uniq([...rows.map((r) => r.department), ...active.map((u) => (u.departmentId ? deptName.get(u.departmentId) : null))]),
      managers: uniq(rows.map((r) => r.managerName)),
      eltLeaders: uniq([...rows.map((r) => r.eltLeader), ...active.map((u) => u.eltLeader)]),
      hierarchies,
      tenureBands: ['<1', '1-2', '2-5', '5-10', '10+'],
      genders: uniq([...rows.map((r) => r.gender), ...active.map((u) => u.gender)]),
      ethnicities: uniq([...rows.map((r) => r.ethnicity), ...active.map((u) => u.ethnicity)]),
      ageBands: ['<25', '25-34', '35-44', '45-54', '55-64', '65+'],
      jobTitles: uniq([...rows.map((r) => r.jobTitle), ...active.map((u) => (u.jobTitleId ? titleName.get(u.jobTitleId) : null))]),
    };
  }),

  // ── Outcome tiers ───────────────────────────────────────────────────────
  // Both tier sets are DEFINITIONS, not measurements — they are stated here in
  // one place so the thresholds can be changed without hunting through queries.
  //
  // Performance comes from the 9-box rating (1..9, numpad layout):
  //     7 8 9
  //     4 5 6
  //     1 2 3
  // Performance is the horizontal axis, so the right column (3/6/9) is the top
  // performance band, middle (2/5/8) is mid, left (1/4/7) is bottom.
  //
  // Engagement is each respondent's own mean answer expressed as a percentage
  // of the available scale — (mean - 1) / (scaleMax - 1). Percent-of-scale
  // rather than a raw score because 15Five history is 4-point and the in-app
  // survey is 5-point; a raw threshold would quietly mean different things in
  // different periods.

  // ── Filtered engagement read with min-group-size gate + manager scope ──
  // MIN GROUP SIZE = 3: any cohort under 3 responses is suppressed ("Not enough
  // results to view"), including filter combinations. Managers see only their own
  // roll-up; admins / HR / ELT see everyone.
  filtered: protectedProcedure
    .input(z.object({
      tenureBand: z.string().optional(),
      location: z.string().optional(),
      team: z.string().optional(),
      manager: z.string().optional(),
      department: z.string().optional(),
      eltLeader: z.string().optional(),
      hierarchyUnderId: z.string().optional(),
      businessUnit: z.string().optional(),
      gender: z.string().optional(),
      ethnicity: z.string().optional(),
      ageBand: z.string().optional(),
      jobTitle: z.string().optional(),
      performanceTier: z.enum(['high', 'mid', 'bottom']).optional(),
      engagementTier: z.enum(['extremely', 'highly', 'moderately', 'somewhat', 'disengaged']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const MIN = 3;
      const f = input ?? {};
      // Who may see results at all, and whose. The old test was role-tier based
      // and had two holes under the new model: a plain USER matched neither
      // branch and so fell through to every response in the company, and 'admin
      // tier' now includes every sysadmin. Both are decided by the capability
      // table and the grid instead.
      await assertCanViewResults(ctx);
      const acc = await resolveAreaAccess(ctx.db, ctx.user.id, 'insights', ctx.req.session?.previewLevel);
      let rows = await readResponses(ctx);

      const thisYear = new Date().getFullYear();
      const bandOf = (startYear: number | null | undefined): string | null => {
        if (!startYear) return null;
        const t = thisYear - startYear;
        if (t < 1) return '<1';
        if (t < 2) return '1-2';
        if (t < 5) return '2-5';
        if (t < 10) return '5-10';
        return '10+';
      };
      const eq2 = (a: string | null | undefined, b: string) => (a ?? '').trim() === b.trim();
      if (f.team) rows = rows.filter((r) => eq2(r.team, f.team!));
      if (f.location) rows = rows.filter((r) => eq2(r.location, f.location!));
      if (f.businessUnit) rows = rows.filter((r) => eq2(r.businessUnit, f.businessUnit!));
      if (f.department) rows = rows.filter((r) => eq2(r.department, f.department!));
      if (f.manager) rows = rows.filter((r) => eq2(r.managerName, f.manager!));
      if (f.eltLeader) rows = rows.filter((r) => eq2(r.eltLeader, f.eltLeader!));
      if (f.tenureBand) rows = rows.filter((r) => bandOf(r.startYear) === f.tenureBand);
      if (f.hierarchyUnderId) rows = rows.filter((r) => (r.managerPath ?? []).includes(f.hierarchyUnderId!));
      const ageBandOf = (birthYear: number | null | undefined): string | null => {
        if (!birthYear) return null;
        const a = thisYear - birthYear;
        if (a < 25) return '<25';
        if (a < 35) return '25-34';
        if (a < 45) return '35-44';
        if (a < 55) return '45-54';
        if (a < 65) return '55-64';
        return '65+';
      };
      if (f.jobTitle) rows = rows.filter((r) => eq2(r.jobTitle, f.jobTitle!));

      // Outcome filters slice by attributes of the individual respondent, so
      // they are restricted to HR / ELT / admin. A manager narrowing their own
      // small team to 'Disengaged' would come close to naming people, which is
      // the line this module is explicit about not crossing. The min-group-size
      // gate below still applies on top.
      if ((f.performanceTier || f.engagementTier) && acc.reach !== 'all') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Outcome filters are available to HR and ELT only.' });
      }
      if (f.performanceTier) {
        const boxes = await ctx.db.select().from(nineBoxRatings);
        const latestByUser = new Map<string, { box: number; ratedAt: string }>();
        for (const b of boxes) {
          const cur = latestByUser.get(b.userId);
          if (!cur || b.ratedAt > cur.ratedAt) latestByUser.set(b.userId, { box: b.box, ratedAt: b.ratedAt });
        }
        rows = rows.filter((r) => r.respondentId
          && performanceTierOf(latestByUser.get(r.respondentId)?.box) === f.performanceTier);
      }
      if (f.engagementTier) {
        const periodScale = new Map((await ctx.db.query.surveyPeriods.findMany()).map((p) => [p.id, p.scaleMax]));
        rows = rows.filter((r) => engagementTierOf(
          (r.answers ?? {}) as Record<string, number>,
          (r.periodId ? periodScale.get(r.periodId) : null) ?? 5,
        ) === f.engagementTier);
      }
      if (f.gender) rows = rows.filter((r) => eq2(r.gender, f.gender!));
      if (f.ethnicity) rows = rows.filter((r) => eq2(r.ethnicity, f.ethnicity!));
      if (f.ageBand) rows = rows.filter((r) => ageBandOf(r.birthYear) === f.ageBand);

      const cohortSize = rows.length;
      if (cohortSize < MIN) {
        return { suppressed: true as const, cohortSize, minGroupSize: MIN };
      }

      // Favorability = % of Likert answers that are 4 or 5.
      let favNum = 0, favDen = 0;
      const perDriver = new Map<string, { fav: number; n: number }>();
      const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const qDriver: Record<string, string> = qbank.length
        ? Object.fromEntries(qbank.filter((q) => q.driver).map((q) => [q.id, q.driver as string]))
        : Q_DRIVER_FALLBACK;
      for (const r of rows) {
        for (const [qid, v] of Object.entries((r.answers ?? {}) as Record<string, number>)) {
          if (typeof v !== 'number') continue;
          favDen += 1; if (v >= 4) favNum += 1;
          const dk = qDriver[qid]; if (dk) { const d = perDriver.get(dk) ?? { fav: 0, n: 0 }; d.n += 1; if (v >= 4) d.fav += 1; perDriver.set(dk, d); }
        }
      }
      const favorablePct = favDen ? Math.round((favNum / favDen) * 1000) / 10 : null;

      // eNPS = %promoters(9-10) − %detractors(0-6), over responses that answered it.
      const enpsVals = rows.map((r) => r.enpsScore).filter((x): x is number => typeof x === 'number');
      let enps: number | null = null;
      if (enpsVals.length) {
        const prom = enpsVals.filter((x) => x >= 9).length;
        const det = enpsVals.filter((x) => x <= 6).length;
        enps = Math.round(((prom - det) / enpsVals.length) * 100);
      }
      const drivers = [...perDriver.entries()]
        .map(([key, d]) => ({ key, favorablePct: d.n ? Math.round((d.fav / d.n) * 1000) / 10 : null }))
        .sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));

      return { suppressed: false as const, cohortSize, minGroupSize: MIN, favorablePct, enps, drivers };
    }),

  results: protectedProcedure
    .input(z.object({ periodId: z.string().optional(), department: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    await assertCanViewResults(ctx);
    const periodRows = (await ctx.db.query.surveyPeriods.findMany()).filter((p) => !p.archivedAt);
    const metricRows = await readMetrics(ctx);
    // Question bank drives the driver map + question text (falls back to the built-in
    // 66 if the bank table is empty). New drivers (D&I, wellbeing, etc.) flow through here.
    const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
    const Q_DRIVER: Record<string, DriverKey> = qbank.length
      ? Object.fromEntries(qbank.filter((q) => q.driver).map((q) => [q.id, q.driver as DriverKey]))
      : Q_DRIVER_FALLBACK;
    const Q_TEXT: Record<string, string> = Object.fromEntries(qbank.map((q) => [q.id, q.text]));
    const bankDrivers = qbank.filter((q) => q.driver).map((q) => q.driver as DriverKey);
    const histDrivers = metricRows.filter((m) => m.dimension === 'driver' && m.metricKey).map((m) => m.metricKey as DriverKey);
    const DRIVER_KEYS: DriverKey[] = Array.from(new Set<DriverKey>([...BASE_DRIVER_KEYS, ...bankDrivers, ...histDrivers]));

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
    const responses = await readResponses(ctx);
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
        label: 'Current survey',
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

    // Optional department scope (the analytics view dropdown). When set, the
    // summary/drivers reflect that team; 'All' (null) = company-wide.
    const scopeDept = (input?.department && input.department !== 'all') ? input.department : null;
    const sScope = scopeDept ? 'department' : 'company';
    const sDept = scopeDept ?? '';
    let scRespCount = latest.responseCount;
    let scEligCount: number | null = latest.eligibleCount;
    if (scopeDept) {
      if (latest.id === 'live') { scRespCount = liveAgg.get(`department|${sDept}|overall|`)?.count ?? 0; scEligCount = null; }
      else { const row = metricMap.get(mkey(latest.id, 'department', sDept, 'overall', '')); scRespCount = row?.responseCount ?? 0; scEligCount = row?.eligibleCount ?? null; }
    }

    // ── Company summary + trend ──────────────────────────────────────────────
    const compMean = meanOf(latest, sScope, sDept, 'overall', '');
    const compFav = favOf(latest, sScope, sDept, 'overall', '');
    const compUnfav = unfavOf(latest, sScope, sDept, 'overall', '');
    const prevFav = prev ? favOf(prev, sScope, sDept, 'overall', '') : null;
    const company = {
      label: latest.label,
      periodDate: latest.periodDate,
      isCurrent: latest.isCurrent,
      scaleMax: latest.scaleMax,
      favorablePct: compFav,
      unfavorablePct: compUnfav,
      mean: compMean,
      score: compMean != null ? scoreFromMean(compMean) : null,
      responseCount: scRespCount,
      eligibleCount: scEligCount,
      participationPct: scEligCount ? r1((scRespCount / scEligCount) * 100) : null,
      prevFavorablePct: prevFav,
      trend: periods.map((p) => ({ label: p.label, favorablePct: favOf(p, sScope, sDept, 'overall', ''), mean: meanOf(p, sScope, sDept, 'overall', '') })),
    };

    // ── Drivers (latest) with trend + delta ──────────────────────────────────
    const drivers = DRIVER_KEYS.map((key) => {
      const fav = favOf(latest, sScope, sDept, 'driver', key);
      const pf = prev ? favOf(prev, sScope, sDept, 'driver', key) : null;
      return {
        key,
        favorablePct: fav,
        unfavorablePct: unfavOf(latest, 'company', '', 'driver', key),
        mean: meanOf(latest, 'company', '', 'driver', key),
        prevFavorablePct: pf,
        delta: fav != null && pf != null ? r1(fav - pf) : null,
        trend: periods.map((p) => ({ label: p.label, favorablePct: favOf(p, sScope, sDept, 'driver', key) })),
      };
    }).filter((d) => d.favorablePct != null)
      .sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));

    // ── Questions (latest company) for celebrate/improve + drill ─────────────
    const latestQ = metricRows.filter((m) => m.periodId === latest.id && m.scope === 'company' && m.dimension === 'question');
    const liveQ = latest.id === 'live'
      ? [...liveAgg.entries()].filter(([k]) => k.startsWith('company||question|'))
      : [];
    let questions: Array<{ id: string; text: string | null; driver: DriverKey | null; favorablePct: number | null; unfavorablePct: number | null; mean: number | null; prevFavorablePct: number | null; delta: number | null }> = [];
    if (scopeDept) {
      questions = []; // question-level favorability is company-wide only
    } else if (latest.id === 'live') {
      questions = liveQ.map(([k, a]) => {
        const id = k.split('|').pop() as string;
        return { id, text: Q_TEXT[id] ?? null, driver: Q_DRIVER[id] ?? null, favorablePct: a.favorablePct, unfavorablePct: a.unfavorablePct, mean: a.mean, prevFavorablePct: null, delta: null };
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
        return { id, text: Q_TEXT[id] ?? null, driver: Q_DRIVER[id] ?? null, favorablePct: fav, unfavorablePct: n(m.unfavorablePct), mean: n(m.mean), prevFavorablePct: pf, delta: fav != null && pf != null ? r1(fav - pf) : null };
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
      selectedDepartment: scopeDept,
      departmentOptions: [...new Set(departmentsOut.map((d) => d.name))],
    };
  }),

  // ── Period list for the Org-screen engagement selector ───────────────────
  periods: protectedProcedure.query(async ({ ctx }) => {
    const periodRows = (await ctx.db.query.surveyPeriods.findMany()).filter((p) => !p.archivedAt);
    const responses = await readResponses(ctx);
    const historical = periodRows
      .map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate }))
      .sort((a, b) => a.periodDate.localeCompare(b.periodDate))
      .map((p) => ({ id: p.id, label: p.label }));
    const list = responses.length > 0
      ? [...historical, { id: 'live', label: 'Current survey' }]
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
    await assertCanViewResults(ctx);
      // Engagement anonymity floor = 3, matching the breakdown path (MIN=3) and
      // the app-wide rule: a team with fewer than 3 responses is suppressed.
      const SUPPRESS_MIN = 3;
      const viewerRole = (ctx.user?.role ?? 'user') as RoleTier;
      const canSeeIndividual = hasMinimumRole(viewerRole, 'admin');

      const periodRows = (await ctx.db.query.surveyPeriods.findMany()).filter((p) => !p.archivedAt);
      const metricRows = await readMetrics(ctx);
      const responses = await readResponses(ctx);
      const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const Q_DRIVER: Record<string, DriverKey> = qbank.length
        ? Object.fromEntries(qbank.filter((q) => q.driver).map((q) => [q.id, q.driver as DriverKey]))
        : Q_DRIVER_FALLBACK;
      const DRIVER_KEYS: DriverKey[] = Array.from(new Set<DriverKey>([...BASE_DRIVER_KEYS, ...qbank.filter((q) => q.driver).map((q) => q.driver as DriverKey)]));
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

  // ── AI recommended action areas (Summary tab, on-demand) ─────────────────
  // Takes the on-screen summary (already scoped to the selected period + team)
  // and asks Claude for concrete focus areas. Falls back to a rule-based list if
  // no API key is configured. Aggregate-only — no individual data is involved.
  recommendations: protectedProcedure
    .input(z.object({
      periodLabel: z.string().max(120),
      scopeLabel: z.string().max(120),
      overallFavorablePct: z.number().nullable().optional(),
      drivers: z.array(z.object({ label: z.string().max(80), favorablePct: z.number().nullable() })).max(40),
      lowlights: z.array(z.object({ text: z.string().max(400), favorablePct: z.number().nullable() })).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const ranked = [...input.drivers].filter((d) => d.favorablePct != null)
        .sort((a, b) => (a.favorablePct ?? 0) - (b.favorablePct ?? 0));
      const weakest = ranked.slice(0, 4);
      const lines = [
        `Survey: ${input.periodLabel} — ${input.scopeLabel}.`,
        input.overallFavorablePct != null ? `Overall favorability: ${input.overallFavorablePct}%.` : '',
        weakest.length ? `Lowest-scoring drivers: ${weakest.map((d) => `${d.label} (${d.favorablePct}%)`).join(', ')}.` : '',
        (input.lowlights && input.lowlights.length)
          ? `Lowest-scoring statements: ${input.lowlights.slice(0, 6).map((q) => `"${q.text}" (${q.favorablePct}%)`).join('; ')}.` : '',
      ].filter(Boolean).join('\n');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        try {
          const anthropic = createAnthropic({ apiKey });
          const result = await generateText({
            model: anthropic('claude-sonnet-4-6'),
            system: 'You are an experienced HR / people-operations advisor. From aggregate engagement-survey results, recommend 3–5 SPECIFIC, actionable focus areas a manager or HR team could act on in the next quarter. Ground each recommendation in the data provided (name the driver/theme and its score). Be concrete and concise — one short paragraph or a tight bullet each, no preamble, no restating the numbers back verbatim. Never reference or infer any individual person.',
            prompt: `Here are the engagement results to act on:\n${lines}\n\nGive the recommended focus areas.`,
            maxOutputTokens: 700,
          });
          return { source: 'ai' as const, recommendations: result.text.trim() };
        } catch {
          // fall through to rule-based
        }
      }
      // Rule-based fallback (no API key / API error)
      const fb = weakest.length
        ? weakest.map((d) => `• Focus on ${d.label} — favorability is ${d.favorablePct}%, among the lowest. Run listening sessions with affected teams and identify one concrete change to pilot.`).join('\n')
        : 'Not enough data yet to recommend focus areas — collect more responses first.';
      return { source: 'fallback' as const, recommendations: fb };
    }),


  // ── Raw Responses (source rows behind a period) ──────────────────────────
  // Imported periods -> the raw uploaded statement rows. Live/current period ->
  // individual (anonymous) in-app responses. Honors the period + team toggles.
  rawResponses: protectedProcedure
    .input(z.object({ periodId: z.string().optional(), department: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
    await assertCanViewResults(ctx);
      const periodRows = (await ctx.db.query.surveyPeriods.findMany()).filter((p) => !p.archivedAt);
      const responses = await readResponses(ctx);
      const hasLive = responses.length > 0;
      const hist = periodRows
        .map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate }))
        .sort((a, b) => a.periodDate.localeCompare(b.periodDate));
      const live = hasLive ? { id: 'live', label: 'Current survey', periodDate: new Date().toISOString().slice(0, 10) } : null;
      const periods = live ? [...hist, live] : hist;
      if (periods.length === 0) return { kind: 'empty' as const, periodLabel: '', rows: [] };
      const target = (input?.periodId && periods.find((p) => p.id === input.periodId)) || periods[periods.length - 1];
      const dept = (input?.department && input.department !== 'all') ? input.department : null;

      if (target.id !== 'live') {
        const imp = (await ctx.db.query.engagementImportRows.findMany()).filter((r) => r.periodId === target.id);
        const filtered = dept ? imp.filter((r) => r.groupName === dept) : imp;
        return {
          kind: 'import' as const,
          periodLabel: target.label,
          rows: filtered.map((r) => ({
            group: r.groupName ?? 'Company', dimension: r.dimension, statement: r.statement,
            avgResponse: r.avgResponse != null ? Number(r.avgResponse) : null,
            unfavorable: r.unfavorable, neutral: r.neutral, favorable: r.favorable,
            totalResponses: r.totalResponses, responseRate: r.responseRate != null ? Number(r.responseRate) : null,
          })),
        };
      }
      // live -> individual (anonymous) responses
      const rows = responses
        .filter((r) => r.status === 'complete')
        .filter((r) => !dept || r.department === dept)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .map((r) => ({
          submittedAt: r.submittedAt, department: r.department ?? null, jobTitle: r.jobTitle ?? null,
          enps: r.enpsScore ?? null, answered: Object.keys((r.answers ?? {}) as Record<string, number>).length,
        }));
      return { kind: 'live' as const, periodLabel: target.label, rows };
    }),

  // ── Campaign Progress (landing) — per-group participation/response ────────
  campaignProgress: protectedProcedure
    .input(z.object({ periodId: z.string().optional(), groupBy: z.enum(['dept', 'mgr', 'hier', 'loc']).default('dept') }))
    .query(async ({ ctx, input }) => {
    await assertCanViewResults(ctx);
      type Grp = { name: string; people: number; responseCount: number; responseRatePct: number | null };
      if (input.groupBy === 'loc') {
        return { available: false as const, groupBy: 'loc' as const, reason: 'no-location-field', periodLabel: '', partial: false as const, groups: [] as Grp[] };
      }
      const allUsers = await ctx.db.query.users.findMany();
      const allDepts = await ctx.db.query.departments.findMany();
      const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]));
      const active = allUsers.filter((u) => u.isActive);
      const periodRows = (await ctx.db.query.surveyPeriods.findMany()).filter((p) => !p.archivedAt);
      const responses = await readResponses(ctx);
      const hist = periodRows.map((p) => ({ id: p.id, label: p.label, periodDate: p.periodDate })).sort((a, b) => a.periodDate.localeCompare(b.periodDate));
      const live = responses.length > 0 ? { id: 'live', label: 'Current survey', periodDate: new Date().toISOString().slice(0, 10) } : null;
      const periods = live ? [...hist, live] : hist;
      const target = (input.periodId && periods.find((p) => p.id === input.periodId)) || periods[periods.length - 1] || null;

      if (input.groupBy === 'dept') {
        if (target && target.id !== 'live') {
          const metricRows = await readMetrics(ctx);
          const groups: Grp[] = metricRows
            .filter((m) => m.periodId === target.id && m.scope === 'department' && m.dimension === 'overall')
            .map((m) => ({ name: m.department ?? '', people: m.eligibleCount ?? 0, responseCount: m.responseCount, responseRatePct: m.eligibleCount ? r1((m.responseCount / m.eligibleCount) * 100) : null }))
            .sort((a, b) => (b.responseRatePct ?? 0) - (a.responseRatePct ?? 0));
          return { available: true as const, groupBy: 'dept' as const, periodLabel: target.label, partial: false as const, groups };
        }
        const deptByUser = new Map(active.map((u) => [u.id, u.departmentId ? deptNameById.get(u.departmentId) ?? null : null]));
        const head = new Map<string, number>();
        for (const u of active) { const dn = u.departmentId ? deptNameById.get(u.departmentId) : null; if (dn) head.set(dn, (head.get(dn) ?? 0) + 1); }
        const resp = new Map<string, number>();
        for (const rp of responses) { const dn = (rp.department && rp.department.trim()) || (rp.respondentId ? deptByUser.get(rp.respondentId) ?? null : null); if (dn) resp.set(dn, (resp.get(dn) ?? 0) + 1); }
        const groups: Grp[] = [...head.entries()].map(([name, people]) => { const rc = resp.get(name) ?? 0; return { name, people, responseCount: rc, responseRatePct: people ? r1(Math.min(100, (rc / people) * 100)) : null }; }).sort((a, b) => (b.responseRatePct ?? 0) - (a.responseRatePct ?? 0));
        return { available: true as const, groupBy: 'dept' as const, periodLabel: target?.label ?? 'Current survey', partial: false as const, groups };
      }

      const nameById = new Map(allUsers.map((u) => [u.id, (`${u.name ?? ''}`.trim() || u.email || 'Unknown')]));
      if (input.groupBy === 'mgr') {
        const head = new Map<string, number>();
        for (const u of active) { if (!u.managerId) continue; const mn = nameById.get(u.managerId) ?? 'Unknown'; head.set(mn, (head.get(mn) ?? 0) + 1); }
        const groups: Grp[] = [...head.entries()].map(([name, people]) => ({ name: `${name}'s team`, people, responseCount: 0, responseRatePct: null })).sort((a, b) => b.people - a.people);
        return { available: true as const, groupBy: 'mgr' as const, partial: true as const, periodLabel: target?.label ?? '', groups };
      }
      const reports = new Map<string, number>();
      for (const u of active) { if (!u.managerId) continue; const mn = nameById.get(u.managerId) ?? 'Unknown'; reports.set(mn, (reports.get(mn) ?? 0) + 1); }
      const groups: Grp[] = [...reports.entries()].map(([name, people]) => ({ name: `${name}'s hierarchy`, people, responseCount: 0, responseRatePct: null })).sort((a, b) => b.people - a.people).slice(0, 12);
      return { available: true as const, groupBy: 'hier' as const, partial: true as const, periodLabel: target?.label ?? '', groups };
    }),

  // ── eNPS (live responses only — imported periods carry no eNPS) ───────────
  enps: protectedProcedure
    .input(z.object({ periodId: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
    await assertCanViewResults(ctx);
      const responses = await readResponses(ctx);
      const withE = responses.filter((r) => r.enpsScore != null);
      if (withE.length === 0) return { available: false as const };
      const total = withE.length;
      const prom = withE.filter((r) => (r.enpsScore as number) >= 9).length;
      const det = withE.filter((r) => (r.enpsScore as number) <= 6).length;
      const pas = total - prom - det;
      const score = Math.round((prom / total - det / total) * 100);
      const allUsers = await ctx.db.query.users.findMany();
      const allDepts = await ctx.db.query.departments.findMany();
      const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]));
      const deptByUser = new Map(allUsers.map((u) => [u.id, u.departmentId ? deptNameById.get(u.departmentId) ?? null : null]));
      const headByDept = new Map<string, number>();
      for (const u of allUsers) { if (!u.isActive) continue; const dn = u.departmentId ? deptNameById.get(u.departmentId) : null; if (dn) headByDept.set(dn, (headByDept.get(dn) ?? 0) + 1); }
      const groups = new Map<string, number[]>();
      for (const r of withE) {
        const dept = (r.department && r.department.trim()) || (r.respondentId ? deptByUser.get(r.respondentId) ?? null : null);
        if (!dept) continue;
        const arr = groups.get(dept) ?? []; arr.push(r.enpsScore as number); groups.set(dept, arr);
      }
      const byGroup = [...groups.entries()].map(([name, arr]) => {
        const pr = arr.filter((s) => s >= 9).length, de = arr.filter((s) => s <= 6).length, pa = arr.length - pr - de;
        const elig = headByDept.get(name) ?? null;
        return { name, responseCount: arr.length, score: Math.round((pr / arr.length - de / arr.length) * 100),
          promoterPct: r1((pr / arr.length) * 100), passivePct: r1((pa / arr.length) * 100), detractorPct: r1((de / arr.length) * 100),
          eligibleCount: elig, participationPct: elig ? r1(Math.min(100, (arr.length / elig) * 100)) : null };
      }).filter((g) => g.responseCount >= 3).sort((a, b) => b.score - a.score);
      return { available: true as const, score, responseCount: total, promoters: prom, passives: pas, detractors: det,
        promoterPct: r1((prom / total) * 100), passivePct: r1((pas / total) * 100), detractorPct: r1((det / total) * 100), byGroup };
    }),

  // ── Feedback (free-text) with AI sentiment (live responses only) ──────────
  feedback: protectedProcedure
    .input(z.object({ periodId: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
    await assertCanViewResults(ctx);
      const responses = await readResponses(ctx);
      const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const qDriver: Record<string, string> = Object.fromEntries(qbank.filter((q) => q.driver).map((q) => [q.id, q.driver as string]));
      const qText: Record<string, string> = Object.fromEntries(qbank.map((q) => [q.id, q.text]));
      type Row = { id: string; driver: string | null; question: string; text: string; department: string | null; type: string; sentiment: string };
      const raw: Omit<Row, 'sentiment'>[] = [];
      for (const r of responses) {
        const ta = (r.textAnswers ?? {}) as Record<string, string>;
        for (const [qid, txt] of Object.entries(ta)) {
          if (!txt || !txt.trim()) continue;
          raw.push({ id: `${r.id}|${qid}`, driver: qDriver[qid] ?? null, question: qText[qid] ?? qid, text: txt.trim(), department: r.department ?? null, type: 'Custom' });
        }
        if (r.enpsReason && r.enpsReason.trim()) {
          raw.push({ id: `${r.id}|enps`, driver: null, question: 'What was the primary reason for your eNPS answer?', text: r.enpsReason.trim(), department: r.department ?? null, type: 'eNPS' });
        }
      }
      if (raw.length === 0) return { total: 0, rows: [] as Row[] };
      const capped = raw.slice(0, 80);
      const heur = (t: string): string => {
        const s = t.toLowerCase();
        const neg = /\b(not|no|lack|poor|hard|difficult|frustrat|bad|worse|leav|burn|overworked|underpaid|unfair|struggl|concern|issue)\b/.test(s);
        const pos = /\b(great|love|good|excellent|happy|support|appreciate|enjoy|amazing|best|positive|fantastic)\b/.test(s);
        return neg && pos ? 'mixed' : neg ? 'negative' : pos ? 'positive' : 'neutral';
      };
      let sentiments: Record<string, string> = {};
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        try {
          const anthropic = createAnthropic({ apiKey });
          const listing = capped.map((r, i) => `${i}. ${r.text.slice(0, 300)}`).join('\n');
          const res = await generateText({
            model: anthropic('claude-sonnet-4-6'),
            system: 'Classify each employee survey free-text comment as exactly one of: positive, negative, mixed, neutral. Return ONLY a JSON object mapping the index (as a string) to the label. No prose, no code fences.',
            prompt: listing, maxOutputTokens: 1500,
          });
          const t = res.text; const j = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
          sentiments = JSON.parse(j);
        } catch { /* heuristic fallback */ }
      }
      const valid = new Set(['positive', 'negative', 'mixed', 'neutral']);
      const rows: Row[] = capped.map((r, i) => {
        const s = String(sentiments[String(i)] ?? '').toLowerCase();
        return { ...r, sentiment: valid.has(s) ? s : heur(r.text) };
      });
      return { total: raw.length, rows };
    }),

  // ── Heatmap cells — per-department × per-question favorability (live only) ─
  heatmapCells: protectedProcedure
    .input(z.object({ periodId: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
    await assertCanViewResults(ctx);
      const responses = await readResponses(ctx);
      if (responses.length === 0) return { available: false as const, columns: [] as { id: string; driver: string | null; text: string }[], rows: [] as unknown[] };
      const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const qDriver: Record<string, string> = qbank.length
        ? Object.fromEntries(qbank.filter((q) => q.driver).map((q) => [q.id, q.driver as string]))
        : (Q_DRIVER_FALLBACK as Record<string, string>);
      const qText: Record<string, string> = Object.fromEntries(qbank.map((q) => [q.id, q.text]));
      const allUsers = await ctx.db.query.users.findMany();
      const allDepts = await ctx.db.query.departments.findMany();
      const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]));
      const deptByUser = new Map(allUsers.map((u) => [u.id, u.departmentId ? deptNameById.get(u.departmentId) ?? null : null]));

      const cell = new Map<string, Map<string, number[]>>();
      const deptAll = new Map<string, number[]>();
      const respByDept = new Map<string, number>();
      for (const r of responses) {
        const dept = (r.department && r.department.trim()) || (r.respondentId ? deptByUser.get(r.respondentId) ?? null : null);
        if (!dept) continue;
        respByDept.set(dept, (respByDept.get(dept) ?? 0) + 1);
        const ans = (r.answers ?? {}) as Record<string, number>;
        let dm = cell.get(dept); if (!dm) { dm = new Map(); cell.set(dept, dm); }
        for (const [qid, v] of Object.entries(ans)) {
          if (typeof v !== 'number') continue;
          const a = dm.get(qid) ?? []; a.push(v); dm.set(qid, a);
          const da = deptAll.get(dept) ?? []; da.push(v); deptAll.set(dept, da);
        }
      }
      const qids = qbank.length ? qbank.filter((q) => q.driver).map((q) => q.id) : Object.keys(Q_DRIVER_FALLBACK);
      const columns = qids.map((id) => ({ id, driver: qDriver[id] ?? null, text: qText[id] ?? id }));
      const rows = [...cell.entries()].map(([dept, dm]) => {
        const allv = deptAll.get(dept) ?? [];
        const mean = allv.length ? r2(allv.reduce((a, b) => a + b, 0) / allv.length) : null;
        const score = mean != null ? scoreFromMean(mean) : null;
        const cells: Record<string, { fav: number; unfav: number; mean: number }> = {};
        for (const [qid, vals] of dm) { const ag = aggregate(vals); if (ag) cells[qid] = { fav: ag.favorablePct, unfav: ag.unfavorablePct, mean: ag.mean }; }
        return { name: dept, responseCount: respByDept.get(dept) ?? 0, score, mean, cells };
      }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return { available: true as const, columns, rows };
    }),

  // ── Group lists for the analytics Groups selector ─────────────────────────
  groups: protectedProcedure.query(async ({ ctx }) => {
    const allUsers = await ctx.db.query.users.findMany();
    const allDepts = await ctx.db.query.departments.findMany();
    const deptNameById = new Map(allDepts.map((d) => [d.id, d.name]));
    const active = allUsers.filter((u) => u.isActive);
    const departments = [...new Set(active.map((u) => (u.departmentId ? deptNameById.get(u.departmentId) : null)).filter(Boolean) as string[])].sort();
    const nameById = new Map(allUsers.map((u) => [u.id, ((u.name ?? '').trim() || u.email || 'Unknown')]));
    const managerIds = new Set(active.map((u) => u.managerId).filter(Boolean) as string[]);
    const hierarchies = [...managerIds].map((id) => nameById.get(id) as string).filter(Boolean).sort();
    const eltLeaders = [...managerIds].filter((id) => { const u = allUsers.find((x) => x.id === id); return !!u && !u.managerId; }).map((id) => nameById.get(id) as string).sort();
    return { departments, eltLeaders, hierarchies, businessUnits: [] as string[] };
  }),


  // Bulk CSV import of historical survey results (admin). One CSV where each row
  // is an aggregate metric with its period columns. Groups rows by period label,
  // upserts the survey_period (source='import'), then inserts survey_metrics.
  // Columns: period, perioddate, scalemax?, scope (company|department), department?,
  // dimension (overall|driver|question), metrickey?, mean?, favorablepct?,
  // unfavorablepct?, responsecount?, eligiblecount?.
  importHistorical: protectedProcedure
    .input(z.object({
      rows: z.array(z.record(z.string(), z.string())).max(20000),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });
      let periodsCreated = 0; let metricsAdded = 0; let skipped = 0; const errors: string[] = [];
      const num = (v: string | undefined) => { const n = Number((v ?? '').trim()); return (v ?? '').trim() !== '' && !Number.isNaN(n) ? n : null; };
      const int = (v: string | undefined) => { const n = num(v); return n == null ? null : Math.round(n); };

      // Group rows by period label.
      const byPeriod = new Map<string, Record<string, string>[]>();
      for (const r of input.rows) {
        const label = (r.period ?? r.periodlabel ?? '').trim();
        if (!label) { skipped++; continue; }
        (byPeriod.get(label) ?? byPeriod.set(label, []).get(label)!).push(r);
      }

      const existingPeriods = await ctx.db.query.surveyPeriods.findMany();
      const periodIdByLabel = new Map(existingPeriods.map((p) => [p.label.trim().toLowerCase(), p.id]));

      for (const [label, rows] of byPeriod.entries()) {
        let periodId = periodIdByLabel.get(label.toLowerCase()) ?? null;
        if (!periodId) {
          const first = rows[0];
          const periodDate = (first.perioddate ?? first.perioddate ?? '').trim() || new Date().toISOString().slice(0, 10);
          try {
            const [pr] = await ctx.db.insert(surveyPeriods).values({
              label, periodDate,
              eligibleCount: int(first.eligiblecount) ?? 0,
              responseCount: int(first.responsecount) ?? 0,
              source: 'import',
              scaleMax: int(first.scalemax) ?? 5,
              isCurrent: false,
            }).returning();
            periodId = pr.id; periodIdByLabel.set(label.toLowerCase(), pr.id); periodsCreated++;
          } catch (e) { errors.push(`period "${label}": ${e instanceof Error ? e.message : 'create failed'}`); continue; }
        }
        for (const r of rows) {
          const scope = (r.scope ?? 'company').trim().toLowerCase() === 'department' ? 'department' : 'company';
          const dimension = ['overall', 'driver', 'question'].includes((r.dimension ?? '').trim().toLowerCase()) ? (r.dimension ?? '').trim().toLowerCase() : 'overall';
          try {
            await ctx.db.insert(surveyMetrics).values({
              periodId: periodId!, scope, department: scope === 'department' ? (r.department?.trim() || null) : null,
              dimension, metricKey: (r.metrickey ?? '').trim() || null,
              mean: num(r.mean) != null ? String(num(r.mean)) : null,
              favorablePct: num(r.favorablepct) != null ? String(num(r.favorablepct)) : null,
              unfavorablePct: num(r.unfavorablepct) != null ? String(num(r.unfavorablepct)) : null,
              responseCount: int(r.responsecount) ?? 0,
              eligibleCount: int(r.eligiblecount),
            });
            metricsAdded++;
          } catch (e) { errors.push(`${label}/${scope}/${dimension}: ${e instanceof Error ? e.message : 'insert failed'}`); }
        }
      }
      return { periodsCreated, metricsAdded, skipped, errors: errors.slice(0, 50) };
    }),


  // ------------------------------------------------------------
  // Import a RAW 15Five export (admin). Unlike importHistorical above — which
  // needs a CSV already reshaped into this app's internal column names — this
  // reads the export as 15Five emits it, creates/reuses the period inline, and
  // writes BOTH levels of data:
  //   • engagement_import_rows — statement level, so the drill-down tabs work
  //     on imported periods the same way they do on live ones. Previously this
  //     table was only ever populated by hand-written migrations.
  //   • survey_metrics — the derived overall/driver/question aggregates the
  //     results tabs read.
  // Re-importing the same period replaces its data rather than duplicating it.
  // ------------------------------------------------------------
  importSurveyExport: protectedProcedure
    .input(z.object({
      period: z.object({
        label: z.string().trim().min(1).max(80),
        periodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'periodDate must be YYYY-MM-DD'),
        scaleMax: z.number().int().min(2).max(11).default(5),
      }),
      // Several files import together into one survey — 15Five often splits the
      // company sheet, the department breakdown and the scores into separate
      // downloads. Each file may itself be a multi-sheet workbook.
      files: z.array(z.object({
        name: z.string().min(1),
        // base64 of the raw upload; ~25MB of base64 is well past any real export
        base64: z.string().min(1).max(25_000_000),
      })).min(1).max(10),
      replace: z.boolean().default(true),
      makeCurrent: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });

      // A workbook may hold several differently-shaped sheets (company
      // statements, department statements, department scores). Each is detected
      // and normalised on its own, then merged into one import.
      const sheets: Array<{ sheet: string; rows: Record<string, string>[] }> = [];
      const multiFile = input.files.length > 1;
      for (const f of input.files) {
        let parsed;
        try {
          parsed = await parseUploadedTable(f.base64, f.name);
        } catch (e) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `${f.name}: ${e instanceof Error ? e.message : 'could not be read.'}` });
        }
        // Label sheets with their file when more than one file is in play, so the
        // result readout says which upload a sheet came from.
        for (const sh of parsed) {
          sheets.push({ sheet: multiFile ? `${f.name} — ${sh.sheet}` : sh.sheet, rows: sh.rows });
        }
      }
      if (sheets.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No data rows found in the file(s) you selected.' });

      const norm: NormalizedRow[] = [];
      const sheetReports: Array<{ sheet: string; shape: string; rows: number; columns: string[] }> = [];
      const columnsDetected: string[] = [];
      let dropped = 0;
      let countsWerePercentages = false;

      for (const sheet of sheets) {
        const headers = Object.keys(sheet.rows[0] ?? {});
        const cols = detectColumns(headers);
        const shape = detectShape(cols);
        if (shape === 'unknown') {
          sheetReports.push({ sheet: sheet.sheet, shape: 'unrecognised', rows: 0, columns: headers.slice(0, 30) });
          continue;
        }
        const res = normalizeRows(sheet.rows, cols);
        norm.push(...res.rows);
        dropped += res.dropped;
        countsWerePercentages = countsWerePercentages || res.countsWerePercentages;
        sheetReports.push({ sheet: sheet.sheet, shape, rows: res.rows.length, columns: [] });
        for (const [field, header] of Object.entries(cols)) {
          columnsDetected.push(sheets.length > 1 ? `${sheet.sheet}: ${field} \u2190 "${header}"` : `${field} \u2190 "${header}"`);
        }
      }

      if (norm.length === 0) {
        const detail = sheetReports.map((r) => `"${r.sheet}" (columns: ${r.columns.join(', ') || 'none'})`).join('; ');
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Could not recognise any sheet as a 15Five engagement export. Found ${detail}. A sheet needs a statement/question column, or a department/group column with a score.`,
        });
      }

      // ---- period: reuse by label (case-insensitive) or create ----
      const existing = await ctx.db.query.surveyPeriods.findMany();
      const match = existing.find((p) => p.label.trim().toLowerCase() === input.period.label.toLowerCase());
      let periodId: string;
      let periodCreated = false;
      let replaced = 0;

      if (match) {
        periodId = match.id;
        await ctx.db.update(surveyPeriods)
          .set({ periodDate: input.period.periodDate, scaleMax: input.period.scaleMax, source: 'import' })
          .where(eq(surveyPeriods.id, periodId));
        if (input.replace) {
          const oldMetrics = await ctx.db.select({ id: surveyMetrics.id }).from(surveyMetrics).where(eq(surveyMetrics.periodId, periodId));
          replaced = oldMetrics.length;
          await ctx.db.delete(surveyMetrics).where(eq(surveyMetrics.periodId, periodId));
          await ctx.db.delete(engagementImportRows).where(eq(engagementImportRows.periodId, periodId));
        }
      } else {
        const [created] = await ctx.db.insert(surveyPeriods).values({
          label: input.period.label,
          periodDate: input.period.periodDate,
          scaleMax: input.period.scaleMax,
          source: 'import',
          isCurrent: false,
          status: 'closed',
        }).returning();
        periodId = created.id;
        periodCreated = true;
      }

      // ---- statement-level rows ----
      const stmtRows = norm.filter((r) => r.statement);
      const CHUNK = 500;
      for (let i = 0; i < stmtRows.length; i += CHUNK) {
        await ctx.db.insert(engagementImportRows).values(stmtRows.slice(i, i + CHUNK).map((r) => ({
          periodId,
          scope: r.scope,
          groupName: r.groupName,
          dimension: r.dimension,
          statement: r.statement as string,
          avgResponse: r.avgResponse != null ? String(r.avgResponse) : null,
          unfavorable: r.unfavorable,
          neutral: r.neutral,
          favorable: r.favorable,
          noResponse: r.noResponse,
          totalResponses: r.totalResponses,
          totalPossible: r.totalPossible,
          responseRate: r.responseRate != null ? String(r.responseRate) : null,
        })));
      }

      // ---- derive aggregates ----
      // Pure derivation lives in the service so it can be unit-tested without a
      // database; this layer only persists the result.
      const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const bankByText = new Map(qbank.map((q) => [statementKey(q.text), { id: q.id, driver: q.driver }]));
      const {
        metrics, unmappedDimensions, unmatchedStatements,
        derivedCompanyOverall, companyResponses, companyEligible,
      } = deriveMetrics(norm, bankByText);

      const derived: Array<typeof surveyMetrics.$inferInsert> = metrics.map((m) => ({
        periodId,
        scope: m.scope,
        department: m.department,
        dimension: m.dimension,
        metricKey: m.metricKey,
        mean: m.mean != null ? String(m.mean) : null,
        favorablePct: m.favorablePct != null ? String(m.favorablePct) : null,
        unfavorablePct: m.unfavorablePct != null ? String(m.unfavorablePct) : null,
        responseCount: m.responseCount,
        eligibleCount: m.eligibleCount,
      }));

      for (let i = 0; i < derived.length; i += CHUNK) {
        await ctx.db.insert(surveyMetrics).values(derived.slice(i, i + CHUNK));
      }

      // Keep the period header honest about participation.
      if (companyResponses > 0 || companyEligible != null) {
        await ctx.db.update(surveyPeriods).set({
          responseCount: companyResponses,
          eligibleCount: companyEligible ?? 0,
        }).where(eq(surveyPeriods.id, periodId));
      }
      if (input.makeCurrent) {
        await ctx.db.update(surveyPeriods).set({ isCurrent: false });
        await ctx.db.update(surveyPeriods).set({ isCurrent: true }).where(eq(surveyPeriods.id, periodId));
      }

      return {
        sheets: sheetReports,
        periodId,
        periodCreated,
        replacedMetrics: replaced,
        columnsDetected,
        statementRows: stmtRows.length,
        metricsAdded: derived.length,
        questionMetrics: derived.filter((m) => m.dimension === 'question').length,
        driverMetrics: derived.filter((m) => m.dimension === 'driver').length,
        overallMetrics: derived.filter((m) => m.dimension === 'overall').length,
        departmentsCovered: new Set(derived.filter((m) => m.scope === 'department' && m.department).map((m) => m.department)).size,
        derivedCompanyOverall,
        droppedRows: dropped,
        countsWerePercentages,
        unmatchedStatements,
        unmappedDimensions: [...unmappedDimensions].slice(0, 25),
      };
    }),

  // ------------------------------------------------------------
  // IMPORT AUDIT — "how do I know these numbers are real?"
  //
  // Recomputes every aggregate from the stored source rows and compares it to
  // what is actually saved, then exposes the individual statements behind each
  // figure. Nothing here is estimated, modelled, or AI-generated: each number is
  // a respondent-weighted average of rows that came out of the uploaded file,
  // and this query shows the arithmetic.
  //
  // A mismatch means the stored aggregates have drifted from their sources
  // (a partial re-import, a manual edit) and should be re-imported.
  // ------------------------------------------------------------
  // ---- archive / restore ----------------------------------------------
  // Archiving hides a survey from the list, the period pickers and the trend
  // series. Nothing is deleted: source rows and metrics stay put, and restoring
  // puts the survey back exactly as it was.
  setArchived: protectedProcedure
    .input(z.object({ periodId: z.string().uuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });

      const period = (await ctx.db.query.surveyPeriods.findMany()).find((p) => p.id === input.periodId);
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found.' });
      if (input.archived && period.isCurrent) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This is the current survey. Make another survey current before archiving it.' });
      }

      await ctx.db.update(surveyPeriods)
        .set({ archivedAt: input.archived ? new Date() : null })
        .where(eq(surveyPeriods.id, input.periodId));
      return { ok: true as const, archived: input.archived };
    }),

  // Every survey including archived ones, for the admin archive manager.
  listAllPeriods: protectedProcedure.query(async ({ ctx }) => {
    const role = (ctx.user?.role ?? 'user') as RoleTier;
    if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });
    const rows = await ctx.db.query.surveyPeriods.findMany();
    const metrics = await ctx.db.select({ periodId: surveyMetrics.periodId }).from(surveyMetrics);
    const srcRows = await ctx.db.select({ periodId: engagementImportRows.periodId }).from(engagementImportRows);
    const countBy = (list: { periodId: string }[], id: string) => list.filter((x) => x.periodId === id).length;
    return rows
      .map((p) => ({
        id: p.id, label: p.label, periodDate: p.periodDate, source: p.source,
        isCurrent: p.isCurrent, status: p.status,
        responseCount: p.responseCount, eligibleCount: p.eligibleCount,
        archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
        metricCount: countBy(metrics, p.id),
        sourceRowCount: countBy(srcRows, p.id),
      }))
      .sort((a, b) => b.periodDate.localeCompare(a.periodDate));
  }),

  // Permanent removal, for clearing out test imports. Deliberately narrow:
  // only imported surveys, never the current one, and cascade takes the metrics
  // and source rows with it. Live in-app response data is never touched.
  deletePeriod: protectedProcedure
    .input(z.object({ periodId: z.string().uuid(), confirmLabel: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });

      const period = (await ctx.db.query.surveyPeriods.findMany()).find((p) => p.id === input.periodId);
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found.' });
      if (period.source !== 'import') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only imported surveys can be deleted here. Archive this one instead.' });
      }
      if (period.isCurrent) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This is the current survey — it cannot be deleted.' });
      }
      // Typed confirmation: deletion is irreversible, so it should not be
      // reachable by a single mis-click.
      if (input.confirmLabel.trim().toLowerCase() !== period.label.trim().toLowerCase()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'The name you typed does not match this survey.' });
      }

      await ctx.db.delete(surveyMetrics).where(eq(surveyMetrics.periodId, input.periodId));
      await ctx.db.delete(engagementImportRows).where(eq(engagementImportRows.periodId, input.periodId));
      await ctx.db.delete(surveyPeriods).where(eq(surveyPeriods.id, input.periodId));
      return { ok: true as const };
    }),

  importAudit: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });

      const period = (await ctx.db.query.surveyPeriods.findMany()).find((p) => p.id === input.periodId);
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found.' });

      const srcRows = await ctx.db.select().from(engagementImportRows).where(eq(engagementImportRows.periodId, input.periodId));
      const stored = await ctx.db.select().from(surveyMetrics).where(eq(surveyMetrics.periodId, input.periodId));

      const nnum = (v: unknown) => (v == null ? null : Number(v));

      // Rebuild the normalized rows from what was stored, then re-derive.
      const rebuilt: NormalizedRow[] = srcRows.map((r) => {
        const fav = r.favorable;
        const unfav = r.unfavorable;
        const total = r.totalResponses;
        return {
          scope: (r.scope === 'department' ? 'department' : 'company') as 'company' | 'department',
          groupName: r.groupName,
          dimension: r.dimension,
          statement: r.statement,
          avgResponse: nnum(r.avgResponse),
          unfavorable: unfav, neutral: r.neutral, favorable: fav,
          noResponse: r.noResponse,
          totalResponses: total,
          totalPossible: r.totalPossible,
          responseRate: nnum(r.responseRate),
          favorablePct: fav != null && total ? Math.round((fav / total) * 10000) / 100 : null,
          unfavorablePct: unfav != null && total ? Math.round((unfav / total) * 10000) / 100 : null,
          score: null,
        };
      });

      const qbank = await ctx.db.query.engagementSurveyQuestions.findMany();
      const bankByText = new Map(qbank.map((q) => [statementKey(q.text), { id: q.id, driver: q.driver }]));
      const recomputed = rebuilt.length ? deriveMetrics(rebuilt, bankByText) : null;

      const round = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);
      const near = (a: number | null, b: number | null) =>
        a == null && b == null ? true : a == null || b == null ? false : Math.abs(a - b) <= 0.05;

      // Compare company + driver figures: stored vs recomputed from source.
      const checks: Array<{ label: string; stored: number | null; recomputed: number | null; matches: boolean }> = [];
      if (recomputed) {
        const findStored = (dim: string, key: string | null) => {
          const m = stored.find((x) => x.scope === 'company' && x.dimension === dim && (x.metricKey ?? null) === key);
          return round(nnum(m?.favorablePct));
        };
        const findRecomputed = (dim: string, key: string | null) => {
          const m = recomputed.metrics.find((x) => x.scope === 'company' && x.dimension === dim && (x.metricKey ?? null) === key);
          return round(m?.favorablePct ?? null);
        };
        const s0 = findStored('overall', null); const r0 = findRecomputed('overall', null);
        checks.push({ label: 'Company overall', stored: s0, recomputed: r0, matches: near(s0, r0) });
        for (const m of recomputed.metrics.filter((x) => x.scope === 'company' && x.dimension === 'driver')) {
          const sv = findStored('driver', m.metricKey);
          const rv = round(m.favorablePct);
          checks.push({ label: `Driver: ${m.metricKey}`, stored: sv, recomputed: rv, matches: near(sv, rv) });
        }
      }

      // Show the statements behind each company-level driver, with their weights.
      const drivers = new Map<string, Array<{ statement: string; favorable: number | null; totalResponses: number | null; favorablePct: number | null }>>();
      for (const r of rebuilt) {
        if (!r.statement || r.scope !== 'company') continue;
        const hit = bankByText.get(statementKey(r.statement));
        const dk = hit?.driver ?? mapDimension(r.dimension);
        if (!dk) continue;
        const list = drivers.get(dk) ?? [];
        list.push({ statement: r.statement, favorable: r.favorable, totalResponses: r.totalResponses, favorablePct: r.favorablePct });
        drivers.set(dk, list);
      }

      const companyStatements = rebuilt.filter((r) => r.scope === 'company' && r.statement).length;
      const deptStatements = rebuilt.filter((r) => r.scope === 'department' && r.statement).length;

      return {
        period: {
          label: period.label, periodDate: period.periodDate, scaleMax: period.scaleMax,
          source: period.source, responseCount: period.responseCount, eligibleCount: period.eligibleCount,
        },
        sourceRowCount: srcRows.length,
        companyStatements,
        deptStatements,
        departments: [...new Set(srcRows.map((r) => r.groupName).filter(Boolean))].length,
        storedMetricCount: stored.length,
        checks,
        allMatch: checks.length > 0 && checks.every((c) => c.matches),
        driverBreakdown: [...drivers.entries()].map(([driver, statements]) => ({ driver, statements })),
      };
    }),

  // Raw stored source rows, for downloading and diffing against the original
  // export. This is the app's copy of the file — if it matches the 15Five
  // download, nothing was lost or altered on the way in.
  importSourceRows: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.user?.role ?? 'user') as RoleTier;
      if (!hasMinimumRole(role, 'admin')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only.' });
      const rows = await ctx.db.select().from(engagementImportRows).where(eq(engagementImportRows.periodId, input.periodId));
      return rows.map((r) => ({
        scope: r.scope, group: r.groupName ?? '', dimension: r.dimension ?? '', statement: r.statement,
        avgResponse: r.avgResponse ?? '', unfavorable: r.unfavorable ?? '', neutral: r.neutral ?? '',
        favorable: r.favorable ?? '', noResponse: r.noResponse ?? '', totalResponses: r.totalResponses ?? '',
        totalPossible: r.totalPossible ?? '', responseRate: r.responseRate ?? '',
      }));
    }),
});
