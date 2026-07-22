// Engagement Survey — results-first landing for HR & managers. Tabs:
//   Summary · Breakdown · Drivers · Take Survey
// A period toggle switches Summary/Breakdown/Drivers between survey periods
// (imported history + the current live period, which appear automatically).
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import SurveyForm from '../components/engagement/SurveyForm';
import { ResultsSummary, ResultsBreakdown, ResultsDrivers } from '../components/engagement/Results';

const fmtPeriodDate = (iso: string | undefined, isCurrent?: boolean) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isCurrent
    ? `as of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const TABS = ['Summary', 'Breakdown', 'Drivers', 'Raw Responses', 'Take Survey'] as const;
type Tab = (typeof TABS)[number];

const selectCls =
  'px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600';

export default function EngagementSurvey() {
  const [tab, setTab] = useState<Tab>('Summary');
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState<string>('all');
  const isResultsTab = tab !== 'Take Survey';

  const results = trpc.engagementAnalytics.results.useQuery(
    { periodId, department },
    { enabled: isResultsTab },
  );
  const data = results.data;
  const raw = trpc.engagementAnalytics.rawResponses.useQuery(
    { periodId, department },
    { enabled: tab === 'Raw Responses' },
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engagement Survey</h1>
          <p className="text-sm text-ls-ink-3 mb-4">
            Results for HR and managers — company engagement, department breakdowns, and drivers —
            plus the survey itself under <b>Take Survey</b>.
          </p>
        </div>
        {isResultsTab && data && data.hasData && data.periods.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-gray-500 uppercase">Period</label>
            <select
              className={selectCls}
              value={periodId ?? data.selectedId}
              onChange={(e) => setPeriodId(e.target.value)}
            >
              {[...data.periods].reverse().map((p) => (
                <option key={p.id} value={p.id}>{p.label} · {fmtPeriodDate(p.periodDate, p.isCurrent)}</option>
              ))}
            </select>
            <label className="text-[11px] font-medium text-gray-500 uppercase ml-2">Team</label>
            <select className={selectCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="all">All departments</option>
              {(data.departmentOptions ?? []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-ls-line mb-5 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm font-semibold px-3.5 py-2.5 -mb-px border-b-2 ${
              tab === t ? 'text-ls-blue-deep border-ls-blue' : 'text-ls-ink-3 border-transparent hover:text-ls-ink-2'
            }`}>{t}</button>
        ))}
      </div>

      {isResultsTab && results.isLoading && (
        <div className="ls-card p-8 text-center text-sm text-ls-ink-3">Loading results…</div>
      )}
      {isResultsTab && !results.isLoading && (!data || !data.hasData) && (
        <div className="ls-card p-8 text-center">
          <h2 className="font-bold mb-1">No results yet</h2>
          <p className="text-sm text-ls-ink-3">Once survey responses come in — or historical results are imported — the analytics will appear here.</p>
        </div>
      )}

      {isResultsTab && data && data.hasData && (
        <>
          {tab === 'Summary' && <ResultsSummary data={data} />}
          {tab === 'Breakdown' && <ResultsBreakdown data={data} />}
          {tab === 'Drivers' && <ResultsDrivers data={data} />}
        </>
      )}

      {tab === 'Raw Responses' && (
        <div>
          {raw.isLoading && <div className="ls-card p-8 text-center text-sm text-ls-ink-3">Loading raw responses…</div>}
          {!raw.isLoading && raw.data && raw.data.kind === 'empty' && (
            <div className="ls-card p-8 text-center text-sm text-ls-ink-3">No raw responses for this period yet.</div>
          )}
          {!raw.isLoading && raw.data && raw.data.kind === 'import' && (
            <div>
              <p className="text-sm text-ls-ink-3 mb-3">Raw uploaded statement-level data for <b>{raw.data.periodLabel}</b>{department !== 'all' ? <> · <b>{department}</b></> : ''} — {raw.data.rows.length} rows. This is the source data behind the imported results.</p>
              <div className="ls-card overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ls-ink-3 border-b border-ls-line">
                    <th className="px-3 py-2">Team</th><th className="px-3 py-2">Dimension</th><th className="px-3 py-2">Statement</th>
                    <th className="px-3 py-2 text-right">Avg</th><th className="px-3 py-2 text-right">Fav</th><th className="px-3 py-2 text-right">Neu</th><th className="px-3 py-2 text-right">Unfav</th><th className="px-3 py-2 text-right">Resp</th>
                  </tr></thead>
                  <tbody>
                    {raw.data.rows.map((r, i) => (
                      <tr key={i} className="border-b border-ls-line/60">
                        <td className="px-3 py-2 whitespace-nowrap text-ls-ink-3">{r.group}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.dimension}</td>
                        <td className="px-3 py-2">{r.statement}</td>
                        <td className="px-3 py-2 text-right">{r.avgResponse ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.favorable ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.neutral ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.unfavorable ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.totalResponses ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!raw.isLoading && raw.data && raw.data.kind === 'live' && (
            <div>
              <p className="text-sm text-ls-ink-3 mb-3">Individual (anonymous) responses for <b>{raw.data.periodLabel}</b>{department !== 'all' ? <> · <b>{department}</b></> : ''} — {raw.data.rows.length} responses. No names are recorded.</p>
              <div className="ls-card overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ls-ink-3 border-b border-ls-line">
                    <th className="px-3 py-2">Submitted</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Job title</th><th className="px-3 py-2 text-right">eNPS</th><th className="px-3 py-2 text-right">Answered</th>
                  </tr></thead>
                  <tbody>
                    {raw.data.rows.map((r, i) => (
                      <tr key={i} className="border-b border-ls-line/60">
                        <td className="px-3 py-2 whitespace-nowrap text-ls-ink-3">{new Date(r.submittedAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.department ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.jobTitle ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.enps ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.answered}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'Take Survey' && <SurveyForm />}
    </div>
  );
}
