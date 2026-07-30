// Unit tests for the assessment PDF parsers. These exercise the TEXT layer, not
// pdfjs — the extraction step is a thin wrapper, the risk lives in the label
// matching. Fixtures below mimic how pdfjs flattens a vendor report: labels and
// values on adjacent lines, percent signs and stray whitespace intact.
// Run: npx tsx server/src/services/assessmentPdf.test.ts
import { readFileSync } from 'fs';
import {
  detectKind, detectName, parseCcat, parseEpp, parseInsights,
  normalizeDate, parseAssessmentPdf, looksLikeHeading, extractPdfReadings,
  splitFusedNumber,
} from './assessmentPdf.js';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};

// ---------- fixtures ----------

const CCAT_TEXT = `
Criteria Cognitive Aptitude Test (CCAT)
Candidate: Brooke Friedman
Date: 12 March 2026
Raw Score: 37 out of 50
Percentile: 88
Subscores
Verbal Ability 95
Math & Logic 85
Spatial Reasoning 96
`;

const EPP_TEXT = `
Employee Personality Profile (EPP)
Candidate: Brooke Friedman
Job Match Profile: Analysis, Planning & Consulting
Job Match Score: 84
Achievement 89
Assertiveness 95
Competitiveness 85
Conscientiousness 96
Cooperativeness 1
Extroversion 42
Managerial 64
Motivation 83
Openness 86
Patience 18
Self-Confidence 87
Stress Tolerance 21
`;

const INSIGHTS_TEXT = `
Insights Discovery Personal Profile
Name: Brooke Friedman
Date: 4 June 2026
Insights Discovery Profile: Reforming Director
Conscious Wheel Position: 7 Reforming Director (Accommodating)
Less Conscious Wheel Position: 8 Reforming Director
Preference Flow 22
Colour Dynamics
Persona (Conscious)
Blue 59%
Green 9%
Yellow 21%
Red 97%
Persona (Less Conscious)
Blue 79%
Green 3%
Yellow 41%
Red 91%
`;

// ---------- detection ----------

eq('detect ccat', detectKind(CCAT_TEXT).kind, 'ccat');
eq('detect epp', detectKind(EPP_TEXT).kind, 'epp');
eq('detect insights', detectKind(INSIGHTS_TEXT).kind, 'insights');
eq('detect unknown', detectKind('Quarterly revenue summary for the board').kind, 'unknown');

eq('name from candidate label', detectName(CCAT_TEXT), 'Brooke Friedman');
eq('name from name label', detectName(INSIGHTS_TEXT), 'Brooke Friedman');

// ---------- CCAT ----------

const ccat = parseCcat(CCAT_TEXT);
eq('ccat always emits the same five rows in the same order',
  ccat.sections.map((s) => s.label), ['Overall', 'Overall Percentile', 'Spatial', 'Verbal', 'Math & Logic']);
eq('ccat overall is the RAW /50 score, not the percentile', ccat.sections[0], { label: 'Overall', score: 37, sortOrder: 0 });
eq('ccat sub-score percentiles', ccat.sections.slice(2).map((s) => s.score), [96, 95, 85]);

// missing data is reported, not invented — and the rows are still all present
const ccatThin = parseCcat('Criteria Cognitive Aptitude Test\nVerbal Ability 70\n');
eq('ccat thin parse still emits five rows', ccatThin.sections.length, 5);
eq('ccat missing raw -> null', ccatThin.sections[0].score, null);
eq('ccat found what it could', ccatThin.sections.find((s) => s.label === 'Verbal')?.score, 70);

// The bar-chart x-axis (1..50) sits right after the "Raw Score" SECTION heading.
// Anchoring there returned 1 with total confidence; the prose must win instead.
const axisTrap = 'Criteria Cognitive Aptitude Test\nRaw Score\n1 2 3 4 5 6 7 8 9 10\n' +
  'Brooke Friedman achieved an overall score of 37, which means Brooke answered 37 questions correctly. ' +
  'This corresponds to a percentile rank of 89.\n';
