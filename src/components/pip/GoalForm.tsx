import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { X } from 'lucide-react';
import type { PipGoal, GoalStatus } from './types';
import { GOAL_STATUS_LABELS } from './types';

interface Props {
  pipId: string;
  initial?: PipGoal;
  onClose: () => void;
  onSaved: () => void;
}

const input =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const label = 'block text-xs font-medium text-gray-500 uppercase mb-1';

// §4 — add/edit an expectation / success criterion (goal).
export default function GoalForm({ pipId, initial, onClose, onSaved }: Props) {
  const mode = initial ? 'edit' : 'create';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [successCriteria, setSuccessCriteria] = useState(initial?.successCriteria ?? '');
  const [measurement, setMeasurement] = useState(initial?.measurement ?? '');
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? 'pending');

  const add = trpc.pip.addGoal.useMutation({ onSuccess: () => onSaved() });
  const upd = trpc.pip.updateGoal.useMutation({ onSuccess: () => onSaved() });
  const saving = add.isLoading || upd.isLoading;

  const submit = () => {
    if (!title.trim()) return;
    if (mode === 'create') {
      add.mutate({
        pipId,
        title: title.trim(),
        successCriteria: successCriteria || undefined,
        measurement: measurement || undefined,
      });
    } else if (initial) {
      upd.mutate({
        id: initial.id,
        title: title.trim(),
        successCriteria: successCriteria || null,
        measurement: measurement || null,
        status,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add goal' : 'Edit goal'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={label}>Goal</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Restore delivery predictability" />
          </div>
          <div>
            <label className={label}>What success looks like (measurable)</label>
            <textarea className={input} rows={3} value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              placeholder="Define 'met' up front, in measurable terms" />
          </div>
          <div>
            <label className={label}>How it will be measured</label>
            <textarea className={input} rows={2} value={measurement}
              onChange={(e) => setMeasurement(e.target.value)}
              placeholder="Data source / evidence + review cadence" />
          </div>
          {mode === 'edit' && (
            <div>
              <label className={label}>Status</label>
              <select className={input} value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}>
                {(Object.keys(GOAL_STATUS_LABELS) as GoalStatus[]).map((s) => (
                  <option key={s} value={s}>{GOAL_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={submit} disabled={!title.trim() || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
