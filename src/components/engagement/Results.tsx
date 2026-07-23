// Engagement results — Summary, Breakdown (by department), and Drivers views.
// Reads the aggregate payload from engagementAnalytics.results (historical +
// live merged). Built for HR/managers to interpret at a glance: headline score,
// trend, participation, what to celebrate/fix, department comparison, drivers.
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/src/router';
import { DRIVERS, DRIVER_LABEL, QUESTION_TEXT, type DriverKey } from '../../lib/engagementSurvey';
import { trpc } from '../../lib/trpc';
import { Tip } from './ResultsTabs';

type Results = inferRouterOutputs<AppRouter>['engagementAnalytics']['results'];
export type AnalyticsData = Extract<Results, { hasData: true }>;

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}%`);
const fmtPeriodDate = (iso: string | null | undefined, isCurrent?: boolean) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isCurrent
    ? `as of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
const DRIVER_MEANING: Record<string, string> = Object.fromEntries(DRIVERS.map((d) => [d.key, d.meaning]));
function percentileOf(val: number, arr: number[]): number {
  const clean = arr.filter((x) => x != null);
  if (clean.length <= 1) return 50;
  const below = clean.filter((x) => x < val).length;
  return Math.round((below / (clean.length - 1)) * 100);
}

function toneCls(fav: number | null | undefined): string {
  if (fav == null) return 'bg-ls-bg-2 text-ls-ink-3';
  if (fav >= 75) return 'bg-ls-thrive-bg text-ls-thrive';
  if (fav >= 60) return 'bg-ls-blue-50 text-ls-blue-deep';
  return 'bg-ls-risk-bg text-ls-risk';
}
function DeltaChip({ delta }: { delta: number | null | undefined }) {
  if (delta == null) return <span className="ls-chip bg-ls-bg-2 text-ls-ink-3">— new</span>;
  const up = delta >= 0;
  return (
    <span className={`ls-chip ${up ? 'bg-ls-thrive-bg text-ls-thrive' : 'bg-ls-risk-bg text-ls-risk'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} pt
    </span>
  );
}

// ---------------- SUMMARY ----------------
export function ResultsSummary({ data }: { data: AnalyticsData }) {
  const c = data.company;
  const recs = trpc.engagementAnalytics.recommendations.useMutation();
  const generateRecs = () => recs.mutate({
    periodLabel: c.label,
    scopeLabel: data.selectedDepartment ?? 'All departments',
    overallFavorablePct: c.favorablePct,
    drivers: data.drivers.map((d) => ({ label: DRIVER_LABEL[d.key as DriverKey] ?? d.key, favorablePct: d.favorablePct })),
    lowlights: [...data.questions].filter((q) => q.favorablePct != null)
      .sort((a, b) => (a.favorablePct ?? 0) - (b.favorablePct ?? 0)).slice(0, 6)
      .map((q) => ({ text: q.text ?? QUESTION_TEXT[q.id] ?? q.id, favorablePct: q.favorablePct })),
  });
  const trend = c.trend.map((t) => ({ label: t.label, favorable: t.favorablePct == null ? null : Math.round(t.favorablePct) }));
  const ranked = [...data.questions].filter((q) => q.favorablePct != null).sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));
  const celebrate = ranked.slice(0, 5);
  const improve = [...ranked].reverse().slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="ls-card p-5">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-1">Engagement favorability · {c.label}</div>
          <div className="text-4xl font-extrabold" style={{ color: '#1a9db0' }}>{pct(c.favorablePct)}</div>
          <div className="text-[12px] text-ls-ink-3 mt-1">Engagement index {c.score ?? '—'}/100{c.mean != null ? ` · mean ${c.mean.toFixed(2)} / ${c.scaleMax}` : ''}</div>
          <div className="h-2 rounded-full my-2.5" style={{ background: 'linear-gradient(90deg,#C2615A,#C77A15,#84BD00,#00AFD7)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -3, left: `${Math.max(0, Math.min(100, c.favorablePct ?? 0))}%`, width: 2, height: 14, background: '#041E42' }} />
          </div>
          <div className="text-[12px] flex items-center gap-2"><DeltaChip delta={c.prevFavorablePct != null && c.favorablePct != null ? Math.round((c.favorablePct - c.prevFavorablePct) * 10) / 10 : null} />{c.prevFavorablePct != null && <span className="text-ls-ink-3">vs prior ({Math.round(c.prevFavorablePct)}%)</span>}</div>
        </div>
        <div className="ls-card p-5">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-1">Participation</div>
          <div className="text-4xl font-extrabold text-ls-blue-deep">{c.participationPct != null ? `${Math.round(c.participationPct)}%` : '—'}</div>
          <div className="text-[12px] text-ls-ink-3 mt-1">{c.responseCount} of {c.eligibleCount} responded</div>
        </div>
        <div className="ls-card p-5">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-1">Unfavorable</div>
          <div className="text-4xl font-extrabold text-ls-ink-2">{pct(c.unfavorablePct)}</div>
          <div className="text-[12px] text-ls-ink-3 mt-1">disagree / strongly disagree</div>
        </div>
      </div>

      <div className="ls-card p-5">
        <h3 className="font-bold mb-1">Engagement trend</h3>
        <p className="text-[12px] text-ls-ink-3 mb-3">Company favorability across survey periods.</p>
        {data.periods.length <= 1 && (
          <div className="ls-card bg-ls-bg-2/50 p-3 mb-3 text-[12px] text-ls-ink-2">Only one survey period so far ({c.label}). The trend line fills in as more periods are imported or new surveys are completed.</div>
        )}
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6EBF0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#677480' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#677480' }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Favorable']} />
              <Line type="monotone" dataKey="favorable" stroke="#4FA9D6" strokeWidth={3} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="ls-card p-5">
          <h3 className="font-bold mb-1">Areas to celebrate</h3>
          <p className="text-[12px] text-ls-ink-3 mb-3">Highest-favorability statements.</p>
          <div className="space-y-2.5">
            {celebrate.map((q) => (
              <div key={q.id} className="flex items-center gap-3">
                <span className="ls-chip bg-ls-thrive-bg text-ls-thrive shrink-0 w-14 justify-center">{pct(q.favorablePct)}</span>
                <span className="text-[13px] text-ls-ink-2">{q.text ?? QUESTION_TEXT[q.id] ?? q.id}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ls-card p-5">
          <h3 className="font-bold mb-1">Areas to improve</h3>
          <p className="text-[12px] text-ls-ink-3 mb-3">Lowest-favorability statements — the biggest opportunities.</p>
          <div className="space-y-2.5">
            {improve.map((q) => (
              <div key={q.id} className="flex items-center gap-3">
                <span className="ls-chip bg-ls-risk-bg text-ls-risk shrink-0 w-14 justify-center">{pct(q.favorablePct)}</span>
                <span className="text-[13px] text-ls-ink-2">{q.text ?? QUESTION_TEXT[q.id] ?? q.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ls-card p-5 border-l-4 border-ls-blue">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-bold">Recommended actions <span className="text-[12px] font-normal text-ls-ink-3">· AI · {data.selectedDepartment ?? 'All departments'} · {c.label}</span></h3>
          <button onClick={generateRecs} disabled={recs.isPending}
            className="ls-btn ls-btn-primary disabled:opacity-50">
            {recs.isPending ? 'Analyzing…' : recs.data ? 'Regenerate' : 'Generate recommendations'}
          </button>
        </div>
        <p className="text-[12px] text-ls-ink-3 mb-2">AI-suggested focus areas from the results shown above. Reflects the selected period and team.</p>
        {recs.isError && <div className="ls-chip bg-ls-risk-bg text-ls-risk">Couldn’t generate — try again.</div>}
        {recs.data
          ? <div className="text-[13.5px] text-ls-ink-2 whitespace-pre-line leading-relaxed">{recs.data.recommendations}{recs.data.source === 'fallback' && <div className="text-[11px] text-ls-ink-3 mt-2">(Generated without AI — set ANTHROPIC_API_KEY for richer suggestions.)</div>}</div>
          : !recs.isPending && <div className="text-[13px] text-ls-ink-3">Click “Generate recommendations” for AI-suggested focus areas based on these results.</div>}
      </div>
    </div>
  );
}

// ---------------- BREAKDOWN (by department) ----------------
export function ResultsBreakdown({ data }: { data: AnalyticsData }) {
  const [open, setOpen] = useState<string | null>(null);
  if (data.departments.length === 0) {
    const roster = data.departmentRoster ?? [];
    const total = roster.reduce((a, b) => a + b.headcount, 0);
    return (
      <div>
        <div className="ls-card p-4 mb-4 border-l-4 border-ls-watch text-[13px] text-ls-ink-2">
          <b>No department-level scores for {data.company.label}.</b> These results were imported company-wide — the 15Five export didn&rsquo;t include per-department numbers. Department favorability populates here when either a department-level export is imported, or employees take the survey in-app (each response records the person&rsquo;s department). The teams below come from the org chart and are ready to receive scores.
        </div>
        {roster.length > 0 && (
          <>
            <div className="font-semibold mb-2">Departments <span className="text-ls-ink-3 font-normal text-[13px]">· {roster.length} teams · {total} people</span></div>
            <div className="ls-card overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
                <div className="col-span-7">Department</div>
                <div className="col-span-2 text-center">Headcount</div>
                <div className="col-span-3 text-center">Favorability</div>
              </div>
              {roster.map((d) => (
                <div key={d.name} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-ls-line last:border-0">
                  <div className="col-span-7 font-semibold">{d.name}</div>
                  <div className="col-span-2 text-center text-[13px] text-ls-ink-2">{d.headcount}</div>
                  <div className="col-span-3 text-center"><span className="ls-chip bg-ls-bg-2 text-ls-ink-3">awaiting data</span></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm text-ls-ink-3 mb-4">Engagement by department for the latest period. Click a row for its driver breakdown. Change is vs. the prior period; “vs company” compares to the company favorability.</p>
      {data.departmentBasis === 'score' && (
        <div className="ls-card p-3 mb-4 border-l-4 border-ls-watch text-[12.5px] text-ls-ink-2">These department numbers are 15Five’s 0–100 <b>engagement score</b> (the only per-department metric in the export) — a different measure than the company favorability %, so “change” and “vs company” are hidden. Departments get a favorability baseline at the first in-app survey.</div>
      )}
      <div className="ls-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
          <div className="col-span-4">Department</div>
          <div className="col-span-2 text-center">{data.departmentBasis === 'score' ? 'Engagement score' : 'Favorable'}</div>
          <div className="col-span-2 text-center">Change</div>
          <div className="col-span-2 text-center">vs company</div>
          <div className="col-span-2 text-center">Response rate</div>
        </div>
        {data.departments.map((d) => {
          const isOpen = open === d.name;
          return (
            <div key={d.name} className="border-b border-ls-line last:border-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer hover:bg-ls-blue-50" onClick={() => setOpen(isOpen ? null : d.name)}>
                <div className="col-span-4 font-semibold flex items-center gap-2"><span className="text-ls-ink-3 text-xs">{isOpen ? '▾' : '▸'}</span>{d.name}</div>
                <div className="col-span-2 text-center"><span className={`ls-chip ${toneCls(d.favorablePct)}`}>{data.departmentBasis === 'score' ? (d.favorablePct == null ? '—' : d.favorablePct.toFixed(1)) : pct(d.favorablePct)}</span></div>
                <div className="col-span-2 text-center">{d.delta == null ? <span className="text-ls-ink-3 text-[13px]">—</span> : <DeltaChip delta={d.delta} />}</div>
                <div className="col-span-2 text-center text-[13px] font-semibold" style={{ color: (d.vsCompany ?? 0) >= 0 ? '#1F9D6B' : '#D1495B' }}>{d.vsCompany == null ? '—' : `${d.vsCompany >= 0 ? '+' : ''}${d.vsCompany.toFixed(1)}`}</div>
                <div className="col-span-2 text-center text-[13px] text-ls-ink-2">{d.participationPct != null ? `${Math.round(d.participationPct)}%` : '—'}<span className="text-ls-ink-3 text-[11px]"> ({d.responseCount}{d.eligibleCount ? `/${d.eligibleCount}` : ''})</span></div>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 bg-ls-bg-2/40">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 py-2">Drivers · {d.name}</div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {[...d.byDriver].sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0)).map((dr) => (
                      <div key={dr.key} className="flex items-center gap-2">
                        <span className="text-[12.5px] text-ls-ink-2 flex-1">{DRIVER_LABEL[dr.key as DriverKey] ?? dr.key}</span>
                        <div className="w-28 h-2 rounded-full bg-ls-bg-2 overflow-hidden"><div className="h-full bg-ls-blue" style={{ width: `${dr.favorablePct ?? 0}%` }} /></div>
                        <span className="text-[12px] font-semibold text-ls-ink-2 w-10 text-right">{pct(dr.favorablePct)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- DRIVERS ----------------
export function ResultsDrivers({ data }: { data: AnalyticsData }) {
  const favs = data.drivers.map((d) => d.favorablePct ?? 0);
  const total = data.company.responseCount;
  const byDriver = new Map<string, typeof data.questions>();
  for (const q of data.questions) {
    if (!q.driver) continue;
    const arr = byDriver.get(q.driver) ?? [];
    arr.push(q);
    byDriver.set(q.driver, arr);
  }
  return (
    <div>
      <p className="text-sm text-ls-ink-3 mb-4">The 66 statements grouped into engagement drivers. Each shows favorability, the change vs. the prior period, the favorable/unfavorable split, and the statements behind it.</p>
      <div className="space-y-4">
        {data.drivers.map((dr) => {
          const fav = dr.favorablePct ?? 0;
          const unfav = dr.unfavorablePct ?? 0;
          const neutral = Math.max(0, 100 - fav - unfav);
          const trend = dr.trend.map((t) => ({ label: t.label, favorable: t.favorablePct == null ? null : Math.round(t.favorablePct) }));
          const qs = (byDriver.get(dr.key) ?? []).slice().sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));
          return (
            <div key={dr.key} className="ls-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[16rem]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tip content={DRIVER_MEANING[dr.key]}><h3 className="font-bold text-[15px]">{DRIVER_LABEL[dr.key as DriverKey] ?? dr.key}</h3></Tip>
                    <span className={`ls-chip ${toneCls(dr.favorablePct)}`}>{pct(dr.favorablePct)} favorable</span>
                    <DeltaChip delta={dr.delta} />
                  </div>
                  <p className="text-[12.5px] text-ls-ink-3 mt-1">{DRIVER_MEANING[dr.key]}</p>
                  {/* favorable / neutral / unfavorable split */}
                  <div className="mt-3">
                    <Tip block content={<span>Of {total} responses:<br/>● Favorable: <b>{Math.round((fav / 100) * total)}</b> ({Math.round(fav)}%)<br/>● Neutral: {total - Math.round((fav / 100) * total) - Math.round((unfav / 100) * total)} ({Math.round(neutral)}%)<br/>● Unfavorable: <b>{Math.round((unfav / 100) * total)}</b> ({Math.round(unfav)}%)</span>}>
                      <span className="flex h-2.5 rounded-full overflow-hidden bg-ls-bg-2 w-full">
                        <span className="bg-ls-thrive" style={{ width: `${fav}%` }} />
                        <span className="bg-ls-line" style={{ width: `${neutral}%` }} />
                        <span className="bg-ls-risk" style={{ width: `${unfav}%` }} />
                      </span>
                    </Tip>
                  </div>
                  <div className="flex gap-4 text-[11px] text-ls-ink-3 mt-1">
                    <span>◼ Favorable {Math.round(fav)}%</span>
                    <span>◼ Neutral {Math.round(neutral)}%</span>
                    <span>◼ Unfavorable {Math.round(unfav)}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div style={{ width: 180, height: 54 }}>
                    <ResponsiveContainer>
                      <LineChart data={trend} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip formatter={(v) => [`${v}%`, 'Favorable']} labelStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="favorable" stroke="#4FA9D6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 justify-end mt-1">
                    <div><div className="text-xl font-extrabold text-ls-ink leading-none">{percentileOf(dr.favorablePct ?? 0, favs)}<span className="text-[11px]">th</span></div><div className="text-[10px] uppercase tracking-wide text-ls-ink-3">Percentile</div></div>
                    <div><div className="text-xl font-extrabold text-ls-ink leading-none">{dr.mean != null ? dr.mean.toFixed(2) : '—'}<span className="text-[11px]">/5</span></div><div className="text-[10px] uppercase tracking-wide text-ls-ink-3">Avg response</div></div>
                  </div>
                </div>
              </div>
              {qs.length > 0 && (
                <details className="mt-3">
                  <summary className="text-[12.5px] font-semibold text-ls-blue cursor-pointer">{qs.length} statements</summary>
                  <div className="space-y-2 mt-2">
                    {qs.map((q) => (
                      <div key={q.id} className="flex items-center gap-3">
                        <span className={`ls-chip ${toneCls(q.favorablePct)} shrink-0 w-14 justify-center`}>{pct(q.favorablePct)}</span>
                        <span className="text-[13px] text-ls-ink-2">{q.text ?? QUESTION_TEXT[q.id] ?? q.id}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