eq('chart axis does not become the raw score', parseCcat(axisTrap).sections[0].score, 37);
eq('overall percentile comes from the prose', parseCcat(axisTrap).sections[1].score, 89);
eq('name comes from the summary sentence', detectName(axisTrap), 'Brooke Friedman');

// Side-by-side sub-score cards: the three labels appear on one line, so a loose
// window after "Verbal Ability" reaches the NEXT card's number first.
const cards = 'Criteria Cognitive Aptitude Test\nSpatial Reasoning\nPercentile 96 Verbal Ability\nPercentile 95 Math & Logic\nPercentile 85\n';
eq('each card keeps its own number', parseCcat(cards).sections.slice(2).map((s) => s.score), [96, 95, 85]);

// ---------- EPP ----------

const epp = parseEpp(EPP_TEXT);
eq('epp finds all 12 traits', epp.attributes.filter((a) => a.st6Score !== null).length, 12);
eq('epp trait order + values', epp.attributes.slice(0, 3), [
  { name: 'Achievement', st6Score: 89, sortOrder: 10 },
  { name: 'Assertiveness', st6Score: 95, sortOrder: 20 },
  { name: 'Competitiveness', st6Score: 85, sortOrder: 30 },
]);
eq('epp keeps a legitimate low score', epp.attributes.find((a) => a.name === 'Cooperativeness')?.st6Score, 1);
eq('epp profile name', epp.profileName, 'Analysis, Planning & Consulting');
eq('epp badge score', epp.score, 84);
eq('epp clean parse has no notes', epp.notes, []);

// alias handling: Extraversion / Self Confidence / Cooperation
const eppAlias = parseEpp('EPP\nExtraversion 55\nSelf Confidence 61\nCooperation 44\n');
eq('epp alias Extraversion', eppAlias.attributes.find((a) => a.name === 'Extroversion')?.st6Score, 55);
eq('epp alias Self Confidence', eppAlias.attributes.find((a) => a.name === 'Self-Confidence')?.st6Score, 61);
eq('epp alias Cooperation', eppAlias.attributes.find((a) => a.name === 'Cooperativeness')?.st6Score, 44);

// ---------- Insights ----------

const ins = parseInsights(INSIGHTS_TEXT);
eq('insights conscious energies', ins.profiles.map((p) => [p.color, p.consciousScore]), [
  ['blue', 59], ['green', 9], ['yellow', 21], ['red', 97],
]);
eq('insights less-conscious energies read from the second block', ins.profiles.map((p) => p.lessConsciousScore), [79, 3, 41, 91]);
eq('insights lead colour = highest conscious', ins.profiles.find((p) => p.isPrimary)?.color, 'red');
eq('insights persona type', ins.insightsType, 'Reforming Director');
eq('insights preference flow', ins.preferenceFlow, 22);
eq('insights completed date normalized', ins.completedAt, '2026-06-04');
// The wheel position keeps its variant in brackets — that is part of the value.
eq('insights conscious wheel', ins.consciousWheel, '7 Reforming Director (Accommodating)');
eq('insights less conscious wheel', ins.lessWheel, '8 Reforming Director');

// one colour block only -> less-conscious stays null and it says so
const insOne = parseInsights('Insights Discovery\nColour Dynamics\nBlue 50%\nGreen 20%\nYellow 10%\nRed 80%\n');
eq('insights single block -> nulls', insOne.profiles.map((p) => p.lessConsciousScore), [null, null, null, null]);
eq('insights single block warns', insOne.notes.some((n) => /less-conscious colour energies not found/i.test(n)), true);

// ---------- dates ----------

eq('date iso passthrough', normalizeDate('2026-01-09'), '2026-01-09');
eq('date long form', normalizeDate('9 January 2026'), '2026-01-09');
eq('date junk -> null', normalizeDate('sometime last spring'), null);
eq('date null -> null', normalizeDate(null), null);

// ---------- non-PDF rejection ----------

await parseAssessmentPdf(Buffer.from('not a pdf at all').toString('base64'), 'notes.txt')
  .then(() => { console.log('FAIL non-PDF should reject'); fails++; })
  .catch((e: Error) => eq('non-PDF rejected with a plain-English reason', /does not look like a PDF/.test(e.message), true));

