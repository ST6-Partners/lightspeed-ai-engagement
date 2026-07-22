// ============================================================
// OKR ANALYTICS — standalone period-end analytics page (AI Engagement)
//
// A SEPARATE section from the OKRs workspace (its own sidebar item + route).
// It reads OKR data via okrPeriods.scorecard and NEVER mutates OKRs. Three tabs:
//   • Plan      — every objective with its key results & tasks, showing exactly
//                 which specific results/tasks were met vs. not (and why).
//   • By team   — team attainment leaderboard.
//   • Scorecard — company attainment, met/partial/missed distribution, an
//                 on-demand AI recap, team leaderboard, and integrity/hygiene flags.
// The period is chosen by leadership (ELT) via the selector + Manage periods.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Sparkles, Trophy, AlertTriangle, Settings2, ListTree, Users2, ClipboardList } from 'lucide-react';
import { trpc } from '../lib/trpc';
import PeriodManager, { type PeriodRow } from '../components/okr/PeriodManager';

type Status = 'met' | 'partial' | 'missed';
interface PlanNode {
  id: string; title: string; type: string; rawStatus: string; statusLabel: string;
  attainmentPct: number; weightPct: number; children: PlanNode[];
}
interface PlanObjective {
  id: string; title: string; owner: string | null; team: string; attainmentPct: number;
  status: Status; markedComplete: boolean; hasOpenChildren: boolean; noOwnerOrTeam: boolean;
  weightPct: number; children: PlanNode[];
}
interface ScItem { id: string; title: string; attainmentPct: number; status: Status; }
interface ScTeam { team: string; objectiveCount: number; completedCount: number; attainmentPct: number; missPct: number; items: ScItem[]; }
interface ScData {
  generatedAt: string; objectiveCount: number; completedCount: number; companyAttainmentPct: number;
  distribution: { met: number; partial: number; missed: number };
  teams: ScTeam[]; topTeam: ScTeam | null; bottomTeam: ScTeam | null;
  integrityFlags: { id: string; title: string; team: string }[];
  hygieneFlags: { id: string; title: string }[];
  plan?: PlanObjective[]; narrative: string | null;
}

