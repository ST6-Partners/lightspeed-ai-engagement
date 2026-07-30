// ============================================================
// 15FIVE EXPORT IMPORT — parses a raw 15Five engagement export into the shapes
// the app already stores: statement-level rows (engagement_import_rows) and
// derived aggregates (survey_metrics).
//
// Why this exists: before this, historical results only got in by an engineer
// hand-writing a SQL migration (0026, 0065, 0072, 0073). The Org Data
// "Import historical results" button required a CSV already reshaped into the
// app's internal column names, which no 15Five export produces. This module
// reads what 15Five actually emits.
//
// 15Five ships several different exports and their header wording varies by
// workspace and export date, so column detection is synonym-based rather than
// positional. Three shapes are recognised:
//   1. company statements    — statement + counts, no group column
//   2. department statements — the same, plus a group/department column
//   3. department scores     — group + a 0-100 score, no statements
// ============================================================

export type RawRow = Record<string, string>;

/** Canonical fields we try to find in an export. */
export type Field =
  | 'group' | 'dimension' | 'statement' | 'avgResponse'
  | 'unfavorable' | 'neutral' | 'favorable' | 'noResponse'
  | 'totalResponses' | 'totalPossible' | 'responseRate'
  | 'favorablePct' | 'unfavorablePct' | 'score';

/**
 * Header synonyms, normalised (lowercase, alphanumeric only).
 * Order matters: percentage-bearing spellings are listed first so that a header
 * like "Favorable %" never binds to the plain `favorable` count field.
 */
const SYNONYMS: Record<Field, string[]> = {
  favorablePct: ['favorablepercent', 'favourablepercent', 'favorablepct', 'favourablepct', 'percentfavorable', 'percentfavourable'],
  unfavorablePct: ['unfavorablepercent', 'unfavourablepercent', 'unfavorablepct', 'unfavourablepct', 'percentunfavorable', 'percentunfavourable'],
  responseRate: ['responserate', 'participationrate', 'participation', 'completionrate', 'percentresponded'],

  group: ['groupname', 'group', 'department', 'dept', 'team', 'segment', 'orggroup', 'reportinggroup'],
  dimension: ['dimension', 'driver', 'category', 'competency', 'attribute', 'topic', 'theme', 'subcategory'],
  statement: ['statement', 'question', 'questiontext', 'item', 'itemtext', 'statementtext'],

  avgResponse: ['avgresponse', 'averageresponse', 'averagescore', 'avgscore', 'average', 'avg', 'mean'],
  unfavorable: ['unfavorable', 'unfavourable', 'unfav', 'negative'],
  neutral: ['neutral', 'passive'],
  favorable: ['favorable', 'favourable', 'fav', 'positive'],
  noResponse: ['noresponse', 'norespons', 'noanswer', 'blank', 'skipped', 'didnotrespond'],
  totalResponses: ['totalresponses', 'responses', 'responsecount', 'respondents', 'totalrespondents', 'answered'],
  totalPossible: ['totalpossible', 'possible', 'eligible', 'eligiblecount', 'invited', 'totalinvited', 'population', 'people'],

  score: ['engagementscore', 'overallscore', 'score', 'index'],
};

export const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Maps canonical field -> the actual header key present on the row objects. */
export type ColumnMap = Partial<Record<Field, string>>;

/**
 * Detects which export columns are present. `headers` are the raw keys from the
 * parsed CSV. Two passes: exact match first, then substring, so a header like
 * "Avg. Response (1-4)" still resolves without stealing another field's column.
 */
export function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const taken = new Set<string>();
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const passes: Array<'exact' | 'contains'> = ['exact', 'contains'];

  for (const pass of passes) {
    for (const field of Object.keys(SYNONYMS) as Field[]) {
      if (map[field]) continue;
      for (const syn of SYNONYMS[field]) {
        const hit = norm.find(({ raw, n }) =>
          !taken.has(raw) && (pass === 'exact' ? n === syn : n.includes(syn)));
        if (hit) { map[field] = hit.raw; taken.add(hit.raw); break; }
      }
    }
  }
  return map;
}

