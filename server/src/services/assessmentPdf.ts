// ============================================================
// ASSESSMENT PDF PARSING — turns an uploaded vendor assessment report (Criteria
// CCAT, Criteria EPP, Insights Discovery) into a DRAFT the admin confirms
// before anything is written.
//
// Why a draft and not a direct write: these PDFs are vendor-formatted marketing
// documents, not data feeds. Layouts change without notice and a silent
// mis-parse would put wrong cognitive/personality data on a real person's
// record. So parsing is best-effort and advisory: every field comes back
// editable, with notes explaining what was and wasn't found, and the commit is
// a separate explicit step. An imperfect parse costs a correction, not bad data.
//
// Extraction runs server-side (unpdf bundles pdfjs) so the client bundle stays
// small — same reasoning as services/tableUpload.ts.
// ============================================================
import { extractText, getDocumentProxy } from 'unpdf';

export type AssessmentKind = 'ccat' | 'epp' | 'insights';
export type InsightColor = 'blue' | 'green' | 'yellow' | 'red';

export type ParsedCcatSection = { label: string; score: number | null; sortOrder: number };
export type ParsedEppAttribute = { name: string; st6Score: number | null; sortOrder: number };
export type ParsedInsightProfile = {
  color: InsightColor;
  consciousScore: number | null;
  lessConsciousScore: number | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type ParsedAssessment = {
  kind: AssessmentKind | 'unknown';
  fileName: string;
  detectedName: string | null;
  notes: string[];
  ccat: { sections: ParsedCcatSection[] } | null;
  epp: { profileName: string | null; score: number | null; attributes: ParsedEppAttribute[] } | null;
  insights: {
    insightsType: string | null;
    consciousWheel: string | null;
    lessWheel: string | null;
    preferenceFlow: number | null;
    completedAt: string | null;
    profiles: ParsedInsightProfile[];
  } | null;
  textPreview: string;
};

// ---------- text extraction ----------

/** Collapses the whitespace pdfjs emits between positioned text runs. */
function normalize(text: string): string {
  return text.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

const isPdf = (buf: Buffer) =>
  buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // "%PDF"

/**
 * Two readings of the same document.
 *
 * `flat` is what pdfjs hands back. It is right for prose but wrong for tables:
 * when report columns sit flush against each other pdfjs inserts no space
 * between them, so adjacent cells fuse — a real CCAT report yields
 * "PercentileRaw Score" for the header and, worse, "8837" for a row holding a
 * percentile of 88 and a raw score of 37. Neither is recoverable by regex.
 *
 * `split` is rebuilt from positioned text items: items are grouped into rows by
 * y, ordered by x, and joined with a space unconditionally, so every cell stays
 * a separate token. That fixes fused columns but can split a word pdfjs emitted
 * in two runs ("Assert" + "iveness").
 *
 * Each reading fails where the other succeeds, so the parsers run against both
 * and the better result wins (see pickBest). Nothing here guesses which layout
 * a given vendor uses.
 */
export type PdfReadings = { flat: string; split: string };

/** Rows of positioned text, top to bottom, cells left to right. */
function rowsToLines(items: Array<{ str: string; x: number; y: number }>): string {
  // Group by y with a tolerance — glyph runs on one visual line vary slightly.
  const Y_TOLERANCE = 2.5;
  const rows: Array<{ y: number; cells: Array<{ str: string; x: number }> }> = [];
  for (const it of items) {
    if (it.str.trim() === '') continue;
    const row = rows.find((r) => Math.abs(r.y - it.y) <= Y_TOLERANCE);
    if (row) row.cells.push({ str: it.str, x: it.x });
    else rows.push({ y: it.y, cells: [{ str: it.str, x: it.x }] });
  }
  rows.sort((a, b) => b.y - a.y); // PDF y grows upward
  return rows
    .map((r) => r.cells.sort((a, b) => a.x - b.x).map((c) => c.str.trim()).filter(Boolean).join(' '))
    .filter((l) => l !== '')
    .join('\n');
}

export async function extractPdfReadings(fileBase64: string, fileName: string): Promise<PdfReadings> {
  const buf = Buffer.from(fileBase64, 'base64');
  if (buf.length === 0) throw new Error('That file is empty.');
  if (!isPdf(buf)) {
    throw new Error(`"${fileName}" does not look like a PDF. Export the report as PDF and try again.`);
  }
  const pdf = await getDocumentProxy(new Uint8Array(buf));

  const { text } = await extractText(pdf, { mergePages: true });
  const flat = normalize(Array.isArray(text) ? text.join('\n') : String(text ?? ''));

  // Positioned pass, page by page.
  const positioned: string[] = [];
  const pageCount = pdf.numPages ?? 1;
  for (let p = 1; p <= pageCount; p++) {
    try {
      const page = await pdf.getPage(p);
      // NOTE: pdfjs fuses adjacent text runs into a single item before we see
      // them, and the old `disableCombineTextItems` escape hatch was removed in
      // pdfjs v4 — so truly flush cells ("PercentileRaw Score", "8837") cannot
      // be separated here at all. That case is handled downstream by
      // splitFusedNumber. This pass still earns its keep on layouts where the
      // cells DO have gaps but the flat reading interleaves columns, or where
      // reading order differs from visual order.
      const tc = await page.getTextContent();
      const items = (tc.items as any[])
        .filter((i) => typeof i?.str === 'string' && Array.isArray(i?.transform))
        .map((i) => ({ str: i.str as string, x: i.transform[4] as number, y: i.transform[5] as number }));
      positioned.push(rowsToLines(items));
    } catch {
      // A single unreadable page shouldn't lose the rest of the document.
    }
  }
  const split = normalize(positioned.join('\n'));

  if (flat.replace(/\s/g, '').length < 40 && split.replace(/\s/g, '').length < 40) {
    throw new Error(
      `"${fileName}" has no readable text — it is probably a scan or an image export. ` +
        `Download the original PDF from the vendor, or enter the values by hand.`,
    );
  }
  return { flat, split };
}

/** Back-compat single-string extraction (used by the detection helpers). */
export async function extractPdfText(fileBase64: string, fileName: string): Promise<string> {
  const { flat } = await extractPdfReadings(fileBase64, fileName);
  return flat;
}

// ---------- small extraction helpers ----------

/**
 * Finds a number that belongs to `label`. Vendor PDFs put the value to the
 * right of or below the label, and pdfjs flattens that to "label ... number",
 * so we take the first number within a short window after the label rather
 * than assuming an exact separator.
 */
function numberNear(
  text: string,
  label: string | RegExp,
  opts: { window?: number; min?: number; max?: number } = {},
): number | null {
  const { window = 60, min = 0, max = 100 } = opts;
  const src = typeof label === 'string' ? escapeRe(label) : label.source;
  const re = new RegExp(`${src}`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + window);
    // Every number in the window is a candidate, and the first one IN RANGE
    // wins — not simply the first one. A CCAT row reads "Overall 88 37":
    // 88 is the percentile and 37 is the raw score out of 50, so a raw-score
    // lookup has to step over 88 rather than give up on it.
    // Each candidate must be a WHOLE token. Anchoring with lookaround means a
    // fused cell like "8837" contributes no candidates at all, rather than
    // yielding the meaningless slice "883" or "7" — a blank the user can fill
    // beats a plausible-looking wrong number on someone's record.
    for (const num of tail.matchAll(/(?<![\d.])(\d{1,3})(?:\.\d+)?(?![\d])/g)) {
      const v = Number(num[1]);
      if (Number.isFinite(v) && v >= min && v <= max) return v;
    }
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** First capture group of the first matching pattern, trimmed. */
function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const v = m[1].replace(/\s+/g, ' ').trim();
      if (v) return v;
    }
  }
  return null;
}

