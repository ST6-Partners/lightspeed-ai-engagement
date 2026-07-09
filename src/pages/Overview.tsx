// ============================================================
// DOCUMENTS → OVERVIEW
// AI Engagement System — high-level overview (v1 draft).
// Native render of the two-component system map: Execution
// (org + planning) and Engagement (support / measure / hear).
// Reads left → right. Content is static reference documentation.
// ============================================================

import { Fragment } from 'react';

type Stage = {
  n: number;
  title: string;
  points: string[];
  note?: string;        // muted placeholder note (e.g. Reviews)
  badge?: string;       // solid "INCLUDES NEW BUILD" style badge
  tbd?: boolean;        // amber placeholder styling
};

const execution: Stage[] = [
  { n: 1, title: 'Core Data', points: ['Departments', 'Employees', 'Titles', 'Email addresses'] },
  { n: 2, title: 'Organization', points: ['Managers', 'Reporting lines', 'Organizes the core data from stage 1'] },
  { n: 3, title: 'OKRs', points: ['Project plans', 'Objectives & key results', 'Tasks', 'Linked to people'] },
  { n: 4, title: 'Weekly Plan', points: ['Employees plan their week', 'Priorities & plans', 'Connected to projects & OKRs'] },
];

const engagement: Stage[] = [
  { n: 1, title: 'Check-ins', points: ['Bilateral, after each weekly 1:1', 'How the manager sees the employee', 'How the employee sees the manager', 'How the employee feels about Lightspeed'] },
  { n: 2, title: 'Reviews', points: [], note: 'Placeholder — to be defined', tbd: true },
  { n: 3, title: 'Coaching Plans', points: ['Growth areas for strong performers', "PIPs for employees who aren't doing well"] },
  { n: 4, title: 'Feedback', points: ['A manager delivering the coaching plan to the employee as feedback'] },
  { n: 5, title: 'Engagement Surveys', points: ['Historic Lightspeed engagement surveys', 'New: manager survey — employees give specific feedback on how their manager is doing'] },
  { n: 6, title: 'Manager Survey', points: ['Indicator of how their manager affects their work'] },
  { n: 7, title: 'Exit Interviews', points: ['The ultimate truth serum on employee sentiment and engagement', 'Structured exit conversation', 'Content per defined coverage'] },
];

type Theme = 'execution' | 'engagement';

function StageCard({ stage, theme }: { stage: Stage; theme: Theme }) {
  const isExec = theme === 'execution';
  const tbd = stage.tbd;

  const cardCls = tbd
    ? 'border-ls-watch/45 bg-ls-watch-bg'
    : isExec
    ? 'border-ls-blue/30 bg-ls-blue-50'
    : 'border-ls-thrive/30 bg-ls-thrive-bg';

  const numCls = tbd
    ? 'bg-ls-watch text-white'
    : isExec
    ? 'bg-ls-blue-deep text-white'
    : 'bg-ls-thrive text-white';

  const bulletCls = tbd ? 'bg-ls-watch' : isExec ? 'bg-ls-blue-deep' : 'bg-ls-thrive';

  return (
    <div className={`flex-1 basis-0 min-w-0 rounded-ls border p-4 ${cardCls}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${numCls}`}>
          {stage.n}
        </span>
      </div>
      <h3 className="font-bold text-ls-ink text-[15px] mb-2">{stage.title}</h3>

      {stage.note && (
        <p className="text-sm text-ls-ink-2 mb-2">{stage.note}</p>
      )}

      {stage.points.length > 0 && (
        <ul className="space-y-1.5">
          {stage.points.map((p, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-ls-ink-2">
              <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${bulletCls}`} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}

      {stage.badge && (
        <span className="ls-chip mt-2.5 bg-ls-thrive text-white uppercase tracking-wide">{stage.badge}</span>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden lg:flex items-center text-ls-ink-3 shrink-0 px-0.5" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
      </svg>
    </div>
  );
}

function StageRow({ stages, theme }: { stages: Stage[]; theme: Theme }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">
      {stages.map((s, i) => (
        <Fragment key={s.n}>
          <StageCard stage={s} theme={theme} />
          {i < stages.length - 1 && <Arrow />}
        </Fragment>
      ))}
    </div>
  );
}

export default function Overview() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="ls-eyebrow mb-1">Documents</div>
      <h1 className="text-2xl font-bold tracking-tight">AI Engagement System — High-Level Overview</h1>
      <p className="text-sm text-ls-ink-3 mb-6 max-w-3xl">
        Two components: <b className="text-ls-ink-2">Execution</b> (set up the org and how work is
        planned) and <b className="text-ls-ink-2">Engagement</b> (how people are supported, measured,
        and heard). Flow reads left → right. · v1 draft
      </p>

      {/* EXECUTION */}
      <section className="ls-card p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="ls-chip bg-ls-blue-deep text-white uppercase tracking-wide">Execution</span>
          <h2 className="font-bold text-ls-ink text-lg">Standing the system up and planning the work</h2>
          <span className="text-xs text-ls-ink-3 ml-auto">4 stages · each builds on the last</span>
        </div>
        <StageRow stages={execution} theme="execution" />
      </section>

      {/* ENGAGEMENT */}
      <section className="ls-card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="ls-chip bg-ls-thrive text-white uppercase tracking-wide">Engagement</span>
          <h2 className="font-bold text-ls-ink text-lg">Supporting, measuring, and hearing from people</h2>
          <span className="text-xs text-ls-ink-3 ml-auto">7 areas · left → right</span>
        </div>
        <StageRow stages={engagement} theme="engagement" />
      </section>

      <p className="text-xs text-ls-ink-3 mt-6 text-right">AI Engagement · v1 high-level overview · draft for review</p>
    </div>
  );
}
