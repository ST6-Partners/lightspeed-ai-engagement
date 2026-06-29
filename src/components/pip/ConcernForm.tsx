import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { X } from 'lucide-react';
import type { PipConcern } from './types';

interface Props {
  pipId: string;
  initial?: PipConcern;
  onClose: () => void;
  onSaved: () => void;
}

const input =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const label = 'block text-xs font-medium text-gray-500 uppercase mb-1';

// §3 — add/edit a performance concern.
export default function ConcernForm({ pipId, initial, onClose, onSaved }: Props) {
  const mode = initial ? 'edit' : 'create';
  const [area, setArea] = useState(initial?.area ?? '');
  const [observations, setObservations] = useState(initial?.observations ?? '');
  const [expectation, setExpectation] = useState(initial?.expectation ?? '');
  const [previouslyRaised, setPreviouslyRaised] = useState(initial?.previouslyRaised ?? '');

  const add = trpc.pip.addConcern.useMutation({ onSuccess: () => onSaved() });
  const upd = trpc.pip.updateConcern.useMutation({ onSuccess: () => onSaved() });
  const saving = add.isLoading || upd.isLoading;

  const submit = () => {
    if (!area.trim()) return;
    if (mode === 'create') {
      add.mutate({
        pipId,
        area: area.trim(),
        observations: observations || undefined,
        expectation: expectation || undefined,
        previouslyRaised: previouslyRaised || undefined,
      });
    } else if (initial) {
      upd.mutate({
        id: initial.id,
        area: area.trim(),
        observations: observations || null,
        expectation: expectation || null,
        previouslyRaised: previouslyRaised || null,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add concern' : 'Edit concern'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={label}>Area of concern</label>
            <input className={input} value={area} onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Delivery predictability" />
          </div>
          <div>
            <label className={label}>Specific observations &amp; examples</label>
            <textarea className={input} rows={3} value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Specific, observable examples with dates" />
          </div>
          <div>
            <label className={label}>Expectation not yet met</label>
            <textarea className={input} rows={2} value={expectation}
              onChange={(e) => setExpectation(e.target.value)}
              placeholder="The role expectation this falls short of" />
          </div>
          <div>
            <label className={label}>Previously raised</label>
            <input className={input} value={previouslyRaised}
              onChange={(e) => setPreviouslyRaised(e.target.value)}
              placeholder="e.g. Q1 review (Mar 2026); 1:1 on May 12" />
            <p className="text-[11px] text-gray-400 mt-1">No surprises — note where this feedback was first given.</p>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={submit} disabled={!area.trim() || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
