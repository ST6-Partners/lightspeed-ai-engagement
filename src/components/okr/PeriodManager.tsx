// ============================================================
// PeriodManager — admin modal to create / activate / close OKR goal-setting
// periods. Standalone so it can be opened from both the OKRs workspace and the
// OKR Analytics tab. Wraps okrPeriods.create / setCurrent / close. Read-only
// users never see the trigger; the mutations are also requireAdmin server-side.
// ============================================================
import { useState } from 'react';
import { trpc } from '../../lib/trpc';

export interface PeriodRow {
  id: string;
  label: string;
  isCurrent: boolean;
  status: string;
}

export default function PeriodManager({ periods, onClose, onChange, onSelect }: {
  periods: PeriodRow[];
  onClose: () => void;
  onChange: () => void;
  onSelect: (id: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [makeCurrent, setMakeCurrent] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const create = trpc.okrPeriods.create.useMutation({
    onSuccess: (row) => { setLabel(''); setStartDate(''); setEndDate(''); onChange(); if (makeCurrent && row?.id) onSelect(row.id); },
    onError: (e) => setErr(e.message),
  });
  const setCurrent = trpc.okrPeriods.setCurrent.useMutation({ onSuccess: (row) => { onChange(); if (row?.id) onSelect(row.id); }, onError: (e) => setErr(e.message) });
  const close = trpc.okrPeriods.close.useMutation({ onSuccess: () => onChange(), onError: (e) => setErr(e.message) });

  const submit = () => {
    setErr(null);
    if (!label.trim()) { setErr('Give the period a name (e.g. "2027 Goals").'); return; }
    create.mutate({ label: label.trim(), startDate: startDate || null, endDate: endDate || null, makeCurrent });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="ls-card bg-ls-surface w-full max-w-2xl p-5 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Manage goal-setting periods</h2>
          <button onClick={onClose} className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5">Close</button>
        </div>

        <p className="text-[12.5px] text-ls-ink-3 mb-4">
          A period is a goal-setting cycle — usually a full year (e.g. "2026 Goals"). Set the one the
          company is currently working toward; closing a period freezes its results for the record.
        </p>

        {err && <div className="mb-3 text-[12.5px] text-ls-risk border border-ls-risk rounded-md px-3 py-2" style={{ background: '#FBEAE8' }}>{err}</div>}

        <div className="border border-ls-line rounded-md p-3 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-2">New period</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1">Name</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ls-active"
                placeholder="2027 Goals" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1">Start date</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1">End date</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} />
            Make this the current period (where new OKRs land)
          </label>
          <div className="mt-3">
            <button onClick={submit} disabled={create.isPending} className="ls-btn ls-btn-primary text-xs py-1.5 px-3">
              {create.isPending ? 'Creating…' : 'Create period'}</button>
          </div>
        </div>

        <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-2">Existing periods</div>
        <div className="space-y-1.5">
          {periods.map((pd) => (
            <div key={pd.id} className="flex items-center gap-2 py-2 border-b border-ls-line last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{pd.label}
                  {pd.isCurrent && <span className="ml-2 ls-chip bg-ls-blue-50 text-ls-blue-deep">current</span>}
                  {pd.status === 'closed' && <span className="ml-2 ls-chip" style={{ background: '#EEE', color: '#666' }}>closed</span>}
                  {pd.status === 'draft' && <span className="ml-2 ls-chip" style={{ background: '#FBF2DC', color: '#C99300' }}>draft</span>}
                </div>
              </div>
              {!pd.isCurrent && (
                <button onClick={() => setCurrent.mutate({ id: pd.id })} disabled={setCurrent.isPending}
                  className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-blue-deep">Set current</button>
              )}
              {pd.status !== 'closed' && (
                <button onClick={() => { if (window.confirm(`Close "${pd.label}"? This freezes its scorecard and makes it read-only.`)) close.mutate({ id: pd.id }); }}
                  disabled={close.isPending}
                  className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5">Close</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
