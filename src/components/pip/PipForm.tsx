import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { X } from 'lucide-react';
import type { PipDetail } from './types';

interface Props {
  initial?: PipDetail;       // present → edit; absent → create
  onClose: () => void;
  onSaved: (id: string) => void;
}

const input =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const label = 'block text-xs font-medium text-gray-500 uppercase mb-1';

// §1 + §2 — create or edit the PIP header (people, dates, purpose).
export default function PipForm({ initial, onClose, onSaved }: Props) {
  const mode = initial ? 'edit' : 'create';
  const { data: users } = trpc.pip.listUsers.useQuery();
  const { data: titles } = trpc.jobTitles.list.useQuery();

  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? '');
  const [managerId, setManagerId] = useState(initial?.managerId ?? '');
  const [hrPartnerId, setHrPartnerId] = useState(initial?.hrPartnerId ?? '');
  const [jobTitleId, setJobTitleId] = useState(initial?.jobTitleId ?? '');
  const [team, setTeam] = useState(initial?.team ?? '');
  const [durationDays, setDurationDays] = useState(String(initial?.durationDays ?? 60));
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [midpointDate, setMidpointDate] = useState(initial?.midpointDate ?? '');
  const [finalReviewDate, setFinalReviewDate] = useState(initial?.finalReviewDate ?? '');
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');

  const create = trpc.pip.create.useMutation({ onSuccess: (p) => onSaved(p.id) });
  const update = trpc.pip.update.useMutation({ onSuccess: () => initial && onSaved(initial.id) });
  const saving = create.isLoading || update.isLoading;

  // Auto-suggest mid-point & final dates from start + duration (create only).
  const recalcDates = (start: string, days: number) => {
    if (!start || !days) return;
    const s = new Date(start + 'T00:00:00');
    const mid = new Date(s); mid.setDate(s.getDate() + Math.round(days / 2));
    const end = new Date(s); end.setDate(s.getDate() + days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setMidpointDate(fmt(mid));
    setFinalReviewDate(fmt(end));
  };

  const submit = () => {
    const days = parseInt(durationDays, 10) || 60;
    if (mode === 'create') {
      create.mutate({
        employeeId: employeeId || undefined,
        managerId: managerId || undefined,
        hrPartnerId: hrPartnerId || undefined,
        jobTitleId: jobTitleId || undefined,
        team: team || undefined,
        durationDays: days,
        startDate: startDate || undefined,
        midpointDate: midpointDate || undefined,
        finalReviewDate: finalReviewDate || undefined,
        purpose: purpose || undefined,
      });
    } else if (initial) {
      update.mutate({
        id: initial.id,
        employeeId: employeeId || null,
        managerId: managerId || null,
        hrPartnerId: hrPartnerId || null,
        jobTitleId: jobTitleId || null,
        team: team || null,
        durationDays: days,
        startDate: startDate || null,
        midpointDate: midpointDate || null,
        finalReviewDate: finalReviewDate || null,
        purpose: purpose || null,
      });
    }
  };

  const userOptions = (
    <>
      <option value="">—</option>
      {(users ?? []).map((u) => (
        <option key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</option>
      ))}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'New Performance Improvement Plan' : 'Edit plan details'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Employee</label>
              <select className={input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {userOptions}
              </select>
            </div>
            <div>
              <label className={label}>Role / Level</label>
              <select className={input} value={jobTitleId} onChange={(e) => setJobTitleId(e.target.value)}>
                <option value="">—</option>
                {(titles ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}{t.level ? ` · ${t.level}` : ''}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Managed in Admin → Job Titles.</p>
            </div>
            <div>
              <label className={label}>Manager</label>
              <select className={input} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                {userOptions}
              </select>
            </div>
            <div>
              <label className={label}>HR Partner</label>
              <select className={input} value={hrPartnerId} onChange={(e) => setHrPartnerId(e.target.value)}>
                {userOptions}
              </select>
            </div>
            <div>
              <label className={label}>Team / Department</label>
              <input className={input} value={team} onChange={(e) => setTeam(e.target.value)}
                placeholder="e.g. Platform Engineering" />
            </div>
            <div>
              <label className={label}>Plan duration (days)</label>
              <input type="number" min={1} className={input} value={durationDays}
                onChange={(e) => { setDurationDays(e.target.value); }}
                onBlur={() => recalcDates(startDate, parseInt(durationDays, 10) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Start date</label>
              <input type="date" className={input} value={startDate ?? ''}
                onChange={(e) => { setStartDate(e.target.value); recalcDates(e.target.value, parseInt(durationDays, 10) || 0); }} />
            </div>
            <div>
              <label className={label}>Mid-point review</label>
              <input type="date" className={input} value={midpointDate ?? ''}
                onChange={(e) => setMidpointDate(e.target.value)} />
            </div>
            <div>
              <label className={label}>Final review</label>
              <input type="date" className={input} value={finalReviewDate ?? ''}
                onChange={(e) => setFinalReviewDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={label}>Purpose</label>
            <textarea className={input} rows={4} value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Leave blank to use the supportive default language." />
            <p className="text-[11px] text-gray-400 mt-1">
              Supportive, not punitive — the default language frames this as an opportunity to succeed.
            </p>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : mode === 'create' ? 'Create plan' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
