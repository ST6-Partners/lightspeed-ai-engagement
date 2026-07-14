// ============================================================
// CHECK-IN ANALYTICS — pure functions that turn raw check-in responses into
// quantified, pattern-revealing views for managers. No I/O, no React — safe to
// unit-test. Consumed by src/components/checkin/CheckinAnalytics.tsx.
//
// Scoring model:
//  • overall & per-category scores = mean of scale5 answers (1..5). eNPS is
//    EXCLUDED from these means (mixing a 0..10 scale with 1..5 is meaningless)
//    and tracked on its own via the standard NPS formula.
//  • Flags read a person's overall trajectory across check-ins so a manager can
//    see who is cooling off, not just who is low right now (thriving/flight-risk).
// ============================================================

export type CheckinAnswerType = 'scale5' | 'enps' | 'text';

export interface CheckinAnswerLite {
  questionId: string;
  text: string;
  type: CheckinAnswerType;
  category?: string | null;
  driver?: string | null;
  value?: number | null;
  answerText?: string | null;
}

export interface CheckinResponseLite {
  id: string;
  respondentId: string | null;
  respondentName: string | null;
  weekOf: string;                 // period start, YYYY-MM-DD
  submittedAt: string | Date;
  answers: CheckinAnswerLite[];
}

// ---- thresholds (exported so the UI can explain them / DD can cite them) ----
export const RISK_LEVEL = 2.5;    // latest overall <= this => risk
export const WATCH_LEVEL = 3.0;   // latest overall <= this => watch
export const RISK_DROP = 1.0;     // period-over-period drop >= this => risk
export const WATCH_DROP = 0.5;    // period-over-period drop >= this => watch
export const CONSEC_BELOW = 3.0;  // overall <= this ...
export const CONSEC_N = 2;        // ... for this many consecutive check-ins => risk

const CATEGORY_ORDER = ['morale', 'priorities', 'manager_support', 'values', 'growth', 'general'];
const CATEGORY_LABEL: Record<string, string> = {
  morale: 'Morale',
  priorities: 'Priorities',
  manager_support: 'Manager Support',
  values: 'Values',
  growth: 'Growth',
  general: 'General',
};

