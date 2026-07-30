// Unit tests for the assessment PDF parsers. These exercise the TEXT layer, not
// pdfjs — the extraction step is a thin wrapper, the risk lives in the label
// matching. Fixtures below mimic how pdfjs flattens a vendor report: labels and
// values on adjacent lines, percent signs and stray whitespace intact.
// Run: npx tsx server/src/services/assessmentPdf.test.ts
import {
  detectKind, detectName, parseCcat, parseEpp, parseInsights,
  normalizeDate, parseAssessmentPdf,
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
eq('ccat overall is the RAW /50 score, not the percentile', ccat.sections[0], { label: 'Overall', score: 37, sortOrder: 0 });
eq('ccat subs use the card labels + percentiles', ccat.sections.slice(1), [
  { label: 'Spatial', score: 96, sortOrder: 10 },
  { label: 'Verbal', score: 95, sortOrder: 20 },
  { label: 'Math & Logic', score: 85, sortOrder: 30 },
]);
eq('ccat clean parse has no notes', ccat.notes, []);

// "37/50" phrasing instead of "Raw Score:"
eq('ccat raw from x/50 phrasing', parseCcat('CCAT\nScored 41/50 overall\nVerbal Ability 70\n').sections[0].score, 41);
// missing data is reported, not invented
const ccatThin = parseCcat('Criteria Cognitive Aptitude Test\nVerbal Ability 70\n');
eq('ccat missing raw -> null + note', ccatThin.sections[0].score, null);
eq('ccat missing subs noted', ccatThin.notes.length, 3);

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
eq('insights conscious wheel', ins.consciousWheel, '7 Reforming Director');
eq('insights less conscious wheel', ins.lessWheel, '8 Reforming Director');

// one colour block only -> less-conscious stays null and it says so
const insOne = parseInsights('Insights Discovery\nColour Dynamics\nBlue 50%\nGreen 20%\nYellow 10%\nRed 80%\n');
eq('insights single block -> nulls', insOne.profiles.map((p) => p.lessConsciousScore), [null, null, null, null]);
eq('insights single block warns', insOne.notes.some((n) => /tell the conscious/i.test(n)), true);

// ---------- dates ----------

eq('date iso passthrough', normalizeDate('2026-01-09'), '2026-01-09');
eq('date long form', normalizeDate('9 January 2026'), '2026-01-09');
eq('date junk -> null', normalizeDate('sometime last spring'), null);
eq('date null -> null', normalizeDate(null), null);

// ---------- non-PDF rejection ----------

await parseAssessmentPdf(Buffer.from('not a pdf at all').toString('base64'), 'notes.txt')
  .then(() => { console.log('FAIL non-PDF should reject'); fails++; })
  .catch((e: Error) => eq('non-PDF rejected with a plain-English reason', /does not look like a PDF/.test(e.message), true));

console.log(fails === 0 ? '\nAll assessment PDF parser tests passed.' : `\n${fails} test(s) failed.`);
process.exit(fails === 0 ? 0 : 1);
