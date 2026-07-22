// ============================================================
// OKR ANALYTICS — standalone period-end analytics page (AI Engagement)
//
// A SEPARATE section from the OKRs workspace (its own sidebar item + route).
// It reads OKR data via okrPeriods.scorecard and never mutates OKRs. Shows the
// period selector, company attainment, met/partial/missed distribution, an
// on-demand AI recap, and a per-team breakdown of exactly which objectives were
// met vs. missed.
// ============================================================
import { useEffect, useState } from 'react';
import { BarChart3, Sparkles, Trophy, AlertTriangle } from 'lucide-react';
import { trpc } from '../lib/trpc';

interface PeriodRow { id: string; label: string; isCurrent: boolean; status: string; }
interface ScItem { id: string; title: string; attainmentPct: number; status: 'met' | 'partial' | 'missed'; }
interface ScTeam { team: string; objectiveCount: number; completedCount: number; attainmentPct: number; missPct: number; items: ScItem[]; }
interface ScData {
  generatedAt: string; objectiveCount: number; completedCount: number; companyAttainmentPct: number;
  distribution: { met: number; partial: number; missed: number };
  teams: ScTeam[]; topTeam: ScTeam | null; bottomTeam: ScTeam | null;
  integrityFlags: { id: string; title: string; team: string }[]; hygieneFlags: { id: string; title: string }[]; narrative: string | null;
}

const STATUS_STYLE: Record<ScItem['status'], { label: string; color: string; bg: string }> = {
  met: { label: 'Met', color: '#2E9E7B', bg: '#E6F4EE' },
  partial: { label: 'Partial', color: '#C99300', bg: '#FBF2DC' },
  missed: { label: 'Missed', color: '#C2615A', bg: '#FBEAE8' },
};

