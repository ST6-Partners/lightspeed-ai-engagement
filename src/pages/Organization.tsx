// Organization — live people view; engagement derived from weekly check-ins.
import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { trpc } from '../lib/trpc';

type Status = 'thrive' | 'watch' | 'risk' | 'none';
const STATUS_META: Record<Status, { label: string; text: string; bg: string; spark: string }> = {
  thrive: { label: 'Thriving', text: 'text-ls-thrive', bg: 'bg-ls-thrive-bg', spark: '#2E9E7B' },
  watch: { label: 'Steady', text: 'text-ls-watch', bg: 'bg-ls-watch-bg', spark: '#C99300' },
  risk: { label: 'At risk', text: 'text-ls-risk', bg: 'bg-ls-risk-bg', spark: '#C2615A' },
  none: { label: 'No reads yet', text: 'text-ls-ink-3', bg: 'bg-ls-bg-2', spark: '#8A969E' },
};
const TABS = ['People', 'Pulse', 'Org Tree'] as const;

const OKR_LIGHT: Record<string, string> = { green: '#2E9E7B', yellow: '#C99300', red: '#C2615A' };
const OKR_STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  on_hold: 'On hold',
  complete: 'Complete',
};
const OKR_GROUPS = [
  { type: 'objective', label: 'Objectives' },
  { type: 'key_result', label: 'Key Results' },
  { type: 'task', label: 'Tasks' },
] as const;

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="w-[92px] text-[11px] text-ls-ink-3 text-right">—</div>;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 90 + 1;
      const y = 22 - ((v - min) / (max - min || 1)) * 18 - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width="92" height="24" viewBox="0 0 92 24"><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" /></svg>
  );
}

