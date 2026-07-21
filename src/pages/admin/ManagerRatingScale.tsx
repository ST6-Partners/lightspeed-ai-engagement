// ============================================================
// CORE DATA · RATING SCALE — the 1..5 legend used by the Manager Survey.
// Edit the label + definition of each rating; add or retire levels.
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Row { id: string; value: number; label: string; definition: string | null; isActive: boolean; }

export default function ManagerRatingScale() {
  const { data: rows, refetch, isLoading } = trpc.managerRatingScale.list.useQuery({ includeInactive: true });
  const create = trpc.managerRatingScale.create.useMutation({ onSuccess: () => { resetNew(); refetch(); }, onError: (e) => alert(e.message) });
  const update = trpc.managerRatingScale.update.useMutation({ onSuccess: () => { setEditing(null); refetch(); }, onError: (e) => alert(e.message) });
  const remove = trpc.managerRatingScale.remove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  const [nValue, setNValue] = useState('');
  const [nLabel, setNLabel] = useState('');
  const [nDef, setNDef] = useState('');
  const resetNew = () => { setNValue(''); setNLabel(''); setNDef(''); };
  const [editing, setEditing] = useState<Row | null>(null);

  const addRow = () => {
    const v = parseInt(nValue, 10);
    if (Number.isNaN(v) || !nLabel.trim()) return;
    create.mutate({ value: v, label: nLabel.trim(), definition: nDef || undefined });
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Rating Scale</h2>
        <p className="text-sm text-gray-500">
          The 1–5 rating legend shown on the Manager Review. Edit each level’s name and definition,
          or add / retire levels. Deactivate to hide a level without affecting past responses.
        </p>
      </div>

      {/* Add row */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="w-20">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Value</label>
          <input type="number" className={`${inputCls} w-full`} value={nValue} onChange={(e) => setNValue(e.target.value)} placeholder="5" />
        </div>
        <div className="w-56">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Label</label>
          <input className={`${inputCls} w-full`} value={nLabel} onChange={(e) => setNLabel(e.target.value)} placeholder="e.g. Well Above Expectations" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Definition</label>
          <input className={`${inputCls} w-full`} value={nDef} onChange={(e) => setNDef(e.target.value)} placeholder="optional" />
        </div>
        <button onClick={addRow} disabled={!nLabel.trim() || !nValue.trim() || create.isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 font-medium w-16">Value</th>
              <th className="px-3 py-2 font-medium w-56">Label</th>
              <th className="px-3 py-2 font-medium">Definition</th>
              <th className="px-3 py-2 font-medium w-20">Status</th>
              <th className="px-3 py-2 font-medium text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No rating levels yet. Add one above.</td></tr>
            ) : (
              (rows as Row[]).map((r) => {
                const isEd = editing?.id === r.id;
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-3 py-2">
                      {isEd ? <input type="number" className={`${inputCls} w-16`} value={editing!.value} onChange={(e) => setEditing({ ...editing!, value: parseInt(e.target.value, 10) })} />
                            : <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold">{r.value}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <input className={`${inputCls} w-full`} value={editing!.label} onChange={(e) => setEditing({ ...editing!, label: e.target.value })} />
                            : <span className={r.isActive ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}>{r.label}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <textarea className={`${inputCls} w-full`} rows={3} value={editing!.definition ?? ''} onChange={(e) => setEditing({ ...editing!, definition: e.target.value })} />
                            : <span className="text-gray-600">{r.definition || '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => update.mutate({ id: r.id, isActive: !r.isActive })}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        title="Toggle active">
                        {r.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEd ? (
                        <>
                          <button onClick={() => update.mutate({ id: r.id, value: editing!.value, label: editing!.label.trim(), definition: editing!.definition || null })}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={15} /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing(r)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete rating “${r.label}” (${r.value})?`)) remove.mutate({ id: r.id }); }}
                            className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
