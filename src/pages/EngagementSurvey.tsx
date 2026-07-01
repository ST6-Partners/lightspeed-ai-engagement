// Engagement Survey — results-first landing for HR & managers. Tabs:
//   Summary · Breakdown · Drivers · Take Survey
// Summary/Breakdown/Drivers read engagementAnalytics.results (historical + live
// merged); Take Survey holds the actual questionnaire.
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import SurveyForm from '../components/engagement/SurveyForm';
import { ResultsSummary, ResultsBreakdown, ResultsDrivers } from '../components/engagement/Results';

const TABS = ['Summary', 'Breakdown', 'Drivers', 'Take Survey'] as const;
type Tab = (typeof TABS)[number];

export default function EngagementSurvey() {
  const [tab, setTab] = useState<Tab>('Summary');
  const results = trpc.engagementAnalytics.results.useQuery(undefined, { enabled: tab !== 'Take Survey' });

  const isResultsTab = tab !== 'Take Survey';
  const data = results.data;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight">Engagement Survey</h1>
      <p className="text-sm text-ls-ink-3 mb-4">
        Results for HR and managers — company engagement, department breakdowns, and drivers —
        plus the survey itself under <b>Take Survey</b>.
      </p>

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