export default function Organization() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('People');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = trpc.organization.list.useQuery();
  const { data: okrs } = trpc.okrs.list.useQuery();
  const members = data?.members ?? [];
  const stats = data?.stats;

  const selected = members.find((p) => p.id === selectedId) ?? null;
  const selectPerson = (id: string) => setSelectedId((cur) => (cur === id ? null : id));
  const switchTab = (t: (typeof TABS)[number]) => {
    setTab(t);
    if (t !== 'Org Tree') setSelectedId(null);
  };

  const ownedOkrs = selected
    ? (okrs ?? []).filter(
        (n) => (n.owner ?? '').trim().toLowerCase() === selected.name.trim().toLowerCase(),
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
      <p className="text-sm text-ls-ink-3 mb-5">
        A continuous read of how the org is thriving — derived from weekly check-ins, never from a survey blast.
      </p>

      <div className="flex gap-1 border-b border-ls-line mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`text-sm font-semibold px-3.5 py-2.5 -mb-px border-b-2 ${
              tab === t ? 'text-ls-blue-deep border-ls-blue' : 'text-ls-ink-3 border-transparent hover:text-ls-ink-2'
            }`}>{t}</button>
        ))}
      </div>

      {tab !== 'Org Tree' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <Stat k="Thriving" v={`${stats.thrivingPct}%`} d="of people with a read" tone="text-ls-thrive" />
          <Stat k="Watch" v={String(stats.watch)} d="steady" tone="text-ls-watch" />
          <Stat k="At risk" v={String(stats.atRisk)} d="worth a look" tone="text-ls-risk" />
          <Stat k="Check-in rate" v={`${stats.checkinRate}%`} d="this week" tone="text-ls-blue-deep" />
        </div>
      )}

      {isLoading && <div className="text-sm text-ls-ink-3">Loading…</div>}
      {!isLoading && members.length === 0 && (
        <div className="ls-card p-6 text-sm text-ls-ink-3">No active people yet. Members appear here as users join and check in.</div>
      )}

      {tab === 'People' && members.map((p) => {
        const m = STATUS_META[p.status as Status];
        const TrendIcon = p.trend === 'up' ? TrendingUp : p.trend === 'down' ? TrendingDown : Minus;
        return (
          <div key={p.id} className="ls-card p-4 flex items-center gap-4 mb-3">
            <div className="w-11 h-11 rounded-full bg-ls-active text-white flex items-center justify-center font-bold shrink-0">
              {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14.5px]">{p.name}</div>
              <div className="text-[12.5px] text-ls-ink-3">{p.role}</div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[12px] text-ls-ink-3">
              <span>{p.lastCheckIn ? `Checked in ${p.lastCheckIn}` : 'No check-in'}</span>
              <TrendIcon size={15} className={m.text} />
            </div>
            <Spark data={p.spark} color={m.spark} />
            <span className={`ls-chip ${m.bg} ${m.text} min-w-[88px] justify-center`}>{m.label}</span>
          </div>
        );
      })}

      {tab === 'Pulse' && (
        <div className="ls-card p-5">
          <div className="font-semibold mb-1">Thriving read</div>
          <p className="text-sm text-ls-ink-3 mb-4">
            {stats ? `${stats.thrivingPct}% of people with a check-in this period are thriving; ${stats.atRisk} at risk.` : '—'}
          </p>
          <div className="flex items-end gap-2 h-24">
            {members.slice(0, 12).map((p) => {
              const latest = p.spark[p.spark.length - 1] ?? 0;
              return (
                <div key={p.id} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full max-w-[26px] rounded-t" style={{ height: latest * 18 || 4, background: STATUS_META[p.status as Status].spark }} />
                  <span className="text-[9px] text-ls-ink-3">{p.name.split(' ')[0]?.slice(0, 4)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'Org Tree' && !selected && (
        <div className="ls-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">People</div>
            <div className="text-xs text-ls-ink-3">Select a person to see their OKRs</div>
          </div>
          {members.map((p) => (
            <button key={p.id} onClick={() => selectPerson(p.id)}
              className="w-full text-left flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded hover:bg-ls-bg-2">
              <span className="w-7 h-7 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center text-[11px] font-bold">
                {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
              <span className="text-sm font-medium text-ls-ink">{p.name}</span>
              <span className="text-xs text-ls-ink-3">· {p.role}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'Org Tree' && selected && (
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
          <div className="ls-card p-5">
            <div className="font-semibold mb-3">People</div>
            {members.map((p) => {
              const isSel = p.id === selectedId;
              return (
                <button key={p.id} onClick={() => selectPerson(p.id)}
                  className={`w-full text-left flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded border-l-2 ${
                    isSel ? 'bg-ls-bg-2 border-ls-blue' : 'border-transparent hover:bg-ls-bg-2'
                  }`}>
                  <span className="w-7 h-7 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center text-[11px] font-bold">
                    {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                  <span className="text-sm font-medium text-ls-ink truncate">{p.name}</span>
                  <span className="text-xs text-ls-ink-3 truncate">· {p.role}</span>
                </button>
              );
            })}
          </div>

          <div className="ls-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-ls-active text-white flex items-center justify-center font-bold shrink-0">
                {selected.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14.5px]">{selected.name}</div>
                <div className="text-[12.5px] text-ls-ink-3">{selected.role}</div>
              </div>
              <button onClick={() => setSelectedId(null)}
                className="text-ls-ink-3 hover:text-ls-ink text-lg leading-none px-1" aria-label="Close">×</button>
            </div>

            {ownedOkrs.length === 0 ? (
              <div className="text-sm text-ls-ink-3">No OKRs owned yet.</div>
            ) : (
              OKR_GROUPS.map((g) => {
                const items = ownedOkrs.filter((n) => n.type === g.type);
                if (items.length === 0) return null;
                return (
                  <div key={g.type} className="mb-4 last:mb-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ls-ink-3 mb-2">{g.label}</div>
                    {items.map((n) => (
                      <div key={n.id} className="flex items-start gap-2.5 py-1.5">
                        <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: n.light ? OKR_LIGHT[n.light] : '#8A969E' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ls-ink">{n.title}</div>
                          <div className="text-[12px] text-ls-ink-3">
                            {OKR_STATUS_LABEL[n.status] ?? n.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v, d, tone }: { k: string; v: string; d: string; tone?: string }) {
  return (
    <div className="ls-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ls-ink-3">{k}</div>
      <div className={`text-2xl font-extrabold mt-1.5 ${tone || ''}`}>{v}</div>
      <div className="text-[12.5px] text-ls-ink-3 mt-1">{d}</div>
    </div>
  );
}
