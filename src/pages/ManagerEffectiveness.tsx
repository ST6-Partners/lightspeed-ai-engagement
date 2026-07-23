// ============================================================
// MANAGER EFFECTIVENESS — insights dashboard (manager+ only).
// Read-only roll-up built from two existing sources:
//   • Manager reviews (upward surveys) → average effectiveness score + per-
//     question breakdown, per manager.
//   • Check-ins tagged 'manager_support' → manager-support average, rolled up
//     to each respondent's manager.
// Admins / HR see all managers; a plain manager sees only their own scores.
// Data + gate: managerEffectiveness.overview (requireManager).
// ============================================================

import { UserCheck, Users, Gauge, Star, MessageCircle, ShieldAlert } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList,
} from 'recharts';
import { trpc } from '../lib/trpc';

// 1..5 → color band (hex for charts).
const bandHex = (n: number | null) =>
  n == null ? '#9ca3af' : n >= 4 ? '#16a34a' : n >= 3 ? '#2563eb' : n >= 2 ? '#d97706' : '#dc2626';
// 1..5 → tailwind text color.
const bandText = (n: number | null) =>
  n == null ? 'text-ls-ink-3' : n >= 4 ? 'text-green-600' : n >= 3 ? 'text-blue-600' : n >= 2 ? 'text-amber-600' : 'text-red-600';

const fmt = (n: number | null) => (n == null ? '—' : n.toFixed(1));

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

export default function ManagerEffectiveness() {
  const { data, isLoading, error } = trpc.managerEffectiveness.overview.useQuery();

  if (isLoading) return <div className="text-sm text-ls-ink-3">Loading manager effectiveness…</div>;

  if (error) {
    const forbidden = error.data?.code === 'FORBIDDEN';
    return (
      <div className="ls-card p-6 max-w-lg">
        <div className="flex items-center gap-2 text-ls-ink font-semibold">
          <ShieldAlert className="w-5 h-5 text-ls-watch" />
          {forbidden ? 'Manager access required' : 'Could not load manager effectiveness'}
        </div>
        <p className="text-sm text-ls-ink-3 mt-2">
          {forbidden ? 'This dashboard is available to managers only.' : error.message}
        </p>
      </div>
    );
  }

  if (!data) return null;
  const { scope, summary, managers } = data;

  const hasAnyData = summary.totalReviews > 0 || summary.managerSupportResponses > 0;
  const single = scope === 'self' || managers.length === 1;
  const soleManager = managers[0];

  // Chart data: across managers (avg score) or, for a single manager, per question.
  const acrossData = managers
    .filter((m) => m.avgScore != null)
    .map((m) => ({ name: m.name, score: m.avgScore as number }));
  const perQuestionData = single && soleManager
    ? soleManager.perQuestion.map((q) => ({ name: q.text, score: q.avg }))
    : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="ls-eyebrow mb-1">Insights</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <UserCheck size={22} className="text-ls-blue" /> Manager Effectiveness
      </h1>
      <p className="text-sm text-ls-ink-3 mb-5">
        {scope === 'all'
          ? 'Effectiveness across all managers, from upward reviews and manager-support check-ins.'
          : 'Your effectiveness, from your team’s upward reviews and manager-support check-ins.'}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {scope === 'all' && (
          <StatCard icon={Users} label="Managers" value={String(summary.managerCount)} />
        )}
        <StatCard icon={Gauge} label="Avg effectiveness" value={`${fmt(summary.overallAvgScore)} / 5`}
          sub={summary.overallAvgScore == null ? 'No reviews yet' : undefined} />
        <StatCard icon={Star} label="Reviews counted" value={String(summary.totalReviews)} />
        <StatCard icon={MessageCircle} label="Manager support" value={`${fmt(summary.avgManagerSupport)} / 5`}
          sub={`${summary.managerSupportResponses} check-in answer${summary.managerSupportResponses === 1 ? '' : 's'}`} />
      </div>

      {!hasAnyData ? (
        <div className="ls-card p-8 text-center">
          <div className="text-ls-ink font-semibold">No data yet</div>
          <p className="text-sm text-ls-ink-3 mt-1">
            Once managers receive upward reviews or teams answer manager-support check-in questions, their scores appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Chart */}
          {(single ? perQuestionData.length > 0 : acrossData.length > 0) && (
            <div className="ls-card p-4 mb-6">
              <div className="text-sm font-semibold text-ls-ink mb-3">
                {single ? 'Score by question' : 'Average effectiveness by manager'}
              </div>
              <ResponsiveContainer width="100%" height={Math.max(220, (single ? perQuestionData : acrossData).length * 42)}>
                <BarChart
                  layout="vertical"
                  data={single ? perQuestionData : acrossData}
                  margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef1f4" />
                  <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={single ? 260 : 160} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} / 5`, 'Score']} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={18}>
                    {(single ? perQuestionData : acrossData).map((d, i) => (
                      <Cell key={i} fill={bandHex(d.score)} />
                    ))}
                    <LabelList dataKey="score" position="right" formatter={(v: number) => v.toFixed(1)} style={{ fontSize: 12, fill: '#4b5563' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-manager table */}
          <div className="ls-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ls-ink-3 border-b border-ls-line">
                  <th className="px-4 py-2.5 font-semibold">Manager</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Effectiveness</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Reviews</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Manager support</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr key={m.managerId} className="border-b border-ls-line last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ls-ink">{m.name}</td>
                    <td className={`px-4 py-2.5 text-center font-bold ${bandText(m.avgScore)}`}>
                      {fmt(m.avgScore)}{m.avgScore != null && <span className="text-ls-ink-3 font-normal"> / 5</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-ls-ink-2">{m.reviewCount}</td>
                    <td className={`px-4 py-2.5 text-center font-semibold ${bandText(m.managerSupportAvg)}`}>
                      {fmt(m.managerSupportAvg)}
                      {m.managerSupportCount > 0 && <span className="text-ls-ink-3 font-normal text-xs"> ({m.managerSupportCount})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-question breakdown for a single manager (when not already the chart) */}
          {single && soleManager && soleManager.perQuestion.length > 0 && perQuestionData.length === 0 && (
            <div className="ls-card p-4 mt-6">
              <div className="text-sm font-semibold text-ls-ink mb-3">Score by question</div>
              <ul className="space-y-1.5">
                {soleManager.perQuestion.map((q) => (
                  <li key={q.questionId} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-ls-ink-2">{q.text}</span>
                    <span className={`font-bold ${bandText(q.avg)}`}>{q.avg.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