/** Parses "85.85", "85.85%", "1,204", "" -> number | null. */
export function num(v: string | undefined): number | null {
  if (v == null) return null;
  const cleaned = v.replace(/[%,\s]/g, '').trim();
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

const int = (v: string | undefined) => { const n = num(v); return n == null ? null : Math.round(n); };

/**
 * Percentages arrive either as 0-100 or as 0-1 fractions depending on how the
 * export was generated. A value <= 1 is treated as a fraction unless the raw
 * text carried a "%" sign (1% is legitimate).
 */
function pct(v: string | undefined): number | null {
  const n = num(v);
  if (n == null) return null;
  const hadPercentSign = (v ?? '').includes('%');
  if (n <= 1 && !hadPercentSign) return Math.round(n * 1000) / 10;
  return Math.round(n * 100) / 100;
}

export type NormalizedRow = {
  scope: 'company' | 'department';
  groupName: string | null;
  dimension: string | null;
  statement: string | null;
  avgResponse: number | null;
  unfavorable: number | null;
  neutral: number | null;
  favorable: number | null;
  noResponse: number | null;
  totalResponses: number | null;
  totalPossible: number | null;
  responseRate: number | null;
  /** Derived: favorable share of responses, 0-100. */
  favorablePct: number | null;
  unfavorablePct: number | null;
  /** A direct 0-100 engagement score, when the export supplies one. */
  score: number | null;
};

export type ExportShape = 'company-statements' | 'department-statements' | 'department-scores' | 'unknown';

export function detectShape(cols: ColumnMap): ExportShape {
  const hasStatement = Boolean(cols.statement);
  const hasGroup = Boolean(cols.group);
  if (hasStatement && hasGroup) return 'department-statements';
  if (hasStatement) return 'company-statements';
  if (hasGroup && (cols.score || cols.favorablePct || cols.avgResponse)) return 'department-scores';
  return 'unknown';
}

/**
 * Some workspaces export the favorable/neutral/unfavorable breakdown as
 * percentages rather than head counts, under headers that normalise to the same
 * words ("% Favorable" -> "favorable"). Detecting that from the header alone is
 * impossible, so infer it from the data: if the three values reliably sum to
 * ~100 while the response total says otherwise, they are percentages.
 * Getting this wrong silently halves or doubles every favorability figure, which
 * is why it is checked rather than assumed.
 */
export function countsArePercentages(rows: RawRow[], cols: ColumnMap): boolean {
  if (!cols.favorable || !cols.neutral || !cols.unfavorable || !cols.totalResponses) return false;
  let checked = 0;
  let sumsTo100 = 0;
  for (const r of rows) {
    const f = num(r[cols.favorable as string]);
    const n2 = num(r[cols.neutral as string]);
    const u = num(r[cols.unfavorable as string]);
    const total = num(r[cols.totalResponses as string]);
    if (f == null || n2 == null || u == null || total == null) continue;
    checked++;
    if (checked > 50) break;
    const sum = f + n2 + u;
    if (Math.abs(sum - 100) <= 1.5 && (total < 98 || total > 102)) sumsTo100++;
  }
  return checked >= 3 && sumsTo100 / checked > 0.7;
}

/**
 * Turns raw export rows into normalized rows. Rows carrying neither a statement
 * nor a group are dropped (blank lines, export footers, unlabelled totals).
 */
export function normalizeRows(rows: RawRow[], cols: ColumnMap): { rows: NormalizedRow[]; dropped: number; countsWerePercentages: boolean } {
  const get = (r: RawRow, f: Field) => (cols[f] ? r[cols[f] as string] : undefined);
  const asPct = countsArePercentages(rows, cols);
  const out: NormalizedRow[] = [];
  let dropped = 0;

  for (const r of rows) {
    const groupName = (get(r, 'group') ?? '').trim() || null;
    const statement = (get(r, 'statement') ?? '').trim() || null;
    if (!statement && !groupName) { dropped++; continue; }

    const rawFav = int(get(r, 'favorable'));
    const rawUnfav = int(get(r, 'unfavorable'));
    const rawNeutral = int(get(r, 'neutral'));
    const totalResponses = int(get(r, 'totalResponses'));

    // When the breakdown columns hold percentages, they are not counts — keep the
    // count fields null rather than storing a percentage as if it were people.
    const favorable = asPct ? null : rawFav;
    const unfavorable = asPct ? null : rawUnfav;
    const neutral = asPct ? null : rawNeutral;

    // Prefer an explicit percentage column, then an inferred one, then derive.
    const explicitFav = pct(get(r, 'favorablePct')) ?? (asPct ? num(get(r, 'favorable')) : null);
    const explicitUnfav = pct(get(r, 'unfavorablePct')) ?? (asPct ? num(get(r, 'unfavorable')) : null);
    const derivedFav = favorable != null && totalResponses ? Math.round((favorable / totalResponses) * 10000) / 100 : null;
    const derivedUnfav = unfavorable != null && totalResponses ? Math.round((unfavorable / totalResponses) * 10000) / 100 : null;

    out.push({
      scope: groupName ? 'department' : 'company',
      groupName,
      dimension: (get(r, 'dimension') ?? '').trim() || null,
      statement,
      avgResponse: num(get(r, 'avgResponse')),
      unfavorable,
      neutral,
      favorable,
      noResponse: int(get(r, 'noResponse')),
      totalResponses,
      totalPossible: int(get(r, 'totalPossible')),
      responseRate: pct(get(r, 'responseRate')),
      favorablePct: explicitFav ?? derivedFav,
      unfavorablePct: explicitUnfav ?? derivedUnfav,
      score: num(get(r, 'score')),
    });
  }
  return { rows: out, dropped, countsWerePercentages: asPct };
}

// ------------------------------------------------------------
// 15Five dimension -> app driver key.
//
// 15Five's export dimensions are finer-grained than this app's ten drivers, so
// several collapse into one. This mapping is EDITORIAL — it reproduces the
// judgment previously baked by hand into migration 0026. Anything not listed
// here is reported back to the importer as "unmapped" rather than silently
// dropped; the statement-level row is stored either way, so nothing is lost.
// ------------------------------------------------------------
export const DIMENSION_TO_DRIVER: Record<string, string> = {
  meaning: 'purpose',
  purpose: 'purpose',
  roleclarity: 'purpose',
  sharedvalues: 'purpose',
  workforce: 'purpose',

  capacity: 'capacity',
  rest: 'capacity',
  workfocus: 'capacity',
  goalsupport: 'capacity',

  autonomy: 'autonomy',

  utilization: 'utilization',
  profdev: 'utilization',
  professionaldevelopment: 'utilization',

  fairness: 'rewards_fairness',
  rewards: 'rewards_fairness',

  leaderintegrity: 'leadership',
  leaderavailability: 'leadership',
  leadership: 'leadership',
  psychsafety: 'leadership',
  psychologicalsafety: 'leadership',

  manager: 'manager_relationship',
  feedback: 'manager_relationship',
  settinggoals: 'manager_relationship',
  enablingproductivity: 'manager_relationship',

  givingandreceivingfeedback: 'manager_effectiveness',
  demonstratingbusinessacumen: 'manager_effectiveness',
  influencingothers: 'manager_effectiveness',
  managingoneself: 'manager_effectiveness',
  supportingcareergrowth: 'manager_effectiveness',
  buildingstrongteams: 'manager_effectiveness',

  coworkerrelationships: 'coworkers',
  coworkers: 'coworkers',

  organizationalcommitment: 'commitment',
  commitment: 'commitment',
  workfeeling: 'commitment',
};

export function mapDimension(dimension: string | null): string | null {
  if (!dimension) return null;
  return DIMENSION_TO_DRIVER[normalizeHeader(dimension)] ?? null;
}

/** Normalises statement text for matching against the question bank. */
export const statementKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Mean of a set of values, weighted by response count where available. */
export function weightedMean(rows: { value: number | null; weight: number | null }[]): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const { value, weight } of rows) {
    if (value == null) continue;
    const w = weight && weight > 0 ? weight : 1;
    numerator += value * w;
    denominator += w;
  }
  return denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : null;
}