/** Label plus any aliases the vendors use for the same row. */
type LabelSpec = { canonical: string; aliases: string[] };

function findLabelled(text: string, spec: LabelSpec, opts?: { max?: number }): number | null {
  for (const alias of [spec.canonical, ...spec.aliases]) {
    const v = numberNear(text, alias, { max: opts?.max ?? 100 });
    if (v !== null) return v;
  }
  return null;
}

/**
 * Recovers two values from a fused numeric cell.
 *
 * When report columns sit flush, pdfjs hands back one token: a percentile of 88
 * beside a raw score of 37 arrives as "8837". The boundary is unrecoverable
 * from the text alone — but not from the CONSTRAINTS. Of the three ways to cut
 * "8837", only 88|37 leaves both halves inside their permitted ranges
 * (percentile 0-100, raw 0-50); 8|837 and 883|7 both fail. So a unique valid
 * split is a safe inference.
 *
 * If several splits are valid the value is genuinely ambiguous and this returns
 * null, leaving the field blank for the user rather than guessing. Blank is
 * recoverable; a plausible wrong score on someone's record is not.
 */
export function splitFusedNumber(
  token: string,
  ranges: Array<{ firstMax: number; secondMax: number }>,
): { first: number; second: number } | null {
  if (!/^\d{3,6}$/.test(token)) return null;
  const found: Array<{ first: number; second: number }> = [];
  for (let cut = 1; cut < token.length; cut++) {
    const a = token.slice(0, cut);
    const b = token.slice(cut);
    // A leading zero on either half means we cut in the wrong place.
    if ((a.length > 1 && a[0] === '0') || (b.length > 1 && b[0] === '0')) continue;
    const av = Number(a);
    const bv = Number(b);
    for (const r of ranges) {
      if (av >= 0 && av <= r.firstMax && bv >= 0 && bv <= r.secondMax) {
        found.push({ first: av, second: bv });
      }
    }
  }
  const distinct = [...new Map(found.map((f) => [`${f.first}:${f.second}`, f])).values()];
  return distinct.length === 1 ? distinct[0] : null;
}

