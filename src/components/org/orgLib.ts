// Shared types + tree helpers for the Org screen (spec §4/§5/§6/§9/§11).

export type Person = {
  id: string;
  name: string;
  title: string | null;
  dept: string | null;
  managerId: string | null;
  leaderBadge: string | null; // 'ELT' | 'SLT' | 'ST6' | null
  role: string;
};

export type Scope = 'individual' | 'directs' | 'descendants' | 'organization';
export type TabKey = 'priorities' | 'okrs' | 'engagement' | 'assessments' | 'review' | 'ninebox';

// Spec §12 tokens (carried verbatim where precise).
export const TOKENS = {
  bg: '#F6F9FA', panel: '#fff', border: '#E3E8EB', borderSoft: '#E3E8EB',
  selBg: '#EAF4FA', selBar: '#4FA9D6', hover: '#EEF3F5',
  tierFill: '#28323A', tabUnderline: '#4FA9D6', activeText: '#2E3942', idle: '#51606A',
  barTrack: '#EEF3F5', badgeGrey: '#8A969E',
};

export const TIER_BADGE: Record<string, { bg: string; fg: string }> = {
  ELT: { bg: '#EDE7F8', fg: '#6E4AA0' },
  SLT: { bg: '#EAF4FA', fg: '#2E89B8' },
  ST6: { bg: '#E6F4EF', fg: '#22795E' },
};

export type TreeMaps = {
  byId: Map<string, Person>;
  children: Map<string, Person[]>;
  roots: Person[];
};

function rootRank(p: Person): number {
  if (p.leaderBadge === 'ELT') return 0;
  if (p.leaderBadge === 'ST6') return 1;
  return 2;
}

export function buildMaps(people: Person[]): TreeMaps {
  const byId = new Map(people.map((p) => [p.id, p]));
  const children = new Map<string, Person[]>();
  const roots: Person[] = [];
  for (const p of people) {
    const mgr = p.managerId && byId.has(p.managerId) ? p.managerId : null;
    if (!mgr) roots.push(p);
    else {
      const arr = children.get(mgr) ?? [];
      arr.push(p);
      children.set(mgr, arr);
    }
  }
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);
  roots.sort((a, b) => rootRank(a) - rootRank(b) || byName(a, b));
  for (const arr of children.values()) arr.sort(byName);
  return { byId, children, roots };
}

export function directsOf(maps: TreeMaps, id: string): Person[] {
  return maps.children.get(id) ?? [];
}

export function descendantsOf(maps: TreeMaps, id: string): Person[] {
  const out: Person[] = [];
  const walk = (pid: string) => {
    for (const c of maps.children.get(pid) ?? []) { out.push(c); walk(c.id); }
  };
  walk(id);
  return out;
}

export function descendantCount(maps: TreeMaps, id: string): number {
  return descendantsOf(maps, id).length;
}

// depth of a person from its root (0 = root)
export function depthOf(maps: TreeMaps, id: string): number {
  let d = 0;
  let cur = maps.byId.get(id);
  while (cur && cur.managerId && maps.byId.has(cur.managerId)) { d += 1; cur = maps.byId.get(cur.managerId); }
  return d;
}

// 9 Box numpad decode (spec §10.1)
export const BOX_NAMES: Record<number, string> = {
  9: 'Star', 8: 'High Impact', 7: 'High Potential',
  6: 'Strong', 5: 'Core', 4: 'Developing',
  3: 'Effective', 2: 'Inconsistent', 1: 'Risk',
};
export const boxPerformance = (box: number) => (box - 1) % 3;      // 0/1/2 = Low/Med/High
export const boxPotential = (box: number) => Math.floor((box - 1) / 3); // 0/1/2 = Low/Med/High


// Score-band colors for Review value/performance rows (0..5 scale, spec §8.2).
export function bandFill(score: number): string {
  if (score >= 4) return '#22c55e';
  if (score >= 3) return '#3b82f6';
  if (score >= 2) return '#f59e0b';
  return '#ef4444';
}
export function bandText(score: number): string {
  if (score >= 4) return '#15803d';
  if (score >= 3) return '#2563eb';
  if (score >= 2) return '#b45309';
  return '#b91c1c';
}

// Insight persona palette + fixed column order (spec §8.1).
export const INSIGHT_COLORS: Record<string, string> = {
  blue: '#4285f4', green: '#34a853', yellow: '#ffd400', red: '#ea4335',
};
export const INSIGHT_ORDER = ['blue', 'green', 'yellow', 'red'];


// Deterministic monogram avatar helpers (visual only — Org screen redesign).
const AVATAR_PALETTE = ['#2E89B8','#4FA9D6','#2E9E7B','#7A54B0','#C99300','#C2615A','#4C6EF5','#12897E','#B5603D','#5B7A8C'];
export function personInitials(name: string): string {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
}
export function personColor(name: string): string {
  let h = 0; for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
