import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { X } from 'lucide-react';
import type { PipSupport } from './types';

interface Props {
  pipId: string;
  initial?: PipSupport;
  onClose: () => void;
  onSaved: () => void;
}

const input =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const label = 'block text-xs font-medium text-gray-500 uppercase mb-1';

// §5 — add/edit a support / resource commitment.
export default function SupportForm({ pipId, initial, onClose, onSaved }: Props) {
  const mode = initial ? 'edit' : 'create';
  const [support, setSupport] = useState(initial?.support ?? '');
  const [owner, setOwner] = useState(initial?.owner ?? '');
  const [cadence, setCadence] = useState(initial?.cadence ?? '');

  const add = trpc.pip.addSupport.useMutation({ onSuccess: () => onSaved() });
  const upd = trpc.pip.updateSupport.useMutation({ onSuccess: () => onSaved() });
  const saving = add.isLoading || upd.isLoading;

  const submit = () => {
    if (!support.trim()) return;
    if (mode === 'create') {
      add.mutate({ pipId, support: support.trim(), owner: owner || undefined, cadence: cadence || undefined });
    } else if (initial) {
      upd.mutate({ id: initial.id, support: support.trim(), owner: owner || null, cadence: cadence || null });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Add support' : 'Edit support'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={label}>Support / resource</label>
            <input className={input} value={support} onChange={(e) => setSupport(e.target.value)}
              placeholder="e.g. Weekly 1:1 coaching with manager" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Owner</label>
              <input className={input} value={owner} onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Manager, L&D" />
            </div>
            <div>
              <label className={label}>Cadence</label>
              <input className={input} value={cadence} onChange={(e) => setCadence(e.target.value)}
                placeholder="e.g. Every Monday, 30 min" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={submit} disabled={!support.trim() || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
