// AssessmentsTab — SUMMARY card for a person's assessments (CCAT + EPP + Insights).
// This is a glanceable summary, NOT the full readout: CCAT badge + a compact
// chip row; EPP badge + top strengths and a couple of watch-outs (not all 12);
// Insights reduced to the single dominant colour. "View full profile" deep-links
// to Core Data → Assessments (the full, editable detail) with the person selected.
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../lib/trpc';
import { Badge, Bar, TabState, Empty, errKind } from './atoms';
import { INSIGHT_COLORS } from './orgLib';

function codeColor(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code.startsWith('#')) return code;
  const map: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', blue: '#378ADD' };
  return map[code] ?? null;
}

// Insights colour → human label (Insights Discovery energy names).
const INSIGHT_LABEL: Record<string, string> = {
  blue: 'Cool Blue', green: 'Earth Green', yellow: 'Sunshine Yellow', red: 'Fiery Red',
};

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

  // EPP: surface a few, not all — top strengths + a couple of watch-outs.
  const attrs = [...(epp.priorityAttributes as EppAttr[])].filter((a) => a.st6Score != null);
  const byScoreDesc = [...attrs].sort((a, b) => (b.st6Score ?? 0) - (a.st6Score ?? 0));
  const strengths = byScoreDesc.slice(0, 3);
  const strengthNames = new Set(strengths.map((a) => a.name));
  const watchOuts = [...attrs].sort((a, b) => (a.st6Score ?? 0) - (b.st6Score ?? 0))
    .filter((a) => !strengthNames.has(a.name)).slice(0, 2);

  // Insights: single dominant colour (isPrimary, else highest conscious).
  const profiles = insights.profiles as { color: string | null; consciousScore: number | null; isPrimary: boolean }[];
  const dominant = profiles.find((p) => p.isPrimary)
    ?? [...profiles].sort((a, b) => (b.consciousScore ?? 0) - (a.consciousScore ?? 0))[0];
  const domHex = dominant ? (INSIGHT_COLORS[dominant.color ?? ''] ?? '#94a3b8') : null;
  const domLabel = dominant ? (INSIGHT_LABEL[dominant.color ?? ''] ?? (dominant.color ?? 'Unknown')) : null;

  const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '3px 9px',
    background: '#f3f4f6', borderRadius: 999, fontSize: 12,
  };
  const microHdr: React.CSSProperties = { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.03em', margin: '10px 0 5px' };

  const attrBar = (a: EppAttr) => (
    <div key={a.name} title={`${a.name} · ${a.st6Score ?? '—'}`}>
      <Bar label={a.name} value={a.st6Score ?? 0} display={`${a.st6Score ?? 0}%`} color={a.colorHex ?? '#378ADD'} />
    </div>
  );

  return (
    <div>
      {/* 1) CCAT — badge (raw Overall) + compact chip row */}
      {ccat.sections.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge value={overall?.score ?? '—'} color={codeColor(ccat.colorCode)} />
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>CCAT</div>
          </div>
          {breakdown.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {breakdown.map((s, i) => (
                <span key={i} style={chip}>
                  <span style={{ color: '#6b7280' }}>{s.label}</span>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{s.score ?? '—'}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2) EPP — badge + profile + top strengths and watch-outs (not all 12) */}
      <div style={divider}>
        <div className="flex items-center gap-3 mb-1">
          <Badge value={epp.displayScore ?? '—'} color={codeColor(epp.colorCode)} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>EPP</div>
            {epp.profileName && <div style={{ fontSize: 12, color: '#6b7280' }}>{epp.profileName}</div>}
          </div>
        </div>
        {strengths.length > 0 && (
          <>
            <div style={microHdr}>Top strengths</div>
            {strengths.map(attrBar)}
          </>
        )}
        {watchOuts.length > 0 && (
          <>
            <div style={microHdr}>Watch-outs</div>
            {watchOuts.map(attrBar)}
          </>
        )}
      </div>

      {/* 3) Insights — dominant colour only */}
      {dominant && (
        <div style={divider}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e', marginBottom: 8 }}>Insights</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: domHex ?? '#94a3b8', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: '#1a1a2e' }}>{domLabel}</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>dominant</span>
          </div>
        </div>
      )}

      {/* View full profile → Core Data → Assessments, person preselected */}
      <div style={{ ...divider }}>
        <button
          onClick={() => navigate(`/core-data/assessments?userId=${employeeId}`)}
          style={{ fontSize: 13, fontWeight: 500, color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          View full profile →
        </button>
      </div>
    </div>
  );
}
