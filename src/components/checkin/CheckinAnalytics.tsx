// ============================================================
// CHECK-IN ANALYTICS — manager view that quantifies check-in responses so
// patterns across past check-ins are easy to see. Two sub-views:
//  • Team      — pick a team (everyone / a department / a manager's reports,
//                sourced from the Organization directory), then a sortable
//                scorecard: latest score, Δ vs prior check-in, flight-risk flag,
//                per-category scores. Riskiest float up.
//  • Per person — search any employee from the Organization directory and see
//                their trend (overall + per category) over their check-ins.
// Pure math lives in src/lib/checkinAnalytics.ts; this file only renders.
// ============================================================

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Users, User, TrendingUp, ChevronLeft, AlertTriangle, Search, X } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { fmtDate } from '../../lib/date';
import {
  buildTeamScorecard, buildPersonSeries, teamSummary,
  labelForCategory, scoreBand,
  RISK_LEVEL, WATCH_LEVEL, RISK_DROP,
  type CheckinResponseLite, type FlagLevel, type FlagResult, type TeamRow,
} from '../../lib/checkinAnalytics';

const CAT_COLORS = ['#2E89B8', '#2E9E7B', '#C99300', '#C2615A', '#7A5FB0', '#4FA9D6', '#9A8C6A'];
const OVERALL_COLOR = '#1F2933'; // near-black, deliberately distinct from the cyan category palette

const FLAG_META: Record<FlagLevel, { label: string; cls: string; dot: string }> = {
  risk:  { label: 'At risk', cls: 'bg-ls-risk-bg text-ls-risk',     dot: 'bg-ls-risk' },
  watch: { label: 'Watch',   cls: 'bg-ls-watch-bg text-ls-watch',   dot: 'bg-ls-watch' },
  ok:    { label: 'On track', cls: 'bg-ls-thrive-bg text-ls-thrive', dot: 'bg-ls-thrive' },
};

type Member = {
  id: string; name: string;
  departmentId: string | null; departmentName: string | null;
  managerId: string | null; managerName: string | null;
};

function FlagBadge({ flag }: { flag: FlagResult }) {
  const m = FLAG_META[flag.level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}
      title={flag.reasons.join(' · ')}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
    </span>
  );
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-xs text-ls-ink-3">— new</span>;
  if (delta === 0) return <span className="text-xs text-ls-ink-3">no change</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-ls-thrive' : 'text-ls-risk'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

const bandCls = (v: number | null | undefined) => {
  const b = scoreBand(v);
  return b === 'high' ? 'text-ls-thrive font-semibold'
    : b === 'low' ? 'text-ls-risk font-semibold'
    : b === 'mid' ? 'text-ls-ink font-medium'
    : 'text-ls-ink-3';
};
const fmtScore = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ls-card p-4">
      <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-1">{label}</div>
      <div className="text-3xl font-extrabold text-ls-blue-deep">{value}</div>
      {sub && <div className="text-[12px] text-ls-ink-3 mt-1">{sub}</div>}
    </div>
  );
}