// ---------- fused table columns (the real-report failure) ----------
// A CCAT row holding a percentile of 88 and a raw score of 37 fuses to "8837"
// in the flat reading when the columns sit flush. The percentile must not be
// mistaken for the raw score, and the raw score must still be found.
eq('raw-score lookup steps over an out-of-range percentile',
  parseCcat('Criteria Cognitive Aptitude Test\nRaw Score\nOverall 88 37\n').sections[0].score, 37);
eq('a percentile alone is not accepted as a raw score',
  parseCcat('Criteria Cognitive Aptitude Test\nRaw Score\nOverall 88\n').sections[0].score, null);

// ---------- heading filter ----------
eq('table header rejected as a name', looksLikeHeading('PercentileRaw Score'), true);
eq('section heading rejected as a name', looksLikeHeading('Score Summary'), true);
eq('a real name is not a heading', looksLikeHeading('Brooke Friedman'), false);

// ---------- positioned extraction beats fused columns, end to end ----------
// /tmp/ccat_glued.pdf is generated with columns positioned flush, reproducing
// the vendor layout that fused into "PercentileRaw Score" and "8837".
try {
  const glued = readFileSync('/tmp/ccat_glued.pdf').toString('base64');
  const readings = await extractPdfReadings(glued, 'glued.pdf');
  // pdfjs fuses flush runs upstream and v4 removed disableCombineTextItems, so
  // NEITHER reading can separate them. Asserted so the limitation is recorded
  // rather than rediscovered.
  eq('flat reading fuses the header', /PercentileRaw Score/.test(readings.flat), true);
  eq('positioned reading fuses it too (pdfjs merges upstream)', /PercentileRaw Score/.test(readings.split), true);

  const r = await parseAssessmentPdf(glued, 'glued.pdf');
  eq('fused-column PDF: kind', r.kind, 'ccat');
  eq('fused-column PDF: raw /50 recovered by constrained split', r.ccat?.sections[0].score, 37);
  eq('fused-column PDF: recovery is flagged for confirmation',
    r.notes.some((n) => /columns ran together/.test(n)), true);
  eq('fused-column PDF: sub-scores recovered',
    r.ccat?.sections.slice(2).map((x) => x.score), [96, 95, 85]);
  eq('fused-column PDF: header not mistaken for a name', r.detectedName, 'Brooke Friedman');
} catch (e) {
  console.log(`SKIP fused-column PDF test (fixture missing): ${(e as Error).message}`);
}

// ---------- constrained split of a fused numeric cell ----------
eq('unique valid split accepted', splitFusedNumber('8837', [{ firstMax: 100, secondMax: 50 }]), { first: 88, second: 37 });
// 4545 under (100,100) has exactly ONE valid cut (45|45) — 4|545 and 454|5 both
// bust the range — so it is recovered, not refused.
eq('single valid cut wins even when the halves match', splitFusedNumber('4545', [{ firstMax: 100, secondMax: 100 }]), { first: 45, second: 45 });
// 1234 under (1000,1000) genuinely cuts three ways — that is ambiguous.
eq('ambiguous split refused', splitFusedNumber('1234', [{ firstMax: 1000, secondMax: 1000 }]), null);
// 88|07 is skipped for the leading zero, leaving 880|7 as the only valid cut.
eq('leading-zero cut skipped, valid cut still found', splitFusedNumber('8807', [{ firstMax: 1000, secondMax: 50 }]), { first: 880, second: 7 });
// No cut fits percentile/raw ranges, so nothing is invented.
eq('no valid cut -> null', splitFusedNumber('8807', [{ firstMax: 100, secondMax: 50 }]), null);
eq('too short to be fused', splitFusedNumber('88', [{ firstMax: 100, secondMax: 50 }]), null);
eq('non-numeric refused', splitFusedNumber('88a7', [{ firstMax: 100, secondMax: 50 }]), null);

