// Org Data admin — v1 write path for the Org screen tables (spec §7.6):
// Priorities, Engagement snapshots, and 9 Box ratings. The Org screen tabs are
// read-only consumers of these (except 9 Box, which also rates inline).
import { useState } from 'react';
import { trpc } from '../../lib/trpc';

const SECTIONS = ['Priorities', 'Engagement', '9 Box'] as const;
type Section = typeof SECTIONS[number];

export default function OrgData() {
  const [section, setSection] = useState<Section>('Priorities');
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Org Data</h2>
        <p className="text-sm text-gray-500">Manual data entry for the Organization screen. Admin only.</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200">
        {SECTIONS.map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`text-sm font-semibold px-3.5 py-2 -mb-px border-b-2 ${section === s ? 'text-blue-700 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{s}</button>
        ))}
      </div>
      {section === 'Priorities' && <PrioritiesAdmin />}
      {section === 'Engagement' && <EngagementAdmin />}
      {section === '9 Box' && <NineBoxAdmin />}
    </div>
  );
}

const inputCls = 'px-2 py-1 rounded text-sm border border-gray-200 focus:ring-2 focus:ring-blue-500';
const btnCls = 'px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';
const cardCls = 'bg-white rounded-lg border border-gray-200 p-4';

function useEmployees() {
  const { data = [] } = trpc.auth.listUsers.useQuery();
  const active = (data as any[]).filter((u) => u.isActive);
  const nameById = new Map<string, string>((data as any[]).map((u) => [u.id, u.name ?? u.email]));
  return { active, nameById };
}

function PrioritiesAdmin() {
  const utils = trpc.useContext();
  const { active, nameById } = useEmployees();
  const { data: okrs = [] } = trpc.okrs.list.useQuery();
  const { data: rows = [] } = trpc.orgScreen.prioritiesList.useQuery({});
  const create = trpc.orgScreen.prioritiesCreate.useMutation({ onSuccess: () => utils.orgScreen.prioritiesList.invalidate() });
  const remove = trpc.orgScreen.prioritiesRemove.useMutation({ onSuccess: () => utils.orgScreen.prioritiesList.invalidate() });
  const [userId, setUserId] = useState('');
  const [itemType, setItemType] = useState<'objective' | 'key_result' | 'task' | 'ktbr'>('ktbr');
  const [okrNodeId, setOkrNodeId] = useState('');
  const [ktbrLabel, setKtbrLabel] = useState('');

  const add = () => {
    if (!userId) return;
    create.mutate({ userId, itemType, okrNodeId: itemType === 'ktbr' ? null : (okrNodeId || null), ktbrLabel: itemType === 'ktbr' ? ktbrLabel : null });
    setKtbrLabel(''); setOkrNodeId('');
  };
  const okrTitle = (id: string | null) => (okrs as any[]).find((n) => n.id === id)?.title ?? '—';

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex flex-wrap items-center gap-2">
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select employee…</option>
            {active.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
          </select>
          <select className={inputCls} value={itemType} onChange={(e) => setItemType(e.target.value as any)}>
            <option value="objective">Objective</option><option value="key_result">Key Result</option>
            <option value="task">Task</option><option value="ktbr">KTBR</option>
          </select>
          {itemType === 'ktbr' ? (
            <input className={`${inputCls} flex-1 min-w-[200px]`} placeholder="KTBR label" value={ktbrLabel} onChange={(e) => setKtbrLabel(e.target.value)} />
          ) : (
            <select className={`${inputCls} flex-1 min-w-[200px]`} value={okrNodeId} onChange={(e) => setOkrNodeId(e.target.value)}>
              <option value="">Select OKR item…</option>
              {(okrs as any[]).filter((n) => n.type === itemType).map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          )}
          <button className={btnCls} disabled={!userId || create.isLoading} onClick={add}>+ Add</button>
        </div>
      </div>
      <SimpleTable
        cols={['Employee', 'Type', 'Item', '']}
        rows={(rows as any[]).map((r) => [
          nameById.get(r.userId) ?? '—', r.itemType,
          r.itemType === 'ktbr' ? r.ktbrLabel : okrTitle(r.okrNodeId),
          <DeleteBtn key={r.id} onClick={() => remove.mutate({ id: r.id })} />,
        ])}
      />
    </div>
  );
}

function EngagementAdmin() {
  const utils = trpc.useContext();
  const { active, nameById } = useEmployees();
  const { data: rows = [] } = trpc.orgScreen.engagementList.useQuery({});
  const upsert = trpc.orgScreen.engagementUpsert.useMutation({ onSuccess: () => utils.orgScreen.engagementList.invalidate() });
  const remove = trpc.orgScreen.engagementRemove.useMutation({ onSuccess: () => utils.orgScreen.engagementList.invalidate() });
  const [userId, setUserId] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [score, setScore] = useState('75');

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex flex-wrap items-center gap-2">
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select employee…</option>
            {active.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
          </select>
          <input type="date" className={inputCls} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          <input type="number" min={0} max={100} className={`${inputCls} w-24`} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" />
          <button className={btnCls} disabled={!userId || upsert.isLoading}
            onClick={() => userId && upsert.mutate({ userId, asOf, score: Number(score) })}>+ Save</button>
        </div>
      </div>
      <SimpleTable
        cols={['Employee', 'As of', 'Score', '']}
        rows={(rows as any[]).map((r) => [
          nameById.get(r.userId) ?? '—', r.asOf, r.score ?? '—',
          <DeleteBtn key={`${r.userId}-${r.asOf}`} onClick={() => remove.mutate({ userId: r.userId, asOf: r.asOf })} />,
        ])}
      />
    </div>
  );
}

function NineBoxAdmin() {
  const utils = trpc.useContext();
  const { nameById } = useEmployees();
  const { data: rows = [] } = trpc.orgScreen.nineboxList.useQuery({});
  const remove = trpc.orgScreen.nineboxRemove.useMutation({ onSuccess: () => utils.orgScreen.nineboxList.invalidate() });
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
        Rate people inline on the Organization screen → 9 Box tab. This is a backstop list for review/cleanup.
      </div>
      <SimpleTable
        cols={['Employee', 'Box', 'Rated', '']}
        rows={(rows as any[]).map((r) => [
          nameById.get(r.userId) ?? '—', r.box, r.ratedAt,
          <DeleteBtn key={r.id} onClick={() => remove.mutate({ id: r.id })} />,
        ])}
      />
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>;
}

function SimpleTable({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">No rows yet.</div>
      ) : (
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
              {cols.map((c, i) => <th key={i} className="px-3 py-2.5">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                {r.map((cell, j) => <td key={j} className="px-3 py-2.5 text-sm text-gray-800">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