function StatusBadge({ status }: { status: ScItem['status'] }) {
  const s = STATUS_STYLE[status];
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

export default function OkrAnalytics() {
  const periodsQ = trpc.okrPeriods.list.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const canGenerate = ['admin', 'sysadmin'].includes((me as { role?: string } | undefined)?.role ?? 'user');
  const periods = (periodsQ.data ?? []) as PeriodRow[];
  const currentPeriod = periods.find((p) => p.isCurrent) ?? null;
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedPeriodId && periods.length) setSelectedPeriodId(currentPeriod?.id ?? periods[0].id);
  }, [selectedPeriodId, periods, currentPeriod]);
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) ?? null;

  const scQ = trpc.okrPeriods.scorecard.useQuery(
    { periodId: selectedPeriodId ?? '' },
    { enabled: !!selectedPeriodId },
  );
  const gen = trpc.okrPeriods.generateSummary.useMutation({ onSuccess: () => scQ.refetch() });
  const sc = scQ.data as ScData | undefined;

  const distChip = (n: number, label: string, color: string, bg: string) => (
    <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: bg, color }}>{n} {label}</span>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">OKR Analytics</h1>
      <p className="text-sm text-ls-ink-3 mb-5">Period-end results and team performance. A separate view from the OKRs workspace — it reads OKR data and never changes it.</p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <label className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Period</label>
        <select className="px-3 py-2 border border-ls-line rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ls-blue"
          value={selectedPeriodId ?? ''} onChange={(e) => setSelectedPeriodId(e.target.value)}>
          {periods.length === 0 && <option value="">No periods yet</option>}
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.label}{p.isCurrent ? '  • current' : p.status === 'closed' ? '  • closed' : ''}</option>
          ))}
        </select>
      </div>

      {scQ.isLoading && <div className="ls-card p-5 text-sm text-ls-ink-3">Loading analytics…</div>}
      {!scQ.isLoading && (!sc || sc.objectiveCount === 0) && (
        <div className="ls-card p-8 text-center text-sm text-ls-ink-3">No objectives in {selectedPeriod?.label ?? 'this period'} yet — analytics fill in once goals are set.</div>
      )}

      {sc && sc.objectiveCount > 0 && (
        <>
          {/* Metric cards */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="rounded-ls p-4 bg-ls-bg-2">
              <div className="text-[13px] text-ls-ink-3">Company attainment</div>
              <div className="text-3xl font-bold text-ls-blue-deep tabular-nums leading-tight">{sc.companyAttainmentPct}%</div>
            </div>
            <div className="rounded-ls p-4 bg-ls-bg-2">
              <div className="text-[13px] text-ls-ink-3">Objectives met</div>
              <div className="text-3xl font-bold tabular-nums leading-tight">{sc.completedCount}<span className="text-lg text-ls-ink-3 font-normal"> / {sc.objectiveCount}</span></div>
            </div>
            <div className="rounded-ls p-4 bg-ls-bg-2">
              <div className="text-[13px] text-ls-ink-3 mb-2">Distribution</div>
              <div className="flex gap-1.5 flex-wrap">
                {distChip(sc.distribution.met, 'met', '#2E9E7B', '#E6F4EE')}
                {distChip(sc.distribution.partial, 'partial', '#C99300', '#FBF2DC')}
                {distChip(sc.distribution.missed, 'missed', '#C2615A', '#FBEAE8')}
              </div>
            </div>
          </div>

          {/* AI summary */}
          <div className="ls-card p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ls-blue flex items-center gap-1.5"><Sparkles size={14} /> AI period summary</span>
              {canGenerate && (
                <button onClick={() => gen.mutate({ periodId: selectedPeriodId! })} disabled={gen.isPending}
                  className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-blue-deep">
                  {gen.isPending ? 'Generating…' : sc.narrative ? 'Regenerate' : 'Generate summary'}</button>
              )}
            </div>
            <div className="text-sm leading-relaxed text-ls-ink-2 whitespace-pre-line">
              {sc.narrative || (canGenerate ? 'No summary yet — generate a plain-English recap and a recommended focus for next period.' : 'No summary generated yet.')}
            </div>
          </div>

          {/* Team leaderboard + detailed met/missed breakdown */}
          <div className="ls-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-ls-blue-deep" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Goals met vs. missed, by team</span>
            </div>
            {(sc.topTeam || sc.bottomTeam) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {sc.topTeam && <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#E6F4EE', color: '#2E9E7B' }}>Top: {sc.topTeam.team} ({sc.topTeam.attainmentPct}%)</span>}
                {sc.bottomTeam && <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FBF2DC', color: '#C99300' }}>Most room to grow: {sc.bottomTeam.team} ({sc.bottomTeam.attainmentPct}%, missed by {sc.bottomTeam.missPct}%)</span>}
              </div>
            )}
            <div className="space-y-3">
              {sc.teams.map((t) => (
                <div key={t.team} className="border border-ls-line rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-ls-bg-2">
                    <span className="flex-1 font-semibold text-sm truncate">{t.team}</span>
                    <div className="w-28 h-2 rounded-full bg-white overflow-hidden shrink-0"><div className="h-2 rounded-full" style={{ width: `${t.attainmentPct}%`, background: '#2E9E7B' }} /></div>
                    <span className="text-[12px] text-ls-ink-2 tabular-nums w-11 text-right shrink-0">{t.attainmentPct}%</span>
                    <span className="text-[12px] text-ls-ink-3 w-16 text-right shrink-0">{t.completedCount}/{t.objectiveCount} met</span>
                  </div>
                  <div className="px-3 py-1">
                    {t.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2.5 py-2 border-b border-ls-line last:border-0">
                        <span className="flex-1 min-w-0 text-[13px] text-ls-ink truncate">{it.title}</span>
                        <span className="text-[12px] text-ls-ink-3 tabular-nums shrink-0">{it.attainmentPct}%</span>
                        <StatusBadge status={it.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(sc.integrityFlags.length > 0 || sc.hygieneFlags.length > 0) && (
            <div className="ls-card p-4 mt-4 border-ls-watch" style={{ background: '#FBF2DC' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ls-watch mb-1.5"><AlertTriangle size={14} /> Worth a look</div>
              {sc.integrityFlags.length > 0 && (
                <div className="text-[12.5px] text-ls-ink-2 mb-1">{sc.integrityFlags.length} objective(s) marked complete with key results still open: {sc.integrityFlags.map((f) => f.title).join(', ')}.</div>
              )}
              {sc.hygieneFlags.length > 0 && (
                <div className="text-[12.5px] text-ls-ink-2">{sc.hygieneFlags.length} objective(s) with no owner or team: {sc.hygieneFlags.map((f) => f.title).join(', ')}.</div>
              )}
            </div>
          )}

          <p className="text-[11px] text-ls-ink-3 mt-3 flex items-center gap-1.5"><BarChart3 size={12} /> Attainment is the weighted rollup of each objective's key results and tasks.</p>
        </>
      )}
    </div>
  );
}
