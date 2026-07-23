// ============================================================
// INSIGHTS DASHBOARD — one home for the manager-facing insight surfaces.
// Mirrors the Reviews tab pattern: a URL-addressable (?tab=) sub-page
// switcher across Manager Brief, Metrics, and Manager Effectiveness, which
// were previously three separate nav items.
// ============================================================

import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import ManagerBrief from './ManagerBrief';
import Metrics from './Metrics';
import ManagerEffectiveness from './ManagerEffectiveness';

type Tab = 'brief' | 'metrics' | 'effectiveness';

export default function InsightsDashboard() {
  // Tab is URL-addressable (?tab=metrics|effectiveness) so the sidebar
  // dropdown can deep-link to a section. Absent/unknown param → Manager Brief.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('tab');
  const tab: Tab = param === 'metrics' || param === 'effectiveness' ? param : 'brief';
  const setTab = (next: Tab) => setSearchParams(next === 'brief' ? {} : { tab: next });
  const tabs: Array<[Tab, string]> = [
    ['brief', 'Manager Brief'], ['metrics', 'Metrics'], ['effectiveness', 'Manager Effectiveness'],
  ];
  return (
    <div className="max-w-6xl mx-auto">
      <div className="ls-eyebrow mb-1">Insights</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><LayoutDashboard size={22} className="text-blue-600" /> Insights Dashboard</h1>
      <p className="text-sm text-ls-ink-3 mb-4">Your team brief, weekly metrics, and manager effectiveness — all in one place.</p>
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
      {tab === 'metrics' && <Metrics />}
      {tab === 'effectiveness' && <ManagerEffectiveness />}
    </div>
  );
}