// ------------------------------------------------------------
// DERIVATION — turns normalized export rows into the aggregate metric rows the
// results tabs read (overall / driver / question, at company and department
// scope). Kept pure and database-free so it can be tested directly.
// ------------------------------------------------------------

export type QuestionBankEntry = { id: string; driver: string | null };

export type DerivedMetric = {
  scope: 'company' | 'department';
  department: string | null;
  dimension: 'overall' | 'driver' | 'question';
  metricKey: string | null;
  mean: number | null;
  favorablePct: number | null;
  unfavorablePct: number | null;
  responseCount: number;
  eligibleCount: number | null;
};

type Bucket = { value: number | null; weight: number | null };
type Agg = { mean: Bucket[]; fav: Bucket[]; unfav: Bucket[]; responses: number; eligible: number | null };

const emptyAgg = (): Agg => ({ mean: [], fav: [], unfav: [], responses: 0, eligible: null });

function mergeAggs(parts: Agg[]): Agg {
  const merged = emptyAgg();
  for (const a of parts) {
    merged.mean.push(...a.mean);
    merged.fav.push(...a.fav);
    merged.unfav.push(...a.unfav);
    // Departments are disjoint, so respondents SUM rather than max.
    merged.responses += a.responses;
    if (a.eligible != null) merged.eligible = (merged.eligible ?? 0) + a.eligible;
  }
  return merged;
}