// Searchable employee picker (mirrors the OKRs By-Person picker pattern).
function EmployeePicker({ members, onPick }: { members: Member[]; onPick: (m: Member) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? members.filter((m) => m.name.toLowerCase().includes(s)
      || (m.departmentName ?? '').toLowerCase().includes(s)) : members;
    return base.slice(0, 50);
  }, [members, q]);
  return (
    <div className="relative max-w-md">
      <div className="flex items-center gap-2 px-3 py-2 border border-ls-line rounded-md bg-white focus-within:ring-2 focus-within:ring-ls-blue">
        <Search size={16} className="text-ls-ink-3 shrink-0" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search an employee from the Organization directory…"
          className="w-full text-sm outline-none" />
        {q && <button onClick={() => { setQ(''); setOpen(true); }} className="text-ls-ink-3 hover:text-ls-ink"><X size={14} /></button>}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-ls-line rounded-md shadow-ls-2">
          {filtered.map((m) => (
            <button key={m.id} onClick={() => { onPick(m); setOpen(false); setQ(''); }}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-ls-bg-2">
              <span className="font-medium text-ls-ink">{m.name}</span>
              {m.departmentName && <span className="text-xs text-ls-ink-3">{m.departmentName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CheckinAnalytics({
  rows, loading,
}: { rows: CheckinResponseLite[]; loading: boolean }) {
  const { data: org, isLoading: orgLoading } = trpc.organization.list.useQuery();
  const members: Member[] = useMemo(
    () => ((org?.members ?? []) as any[]).map((m) => ({
      id: m.id, name: m.name,
      departmentId: m.departmentId ?? null, departmentName: m.departmentName ?? null,
      managerId: m.managerId ?? null, managerName: m.managerName ?? null,
    })),
    [org],
  );

  const [team, setTeam] = useState('all');       // 'all' | `dept:<name>` | `mgr:<id>`
  const [selected, setSelected] = useState<Member | null>(null);

  // Team membership set for the current filter (null = everyone).
  const teamMemberIds = useMemo<Set<string> | null>(() => {
    if (team === 'all') return null;
    if (team.startsWith('dept:')) {
      const name = team.slice(5);
      return new Set(members.filter((m) => m.departmentName === name).map((m) => m.id));
    }
    if (team.startsWith('mgr:')) {
      const id = team.slice(4);
      return new Set(members.filter((m) => m.managerId === id).map((m) => m.id));
    }
    return null;
  }, [team, members]);

  const scopedRows = useMemo(
    () => (teamMemberIds ? rows.filter((r) => r.respondentId && teamMemberIds.has(r.respondentId)) : rows),
    [rows, teamMemberIds],
  );

  const { rows: teamRows, categories } = useMemo(() => buildTeamScorecard(scopedRows), [scopedRows]);
  const summary = useMemo(() => teamSummary(scopedRows), [scopedRows]);
  const allSeries = useMemo(() => buildPersonSeries(rows), [rows]);

  const deptOptions = useMemo(
    () => [...new Set(members.map((m) => m.departmentName).filter((d): d is string => !!d))].sort(),
    [members],
  );
  const managerOptions = useMemo(() => {
    const ids = new Set(members.map((m) => m.managerId).filter((x): x is string => !!x));
    return members.filter((m) => ids.has(m.id)).map((m) => ({ id: m.id, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  if (loading || orgLoading) return <div className="ls-card p-8 text-center text-ls-ink-3">Loading analytics…</div>;

  // ---------------------------------------------------------------- Per person
  if (selected) {
    const person = allSeries.find((p) => p.respondentId === selected.id);
    const chartData = (person?.points ?? []).map((pt) => {
      const row: Record<string, string | number | null> = { label: fmtDate(pt.weekOf), Overall: pt.overall };
      for (const c of categories.length ? categories : Object.keys(pt.byCategory)) row[labelForCategory(c)] = pt.byCategory[c] ?? null;
      return row;
    });
    const cats = categories.length ? categories : (person ? Object.keys(person.points[person.points.length - 1]?.byCategory ?? {}) : []);
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-ls-blue-deep hover:underline">
          <ChevronLeft size={16} /> Back to team
        </button>

        <EmployeePicker members={members} onPick={setSelected} />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ls-blue-50 text-ls-blue-deep grid place-items-center"><User size={18} /></div>
          <div>
            <h3 className="text-lg font-bold text-ls-ink">{selected.name}</h3>
            <div className="flex items-center gap-2 text-sm text-ls-ink-3">
              {person ? <FlagBadge flag={person.flag} /> : <span className="text-ls-ink-3">No check-ins yet</span>}
              {person && <span>{person.checkinCount} check-in{person.checkinCount === 1 ? '' : 's'}</span>}
              {selected.departmentName && <span>· {selected.departmentName}</span>}
            </div>
          </div>
        </div>

        {!person ? (
          <div className="ls-card p-8 text-center text-ls-ink-3">
            {selected.name} hasn’t submitted any check-ins yet — nothing to chart.
          </div>
        ) : (
          <>
            {person.flag.reasons.length > 0 && (
              <div className="ls-card p-3 flex items-start gap-2 text-sm text-ls-ink-2">
                <AlertTriangle size={16} className="text-ls-watch mt-0.5 shrink-0" />
                <span>{person.flag.reasons.join(' · ')}</span>
              </div>
            )}
            <div className="ls-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">Scores over time (1–5)</div>
              <div className="text-xs text-ls-ink-3 mb-3">
                <span className="font-semibold text-ls-ink">Overall</span> (thick black line) is the average of every question in that check-in;
                the thinner dashed lines are each category.
              </div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 6, right: 16, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A969E' }} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#8A969E' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E3E8EB' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {/* categories first (drawn underneath), Overall last so it sits on top */}
                    {cats.map((c, i) => (
                      <Line key={c} type="monotone" dataKey={labelForCategory(c)} stroke={CAT_COLORS[i % CAT_COLORS.length]}
                        strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
                    ))}
                    <Line type="monotone" dataKey="Overall" stroke={OVERALL_COLOR} strokeWidth={3}
                      dot={{ r: 5, fill: OVERALL_COLOR, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="ls-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ls-ink-3 border-b border-ls-line">
                    <th className="px-4 py-2 font-medium">Check-in</th>
                    <th className="px-3 py-2 font-medium text-right">Overall</th>
                    {cats.map((c) => <th key={c} className="px-3 py-2 font-medium text-right">{labelForCategory(c)}</th>)}
                    <th className="px-3 py-2 font-medium text-right">eNPS</th>
                  </tr>
                </thead>
                <tbody>
                  {[...person.points].reverse().map((pt) => (
                    <tr key={pt.responseId} className="border-b border-ls-line last:border-0">
                      <td className="px-4 py-2 text-ls-ink-2">{fmtDate(pt.weekOf)}</td>
                      <td className={`px-3 py-2 text-right ${bandCls(pt.overall)}`}>{fmtScore(pt.overall)}</td>
                      {cats.map((c) => <td key={c} className={`px-3 py-2 text-right ${bandCls(pt.byCategory[c])}`}>{fmtScore(pt.byCategory[c])}</td>)}
                      <td className="px-3 py-2 text-right text-ls-ink-2">{pt.enps == null ? '—' : pt.enps.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------- Team
  const riskCount = teamRows.filter((r) => r.flag.level === 'risk').length;
  const watchCount = teamRows.filter((r) => r.flag.level === 'watch').length;
  const enps = summary.enps;
  const teamSize = teamMemberIds ? teamMemberIds.size : members.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-[11px] uppercase tracking-wide text-ls-ink-3">Team</label>
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          className="px-3 py-2 border border-ls-line rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ls-blue">
          <option value="all">Everyone</option>
          {deptOptions.length > 0 && (
            <optgroup label="By department">
              {deptOptions.map((d) => <option key={d} value={`dept:${d}`}>{d}</option>)}
            </optgroup>
          )}
          {managerOptions.length > 0 && (
            <optgroup label="By manager">
              {managerOptions.map((m) => <option key={m.id} value={`mgr:${m.id}`}>{m.name}’s team</option>)}
            </optgroup>
          )}
        </select>
        <span className="text-xs text-ls-ink-3">{teamSize} {teamSize === 1 ? 'person' : 'people'}</span>
        <button onClick={() => setSelected(members[0] ?? null)}
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-ls-blue-deep hover:underline">
          <Search size={14} /> Look up a person
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <StatCard label={`Team score${summary.latestPeriod ? ` · ${fmtDate(summary.latestPeriod)}` : ''}`}
          value={fmtScore(summary.teamOverallLatest)} sub="avg of latest check-ins (1–5)" />
        <StatCard label="Participation"
          value={teamSize > 0 ? `${Math.round((summary.respondentsLatest / teamSize) * 100)}%` : '—'}
          sub={`${summary.respondentsLatest}${teamSize > 0 ? ` of ${teamSize}` : ''} this period`} />
        <StatCard label={`eNPS${enps.weekOf ? ` · ${fmtDate(enps.weekOf)}` : ''}`}
          value={enps.score == null ? '—' : String(enps.score)}
          sub={enps.n > 0 ? `${enps.promoters} prom · ${enps.detractors} detr (n=${enps.n})` : 'no eNPS asked yet'} />
        <StatCard label="Needs attention" value={String(riskCount + watchCount)}
          sub={`${riskCount} at risk · ${watchCount} watch`} />
      </div>

      <div className="flex items-center gap-2 text-xs text-ls-ink-3">
        <Users size={14} /> Sorted by attention needed — click a person to see their trend.
        <span className="ml-auto">Flag: at risk ≤ {RISK_LEVEL.toFixed(1)} or −{RISK_DROP.toFixed(1)} pt drop · watch ≤ {WATCH_LEVEL.toFixed(1)}</span>
      </div>

      {teamRows.length === 0 ? (
        <div className="ls-card p-8 text-center">
          <TrendingUp className="mx-auto text-ls-ink-3 mb-2" size={32} />
          <p className="text-sm text-ls-ink-3">No check-ins for this team yet.</p>
        </div>
      ) : (
        <div className="ls-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ls-ink-3 border-b border-ls-line">
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium text-right">Overall</th>
                <th className="px-3 py-2.5 font-medium text-right">Δ</th>
                {categories.map((c) => <th key={c} className="px-3 py-2.5 font-medium text-right">{labelForCategory(c)}</th>)}
                <th className="px-3 py-2.5 font-medium text-right">Check-ins</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((r: TeamRow) => (
                <tr key={r.respondentId} onClick={() => setSelected(members.find((m) => m.id === r.respondentId) ?? { id: r.respondentId, name: r.respondentName, departmentId: null, departmentName: null, managerId: null, managerName: null })}
                  className="border-b border-ls-line last:border-0 hover:bg-ls-bg-2 cursor-pointer">
                  <td className="px-4 py-2.5 font-semibold text-ls-ink">{r.respondentName}</td>
                  <td className="px-3 py-2.5"><FlagBadge flag={r.flag} /></td>
                  <td className={`px-3 py-2.5 text-right ${bandCls(r.overall)}`}>{fmtScore(r.overall)}</td>
                  <td className="px-3 py-2.5 text-right"><DeltaChip delta={r.overallDelta} /></td>
                  {categories.map((c) => <td key={c} className={`px-3 py-2.5 text-right ${bandCls(r.byCategory[c])}`}>{fmtScore(r.byCategory[c])}</td>)}
                  <td className="px-3 py-2.5 text-right text-ls-ink-3">{r.checkinCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
