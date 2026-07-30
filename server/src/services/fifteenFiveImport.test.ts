import { detectColumns, detectShape, normalizeRows, mapDimension, weightedMean } from './fifteenFiveImport.js';

const parse = (csv: string) => {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    // naive split is fine for these fixtures (no quoted commas)
    const cells = l.split(',');
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (cells[i] ?? '').trim(); });
    return o;
  });
};

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got); const w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};

// ---- 1. department statements, counts, with awkward header wording ----
const deptCsv = `Group Name,Dimension,Statement,Avg. Response,Unfavorable,Neutral,Favorable,No Response,Total Responses,Total Possible,Response Rate
Administration,Work Feeling,"When I wake up I feel like going to work.",3.12,0,3,5,1,8,9,88.89%
Administration,Work Focus,"I am able to get into a state of complete focus while working.",3.25,0,2,6,1,8,9,88.89%
Finance,Work Feeling,"When I wake up I feel like going to work.",3.43,0,1,6,0,7,7,100%`;
const d1 = parse(deptCsv);
const c1 = detectColumns(Object.keys(d1[0]));
eq('dept: shape', detectShape(c1), 'department-statements');
eq('dept: group col', c1.group, 'group name');
eq('dept: avg col', c1.avgResponse, 'avg. response');
eq('dept: totalPossible col', c1.totalPossible, 'total possible');
eq('dept: noResponse col', c1.noResponse, 'no response');
const n1 = normalizeRows(d1, c1);
eq('dept: not pct-mode', n1.countsWerePercentages, false);
eq('dept: rows', n1.rows.length, 3);
eq('dept: scope', n1.rows[0].scope, 'department');
eq('dept: group', n1.rows[0].groupName, 'Administration');
eq('dept: favPct derived 5/8', n1.rows[0].favorablePct, 62.5);
eq('dept: responseRate 88.89%', n1.rows[0].responseRate, 88.89);
eq('dept: rate 100% stays 100', n1.rows[2].responseRate, 100);

// ---- 2. company statements, no group column ----
const coCsv = `Dimension,Statement,Average,Unfavorable,Neutral,Favorable,Responses,Possible
Meaning,"The work I do on this job is very important to me.",3.62,1,7,168,176,205
Fairness,"Decisions here about people are made using a fair process.",2.61,20,55,101,176,205`;
const d2 = parse(coCsv);
const c2 = detectColumns(Object.keys(d2[0]));
eq('company: shape', detectShape(c2), 'company-statements');
eq('company: no group', c2.group, undefined);
const n2 = normalizeRows(d2, c2);
eq('company: scope', n2.rows[0].scope, 'company');
eq('company: favPct 168/176', n2.rows[0].favorablePct, 95.45);
eq('company: eligible', n2.rows[0].totalPossible, 205);

// ---- 3. percentages disguised as counts ----
const pctCsv = `Dimension,Statement,Avg Response,Unfavorable,Neutral,Favorable,Total Responses
Meaning,"My job activities are personally meaningful to me.",3.28,4,9,87,176
Fairness,"I feel the rewards I get are equitable given the work I do.",2.55,16,27,57,176
Purpose,"I know why the company exists.",3.76,0,1,99,176`;
const d3 = parse(pctCsv);
const c3 = detectColumns(Object.keys(d3[0]));
const n3 = normalizeRows(d3, c3);
eq('pct-mode detected', n3.countsWerePercentages, true);
eq('pct-mode: favPct taken directly', n3.rows[0].favorablePct, 87);
eq('pct-mode: counts nulled', n3.rows[0].favorable, null);

// ---- 4. department scores, no statements ----
const scoreCsv = `Department,Engagement Score,Respondents,Total Possible
Site Reliability Engineering,92.86,3,4
STOPit Solutions,88.32,26,27`;
const d4 = parse(scoreCsv);
const c4 = detectColumns(Object.keys(d4[0]));
eq('scores: shape', detectShape(c4), 'department-scores');
const n4 = normalizeRows(d4, c4);
eq('scores: statement null', n4.rows[0].statement, null);
eq('scores: score', n4.rows[0].score, 92.86);
eq('scores: group', n4.rows[0].groupName, 'Site Reliability Engineering');

// ---- 5. junk rows dropped ----
const junkCsv = `Group Name,Statement,Favorable,Total Responses
,,,
Sales,"I love the feeling of working.",15,17`;
const d5 = parse(junkCsv);
const c5 = detectColumns(Object.keys(d5[0]));
const n5 = normalizeRows(d5, c5);
eq('junk: dropped 1', n5.dropped, 1);
eq('junk: kept 1', n5.rows.length, 1);

// ---- 6. driver mapping ----
eq('driver: Organizational Commitment', mapDimension('Organizational Commitment'), 'commitment');
eq('driver: Prof. Dev.', mapDimension('Prof. Dev.'), 'utilization');
eq('driver: Leader Integrity', mapDimension('Leader Integrity'), 'leadership');
eq('driver: Supporting Career Growth', mapDimension('Supporting Career Growth'), 'manager_effectiveness');
eq('driver: unknown -> null', mapDimension('Snack Variety'), null);

// ---- 7. weighted mean ----
eq('weightedMean', weightedMean([{ value: 4, weight: 10 }, { value: 2, weight: 90 }]), 2.2);
eq('weightedMean nulls ignored', weightedMean([{ value: null, weight: 5 }, { value: 3, weight: 1 }]), 3);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
