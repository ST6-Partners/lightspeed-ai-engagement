// ============================================================
// CORE DATA · PERFORMANCE CRITERIA — manage the performance framework.
//
// The companion axis to Company Values. Criteria are managed here (add / edit
// / activate / delete) and feed employee performance evaluations
// (Engagement > Reviews, Performance tab). Fully AIE-owned — no external sync.
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;
const inputCls = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Row { id: string; name: string; definition: string | null; active: boolean; sortOrder: number; }

export default function PerformanceCriteria() {
  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.admin;

  const { data: criteria, refetch, isLoading } = trpc.performance.listCriteria.useQuery({ includeInactive: true });

  const create = trpc.performance.createCriterion.useMutation({ onSuccess: () => { resetNew(); refetch(); }, onError: (e) => alert(e.message) });
  const update = trpc.performance.updateCriterion.useMutation({ onSuccess: () => { setEditing(null); refetch(); }, onError: (e) => alert(e.message) });
  const remove = trpc.performance.deleteCriterion.useMutation({ onSuccess: (r) => { refetch(); if (r.deactivated) alert('In use by past evaluations — deactivated instead of deleted.'); }, onError: (e) => alert(e.message) });

  const [nName, setNName] = useState('');
  const [nDef, setNDef] = useState('');
  const resetNew = () => { setNName(''); setNDef(''); };
  const [editing, setEditing] = useState<Row | null>(null);

  const rows = (criteria ?? []) as Row[];

  const addCriterion = () => {
    if (!nName.trim()) return;
    create.mutate({ name: nName.trim(), definition: nDef.trim() || undefined });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">Performance Criteria</h2>
        <p className="text-sm text-gray-500">The performance framework scored in employee reviews (Engagement &rarr; Reviews, Performance tab). The companion axis to Company Values. Deactivate to retire a criterion without losing history.</p>
      </div>

      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
          <div className="w-64">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Criterion</label>
            <input className={`${inputCls} w-full`} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. Results & Goal Attainment" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Definition</label>
            <input className={`${inputCls} w-full`} value={nDef} onChange={(e) => setNDef(e.target.value)} placeholder="Short definition of what this measures" />
          </div>
          <button onClick={addCriterion} disabled={!nName.trim() || create.isLoading}
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Plus size={15} /> Add
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400 text-sm py-6 text-center">Loading&hellip;</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm py-6 text-center bg-white border border-gray-200 rounded-lg">No criteria yet. Add one above.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {rows.map((c) => {
            const isEd = editing?.id === c.id;
            return (
              <div key={c.id} className="px-3 py-2.5">
                {isEd ? (
                  <div className="space-y-2">
                    <input className={`${inputCls} w-full`} value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} placeholder="Criterion name" />
                    <input className={`${inputCls} w-full`} value={editing!.definition ?? ''} onChange={(e) => setEditing({ ...editing!, definition: e.target.value })} placeholder="Definition" />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => update.mutate({ id: c.id, name: editing!.name.trim(), definition: editing!.definition || null })}
                        className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={16} /></button>
                      <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <span className={`font-medium text-sm ${c.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{c.name}</span>
                      {c.definition && <p className="text-sm text-gray-500 mt-0.5">{c.definition}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => update.mutate({ id: c.id, active: !c.active })}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`} title="Toggle active">
                          {c.active ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => setEditing(c)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm('Delete this criterion?')) remove.mutate({ id: c.id }); }} className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
