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

type Results = inferRouterOutputs<AppRouter>['engagementAnalytics']['results'];
export type AnalyticsData = Extract<Results, { hasData: true }>;

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}%`);
const DRIVER_MEANING: Record<string, string> = Object.fromEntries(DRIVERS.map((d) => [d.key, d.meaning]));

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
  const trend = c.trend.map((t) => ({ label: t.label, favorable: t.favorablePct == null ? null : Math.round(t.favorablePct) }));
  const ranked = [...data.questions].filter((q) => q.favorablePct != null).sort((a, b) => (b.favorablePct ?? 0) - (a.favorablePct ?? 0));
  const celebrate = ranked.slice(0, 5);
  const improve = [...ranked].reverse().slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="ls-card p-5">
          <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-1">Company engagement · {c.label}</div>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-extrabold text-ls-blue-deep">{pct(c.favorablePct)}</div>
            <div className="mb-1"><DeltaChip delta={c.prevFavorablePct != null && c.favorablePct != null ? Math.round((c.favorablePct - c.prevFavorablePct) * 10) / 10 : null} /></div>
          </div>
          <div className="text-[12px] text-ls-ink-3 mt-1">favorable{c.mean != null ? ` · avg response ${c.mean.toFixed(2)}` : ''}</div>
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
                <span className="text-[13px] text-ls-ink-2">{QUESTION_TEXT[q.id] ?? q.id}</span>
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
                <span className="text-[13px] text-ls-ink-2">{QUESTION_TEXT[q.id] ?? q.id}</span>
              </div>
            ))}
          </div>
        </div>
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
      <div className="ls-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
          <div className="col-span-4">Department</div>
          <div className="col-span-2 text-center">Favorable</div>
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
                <div className="col-span-2 text-center"><span className={`ls-chip ${toneCls(d.favorablePct)}`}>{pct(d.favorablePct)}</span></div>
                <div className="col-span-2 text-center"><DeltaChip delta={d.delta} /></div>
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
                    <h3 className="font-bold text-[15px]">{DRIVER_LABEL[dr.key as DriverKey] ?? dr.key}</h3>
                    <span className={`ls-chip ${toneCls(dr.favorablePct)}`}>{pct(dr.favorablePct)} favorable</span>
                    <DeltaChip delta={dr.delta} />
                  </div>
                  <p className="text-[12.5px] text-ls-ink-3 mt-1">{DRIVER_MEANING[dr.key]}</p>
                  {/* favorable / neutral / unfavorable split */}
                  <div className="flex h-2.5 rounded-full overflow-hidden mt-3 bg-ls-bg-2">
                    <div className="h-full bg-ls-thrive" style={{ width: `${fav}%` }} title={`Favorable ${Math.round(fav)}%`} />
                    <div className="h-full bg-ls-line" style={{ width: `${neutral}%` }} title={`Neutral ${Math.round(neutral)}%`} />
                    <div className="h-full bg-ls-risk" style={{ width: `${unfav}%` }} title={`Unfavorable ${Math.round(unfav)}%`} />
                  </div>
                  <div className="flex gap-4 text-[11px] text-ls-ink-3 mt-1">
                    <span>◼ Favorable {Math.round(fav)}%</span>
                    <span>◼ Neutral {Math.round(neutral)}%</span>
                    <span>◼ Unfavorable {Math.round(unfav)}%</span>
                  </div>
                </div>
                <div style={{ width: 180, height: 70 }}>
                  <ResponsiveContainer>
                    <LineChart data={trend} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip formatter={(v) => [`${v}%`, 'Favorable']} labelStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="favorable" stroke="#4FA9D6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {qs.length > 0 && (
                <details className="mt-3">
                  <summary className="text-[12.5px] font-semibold text-ls-blue cursor-pointer">{qs.length} statements</summary>
                  <div className="space-y-2 mt-2">
                    {qs.map((q) => (
                      <div key={q.id} className="flex items-center gap-3">
                        <span className={`ls-chip ${toneCls(q.favorablePct)} shrink-0 w-14 justify-center`}>{pct(q.favorablePct)}</span>
                        <span className="text-[13px] text-ls-ink-2">{QUESTION_TEXT[q.id] ?? q.id}</span>
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