export function labelForCategory(c: string): string {
  return CATEGORY_LABEL[c] ?? c.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function mean(nums: number[]): number | null {
  return nums.length ? round1(nums.reduce((s, n) => s + n, 0) / nums.length) : null;
}
function ts(r: CheckinResponseLite): number {
  const t = new Date(r.submittedAt).getTime();
  return Number.isNaN(t) ? new Date(r.weekOf + 'T00:00:00').getTime() : t;
}

// -------------------------------------------------------------- per response --
export interface ResponseScores {
  overall: number | null;
  byCategory: Record<string, number | null>;
  enps: number | null;   // mean of raw eNPS answers (0..10) in this response
  scaleCount: number;
}

export function scoreResponse(r: CheckinResponseLite): ResponseScores {
  const answers = Array.isArray(r.answers) ? r.answers : [];
  const scales = answers.filter((a) => a.type === 'scale5' && typeof a.value === 'number') as (CheckinAnswerLite & { value: number })[];
  const enps = answers.filter((a) => a.type === 'enps' && typeof a.value === 'number') as (CheckinAnswerLite & { value: number })[];

  const buckets: Record<string, number[]> = {};
  for (const a of scales) {
    const cat = (a.category && a.category.trim()) || 'general';
    (buckets[cat] ??= []).push(a.value);
  }
  const byCategory: Record<string, number | null> = {};
  for (const cat of Object.keys(buckets)) byCategory[cat] = mean(buckets[cat]);

  return {
    overall: mean(scales.map((a) => a.value)),
    byCategory,
    enps: mean(enps.map((a) => a.value)),
    scaleCount: scales.length,
  };
}

// ------------------------------------------------------------ per person series
export interface SeriesPoint {
  responseId: string;
  weekOf: string;
  submittedAt: string;
  overall: number | null;
  byCategory: Record<string, number | null>;
  enps: number | null;
}

export interface PersonSeries {
  respondentId: string;
  respondentName: string;
  points: SeriesPoint[];         // ascending in time
  latest: SeriesPoint | null;
  previous: SeriesPoint | null;
  flag: FlagResult;
  checkinCount: number;
}

export function buildPersonSeries(rows: CheckinResponseLite[]): PersonSeries[] {
  const byPerson = new Map<string, CheckinResponseLite[]>();
  for (const r of rows) {
    const key = r.respondentId ?? `name:${r.respondentName ?? 'unknown'}`;
    (byPerson.get(key) ?? byPerson.set(key, []).get(key)!).push(r);
  }
  const out: PersonSeries[] = [];
  for (const [key, list] of byPerson) {
    const sorted = [...list].sort((a, b) => ts(a) - ts(b));
    const points: SeriesPoint[] = sorted.map((r) => {
      const s = scoreResponse(r);
      return {
        responseId: r.id,
        weekOf: r.weekOf,
        submittedAt: String(r.submittedAt),
        overall: s.overall,
        byCategory: s.byCategory,
        enps: s.enps,
      };
    });
    const scored = points.filter((p) => p.overall != null);
    const latest = scored.length ? scored[scored.length - 1] : null;
    const previous = scored.length > 1 ? scored[scored.length - 2] : null;
    out.push({
      respondentId: sorted[0].respondentId ?? key,
      respondentName: sorted[0].respondentName ?? 'Unknown',
      points,
      latest,
      previous,
      flag: computeFlag(points),
      checkinCount: points.length,
    });
  }
  return out;
}

// -------------------------------------------------------------------- flagging
export type FlagLevel = 'ok' | 'watch' | 'risk';
export interface FlagResult {
  level: FlagLevel;
  reasons: string[];
}

export function computeFlag(points: SeriesPoint[]): FlagResult {
  const scored = points.filter((p) => p.overall != null) as (SeriesPoint & { overall: number })[];
  if (scored.length === 0) return { level: 'ok', reasons: [] };

  const latest = scored[scored.length - 1];
  const previous = scored.length > 1 ? scored[scored.length - 2] : null;
  const drop = previous ? round1(previous.overall - latest.overall) : null; // positive => went down

  // consecutive check-ins (from the end) at/under CONSEC_BELOW
  let consec = 0;
  for (let i = scored.length - 1; i >= 0; i--) {
    if (scored[i].overall <= CONSEC_BELOW) consec++;
    else break;
  }

  const reasons: string[] = [];
  let level: FlagLevel = 'ok';

  if (latest.overall <= RISK_LEVEL) { level = 'risk'; reasons.push(`Latest score ${latest.overall.toFixed(1)} is low`); }
  if (drop != null && drop >= RISK_DROP) { level = 'risk'; reasons.push(`Dropped ${drop.toFixed(1)} pts since last check-in`); }
  if (consec >= CONSEC_N) { level = 'risk'; reasons.push(`At or below ${CONSEC_BELOW.toFixed(1)} for ${consec} check-ins running`); }

  if (level === 'ok') {
    if (latest.overall <= WATCH_LEVEL) { level = 'watch'; reasons.push(`Latest score ${latest.overall.toFixed(1)} is soft`); }
    if (drop != null && drop >= WATCH_DROP) { level = 'watch'; reasons.push(`Slipped ${drop.toFixed(1)} pts since last check-in`); }
  }

  return { level, reasons };
}

// ----------------------------------------------------------------- categories
export function categoriesPresent(rows: CheckinResponseLite[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const a of (r.answers ?? [])) {
      if (a.type === 'scale5' && typeof a.value === 'number') set.add((a.category && a.category.trim()) || 'general');
    }
  }
  return [...set].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a); const ib = CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

// ------------------------------------------------------------- team scorecard
export interface TeamRow {
  respondentId: string;
  respondentName: string;
  overall: number | null;
  overallDelta: number | null;   // latest - previous (positive => improved)
  byCategory: Record<string, number | null>;
  flag: FlagResult;
  checkinCount: number;
  lastWeekOf: string | null;
}