// ---------- the real Criteria CCAT layout, end to end ----------
// /tmp/ccat_real.pdf replicates the actual vendor report: name in the header,
// a Results Summary box with the numbers ABOVE their labels, a 1..50 chart
// axis, the summary sentence, and three side-by-side sub-score cards.
try {
  const real = readFileSync('/tmp/ccat_real.pdf').toString('base64');
  const r = await parseAssessmentPdf(real, 'ccat_real.pdf');
  eq('real layout: kind', r.kind, 'ccat');
  eq('real layout: name', r.detectedName, 'Brooke Friedman');
  eq('real layout: every value correct',
    r.ccat?.sections.map((s) => [s.label, s.score]),
    [['Overall', 37], ['Overall Percentile', 89], ['Spatial', 96], ['Verbal', 95], ['Math & Logic', 85]]);
  eq('real layout: nothing to flag', r.notes, []);
} catch (e) {
  console.log(`SKIP real-layout PDF test (fixture missing): ${(e as Error).message}`);
}


// ============================================================
// REAL VENDOR LAYOUTS
//
// The text below reproduces what pdfjs actually returns for genuine Criteria
// and Insights Discovery reports — verified against real files during the
// 07-30-26 build session. The person's name is substituted; the STRUCTURE and
// the values are as they really arrive, which is the part that matters:
//
//  * the stream is ordered by DRAWING order, not reading order, so headers,
//    body copy and values appear in an order that looks scrambled;
//  * score values arrive with NO adjacent labels at all — the labels live in
//    the page graphics. A CCAT's sub-scores are a bare "96 95 85"; an EPP's
//    twelve traits are a bare column of numbers;
//  * flush cells fuse: "PercentileRaw Score", "97%100", "91%Conscious",
//    "100806040200" (an axis reading 100 80 60 40 20 0).
//
// Any parser change must keep these three passing.
// ============================================================

const REAL_CCAT = `PercentileRaw Score
The CCAT measures cognitive aptitude, or general intelligence. This test provides
Ability to reason using numbers and
numerical concepts. Also measures
logic and analytical thinking.
Reasoning and comprehension of
words, constructive thinking, and
attention to detail.
Ability to visualize, make spatial
judgements, and problem solve;
correlated to general intelligence.Test Person
Position: Solovis-CCAT Only
Test Date: Jun 07, 2026
Test Event ID: STP-9MYd-WDcs-XvXGj | Test Ver: 1.0
37 89
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50
Test Person achieved an overall score of 37, which means Test answered 37 questions correctly. This corresponds to a
percentile rank of 89, meaning Test scored better than 89% of the people who have taken this test. Below are details of how Test
performed in specific sub categories.
96 95 85
Friedman - CCAT Score Report - Page 1 Copyright © 2005-2026, Criteria Corp. All Rights Reserved.
Suggested CCAT Score Ranges by Position
Test Person | Score: 37
Accounting (Range: 20-50) 0 10 20 30 40 50
In Range
Analyst (Range: 22-50) 0 10 20 30 40 50
In Range`;

const REAL_EPP = `Test Person
Position: Legacy-Solovis-CCAT
Test Date: Jun 07, 2026
Test Event ID: STP-wvhj-cXFC-iD1rF | Test Ver: 1.0The EPP is a personality assessment that measures twelve traits.
Impulsive Goal-Oriented
100806040200
Deferential Forceful,
Dominant100806040200
Relaxed Competitive
100806040200
No Job Family
Selected
89
95
85
96
1
42
64
83
86
18
87
21
Friedman - EPP Score Report - Page 1 Copyright © 2005-2026, Criteria Corp. All Rights Reserved.
Managerial Percentile
Motivation Percentile
Achievement Percentile
Assertiveness PercentileThe Achievement (ACH) scale score reflects an individual's ability to follow
through and complete tasks. The ACH score in the 89th percentile for this person indicates he or
she consistently achieves and follows through.
89
The Assertiveness (AST) scale score provides a gauge of directness. This
person's AST score in the 95th percentile indicates an individual who is
likely to be highly assertive.
95
The Cooperativeness (COP) score indicates comfort working with others. This COP score in
the 1st percentile suggests that this person is likely to be strongly
committed to his or her own views.
1
The Inconsistent Responding (INC) score was in the 99th percentile.`;

