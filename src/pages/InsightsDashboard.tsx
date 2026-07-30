// ============================================================
// INSIGHTS DASHBOARD — one home for the manager-facing insight surfaces.
// A URL-addressable (?tab=) sub-page switcher across Manager Brief and Manager
// Effectiveness. The former standalone Metrics view was folded into the Manager
// Brief (2026-07-27) so the weekly team metrics live alongside the brief.
//
// A short-lived "Periods" tab (2026-07-27) surfaced current cadence periods and
// period notifications here. Removed 2026-07-30 per PM: period-close notices
// belong in the notification centre, not in a dashboard tab nobody opens.
// `cadence.currentPeriods` is still consumed by Weekly Plan and Admin Settings.
// ============================================================

import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import ManagerBrief from './ManagerBrief';
import ManagerEffectiveness from './ManagerEffectiveness';

type Tab = 'brief' | 'effectiveness';

export default function InsightsDashboard() {
  // Tab is URL-addressable (?tab=effectiveness) so the sidebar
  // dropdown can deep-link to a section. Absent/unknown param → Manager Brief.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('tab');
  const tab: Tab = param === 'effectiveness' ? 'effectiveness' : 'brief';
  const setTab = (next: Tab) => setSearchParams(next === 'brief' ? {} : { tab: next });
  const tabs: Array<[Tab, string]> = [
    ['brief', 'Manager Brief'], ['effectiveness', 'Manager Effectiveness'],
  ];
  return (
    <div className="max-w-6xl mx-auto">
      <div className="ls-eyebrow mb-1">Insights</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><LayoutDashboard size={22} className="text-blue-600" /> Insights Dashboard</h1>
      <p className="text-sm text-ls-ink-3 mb-4">Your team brief and manager effectiveness in one place.</p>
      <div className="flex gap-6 border-b border-gray-200 mb-5">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`pb-2.5 -mb-px text-[15px] font-semibold border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'brief' && <ManagerBrief />}
      {tab === 'effectiveness' && <ManagerEffectiveness />}
    </div>
  );
}
