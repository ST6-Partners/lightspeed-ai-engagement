// ============================================================
// INSIGHTS DASHBOARD — one home for the manager-facing insight surfaces.
// A URL-addressable (?tab=) sub-page switcher across Manager Brief and Manager
// Effectiveness. The former standalone Metrics view was folded into the Manager
// Brief (2026-07-27) so the weekly team metrics live alongside the brief.
// ============================================================

import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { trpc } from '../lib/trpc';
import ManagerBrief from './ManagerBrief';
import ManagerEffectiveness from './ManagerEffectiveness';

type Tab = 'brief' | 'effectiveness' | 'periods';

export default function InsightsDashboard() {
  // Tab is URL-addressable (?tab=effectiveness) so the sidebar
  // dropdown can deep-link to a section. Absent/unknown param → Manager Brief.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('tab');
  const tab: Tab = param === 'effectiveness' ? 'effectiveness' : param === 'periods' ? 'periods' : 'brief';
  const setTab = (next: Tab) => setSearchParams(next === 'brief' ? {} : { tab: next });
  const tabs: Array<[Tab, string]> = [
    ['brief', 'Manager Brief'], ['effectiveness', 'Manager Effectiveness'], ['periods', 'Periods'],
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
      {tab === 'periods' && <PeriodsPanel />}
    </div>
  );
}

// ── Periods panel — current cadence periods + period notifications ──
function PeriodsPanel() {
  const { data: cp } = trpc.cadence.currentPeriods.useQuery();
  const { data: notifs } = trpc.notifications.list.useQuery();
  const cadenceNotifs = (notifs ?? []).filter((n: any) => n.type === 'cadence_overdue' || n.type === 'cadence_new_period');
  const rows: { label: string; k: 'ninebox' | 'priorities' | 'reviews' }[] = [
    { label: '9 Box ratings', k: 'ninebox' },
    { label: 'Priorities', k: 'priorities' },
    { label: 'Reviews', k: 'reviews' },
  ];
  const rel = (v: any) => {
    const d = new Date(v); const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`;
  };
  return (
    <div className="space-y-5">
      <div className="ls-card p-4">
        <div className="text-[13px] font-bold mb-3">Current periods{cp ? (cp.autoAdvance ? ' · auto-advancing' : ' · manual') : ''}</div>
        <div className="divide-y divide-gray-100">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between py-2 text-[13px]">
              <span className="font-medium text-gray-700">{r.label}</span>
              <span className="text-gray-900 font-semibold">{cp ? (cp as any)[r.k].activeLabel : '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ls-card p-4">
        <div className="text-[13px] font-bold mb-3">Period notifications</div>
        {cadenceNotifs.length === 0 ? (
          <div className="text-[13px] text-gray-400">No period notifications right now.</div>
        ) : (
          <ul className="space-y-2">
            {cadenceNotifs.map((n: any) => (
              <li key={n.id} className="flex items-start gap-2 text-[13px]">
                <span style={{ marginTop: 4, width: 8, height: 8, borderRadius: 4, background: n.type === 'cadence_overdue' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                <span className="text-gray-700">{n.message} <span className="text-gray-400">· {rel(n.createdAt)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
