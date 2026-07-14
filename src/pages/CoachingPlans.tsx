// ============================================================
// COACHING PLANS — landing list + create-from-review (Engagement group)
//
// A coaching plan is crafted from one employee review (a value_evaluation).
// Create flow: pick an employee -> pick one of their reviews -> generate. The
// server drafts the narrative + strengths + 1-3 focus areas (AI, editable) and
// opens the plan detail. Manager role required to create.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { fmtDate } from '../lib/date';
import { HeartHandshake, Plus, Trash2, ChevronRight, Sparkles, CheckCircle2, Circle } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;

export default function CoachingPlans() {
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const canEdit = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.manager;

  const { data: rows, refetch, isLoading } = trpc.coaching.list.useQuery();
  const remove = trpc.coaching.remove.useMutation({ onSuccess: () => refetch() });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="ls-eyebrow mb-1">Engagement</div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeartHandshake size={22} className="text-emerald-600" /> Coaching Plans
          </h1>
          <p className="text-sm text-ls-ink-3 mt-1">Turn a review into a printable coaching plan — strengths and 1-3 growth areas to focus on.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0">
            <Plus size={16} /> New coaching plan
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : !rows || rows.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No coaching plans yet. Create one from an employee review to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Period</th>
                <th className="px-4 py-2.5 font-medium text-center">Focus areas</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/coaching-plans/${p.id}`)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.employeeName}
                    {p.aiGenerated && <Sparkles size={13} className="inline ml-1.5 text-violet-500 align-[-2px]" aria-label="AI-drafted" />}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.periodLabel || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p.focusCount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.createdAt as any)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/coaching-plans/${p.id}`); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
                      Open <ChevronRight size={13} />
                    </button>
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this coaching plan?')) remove.mutate({ id: p.id }); }}
                        className="ml-1 p-1 text-gray-300 hover:text-red-600 transition-colors align-middle" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={(id) => navigate(`/coaching-plans/${id}`)} />}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data: employees } = trpc.values.listEmployees.useQuery();
  const { data: periods } = trpc.values.listPeriods.useQuery();
  const [employeeId, setEmployeeId] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const ready = !!employeeId && !!periodLabel;
  const statusQ = trpc.reviewSession.status.useQuery({ employeeId, periodLabel }, { enabled: ready });
  const st = statusQ.data;
  const create = trpc.reviewSession.createFromSession.useMutation({
    onSuccess: (r) => onCreated(r.id),
    onError: (e) => alert(e.message),
  });

  const Check = ({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) => (
    <div className="flex items-center gap-2 text-sm py-0.5">
      {ok ? <CheckCircle2 size={15} className="text-green-600 shrink-0" /> : <Circle size={15} className="text-gray-300 shrink-0" />}
      <span className={ok ? 'text-gray-800' : 'text-gray-500'}>{label}</span>
      {hint && <span className="text-xs text-gray-400">— {hint}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Sparkles size={16} className="text-violet-500" /> New coaching plan</h3>
        <p className="text-xs text-gray-500 mb-4">The go-forward is built from the whole review — both the values and performance passes. Finish and mark the <b>performance</b> review final, then generate.</p>

        <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Employee</label>
        <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white mb-3"
          value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Select an employee…</option>
          {(employees ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.name ?? e.email}</option>)}
        </select>

        <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Review period</label>
        <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white mb-3"
          value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)}>
          <option value="">Select a period…</option>
          {(periods ?? []).map((p: any) => <option key={p.id} value={p.label}>{p.label}</option>)}
        </select>

        {ready && statusQ.isLoading && <div className="text-xs text-gray-400 mb-2">Checking the review…</div>}

        {ready && st && st.planId && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 mb-2 text-sm">
            A coaching plan already exists for this review.
            <button onClick={() => onCreated(st.planId!)} className="ml-1 font-medium text-blue-700 underline">Open it</button>.
          </div>
        )}

        {ready && st && !st.planId && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 mb-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">Rearview readiness</div>
            <Check ok={st.hasValues} label="Values review" hint={st.hasValues ? undefined : 'not started'} />
            <Check ok={st.performanceFinal} label="Performance review — final"
              hint={st.performanceFinal ? undefined : st.hasPerformance ? 'scored, not yet marked final' : 'not started'} />
            {!st.canDraft && (
              <p className="text-xs text-amber-600 mt-1.5">The performance review must be complete and marked <b>Final</b> under Reviews before the go-forward can be generated.</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={() => create.mutate({ employeeId, periodLabel })}
            disabled={!st?.canDraft || !!st?.planId || create.isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Sparkles size={14} /> {create.isLoading ? 'Drafting…' : 'Generate plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