/** The fused token sitting after `label`, if any. */
function fusedTokenNear(text: string, label: RegExp, window = 40): string | null {
  const re = new RegExp(label.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + window);
    const tok = tail.match(/(?<![\d.])(\d{3,6})(?![\d])/);
    if (tok) return tok[1];
  }
  return null;
}

// ---------- report-type detection ----------

const KIND_SIGNALS: Record<AssessmentKind, RegExp[]> = {
  insights: [/insights\s+discovery/i, /colou?r\s+dynamics/i, /preference\s+flow/i, /wheel\s+position/i],
  ccat: [/criteria\s+cognitive\s+aptitude/i, /\bccat\b/i, /math\s*(?:&|and)\s*logic/i, /out\s+of\s+50/i],
  epp: [/employee\s+personality\s+profile/i, /\bepp\b/i, /stress\s+tolerance/i, /\bcooperativeness\b/i],
};

export function detectKind(text: string): { kind: AssessmentKind | 'unknown'; scores: Record<AssessmentKind, number> } {
  const scores = { ccat: 0, epp: 0, insights: 0 } as Record<AssessmentKind, number>;
  for (const k of Object.keys(KIND_SIGNALS) as AssessmentKind[]) {
    scores[k] = KIND_SIGNALS[k].filter((re) => re.test(text)).length;
  }
  const best = (Object.keys(scores) as AssessmentKind[]).sort((a, b) => scores[b] - scores[a])[0];
  return { kind: scores[best] > 0 ? best : 'unknown', scores };
}

/** Candidate/participant name, used to warn on a person mismatch. */
export function detectName(text: string): string | null {
  return firstMatch(text.slice(0, 1500), [
    // The separator is optional: plenty of reports print "Candidate  Jane Doe"
    // in two table cells with no colon between them. A label word that leaks
    // into the capture ("Employee Personality Profile") is caught downstream by
    // looksLikeHeading.
    /(?:candidate|participant|employee|prepared\s+for|name)\s*[:\-–]?\s*([A-Z][A-Za-z'’\-]+(?: [A-Z][A-Za-z'’\-]+){1,2})/i,
    /^\s*([A-Z][A-Za-z'’\-]+(?: [A-Z][A-Za-z'’\-]+){1,2})\s*$/m,
  ]);
}

// ---------- CCAT ----------

const CCAT_SUBS: Array<LabelSpec & { sortOrder: number }> = [
  { canonical: 'Spatial Reasoning', aliases: ['Spatial'], sortOrder: 10 },
  { canonical: 'Verbal Ability', aliases: ['Verbal'], sortOrder: 20 },
  { canonical: 'Math & Logic', aliases: ['Math and Logic', 'Math &Logic', 'Math/Logic', 'Math'], sortOrder: 30 },
];

// The card shows the sub-score label as-is, so keep the short forms the
// Organization → Assessments card was designed around.
const CCAT_DISPLAY: Record<string, string> = {
  'Spatial Reasoning': 'Spatial',
  'Verbal Ability': 'Verbal',
  'Math & Logic': 'Math & Logic',
};

