// Organization — org tree + scope + tabbed person-card matrix + 9 Box.
// Spec: AIE Org Screen Spec v1. Stage 1 (Assessments/Review = Stage 2).
import { useMemo, useState, useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';
import OrgTree from '../components/org/OrgTree';
import PersonCard from '../components/org/PersonCard';
import NineBox from '../components/org/NineBox';
import {
  buildMaps, directsOf, descendantsOf, depthOf, Person, Scope, TabKey, TOKENS,
} from '../components/org/orgLib';

// Stage 2 added Assessments + Review. `minRole` HIDES (not disables) a tab the
// viewer can't access (spec §7 tab strip): Review needs manager+ (performance
// zone; compensation is further gated admin+ inside the tab).
const ALL_TABS: { key: TabKey; label: string; minRole?: 'manager' }[] = [
  { key: 'priorities', label: 'Priorities' },
  { key: 'okrs', label: 'OKRs' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'review', label: 'Review', minRole: 'manager' },
  { key: 'ninebox', label: '9 Box' },
];
const ROLE_RANK: Record<string, number> = { user: 1, manager: 2, admin: 3, sysadmin: 4 };

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'individual', label: 'Individual' },
  { key: 'directs', label: 'Directs' },
  { key: 'descendants', label: 'Team' },
  { key: 'organization', label: 'Organization' },
];

const ls = {
  get: (k: string) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* noop */ } },
};

