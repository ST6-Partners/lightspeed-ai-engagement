// ============================================================
// CHECK-IN ANALYTICS — manager view that quantifies check-in responses so
// patterns across past check-ins are easy to see. Two sub-views:
//  • Team      — sortable scorecard: latest score, Δ vs prior check-in, a
//                flight-risk flag, and per-category scores. Riskiest float up.
//  • Per person — trend lines (overall + per category) over their check-ins.
// Pure math lives in src/lib/checkinAnalytics.ts; this file only renders.
// ============================================================

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Users, User, TrendingUp, ChevronLeft, AlertTriangle } from 'lucide-react';
import { fmtDate } from '../../lib/date';
import {
  buildTeamScorecard, buildPersonSeries, teamSummary,
  labelForCategory, scoreBand,
  RISK_LEVEL, WATCH_LEVEL, RISK_DROP,
  type CheckinResponseLite, type FlagLevel, type FlagResult, type TeamRow,
} from '../../lib/checkinAnalytics';

const CAT_COLORS = ['#2E89B8', '#2E9E7B', '#C99300', '#C2615A', '#7A5FB0', '#4FA9D6', '#9A8C6A'];
const OVERALL_COLOR = '#2E3942';

const FLAG_META: Record<FlagLevel, { label: string; cls: string; dot: string }> = {
  risk:  { label: 'At risk', cls: 'bg-ls-risk-bg text-ls-risk',     dot: 'bg-ls-risk' },
  watch: { label: 'Watch',   cls: 'bg-ls-watch-bg text-ls-watch',   dot: 'bg-ls-watch' },
  ok:    { label: 'On track', cls: 'bg-ls-thrive-bg text-ls-thrive', dot: 'bg-ls-thrive' },
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

export default function CheckinAnalytics({
  rows, peopleCount, loading,
}: { rows: CheckinResponseLite[]; peopleCount: number; loading: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);

  const { rows: teamRows, categories } = useMemo(() => buildTeamScorecard(rows), [rows]);
  const summary = useMemo(() => teamSummary(rows), [rows]);
  const series = useMemo(() => buildPersonSeries(rows), [rows]);

  if (loading) return <div className="ls-card p-8 text-center text-ls-ink-3">Loading analytics…</div>;

  if (rows.length === 0) {
    return (
      <div className="ls-card p-8 text-center">
        <TrendingUp className="mx-auto text-ls-ink-3 mb-2" size={32} />
        <p className="text-sm text-ls-ink-3">No check-ins submitted yet — analytics appear once responses come in.</p>
      </div>
    );
  }

  // ---- Per-person view ----
  if (selected) {
    const person = series.find((p) => p.respondentId === selected);
    if (!person) { setSelected(null); return null; }
    const chartData = person.points.map((pt) => {
      const row: Record<string, string | number | null> = { label: fmtDate(pt.weekOf), Overall: pt.overall };
      for (const c of categories) row[labelForCategory(c)] = pt.byCategory[c] ?? null;
      return row;
    });
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-ls-blue-deep hover:underline">
          <ChevronLeft size={16} /> Back to team
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ls-blue-50 text-ls-blue-deep grid place-items-center"><User size={18} /></div>
          <div>
            <h3 className="text-lg font-bold text-ls-ink">{person.respondentName}</h3>
            <div className="flex items-center gap-2 text-sm text-ls-ink-3">
              <FlagBadge flag={person.flag} />
              <span>{person.checkinCount} check-in{person.checkinCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
        {person.flag.reasons.length > 0 && (
          <div className="ls-card p-3 flex items-start gap-2 text-sm text-ls-ink-2">
            <AlertTriangle size={16} className="text-ls-watch mt-0.5 shrink-0" />
            <span>{person.flag.reasons.join(' · ')}</span>
          </div>
        )}
        <div className="ls-card p-4">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-3">Scores over time (1–5)</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EB" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A969E' }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#8A969E' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E3E8EB' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Overall" stroke={OVERALL_COLOR} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                {categories.map((c, i) => (
                  <Line key={c} type="monotone" dataKey={labelForCategory(c)} stroke={CAT_COLORS[i % CAT_COLORS.length]}
                    strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ls-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ls-ink-3 border-b border-ls-line">
                <th className="px-4 py-2 font-medium">Check-in</th>
                <th className="px-3 py-2 font-medium text-right">Overall</th>
                {categories.map((c) => <th key={c} className="px-3 py-2 font-medium text-right">{labelForCategory(c)}</th>)}
                <th className="px-3 py-2 font-medium text-right">eNPS</th>
              </tr>
            </thead>
            <tbody>
              {[...person.points].reverse().map((pt) => (
                <tr key={pt.responseId} className="border-b border-ls-line last:border-0">
                  <td className="px-4 py-2 text-ls-ink-2">{fmtDate(pt.weekOf)}</td>
                  <td className={`px-3 py-2 text-right ${bandCls(pt.overall)}`}>{fmtScore(pt.overall)}</td>
                  {categories.map((c) => <td key={c} className={`px-3 py-2 text-right ${bandCls(pt.byCategory[c])}`}>{fmtScore(pt.byCategory[c])}</td>)}
                  <td className="px-3 py-2 text-right text-ls-ink-2">{pt.enps == null ? '—' : pt.enps.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- Team view ----
  const riskCount = teamRows.filter((r) => r.flag.level === 'risk').length;
  const watchCount = teamRows.filter((r) => r.flag.level === 'watch').length;
  const enps = summary.enps;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 gap-3">
        <StatCard label={`Team score${summary.latestPeriod ? ` · ${fmtDate(summary.latestPeriod)}` : ''}`}
          value={fmtScore(summary.teamOverallLatest)} sub="avg of latest check-ins (1–5)" />
        <StatCard label="Participation"
          value={peopleCount > 0 ? `${Math.round((summary.respondentsLatest / peopleCount) * 100)}%` : '—'}
          sub={`${summary.respondentsLatest}${peopleCount > 0 ? ` of ${peopleCount}` : ''} this period`} />
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
              <tr key={r.respondentId} onClick={() => setSelected(r.respondentId)}
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
    </div>
  );
}
