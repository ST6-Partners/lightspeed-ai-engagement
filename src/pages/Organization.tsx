// Organization — org tree + scope + tabbed person-card matrix + 9 Box.
// Spec: AIE Org Screen Spec v1. Stage 1 (Assessments/Review = Stage 2).
import { useMemo, useState, useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { Printer } from 'lucide-react';
import { openPrintDoc, escapeHtml } from '../lib/printDoc';
import OrgTree from '../components/org/OrgTree';
import PersonCard from '../components/org/PersonCard';
import NineBox from '../components/org/NineBox';
import {
  buildMaps, directsOf, descendantsOf, depthOf, Person, Scope, TabKey, TOKENS,
  tenureLabel, tenureBand,
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
  const visibleScopes = SCOPES;
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
  // Reporting line (top-down to, not including, this person) — same logic as export.
  const chainOf = (id: string) => { const c: string[] = []; const seen = new Set<string>(); let cur = maps.byId.get(id)?.managerId ?? null; while (cur && !seen.has(cur)) { seen.add(cur); const m = maps.byId.get(cur); if (m) c.unshift(m.name); cur = m?.managerId ?? null; } return c.join(' › '); };
  // Distinct, sorted filter options derived from loaded people.
  const uniqSorted = (vals: (string | null | undefined)[]) => [...new Set(vals.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
  const eltOptions = useMemo(() => uniqSorted(people.map((p) => p.eltLeader)), [people]);
  const locOptions = useMemo(() => uniqSorted(people.map((p) => p.location)), [people]);
  const buOptions = useMemo(() => uniqSorted(people.map((p) => p.businessUnit)), [people]);
  const TENURE_OPTIONS: { value: string; label: string }[] = [
    { value: '<1', label: '<1 yr' }, { value: '1-3', label: '1\u20133 yrs' },
    { value: '3-5', label: '3\u20135 yrs' }, { value: '5-10', label: '5\u201310 yrs' },
    { value: '10+', label: '10+ yrs' }, { value: 'unknown', label: 'Unknown' },
  ];
  const chooseFilter = (setter: (v: string) => void, key: string) => (v: string) => { setter(v); ls.set(key, v); };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>(() => { const s = ls.get('org.scope') as Scope; return s && s !== 'organization' ? s : 'individual'; });
  // Employment / org filters (spec: filter bar). '' = All. Persisted in localStorage.
  const [fElt, setFElt] = useState<string>(() => ls.get('org.filter.elt') ?? '');
  const [fLoc, setFLoc] = useState<string>(() => ls.get('org.filter.loc') ?? '');
  const [fBu, setFBu] = useState<string>(() => ls.get('org.filter.bu') ?? '');
  const [fTen, setFTen] = useState<string>(() => ls.get('org.filter.tenure') ?? '');
  const [tab, setTab] = useState<TabKey>((ls.get('org.tab') as TabKey) || 'priorities');
  const [periodId, setPeriodId] = useState<string | null>(ls.get('org.engPeriod'));
  const { data: periodsData } = trpc.engagementAnalytics.periods.useQuery();
  const engPeriodOptions = periodsData?.periods ?? [];
  const effectivePeriodId = periodId && engPeriodOptions.some((p) => p.id === periodId) ? periodId : (periodsData?.latestId ?? undefined);
  const choosePeriod = (id: string) => { setPeriodId(id); ls.set('org.engPeriod', id); };

  // Goal-setting period selector shared by Priorities / OKRs / 9 Box (period
  // switcher parity, 2026-07-27). Fed by okr_periods. Only OKRs are period-
  // scoped in the data model today; Priorities / 9 Box show the same selector
  // for consistency plus a note when a non-current period is selected.
  const { data: goalPeriodsData } = trpc.okrPeriods.list.useQuery();
  const goalPeriods = goalPeriodsData ?? [];
  const [goalPeriodId, setGoalPeriodId] = useState<string | null>(ls.get('org.goalPeriod'));
  const effectiveGoalPeriodId = goalPeriodId && goalPeriods.some((p) => p.id === goalPeriodId)
    ? goalPeriodId
    : (goalPeriods.find((p) => p.isCurrent)?.id ?? goalPeriods[0]?.id ?? null);
  const goalPeriodIsCurrent = goalPeriods.find((p) => p.id === effectiveGoalPeriodId)?.isCurrent ?? true;
  // Cadence calendar periods drive the Priorities & 9 Box selectors (period-
  // scoped reads + lock aligned to the cadence rollover). OKRs keep goal periods.
  const cadenceActivity: 'ninebox' | 'priorities' | null = tab === 'ninebox' ? 'ninebox' : tab === 'priorities' ? 'priorities' : null;
  const { data: cadPeriodOpts } = trpc.cadence.periodOptions.useQuery({ activity: cadenceActivity ?? 'priorities' }, { enabled: !!cadenceActivity });
  const [cadPeriodKey, setCadPeriodKey] = useState<string | null>(null);
  const cadCurrent = cadPeriodOpts?.find((p) => p.isCurrent) ?? cadPeriodOpts?.[0];
  const effectiveCadKey = cadPeriodKey && cadPeriodOpts?.some((p) => p.key === cadPeriodKey) ? cadPeriodKey : cadCurrent?.key;
  const selectedCadPeriod = cadPeriodOpts?.find((p) => p.key === effectiveCadKey);
  const cadIsCurrent = selectedCadPeriod?.isCurrent ?? true;
  const chooseGoalPeriod = (id: string) => { setGoalPeriodId(id); ls.set('org.goalPeriod', id); };

  // Cadence status (done/due/overdue per activity) for the loaded people, used
  // for the Due/Overdue badges on cards and 9-box chips (period cadence, 2026-07-27).
  const cadUserIds = useMemo(() => people.map((p) => p.id).slice(0, 2000), [people]);
  const { data: cadenceData } = trpc.cadence.status.useQuery({ userIds: cadUserIds }, { enabled: cadUserIds.length > 0 });
  const cadenceByUser = useMemo(() => {
    const m = new Map<string, { ninebox: 'done' | 'due' | 'overdue'; priorities: 'done' | 'due' | 'overdue'; reviews: 'done' | 'due' | 'overdue' }>();
    for (const r of cadenceData?.people ?? []) m.set(r.userId, { ninebox: r.ninebox, priorities: r.priorities, reviews: r.reviews });
    return m;
  }, [cadenceData]);
  const cadenceForTab = (id: string): 'done' | 'due' | 'overdue' | undefined => {
    const st = cadenceByUser.get(id);
    if (!st) return undefined;
    if (tab === 'priorities') return st.priorities;
    if (tab === 'review') return st.reviews;
    return undefined;
  };
  const nineboxStatusById = useMemo(() => {
    const m = new Map<string, 'done' | 'due' | 'overdue'>();
    for (const [id, st] of cadenceByUser) m.set(id, st.ninebox);
    return m;
  }, [cadenceByUser]);

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
    if (scope === 'organization') { setScope('individual'); ls.set('org.scope', 'individual'); }
  }, [scope]);

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

  // Export a one-page talent profile (directory + org context) for the selected
  // person. Uses data already loaded from the org tree — no extra fetch.
  const exportTalentProfile = () => {
    if (!selected) return;
    const mgr = selected.managerId ? maps.byId.get(selected.managerId) ?? null : null;
    const directs = directsOf(maps, selected.id);
    const orgSize = descendantsOf(maps, selected.id).length;
    // Manager chain from the top down to (not including) this person.
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur = selected.managerId;
    while (cur && !seen.has(cur)) { seen.add(cur); const m = maps.byId.get(cur); if (m) chain.unshift(m.name); cur = m?.managerId ?? null; }

    const kv = (k: string, v: string | null | undefined) =>
      `<div><span class="k">${escapeHtml(k)}:</span> ${escapeHtml(v ?? '—')}</div>`;
    const directsHtml = directs.length
      ? `<ul>${directs.map((d) => `<li>${escapeHtml(d.name)}${d.title ? ` — ${escapeHtml(d.title)}` : ''}</li>`).join('')}</ul>`
      : '<p class="muted">No direct reports.</p>';

    const body = `
      <h2>Profile</h2>
      <div class="kv">
        ${kv('Name', selected.name)}${kv('Title', selected.title)}
        ${kv('Department', selected.dept)}${kv('Manager', mgr?.name)}
        ${kv('Leadership tier', selected.leaderBadge)}${kv('App role', selected.role)}
        ${kv('Work location', selected.location)}${kv('Business unit', selected.businessUnit)}
        ${kv('ELT leader', selected.eltLeader)}${kv('Tenure', tenureLabel(selected.hireYear))}
      </div>
      <h2>Org Context</h2>
      <div class="kv">
        ${kv('Direct reports', String(directs.length))}${kv('Total org (below)', String(orgSize))}
        ${kv('Reporting line', chain.length ? chain.join(' › ') : '—')}
      </div>
      <h2>Direct Reports</h2>
      ${directsHtml}
    `;
    openPrintDoc({
      docTitle: `Talent Profile — ${selected.name}`,
      heading: 'Talent Profile',
      meta: `${escapeHtml(selected.name)}${selected.title ? ` · ${escapeHtml(selected.title)}` : ''}${selected.dept ? ` · ${escapeHtml(selected.dept)}` : ''}`,
      bodyHtml: body,
      footer: 'Confidential — for calibration / succession planning.',
    });
  };

  // In-scope people (spec §6).
  const scoped: Person[] = useMemo(() => {
    if (!selected) return [];
    if (scope === 'individual') return [selected];
    if (scope === 'directs') return directsOf(maps, selected.id);
    return descendantsOf(maps, selected.id);
  }, [selected, scope, maps, people]);

  // Apply employment/org filters before rendering cards (spec: filter bar).
  const visible: Person[] = useMemo(() => scoped.filter((p) =>
    (!fElt || p.eltLeader === fElt) &&
    (!fLoc || p.location === fLoc) &&
    (!fBu || p.businessUnit === fBu) &&
    (!fTen || tenureBand(p.hireYear) === fTen)
  ), [scoped, fElt, fLoc, fBu, fTen]);

  // Team scope → depth-banded groups.
  const banded = useMemo(() => {
    if (scope !== 'descendants' || !selected) return null;
    const base = depthOf(maps, selected.id);
    const groups = new Map<number, Person[]>();
    for (const p of visible) {
      const rel = depthOf(maps, p.id) - base;
      (groups.get(rel) ?? groups.set(rel, []).get(rel)!).push(p);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [scope, selected, visible, maps]);

  const grid = 'grid gap-4 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3';
  const filterSelStyle: React.CSSProperties = { color: TOKENS.activeText, background: '#fff', border: `1px solid ${TOKENS.border}`, padding: '4px 6px', borderRadius: 6 };

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
            <div className="flex items-center justify-between gap-2" style={{ padding: '12px 20px', borderBottom: `1px solid ${TOKENS.border}` }}>
              <div className="inline-flex rounded-lg p-0.5" style={{ background: '#eef0f2' }}>
                {visibleScopes.map((s) => (
                  <button key={s.key} onClick={() => chooseScope(s.key)}
                    className="text-[12px] font-medium rounded-md px-3 py-1"
                    style={scope === s.key ? { background: '#fff', color: TOKENS.activeText, boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6c757d' }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <select value={fElt} onChange={(e) => chooseFilter(setFElt, 'org.filter.elt')(e.target.value)}
                  className="text-[11px]" style={filterSelStyle} title="Filter by ELT leader">
                  <option value="">All ELT leaders</option>
                  {eltOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={fLoc} onChange={(e) => chooseFilter(setFLoc, 'org.filter.loc')(e.target.value)}
                  className="text-[11px]" style={filterSelStyle} title="Filter by location">
                  <option value="">All locations</option>
                  {locOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={fBu} onChange={(e) => chooseFilter(setFBu, 'org.filter.bu')(e.target.value)}
                  className="text-[11px]" style={filterSelStyle} title="Filter by business unit">
                  <option value="">All business units</option>
                  {buOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={fTen} onChange={(e) => chooseFilter(setFTen, 'org.filter.tenure')(e.target.value)}
                  className="text-[11px]" style={filterSelStyle} title="Filter by tenure">
                  <option value="">All tenures</option>
                  {TENURE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {selected && (
                  <button onClick={exportTalentProfile}
                    className="inline-flex items-center gap-1 text-[12px] font-medium rounded-md px-2.5 py-1.5"
                    style={{ color: TOKENS.activeText, border: `1px solid ${TOKENS.border}`, background: '#fff' }}
                    title={`Export a talent profile PDF for ${selected.name}`}>
                    <Printer size={14} /> Export talent profile
                  </button>
                )}
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
              {tab === 'okrs' && goalPeriods.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TOKENS.idle }}>Period</span>
                  <select value={effectiveGoalPeriodId ?? ''} onChange={(e) => chooseGoalPeriod(e.target.value)}
                    className="text-[12px] font-medium rounded-md"
                    style={{ color: TOKENS.activeText, background: '#fff', border: `1px solid ${TOKENS.border}`, padding: '5px 8px' }}>
                    {goalPeriods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              )}
              {(tab === 'priorities' || tab === 'ninebox') && (cadPeriodOpts?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TOKENS.idle }}>Period</span>
                  <select value={effectiveCadKey ?? ''} onChange={(e) => setCadPeriodKey(e.target.value)}
                    className="text-[12px] font-medium rounded-md"
                    style={{ color: TOKENS.activeText, background: '#fff', border: `1px solid ${TOKENS.border}`, padding: '5px 8px' }}>
                    {(cadPeriodOpts ?? []).map((p) => <option key={p.key} value={p.key}>{p.label}{p.isCurrent ? ' (current)' : ''}</option>)}
                  </select>
                </div>
              )}
            </div>
            {/* Body */}
            <div className="flex-1 overflow-auto" style={{ padding: 16 }}>
              {(tab === 'priorities' || tab === 'ninebox') && !cadIsCurrent && (
                <div className="text-[11px] mb-3" style={{ color: TOKENS.idle }}>Past period — view-only.</div>
              )}
              {tab === 'ninebox' ? (
                <NineBox people={scoped} allPeople={people} scope={scope} canPlace={canPlace} companyWide={canSeeCompanyWide} statusById={nineboxStatusById} readOnly={!cadIsCurrent} periodStartISO={selectedCadPeriod?.startISO} periodEndISO={selectedCadPeriod?.endISO} />
              ) : !selected ? (
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
                      {group.map((p) => <PersonCard key={p.id} person={p} tab={tab} periodId={effectivePeriodId} reviewPeriod={reviewPeriod} okrPeriodId={effectiveGoalPeriodId ?? undefined} cadence={cadenceForTab(p.id)} readOnly={tab === 'priorities' && !cadIsCurrent} prioritiesPeriodKey={tab === 'priorities' ? (effectiveCadKey ?? undefined) : undefined} managerName={p.managerId ? (maps.byId.get(p.managerId)?.name ?? null) : null} reportingLine={chainOf(p.id) || null} />)}
                    </div>
                  </div>
                ))
              ) : (
                <div className={grid}>
                  {visible.map((p) => <PersonCard key={p.id} person={p} tab={tab} periodId={effectivePeriodId} reviewPeriod={reviewPeriod} okrPeriodId={effectiveGoalPeriodId ?? undefined} cadence={cadenceForTab(p.id)} readOnly={tab === 'priorities' && !cadIsCurrent} prioritiesPeriodKey={tab === 'priorities' ? (effectiveCadKey ?? undefined) : undefined} managerName={p.managerId ? (maps.byId.get(p.managerId)?.name ?? null) : null} reportingLine={chainOf(p.id) || null} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
