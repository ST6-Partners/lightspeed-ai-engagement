import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { X } from 'lucide-react';
import type { PipCheckin, CheckinStatus } from './types';
import { CHECKIN_STATUS_LABELS } from './types';

interface Props {
  pipId: string;
  initial?: PipCheckin;
  onClose: () => void;
  onSaved: () => void;
}

const input =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const label = 'block text-xs font-medium text-gray-500 uppercase mb-1';

// §6 — add/edit a check-in log entry.
export default function CheckInForm({ pipId, initial, onClose, onSaved }: Props) {
  const mode = initial ? 'edit' : 'create';
  const [labelText, setLabelText] = useState(initial?.label ?? '');
  const [checkinDate, setCheckinDate] = useState(initial?.checkinDate ?? '');
  const [attendees, setAttendees] = useState(initial?.attendees ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<CheckinStatus>(initial?.status ?? null);

  const add = trpc.pip.addCheckin.useMutation({ onSuccess: () => onSaved() });
  const upd = trpc.pip.updateCheckin.useMutation({ onSuccess: () => onSaved() });
  const saving = add.isLoading || upd.isLoading;

  const submit = () => {
    if (!labelText.trim()) return;
    if (mode === 'create') {
      add.mutate({
        pipId,
        label: labelText.trim(),
        checkinDate: checkinDate || undefined,
        attendees: attendees || undefined,
        notes: notes || undefined,
        status: status ?? undefined,
      });
    } else if (initial) {
      upd.mutate({
        id: initial.id,
        label: labelText.trim(),
        checkinDate: checkinDate || null,
        attendees: attendees || null,
        notes: notes || null,
        status: status ?? null,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add check-in' : 'Edit check-in'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Label</label>
              <input className={input} value={labelText} onChange={(e) => setLabelText(e.target.value)}
                placeholder="e.g. Mid-Point Review" />
            </div>
            <div>
              <label className={label}>Date</label>
              <input type="date" className={input} value={checkinDate ?? ''}
                onChange={(e) => setCheckinDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Attendees</label>
            <input className={input} value={attendees} onChange={(e) => setAttendees(e.target.value)}
              placeholder="e.g. Manager + Employee + HR" />
          </div>
          <div>
            <label className={label}>Progress, evidence &amp; blockers</label>
            <textarea className={input} rows={3} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was reviewed at this check-in" />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={status ?? ''}
              onChange={(e) => setStatus((e.target.value || null) as CheckinStatus)}>
              <option value="">—</option>
              {(Object.keys(CHECKIN_STATUS_LABELS) as Array<keyof typeof CHECKIN_STATUS_LABELS>).map((s) => (
                <option key={s} value={s}>{CHECKIN_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={submit} disabled={!labelText.trim() || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
