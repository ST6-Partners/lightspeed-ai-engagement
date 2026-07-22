// Unit tests for the pure OKR scorecard + plan-tree logic.
// Run:  npx tsx server/src/services/okrScorecard.test.ts
// (No DB or server needed — pure functions.) Fixtures mirror the PM's uploaded
// OKR Analytics mockup so the rollup math and Plan drill-down are locked.

import assert from 'node:assert/strict';
import { computeScorecard, type OkrNodeLite } from './okrScorecard.js';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed++;
}
function eq<T>(label: string, actual: T, expected: T) {
  assert.deepEqual(actual, expected, `${label} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  passed++;
}

let seq = 0;
type N = Partial<OkrNodeLite> & { title: string; type: string };
function node(n: N): OkrNodeLite {
  return {
    id: n.id ?? `n${++seq}`,
    parentId: n.parentId ?? null,
    type: n.type,
    title: n.title,
    status: n.status ?? 'not_started',
    weight: n.weight ?? 1,
    departmentId: n.departmentId ?? null,
    ownerUserId: n.ownerUserId ?? null,
    owner: n.owner ?? null,
    sortOrder: n.sortOrder ?? 0,
    archivedAt: n.archivedAt ?? null,
  };
}

// ── Build the mockup tree ──────────────────────────────────────────────────
const nodes: OkrNodeLite[] = [];
function obj(id: string, title: string, opts: Partial<OkrNodeLite>, kids: Array<[string, string, string, number]> = []) {
  nodes.push(node({ id, title, type: 'objective', ...opts }));
  kids.forEach(([kid, ktitle, kstatus, kweight], i) =>
    nodes.push(node({ id: kid, parentId: id, title: ktitle, type: 'key_result', status: kstatus, weight: kweight, sortOrder: i })),
  );
}

obj('o1', 'Ship the v2 platform', { departmentId: 'Engineering', owner: 'Priya Shah', weight: 4, sortOrder: 1 }, [
  ['o1k1', 'Migrate to the new API', 'complete', 4],
  ['o1k2', 'Launch the mobile app', 'in_progress', 3],
  ['o1k3', 'Hold 99.9% uptime', 'in_progress', 3],
]);
obj('o2', 'Pay down tech debt', { departmentId: 'Engineering', owner: 'Marcus Lee', weight: 3, sortOrder: 2 }, [
  ['o2k1', 'Refactor auth service', 'complete', 5],
  ['o2k2', 'Cut build time in half', 'not_started', 5],
]);
obj('o3', 'Grow ARR 30%', { departmentId: 'Sales', owner: 'Dana Ruiz', weight: 1, sortOrder: 3 }, [
  ['o3k1', 'Close 20 enterprise logos', 'complete', 6],
  ['o3k2', 'Expand into 2 regions', 'complete', 4],
]);
obj('o4', 'Launch partner program', { departmentId: 'Sales', owner: 'Dana Ruiz', weight: 1, sortOrder: 4, status: 'complete' }, [
  ['o4k1', 'Sign 5 channel partners', 'in_progress', 1],
]);
obj('o5', 'Cut churn to 5%', { departmentId: 'Customer Success', owner: 'Ivy Chen', weight: 1, sortOrder: 5 }, [
  ['o5k1', 'Ship customer health scores', 'complete', 1],
  ['o5k2', 'Run a QBR program', 'in_progress', 1],
]);
obj('o6', 'Automate onboarding', { departmentId: 'Operations', owner: 'Sam Park', weight: 1, sortOrder: 6 }, []);
obj('o7', 'Reach SOC 2 Type II', { departmentId: 'Operations', owner: 'Sam Park', weight: 1, sortOrder: 7 }, [
  ['o7k1', 'Implement all controls', 'complete', 1],
  ['o7k2', 'Pass the external audit', 'not_started', 1],
]);
obj('o8', 'Explore new AI tooling', { weight: 1, sortOrder: 8 }, []); // no owner, no team

const teamOf = (n: OkrNodeLite) => n.departmentId ?? 'Unassigned';
const sc = computeScorecard(nodes, teamOf);

// ── Per-objective attainment (weighted rollup) ──
const attByTitle = Object.fromEntries(sc.plan.map((p) => [p.title, p.attainmentPct]));
eq('Ship v2 = 70', attByTitle['Ship the v2 platform'], 70);
eq('Pay down = 50', attByTitle['Pay down tech debt'], 50);
eq('Grow ARR = 100', attByTitle['Grow ARR 30%'], 100);
eq('Launch partner = 100 (marked complete overrides rollup)', attByTitle['Launch partner program'], 100);
eq('Cut churn = 75', attByTitle['Cut churn to 5%'], 75);
eq('Automate onboarding = 0', attByTitle['Automate onboarding'], 0);
eq('Reach SOC2 = 50', attByTitle['Reach SOC 2 Type II'], 50);
eq('Explore = 0', attByTitle['Explore new AI tooling'], 0);

// ── Distribution ──
eq('distribution met/partial/missed', sc.distribution, { met: 2, partial: 4, missed: 2 });
eq('objectiveCount', sc.objectiveCount, 8);
eq('completedCount', sc.completedCount, 2);

// ── Team leaderboard ──
const teamPct = Object.fromEntries(sc.teams.map((t) => [t.team, t.attainmentPct]));
eq('Sales 100', teamPct['Sales'], 100);
eq('Customer Success 75', teamPct['Customer Success'], 75);
eq('Engineering 61.4', teamPct['Engineering'], 61.4);
eq('Operations 25', teamPct['Operations'], 25);
eq('Unassigned 0', teamPct['Unassigned'], 0);
const sales = sc.teams.find((t) => t.team === 'Sales')!;
eq('Sales 2/2 met', [sales.completedCount, sales.objectiveCount], [2, 2]);
eq('top team = Sales', sc.topTeam?.team, 'Sales');
eq('bottom team = Unassigned', sc.bottomTeam?.team, 'Unassigned');

// ── Company attainment (weighted by objective weight) ──
// (70*4 + 50*3 + 100 + 100 + 75 + 0 + 50 + 0) / 13 = 755/13 = 58.08 -> 58.1
eq('company attainment', sc.companyAttainmentPct, 58.1);

// ── Integrity + hygiene flags ──
eq('one integrity flag', sc.integrityFlags.length, 1);
eq('integrity flag is Launch partner', sc.integrityFlags[0].title, 'Launch partner program');
eq('one hygiene flag', sc.hygieneFlags.length, 1);
eq('hygiene flag is Explore', sc.hygieneFlags[0].title, 'Explore new AI tooling');

// ── Plan drill-down (the "which specific result was met and which weren't") ──
eq('plan objective order', sc.plan.map((p) => p.title)[0], 'Ship the v2 platform');
const shipV2 = sc.plan[0];
eq('Ship v2 owner', shipV2.owner, 'Priya Shah');
eq('Ship v2 team', shipV2.team, 'Engineering');
eq('Ship v2 child statuses', shipV2.children.map((c) => c.statusLabel), ['Done', 'In progress', 'In progress']);
eq('Ship v2 child weight %', shipV2.children.map((c) => c.weightPct), [40, 30, 30]);
eq('Ship v2 child attainment', shipV2.children.map((c) => c.attainmentPct), [100, 50, 50]);
const launch = sc.plan.find((p) => p.title === 'Launch partner program')!;
ok('Launch partner markedComplete', launch.markedComplete === true);
ok('Launch partner hasOpenChildren', launch.hasOpenChildren === true);
eq('Launch partner status = met', launch.status, 'met');
const explore = sc.plan.find((p) => p.title === 'Explore new AI tooling')!;
ok('Explore noOwnerOrTeam', explore.noOwnerOrTeam === true);
eq('Explore status = missed', explore.status, 'missed');

// ── All-departments listing: teams with zero objectives still appear at 0% ──
const scAll = computeScorecard(nodes, teamOf, ['Engineering', 'Sales', 'Customer Success', 'Operations', 'Legal', 'Finance']);
const allTeamNames = scAll.teams.map((t) => t.team);
ok('empty dept Legal listed', allTeamNames.includes('Legal'));
ok('empty dept Finance listed', allTeamNames.includes('Finance'));
const legal = scAll.teams.find((t) => t.team === 'Legal')!;
eq('Legal has 0 objectives', legal.objectiveCount, 0);
eq('Legal at 0%', legal.attainmentPct, 0);
eq('Legal 0 met', legal.completedCount, 0);
ok('Unassigned still present (real unowned objective)', allTeamNames.includes('Unassigned'));
eq('company attainment unchanged by empty depts', scAll.companyAttainmentPct, 58.1);

console.log(`\nokrScorecard.test.ts — ${passed} assertions passed\n`);
