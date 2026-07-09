import { fmtDate, fmtDateTime } from '../lib/date';
// ============================================================
// REVIEWS — Employee performance evaluation (Engagement group)
//
// Flow: pick a REVIEW PERIOD, then an EMPLOYEE, then "New review". The
// evaluation form scores the employee 1-5 against each active company value
// (framework managed in Core Data > Company Values), with per-value + overall
// notes, saved as a dated evaluation. The period is chosen up front and shown
// READ-ONLY on the form. Periods come from the managed review_periods lookup
// (dropdown + "+" modal) so names stay consistent. History is listed per
// employee. Standalone build (2026-07-08); the Organization screen's separate
// Review tab is intentionally untouched.
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { Star, Plus, Trash2, ArrowLeft } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;
const band = (n: number | null) =>
  n == null ? 'text-gray-400' : n >= 4 ? 'text-green-600' : n >= 3 ? 'text-blue-600' : n >= 2 ? 'text-amber-600' : 'text-red-600';

export default function Reviews() {
  const { data: me } = trpc.auth.me.useQuery();
  const canEdit = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.manager;

  const { data: employees } = trpc.values.listEmployees.useQuery();
  const { data: values } = trpc.values.list.useQuery();
  const periodsQuery = trpc.values.listPeriods.useQuery();

  const [periodLabel, setPeriodLabel] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newPeriod, setNewPeriod] = useState('');

  const createPeriod = trpc.values.createPeriod.useMutation({
    onSuccess: (pd) => { periodsQuery.refetch(); setPeriodLabel(pd.label); setShowPeriodModal(false); setNewPeriod(''); },
    onError: (e) => alert(e.message),
  });

  const evalsQuery = trpc.values.listEvaluations.useQuery({ employeeId }, { enabled: !!employeeId });
  const employee = (employees ?? []).find((e: any) => e.id === employeeId);
  const periodOptions = useMemo(() => (periodsQuery.data ?? []).map((p: any) => p.label), [periodsQuery.data]);
  const pillars = useMemo(() => Array.from(new Set((values ?? []).map((v: any) => v.pillar))), [values]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Star size={22} className="text-amber-500" /> Reviews</h1>
      <p className="text-sm text-ls-ink-3 mb-5">Choose a review period and an employee, then score them against the company values.</p>

      {/* Period + employee pickers (hidden while editing a review) */}
      {mode === 'list' && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
          <div className="w-56">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Review period</label>
            <div className="flex gap-2">
              <select className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)}>
                <option value="">Select a period…</option>
                {periodOptions.map((label: string) => <option key={label} value={label}>{label}</option>)}
              </select>
              {canEdit && (
                <button type="button" onClick={() => { setNewPeriod(''); setShowPeriodModal(true); }} title="Add a review period"
                  className="px-3 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 shrink-0">
                  <Plus size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Employee</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setEditingId(null); }}>
              <option value="">Select an employee…</option>
              {(employees ?? []).map((e: any) => (
                <option key={e.id} value={e.id}>{e.name ?? e.email}</option>
              ))}
            </select>
          </div>
          {canEdit && (
            <button
              onClick={() => { setEditingId(null); setMode('edit'); }}
              disabled={!periodLabel || !employeeId}
              title={!periodLabel || !employeeId ? 'Select a period and an employee first' : 'Start a new review'}
              className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Plus size={15} /> New review
            </button>
          )}
        </div>
      )}

      {!employeeId ? (
        <div className="ls-card p-10 text-center text-sm text-ls-ink-3">Select an employee to see their reviews.</div>
      ) : mode === 'list' ? (
        <EvaluationList
          employeeName={employee?.name ?? employee?.email ?? ''}
          rows={evalsQuery.data ?? []}
          loading={evalsQuery.isLoading}
          canEdit={canEdit}
          onOpen={(id) => { setEditingId(id); setMode('edit'); }}
        />
      ) : (
        <EvaluationForm
          key={editingId ?? 'new'}
          employeeId={employeeId}
          editingId={editingId}
          newPeriodLabel={periodLabel}
          values={values ?? []}
          pillars={pillars as string[]}
          onDone={() => { setMode('list'); setEditingId(null); evalsQuery.refetch(); }}
          onCancel={() => { setMode('list'); setEditingId(null); }}
        />
      )}

      {/* Add-period modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPeriodModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">New review period</h3>
            <p className="text-xs text-gray-500 mb-3">Keep the format consistent, e.g. "2026 H1", "2026 Q3", "2026 Annual".</p>
            <input autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4" value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)} placeholder="e.g. 2026 H2"
              onKeyDown={(e) => { if (e.key === 'Enter' && newPeriod.trim()) createPeriod.mutate({ label: newPeriod.trim() }); }} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPeriodModal(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={() => newPeriod.trim() && createPeriod.mutate({ label: newPeriod.trim() })}
                disabled={!newPeriod.trim() || createPeriod.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Add period</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvaluationList({ employeeName, rows, loading, canEdit, onOpen }: {
  employeeName: string; rows: any[]; loading: boolean; canEdit: boolean; onOpen: (id: string) => void;
}) {
  if (loading) return <div className="text-gray-400 text-sm py-6 text-center">Loading…</div>;
  if (rows.length === 0) return <div className="ls-card p-10 text-center text-sm text-ls-ink-3">No reviews yet for {employeeName}.</div>;
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 font-medium">Period</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Reviewer</th>
            <th className="px-3 py-2 font-medium text-center">Avg</th>
            <th className="px-3 py-2 font-medium text-center">Values</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => onOpen(r.id)}>
              <td className="px-3 py-2 text-gray-900">{r.periodLabel || '—'}</td>
              <td className="px-3 py-2 text-gray-600">{fmtDate(r.evaluatedAt)}</td>
              <td className="px-3 py-2 text-gray-600">{r.reviewerName || '—'}</td>
              <td className={`px-3 py-2 text-center font-semibold ${band(r.avgScore)}`}>{r.avgScore != null ? r.avgScore.toFixed(1) : '—'}</td>
              <td className="px-3 py-2 text-center text-gray-500">{r.scoredCount}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!canEdit && <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">View only — manager role required to add or edit reviews.</div>}
    </div>
  );
}

function EvaluationForm({ employeeId, editingId, newPeriodLabel, values, pillars, onDone, onCancel }: {
  employeeId: string; editingId: string | null; newPeriodLabel: string; values: any[]; pillars: string[];
  onDone: () => void; onCancel: () => void;
}) {
  const existing = trpc.values.getEvaluation.useQuery({ id: editingId! }, { enabled: !!editingId });
  const save = trpc.values.saveEvaluation.useMutation({ onSuccess: onDone, onError: (e) => alert(e.message) });
  const del = trpc.values.deleteEvaluation.useMutation({ onSuccess: onDone, onError: (e) => alert(e.message) });

  const [status, setStatus] = useState<'draft' | 'final'>('draft');
  const [overallNotes, setOverallNotes] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Period is fixed up front: chosen at the top for a new review, or the
  // evaluation's own stored period when editing. Shown read-only here.
  const displayPeriod = editingId ? (existing.data?.periodLabel ?? '') : newPeriodLabel;

  useEffect(() => {
    if (editingId && existing.data) {
      setStatus((existing.data.status as 'draft' | 'final') ?? 'draft');
      setOverallNotes(existing.data.overallNotes ?? '');
      const s: Record<string, number> = {}; const n: Record<string, string> = {};
      existing.data.scores.forEach((x: any) => { s[x.valueId] = x.score; if (x.notes) n[x.valueId] = x.notes; });
      setScores(s); setNotes(n);
    }
  }, [editingId, existing.data]);

  const submit = () => {
    const scoreArr = Object.entries(scores)
      .filter(([, v]) => v >= 1 && v <= 5)
      .map(([valueId, score]) => ({ valueId, score, notes: notes[valueId] || undefined }));
    if (scoreArr.length === 0) { alert('Score at least one value before saving.'); return; }
    save.mutate({
      id: editingId ?? undefined,
      employeeId,
      periodLabel: displayPeriod || null,
      status,
      overallNotes: overallNotes || null,
      scores: scoreArr,
    });
  };

  if (editingId && existing.isLoading) return <div className="text-gray-400 text-sm py-6 text-center">Loading…</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={15} /> Back</button>
        {editingId && (
          <button onClick={() => { if (confirm('Delete this review?')) del.mutate({ id: editingId }); }}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"><Trash2 size={14} /> Delete</button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-48">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Review period</label>
          <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-700">{displayPeriod || '—'}</div>
        </div>
        <div className="w-40">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Status</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'final')}>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      {values.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">No active company values to score. Add them in Core Data → Company Values.</div>
      ) : (
        pillars.map((pillar) => (
          <div key={pillar} className="mb-4">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">{pillar}</h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {values.filter((v) => v.pillar === pillar).map((v) => (
                <div key={v.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{v.name}</div>
                      {v.description && <div className="text-xs text-gray-500">{v.description}</div>}
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button"
                          onClick={() => setScores((s) => ({ ...s, [v.id]: n }))}
                          className={`w-8 h-8 rounded-md text-sm font-semibold border transition-colors ${
                            scores[v.id] === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {scores[v.id] != null && (
                    <input className="w-full mt-2 px-2 py-1.5 border border-gray-200 rounded text-xs" placeholder="Notes (optional)"
                      value={notes[v.id] ?? ''} onChange={(e) => setNotes((nn) => ({ ...nn, [v.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="mb-4">
        <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Overall notes</label>
        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" rows={3}
          value={overallNotes} onChange={(e) => setOverallNotes(e.target.value)} placeholder="Summary, strengths, growth areas…" />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
        <button onClick={submit} disabled={save.isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {save.isLoading ? 'Saving…' : 'Save review'}
        </button>
      </div>
    </div>
  );
}
