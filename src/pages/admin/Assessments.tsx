// ============================================================
// CORE DATA · ASSESSMENTS — admin CRUD for the person-card assessments
// Pick a person, then edit their CCAT, EPP, and Insights data. Writes through
// the orgScreen admin mutations; the same rows render on the Organization →
// Assessments person card. (Phase 2 will add API/PDF ingestion.)
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../../lib/trpc';
import { Pencil, Trash2, Check, X } from 'lucide-react';

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
  const person = sorted.find((u) => u.id === userId);

  return (
    <div className="max-w-4xl">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">Assessments</h2>
        <p className="text-sm text-gray-500">
          Enter a person’s CCAT, EPP, and Insights data. It renders on the Organization →
          Assessments person card. CCAT: <span className="font-medium">Overall</span> is the raw score
          (badge, /50); other CCAT rows are 0–100 percentiles. EPP score is the badge number; each
          attribute bar uses <span className="font-medium">Percentile</span>. Insights: one row per colour with
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
          <CcatProfile userId={userId} person={person} />
          <EppProfile userId={userId} />
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

// ── Band helpers (computed from the percentile — no stored colour) ──
type Band = { label: string; color: string };
const BAND = { exceptional: '#2f8f5b', strong: '#4e9d6b', solid: '#5b9bd5', developing: '#d4a53a', weak: '#d9534f', none: '#9ca3af' };
const numv = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

function eppBand(p: number | null): Band {
  if (p == null) return { label: '—', color: BAND.none };
  if (p >= 85) return { label: 'Exceptional', color: BAND.exceptional };
  if (p >= 70) return { label: 'Strong', color: BAND.strong };
  if (p >= 55) return { label: 'Solid', color: BAND.solid };
  if (p >= 30) return { label: 'Developing', color: BAND.developing };
  return { label: 'Weak', color: BAND.weak };
}
function ccatBand(p: number | null): Band {
  if (p == null) return { label: '—', color: BAND.none };
  if (p >= 85) return { label: 'Exceptional', color: BAND.exceptional };
  if (p >= 70) return { label: 'Strong', color: BAND.strong };
  if (p >= 50) return { label: 'Solid', color: BAND.solid };
  if (p >= 30) return { label: 'Developing', color: BAND.developing };
  return { label: 'Below range', color: BAND.weak };
}

function ProfileBar({ pct, color }: { pct: number | null; color: string }) {
  const w = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div style={{ flex: 1, height: 10, background: '#eef0f2', borderRadius: 5 }}>
      <div style={{ width: `${w}%`, height: 10, background: color, borderRadius: 5 }} />
    </div>
  );
}

const legendStyle: React.CSSProperties = { marginTop: 14, paddingTop: 10, borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#9ca3af' };

// ── CCAT — read profile (name + overall raw /50 + banded sub-score bars) ──
function CcatProfile({ userId, person }: { userId: string; person: any }) {
  const { data = [] } = trpc.orgScreen.ccatSectionsList.useQuery({ userId });
  const rows = [...(data as any[])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const overall = rows.find((r) => String(r.label).toLowerCase() === 'overall');
  const subs = rows.filter((r) => String(r.label).toLowerCase() !== 'overall');
  return (
    <SectionShell title="CCAT" subtitle="Criteria Cognitive Aptitude Test — overall raw score (/50) and sub-score percentiles.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{person?.name || '—'}</div>
          {person?.title && <div style={{ fontSize: 13, color: '#6b7280' }}>{person.title}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{overall?.score ?? '—'}</span>
          <span style={{ fontSize: 15, color: '#9ca3af' }}>/50</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {subs.map((s) => {
          const p = numv(s.score);
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 120, fontSize: 14, color: '#1a1a2e' }}>{s.label}</span>
              <ProfileBar pct={p} color={ccatBand(p).color} />
              <span style={{ width: 36, textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{p ?? '—'}</span>
            </div>
          );
        })}
      </div>
      <div style={legendStyle}>Percentiles vs. Criteria&rsquo;s applicant norm group. Bands: 85+ exceptional &middot; 70&ndash;84 strong &middot; 50&ndash;69 solid &middot; 30&ndash;49 developing &middot; &lt;30 below range.</div>
    </SectionShell>
  );
}

// ── EPP — read profile (12 traits, banded bar + percentile + band label) ──
function EppProfile({ userId }: { userId: string }) {
  const { data = [] } = trpc.orgScreen.eppAttributesList.useQuery({ userId });
  const rows = [...(data as any[])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <SectionShell title="EPP Profiles" subtitle="Criteria Employee Personality Profile — 12 traits, percentile vs. global norm.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.length === 0 ? <div className="text-sm text-gray-400">No EPP data.</div> : rows.map((r) => {
          const p = numv(r.st6Score);
          const b = eppBand(p);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 150, fontSize: 14, color: '#1a1a2e' }}>{r.name}</span>
              <ProfileBar pct={p} color={b.color} />
              <span style={{ width: 34, textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{p ?? '—'}</span>
              <span style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 500, color: b.color }}>{b.label}</span>
            </div>
          );
        })}
      </div>
      <div style={legendStyle}>Percentile rankings vs. Criteria&rsquo;s global norm group. Bands: 85+ exceptional &middot; 70&ndash;84 strong &middot; 55&ndash;69 solid &middot; 30&ndash;54 developing &middot; &lt;30 weak.</div>
    </SectionShell>
  );
}

// ── Insight profiles ─────────────────────────────────────────
function InsightEditor({ userId }: { userId: string }) {
  const { data = [], refetch } = trpc.orgScreen.insightProfilesList.useQuery({ userId });
  const update = trpc.orgScreen.insightProfileUpdate.useMutation({ onSuccess: () => { setEditId(null); refetch(); } });
  const remove = trpc.orgScreen.insightProfileRemove.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

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
    </SectionShell>
  );
}