const STATUS_STYLE: Record<Status, { label: string; color: string; bg: string }> = {
  met: { label: 'Met', color: '#2E9E7B', bg: '#E6F4EE' },
  partial: { label: 'Partial', color: '#C99300', bg: '#FBF2DC' },
  missed: { label: 'Missed', color: '#C2615A', bg: '#FBEAE8' },
};
const GRAY = '#B6BEC9';
// Colour a leaf's status word so incomplete work reads at a glance ("the why").
const childColor = (raw: string) =>
  raw === 'complete' ? '#2E9E7B' : raw === 'in_progress' ? '#C99300' : raw === 'on_hold' ? '#8A94A6' : '#C2615A';

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}
function Bar({ pct, color = '#2E9E7B' }: { pct: number; color?: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 rounded-full bg-ls-bg-2 overflow-hidden w-full">
      <div className="h-2 rounded-full" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// One key-result / task line inside the Plan tree (recurses into sub-tasks).
function PlanLeaf({ node, depth }: { node: PlanNode; depth: number }) {
  return (
    <>
      <div className="flex items-center gap-2.5 py-2 border-b border-ls-line last:border-0" style={{ paddingLeft: depth * 18 }}>
        <span className="text-ls-ink-3 shrink-0" aria-hidden>↳</span>
        <span className="flex-1 min-w-0 text-[13px] text-ls-ink truncate">{node.title}</span>
        <span className="text-[12px] tabular-nums shrink-0">
          <span style={{ color: childColor(node.rawStatus) }} className="font-medium">{node.statusLabel.toLowerCase()}</span>
          <span className="text-ls-ink-3"> · {node.weightPct}%</span>
        </span>
      </div>
      {node.children.map((c) => <PlanLeaf key={c.id} node={c} depth={depth + 1} />)}
    </>
  );
}

// One objective block in the Plan tab.
function PlanObjectiveCard({ o }: { o: PlanObjective }) {
  const dot = o.noOwnerOrTeam ? GRAY : STATUS_STYLE[o.status].color;
  const ownerTeam = [o.owner, o.team].filter(Boolean).join(' · ') || 'Unassigned';
  return (
    <div className="border border-ls-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ls-ink truncate">{o.title}</div>
          <div className="text-[12px] text-ls-ink-3 truncate">{ownerTeam}</div>
        </div>
        <div className="w-36 shrink-0 hidden sm:block"><Bar pct={o.attainmentPct} /></div>
        <span className="text-[13px] font-semibold tabular-nums w-12 text-right shrink-0">{o.attainmentPct}%</span>
      </div>
      {(o.children.length > 0 || o.markedComplete) && (
        <div className="px-3.5 pb-1 bg-ls-bg-2/40">
          {o.children.map((c) => <PlanLeaf key={c.id} node={c} depth={0} />)}
          {o.markedComplete && o.hasOpenChildren && (
            <div className="py-2 text-[12px] flex items-center gap-1.5" style={{ color: '#C99300' }}>
              <AlertTriangle size={12} /> Marked complete while key results are still open.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OkrAnalytics() {
  const periodsQ = trpc.okrPeriods.list.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const role = (me as { role?: string } | undefined)?.role ?? 'user';
  const canGenerate = ['admin', 'sysadmin'].includes(role);
  const canManagePeriods = ['admin', 'sysadmin'].includes(role);
  const periods = (periodsQ.data ?? []) as PeriodRow[];
  const currentPeriod = periods.find((p) => p.isCurrent) ?? null;
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [tab, setTab] = useState<'plan' | 'team' | 'scorecard'>('plan');
  const [showPeriodMgr, setShowPeriodMgr] = useState(false);
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
  const plan = useMemo(() => sc?.plan ?? [], [sc]);

  const distChip = (n: number, label: string, color: string, bg: string) => (
    <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: bg, color }}>{n} {label}</span>
  );

  const TABS: { id: typeof tab; label: string; icon: typeof ListTree }[] = [
    { id: 'plan', label: 'Plan', icon: ListTree },
    { id: 'team', label: 'By team', icon: Users2 },
    { id: 'scorecard', label: 'Scorecard', icon: ClipboardList },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">OKR Analytics</h1>
      <p className="text-sm text-ls-ink-3 mb-5">What the company actually accomplished in a goal-setting period. A separate view from the OKRs workspace — it reads OKR data and never changes it.</p>

      {/* Period selector + manage */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Period</label>
        <select className="px-3 py-2 border border-ls-line rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ls-blue"
          value={selectedPeriodId ?? ''} onChange={(e) => setSelectedPeriodId(e.target.value)}>
          {periods.length === 0 && <option value="">No periods yet</option>}
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.label}{p.isCurrent ? '  • current' : p.status === 'closed' ? '  • closed' : ''}</option>
          ))}
        </select>
        {selectedPeriod?.status === 'closed' && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: '#EEE', color: '#666' }}>closed — results frozen</span>
        )}
        {canManagePeriods && (
          <button onClick={() => setShowPeriodMgr(true)} className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 ml-auto">
            <Settings2 size={13} /> Manage periods</button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 p-1 rounded-lg bg-ls-bg-2 mb-5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-1.5 rounded-md transition-colors ${active ? 'bg-white shadow-sm text-ls-blue-deep' : 'text-ls-ink-3 hover:text-ls-ink'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {scQ.isLoading && <div className="ls-card p-5 text-sm text-ls-ink-3">Loading analytics…</div>}
      {!scQ.isLoading && (!sc || sc.objectiveCount === 0) && (
        <div className="ls-card p-8 text-center text-sm text-ls-ink-3">No objectives in {selectedPeriod?.label ?? 'this period'} yet — analytics fill in once goals are set.</div>
      )}

      {sc && sc.objectiveCount > 0 && (
        <>
          {/* ─────────── PLAN ─────────── */}
          {tab === 'plan' && (
            <div className="ls-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <ListTree size={16} className="text-ls-blue-deep" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Every objective — what was met, and what wasn't</span>
              </div>
              <p className="text-[12px] text-ls-ink-3 mb-4">Each objective's attainment is the weighted rollup of its key results and tasks. Expand a line to see exactly which pieces landed.</p>
              <div className="space-y-3">
                {plan.map((o) => <PlanObjectiveCard key={o.id} o={o} />)}
              </div>
            </div>
          )}

          {/* ─────────── BY TEAM ─────────── */}
          {tab === 'team' && (
            <div className="ls-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users2 size={16} className="text-ls-blue-deep" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Attainment by team</span>
              </div>
              <div className="space-y-3">
                {sc.teams.map((t) => (
                  <div key={t.team} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 font-semibold text-sm text-ls-ink truncate">{t.team}</span>
                    <div className="flex-1"><Bar pct={t.attainmentPct} /></div>
                    <span className="text-[13px] font-semibold tabular-nums w-14 text-right shrink-0">{t.attainmentPct}%</span>
                    <span className="text-[12px] text-ls-ink-3 w-20 text-right shrink-0">{t.objectiveCount ? `${t.completedCount}/${t.objectiveCount} met` : 'no objectives'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────── SCORECARD ─────────── */}
          {tab === 'scorecard' && (
            <>
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

              <div className="ls-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-ls-blue-deep" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Team leaderboard — goals met vs. missed</span>
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
                        <div className="w-28 shrink-0"><Bar pct={t.attainmentPct} /></div>
                        <span className="text-[12px] text-ls-ink-2 tabular-nums w-11 text-right shrink-0">{t.attainmentPct}%</span>
                        <span className="text-[12px] text-ls-ink-3 w-20 text-right shrink-0">{t.objectiveCount ? `${t.completedCount}/${t.objectiveCount} met` : 'no objectives'}</span>
                      </div>
                      <div className="px-3 py-1">
                        {t.items.length === 0 && (
                          <div className="py-2 text-[12px] text-ls-ink-3">No objectives set for this team in this period.</div>
                        )}
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
            </>
          )}

          <p className="text-[11px] text-ls-ink-3 mt-3 flex items-center gap-1.5"><BarChart3 size={12} /> Attainment is the weighted rollup of each objective's key results and tasks. Read-only — this view never changes OKRs.</p>
        </>
      )}

      {showPeriodMgr && (
        <PeriodManager
          periods={periods}
          onClose={() => setShowPeriodMgr(false)}
          onChange={() => { periodsQ.refetch(); scQ.refetch(); }}
          onSelect={(id) => setSelectedPeriodId(id)}
        />
      )}
    </div>
  );
}
