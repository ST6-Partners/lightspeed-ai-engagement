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
          <InsightProfile userId={userId} person={person} />
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

// ── Insights (Colour Dynamics) — read profile ──
const ENERGY: Record<string, string> = { blue: '#4285f4', green: '#34a853', yellow: '#ffd400', red: '#ea4335' };
const ENERGY_ORDER = ['blue', 'green', 'yellow', 'red'];
const cap = (c: string) => (c ? c.charAt(0).toUpperCase() + c.slice(1) : c);
function fmtDate(d: unknown): string {
  if (!d) return '';
  const dt = new Date(String(d));
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function EnergyRow({ color, value }: { color: string; value: number | null }) {
  const w = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 56, fontSize: 13, color: '#374151' }}>{cap(color)}</span>
      <div style={{ flex: 1, height: 8, background: '#eef0f2', borderRadius: 4 }}>
        <div style={{ width: `${w}%`, height: 8, background: ENERGY[color] ?? '#9ca3af', borderRadius: 4 }} />
      </div>
      <span style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{value == null ? '—' : `${Math.round(value)}%`}</span>
    </div>
  );
}

function InsightProfile({ userId, person }: { userId: string; person: any }) {
  const { data: profiles = [] } = trpc.orgScreen.insightProfilesList.useQuery({ userId });
  const { data: sums = [] } = trpc.orgScreen.assessmentSummaryList.useQuery({ userId });
  const meta = (sums as any[])[0];
  const byColor = new Map((profiles as any[]).map((p) => [p.color, p]));
  const rows = ENERGY_ORDER.map((c) => byColor.get(c)).filter(Boolean) as any[];

  // Lead / support = top two by conscious score.
  const ranked = [...(profiles as any[])].sort((a, b) => numv(b.consciousScore)! - numv(a.consciousScore)!);
  const lead = ranked[0]?.color as string | undefined;
  const support = ranked[1]?.color as string | undefined;
  const flow = numv(meta?.insightsPreferenceFlow);

  const lbl: React.CSSProperties = { fontSize: 12, color: '#9ca3af', marginBottom: 2 };

  return (
    <SectionShell title="Insights" subtitle="Insights Discovery — Colour Dynamics (conscious vs. less-conscious energies).">
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{person?.name || '—'}</span>
            {meta?.insightsSource === 'uploaded' && (
              <span style={{ fontSize: 11, fontWeight: 500, color: '#15803d', background: '#dcfce7', borderRadius: 999, padding: '2px 8px' }}>Real profile (uploaded)</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {meta?.insightsSource === 'uploaded' ? 'Uploaded profile' : (person?.title || 'Profile')}
            {meta?.insightsCompletedAt ? ` · completed ${fmtDate(meta.insightsCompletedAt)}` : ''}
          </div>
        </div>
        {(meta?.insightsType || lead) && (
          <div style={{ textAlign: 'right' }}>
            {meta?.insightsType && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a1a2e', border: '1px solid #e5e7eb', borderRadius: 999, padding: '4px 10px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: ENERGY[lead ?? ''] ?? '#9ca3af', display: 'inline-block' }} />
                {meta.insightsType}
              </span>
            )}
            {lead && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Lead: {cap(lead)}{support ? ` · Support: ${cap(support)}` : ''}</div>}
          </div>
        )}
      </div>

      {/* wheel positions */}
      {(meta?.insightsConsciousWheel || meta?.insightsLessWheel) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, borderTop: '1px solid #f0f0f0', paddingTop: 12, marginBottom: 14 }}>
          <div>
            <div style={lbl}>Conscious wheel position</div>
            <div style={{ fontSize: 14, color: '#1a1a2e' }}>{meta?.insightsConsciousWheel || '—'}</div>
          </div>
          <div>
            <div style={lbl}>Less conscious wheel position</div>
            <div style={{ fontSize: 14, color: '#1a1a2e' }}>{meta?.insightsLessWheel || '—'}</div>
          </div>
        </div>
      )}

      {/* colour dynamics */}
      <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Colour dynamics</span>
          {flow != null && <span style={{ fontSize: 12, color: '#9ca3af' }}>Preference flow {flow}%</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Persona (Conscious)</div>
            {rows.map((r) => <EnergyRow key={r.id} color={r.color} value={numv(r.consciousScore)} />)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Persona (Less Conscious)</div>
            {rows.map((r) => <EnergyRow key={r.id} color={r.color} value={numv(r.lessConsciousScore)} />)}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
