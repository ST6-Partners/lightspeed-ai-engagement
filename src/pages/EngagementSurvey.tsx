// Engagement Surveys — 15Five-parity analytics.
//   Landing: pick a survey (campaign card + Campaign Progress by group) or Take Survey.
//   Analytics: Summary · Engagement · Drivers · Statements · Heatmap · eNPS · Feedback,
//              with period + team selectors below the tabs.
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import SurveyForm from '../components/engagement/SurveyForm';
import { ResultsSummary, ResultsDrivers } from '../components/engagement/Results';
import { ResultsStatements, ResultsEngagement, ResultsHeatmap, ResultsEnps, ResultsFeedback } from '../components/engagement/ResultsTabs';

const TABS = ['Summary', 'Engagement', 'Drivers', 'Statements', 'Heatmap', 'eNPS', 'Feedback'] as const;
type Tab = (typeof TABS)[number];
type GroupBy = 'dept' | 'mgr' | 'hier' | 'loc';

const sel = 'px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ls-blue';

const fmtDate = (iso?: string | null) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function EngagementSurvey() {
  const [view, setView] = useState<'landing' | 'analytics' | 'survey'>('landing');
  const [tab, setTab] = useState<Tab>('Summary');
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('dept');

  const results = trpc.engagementAnalytics.results.useQuery({ periodId, department }, { enabled: view !== 'survey' });
  const progress = trpc.engagementAnalytics.campaignProgress.useQuery({ periodId, groupBy }, { enabled: view === 'landing' });
  const data = results.data;

  // ---------------- SURVEY ----------------
  if (view === 'survey') {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setView('landing')} className="text-[13px] font-semibold text-ls-blue-deep mb-3">← Back to surveys</button>
        <SurveyForm />
      </div>
    );
  }

  const hasData = data && data.hasData;
  const c = hasData ? data.company : null;

  // ---------------- LANDING ----------------
  if (view === 'landing') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="ls-eyebrow mb-1">Engagement</div>
            <h1 className="text-2xl font-bold tracking-tight">Engagement Surveys</h1>
            <p className="text-sm text-ls-ink-3 mb-5">Pick a survey to view its results, or launch the questionnaire.</p>
          </div>
          <button onClick={() => setView('survey')} className="ls-btn ls-btn-primary shrink-0">Take Survey</button>
        </div>

        {results.isLoading && <div className="ls-card p-8 text-center text-sm text-ls-ink-3">Loading…</div>}
        {!results.isLoading && !hasData && (
          <div className="ls-card p-8 text-center">
            <h2 className="font-bold mb-1">No results yet</h2>
            <p className="text-sm text-ls-ink-3">Once responses come in — or historical results are imported — surveys appear here.</p>
          </div>
        )}

        {hasData && c && (
          <>
            <div className="ls-card p-5 cursor-pointer hover:border-ls-blue transition-colors" onClick={() => setView('analytics')}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-lg">{c.label} Engagement Survey</h2>
                    <span className={`ls-chip ${c.isCurrent ? 'bg-ls-thrive-bg text-ls-thrive' : 'bg-ls-bg-2 text-ls-ink-2'}`}>{c.isCurrent ? 'Active' : 'Closed'}</span>
                  </div>
                  <div className="text-[12px] text-ls-ink-3 mt-1.5">{c.isCurrent ? 'In progress' : 'Ended'} {fmtDate(c.periodDate)} · {c.eligibleCount ?? '—'} participants · Results released</div>
                </div>
                <button className="ls-btn ls-btn-primary">Open analytics →</button>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[12px] mb-1.5"><b>Response rate</b><span className="text-ls-ink-3">{c.participationPct != null ? `${Math.round(c.participationPct)}%` : '—'} ({c.responseCount} / {c.eligibleCount} people)</span></div>
                <div className="h-3 rounded-full bg-ls-bg-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.participationPct ?? 0}%`, background: '#84BD00' }} /></div>
              </div>
            </div>

            <div className="ls-card mt-5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-ls-line">
                <h2 className="font-bold">Campaign Progress</h2>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold uppercase text-ls-ink-3">View by</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={sel}>
                    <option value="dept">By Departments</option>
                    <option value="mgr">By Managers</option>
                    <option value="hier">By Hierarchy</option>
                    <option value="loc">By Locations</option>
                  </select>
                </div>
              </div>
              <div className="p-5">
                {progress.isLoading && <div className="text-sm text-ls-ink-3 text-center py-4">Loading…</div>}
                {progress.data && !progress.data.available && (
                  <div className="ls-card p-4 border-l-4 border-ls-blue text-[13px] text-ls-ink-2">No location data yet. Add a <b>Location</b> field to employees in Core Data and this view populates automatically.</div>
                )}
                {progress.data && progress.data.available && (
                  <>
                    <div className="grid grid-cols-12 gap-2 pb-2 border-b border-ls-line text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">
                      <div className="col-span-5">Group name</div>
                      <div className="col-span-2 text-center">People</div>
                      <div className="col-span-2 text-center">Participation</div>
                      <div className="col-span-3">Response rate</div>
                    </div>
                    {progress.data.groups.map((g) => {
                      const hidden = g.people > 0 && g.people < 5;
                      return (
                        <div key={g.name} className="grid grid-cols-12 gap-2 py-2.5 items-center border-b border-ls-line last:border-0">
                          <div className="col-span-5 font-semibold text-[13px]">{g.name}</div>
                          <div className="col-span-2 text-center text-[13px] tabular-nums">{g.people}</div>
                          <div className="col-span-2 text-center text-[13px] tabular-nums">{'partial' in progress.data && progress.data.partial ? '—' : `${g.responseCount}/${g.people}`}</div>
                          <div className="col-span-3 flex items-center gap-2">
                            <div className="flex-1 h-2.5 rounded-full bg-ls-bg-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${g.responseRatePct ?? 0}%`, background: '#84BD00' }} /></div>
                            <span className="text-[12px] tabular-nums w-11 text-right">{hidden ? 'Hidden' : g.responseRatePct != null ? `${Math.round(g.responseRatePct)}%` : '—'}</span>
                          </div>
                        </div>
                      );
                    })}
                    {'partial' in progress.data && progress.data.partial && (
                      <p className="text-[11.5px] text-ls-ink-3 mt-3">Headcount is from the org chart. Per-team response rates fill in from in-app survey responses (imported periods only carry per-department numbers).</p>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="text-[11.5px] text-ls-ink-3 mt-2">Cost Centers grouping is intentionally omitted (not in the org data model).</p>
          </>
        )}
      </div>
    );
  }

  // ---------------- ANALYTICS ----------------
  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => setView('landing')} className="text-[13px] font-semibold text-ls-blue-deep mb-2">← All surveys</button>
      <h1 className="text-2xl font-bold tracking-tight mb-1">{c ? `${c.label} Engagement Survey` : 'Engagement Survey'}</h1>

      {results.isLoading && <div className="ls-card p-8 text-center text-sm text-ls-ink-3 mt-4">Loading results…</div>}
      {!results.isLoading && !hasData && <div className="ls-card p-8 text-center mt-4"><h2 className="font-bold mb-1">No results yet</h2></div>}

      {hasData && data && c && (
        <>
          <div className="flex gap-1 border-b border-ls-line mt-3 mb-4 flex-wrap">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-sm font-semibold px-3.5 py-2.5 -mb-px border-b-2 ${tab === t ? 'text-ls-blue-deep border-ls-blue' : 'text-ls-ink-3 border-transparent hover:text-ls-ink-2'}`}>{t}</button>
            ))}
          </div>

          <div className="flex gap-5 flex-wrap items-end mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Groups</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={sel}>
                <option value="all">All participants</option>
                {(data.departmentOptions ?? []).map((dn) => <option key={dn} value={dn}>{dn}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Attributes</label>
              <select className={sel} defaultValue="all" title="Filter by attribute — coming soon">
                <option value="all">All</option>
                <option value="job">Job title</option>
                <option value="tenure">Tenure</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Outcomes</label>
              <select className={sel} defaultValue="all" title="Filter by outcome — coming soon">
                <option value="all">All</option>
                <option value="promoters">eNPS promoters</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Period</label>
              <select value={periodId ?? data.selectedId} onChange={(e) => setPeriodId(e.target.value)} className={sel}>
                {[...data.periods].reverse().map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="text-[12px] text-ls-ink-3 pb-1.5">{c.participationPct != null ? `${Math.round(c.participationPct)}%` : '—'} ({c.responseCount}/{c.eligibleCount} participants)</div>
          </div>

          {tab === 'Summary' && <ResultsSummary data={data} />}
          {tab === 'Engagement' && <ResultsEngagement data={data} />}
          {tab === 'Drivers' && <ResultsDrivers data={data} />}
          {tab === 'Statements' && <ResultsStatements data={data} />}
          {tab === 'Heatmap' && <ResultsHeatmap data={data} />}
          {tab === 'eNPS' && <ResultsEnps />}
          {tab === 'Feedback' && <ResultsFeedback />}
        </>
      )}
    </div>
  );
}
