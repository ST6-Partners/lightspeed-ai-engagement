// ReviewTab — executive summary of a review for the Org-screen person card.
// Reworked (2026-07-15, PM Brooke) from the Signal-replica rank/score/comp view
// into a compact recap of the five-part review: period + status, Values &
// Performance scores, the review summary, the coaching plan, and the PIP fork.
// Backed by reviewSession.cardSummary — a read-only assembly over the real
// review data (reviews/scores + coaching_plans + pips), NOT the standalone
// org-screen review_cycles snapshot. Period is chosen at the screen level
// (Organization.tsx selector) and passed in; compensation and the per-item
// breakdown live behind "View full review".
import { Link } from 'react-router-dom';
import { trpc } from '../../lib/trpc';
import { TabState, Empty, errKind } from './atoms';
import { bandFill, bandText } from './orgLib';

// 5-segment micro-bar for a 0..5 score, band-colored.
function ScoreBar({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <div className="flex gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ height: 5, flex: 1, borderRadius: 3, background: i < filled ? bandFill(score) : '#e2e8eb' }} />
      ))}
    </div>
  );
}

function ScoreStat({ label, score, pending }: { label: string; score: number | null; pending?: boolean }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 9px', background: '#f9fafb' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9ca3af' }}>{label}</div>
      {pending || score == null ? (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#b45309', margin: '3px 0 6px' }}>{pending ? 'In progress' : '—'}</div>
          <div className="flex gap-[3px]">{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ height: 5, flex: 1, borderRadius: 3, background: '#e2e8eb' }} />)}</div>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-[3px]" style={{ margin: '2px 0 6px' }}>
            <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: bandText(score) }}>{score.toFixed(1)}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#9ca3af' }}>/5</span>
          </div>
          <ScoreBar score={score} />
        </>
      )}
    </div>
  );
}

const STATUS_PILL: Record<string, { bg: string; fg: string }> = {
  Delivered: { bg: '#e6f4ef', fg: '#2e9e7b' },
  Closed: { bg: '#eef0f2', fg: '#51606a' },
  Scored: { bg: '#eaf4fa', fg: '#246f97' },
  Draft: { bg: '#fbf2dc', fg: '#a97a00' },
};

export default function ReviewTab({ employeeId, period }: { employeeId: string; period?: string | null }) {
  const { data, isLoading, error } = trpc.reviewSession.cardSummary.useQuery({ employeeId, periodLabel: period ?? null });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data || !data.hasData) return <Empty text={period ? `No review for ${period}` : 'No reviews on file'} />;

  const pill = STATUS_PILL[data.statusLabel] ?? STATUS_PILL.Draft;
  const isPip = data.track === 'pip' || !!data.pip;
  const perfPending = !data.performanceFinal && data.performance == null;
  const hasGoForward = !!data.summary || data.focusAreas.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Period + status */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{data.period ?? '—'}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: pill.bg, color: pill.fg }}>
          {data.statusLabel}
        </span>
      </div>

      {/* Values + Performance */}
      <div className="grid grid-cols-2 gap-2">
        <ScoreStat label="Values" score={data.values} />
        <ScoreStat label="Performance" score={data.performance} pending={perfPending} />
      </div>

      {/* Review summary / coaching plan, or the go-forward gate */}
      {hasGoForward ? (
        <>
          {data.summary && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 3 }}>Review summary</div>
              <div style={{ fontSize: 12, color: '#51606a', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {data.summary}
              </div>
            </div>
          )}
          {data.focusAreas.length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>Coaching plan</div>
              <div className="flex flex-wrap gap-[6px]">
                {data.focusAreas.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-[5px]"
                    style={{ fontSize: 11, fontWeight: 600, color: '#51606a', background: '#eaf4fa', border: '1px solid #d4e7f2', borderRadius: 20, padding: '3px 9px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2e89b8' }} />{f.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 12, textAlign: 'center', background: '#f9fafb' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#51606a' }}>Go-forward not drafted</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
            {data.performanceFinal ? 'Summary & coaching plan not created yet.' : 'Summary & coaching plan unlock once the performance pass is final.'}
          </div>
        </div>
      )}

      {/* PIP fork */}
      {isPip && (
        <div style={{ border: '1px solid #e7c3bf', background: '#f8eae8', borderRadius: 10, padding: '9px 10px' }}>
          <div className="flex items-center gap-[6px]" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: '#c2615a' }}>
            <span>⚠</span> On PIP track
          </div>
          <div style={{ fontSize: 11.5, color: '#8a4a44', marginTop: 3, lineHeight: 1.4 }}>
            {data.pip?.status ? `Status: ${data.pip.status.replace(/_/g, ' ')}.` : 'PIP addendum attached.'}
            {data.pip?.reviewBy ? ` Review by ${data.pip.reviewBy}.` : ''} Coaching plan above still applies.
          </div>
        </div>
      )}

      {/* Full review */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
        <Link to={data.planId ? `/coaching-plans/${data.planId}` : '/reviews'}
          style={{ fontSize: 12, fontWeight: 600, color: '#2e89b8', textDecoration: 'none' }}>
          View full review →
        </Link>
      </div>
    </div>
  );
}
