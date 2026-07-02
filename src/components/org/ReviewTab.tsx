// ReviewTab — two independently-gated zones (spec §8.2). The server returns
// access:{performance,compensation} and strips a zone the viewer can't see
// (403 only if both deny). Compensation dollar rows are DERIVED here from the
// stored comp inputs (spec §7.4 / §8.2), never stored.
import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { TabState, Empty, errKind } from './atoms';
import { bandFill, bandText } from './orgLib';

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const delta = (n: number) => `${n >= 0 ? '+' : '−'}$${Math.abs(Math.round(n)).toLocaleString()}`;
const pct = (frac: number) => `${(frac * 100).toFixed(1)}%`;
const GREEN = '#16a34a';

function StatCard({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? '#eef2ff' : '#f9fafb', border: `1px solid ${accent ? '#a5b4fc' : '#e5e7eb'}`,
      borderRadius: 8, padding: '8px 10px',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>{label}</div>
      {children}
    </div>
  );
}

function Collapsible({ title, avg, children }: { title: string; avg: number | null; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between" style={{ padding: '2px 0' }}>
        <span className="flex items-center gap-1">
          <span style={{ fontSize: 10, color: '#6b7280' }}>{open ? '▾' : '▸'}</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>{title}</span>
        </span>
        {avg != null && (
          <span className="flex items-baseline gap-1">
            <span style={{ fontSize: 9, color: '#9ca3af' }}>avg</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>{avg.toFixed(2)}</span>
          </span>
        )}
      </button>
      {open && <div style={{ marginTop: 6 }}>{children}</div>}
    </div>
  );
}

function ValueRow({ name, score }: { name: string; score: number }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{name}</span>
      <span style={{ width: 60, height: 6, background: '#f0f0f0', borderRadius: 3 }}>
        <span style={{ display: 'block', width: `${(score / 5) * 100}%`, height: 6, background: bandFill(score), borderRadius: 3 }} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: bandText(score), width: 24, textAlign: 'right' }}>{score.toFixed(1)}</span>
    </div>
  );
}

// Compensation card — derive dollar rows from stored comp inputs (spec §8.2).
function CompCard({ comp }: { comp: NonNullable<CycleT['comp']> }) {
  const startBase = comp.startBase ?? 0;
  const bonusPct = comp.startBonusPct ?? 0;
  const meritPct = comp.merit.basePct ?? 0;
  const startVar = startBase * bonusPct;
  const startOTE = startBase + startVar;
  const meritBase = startBase * meritPct;
  const meritVar = startVar * meritPct;
  const endBase = startBase + (comp.finalSalaryIncrease ?? 0);
  const endOTE = comp.finalNewOTE ?? startOTE;
  const endVar = endOTE - endBase;
  const promoBase = endBase - startBase - meritBase;
  const promoVar = endVar - startVar - meritVar;
  const promoTotal = endOTE - startOTE - (meritBase + meritVar);

  const cell: React.CSSProperties = { fontSize: 12, textAlign: 'right' };
  const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' };
  const grid = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr 1fr 1fr', gap: 6, alignItems: 'baseline', ...extra }}>{children}</div>
  );

  return (
    <div>
      <div style={{ ...lbl, marginBottom: 6 }}>Compensation</div>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        {grid(<>
          <span />
          <span style={{ ...lbl, textAlign: 'right' }}>Base</span>
          <span style={{ ...lbl, textAlign: 'right' }}>Variable</span>
          <span style={{ ...lbl, textAlign: 'right' }}>Total</span>
        </>)}
        {grid(<>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Starting</span>
          <span style={cell}>{money(startBase)}</span>
          <span style={cell}>{money(startVar)}<span style={{ fontSize: 9, color: '#9ca3af' }}> · {Math.round(bonusPct * 100)}% base</span></span>
          <span style={cell}>{money(startOTE)}</span>
        </>, { marginTop: 6 })}
        {grid(<>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Merit</span>
          <span style={cell}>{delta(meritBase)}<span style={{ fontSize: 9, color: GREEN }}> {pct(meritPct)}</span></span>
          <span style={cell}>{delta(meritVar)}</span>
          <span style={cell}>{delta(meritBase + meritVar)}</span>
        </>, { marginTop: 4 })}
        {comp.promotion && grid(<>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Promotion</span>
          <span style={cell}>{delta(promoBase)}</span>
          <span style={cell}>{delta(promoVar)}</span>
          <span style={cell}>{delta(promoTotal)}</span>
        </>, { marginTop: 4 })}
        {grid(<>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>Ending</span>
          <span style={{ ...cell, fontWeight: 700 }}>{money(endBase)}</span>
          <span style={{ ...cell, fontWeight: 700 }}>{money(endVar)}</span>
          <span style={{ ...cell, fontWeight: 700 }}>{money(endOTE)}</span>
        </>, { marginTop: 6, borderTop: '1px solid #d8dde3', paddingTop: 6 })}
        {grid(<>
          <span style={{ fontSize: 9, color: '#9ca3af' }}>% Change</span>
          <span style={{ fontSize: 9, color: GREEN, textAlign: 'right' }}>{startBase ? pct((endBase - startBase) / startBase) : '—'}</span>
          <span style={{ fontSize: 9, color: GREEN, textAlign: 'right' }}>{startVar ? pct((endVar - startVar) / startVar) : '—'}</span>
          <span style={{ fontSize: 9, color: GREEN, textAlign: 'right' }}>{startOTE ? pct((endOTE - startOTE) / startOTE) : '—'}</span>
        </>, { marginTop: 4 })}
      </div>
    </div>
  );
}

