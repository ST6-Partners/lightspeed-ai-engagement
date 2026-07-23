// Additional analytics tabs (15Five parity): Statements, Engagement, Heatmap,
// eNPS, Feedback. Reads engagementAnalytics.results (+ .enps / .feedback / .heatmapCells).
import { useMemo, useState, type ReactNode } from 'react';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DRIVER_LABEL, QUESTION_TEXT, DRIVERS, type DriverKey } from '../../lib/engagementSurvey';
import { trpc } from '../../lib/trpc';
import type { AnalyticsData } from './Results';

const DRIVER_MEANING: Record<string, string> = Object.fromEntries(DRIVERS.map((d) => [d.key, d.meaning]));
const dlabel = (k: string) => DRIVER_LABEL[k as DriverKey] ?? k;
const ord = (n: number) => `${n}th`;
function percentileOf(val: number, arr: number[]): number {
  const clean = arr.filter((x) => x != null);
  if (clean.length <= 1) return 50;
  const below = clean.filter((x) => x < val).length;
  return Math.round((below / (clean.length - 1)) * 100);
}

export function Tip({ children, content, right, block }: { children: ReactNode; content: ReactNode; right?: boolean; block?: boolean }) {
  return <span className={`eng-tip${right ? ' tip-right' : ''}${block ? ' eng-tip-block' : ''}`}>{children}<span className="eng-tip-box">{content}</span></span>;
}

function FavBar({ unfav, fav, total }: { unfav: number; fav: number; total?: number | null }) {
  const neu = Math.max(0, 100 - unfav - fav);
  const fc = total ? Math.round((fav / 100) * total) : null;
  const uc = total ? Math.round((unfav / 100) * total) : null;
  const nc = total && fc != null && uc != null ? total - fc - uc : null;
  const bar = (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-ls-bg-2 min-w-[90px]">
        <div className="h-full bg-ls-risk" style={{ width: `${unfav}%` }} />
        <div className="h-full bg-ls-line" style={{ width: `${neu}%` }} />
        <div className="h-full" style={{ width: `${fav}%`, background: '#1a9db0' }} />
      </div>
      <span className="text-[12px] font-semibold text-ls-ink-2 w-[74px] text-right tabular-nums">{Math.round(unfav)}% · {Math.round(fav)}%</span>
    </div>
  );
  if (!total) return bar;
  return (
    <Tip block content={<span>Of {total} responses:<br />● Favorable: <b>{fc}</b> ({Math.round(fav)}%)<br />● Neutral: {nc} ({Math.round(neu)}%)<br />● Unfavorable: <b>{uc}</b> ({Math.round(unfav)}%)</span>}>{bar}</Tip>
  );
}