export function deriveMetrics(
  norm: NormalizedRow[],
  bankByText: Map<string, QuestionBankEntry>,
): {
  metrics: DerivedMetric[];
  unmappedDimensions: string[];
  unmatchedStatements: number;
  derivedCompanyOverall: boolean;
  companyResponses: number;
  companyEligible: number | null;
} {
  const driverAgg = new Map<string, Agg>();
  const overallAgg = new Map<string, Agg>();
  const questionMetrics: DerivedMetric[] = [];
  const unmapped = new Set<string>();
  let unmatchedStatements = 0;

  const bump = (store: Map<string, Agg>, key: string, r: NormalizedRow, favOverride?: number | null) => {
    const cur = store.get(key) ?? emptyAgg();
    cur.mean.push({ value: r.avgResponse, weight: r.totalResponses });
    cur.fav.push({ value: favOverride !== undefined ? favOverride : r.favorablePct, weight: r.totalResponses });
    cur.unfav.push({ value: r.unfavorablePct, weight: r.totalResponses });
    cur.responses = Math.max(cur.responses, r.totalResponses ?? 0);
    if (r.totalPossible != null) cur.eligible = Math.max(cur.eligible ?? 0, r.totalPossible);
    store.set(key, cur);
  };
  const scopeKey = (r: NormalizedRow) => `${r.scope}|${r.groupName ?? ''}`;

  for (const r of norm) {
    if (!r.statement) {
      // department-scores shape: the row IS that department's overall figure.
      // 15Five's per-department "Score" has its own 0-100 basis; it lands in
      // favorablePct because that is the cross-scale-safe comparison field.
      if (r.scope === 'department') bump(overallAgg, scopeKey(r), r, r.favorablePct ?? r.score);
      continue;
    }

    const hit = bankByText.get(statementKey(r.statement));
    if (hit) {
      questionMetrics.push({
        scope: r.scope,
        department: r.scope === 'department' ? r.groupName : null,
        dimension: 'question',
        metricKey: hit.id,
        mean: r.avgResponse,
        favorablePct: r.favorablePct,
        unfavorablePct: r.unfavorablePct,
        responseCount: r.totalResponses ?? 0,
        eligibleCount: r.totalPossible,
      });
    } else {
      unmatchedStatements++;
    }

    const driverKey = hit?.driver ?? mapDimension(r.dimension);
    if (driverKey) bump(driverAgg, `${scopeKey(r)}|${driverKey}`, r);
    else if (r.dimension) unmapped.add(r.dimension);

    bump(overallAgg, scopeKey(r), r);
  }

  // An export carrying only a department breakdown leaves the company level
  // empty, which renders as a blank Summary tab — the survey looks like it
  // imported and then did nothing. Roll the departments up instead. A real
  // company row always wins; this only fills a genuine gap.
  let derivedCompanyOverall = false;
  if (![...overallAgg.keys()].some((k) => k.startsWith('company|')) && overallAgg.size > 0) {
    overallAgg.set('company|', mergeAggs([...overallAgg.values()]));
    derivedCompanyOverall = true;
  }

  // Same gap at driver level.
  for (const dk of new Set([...driverAgg.keys()].map((k) => k.split('|')[2]))) {
    if (driverAgg.has(`company||${dk}`)) continue;
    const parts = [...driverAgg.entries()]
      .filter(([k]) => k.startsWith('department|') && k.endsWith(`|${dk}`))
      .map(([, a]) => a);
    if (parts.length) driverAgg.set(`company||${dk}`, mergeAggs(parts));
  }

  const metrics: DerivedMetric[] = [...questionMetrics];

  for (const [key, agg] of driverAgg.entries()) {
    const [scope, group, driverKey] = key.split('|');
    metrics.push({
      scope: scope as 'company' | 'department',
      department: scope === 'department' ? (group || null) : null,
      dimension: 'driver',
      metricKey: driverKey,
      mean: weightedMean(agg.mean),
      favorablePct: weightedMean(agg.fav),
      unfavorablePct: weightedMean(agg.unfav),
      responseCount: agg.responses,
      eligibleCount: agg.eligible,
    });
  }

  let companyResponses = 0;
  let companyEligible: number | null = null;
  for (const [key, agg] of overallAgg.entries()) {
    const [scope, group] = key.split('|');
    if (scope === 'company') { companyResponses = agg.responses; companyEligible = agg.eligible; }
    metrics.push({
      scope: scope as 'company' | 'department',
      department: scope === 'department' ? (group || null) : null,
      dimension: 'overall',
      metricKey: null,
      mean: weightedMean(agg.mean),
      favorablePct: weightedMean(agg.fav),
      unfavorablePct: weightedMean(agg.unfav),
      responseCount: agg.responses,
      eligibleCount: agg.eligible,
    });
  }

  return {
    metrics,
    unmappedDimensions: [...unmapped],
    unmatchedStatements,
    derivedCompanyOverall,
    companyResponses,
    companyEligible,
  };
}
