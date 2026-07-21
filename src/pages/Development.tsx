// ============================================================
// DEVELOPMENT — one page, three sub-tabs: PIP, Coaching Plans, Exit Survey.
// Same tabbed pattern as the Reviews section; consolidates the three former
// Engagement nav items. Each tab renders the existing page component; their
// detail routes (/pips/:id, /coaching-plans/:id) still work via the router.
// 2026-07-21 (bf).
// ============================================================

import { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import Pips from './Pips';
import CoachingPlans from './CoachingPlans';
import ExitSurvey from './ExitSurvey';

export default function Development() {
  const [tab, setTab] = useState<'pip' | 'coaching' | 'exit'>('coaching');
  const tabs: Array<['pip' | 'coaching' | 'exit', string]> = [
    ['coaching', 'Coaching Plans'], ['pip', 'PIP'], ['exit', 'Exit Survey'],
  ];
  return (
    <div className="max-w-6xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><HeartHandshake size={22} className="text-blue-600" /> Development</h1>
      <p className="text-sm text-ls-ink-3 mb-4">Improvement plans, coaching plans, and exit surveys — all in one place.</p>
      <div className="flex gap-6 border-b border-gray-200 mb-5">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`pb-2.5 -mb-px text-[15px] font-semibold border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'pip' && <Pips />}
      {tab === 'coaching' && <CoachingPlans />}
      {tab === 'exit' && <ExitSurvey />}
    </div>
  );
}