export function parseCcat(text: string): { sections: ParsedCcatSection[]; notes: string[] } {
  const notes: string[] = [];
  const sections: ParsedCcatSection[] = [];

  // Overall is the RAW score out of 50 — not a percentile. Never coerce it to 0-100.
  const raw =
    numberNear(text, /raw\s+score/i, { max: 50 }) ??
    firstMatch(text, [/(\d{1,2})\s*(?:out\s+of|\/)\s*50/i])?.match(/\d+/)?.[0] ??
    null;
  let rawNum = raw === null ? null : Number(raw);

  // Fused-column recovery: "Overall 8837" is a percentile and a raw score in
  // adjacent flush cells. Try both column orders and accept only a unique fit.
  if (rawNum === null) {
    const fused = fusedTokenNear(text, /overall/i) ?? fusedTokenNear(text, /raw\s+score/i);
    if (fused) {
      const split = splitFusedNumber(fused, [
        { firstMax: 100, secondMax: 50 }, // Percentile then Raw Score
        { firstMax: 50, secondMax: 100 }, // Raw Score then Percentile
      ]);
      if (split) {
        // Whichever half is <= 50 and cannot be the percentile is the raw score;
        // when both fit, the pair came from the unique split so take the one
        // matching the /50 scale.
        rawNum = split.second <= 50 ? split.second : split.first;
        notes.push(`CCAT overall raw score read as ${rawNum} out of a merged "${fused}" — the report's columns ran together, so please confirm it.`);
      } else {
        notes.push(`CCAT overall raw score could not be separated from the merged value "${fused}" — enter it by hand.`);
      }
    }
  }
  if (rawNum === null && !notes.some((n) => n.includes('overall raw score'))) {
    notes.push('CCAT overall raw score (out of 50) not found — enter it by hand.');
  }
  sections.push({ label: 'Overall', score: rawNum, sortOrder: 0 });

  for (const sub of CCAT_SUBS) {
    const v = findLabelled(text, sub);
    if (v === null) notes.push(`CCAT "${CCAT_DISPLAY[sub.canonical]}" percentile not found.`);
    sections.push({ label: CCAT_DISPLAY[sub.canonical], score: v, sortOrder: sub.sortOrder });
  }
  return { sections, notes };
}

// ---------- EPP ----------

// Criteria's 12 EPP traits, in the order the existing records use.
const EPP_TRAITS: LabelSpec[] = [
  { canonical: 'Achievement', aliases: [] },
  { canonical: 'Assertiveness', aliases: [] },
  { canonical: 'Competitiveness', aliases: [] },
  { canonical: 'Conscientiousness', aliases: [] },
  { canonical: 'Cooperativeness', aliases: ['Cooperation'] },
  { canonical: 'Extroversion', aliases: ['Extraversion'] },
  { canonical: 'Managerial', aliases: ['Managerial Potential'] },
  { canonical: 'Motivation', aliases: [] },
  { canonical: 'Openness', aliases: ['Openness to Experience'] },
  { canonical: 'Patience', aliases: [] },
  { canonical: 'Self-Confidence', aliases: ['Self Confidence', 'Self-confidence'] },
  { canonical: 'Stress Tolerance', aliases: ['Stress-Tolerance'] },
];

