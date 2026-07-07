// Engagement Survey — results-first landing for HR & managers. Tabs:
//   Summary · Breakdown · Drivers · Take Survey
// A period toggle switches Summary/Breakdown/Drivers between survey periods
// (imported history + the current live period, which appear automatically).
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import SurveyForm from '../components/engagement/SurveyForm';
import { ResultsSummary, ResultsBreakdown, ResultsDrivers } from '../components/engagement/Results';

const TABS = ['Summary', 'Breakdown', 'Drivers', 'Take Survey'] as const;
type Tab = (typeof TABS)[number];

const selectCls =
  'px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600';

export default function EngagementSurvey() {
  const [tab, setTab] = useState<Tab>('Summary');
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const isResultsTab = tab !== 'Take Survey';

  const results = trpc.engagementAnalytics.results.useQuery(
    periodId ? { periodId } : undefined,
    { enabled: isResultsTab },
  );
  const data = results.data;

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
                <option key={p.id} value={p.id}>{p.label}</option>
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

      {tab === 'Take Survey' && <SurveyForm />}
    </div>
  );
}
