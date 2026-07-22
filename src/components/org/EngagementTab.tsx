import { trpc } from '../../lib/trpc';
import { Badge, Bar, TabState, Empty, errKind } from './atoms';
import { DRIVER_LABEL, type DriverKey } from '../../lib/engagementSurvey';

// Favorability / thriving band colors (0..100 scale).
function bandColor(v: number | null | undefined) {
  if (v == null) return null;
  if (v >= 67) return '#639922';
  if (v >= 34) return '#BA7517';
  return '#E24B4A';
}

type Driver = { key: string; favorablePct: number };

function Delta({ v }: { v: number | null | undefined }) {
  if (v == null) return null;
  const up = v >= 0;
  return (
    <span className="text-[11.5px] font-medium" style={{ color: up ? '#639922' : '#E24B4A' }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{v} vs prior
    </span>
  );
}
function Scope({ text }: { text: string }) {
  return <div className="text-[10.5px] uppercase tracking-wide mb-2.5" style={{ color: '#9ca3af' }}>{text}</div>;
}
function Group({ text }: { text: string }) {
  return <div className="text-[10.5px] mt-1.5 mb-1" style={{ color: '#9ca3af' }}>{text}</div>;
}
function DriverBars({ items, color }: { items: Driver[]; color: string }) {
  return <>{items.map((d) => <Bar key={d.key} label={DRIVER_LABEL[d.key as DriverKey] ?? d.key} value={d.favorablePct} color={color} />)}</>;
}

function TeamView({ d }: { d: any }) {
  if (!d) return <Empty text="No department set for this person" />;
  if (d.suppressed) {
    return (
      <div>
        <Scope text={`${d.name} · ${d.headcount} people`} />
        <Empty text="Not enough responses to show results without identifying individuals (needs at least 4)." />
      </div>
    );
  }
  if (d.noData) {
    return (
      <div>
        <Scope text={`${d.name} · ${d.headcount} people`} />
        <Empty text="No survey results for this period." />
      </div>
    );
  }
  const meta = [
    d.participationPct != null ? `${Math.round(d.participationPct)}% responded` : `${d.responseCount} responses`,
    d.vsCompany != null ? `${d.vsCompany >= 0 ? '+' : ''}${d.vsCompany} vs company` : null,
  ].filter(Boolean).join(' · ');
  return (
    <div>
      <Scope text={`${d.name} · ${d.headcount} people`} />
      <div className="flex items-center gap-3 mb-3">
        <Badge value={d.favorablePct != null ? Math.round(d.favorablePct) : '—'} color={bandColor(d.favorablePct)} />
        <div>
          <div className="text-[11.5px]" style={{ color: '#6b7280' }}>Team engagement (favorable)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold" style={{ color: '#1a1a2e' }}>{d.favorablePct != null ? `${Math.round(d.favorablePct)}%` : '—'}</span>
            <Delta v={d.delta} />
          </div>
          <div className="text-[11px]" style={{ color: '#9ca3af' }}>{meta}</div>
        </div>
      </div>
      {d.strongest?.length > 0 && <><Group text="Strongest" /><DriverBars items={d.strongest} color="#639922" /></>}
      {d.needsAttention?.length > 0 && <><Group text="Needs attention" /><DriverBars items={d.needsAttention} color="#BA7517" /></>}
    </div>
  );
}

// Engagement is an anonymous, confidential survey. Individual per-person
// results are intentionally NOT surfaced here — only team-level aggregates
// (suppressed below the 4-response threshold). The former Team/Person toggle
// and PersonView were removed 2026-07-22 (Brooke) for confidentiality.
export default function EngagementTab({ employeeId, periodId }: { employeeId: string; periodId?: string }) {
  const { data, isLoading, error } = trpc.engagementAnalytics.personCard.useQuery({ userId: employeeId, periodId });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data?.hasData) return <Empty text="No engagement survey data yet" />;

  return (
    <div>
      <TeamView d={data.department} />
    </div>
  );
}
