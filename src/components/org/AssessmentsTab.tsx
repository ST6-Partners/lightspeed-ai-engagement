// AssessmentsTab — CCAT + EPP + Insights (spec §8.1). Reuses the Badge/Bar
// atoms. CCAT is scored /50 (fill is scaled but the raw score is displayed,
// and CCAT bars are always neutral-blue — never color-toned on a 0-100 scale).
import { trpc } from '../../lib/trpc';
import { Badge, Bar, TabState, Empty, errKind } from './atoms';
import PersonaInsightChart from './PersonaInsightChart';

// Map an authoritative color code ('green'|'yellow'|'red'|'#hex'|null) to a hex.
function codeColor(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code.startsWith('#')) return code;
  const map: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', blue: '#378ADD' };
  return map[code] ?? null;
}

const CCAT_MAX = 50;

export default function AssessmentsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = trpc.orgScreen.assessmentsByUser.useQuery({ userId: employeeId });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data?.hasData || !data.ccat || !data.epp || !data.insights) return <Empty text="No assessment on file" />;

  const { ccat, epp, insights } = data;
  const overall = ccat.sections.find((s) => s.label.toLowerCase() === 'overall');
  const breakdown = ccat.sections.filter((s) => s.label.toLowerCase() !== 'overall');
  const divider: React.CSSProperties = { borderTop: '.5px solid #e5e7eb', paddingTop: 14, marginTop: 16 };

  return (
    <div>
      {/* 1) CCAT (badge = Overall; breakdown bars are neutral-blue; /50) */}
      {ccat.sections.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge value={overall?.score ?? '—'} color={codeColor(ccat.colorCode)} />
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>CCAT</div>
          </div>
          {breakdown.map((s, i) => (
            <Bar key={i} label={s.label}
              value={((s.score ?? 0) / CCAT_MAX) * 100}
              display={`${s.score ?? 0}/${CCAT_MAX}`} color="#378ADD" />
          ))}
        </div>
      )}

      {/* 2) EPP (badge = displayScore; priority-attribute bars use own color) */}
      <div style={divider}>
        <div className="flex items-center gap-3 mb-1">
          <Badge value={epp.displayScore ?? '—'} color={codeColor(epp.colorCode)} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>EPP</div>
            {epp.profileName && <div style={{ fontSize: 12, color: '#6b7280' }}>{epp.profileName}</div>}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 6px' }}>Priority attributes</div>
        {epp.priorityAttributes.map((a, i) => (
          <div key={i} title={`${a.name} · EPP ${a.eppScore ?? '—'} · ST6 ${a.st6Score ?? '—'} · ${a.weightage ?? 0}% · final ${a.finalScore ?? '—'}`}>
            <Bar label={a.name} value={a.st6Score ?? 0} color={a.colorHex ?? '#378ADD'} />
          </div>
        ))}
      </div>

      {/* 3) Insights (persona chart) */}
      {insights.profiles.length > 0 && (
        <div style={divider}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e', marginBottom: 10 }}>Insights</div>
          <PersonaInsightChart profiles={insights.profiles} />
        </div>
      )}
    </div>
  );
}
