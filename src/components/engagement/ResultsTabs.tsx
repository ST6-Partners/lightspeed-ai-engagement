// Additional analytics tabs (15Five parity): Statements, Engagement, Heatmap,
// eNPS, Feedback. Read from engagementAnalytics.results (+ .enps / .feedback).
import { useMemo, useState } from 'react';
import {
  LineChart, Line, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DRIVER_LABEL, QUESTION_TEXT, DRIVERS, type DriverKey } from '../../lib/engagementSurvey';
import { trpc } from '../../lib/trpc';
import type { AnalyticsData } from './Results';

const DRIVER_MEANING: Record<string, string> = Object.fromEntries(DRIVERS.map((d) => [d.key, d.meaning]));
const dlabel = (k: string) => DRIVER_LABEL[k as DriverKey] ?? k;
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}%`);
const ord = (n: number) => `${n}th`;
function percentileOf(val: number, arr: number[]): number {
  const clean = arr.filter((x) => x != null);
  if (clean.length <= 1) return 50;
  const below = clean.filter((x) => x < val).length;
  return Math.round((below / (clean.length - 1)) * 100);
}

// favorable/neutral/unfavorable bar with a hover count popup
function FavBar({ unfav, fav, total }: { unfav: number; fav: number; total?: number | null }) {
  const neu = Math.max(0, 100 - unfav - fav);
  const fc = total ? Math.round((fav / 100) * total) : null;
  const uc = total ? Math.round((unfav / 100) * total) : null;
  const nc = total && fc != null && uc != null ? total - fc - uc : null;
  const title = total
    ? `Of ${total} responses:\n• Favorable: ${fc} (${Math.round(fav)}%)\n• Neutral: ${nc} (${Math.round(neu)}%)\n• Unfavorable: ${uc} (${Math.round(unfav)}%)`
    : `Favorable ${Math.round(fav)}% · Neutral ${Math.round(neu)}% · Unfavorable ${Math.round(unfav)}%`;
  return (
    <div className="flex items-center gap-2" title={title}>
      <div className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-ls-bg-2 min-w-[90px]">
        <div className="h-full bg-ls-risk" style={{ width: `${unfav}%` }} />
        <div className="h-full bg-ls-line" style={{ width: `${neu}%` }} />
        <div className="h-full" style={{ width: `${fav}%`, background: '#1a9db0' }} />
      </div>
      <span className="text-[12px] font-semibold text-ls-ink-2 w-[74px] text-right tabular-nums">{Math.round(unfav)}% · {Math.round(fav)}%</span>
    </div>
  );
}

function MiniTrend({ trend }: { trend: { label: string; favorablePct: number | null }[] }) {
  const data = trend.map((t) => ({ label: t.label, v: t.favorablePct == null ? null : Math.round(t.favorablePct) }));
  return (
    <div style={{ width: 104, height: 30 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 3, bottom: 0, left: 0 }}>
          <YAxis domain={[0, 100]} hide />
          <Tooltip formatter={(v) => [`${v}%`, 'Favorable']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="v" stroke="#4FA9D6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------- STATEMENTS ----------------
export function ResultsStatements({ data }: { data: AnalyticsData }) {
  const [filter, setFilter] = useState<'all' | 'topneg' | 'toppos' | 'topover'>('all');
  const driverTrend = useMemo(() => new Map(data.drivers.map((d) => [d.key, d.trend])), [data.drivers]);
  const total = data.company.responseCount;
  let list = data.questions.filter((q) => q.favorablePct != null);
  const favs = list.map((q) => q.favorablePct as number);
  if (filter === 'topneg') list = [...list].sort((a, b) => (a.favorablePct ?? 0) - (b.favorablePct ?? 0)).slice(0, 5);
  else if (filter === 'toppos') list = [...list].sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0)).slice(0, 5);
  else if (filter === 'topover') list = [...list].sort((a, b) => Math.abs((b.favorablePct ?? 50) - 50) - Math.abs((a.favorablePct ?? 50) - 50)).slice(0, 5);
  else list = [...list].sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));

  if (data.questions.length === 0) {
    return <div className="ls-card p-6 text-[13px] text-ls-ink-3">Statement-level results aren’t available for this period. They populate from an imported statement export or in-app survey responses.</div>;
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[12.5px] text-ls-ink-3 m-0">Each statement maps to a driver (hover the tag for its definition). Percentile is within the company.</p>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Filter</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white">
            <option value="all">All statements</option>
            <option value="topneg">Top 5 negative impact</option>
            <option value="toppos">Top 5 positive impact</option>
            <option value="topover">Top 5 overall impact</option>
          </select>
        </div>
      </div>
      <div className="ls-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
          <div className="col-span-4">Driver · Statement</div>
          <div className="col-span-2 text-center">Predictive impact</div>
          <div className="col-span-1 text-center">Pctile</div>
          <div className="col-span-1 text-center">Avg</div>
          <div className="col-span-1 text-center">Trend</div>
          <div className="col-span-3 text-center">Unfavorable · Favorable</div>
        </div>
        {list.map((q) => {
          const p = percentileOf(q.favorablePct as number, favs);
          const tr = (q.driver && driverTrend.get(q.driver)) || [];
          return (
            <div key={q.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-ls-line last:border-0">
              <div className="col-span-4">
                <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep" title={q.driver ? DRIVER_MEANING[q.driver] : ''}>{q.driver ? dlabel(q.driver) : '—'}</span>
                <div className="text-[13px] text-ls-ink-2 mt-1.5">{q.text ?? QUESTION_TEXT[q.id] ?? q.id}</div>
              </div>
              <div className="col-span-2 text-center text-ls-ink-3 text-[13px]" title="Reserved — predictive impact needs a model we don't have for this dataset. The column is wired for a future impact model.">—</div>
              <div className="col-span-1 text-center text-[13px] font-semibold tabular-nums">{ord(p)}</div>
              <div className="col-span-1 text-center text-[13px] tabular-nums">{q.mean != null ? q.mean.toFixed(2) : '—'}</div>
              <div className="col-span-1 flex justify-center">{tr.length > 1 ? <MiniTrend trend={tr} /> : <span className="text-ls-ink-3 text-[12px]">—</span>}</div>
              <div className="col-span-3"><FavBar unfav={q.unfavorablePct ?? 0} fav={q.favorablePct ?? 0} total={total} /></div>
            </div>
          );
        })}
      </div>
      <p className="text-[11.5px] text-ls-ink-3 mt-2"><b>Predictive impact</b> is intentionally blank for this dataset — wired so a future impact model can populate it.</p>
    </div>
  );
}

// ---------------- ENGAGEMENT (breakdown + trend) ----------------
export function ResultsEngagement({ data }: { data: AnalyticsData }) {
  const trend = data.company.trend.map((t) => ({ label: t.label, v: t.favorablePct == null ? null : Math.round(t.favorablePct) }));
  const depts = data.departments;
  const scoreBasis = data.departmentBasis === 'score';
  const vals = depts.map((d) => d.favorablePct ?? 0);
  return (
    <div className="space-y-4">
      <div className="ls-card p-5">
        <h3 className="font-bold mb-1">Engagement trend</h3>
        <p className="text-[12px] text-ls-ink-3 mb-3">Company favorability across survey periods.</p>
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#677480' }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Favorable']} />
              <Line type="monotone" dataKey="v" stroke="#4FA9D6" strokeWidth={3} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11.5px] text-ls-ink-3 mt-1">Per-person engagement bands (disengaged → extremely engaged) populate from in-app survey responses; imported periods store favorability.</p>
      </div>
      {depts.length > 0 && (
        <div className="ls-card overflow-hidden">
          <div className="px-4 py-3 border-b border-ls-line"><h3 className="font-bold">Engagement breakdown</h3></div>
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
            <div className="col-span-4">Group</div>
            <div className="col-span-2 text-center">{scoreBasis ? 'Score' : 'Favorable'}</div>
            <div className="col-span-2 text-center">Change</div>
            <div className="col-span-2 text-center">Response rate</div>
            <div className="col-span-2 text-center">Percentile</div>
          </div>
          {depts.map((d) => {
            const p = percentileOf(d.favorablePct ?? 0, vals);
            return (
              <div key={d.name} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-ls-line last:border-0">
                <div className="col-span-4 font-semibold text-[13px]">{d.name}</div>
                <div className="col-span-2 text-center text-[13px] tabular-nums">{d.favorablePct == null ? '—' : scoreBasis ? d.favorablePct.toFixed(1) : `${Math.round(d.favorablePct)}%`}</div>
                <div className="col-span-2 text-center text-[13px]">{d.delta == null ? <span className="text-ls-ink-3">—</span> : <span style={{ color: d.delta >= 0 ? '#5F8C1A' : '#C2615A' }} className="font-semibold">{d.delta >= 0 ? '▲' : '▼'} {Math.abs(d.delta).toFixed(1)}</span>}</div>
                <div className="col-span-2 text-center text-[13px] tabular-nums">{d.participationPct != null ? `${Math.round(d.participationPct)}%` : '—'}</div>
                <div className="col-span-2 text-center text-[13px] tabular-nums">{ord(p)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- HEATMAP ----------------
export function ResultsHeatmap({ data }: { data: AnalyticsData }) {
  const [metric, setMetric] = useState<'avg' | 'fav'>('fav');
  const drivers = data.drivers.map((d) => d.key);
  const rowsWithDriver = data.departments.filter((d) => d.byDriver && d.byDriver.length > 0);
  const diverge = (fav: number) => fav >= 88 ? '#5FB8C9' : fav >= 80 ? '#96CFDA' : fav >= 70 ? '#CFE8ED' : fav >= 60 ? '#F4D7D2' : fav >= 50 ? '#EBB1A9' : '#E0897E';
  const divergeAvg = (m: number) => m >= 3.6 ? '#5FB8C9' : m >= 3.4 ? '#96CFDA' : m >= 3.1 ? '#CFE8ED' : m >= 2.9 ? '#EFF3F4' : m >= 2.6 ? '#F4D7D2' : m >= 2.3 ? '#EBB1A9' : '#E0897E';

  if (rowsWithDriver.length === 0) {
    return (
      <div>
        <div className="ls-card p-4 mb-4 border-l-4 border-ls-watch text-[13px] text-ls-ink-2">
          Per-team × driver detail isn’t available for <b>{data.company.label}</b> — this period was imported at the company/overall level. The heatmap fills in once teams take the survey in-app (each response is tagged by department and driver). Below is each team’s overall engagement score.
        </div>
        {data.departments.length > 0 && (
          <div className="ls-card overflow-hidden">
            {data.departments.map((d) => (
              <div key={d.name} className="flex items-center justify-between px-4 py-2.5 border-b border-ls-line last:border-0">
                <span className="text-[13px] font-semibold">{d.name}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: diverge(d.favorablePct ?? 0) }}>{d.favorablePct == null ? '—' : (data.departmentBasis === 'score' ? d.favorablePct.toFixed(1) : `${Math.round(d.favorablePct)}%`)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Show</label>
        <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)} className="px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white">
          <option value="fav">Favorable %</option>
          <option value="avg">Average response</option>
        </select>
      </div>
      <div className="ls-card overflow-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 border-b-2 border-ls-line sticky left-0 bg-white min-w-[180px]">Team</th>
              {drivers.map((k) => <th key={k} className="px-2 py-2 border-b-2 border-ls-line text-center align-bottom min-w-[74px]"><div className="text-[10px] font-semibold text-ls-ink-2 leading-tight">{dlabel(k)}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {rowsWithDriver.map((d) => {
              const map = new Map(d.byDriver.map((b) => [b.key, b]));
              return (
                <tr key={d.name}>
                  <td className="text-left px-3 py-2 border-b border-ls-line sticky left-0 bg-white font-semibold">{d.name}</td>
                  {drivers.map((k) => {
                    const b = map.get(k);
                    if (!b || b.favorablePct == null) return <td key={k} className="border-b border-ls-line p-[3px]"><div className="rounded-md py-2.5 text-center text-ls-ink-3 bg-ls-bg-2">—</div></td>;
                    const label = metric === 'fav' ? `${Math.round(b.favorablePct)}%` : (b.mean != null ? b.mean.toFixed(2) : '—');
                    const color = metric === 'fav' ? diverge(b.favorablePct) : divergeAvg(b.mean ?? 3);
                    return <td key={k} className="border-b border-ls-line p-[3px]" title={`${d.name} · ${dlabel(k)}: ${Math.round(b.favorablePct)}% favorable${b.mean != null ? ` · avg ${b.mean.toFixed(2)}` : ''}`}><div className="rounded-md py-2.5 text-center font-bold" style={{ background: color, color: '#0b3a44' }}>{label}</div></td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- eNPS ----------------
export function ResultsEnps() {
  const q = trpc.engagementAnalytics.enps.useQuery();
  if (q.isLoading) return <div className="ls-card p-6 text-center text-[13px] text-ls-ink-3">Loading eNPS…</div>;
  const d = q.data;
  if (!d || !d.available) {
    return <div className="ls-card p-6 border-l-4 border-ls-watch text-[13px] text-ls-ink-2">eNPS isn’t available for this period. The 0–10 recommend question is captured on the in-app survey — this populates once employees respond. Imported periods carry no eNPS.</div>;
  }
  const bandColor = { det: '#E8554E', pas: '#F2B33D', prom: '#12A5BE' };
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="ls-card p-5 text-center">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">eNPS score</div>
          <div className="text-5xl font-extrabold mt-2" style={{ color: '#12A5BE' }}>{d.score}</div>
          <div className="h-2 rounded-full my-3" style={{ background: 'linear-gradient(90deg,#E8554E,#eef2f4,#12A5BE)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -3, left: `${Math.max(0, Math.min(100, (d.score + 100) / 2))}%`, width: 2, height: 14, background: '#041E42' }} />
          </div>
          <div className="text-[11px] text-ls-ink-3">−100 · 0 · 100</div>
          <div className="text-[12px] text-ls-ink-3 mt-2">{d.responseCount} responses</div>
        </div>
        <div className="ls-card p-5 md:col-span-2">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-3">Response breakdown</div>
          <div className="flex h-7 rounded-md overflow-hidden gap-[3px]">
            <div style={{ width: `${d.detractorPct}%`, background: bandColor.det, borderRadius: 5 }} />
            <div style={{ width: `${d.passivePct}%`, background: bandColor.pas, borderRadius: 5 }} />
            <div style={{ width: `${d.promoterPct}%`, background: bandColor.prom, borderRadius: 5 }} />
          </div>
          <div className="flex gap-4 text-[11px] text-ls-ink-2 mt-3">
            <span>◼ Detractors {d.detractorPct}%</span>
            <span>◼ Passives {d.passivePct}%</span>
            <span>◼ Promoters {d.promoterPct}%</span>
          </div>
        </div>
      </div>
      {d.byGroup.length > 0 && (
        <div className="ls-card overflow-hidden">
          <div className="px-4 py-3 border-b border-ls-line"><h3 className="font-bold">eNPS breakdown</h3></div>
          {d.byGroup.map((g) => (
            <div key={g.name} className="flex items-center justify-between px-4 py-2.5 border-b border-ls-line last:border-0">
              <span className="text-[13px] font-semibold">{g.name}</span>
              <span className="text-[13px] tabular-nums"><span className="text-ls-ink-3 mr-3">{g.responseCount} resp</span><b style={{ color: g.score >= 0 ? '#12A5BE' : '#E8554E' }}>{g.score}</b></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- FEEDBACK ----------------
const SENT_CLS: Record<string, string> = {
  positive: 'bg-ls-thrive-bg text-ls-thrive', negative: 'bg-ls-risk-bg text-ls-risk',
  mixed: 'bg-ls-watch-bg text-ls-watch', neutral: 'bg-ls-bg-2 text-ls-ink-2',
};
export function ResultsFeedback() {
  const q = trpc.engagementAnalytics.feedback.useQuery();
  const [search, setSearch] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  if (q.isLoading) return <div className="ls-card p-6 text-center text-[13px] text-ls-ink-3">Loading feedback…</div>;
  const d = q.data;
  const rows = (d?.rows ?? []).filter((r) =>
    (!sent || r.sentiment === sent) && (!type || r.type === type) &&
    (!search || r.text.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="flex gap-4 items-start flex-wrap md:flex-nowrap">
      <div className="ls-card p-4 w-full md:w-56 shrink-0">
        <h3 className="font-bold text-[14px] mb-2">Filters</h3>
        <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Survey type</label>
        <div className="flex gap-1.5 flex-wrap mt-1.5 mb-3">
          {['Custom', 'eNPS'].map((t) => <button key={t} onClick={() => setType(type === t ? null : t)} className={`ls-chip ${type === t ? 'bg-ls-blue-deep text-white' : 'bg-ls-blue-50 text-ls-blue-deep'}`}>{t}</button>)}
        </div>
        <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Sentiment</label>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {['positive', 'negative', 'mixed', 'neutral'].map((s) => <button key={s} onClick={() => setSent(sent === s ? null : s)} className={`ls-chip capitalize ${sent === s ? 'ring-2 ring-ls-blue ' : ''}${SENT_CLS[s]}`}>{s}</button>)}
        </div>
      </div>
      <div className="flex-1 w-full">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search responses…" className="w-full px-3 py-2 border border-ls-line rounded-md text-sm" />
        <div className="flex items-center justify-between my-3">
          <b className="text-[14px]">Responses ({rows.length})</b>
          <span className="text-[12px] text-ls-ink-3">{d?.total ?? 0} total</span>
        </div>
        {(!d || d.total === 0) && (
          <div className="ls-card p-4 border-l-4 border-ls-blue text-[13px] text-ls-ink-2">No written responses for this period. The imported export contains aggregate scores only, no verbatims. Comments + AI sentiment appear here for in-app surveys.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="ls-card p-3.5 mb-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep">{r.driver ? dlabel(r.driver) : r.type}</span>
              <span className={`ls-chip capitalize ${SENT_CLS[r.sentiment] ?? SENT_CLS.neutral}`}>{r.sentiment}</span>
            </div>
            <p className="text-[13.5px] text-ls-ink-2 m-0">“{r.text}”</p>
            {r.department && <div className="text-[11px] text-ls-ink-3 mt-1.5">{r.department}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