export default function Organization() {
  const { data, isLoading } = trpc.orgScreen.tree.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const role = (me as { role?: string } | undefined)?.role ?? 'user';
  const meId = (me as { id?: string } | undefined)?.id ?? null;
  const meHr = (me as { isHrAccess?: boolean } | undefined)?.isHrAccess ?? false;
  const meBadge = (me as { leaderBadge?: string | null } | undefined)?.leaderBadge ?? null;
  // Company-wide (Organization) scope is limited to admins, ELT, and HR.
  const canSeeCompanyWide = role === 'admin' || role === 'sysadmin' || meHr || meBadge === 'ELT';
  const visibleScopes = SCOPES.filter((sc) => sc.key !== 'organization' || canSeeCompanyWide);
  // Who the current viewer may PLACE on the 9 Box: admins, HR, and anyone in a
  // person's PRIMARY-manager chain (their primary manager or above). Mirrors the
  // server rule so the grid only shows a placement affordance where it will work.
  const canPlace = (personId: string): boolean => {
    if (role === 'admin' || role === 'sysadmin' || meHr) return true;
    if (!meId) return false;
    let cur = maps.byId.get(personId)?.managerId ?? null;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) { if (cur === meId) return true; seen.add(cur); cur = maps.byId.get(cur)?.managerId ?? null; }
    return false;
  };
  const TABS = ALL_TABS.filter((t) => !t.minRole || (ROLE_RANK[role] ?? 0) >= ROLE_RANK[t.minRole]);
  const people = (data?.people ?? []) as Person[];
  const maps = useMemo(() => buildMaps(people), [people]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>((ls.get('org.scope') as Scope) || 'individual');
  const [tab, setTab] = useState<TabKey>((ls.get('org.tab') as TabKey) || 'priorities');
  const [periodId, setPeriodId] = useState<string | null>(ls.get('org.engPeriod'));
  const { data: periodsData } = trpc.engagementAnalytics.periods.useQuery();
  const engPeriodOptions = periodsData?.periods ?? [];
  const effectivePeriodId = periodId && engPeriodOptions.some((p) => p.id === periodId) ? periodId : (periodsData?.latestId ?? undefined);
  const choosePeriod = (id: string) => { setPeriodId(id); ls.set('org.engPeriod', id); };

  // Screen-level review-period selector (spec: person-card exec-summary,
  // 2026-07-15). Drives every card's Review tab; defaults to the latest period.
  const { data: periods } = trpc.values.listPeriods.useQuery(undefined, { enabled: tab === 'review' });
  const [reviewPeriod, setReviewPeriod] = useState<string | null>(ls.get('org.reviewPeriod'));
  useEffect(() => {
    if (!periods || periods.length === 0) return;
    if (!reviewPeriod || !periods.some((p) => p.label === reviewPeriod)) {
      const latest = periods[0].label; // listPeriods is newest-first
      setReviewPeriod(latest); ls.set('org.reviewPeriod', latest);
    }
  }, [periods]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseReviewPeriod = (v: string) => { setReviewPeriod(v); ls.set('org.reviewPeriod', v); };
  // Show the selector as soon as the Review tab is active: prefer the loaded
  // period list, else fall back to the persisted current period so it never
  // waits on the list query. Labels are unique (uniq_review_period_label).
  const periodOptions: string[] = (periods && periods.length)
    ? periods.map((p) => p.label)
    : (reviewPeriod ? [reviewPeriod] : []);

  // Restore / default selection once people load.
  useEffect(() => {
    if (selectedId || people.length === 0) return;
    const saved = ls.get('org.selected');
    setSelectedId(saved && maps.byId.has(saved) ? saved : maps.roots[0]?.id ?? null);
  }, [people.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!TABS.some((t) => t.key === tab)) { setTab('priorities'); ls.set('org.tab', 'priorities'); }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: string) => { setSelectedId(id); ls.set('org.selected', id); };
  const chooseScope = (s: Scope) => { setScope(s); ls.set('org.scope', s); };
  const chooseTab = (t: TabKey) => { setTab(t); ls.set('org.tab', t); };
  useEffect(() => {
    if (scope === 'organization' && !canSeeCompanyWide) { setScope('individual'); ls.set('org.scope', 'individual'); }
  }, [canSeeCompanyWide, scope]);

  // Resizable split between the org tree (left) and the card/9-box body (right).
  const [treeW, setTreeW] = useState<number>(() => {
    const v = Number(ls.get('org.treeW'));
    return v >= 220 && v <= 640 ? v : 300;
  });
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { ls.set('org.treeW', String(treeW)); }, [treeW]);
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTreeW(Math.min(640, Math.max(220, ev.clientX - rect.left)));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const selected = selectedId ? maps.byId.get(selectedId) ?? null : null;

  // In-scope people (spec §6).
  const scoped: Person[] = useMemo(() => {
    if (scope === 'organization') return people;
    if (!selected) return [];
    if (scope === 'individual') return [selected];
    if (scope === 'directs') return directsOf(maps, selected.id);
    return descendantsOf(maps, selected.id);
  }, [selected, scope, maps, people]);

  // Team scope → depth-banded groups.
  const banded = useMemo(() => {
    if (scope !== 'descendants' || !selected) return null;
    const base = depthOf(maps, selected.id);
    const groups = new Map<number, Person[]>();
    for (const p of scoped) {
      const rel = depthOf(maps, p.id) - base;
      (groups.get(rel) ?? groups.set(rel, []).get(rel)!).push(p);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [scope, selected, scoped, maps]);

  const grid = 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div ref={containerRef} className="flex" style={{ height: 'calc(100vh - 7.5rem)', background: TOKENS.bg, borderRadius: 10, overflow: 'hidden', border: `1px solid ${TOKENS.border}`, userSelect: dragging ? 'none' : undefined }}>
      {isLoading ? (
        <div className="p-6 text-[13px]" style={{ color: TOKENS.idle }}>Loading organization…</div>
      ) : (
        <>
          <div className="shrink-0 h-full min-w-0" style={{ width: treeW }}>
            <OrgTree maps={maps} selectedId={selectedId} onSelect={select} />
          </div>
          <div onMouseDown={startDrag} className="shrink-0 h-full" title="Drag to resize"
            style={{ width: 6, cursor: 'col-resize', background: dragging ? TOKENS.selBar : 'transparent' }} />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Scope header */}
            <div className="flex items-center gap-2" style={{ padding: '12px 20px', borderBottom: `1px solid ${TOKENS.border}` }}>
              <div className="inline-flex rounded-lg p-0.5" style={{ background: '#eef0f2' }}>
                {visibleScopes.map((s) => (
                  <button key={s.key} onClick={() => chooseScope(s.key)}
                    className="text-[12px] font-medium rounded-md px-3 py-1"
                    style={scope === s.key ? { background: '#fff', color: TOKENS.activeText, boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6c757d' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Tab strip */}
            <div className="flex items-center justify-between" style={{ padding: '0 20px', borderBottom: `1px solid ${TOKENS.borderSoft}`, background: '#fff' }}>
              <div className="flex items-center">
                {TABS.map((t) => (
                  <button key={t.key} onClick={() => chooseTab(t.key)}
                    className="text-[12px] font-medium"
                    style={{
                      padding: '8px 16px', marginBottom: -1,
                      color: tab === t.key ? TOKENS.activeText : TOKENS.idle,
                      borderBottom: tab === t.key ? `2px solid ${TOKENS.tabUnderline}` : '2px solid transparent',
                    }}>{t.label}</button>
                ))}
              </div>
              {tab === 'review' && periodOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TOKENS.idle }}>Review period</span>
                  <select value={reviewPeriod ?? periodOptions[0]} onChange={(e) => chooseReviewPeriod(e.target.value)}
                    className="text-[12px] font-medium rounded-md"
                    style={{ color: TOKENS.activeText, background: '#fff', border: `1px solid ${TOKENS.border}`, padding: '5px 8px' }}>
                    {periodOptions.map((label) => <option key={label} value={label}>{label}</option>)}
                  </select>
                </div>
              )}
              {tab === 'engagement' && engPeriodOptions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: TOKENS.idle }}>Period</span>
                  <select value={effectivePeriodId ?? ''} onChange={(e) => choosePeriod(e.target.value)}
                    className="text-[12px]"
                    style={{ height: 28, border: `1px solid ${TOKENS.border}`, borderRadius: 6, padding: '0 6px', background: '#fff', color: TOKENS.activeText }}>
                    {engPeriodOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            {/* Body */}
            <div className="flex-1 overflow-auto" style={{ padding: 16 }}>
              {tab === 'ninebox' ? (
                <NineBox people={scoped} allPeople={people} scope={scope} canPlace={canPlace} companyWide={canSeeCompanyWide} />
              ) : (!selected && scope !== 'organization') ? (
                <div className="text-[13px]" style={{ color: TOKENS.idle }}>No one in this scope. Select a person in the tree.</div>
              ) : scoped.length === 0 ? (
                <div className="text-[13px]" style={{ color: TOKENS.idle }}>No one in this scope.</div>
              ) : banded ? (
                banded.map(([rel, group]) => (
                  <div key={rel} className="mb-5">
                    <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: TOKENS.idle }}>
                      {rel === 1 ? 'Direct reports' : `Level ${rel}`}
                    </div>
                    <div className={grid}>
                      {group.map((p) => <PersonCard key={p.id} person={p} tab={tab} periodId={effectivePeriodId} reviewPeriod={reviewPeriod} />)}
                    </div>
                  </div>
                ))
              ) : (
                <div className={grid}>
                  {scoped.map((p) => <PersonCard key={p.id} person={p} tab={tab} periodId={effectivePeriodId} reviewPeriod={reviewPeriod} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
