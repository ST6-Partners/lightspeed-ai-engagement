// ============================================================
// CORE DATA · SURVEY QUESTIONS — the managed list of Manager Survey
// statements employees rate about a peer. Feeds the Peer Review form.
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Row { id: string; text: string; description: string | null; isActive: boolean; sortOrder: number; }

export default function PeerReviewQuestions() {
  const { data: rows, refetch, isLoading } = trpc.peerReviewQuestions.list.useQuery({ includeInactive: true });
  const create = trpc.peerReviewQuestions.create.useMutation({ onSuccess: () => { resetNew(); refetch(); }, onError: (e) => alert(e.message) });
  const update = trpc.peerReviewQuestions.update.useMutation({ onSuccess: () => { setEditing(null); refetch(); }, onError: (e) => alert(e.message) });
  const remove = trpc.peerReviewQuestions.remove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  const [nText, setNText] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nSort, setNSort] = useState('');
  const resetNew = () => { setNText(''); setNDesc(''); setNSort(''); };
  const [editing, setEditing] = useState<Row | null>(null);

  const addRow = () => {
    if (!nText.trim()) return;
    const sort = nSort.trim() ? parseInt(nSort, 10) : undefined;
    create.mutate({ text: nText.trim(), description: nDesc || undefined, sortOrder: Number.isNaN(sort as number) ? undefined : sort });
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Peer Review Questions</h2>
        <p className="text-sm text-gray-500">
          The statements employees rate about a peer on the Peer Review. Order by the
          Sort field. Deactivate to remove a question from the form without affecting past responses.
        </p>
      </div>

      {/* Add row */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Question</label>
          <input className={`${inputCls} w-full`} value={nText} onChange={(e) => setNText(e.target.value)} placeholder="e.g. This peer collaborates effectively across the team" />
        </div>
        <div className="w-40">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Description</label>
          <input className={`${inputCls} w-full`} value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="optional" />
        </div>
        <div className="w-20">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Sort</label>
          <input type="number" className={`${inputCls} w-full`} value={nSort} onChange={(e) => setNSort(e.target.value)} placeholder="10" />
        </div>
        <button onClick={addRow} disabled={!nText.trim() || create.isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} /> Add
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 font-medium w-14">Sort</th>
              <th className="px-3 py-2 font-medium">Question</th>
              <th className="px-3 py-2 font-medium w-44">Description</th>
              <th className="px-3 py-2 font-medium w-20">Status</th>
              <th className="px-3 py-2 font-medium text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No questions yet. Add one above.</td></tr>
            ) : (
              (rows as Row[]).map((q) => {
                const isEd = editing?.id === q.id;
                return (
                  <tr key={q.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-3 py-2">
                      {isEd ? <input type="number" className={`${inputCls} w-14`} value={editing!.sortOrder} onChange={(e) => setEditing({ ...editing!, sortOrder: parseInt(e.target.value, 10) })} />
                            : <span className="text-gray-400">{q.sortOrder}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <textarea className={`${inputCls} w-full`} rows={2} value={editing!.text} onChange={(e) => setEditing({ ...editing!, text: e.target.value })} />
                            : <span className={q.isActive ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}>{q.text}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEd ? <input className={`${inputCls} w-full`} value={editing!.description ?? ''} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} />
                            : <span className="text-gray-600">{q.description || '—'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => update.mutate({ id: q.id, isActive: !q.isActive })}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        title="Toggle active">
                        {q.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEd ? (
                        <>
                          <button onClick={() => update.mutate({ id: q.id, text: editing!.text.trim(), description: editing!.description || null, sortOrder: editing!.sortOrder })}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={15} /></button>
                          <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing(q)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete this question?\n\n“${q.text}”`)) remove.mutate({ id: q.id }); }}
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
