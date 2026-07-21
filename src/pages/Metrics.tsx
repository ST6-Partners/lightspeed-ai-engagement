// ============================================================
// METRICS — manager insights dashboard (manager+ only).
// "This week" view scoped to the signed-in manager's direct reports:
// recap roll-up, concerns to look at, weekly priority completion, and wins.
// Data + access gate: metrics.weekly (requireManager). Read-only.
// ============================================================

import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Trophy, Users, Smile, ClipboardList, ShieldAlert, MessageCircle } from 'lucide-react';
import { trpc } from '../lib/trpc';

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="ls-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-ls-blue-50 text-ls-blue flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-ls-ink-3">{label}</div>
        <div className="text-2xl font-bold text-ls-ink leading-tight">{value}</div>
        {sub && <div className="text-xs text-ls-ink-3 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Metrics() {
  const { data, isLoading, error } = trpc.metrics.weekly.useQuery();
  const alertsQ = trpc.oneOnOne.talkingPointAlerts.useQuery();

  if (isLoading) {
    return <div className="text-sm text-ls-ink-3">Loading metrics…</div>;
  }

  if (error) {
    const forbidden = error.data?.code === 'FORBIDDEN';
    return (
      <div className="ls-card p-6 max-w-lg">
        <div className="flex items-center gap-2 text-ls-ink font-semibold">
          <ShieldAlert className="w-5 h-5 text-ls-watch" />
          {forbidden ? 'Manager access required' : 'Could not load metrics'}
        </div>
        <p className="text-sm text-ls-ink-3 mt-2">
          {forbidden
            ? 'The Metrics dashboard is available to managers only.'
            : error.message}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { recap, concerns, priorities, wins, weekStart } = data;
  const weekLabel = new Date(weekStart + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ls-ink">Metrics</h1>
        <p className="text-sm text-ls-ink-3">Insights for your team — week of {weekLabel}.</p>
      </div>

      {/* New talking points from your team (from the 1:1 hub under Reviews) */}
      {(alertsQ.data?.length ?? 0) > 0 && (
        <section className="ls-card overflow-hidden">
          <div className="px-5 py-3 border-b border-ls-line flex items-center gap-2">
            <MessageCircle className="w-[18px] h-[18px] text-ls-blue" />
            <h2 className="font-semibold text-ls-ink">New talking points from your team</h2>
            <span className="text-xs text-ls-ink-3">({alertsQ.data!.reduce((n, g) => n + g.count, 0)})</span>
          </div>
          <ul className="divide-y divide-ls-line">
            {alertsQ.data!.map((g) => (
              <li key={g.employeeId} className="px-5 py-3 bg-ls-blue-50/40">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ls-ink">{g.employeeName} <span className="text-xs font-normal text-ls-ink-3">· {g.count} new</span></span>
                  <Link to="/reviews" className="text-xs text-ls-blue hover:underline">Open 1:1 →</Link>
                </div>
                <ul className="mt-1 space-y-1">
                  {g.items.map((it) => (
                    <li key={it.id} className="text-sm text-ls-ink-2 flex items-start gap-2">
                      <MessageCircle className="w-3.5 h-3.5 text-ls-blue-deep mt-0.5 shrink-0" />
                      <span>{it.message.replace(/^.*?added a talking point: /, '')}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.teamSize === 0 ? (
        <div className="ls-card p-6 text-sm text-ls-ink-3">
          No direct reports are assigned to you yet. Once people report to you (set in Core Data → Employees),
          their weekly signals will show up here.
        </div>
      ) : (
        <>
          {/* Recap roll-up */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Checked in" value={`${recap.checkedIn}/${recap.teamSize}`} sub="submitted a weekly plan" />
            <StatCard icon={Smile} label="Avg mood" value={recap.avgMood != null ? `${recap.avgMood}/5` : '—'} sub="this week" />
            <StatCard icon={AlertTriangle} label="Open concerns" value={String(recap.openConcerns)} sub="people to check on" />
            <StatCard icon={ClipboardList} label="Priorities done" value={recap.completionPct != null ? `${recap.completionPct}%` : '—'} sub={`${recap.donePrio}/${recap.totalPrio} completed`} />
          </div>

          {/* Concerns */}
          <section className="ls-card overflow-hidden">
            <div className="px-5 py-3 border-b border-ls-line flex items-center gap-2">
              <AlertTriangle className="w-[18px] h-[18px] text-ls-watch" />
              <h2 className="font-semibold text-ls-ink">Concerns to look at</h2>
              <span className="text-xs text-ls-ink-3">({concerns.length})</span>
            </div>
            {concerns.length === 0 ? (
              <div className="px-5 py-4 text-sm text-ls-ink-3">No flags this week. 🎉</div>
            ) : (
              <ul className="divide-y divide-ls-line">
                {concerns.map((c) => (
                  <li key={c.userId} className="px-5 py-3 bg-ls-watch-bg/40">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ls-ink">{c.name}</span>
                      <Link to="/organization" className="text-xs text-ls-blue hover:underline">View person</Link>
                    </div>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {c.reasons.map((r, i) => (
                        <li key={i} className="text-xs px-2 py-0.5 rounded-full bg-white border border-ls-watch/40 text-ls-ink-2">{r}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Priority completion */}
          <section className="ls-card overflow-hidden">
            <div className="px-5 py-3 border-b border-ls-line flex items-center gap-2">
              <ClipboardList className="w-[18px] h-[18px] text-ls-blue" />
              <h2 className="font-semibold text-ls-ink">Weekly priorities</h2>
            </div>
            <ul className="divide-y divide-ls-line">
              {priorities.map((p) => {
                const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <li key={p.userId} className="px-5 py-3 flex items-center gap-4">
                    <span className="font-medium text-ls-ink w-44 shrink-0 truncate">{p.name}</span>
                    {!p.hasPlan ? (
                      <span className="text-xs text-ls-ink-3 italic">No weekly plan yet</span>
                    ) : p.total === 0 ? (
                      <span className="text-xs text-ls-ink-3">No priorities set</span>
                    ) : (
                      <>
                        <div className="flex-1 h-2 rounded-full bg-ls-bg-2 overflow-hidden">
                          <div className="h-full bg-ls-thrive" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-ls-ink-3 w-24 text-right shrink-0">{p.done}/{p.total} done ({pct}%)</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Wins */}
          <section className="ls-card overflow-hidden">
            <div className="px-5 py-3 border-b border-ls-line flex items-center gap-2">
              <Trophy className="w-[18px] h-[18px] text-ls-thrive" />
              <h2 className="font-semibold text-ls-ink">Wins &amp; noteworthy</h2>
              <span className="text-xs text-ls-ink-3">({wins.length})</span>
            </div>
            {wins.length === 0 ? (
              <div className="px-5 py-4 text-sm text-ls-ink-3">No wins logged yet this week.</div>
            ) : (
              <ul className="divide-y divide-ls-line">
                {wins.map((w) => (
                  <li key={w.userId} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-ls-thrive shrink-0" />
                      <span className="font-medium text-ls-ink">{w.name}</span>
                    </div>
                    <p className="text-sm text-ls-ink-2 mt-1 whitespace-pre-line">{w.wins}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
