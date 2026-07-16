// AssessmentsTab — CCAT + EPP + Insights person card (spec §8.1 / reference mock).
// Full-detail format: CCAT badge + breakdown bars (0–100 percentiles, neutral
// blue; Overall is the raw /50 badge); EPP badge + profile + priority-attribute
// bars (capped to the top few so the card stays readable, not all 12); Insights
// three-panel persona chart. "View full profile" deep-links to the full,
// editable detail under Core Data → Assessments.
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../lib/trpc';
import { Badge, Bar, TabState, Empty, errKind } from './atoms';
import PersonaInsightChart from './PersonaInsightChart';

// How many EPP attributes to surface on the card (highest first). The full set
// is always available via "View full profile".
const EPP_PRIORITY_COUNT = 5;

function codeColor(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code.startsWith('#')) return code;
  const map: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', blue: '#378ADD' };
  return map[code] ?? null;
}

type EppAttr = { name: string; st6Score: number | null; eppScore: number | null; finalScore: number | null; weightage: number | null; colorHex: string | null };

export default function AssessmentsTab({ employeeId }: { employeeId: string }) {
  const navigate = useNavigate();
  const { data, isLoading, error } = trpc.orgScreen.assessmentsByUser.useQuery({ userId: employeeId });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data?.hasData || !data.ccat || !data.epp || !data.insights) return <Empty text="No assessment on file" />;

  const { ccat, epp, insights } = data;
  const overall = ccat.sections.find((s) => s.label.toLowerCase() === 'overall');
  const breakdown = ccat.sections.filter((s) => s.label.toLowerCase() !== 'overall');
  const divider: React.CSSProperties = { borderTop: '.5px solid #e5e7eb', paddingTop: 14, marginTop: 16 };

  // Priority attributes = the top few by Score (keeps the card readable).
  const allAttrs = epp.priorityAttributes as EppAttr[];
  const priority = [...allAttrs]
    .sort((a, b) => (b.st6Score ?? 0) - (a.st6Score ?? 0))
    .slice(0, EPP_PRIORITY_COUNT);
  const hiddenCount = Math.max(0, allAttrs.length - priority.length);

  return (
    <div>
      {/* 1) CCAT — badge (raw Overall) + breakdown bars (0–100 percentiles, blue) */}
      {ccat.sections.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge value={overall?.score ?? '—'} color={codeColor(ccat.colorCode)} />
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>CCAT</div>
          </div>
          {breakdown.map((s, i) => (
            <Bar key={i} label={s.label} value={s.score ?? 0} display={`${s.score ?? 0}`} color="#378ADD" />
          ))}
        </div>
      )}

      {/* 2) EPP — badge + profile + top priority attributes */}
      <div style={divider}>
        <div className="flex items-center gap-3 mb-1">
          <Badge value={epp.displayScore ?? '—'} color={codeColor(epp.colorCode)} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>EPP</div>
            {epp.profileName && <div style={{ fontSize: 12, color: '#6b7280' }}>{epp.profileName}</div>}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 6px' }}>Priority attributes</div>
        {priority.map((a, i) => (
          <div key={i} title={`${a.name} · ${a.st6Score ?? '—'}th percentile`}>
            <Bar label={a.name} value={a.st6Score ?? 0} display={`${a.st6Score ?? 0}`} color="#378ADD" />
          </div>
        ))}
      </div>

      {/* 3) Insights — three-panel persona chart */}
      {insights.profiles.length > 0 && (
        <div style={divider}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e', marginBottom: 10 }}>Insights</div>
          <PersonaInsightChart profiles={insights.profiles} />
        </div>
      )}

      {/* View full profile → Core Data → Assessments, person preselected */}
      <div style={divider}>
        <button
          onClick={() => navigate(`/core-data/assessments?userId=${employeeId}`)}
          style={{ fontSize: 13, fontWeight: 500, color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          View full profile{hiddenCount > 0 ? ` (+${hiddenCount} more EPP attributes)` : ''} →
        </button>
      </div>
    </div>
  );
}
