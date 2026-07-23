// ============================================================
// CORE DATA · COMPANY VALUES — manage the values framework.
//
// Values are managed here (add / edit / activate / delete), grouped by pillar,
// and feed the employee performance evaluations (Engagement > Reviews).
// Optional: if an ATA sync endpoint is configured, admins can also pull the
// framework from the AI Talent Assessment app ("Refresh from source"); locally
// created values are never overwritten by that sync.
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-react';
import ImportButton from '../../components/ImportButton';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;
const inputCls = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Row { id: string; name: string; pillar: string; category: string | null; description: string | null; active: boolean; sortOrder: number; source: string; }

export default function CompanyValues() {
  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.admin;

  const { data: values, refetch, isLoading } = trpc.values.list.useQuery({ includeInactive: true });
  const imp = trpc.values.import.useMutation({ onSuccess: () => refetch() });
  const { data: status, refetch: refetchStatus } = trpc.values.syncStatus.useQuery();

  const create = trpc.values.createValue.useMutation({ onSuccess: () => { resetNew(); refetch(); }, onError: (e) => alert(e.message) });
  const update = trpc.values.updateValue.useMutation({ onSuccess: () => { setEditing(null); refetch(); }, onError: (e) => alert(e.message) });
  const remove = trpc.values.deleteValue.useMutation({ onSuccess: (r) => { refetch(); if (r.deactivated) alert('In use by past evaluations — deactivated instead of deleted.'); }, onError: (e) => alert(e.message) });
  const sync = trpc.values.syncFromSource.useMutation({ onSuccess: (r) => { refetch(); refetchStatus(); alert(`Synced ${r.upserted} value(s) from ATA.`); }, onError: (e) => alert(e.message) });

  const [nName, setNName] = useState('');
  const [nPillar, setNPillar] = useState('');
  const [nDesc, setNDesc] = useState('');
  const resetNew = () => { setNName(''); setNPillar(''); setNDesc(''); };
  const [editing, setEditing] = useState<Row | null>(null);

  const rows = (values ?? []) as Row[];
  const pillars = Array.from(new Set(rows.map((v) => v.pillar)));

  const addValue = () => {
    if (!nName.trim() || !nPillar.trim()) return;
    create.mutate({ name: nName.trim(), pillar: nPillar.trim(), description: nDesc.trim() || undefined });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Company Values</h2>
          <div className="my-2"><ImportButton label="Import values" hint="CSV: name, pillar, category, description"
            onImport={async (rows) => imp.mutateAsync({ rows: rows.map((r) => ({ name: r.name ?? '', pillar: r.pillar, category: r.category, description: r.description })) })} /></div>
          <p className="text-sm text-gray-500">The values framework scored in employee performance evaluations (Engagement → Reviews). Grouped by pillar. Deactivate to retire without losing history.</p>
        </div>
        {isAdmin && status?.configured && (
          <button onClick={() => sync.mutate()} disabled={sync.isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">
            <RefreshCw size={15} className={sync.isLoading ? 'animate-spin' : ''} /> Refresh from ATA
          </button>
        )}
      </div>

      {/* Add row */}
      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Value</label>
            <input className={`${inputCls} w-full`} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. Owns the Outcome" />
          </div>
          <div className="w-52">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Pillar</label>
            <input className={`${inputCls} w-full`} list="pillar-list" value={nPillar} onChange={(e) => setNPillar(e.target.value)} placeholder="e.g. Mission-Driven" />
            <datalist id="pillar-list">{pillars.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Description</label>
            <input className={`${inputCls} w-full`} value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="Short behavioral description" />
          </div>
          <button onClick={addValue} disabled={!nName.trim() || !nPillar.trim() || create.isLoading}
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Plus size={15} /> Add
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-400 text-sm py-6 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm py-6 text-center bg-white border border-gray-200 rounded-lg">No values yet. Add one above.</div>
      ) : (
        pillars.map((pillar) => (
          <div key={pillar} className="mb-4">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">{pillar}</h3>
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {rows.filter((v) => v.pillar === pillar).map((v) => {
                const isEd = editing?.id === v.id;
                return (
                  <div key={v.id} className="px-3 py-2.5">
                    {isEd ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <input className={`${inputCls} flex-1 min-w-[160px]`} value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} placeholder="Value name" />
                          <input className={`${inputCls} w-48`} list="pillar-list" value={editing!.pillar} onChange={(e) => setEditing({ ...editing!, pillar: e.target.value })} placeholder="Pillar" />
                        </div>
                        <input className={`${inputCls} w-full`} value={editing!.description ?? ''} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} placeholder="Description" />
                        <div className="flex justify-end gap-1">
                          <button onClick={() => update.mutate({ id: v.id, name: editing!.name.trim(), pillar: editing!.pillar.trim(), description: editing!.description || null })}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={16} /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${v.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{v.name}</span>
                            {v.category && <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{v.category}</span>}
                          </div>
                          {v.description && <p className="text-sm text-gray-500 mt-0.5">{v.description}</p>}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => update.mutate({ id: v.id, active: !v.active })}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`} title="Toggle active">
                              {v.active ? 'Active' : 'Inactive'}
                            </button>
                            <button onClick={() => setEditing(v)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => { if (confirm(`Delete “${v.name}”?`)) remove.mutate({ id: v.id }); }} className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