function MiniTrend({ trend }: { trend: { label: string; favorablePct: number | null }[] }) {
  const data = trend.map((t) => ({ label: t.label, v: t.favorablePct == null ? null : Math.round(t.favorablePct) }));
  const pts = data.filter((d) => d.v != null);
  const delta = pts.length >= 2 ? (pts[pts.length - 1].v as number) - (pts[pts.length - 2].v as number) : null;
  return (
    <Tip right content={<span>{delta != null && <b>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts vs prior</b>}{delta != null && <br />}{data.map((d) => <span key={d.label}>{d.label}: {d.v == null ? '—' : `${d.v}%`}<br /></span>)}</span>}>
      <span style={{ display: 'inline-block', width: 104, height: 30 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 3, bottom: 0, left: 0 }}>
            <YAxis domain={[0, 100]} hide />
            <Line type="monotone" dataKey="v" stroke="#4FA9D6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </span>
    </Tip>
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
        <p className="text-[12.5px] text-ls-ink-3 m-0">Each statement maps to a driver — hover the tag for its definition. Percentile is within the company.</p>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Filter</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white">
            <option value="all">All statements</option><option value="topneg">Top 5 negative impact</option><option value="toppos">Top 5 positive impact</option><option value="topover">Top 5 overall impact</option>
          </select>
        </div>
      </div>
      <div className="ls-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
          <div className="col-span-4">Driver · Statement</div><div className="col-span-2 text-center">Predictive impact</div><div className="col-span-1 text-center">Pctile</div><div className="col-span-1 text-center">Avg</div><div className="col-span-1 text-center">Trend</div><div className="col-span-3 text-center">Unfavorable · Favorable</div>
        </div>
        {list.map((q) => {
          const p = percentileOf(q.favorablePct as number, favs);
          const tr = (q.driver && driverTrend.get(q.driver)) || [];
          return (
            <div key={q.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-ls-line last:border-0">
              <div className="col-span-4">
                <Tip content={q.driver ? DRIVER_MEANING[q.driver] : 'No driver mapped.'}><span className="ls-chip bg-ls-blue-50 text-ls-blue-deep">{q.driver ? dlabel(q.driver) : '—'}</span></Tip>
                <div className="text-[13px] text-ls-ink-2 mt-1.5">{q.text ?? QUESTION_TEXT[q.id] ?? q.id}</div>
              </div>
              <div className="col-span-2 text-center"><Tip content="Reserved — predictive impact needs a model we don't have for this dataset. The column is wired for a future impact model."><span className="text-ls-ink-3 text-[13px]">—</span></Tip></div>
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

// ---------------- ENGAGEMENT (flow bands + breakdown w/ distribution) ----------------
const BANDS = [
  { key: 'dis', label: 'Disengaged', color: '#C2615A' },
  { key: 'som', label: 'Somewhat', color: '#E0913F' },
  { key: 'mod', label: 'Moderately', color: '#E9C84A' },
  { key: 'high', label: 'Highly', color: '#5FB8C9' },
  { key: 'ext', label: 'Extremely', color: '#1a9db0' },
] as const;
function bandsFromFav(fav: number) {
  const unf = 100 - fav;
  return { ext: fav * 0.35, high: fav * 0.5, mod: fav * 0.15 + unf * 0.3, som: unf * 0.45, dis: unf * 0.25 };
}
export function ResultsEngagement({ data }: { data: AnalyticsData }) {
  const flow = data.company.trend.filter((t) => t.favorablePct != null).map((t) => ({ label: t.label, ...bandsFromFav(t.favorablePct as number) }));
  const depts = data.departments;
  const scoreBasis = data.departmentBasis === 'score';
  const vals = depts.map((d) => d.favorablePct ?? 0);
  return (
    <div className="space-y-4">
      <div className="ls-card p-5">
        <h3 className="font-bold mb-1">Engagement flow</h3>
        <p className="text-[12px] text-ls-ink-3 mb-3">Distribution of engagement levels across survey periods.</p>
        <div className="flex items-end gap-6 h-40 px-1">
          {flow.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1.5">
              <div className="flex flex-col-reverse w-14 rounded-md overflow-hidden" style={{ height: 132 }}>
                {BANDS.map((b) => <div key={b.key} title={`${b.label}: ${Math.round((f as unknown as Record<string, number>)[b.key])}%`} style={{ height: `${(f as unknown as Record<string, number>)[b.key] * 1.32}px`, background: b.color }} />)}
              </div>
              <div className="text-[11px] text-ls-ink-3">{f.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 flex-wrap text-[11px] text-ls-ink-2 mt-3">
          {BANDS.map((b) => <span key={b.key} className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />{b.label}</span>)}
        </div>
        <p className="text-[11px] text-ls-ink-3 mt-2">Bands are modeled from each period’s favorability. Exact per-person bands populate from in-app survey responses.</p>
      </div>
      {depts.length > 0 && (
        <div className="ls-card overflow-hidden">
          <div className="px-4 py-3 border-b border-ls-line"><h3 className="font-bold">Engagement breakdown</h3></div>
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
            <div className="col-span-3">Group name</div><div className="col-span-2 text-center">Score</div><div className="col-span-1 text-center">Change</div><div className="col-span-2 text-center">Response rate</div><div className="col-span-1 text-center">Pctile</div><div className="col-span-3">Distribution</div>
          </div>
          {depts.map((d) => {
            const p = percentileOf(d.favorablePct ?? 0, vals);
            const bar = d.favorablePct ?? 0;
            return (
              <div key={d.name} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-ls-line last:border-0">
                <div className="col-span-3 font-semibold text-[13px]">{d.name}</div>
                <div className="col-span-2 text-center text-[13px] tabular-nums">{d.favorablePct == null ? '—' : scoreBasis ? d.favorablePct.toFixed(1) : `${Math.round(d.favorablePct)}%`}</div>
                <div className="col-span-1 text-center text-[13px]">{d.delta == null ? <span className="text-ls-ink-3">—</span> : <span style={{ color: d.delta >= 0 ? '#5F8C1A' : '#C2615A' }} className="font-semibold">{d.delta >= 0 ? '▲' : '▼'}{Math.abs(d.delta).toFixed(1)}</span>}</div>
                <div className="col-span-2 text-center text-[13px] tabular-nums">{d.participationPct != null ? `${Math.round(d.participationPct)}%` : '—'}</div>
                <div className="col-span-1 text-center text-[13px] tabular-nums">{ord(p)}</div>
                <div className="col-span-3"><div className="h-2.5 rounded-full bg-ls-bg-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${bar}%`, background: bar >= 85 ? '#1a9db0' : bar >= 70 ? '#5FB8C9' : bar >= 60 ? '#E9C84A' : '#E0913F' }} /></div></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- HEATMAP ----------------
const divFav = (f: number) => f >= 88 ? '#5FB8C9' : f >= 80 ? '#96CFDA' : f >= 70 ? '#CFE8ED' : f >= 60 ? '#F4D7D2' : f >= 50 ? '#EBB1A9' : '#E0897E';
const divAvg = (m: number) => m >= 3.6 ? '#5FB8C9' : m >= 3.4 ? '#96CFDA' : m >= 3.1 ? '#CFE8ED' : m >= 2.9 ? '#EFF3F4' : m >= 2.6 ? '#F4D7D2' : m >= 2.3 ? '#EBB1A9' : '#E0897E';
const divUnfav = (u: number) => u <= 3 ? '#5FB8C9' : u <= 6 ? '#96CFDA' : u <= 10 ? '#CFE8ED' : u <= 15 ? '#F4D7D2' : u <= 22 ? '#EBB1A9' : '#E0897E';
export function ResultsHeatmap({ data }: { data: AnalyticsData }) {
  const [metric, setMetric] = useState<'fav' | 'avg' | 'unfav'>('fav');
  const [view, setView] = useState<'drivers' | 'mgreff'>('drivers');
  const [grouping, setGrouping] = useState<'dept' | 'mgr' | 'hier'>('dept');
  const hm = trpc.engagementAnalytics.heatmapCells.useQuery();

  if (hm.isLoading) return <div className="ls-card p-6 text-center text-[13px] text-ls-ink-3">Loading heatmap…</div>;
  const d = hm.data;
  if (!d || !d.available || d.rows.length === 0) {
    return (
      <div>
        <div className="ls-card p-4 mb-4 border-l-4 border-ls-watch text-[13px] text-ls-ink-2">
          Per-team × statement detail isn’t available for <b>{data.company.label}</b> — this period was imported at the company level. The heatmap fills in from in-app survey responses (each is tagged by department + question). Below is each team’s overall score.
        </div>
        {data.departments.length > 0 && (
          <div className="ls-card overflow-hidden">
            {data.departments.map((dep) => (
              <div key={dep.name} className="flex items-center justify-between px-4 py-2.5 border-b border-ls-line last:border-0">
                <span className="text-[13px] font-semibold">{dep.name}</span>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: divFav(dep.favorablePct ?? 0) }}>{dep.favorablePct == null ? '—' : (data.departmentBasis === 'score' ? dep.favorablePct.toFixed(1) : `${Math.round(dep.favorablePct)}%`)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  type Col = { id: string; driver: string | null; text: string };
  type Row = { name: string; responseCount: number; score: number | null; mean: number | null; cells: Record<string, { fav: number; unfav: number; mean: number }> };
  const rows = d.rows as Row[];
  const allCols = d.columns as Col[];
  const cols = view === 'mgreff' ? allCols.filter((c) => c.driver === 'manager_effectiveness') : allCols;
  // group columns by driver, preserving order
  const groups: { driver: string | null; cols: Col[] }[] = [];
  for (const c of cols) {
    const last = groups[groups.length - 1];
    if (last && last.driver === c.driver) last.cols.push(c);
    else groups.push({ driver: c.driver, cols: [c] });
  }
  const shorten = (t: string) => t.length > 40 ? t.slice(0, 38) + '…' : t;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Statements</label>
          <select value={view} onChange={(e) => setView(e.target.value as typeof view)} className="px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white">
            <option value="drivers">Drivers of Engagement</option>
            <option value="mgreff">Manager Effectiveness Survey</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Show</label>
          <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)} className="px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white">
            <option value="fav">Favorable %</option><option value="avg">Average response</option><option value="unfav">Unfavorable %</option>
          </select>
        </div>
      </div>
      {grouping !== 'dept' && <div className="ls-card p-3 mb-3 border-l-4 border-ls-blue text-[12px] text-ls-ink-2">Grouping by managers/hierarchy needs identified (non-anonymous) responses — showing departments.</div>}
      <div className="ls-card overflow-auto">
        <table className="border-separate text-[12px]" style={{ borderSpacing: 5 }}>
          <thead>
            <tr>
              <th rowSpan={2} className="text-left px-2 py-1 align-bottom sticky left-0 bg-white min-w-[190px] border-b-2 border-ls-line">
                <select value={grouping} onChange={(e) => setGrouping(e.target.value as typeof grouping)} className="px-2.5 py-1.5 border border-ls-line rounded-md text-[13px] font-semibold bg-white">
                  <option value="dept">By Departments</option><option value="mgr">By Managers</option><option value="hier">By Hierarchy</option>
                </select>
              </th>
              <th rowSpan={2} className="px-2 py-2 align-bottom text-center border-b-2 border-ls-line">Engagement<br />Score</th>
              {groups.map((g, i) => <th key={i} colSpan={g.cols.length} className="px-2 py-1 text-center border-b border-ls-line text-[11px] font-bold text-ls-ink">{g.driver ? dlabel(g.driver) : '—'}</th>)}
            </tr>
            <tr>
              {cols.map((c) => <th key={c.id} className="px-1.5 py-1 align-bottom text-center min-w-[92px] border-b-2 border-ls-line"><div className="text-[10px] font-medium text-ls-ink-3 leading-tight">{shorten(c.text)}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="text-left px-2 py-2 sticky left-0 bg-white align-top">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[11px] text-ls-ink-3">Score: {r.mean != null ? r.mean.toFixed(2) : '—'} ({r.responseCount})</div>
                </td>
                <td className="text-center align-middle font-extrabold tabular-nums" style={{ color: divFav(r.score ?? 0) }}>{r.score == null ? '—' : `${r.score}`}</td>
                {cols.map((c) => {
                  const cell = r.cells[c.id];
                  if (!cell) return <td key={c.id}><div className="rounded-md py-2.5 text-center text-ls-ink-3 bg-ls-bg-2">—</div></td>;
                  const disp = metric === 'fav' ? `${Math.round(cell.fav)}%` : metric === 'unfav' ? `${Math.round(cell.unfav)}%` : cell.mean.toFixed(2);
                  const color = metric === 'fav' ? divFav(cell.fav) : metric === 'unfav' ? divUnfav(cell.unfav) : divAvg(cell.mean);
                  return (
                    <td key={c.id}>
                      <Tip content={<span>{r.name} · {c.driver ? dlabel(c.driver) : ''}<br />{c.text}<br />{Math.round(cell.fav)}% fav · {Math.round(cell.unfav)}% unfav · avg {cell.mean.toFixed(2)}/5</span>}>
                        <span className="block rounded-md py-2.5 min-w-[84px] text-center font-bold" style={{ background: color, color: '#0b3a44' }}>{disp}</span>
                      </Tip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- eNPS ----------------
export function ResultsEnps() {
  const q = trpc.engagementAnalytics.enps.useQuery();
  const [explain, setExplain] = useState(false);
  if (q.isLoading) return <div className="ls-card p-6 text-center text-[13px] text-ls-ink-3">Loading eNPS…</div>;
  const d = q.data;
  if (!d || !d.available) {
    return <div className="ls-card p-6 border-l-4 border-ls-watch text-[13px] text-ls-ink-2">eNPS isn’t available for this period. The 0–10 recommend question is captured on the in-app survey — this populates once employees respond. Imported periods carry no eNPS.</div>;
  }
  const C = { det: '#E8554E', pas: '#F2B33D', prom: '#12A5BE' };
  const markLeft = Math.max(0, Math.min(100, (d.score + 100) / 2));
  const gvals = d.byGroup.map((g) => g.score);
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4 items-stretch">
        <div className="ls-card p-5 text-center">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">eNPS score</div>
          <div className="text-5xl font-extrabold mt-2" style={{ color: C.prom }}>{d.score}</div>
          <div className="h-2 rounded-full my-3 relative" style={{ background: 'linear-gradient(90deg,#E8554E,#eef2f4,#12A5BE)' }}>
            <div style={{ position: 'absolute', top: -3, left: `${markLeft}%`, width: 2, height: 14, background: '#041E42' }} />
          </div>
          <div className="text-[11px] text-ls-ink-3">−100 · 0 · 100</div>
          <button onClick={() => setExplain((v) => !v)} className="ls-btn ls-btn-ghost mt-3 text-[13px]">✨ Explain this score</button>
          {explain && <div className="text-[12px] text-ls-ink-2 mt-2 text-left bg-ls-bg-2/60 rounded-lg p-2.5">eNPS = % promoters − % detractors = {d.promoterPct}% − {d.detractorPct}% = <b>{d.score}</b>, across {d.responseCount} responses. Promoters score 9–10, passives 7–8, detractors 0–6.</div>}
        </div>
        <div className="ls-card p-5">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">Response breakdown</div>
          <div className="text-[12px] text-ls-ink-3 mt-0.5">{d.responseCount} responses</div>
          <div className="flex h-7 rounded-md overflow-hidden gap-[3px] mt-4">
            <div style={{ width: `${d.detractorPct}%`, background: C.det, borderRadius: 5 }} />
            <div style={{ width: `${d.passivePct}%`, background: C.pas, borderRadius: 5 }} />
            <div style={{ width: `${d.promoterPct}%`, background: C.prom, borderRadius: 5 }} />
          </div>
          <div className="flex justify-between text-[11px] text-ls-ink-2 mt-1"><span>{d.detractorPct}%</span><span>{d.passivePct}%</span><span>{d.promoterPct}%</span></div>
          <div className="flex gap-3 text-[11px] text-ls-ink-2 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.det }} />Detractors</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.pas }} />Passives</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.prom }} />Promoters</span>
          </div>
        </div>
        <div className="ls-card p-5">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">eNPS trend</div>
          <div className="flex flex-col items-center justify-center h-[120px]">
            <div className="text-3xl font-extrabold" style={{ color: C.prom }}>{d.score}</div>
            <div className="text-[11px] text-ls-ink-3 mt-1 text-center">Current survey. More points appear as future surveys run.</div>
          </div>
        </div>
      </div>
      {d.byGroup.length > 0 && (
        <div className="ls-card overflow-hidden">
          <div className="px-4 py-3 border-b border-ls-line"><h3 className="font-bold">eNPS breakdown</h3></div>
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
            <div className="col-span-3">Group name</div><div className="col-span-2 text-center">Score</div><div className="col-span-1 text-center">Change</div><div className="col-span-2 text-center">Response rate</div><div className="col-span-1 text-center">Pctile</div><div className="col-span-3">Distribution</div>
          </div>
          {d.byGroup.map((g) => {
            const p = percentileOf(g.score, gvals);
            return (
              <div key={g.name} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-ls-line last:border-0">
                <div className="col-span-3 font-semibold text-[13px]">{g.name}</div>
                <div className="col-span-2 text-center text-[15px] font-bold tabular-nums" style={{ color: g.score >= 0 ? '#12A5BE' : '#E8554E' }}>{g.score}</div>
                <div className="col-span-1 text-center text-ls-ink-3 text-[13px]">—</div>
                <div className="col-span-2 text-center text-[13px] tabular-nums">{g.participationPct != null ? `${Math.round(g.participationPct)}%` : '—'}</div>
                <div className="col-span-1 text-center text-[13px] tabular-nums">{ord(p)}</div>
                <div className="col-span-3">
                  <div className="flex h-3 rounded-full overflow-hidden bg-ls-bg-2">
                    <div style={{ width: `${g.detractorPct}%`, background: '#E8554E' }} />
                    <div style={{ width: `${g.passivePct}%`, background: '#F2B33D' }} />
                    <div style={{ width: `${g.promoterPct}%`, background: '#12A5BE' }} />
                  </div>
                </div>
              </div>
            );
          })}
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
        <div className="flex items-center justify-between my-3"><b className="text-[14px]">Responses ({rows.length})</b><span className="text-[12px] text-ls-ink-3">{d?.total ?? 0} total</span></div>
        {(!d || d.total === 0) && (
          <div className="ls-card p-4 border-l-4 border-ls-blue text-[13px] text-ls-ink-2">No written responses for this period. Imported periods carry aggregate scores only. Comments + AI sentiment appear here for in-app surveys.</div>
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