export function parseEpp(text: string): {
  profileName: string | null;
  score: number | null;
  attributes: ParsedEppAttribute[];
  notes: string[];
} {
  const notes: string[] = [];
  const attributes: ParsedEppAttribute[] = [];
  let found = 0;

  EPP_TRAITS.forEach((t, i) => {
    const v = findLabelled(text, t);
    if (v !== null) found++;
    attributes.push({ name: t.canonical, st6Score: v, sortOrder: (i + 1) * 10 });
  });

  if (found === 0) notes.push('No EPP trait percentiles were found — check this is the EPP report.');
  else if (found < EPP_TRAITS.length) notes.push(`${EPP_TRAITS.length - found} of ${EPP_TRAITS.length} EPP traits not found — fill the blanks in.`);

  const profileName = firstMatch(text, [
    /job\s*match(?:\s*profile)?\s*[:\-–]\s*([A-Z][A-Za-z,&'’\-/ ]{4,60})/i,
    /profile\s*[:\-–]\s*([A-Z][A-Za-z,&'’\-/ ]{4,60})/i,
  ]);
  if (!profileName) notes.push('EPP profile name not found — enter it by hand (e.g. "Analysis, Planning & Consulting").');

  const score = numberNear(text, /job\s*match\s*score/i) ?? numberNear(text, /overall\s*(?:score|match)/i);
  if (score === null) notes.push('EPP badge score not found.');

  return { profileName, score, attributes, notes };
}

// ---------- Insights Discovery ----------

const INSIGHT_ORDER: InsightColor[] = ['blue', 'green', 'yellow', 'red'];

const INSIGHT_TYPES = [
  'Director', 'Motivator', 'Inspirer', 'Helper',
  'Supporter', 'Coordinator', 'Observer', 'Reformer',
];

/**
 * Colour Dynamics reports each energy twice — once conscious ("Persona"), once
 * less conscious. pdfjs flattens both blocks into one string, so split on the
 * "less conscious" heading and read each side independently rather than
 * guessing from match order alone.
 */
export function parseInsights(text: string): {
  insightsType: string | null;
  consciousWheel: string | null;
  lessWheel: string | null;
  preferenceFlow: number | null;
  completedAt: string | null;
  profiles: ParsedInsightProfile[];
  notes: string[];
} {
  const notes: string[] = [];

  // Scope to the Colour Dynamics section first. "Less Conscious Wheel Position"
  // appears in the header, well above the energies, so splitting on the first
  // "less conscious" in the whole document lands on the wrong line and reads
  // the conscious column as the less-conscious one.
  const dynIdx = text.search(/colou?r\s+dynamics/i);
  const region = dynIdx >= 0 ? text.slice(dynIdx) : text;
  if (dynIdx < 0) {
    notes.push('No "Colour Dynamics" section found — verify both columns of percentages.');
  }
  const relIdx = region.search(/less\s*[-\s]?conscious/i);
  const consciousBlock = relIdx > 0 ? region.slice(0, relIdx) : region;
  const lessBlock = relIdx > 0 ? region.slice(relIdx) : '';
  if (relIdx < 0) {
    notes.push('Could not tell the conscious and less-conscious blocks apart — check both columns of percentages.');
  }

  const readColors = (block: string): Record<InsightColor, number | null> => {
    const out = { blue: null, green: null, yellow: null, red: null } as Record<InsightColor, number | null>;
    for (const c of INSIGHT_ORDER) {
      out[c] = numberNear(block, new RegExp(`\\b${c}\\b`, 'i'), { window: 40 });
    }
    return out;
  };

  const cons = readColors(consciousBlock);
  const less = lessBlock ? readColors(lessBlock) : { blue: null, green: null, yellow: null, red: null };

  const missing = INSIGHT_ORDER.filter((c) => cons[c] === null);
  if (missing.length) notes.push(`Conscious colour energy not found for: ${missing.join(', ')}.`);

  // Lead colour = highest conscious energy; drives the badge dot on the card.
  const ranked = [...INSIGHT_ORDER].sort((a, b) => (cons[b] ?? -1) - (cons[a] ?? -1));
  const lead = cons[ranked[0]] === null ? null : ranked[0];

  const profiles: ParsedInsightProfile[] = INSIGHT_ORDER.map((c, i) => ({
    color: c,
    consciousScore: cons[c],
    lessConsciousScore: less[c],
    isPrimary: c === lead,
    sortOrder: (i + 1) * 10,
  }));

  const typeRe = new RegExp(`\\b((?:${INSIGHT_TYPES.join('|')})|(?:\\w+ing\\s+(?:${INSIGHT_TYPES.join('|')})))\\b`);
  const insightsType = firstMatch(text, [
    /insights\s+discovery\s+profile\s*[:\-–]?\s*([A-Z][A-Za-z ]{3,40})/i,
    typeRe,
  ]);
  if (!insightsType) notes.push('Insights persona type not found (e.g. "Reforming Director").');

  const consciousWheel = firstMatch(text, [
    /conscious\s+wheel\s+position\s*[:\-–]?\s*([0-9]{0,2}\s*[A-Za-z][A-Za-z ]{2,40})/i,
  ]);
  const lessWheel = firstMatch(text, [
    /less\s*[-\s]?conscious\s+wheel\s+position\s*[:\-–]?\s*([0-9]{0,2}\s*[A-Za-z][A-Za-z ]{2,40})/i,
  ]);
  const preferenceFlow = numberNear(text, /preference\s+flow/i);

  const completedAt = normalizeDate(
    firstMatch(text, [
      /(?:date|completed|profile\s+date)\s*[:\-–]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /(?:date|completed)\s*[:\-–]\s*(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
    ]),
  );

  return { insightsType, consciousWheel, lessWheel, preferenceFlow, completedAt, profiles, notes };
}

/** Vendor dates arrive as "12 March 2026" or ISO; the column is a DATE. */
export function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ---------- orchestration ----------

/** How much a parse actually recovered — used to choose between the two readings. */
function scoreParsed(p: ParsedAssessment): number {
  let found = 0;
  if (p.ccat) found += p.ccat.sections.filter((s) => s.score !== null).length;
  if (p.epp) {
    found += p.epp.attributes.filter((a) => a.st6Score !== null).length;
    if (p.epp.profileName) found += 1;
    if (p.epp.score !== null) found += 1;
  }
  if (p.insights) {
    found += p.insights.profiles.filter((x) => x.consciousScore !== null).length;
    found += p.insights.profiles.filter((x) => x.lessConsciousScore !== null).length;
    if (p.insights.insightsType) found += 1;
    if (p.insights.preferenceFlow !== null) found += 1;
  }
  // A detected name is worth something, but never enough to outweigh real data.
  if (p.detectedName) found += 0.5;
  return found;
}

function parseOneReading(text: string, kind: AssessmentKind | 'unknown', fileName: string): ParsedAssessment {
  const out: ParsedAssessment = {
    kind, fileName, detectedName: detectName(text), notes: [],
    ccat: null, epp: null, insights: null, textPreview: text.slice(0, 1200),
  };
  if (kind === 'ccat') {
    const r = parseCcat(text);
    out.ccat = { sections: r.sections };
    out.notes.push(...r.notes);
  } else if (kind === 'epp') {
    const r = parseEpp(text);
    out.epp = { profileName: r.profileName, score: r.score, attributes: r.attributes };
    out.notes.push(...r.notes);
  } else if (kind === 'insights') {
    const r = parseInsights(text);
    out.insights = {
      insightsType: r.insightsType, consciousWheel: r.consciousWheel, lessWheel: r.lessWheel,
      preferenceFlow: r.preferenceFlow, completedAt: r.completedAt, profiles: r.profiles,
    };
    out.notes.push(...r.notes);
  }
  return out;
}

export async function parseAssessmentPdf(
  fileBase64: string,
  fileName: string,
  kindOverride?: AssessmentKind,
): Promise<ParsedAssessment> {
  const { flat, split } = await extractPdfReadings(fileBase64, fileName);

  // Detect against both readings — a fused header ("PercentileRaw Score") can
  // hide a signal that the positioned reading exposes.
  const detFlat = detectKind(flat);
  const detSplit = detectKind(split);
  const detected: AssessmentKind | 'unknown' =
    detFlat.kind !== 'unknown' ? detFlat.kind : detSplit.kind;
  const kind = kindOverride ?? detected;

  if (kind === 'unknown') {
    const out = parseOneReading(split || flat, 'unknown', fileName);
    out.notes.push('Could not tell which report this is. Pick the assessment type by hand and upload again.');
    return out;
  }

  // Parse both readings and keep whichever recovered more.
  const candidates = [parseOneReading(split, kind, fileName), parseOneReading(flat, kind, fileName)];
  const best = candidates[0];
  const other = candidates[1];
  const winner = scoreParsed(other) > scoreParsed(best) ? other : best;

  if (kindOverride && detected !== 'unknown' && detected !== kindOverride) {
    winner.notes.push(`This file looks like a ${detected.toUpperCase()} report but you selected ${kindOverride.toUpperCase()} — check before saving.`);
  }

  // A name that is obviously a table header rather than a person is worse than
  // no name at all — it makes the mismatch warning cry wolf.
  if (winner.detectedName && looksLikeHeading(winner.detectedName)) {
    winner.detectedName = null;
  }

  return winner;
}

/** Filters table headings that the "two capitalised words" pattern picks up. */
export function looksLikeHeading(v: string): boolean {
  const HEADING_WORDS = /\b(percentile|raw|score|scores|summary|report|profile|candidate|assessment|result|results|test|overall|total|section|sections|page|name|date|invited|completed|aptitude|criteria|cognitive|personality|employee|insights|discovery|dynamics|conscious|persona|attribute|attributes|trait|traits|rank|ranking|norm|group)\b/i;
  return HEADING_WORDS.test(v);
}
