// ============================================================
// CORE DATA · DEPARTMENTS — manage the shared HR department lookup
// Feeds Job Titles, the PIP "Team / Department" field, and the Exit Survey.
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Row { id: string; name: string; description: string | null; isActive: boolean; sortOrder: number; }

export default function Departments() {
  const { data: depts, refetch, isLoading } = trpc.departments.list.useQuery({ includeInactive: true });
  const create = trpc.departments.create.useMutation({ onSuccess: () => { resetNew(); refetch(); } });
  const update = trpc.departments.update.useMutation({ onSuccess: () => { setEditing(null); refetch(); } });
  const remove = trpc.departments.remove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  const [nName, setNName] = useState('');
  const [nDesc, setNDesc] = useState('');
  const resetNew = () => { setNName(''); setNDesc(''); };
  const [editing, setEditing] = useState<Row | null>(null);

  const addDept = () => {
    if (!nName.trim()) return;
    create.mutate({ name: nName.trim(), description: nDesc || undefined });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Departments</h2>
        <p className="text-sm text-gray-500">
          The managed list of org functions / departments used by Job Titles, the PIP “Team / Department”
          field, and the Exit Survey. Deactivate to retire one without affecting historical records.
        </p>
      </div>

      {/* Add row */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="w-56">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Department</label>
          <input className={`${inputCls} w-full`} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. Engineering" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Description</label>
          <input className={`${inputCls} w-full`} value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="optional" />
        </div>
        <button onClick={addDept} disabled={!nName.trim() || create.isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !depts || depts.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No departments yet. Add one above.</td></tr>
            ) : (
              (depts as Row[]).map((d) => {
                const isEd = editing?.id === d.id;
                return (
                  <tr key={d.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2">
                      {isEd ? <input className={`${inputCls} w-full`} value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} />
                            : <span className={d.isActive ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}>{d.name}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <input className={`${inputCls} w-full`} value={editing!.description ?? ''} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} />
                            : <span className="text-gray-600">{d.description || '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => update.mutate({ id: d.id, isActive: !d.isActive })}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        title="Toggle active">
                        {d.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEd ? (
                        <>
                          <button onClick={() => update.mutate({ id: d.id, name: editing!.name.trim(), description: editing!.description || null })}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={15} /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing(d)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete “${d.name}”? (Blocked if any title/plan uses it — deactivate instead.)`)) remove.mutate({ id: d.id }); }}
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
