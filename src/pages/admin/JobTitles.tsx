// ============================================================
// CORE DATA · JOB TITLES — manage the shared HR title/level lookup
// Feeds the PIP "Role / Level" picker and the Exit Survey role field.
// (Distinct from users.role, which is the auth tier.)
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Row {
  id: string; title: string; level: string | null;
  departmentId: string | null; departmentName: string | null;
  isActive: boolean; sortOrder: number;
}

export default function JobTitles() {
  const { data: titles, refetch, isLoading } = trpc.jobTitles.list.useQuery({ includeInactive: true });
  const { data: depts } = trpc.departments.list.useQuery();
  const create = trpc.jobTitles.create.useMutation({ onSuccess: () => { resetNew(); refetch(); } });
  const update = trpc.jobTitles.update.useMutation({ onSuccess: () => { setEditing(null); refetch(); } });
  const remove = trpc.jobTitles.remove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  // new-row form
  const [nTitle, setNTitle] = useState('');
  const [nLevel, setNLevel] = useState('');
  const [nDeptId, setNDeptId] = useState('');
  const resetNew = () => { setNTitle(''); setNLevel(''); setNDeptId(''); };

  // inline edit
  const [editing, setEditing] = useState<Row | null>(null);

  const deptOptions = (
    <>
      <option value="">—</option>
      {(depts ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </>
  );

  const addTitle = () => {
    if (!nTitle.trim()) return;
    create.mutate({ title: nTitle.trim(), level: nLevel || undefined, departmentId: nDeptId || undefined });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Job Titles</h2>
        <p className="text-sm text-gray-500">
          The managed list of titles / levels used by the PIP “Role / Level” field and the Exit Survey.
          Separate from a user’s permission role. Deactivate a title to retire it without affecting
          historical records.
        </p>
      </div>

      {/* Add row */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Title</label>
          <input className={`${inputCls} w-full`} value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="e.g. Software Engineer II" />
        </div>
        <div className="w-24">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Level</label>
          <input className={`${inputCls} w-full`} value={nLevel} onChange={(e) => setNLevel(e.target.value)} placeholder="L3" />
        </div>
        <div className="w-44">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Department</label>
          <select className={`${inputCls} w-full`} value={nDeptId} onChange={(e) => setNDeptId(e.target.value)}>{deptOptions}</select>
        </div>
        <button onClick={addTitle} disabled={!nTitle.trim() || create.isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !titles || titles.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No titles yet. Add one above.</td></tr>
            ) : (
              (titles as Row[]).map((t) => {
                const isEd = editing?.id === t.id;
                return (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2">
                      {isEd ? <input className={`${inputCls} w-full`} value={editing!.title} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} />
                            : <span className={t.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}>{t.title}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <input className={`${inputCls} w-20`} value={editing!.level ?? ''} onChange={(e) => setEditing({ ...editing!, level: e.target.value })} />
                            : <span className="text-gray-600">{t.level || '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <select className={`${inputCls} w-full`} value={editing!.departmentId ?? ''} onChange={(e) => setEditing({ ...editing!, departmentId: e.target.value || null })}>{deptOptions}</select>
                            : <span className="text-gray-600">{t.departmentName || '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => update.mutate({ id: t.id, isActive: !t.isActive })}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        title="Toggle active">
                        {t.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEd ? (
                        <>
                          <button onClick={() => update.mutate({ id: t.id, title: editing!.title.trim(), level: editing!.level || null, departmentId: editing!.departmentId })}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={15} /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing(t)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete “${t.title}”? (Blocked if any plan uses it — deactivate instead.)`)) remove.mutate({ id: t.id }); }}
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
