// ============================================================
// OKR SCORECARD — pure period-end analytics (AI Engagement, 2026-07-22)
//
// Given the OKR nodes belonging to one goal-setting period, compute the
// "Period Scorecard": company attainment, a per-team leaderboard, the
// met/partial/missed distribution, and integrity + hygiene flags. Pure and
// deterministic so it is unit-testable and produces a stable JSON snapshot to
// freeze into okr_periods.scorecard when a period is closed.
//
// Attainment mirrors the Plan view's weighted rollup: a leaf reads its status
// (complete = 100, in_progress = 50, else 0); a parent is the weight-weighted
// average of its children. Attainment is measured on OBJECTIVES.
// ============================================================

export interface OkrNodeLite {
  id: string;
  parentId: string | null;
  type: string;               // 'objective' | 'key_result' | 'task'
  title: string;
  status: string;             // 'not_started' | 'in_progress' | 'on_hold' | 'complete'
  weight: number;
  departmentId: string | null;
  ownerUserId: string | null;
  owner: string | null;
  archivedAt?: unknown;       // non-null => excluded from the scorecard
}

export interface ScorecardObjective {
  id: string;
  title: string;
  attainmentPct: number;      // 0..100, weighted rollup
  status: 'met' | 'partial' | 'missed';
}

export interface ScorecardTeam {
  team: string;
  objectiveCount: number;
  completedCount: number;
  attainmentPct: number;      // 0..100, weighted
  missPct: number;            // 100 - attainmentPct
  items: ScorecardObjective[];   // per-objective met/missed breakdown
}

export interface ScorecardFlag {
  id: string;
  title: string;
  team: string;
}

export interface PeriodScorecard {
  generatedAt: string;
  objectiveCount: number;
  completedCount: number;
  companyAttainmentPct: number;
  distribution: { met: number; partial: number; missed: number };
  teams: ScorecardTeam[];
  topTeam: ScorecardTeam | null;
  bottomTeam: ScorecardTeam | null;
  integrityFlags: ScorecardFlag[];   // objective marked complete while a child KR/task is not
  hygieneFlags: ScorecardFlag[];     // objective with neither owner nor team
  narrative?: string | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const statusPct = (status: string) =>
  status === 'complete' ? 100 : status === 'in_progress' ? 50 : 0;

/** Weight-weighted rollup of a node's completion (0..100). Mirrors the UI. */
export function attainmentOf(node: OkrNodeLite, childrenByParent: Map<string | null, OkrNodeLite[]>): number {
  if (node.status === 'complete') return 100; // explicit completion overrides rollup
  const kids = childrenByParent.get(node.id) ?? [];
  if (!kids.length) return statusPct(node.status);
  const totW = kids.reduce((a, k) => a + (k.weight || 1), 0) || 1;
  return kids.reduce((a, k) => a + attainmentOf(k, childrenByParent) * (k.weight || 1), 0) / totW;
}

/** Every descendant of a node (adjacency walk). */
function descendants(node: OkrNodeLite, childrenByParent: Map<string | null, OkrNodeLite[]>): OkrNodeLite[] {
  const out: OkrNodeLite[] = [];
  const stack = [...(childrenByParent.get(node.id) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n);
    stack.push(...(childrenByParent.get(n.id) ?? []));
  }
  return out;
}

/**
 * Compute the period scorecard.
 * @param nodes    all okr_nodes in the period (archived rows are ignored)
 * @param teamOf   resolves an objective node to its team/department label
 */
export function computeScorecard(
  nodes: OkrNodeLite[],
  teamOf: (n: OkrNodeLite) => string,
): PeriodScorecard {
  const active = nodes.filter((n) => !n.archivedAt);
  const childrenByParent = new Map<string | null, OkrNodeLite[]>();
  for (const n of active) {
    const arr = childrenByParent.get(n.parentId) ?? [];
    arr.push(n);
    childrenByParent.set(n.parentId, arr);
  }

  const objectives = active.filter((n) => n.type === 'objective');

  // Per-objective attainment + completion.
  const scored = objectives.map((o) => {
    const attainment = attainmentOf(o, childrenByParent);
    const complete = o.status === 'complete' || attainment >= 100;
    return { node: o, team: teamOf(o), attainment, complete };
  });

  // Company weighted attainment (by objective weight).
  const totW = scored.reduce((a, s) => a + (s.node.weight || 1), 0) || 1;
  const companyAttainmentPct = round1(
    scored.reduce((a, s) => a + s.attainment * (s.node.weight || 1), 0) / totW,
  );
  const completedCount = scored.filter((s) => s.complete).length;

  // Distribution.
  const distribution = { met: 0, partial: 0, missed: 0 };
  for (const s of scored) {
    if (s.attainment >= 100) distribution.met += 1;
    else if (s.attainment > 0) distribution.partial += 1;
    else distribution.missed += 1;
  }

  // Team leaderboard (weighted attainment within each team).
  const byTeam = new Map<string, typeof scored>();
  for (const s of scored) {
    const arr = byTeam.get(s.team) ?? [];
    arr.push(s);
    byTeam.set(s.team, arr);
  }
  const teams: ScorecardTeam[] = [...byTeam.entries()].map(([team, list]) => {
    const w = list.reduce((a, s) => a + (s.node.weight || 1), 0) || 1;
    const attainmentPct = round1(list.reduce((a, s) => a + s.attainment * (s.node.weight || 1), 0) / w);
    const items: ScorecardObjective[] = list
      .map((s) => ({
        id: s.node.id,
        title: s.node.title,
        attainmentPct: round1(s.attainment),
        status: (s.attainment >= 100 ? 'met' : s.attainment > 0 ? 'partial' : 'missed') as ScorecardObjective['status'],
      }))
      .sort((a, b) => b.attainmentPct - a.attainmentPct);
    return {
      team,
      objectiveCount: list.length,
      completedCount: list.filter((s) => s.complete).length,
      attainmentPct,
      missPct: round1(100 - attainmentPct),
      items,
    };
  }).sort((a, b) => b.attainmentPct - a.attainmentPct || b.objectiveCount - a.objectiveCount);

  // Top / bottom teams (only meaningful with 2+ teams; bottom excludes the top).
  const realTeams = teams.filter((t) => t.objectiveCount > 0);
  const topTeam = realTeams[0] ?? null;
  const bottomTeam = realTeams.length > 1 ? realTeams[realTeams.length - 1] : null;

  // Integrity: objective marked complete while a descendant KR/task isn't complete.
  const integrityFlags: ScorecardFlag[] = [];
  for (const s of scored) {
    if (s.node.status !== 'complete') continue;
    const kids = descendants(s.node, childrenByParent);
    if (kids.some((k) => k.status !== 'complete')) {
      integrityFlags.push({ id: s.node.id, title: s.node.title, team: s.team });
    }
  }

  // Hygiene: objective with neither an owner nor a team.
  const hygieneFlags: ScorecardFlag[] = scored
    .filter((s) => !s.node.ownerUserId && !(s.node.owner && s.node.owner.trim()) && !s.node.departmentId)
    .map((s) => ({ id: s.node.id, title: s.node.title, team: s.team }));

  return {
    generatedAt: new Date().toISOString(),
    objectiveCount: objectives.length,
    completedCount,
    companyAttainmentPct,
    distribution,
    teams,
    topTeam,
    bottomTeam,
    integrityFlags,
    hygieneFlags,
    narrative: null,
  };
}
