// Survey Periods (admin) — HR/ELT manage the engagement-survey window.
// Set a release date (when it unlocks) and a close date (when it locks again).
// Only one "current" live period at a time; employees can take it once per period.
// Server enforces HR/ELT-only (managers cannot manage periods).
import { useState } from 'react';
import { trpc } from '../../lib/trpc';

const input = 'px-3 py-2 border border-ls-line rounded-md text-sm focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50';
const lbl = 'block text-xs font-medium text-ls-ink-3 uppercase tracking-wide mb-1';

function toLocalInput(d: string | Date | null | undefined) {
  if (!d) return '';
  const dt = new Date(d); const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function SurveyPeriods() {
  const utils = trpc.useContext();
  const { data: periods, isLoading, error } = trpc.engagementSurvey.adminListPeriods.useQuery();
  const invalidate = () => {
    utils.engagementSurvey.adminListPeriods.invalidate();
    utils.engagementSurvey.currentPeriod.invalidate();
    utils.engagementSurvey.myPeriodStatus.invalidate();
  };
  const create = trpc.engagementSurvey.adminCreatePeriod.useMutation({ onSuccess: () => { invalidate(); setLabel(''); setRelease(''); setClose(''); } });
  const update = trpc.engagementSurvey.adminUpdatePeriod.useMutation({ onSuccess: invalidate });

  const [label, setLabel] = useState('');
  const [release, setRelease] = useState('');
  const [close, setClose] = useState('');

  if (isLoading) return <div className="text-sm text-ls-ink-3">Loading…</div>;
  if (error) return <div className="text-sm text-ls-risk">{error.message}</div>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-ls-ink-1 mb-1">Survey Periods</h2>
      <p className="text-[13px] text-ls-ink-3 mb-4">
        Open the engagement survey for a period. It’s locked before the release date and after the close date, and each person can take it once per period. Managed by HR / ELT only.
      </p>

      <div className="ls-card p-4 mb-5">
        <h3 className="text-sm font-bold text-ls-ink-1 mb-3">New period</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className={lbl}>Label</label>
            <input className={input + ' w-full'} value={label} placeholder="e.g. 2026 Q3 Engagement" onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Release (opens)</label>
            <input type="datetime-local" className={input + ' w-full'} value={release} onChange={(e) => setRelease(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Close (locks)</label>
            <input type="datetime-local" className={input + ' w-full'} value={close} onChange={(e) => setClose(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              className="ls-btn ls-btn-primary disabled:opacity-50"
              disabled={!label.trim() || create.isPending}
              onClick={() => create.mutate({ label: label.trim(), releaseAt: release || null, closeAt: close || null, status: 'open', makeCurrent: true })}>
              {create.isPending ? 'Creating…' : 'Create & make current'}
            </button>
          </div>
        </div>
        {create.isError && <p className="text-[12px] text-ls-risk mt-2">{create.error.message}</p>}
      </div>

      <div className="space-y-3">
        {(periods ?? []).length === 0 && <p className="text-sm text-ls-ink-3">No periods yet.</p>}
        {(periods ?? []).map((p) => (
          <div key={p.id} className={`ls-card p-4 ${p.isCurrent ? 'border-l-4 border-ls-active' : ''}`}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="font-semibold text-ls-ink-1">{p.label}
                {p.isCurrent && <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep ml-2">Current</span>}
                <span className={`ls-chip ml-2 ${p.status === 'open' ? 'bg-ls-thrive-bg text-ls-thrive' : p.status === 'closed' ? 'bg-ls-risk-bg text-ls-risk' : 'bg-ls-bg-2 text-ls-ink-3'}`}>{p.status}</span>
              </div>
              <div className="flex gap-2">
                {!p.isCurrent && <button className="ls-btn ls-btn-ghost text-xs" onClick={() => update.mutate({ id: p.id, makeCurrent: true })}>Make current</button>}
                {p.status !== 'open' && <button className="ls-btn ls-btn-ghost text-xs" onClick={() => update.mutate({ id: p.id, status: 'open' })}>Open</button>}
                {p.status === 'open' && <button className="ls-btn ls-btn-ghost text-xs" onClick={() => update.mutate({ id: p.id, status: 'closed' })}>Close now</button>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Release</label>
                <input type="datetime-local" className={input + ' w-full'} defaultValue={toLocalInput(p.releaseAt)}
                  onBlur={(e) => update.mutate({ id: p.id, releaseAt: e.target.value || null })} />
              </div>
              <div>
                <label className={lbl}>Close</label>
                <input type="datetime-local" className={input + ' w-full'} defaultValue={toLocalInput(p.closeAt)}
                  onBlur={(e) => update.mutate({ id: p.id, closeAt: e.target.value || null })} />
              </div>
            </div>
            <p className="text-[12px] text-ls-ink-3 mt-2">Opens {fmt(p.releaseAt)} · Closes {fmt(p.closeAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
