import { deriveMetrics, normalizeRows, detectColumns, type QuestionBankEntry } from './fifteenFiveImport.js';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};
const bank = new Map<string, QuestionBankEntry>();
const rows = (csv: string) => {
  const lines = csv.trim().split('\n');
  const hs = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    const o: Record<string, string> = {};
    hs.forEach((h, i) => { o[h] = (c[i] ?? '').trim(); });
    return o;
  });
};
const norm = (csv: string) => { const r = rows(csv); return normalizeRows(r, detectColumns(Object.keys(r[0]))).rows; };

// ---- THE BUG BROOKE HIT: department scores only, no company sheet ----
const deptScores = norm(`Group Name,Score,Total Responses,Total Possible Responses
Finance,92.86,7,7
Marketing,50.00,9,9
Sales,80.00,4,5`);
const d1 = deriveMetrics(deptScores, bank);
const overall1 = d1.metrics.filter((m) => m.dimension === 'overall');
eq('dept-scores: 3 dept + 1 company overall', overall1.length, 4);
eq('dept-scores: company row synthesized', d1.derivedCompanyOverall, true);
const co = overall1.find((m) => m.scope === 'company');
// weighted by respondents: (92.86*7 + 50*9 + 80*4) / 20 = 71.0
eq('dept-scores: company favPct weighted', co?.favorablePct, 71);
eq('dept-scores: company responses summed', co?.responseCount, 20);
eq('dept-scores: company eligible summed', co?.eligibleCount, 21);
eq('dept-scores: companyResponses out', d1.companyResponses, 20);
eq('dept-scores: a dept row survives', overall1.find((m) => m.department === 'Marketing')?.favorablePct, 50);

// ---- a real company sheet must NOT be overwritten by a rollup ----
const mixed = [
  ...norm(`Dimension,Statement,Avg. Response,Favorable,Total Responses,Total Possible
Meaning,I feel valued.,3.5,90,100,120`),
  ...norm(`Group Name,Dimension,Statement,Avg. Response,Favorable,Total Responses,Total Possible
Finance,Meaning,I feel valued.,2.0,10,50,50`),
];
const d2 = deriveMetrics(mixed, bank);
eq('mixed: company NOT derived', d2.derivedCompanyOverall, false);
const co2 = d2.metrics.find((m) => m.dimension === 'overall' && m.scope === 'company');
eq('mixed: real company figure kept (90/100)', co2?.favorablePct, 90);
eq('mixed: company responses from its own row', co2?.responseCount, 100);

// ---- driver rollup fills the company gap too ----
const deptDrivers = norm(`Group Name,Dimension,Statement,Avg. Response,Favorable,Total Responses
Finance,Organizational Commitment,I feel loyal.,3.2,8,10
Marketing,Organizational Commitment,I feel loyal.,2.0,2,10`);
const d3 = deriveMetrics(deptDrivers, bank);
const drv = d3.metrics.filter((m) => m.dimension === 'driver');
eq('drivers: 2 dept + 1 company', drv.length, 3);
const cdrv = drv.find((m) => m.scope === 'company');
eq('drivers: company key', cdrv?.metricKey, 'commitment');
eq('drivers: company favPct (80*10+20*10)/20', cdrv?.favorablePct, 50);

// ---- question metrics only when the statement matches the bank ----
const bank2 = new Map<string, QuestionBankEntry>([
  ['ifeelloyal', { id: 'work_9', driver: 'commitment' }],
]);
const d4 = deriveMetrics(norm(`Dimension,Statement,Favorable,Total Responses
Organizational Commitment,I feel loyal.,8,10
Snacks,The snacks are good.,5,10`), bank2);
eq('question: only matched statement charted', d4.metrics.filter((m) => m.dimension === 'question').map((m) => m.metricKey), ['work_9']);
eq('question: unmatched counted', d4.unmatchedStatements, 1);
eq('question: unmapped dimension reported', d4.unmappedDimensions, ['Snacks']);

// ---- empty input is safe ----
const d5 = deriveMetrics([], bank);
eq('empty: no metrics', d5.metrics.length, 0);
eq('empty: nothing derived', d5.derivedCompanyOverall, false);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