const FLAG_RANK: Record<FlagLevel, number> = { risk: 0, watch: 1, ok: 2 };

export function buildTeamScorecard(rows: CheckinResponseLite[]): { rows: TeamRow[]; categories: string[] } {
  const series = buildPersonSeries(rows);
  const teamRows: TeamRow[] = series.map((p) => ({
    respondentId: p.respondentId,
    respondentName: p.respondentName,
    overall: p.latest?.overall ?? null,
    overallDelta: p.latest?.overall != null && p.previous?.overall != null
      ? round1(p.latest.overall - p.previous.overall) : null,
    byCategory: p.latest?.byCategory ?? {},
    flag: p.flag,
    checkinCount: p.checkinCount,
    lastWeekOf: p.latest?.weekOf ?? null,
  }));

  teamRows.sort((a, b) => {
    const r = FLAG_RANK[a.flag.level] - FLAG_RANK[b.flag.level];
    if (r !== 0) return r;
    const da = a.overallDelta ?? 0; const db = b.overallDelta ?? 0; // biggest drop first
    if (da !== db) return da - db;
    return a.respondentName.localeCompare(b.respondentName);
  });

  return { rows: teamRows, categories: categoriesPresent(rows) };
}

// -------------------------------------------------------------------- team eNPS
export interface EnpsResult {
  score: number | null;   // -100..100
  promoters: number;
  passives: number;
  detractors: number;
  n: number;
  weekOf: string | null;
}

export function teamEnps(rows: CheckinResponseLite[]): EnpsResult {
  // Use the most recent period (weekOf) that actually contains eNPS answers.
  const withEnps = rows.filter((r) => (r.answers ?? []).some((a) => a.type === 'enps' && typeof a.value === 'number'));
  if (withEnps.length === 0) return { score: null, promoters: 0, passives: 0, detractors: 0, n: 0, weekOf: null };
  const latestWeek = withEnps.map((r) => r.weekOf).sort().slice(-1)[0];
  const vals: number[] = [];
  for (const r of withEnps.filter((r) => r.weekOf === latestWeek)) {
    for (const a of r.answers) if (a.type === 'enps' && typeof a.value === 'number') vals.push(a.value);
  }
  const promoters = vals.filter((v) => v >= 9).length;
  const detractors = vals.filter((v) => v <= 6).length;
  const passives = vals.length - promoters - detractors;
  const score = vals.length ? Math.round(((promoters - detractors) / vals.length) * 100) : null;
  return { score, promoters, passives, detractors, n: vals.length, weekOf: latestWeek };
}

// ---------------------------------------------------------------- team summary
export interface TeamSummary {
  latestPeriod: string | null;
  respondentsLatest: number;
  teamOverallLatest: number | null;
  enps: EnpsResult;
}

export function teamSummary(rows: CheckinResponseLite[]): TeamSummary {
  if (rows.length === 0) return { latestPeriod: null, respondentsLatest: 0, teamOverallLatest: null, enps: teamEnps(rows) };
  const latestPeriod = rows.map((r) => r.weekOf).sort().slice(-1)[0];
  const inPeriod = rows.filter((r) => r.weekOf === latestPeriod);
  const respondentsLatest = new Set(inPeriod.map((r) => r.respondentId ?? r.respondentName ?? r.id)).size;
  const overalls = inPeriod.map((r) => scoreResponse(r).overall).filter((v): v is number => v != null);
  return {
    latestPeriod,
    respondentsLatest,
    teamOverallLatest: mean(overalls),
    enps: teamEnps(rows),
  };
}

// score → coarse band, for coloring cells (1..5 scale)
export type ScoreBand = 'high' | 'mid' | 'low' | 'none';
export function scoreBand(v: number | null | undefined): ScoreBand {
  if (v == null) return 'none';
  if (v >= 4) return 'high';
  if (v >= 3) return 'mid';
  return 'low';
}
