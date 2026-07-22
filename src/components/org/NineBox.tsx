import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Person, BOX_NAMES, boxPerformance, boxPotential, TOKENS } from './orgLib';
import { Empty, TabState } from './atoms';

type NineScope = 'individual' | 'directs' | 'descendants' | 'organization';

// Diagonal wash: red (low/low) → green (high/high) by axis sum.
function cellTint(box: number): string {
  const sum = boxPerformance(box) + boxPotential(box);
  return ['#fdecec', '#fdeede', '#fcf6e3', '#eef7ec', '#e6f5ea'][sum];
}
const perfOf = (b: number) => (b - 1) % 3;
const potOf = (b: number) => Math.floor((b - 1) / 3);
const boxOf = (p: number, q: number) => q * 3 + p + 1;

export default function NineBox({ people, allPeople, scope, canPlace, companyWide }: {
  people: Person[];
  allPeople?: Person[];
  scope?: NineScope;
  canPlace?: (id: string) => boolean;
  companyWide?: boolean;
}) {
  const [editing, setEditing] = useState<Person | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cohort, setCohort] = useState<'managers' | 'elt'>('managers');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const all = allPeople ?? people;
  // Leadership-only aggregate views (Stage 4): Directs → cohorts, Team → departments.
  const cohortMode = !!companyWide && scope === 'directs';
  const deptMode = !!companyWide && scope === 'descendants';
  const pool = cohortMode || deptMode ? all : people;

  const ids = pool.map((p) => p.id);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.orgScreen.nineboxByIds.useQuery({ ids }, { enabled: ids.length > 0 });
  const rate = trpc.orgScreen.nineboxRate.useMutation({
    onSuccess: () => { utils.orgScreen.nineboxByIds.invalidate({ ids }); setEditing(null); },
    onError: (e) => setErr(e.data?.code === 'FORBIDDEN' ? 'You can only place people in your own reporting line.' : 'Could not save rating.'),
  });
  const clear = trpc.orgScreen.nineboxClear.useMutation({
    onSuccess: () => { utils.orgScreen.nineboxByIds.invalidate({ ids }); setEditing(null); },
    onError: (e) => setErr(e.data?.code === 'FORBIDDEN' ? 'You can only place people in your own reporting line.' : 'Could not remove rating.'),
  });

  if (ids.length === 0) return <Empty text="No one in this scope" />;
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <div className="text-[12px]" style={{ color: TOKENS.idle }}>Could not load ratings.</div>;

  const ratingByUser = new Map<string, number>();
  for (const r of data?.people ?? []) if (r.box != null) ratingByUser.set(r.userId, r.box);
  const editable = (id: string) => (canPlace ? canPlace(id) : true);

  const centroidOf = (list: Person[]) => {
    const boxes = list.map((p) => ratingByUser.get(p.id)).filter((b): b is number => b != null);
    if (!boxes.length) return null;
    const ap = boxes.reduce((s, b) => s + perfOf(b), 0) / boxes.length;
    const aq = boxes.reduce((s, b) => s + potOf(b), 0) / boxes.length;
    return { box: boxOf(Math.round(ap), Math.round(aq)), n: boxes.length, total: list.length, score: ap + aq };
  };

  const doRate = (userId: string, box: number) => { setErr(null); rate.mutate({ userId, box }); };
  const doClear = (userId: string) => { setErr(null); clear.mutate({ userId }); };

  const PersonChip = ({ person }: { person: Person }) => {
    const can = editable(person.id);
    const cls = 'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] w-full';
    const st = { background: '#fff', border: `1px solid ${TOKENS.border}` };
    const body = (<><span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.selBar }} /><span className="truncate" style={{ maxWidth: 100 }}>{person.name}</span></>);
    return can
      ? <button onClick={() => { setErr(null); setEditing(person); }} className={cls} style={st} title="Click to reposition">{body}</button>
      : <div className={cls} style={{ ...st, opacity: 0.7 }} title="View only — you cannot place this person">{body}</div>;
  };
  const TeamChip = ({ label, hint }: { label: string; hint: string }) => (
    <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] w-full" style={{ background: '#fff', border: `1px solid ${TOKENS.border}` }} title={hint}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.tierFill }} />
      <span className="truncate" style={{ maxWidth: 120 }}>{label}</span>
    </div>
  );

  const departments = Array.from(new Set(all.map((p) => p.dept).filter((d): d is string => !!d))).sort();
  const teamView = deptMode && deptFilter === 'all';

  // The individual population for chip / unrated rendering when NOT in team-chip view.
  let peoplePop: Person[] = people;
  if (cohortMode) {
    const managerIdSet = new Set(all.map((p) => p.managerId).filter((m): m is string => !!m));
    peoplePop = cohort === 'elt' ? all.filter((p) => p.leaderBadge === 'ELT') : all.filter((p) => managerIdSet.has(p.id));
  } else if (deptMode && deptFilter === 'viewall') {
    peoplePop = all;
  } else if (deptMode && deptFilter !== 'all') {
    peoplePop = all.filter((p) => p.dept === deptFilter);
  }

  const cells: Record<number, any[]> = {};
  for (let b = 1; b <= 9; b++) cells[b] = [];
  if (teamView) {
    for (const t of departments) {
      const c = centroidOf(all.filter((p) => p.dept === t));
      if (c) cells[c.box].push(<TeamChip key={t} label={t} hint={`${t} — ${c.n} of ${c.total} rated`} />);
    }
  } else {
    for (const p of peoplePop) {
      const b = ratingByUser.get(p.id);
      if (b != null) cells[b].push(<PersonChip key={p.id} person={p} />);
    }
  }
  const unrated = teamView ? [] : peoplePop.filter((p) => !ratingByUser.has(p.id));
  const showRail = scope !== 'individual';

  const selStyle = { border: `1px solid ${TOKENS.border}`, borderRadius: 6, padding: '6px 8px', background: '#fff', color: TOKENS.activeText, width: '100%' };
  const ddLabel = (t: string) => <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: TOKENS.idle }}>{t}</div>;

  const personRow = (p: Person, color: string) => (
    <div key={p.id} className="flex items-center justify-between gap-2 text-[12px]" style={{ padding: '3px 0' }}>
      <span className="truncate" style={{ color: TOKENS.activeText }}>{p.name}{p.dept ? <span className="text-[11px]" style={{ color: TOKENS.idle }}> · {p.dept}</span> : null}</span>
      <span className="text-[11px] whitespace-nowrap" style={{ color }}>{BOX_NAMES[ratingByUser.get(p.id) as number]}</span>
    </div>
  );
  const railCard = (title: string, color: string, rows: any[]) => (
    <div className="rounded-lg p-3 mb-3" style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color }}>{title}</div>
      {rows.length ? rows : <div className="text-[11px]" style={{ color: TOKENS.idle }}>None in scope.</div>}
    </div>
  );

  // Rail body per mode
  let rail: any = null;
  if (showRail) {
    const dropdown = cohortMode ? (
      <div className="mb-3">{ddLabel('Group')}
        <select value={cohort} onChange={(e) => setCohort(e.target.value as 'managers' | 'elt')} className="text-[12px]" style={selStyle}>
          <option value="managers">Managers</option>
          <option value="elt">ELT team</option>
        </select>
      </div>
    ) : deptMode ? (
      <div className="mb-3">{ddLabel('Department')}
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-[12px]" style={selStyle}>
          <option value="viewall">View all (everyone)</option>
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    ) : null;

    if (teamView) {
      const stats = departments.map((t) => ({ t, c: centroidOf(all.filter((p) => p.dept === t)) })).filter((x) => x.c) as { t: string; c: NonNullable<ReturnType<typeof centroidOf>> }[];
      const teamRow = (x: { t: string; c: { box: number; n: number; total: number } }, color: string) => (
        <div key={x.t} className="flex items-center justify-between gap-2 text-[12px]" style={{ padding: '3px 0' }}>
          <span className="truncate" style={{ color: TOKENS.activeText }}>{x.t}</span>
          <span className="text-[11px] whitespace-nowrap" style={{ color }}>{BOX_NAMES[x.c.box]} <span style={{ color: TOKENS.idle }}>· {x.c.n}/{x.c.total}</span></span>
        </div>
      );
      const topT = stats.filter((x) => [7, 8, 9].includes(x.c.box));
      const riskT = stats.filter((x) => [1, 2, 4].includes(x.c.box));
      rail = (<>{dropdown}{railCard(`Top teams (${topT.length})`, '#15803d', topT.map((x) => teamRow(x, '#15803d')))}{railCard(`Needs attention (${riskT.length})`, '#b91c1c', riskT.map((x) => teamRow(x, '#b91c1c')))}</>);
    } else {
      const top = peoplePop.filter((p) => { const b = ratingByUser.get(p.id); return b != null && [7, 8, 9].includes(b); });
      const risk = peoplePop.filter((p) => { const b = ratingByUser.get(p.id); return b != null && [1, 2, 4].includes(b); });
      rail = (<>{dropdown}{railCard(`Top performers (${top.length})`, '#15803d', top.map((p) => personRow(p, '#15803d')))}{railCard(`Needs attention (${risk.length})`, '#b91c1c', risk.map((p) => personRow(p, '#b91c1c')))}</>);
    }
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Grid + axes */}
      <div className="flex gap-2 shrink-0">
        <div className="flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TOKENS.idle, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Potential →</div>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-2" style={{ width: 468 }}>
            {[2, 1, 0].map((row) => [1, 2, 3].map((col) => {
              const box = row * 3 + col;
              return (
                <div key={box} className="rounded-lg p-2 flex flex-col" style={{ height: 132, background: cellTint(box), border: `1px solid ${TOKENS.borderSoft}` }}>
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: TOKENS.idle }}>
                    <span className="font-semibold">{BOX_NAMES[box]}</span><span>{box}</span>
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto">{cells[box]}</div>
                </div>
              );
            }))}
          </div>
          <div className="text-center text-[10px] font-bold uppercase tracking-wide mt-1" style={{ color: TOKENS.idle }}>Performance →</div>
        </div>
      </div>

      {/* Right column — rail (dropdown + Top/Needs) then Unrated, beside the grid */}
      <div className="flex flex-col gap-4" style={{ minWidth: 230 }}>
        {showRail && <div>{rail}</div>}
        {!teamView && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: TOKENS.idle }}>Unrated ({unrated.length})</div>
            {err && <div className="text-[11px] mb-2" style={{ color: '#b91c1c' }}>{err}</div>}
            <div className="space-y-1">
              {unrated.map((u) => (
                editable(u.id) ? (
                  <button key={u.id} onClick={() => { setErr(null); setEditing(u); }} className="w-full text-left rounded px-2 py-1 text-[12px]" style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}` }} title="Click to place on the grid">{u.name}</button>
                ) : (
                  <div key={u.id} className="w-full text-left rounded px-2 py-1 text-[12px]" style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}`, opacity: 0.7 }} title="View only — you cannot place this person">{u.name}</div>
                )
              ))}
              {unrated.length === 0 && <div className="text-[11px]" style={{ color: TOKENS.idle }}>Everyone in scope is rated.</div>}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <RateModal
          person={editing}
          current={ratingByUser.get(editing.id) ?? null}
          saving={rate.isLoading}
          removing={clear.isLoading}
          onPick={(b) => doRate(editing.id, b)}
          onRemove={() => doClear(editing.id)}
          onClose={() => { setErr(null); setEditing(null); }}
        />
      )}
    </div>
  );
}