type ReviewT = { access: { performance: boolean; compensation: boolean }; cycles: CycleT[] };
type CycleT = {
  id: string;
  cycle: { label: string; status: string | null };
  scores: { total: number | null; values: number | null; performance: number | null } | null;
  placement: { rank: number | null; rankOf: number | null; tier: string | null } | null;
  valueDetails: { name: string; score: number | null }[];
  comp: {
    startBase: number | null; startBonusPct: number | null; merit: { basePct: number | null };
    promotion: boolean; finalSalaryIncrease: number | null; finalNewOTE: number | null;
  } | null;
};

export default function ReviewTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = trpc.orgScreen.performanceReviewByUser.useQuery({ userId: employeeId });
  const [idx, setIdx] = useState(0);
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  const review = data as ReviewT | undefined;
  if (!review || review.cycles.length === 0) return <Empty text="No reviews on file" />;

  const i = Math.min(idx, review.cycles.length - 1);
  const c = review.cycles[i];
  const inProgress = (c.cycle.status ?? '').toUpperCase() !== 'FINAL';

  return (
    <div>
      {/* 1) Cycle navigator */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button disabled={i === 0} onClick={() => setIdx(i - 1)}
          style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, opacity: i === 0 ? 0.35 : 1 }}>◀</button>
        <div className="text-center">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{c.cycle.label}</div>
          <div style={{ fontSize: 9, color: '#9ca3af' }}>{i + 1} of {review.cycles.length}{inProgress ? ' · in progress' : ''}</div>
        </div>
        <button disabled={i >= review.cycles.length - 1} onClick={() => setIdx(i + 1)}
          style={{ width: 24, height: 24, border: '1px solid #e5e7eb', borderRadius: 6, opacity: i >= review.cycles.length - 1 ? 0.35 : 1 }}>▶</button>
      </div>

      {/* 2) Performance zone */}
      {review.access.performance && c.scores && c.placement && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <StatCard label="Rank">
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>#{c.placement.rank ?? '—'}</div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>of {c.placement.rankOf ?? '—'}</div>
            </StatCard>
            <StatCard label="Tier">
              <div style={{ fontSize: 15, color: '#2563eb' }}>{c.placement.tier ?? '—'}</div>
            </StatCard>
            <StatCard label="Score" accent>
              <div style={{ fontSize: 17, color: '#4338ca', fontWeight: 700 }}>{c.scores.total != null ? c.scores.total.toFixed(1) : '—'}</div>
            </StatCard>
          </div>

          <Collapsible title="Values" avg={c.scores.values}>
            {c.valueDetails.length === 0
              ? <div style={{ fontSize: 12, color: '#9ca3af' }}>—</div>
              : c.valueDetails.map((v, k) => <ValueRow key={k} name={v.name} score={v.score ?? 0} />)}
          </Collapsible>

          <Collapsible title="Performance" avg={c.scores.performance}>
            <div className="flex justify-between mb-1"><span style={{ fontSize: 12, color: '#374151' }}>Outcomes</span><span style={{ fontSize: 12, color: '#9ca3af' }}>—</span></div>
            <div className="flex justify-between"><span style={{ fontSize: 12, color: '#374151' }}>PEQs</span><span style={{ fontSize: 12, color: '#9ca3af' }}>—</span></div>
          </Collapsible>
        </div>
      )}

      {/* 3) Compensation zone */}
      {review.access.compensation && c.comp && (
        <div style={{ marginTop: 14 }}>
          <CompCard comp={c.comp} />
        </div>
      )}
    </div>
  );
}