const REAL_INSIGHTS = `Test Person
20 March 2024
Foundation Chapter
Personal Details
Test Person
Date Completed: 20 March 2024
Date Printed: 20 March 2024
Referral Code: ST6
This Insights Discovery profile is based on Test Person's responses to the Insights
Preference Evaluator which was completed on 20 March 2024.
The Insights Discovery® 72 Type Wheel
Conscious Wheel Position
22: Reforming Director (Classic)
Less Conscious Wheel Position
22: Reforming Director (Classic)
Test Person
© The Insights Group Ltd, 1992-2024. All rights reserved. Page 21
The Insights Discovery® Colour Dynamics
Persona (Conscious) Preference Flow Persona (Less Conscious)6
3
0
BLUE GREEN YELLOW RED
3.52 0.56 1.28 5.80
59% 9% 21% 97%100
50
0
50
100
-15.1%6
3
0
BLUE GREEN YELLOW RED
4.72 0.20 2.48 5.44
79% 3% 41% 91%Conscious
Less Conscious`;

// ---- real CCAT ----
eq('REAL CCAT: detected as ccat', detectKind(REAL_CCAT).kind, 'ccat');
eq('REAL CCAT: name from the summary sentence, not the fused header', detectName(REAL_CCAT), 'Test Person');
{
  const r = parseCcat(REAL_CCAT);
  eq('REAL CCAT: all five values', r.sections.map((x) => [x.label, x.score]),
    [['Overall', 37], ['Overall Percentile', 89], ['Spatial', 96], ['Verbal', 95], ['Math & Logic', 85]]);
  // The 1..50 chart axis and the "(Range: 20-50) 0 10 20 30 40 50" rows must not
  // be mistaken for the sub-score row, which is the only row of exactly three.
  eq('REAL CCAT: order flagged for confirmation since the report omits labels',
    r.notes.some((n) => /without labels/.test(n)), true);
}

// ---- real EPP ----
eq('REAL EPP: detected as epp', detectKind(REAL_EPP).kind, 'epp');
{
  const r = parseEpp(REAL_EPP);
  eq('REAL EPP: all twelve traits in canonical order',
    r.attributes.map((a) => a.st6Score), [89, 95, 85, 96, 1, 42, 64, 83, 86, 18, 87, 21]);
  eq('REAL EPP: a genuine 1st-percentile score survives',
    r.attributes.find((a) => a.name === 'Cooperativeness')?.st6Score, 1);
  // "Inconsistent Responding (INC) ... 99th percentile" is a validity scale, not
  // one of the twelve, and must never be mapped onto a trait.
  eq('REAL EPP: the INC validity scale is not mapped',
    r.attributes.some((a) => a.st6Score === 99), false);
  eq('REAL EPP: no job family is reported as a fact, not a failure',
    r.notes.some((n) => /without a job family/.test(n)), true);
  eq('REAL EPP: profile name left empty', r.profileName, null);
}

// ---- real Insights ----
eq('REAL INSIGHTS: detected as insights', detectKind(REAL_INSIGHTS).kind, 'insights');
{
  const r = parseInsights(REAL_INSIGHTS);
  eq('REAL INSIGHTS: conscious energies', r.profiles.map((x) => x.consciousScore), [59, 9, 21, 97]);
  eq('REAL INSIGHTS: less-conscious energies', r.profiles.map((x) => x.lessConsciousScore), [79, 3, 41, 91]);
  eq('REAL INSIGHTS: lead colour', r.profiles.find((x) => x.isPrimary)?.color, 'red');
  eq('REAL INSIGHTS: persona type from the wheel position', r.insightsType, 'Reforming Director');
  eq('REAL INSIGHTS: conscious wheel', r.consciousWheel, '22: Reforming Director (Classic)');
  eq('REAL INSIGHTS: negative preference flow', r.preferenceFlow, -15.1);
  eq('REAL INSIGHTS: completion date', r.completedAt, '2024-03-20');
  eq('REAL INSIGHTS: nothing to flag', r.notes, []);
}

console.log(fails === 0 ? '\nAll assessment PDF parser tests passed.' : `\n${fails} test(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