function RateModal({ person, current, saving, removing, onPick, onRemove, onClose }: {
  person: Person; current: number | null; saving: boolean; removing: boolean;
  onPick: (b: number) => void; onRemove: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,.45)' }} onClick={onClose}>
      <div className="rounded-xl p-5 shadow-xl" style={{ background: '#fff', width: 328 }} onClick={(e) => e.stopPropagation()}>
        <div className="text-[15px] font-semibold" style={{ color: TOKENS.activeText }}>{person.name}</div>
        <div className="text-[12px] mb-3" style={{ color: TOKENS.idle }}>
          {current ? `Currently ${BOX_NAMES[current]} (${current}) — choose a new position` : 'Choose a 9-box position'}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((b) => (
            <button key={b} disabled={saving} onClick={() => onPick(b)}
              className="rounded-lg p-2 text-left"
              style={{ background: cellTint(b), border: b === current ? `2px solid ${TOKENS.selBar}` : `1px solid ${TOKENS.borderSoft}`, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer', height: 58 }}>
              <div className="text-[10px] font-semibold leading-tight" style={{ color: TOKENS.activeText }}>{BOX_NAMES[b]}</div>
              <div className="text-[10px]" style={{ color: TOKENS.idle }}>{b}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {current != null && (
            <button onClick={onRemove} disabled={removing} className="flex-1 text-[12px] rounded-lg py-2" style={{ border: '1px solid #fecaca', color: '#b91c1c', background: '#fef2f2', opacity: removing ? 0.6 : 1, cursor: removing ? 'default' : 'pointer' }}>Remove rating</button>
          )}
          <button onClick={onClose} className="flex-1 text-[12px] rounded-lg py-2" style={{ border: `1px solid ${TOKENS.border}`, color: TOKENS.idle }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
