// ============================================================
// CORE DATA · ASSESSMENTS — admin CRUD for the person-card assessments
// Pick a person, then edit their CCAT, EPP, and Insights data. Writes through
// the orgScreen admin mutations; the same rows render on the Organization →
// Assessments person card. (Phase 2 will add API/PDF ingestion.)
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const inputCls =
  'px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

// text -> number|null (mutations expect real numbers, not strings)
const toN = (s: string): number | null => (s.trim() === '' ? null : Number(s));
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const BAND_OPTS = [
  { v: '', label: '—' },
  { v: 'green', label: 'green' },
  { v: 'yellow', label: 'yellow' },
  { v: 'red', label: 'red' },
];
const INSIGHT_COLOR_OPTS = ['blue', 'green', 'yellow', 'red'];

export default function Assessments() {
  const { data: users = [], isLoading: usersLoading } = trpc.auth.listUsers.useQuery();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState(searchParams.get('userId') ?? '');

  // Preselect when arriving via a deep link (e.g. "View full profile").
  useEffect(() => {
    const q = searchParams.get('userId');
    if (q) setUserId(q);
  }, [searchParams]);

  const sorted = useMemo(
    () => [...(users as any[])].sort((a, b) => str(a.name || a.email).localeCompare(str(b.name || b.email))),
    [users],
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">Assessments</h2>
        <p className="text-sm text-gray-500">
          Enter a person’s CCAT, EPP, and Insights data. It renders on the Organization →
          Assessments person card. CCAT: <span className="font-medium">Overall</span> is the raw score
          (badge, /50); other CCAT rows are 0–100 percentiles. EPP score is the badge number; each
          attribute bar uses <span className="font-medium">Score</span>. Insights: one row per colour with
          conscious + less-conscious values.
        </p>
      </div>

      {/* Person picker */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Person</label>
          <select className={`${inputCls} w-full`} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{usersLoading ? 'Loading…' : 'Select a person…'}</option>
            {sorted.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}{u.title ? ` — ${u.title}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {!userId ? (
        <div className="text-sm text-gray-400 px-1">Select a person to edit their assessments.</div>
      ) : (
        <div className="space-y-6">
          <SummaryEditor userId={userId} />
          <CcatEditor userId={userId} />
          <EppEditor userId={userId} />
          <InsightEditor userId={userId} />
        </div>
      )}
    </div>
  );
}

function SectionShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Summary (one row per person) ─────────────────────────────
function SummaryEditor({ userId }: { userId: string }) {
  const { data, refetch, isLoading } = trpc.orgScreen.assessmentSummaryList.useQuery({ userId });
  const cur = (data as any[] | undefined)?.[0];
  const upsert = trpc.orgScreen.assessmentSummaryUpsert.useMutation({ onSuccess: () => refetch() });

  const [ccatColor, setCcatColor] = useState<string | null>(null);
  const [eppColor, setEppColor] = useState<string | null>(null);
  const [eppProfile, setEppProfile] = useState<string | null>(null);
  const [eppScore, setEppScore] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // initialize from server once loaded / when person changes
  const seedKey = `${userId}:${cur?.updatedAt ?? ''}`;
  const [seenKey, setSeenKey] = useState('');
  if (!isLoading && seedKey !== seenKey) {
    setSeenKey(seedKey);
    setCcatColor(cur?.ccatColor ?? '');
    setEppColor(cur?.eppColor ?? '');
    setEppProfile(cur?.eppProfile ?? '');
    setEppScore(str(cur?.eppScore));
    setDirty(false);
  }

  const save = () => {
    upsert.mutate({
      userId,
      ccatColor: ccatColor || null,
      eppColor: eppColor || null,
      eppProfile: (eppProfile ?? '').trim() || null,
      eppScore: toN(eppScore ?? ''),
    });
    setDirty(false);
  };

  return (
    <SectionShell title="Summary" subtitle="Badge colours, EPP profile name, and the EPP badge score.">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">CCAT badge</label>
          <select className={`${inputCls} w-full`} value={ccatColor ?? ''} onChange={(e) => { setCcatColor(e.target.value); setDirty(true); }}>
            {BAND_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">EPP badge</label>
          <select className={`${inputCls} w-full`} value={eppColor ?? ''} onChange={(e) => { setEppColor(e.target.value); setDirty(true); }}>
            {BAND_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">EPP profile</label>
          <input className={`${inputCls} w-full`} value={eppProfile ?? ''} onChange={(e) => { setEppProfile(e.target.value); setDirty(true); }} placeholder="e.g. Analysis, Planning & Consulting" />
        </div>
        <div className="w-24">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">EPP score</label>
          <input className={`${inputCls} w-full`} value={eppScore ?? ''} onChange={(e) => { setEppScore(e.target.value); setDirty(true); }} placeholder="0–100" />
        </div>
        <button onClick={save} disabled={!dirty || upsert.isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Check size={15} /> Save
        </button>
      </div>
    </SectionShell>
  );
}

// ── CCAT sections ────────────────────────────────────────────
function CcatEditor({ userId }: { userId: string }) {
  const { data = [], refetch } = trpc.orgScreen.ccatSectionsList.useQuery({ userId });
  const create = trpc.orgScreen.ccatSectionCreate.useMutation({ onSuccess: () => { setNLabel(''); setNScore(''); setNSort(''); refetch(); } });
  const update = trpc.orgScreen.ccatSectionUpdate.useMutation({ onSuccess: () => { setEditId(null); refetch(); } });
  const remove = trpc.orgScreen.ccatSectionRemove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  const [nLabel, setNLabel] = useState(''); const [nScore, setNScore] = useState(''); const [nSort, setNSort] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [eLabel, setELabel] = useState(''); const [eScore, setEScore] = useState(''); const [eSort, setESort] = useState('');

  const rows = data as any[];
  return (
    <SectionShell title="CCAT" subtitle="Use label “Overall” for the badge (raw /50). Other rows are 0–100 percentiles (e.g. Spatial, Verbal, Math & Logic).">
      <table className="w-full text-sm mb-3">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="py-2 font-medium">Label</th><th className="py-2 font-medium w-24">Score</th><th className="py-2 font-medium w-24">Sort</th><th className="py-2 font-medium text-right w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="py-3 text-gray-400">No CCAT rows yet.</td></tr>
          ) : rows.map((r) => {
            const ed = editId === r.id;
            return (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-full`} value={eLabel} onChange={(e) => setELabel(e.target.value)} /> : r.label}</td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-20`} value={eScore} onChange={(e) => setEScore(e.target.value)} /> : str(r.score)}</td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-16`} value={eSort} onChange={(e) => setESort(e.target.value)} /> : r.sortOrder}</td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  {ed ? (
                    <>
                      <button onClick={() => update.mutate({ id: r.id, label: eLabel.trim(), score: toN(eScore), sortOrder: Number(eSort || 0) })} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={15} /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(r.id); setELabel(r.label); setEScore(str(r.score)); setESort(String(r.sortOrder)); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Delete “${r.label}”?`)) remove.mutate({ id: r.id }); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Label</label><input className={`${inputCls} w-full`} value={nLabel} onChange={(e) => setNLabel(e.target.value)} placeholder="Overall / Spatial…" /></div>
        <div className="w-24"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Score</label><input className={`${inputCls} w-full`} value={nScore} onChange={(e) => setNScore(e.target.value)} /></div>
        <div className="w-20"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Sort</label><input className={`${inputCls} w-full`} value={nSort} onChange={(e) => setNSort(e.target.value)} placeholder="0" /></div>
        <button onClick={() => nLabel.trim() && create.mutate({ userId, label: nLabel.trim(), score: toN(nScore), sortOrder: Number(nSort || 0) })} disabled={!nLabel.trim() || create.isLoading} className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"><Plus size={15} /> Add</button>
      </div>
    </SectionShell>
  );
}

// ── EPP attributes ───────────────────────────────────────────
function EppEditor({ userId }: { userId: string }) {
  const { data = [], refetch } = trpc.orgScreen.eppAttributesList.useQuery({ userId });
  const create = trpc.orgScreen.eppAttributeCreate.useMutation({ onSuccess: () => { setN({ name: '', st6: '', color: '', sort: '' }); refetch(); } });
  const update = trpc.orgScreen.eppAttributeUpdate.useMutation({ onSuccess: () => { setEditId(null); refetch(); } });
  const remove = trpc.orgScreen.eppAttributeRemove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  const [n, setN] = useState({ name: '', st6: '', color: '', sort: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [e, setE] = useState({ name: '', st6: '', color: '', sort: '' });

  const rows = data as any[];
  return (
    <SectionShell title="EPP attributes" subtitle="The bars under EPP. Score = the bar value (0–100). Colour is the bar’s band colour on the card — green (#639922) = high, amber (#EF9F27) = mid, red (#E24B4A) = low.">
      <table className="w-full text-sm mb-3">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="py-2 font-medium">Attribute</th><th className="py-2 font-medium w-20">Score</th><th className="py-2 font-medium w-28">Colour</th><th className="py-2 font-medium w-16">Sort</th><th className="py-2 font-medium text-right w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="py-3 text-gray-400">No EPP attributes yet.</td></tr>
          ) : rows.map((r) => {
            const ed = editId === r.id;
            return (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-full`} value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} /> : r.name}</td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-16`} value={e.st6} onChange={(ev) => setE({ ...e, st6: ev.target.value })} /> : str(r.st6Score)}</td>
                <td className="py-1.5 pr-2">
                  {ed ? <input className={`${inputCls} w-24`} value={e.color} onChange={(ev) => setE({ ...e, color: ev.target.value })} /> : (
                    <span className="inline-flex items-center gap-1">
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: r.colorHex || '#378ADD', display: 'inline-block' }} />
                      <span className="text-gray-600">{r.colorHex || '—'}</span>
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-14`} value={e.sort} onChange={(ev) => setE({ ...e, sort: ev.target.value })} /> : r.sortOrder}</td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  {ed ? (
                    <>
                      <button onClick={() => update.mutate({ id: r.id, name: e.name.trim(), st6Score: toN(e.st6), colorHex: e.color.trim() || null, sortOrder: Number(e.sort || 0) })} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={15} /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(r.id); setE({ name: r.name, st6: str(r.st6Score), color: r.colorHex || '', sort: String(r.sortOrder) }); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Delete “${r.name}”?`)) remove.mutate({ id: r.id }); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Attribute</label><input className={`${inputCls} w-full`} value={n.name} onChange={(ev) => setN({ ...n, name: ev.target.value })} placeholder="Achievement…" /></div>
        <div className="w-20"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Score</label><input className={`${inputCls} w-full`} value={n.st6} onChange={(ev) => setN({ ...n, st6: ev.target.value })} /></div>
        <div className="w-28"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Colour hex</label><input className={`${inputCls} w-full`} value={n.color} onChange={(ev) => setN({ ...n, color: ev.target.value })} placeholder="#639922" /></div>
        <div className="w-16"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Sort</label><input className={`${inputCls} w-full`} value={n.sort} onChange={(ev) => setN({ ...n, sort: ev.target.value })} placeholder="0" /></div>
        <button onClick={() => n.name.trim() && create.mutate({ userId, name: n.name.trim(), st6Score: toN(n.st6), colorHex: n.color.trim() || null, sortOrder: Number(n.sort || 0) })} disabled={!n.name.trim() || create.isLoading} className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"><Plus size={15} /> Add</button>
      </div>
    </SectionShell>
  );
}

// ── Insight profiles ─────────────────────────────────────────
function InsightEditor({ userId }: { userId: string }) {
  const { data = [], refetch } = trpc.orgScreen.insightProfilesList.useQuery({ userId });
  const create = trpc.orgScreen.insightProfileCreate.useMutation({ onSuccess: () => { setN({ color: 'blue', con: '', less: '', primary: false, sort: '' }); refetch(); } });
  const update = trpc.orgScreen.insightProfileUpdate.useMutation({ onSuccess: () => { setEditId(null); refetch(); } });
  const remove = trpc.orgScreen.insightProfileRemove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  const [n, setN] = useState({ color: 'blue', con: '', less: '', primary: false, sort: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [e, setE] = useState({ color: 'blue', con: '', less: '', primary: false, sort: '' });

  const rows = data as any[];
  return (
    <SectionShell title="Insights (Colour Dynamics)" subtitle="One row per colour (blue, green, yellow, red). Conscious + Less-conscious are 0–100. Mark the dominant colour primary.">
      <table className="w-full text-sm mb-3">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="py-2 font-medium w-28">Colour</th><th className="py-2 font-medium w-24">Conscious</th><th className="py-2 font-medium w-28">Less consc.</th><th className="py-2 font-medium w-20">Primary</th><th className="py-2 font-medium w-16">Sort</th><th className="py-2 font-medium text-right w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} className="py-3 text-gray-400">No insight rows yet.</td></tr>
          ) : rows.map((r) => {
            const ed = editId === r.id;
            return (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="py-1.5 pr-2">{ed ? (
                  <select className={`${inputCls} w-24`} value={e.color} onChange={(ev) => setE({ ...e, color: ev.target.value })}>{INSIGHT_COLOR_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                ) : r.color}</td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-16`} value={e.con} onChange={(ev) => setE({ ...e, con: ev.target.value })} /> : str(r.consciousScore)}</td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-16`} value={e.less} onChange={(ev) => setE({ ...e, less: ev.target.value })} /> : str(r.lessConsciousScore)}</td>
                <td className="py-1.5 pr-2">{ed ? <input type="checkbox" checked={e.primary} onChange={(ev) => setE({ ...e, primary: ev.target.checked })} /> : (r.isPrimary ? 'Yes' : '—')}</td>
                <td className="py-1.5 pr-2">{ed ? <input className={`${inputCls} w-14`} value={e.sort} onChange={(ev) => setE({ ...e, sort: ev.target.value })} /> : r.sortOrder}</td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  {ed ? (
                    <>
                      <button onClick={() => update.mutate({ id: r.id, color: e.color, consciousScore: toN(e.con), lessConsciousScore: toN(e.less), isPrimary: e.primary, sortOrder: Number(e.sort || 0) })} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={15} /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(r.id); setE({ color: r.color || 'blue', con: str(r.consciousScore), less: str(r.lessConsciousScore), primary: !!r.isPrimary, sort: String(r.sortOrder) }); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Delete ${r.color}?`)) remove.mutate({ id: r.id }); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Colour</label><select className={`${inputCls} w-full`} value={n.color} onChange={(ev) => setN({ ...n, color: ev.target.value })}>{INSIGHT_COLOR_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="w-24"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Conscious</label><input className={`${inputCls} w-full`} value={n.con} onChange={(ev) => setN({ ...n, con: ev.target.value })} /></div>
        <div className="w-28"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Less consc.</label><input className={`${inputCls} w-full`} value={n.less} onChange={(ev) => setN({ ...n, less: ev.target.value })} /></div>
        <label className="flex items-center gap-1 text-xs text-gray-600 pb-2"><input type="checkbox" checked={n.primary} onChange={(ev) => setN({ ...n, primary: ev.target.checked })} /> Primary</label>
        <div className="w-16"><label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Sort</label><input className={`${inputCls} w-full`} value={n.sort} onChange={(ev) => setN({ ...n, sort: ev.target.value })} placeholder="0" /></div>
        <button onClick={() => create.mutate({ userId, color: n.color, consciousScore: toN(n.con), lessConsciousScore: toN(n.less), isPrimary: n.primary, sortOrder: Number(n.sort || 0) })} disabled={create.isLoading} className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"><Plus size={15} /> Add</button>
      </div>
    </SectionShell>
  );
}
