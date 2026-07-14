import { fmtDate, fmtDateTime } from '../lib/date';
// ============================================================
// REVIEWS — Employee performance evaluation (Engagement group)
//
// Flow: pick a REVIEW PERIOD, then an EMPLOYEE (both SHARED across tabs),
// then choose an instrument via the tab bar:
//   • Values      — score 1-5 against active company values, grouped by pillar
//                   (framework managed in Core Data > Company Values).
//   • Performance — score 1-5 against active performance criteria, a FLAT list
//                   (framework managed in Core Data > Performance Criteria).
// Each tab has its own per-employee history list and edit form; the period is
// chosen up front and shown READ-ONLY on the form. Periods come from the
// managed review_periods lookup (dropdown + "+" modal) so names stay
// consistent. Standalone build (2026-07-08); the Organization screen's separate
// Review tab is intentionally untouched.
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Star, Plus, Trash2, ArrowLeft, CheckCircle2, Circle, ArrowRight, ShieldCheck } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;
const band = (n: number | null) =>
  n == null ? 'text-gray-400' : n >= 4 ? 'text-green-600' : n >= 3 ? 'text-blue-600' : n >= 2 ? 'text-amber-600' : 'text-red-600';

type Tab = 'values' | 'performance';

export default function Reviews() {
  const { data: me } = trpc.auth.me.useQuery();
  const canEdit = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.manager;

  const { data: employees } = trpc.values.listEmployees.useQuery();
  const { data: values } = trpc.values.list.useQuery();
  const periodsQuery = trpc.values.listPeriods.useQuery();

  const [periodLabel, setPeriodLabel] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [tab, setTab] = useState<Tab>('values');

  // Each tab manages its own list/edit state so an in-progress edit never
  // carries across instruments. Switching tabs resets both back to the list.
  const [valMode, setValMode] = useState<'list' | 'edit'>('list');
  const [valEditingId, setValEditingId] = useState<string | null>(null);
  const [perfMode, setPerfMode] = useState<'list' | 'edit'>('list');
  const [perfEditingId, setPerfEditingId] = useState<string | null>(null);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newPeriod, setNewPeriod] = useState('');

  const createPeriod = trpc.values.createPeriod.useMutation({
    onSuccess: (pd) => { periodsQuery.refetch(); setPeriodLabel(pd.label); setShowPeriodModal(false); setNewPeriod(''); },
    onError: (e) => alert(e.message),
  });

  const employee = (employees ?? []).find((e: any) => e.id === employeeId);
  const periodOptions = useMemo(() => (periodsQuery.data ?? []).map((p: any) => p.label), [periodsQuery.data]);

  const switchTab = (next: Tab) => {
    // Reset both tabs' edit state so each opens on its history list.
    setValMode('list'); setValEditingId(null);
    setPerfMode('list'); setPerfEditingId(null);
    setTab(next);
  };

  const mode = tab === 'values' ? valMode : perfMode;

  const startNew = () => {
    if (tab === 'values') { setValEditingId(null); setValMode('edit'); }
    else { setPerfEditingId(null); setPerfMode('edit'); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Star size={22} className="text-amber-500" /> Reviews</h1>
      <p className="text-sm text-ls-ink-3 mb-5">Choose a review period and an employee, then score them against the company values or performance criteria.</p>

      {/* Period + employee pickers — SHARED across tabs (hidden while editing a review) */}
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
              onChange={(e) => { setEmployeeId(e.target.value); setValEditingId(null); setPerfEditingId(null); }}>
              <option value="">Select an employee…</option>
              {(employees ?? []).map((e: any) => (
                <option key={e.id} value={e.id}>{e.name ?? e.email}</option>
              ))}
            </select>
          </div>
          {canEdit && (
            <button
              onClick={startNew}
              disabled={!periodLabel || !employeeId}
              title={!periodLabel || !employeeId ? 'Select a period and an employee first' : 'Start a new review'}
              className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Plus size={15} /> New review
            </button>
          )}
        </div>
      )}

      {mode === 'list' && !!periodLabel && !!employeeId && (
        <GoForwardBanner employeeId={employeeId} periodLabel={periodLabel} canEdit={canEdit} />
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {([['values', 'Values'], ['performance', 'Performance']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => switchTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'values' ? (
        <ValuesTab
          employeeId={employeeId}
          employeeName={employee?.name ?? employee?.email ?? ''}
          canEdit={canEdit}
          values={values ?? []}
          periodLabel={periodLabel}
          mode={valMode}
          editingId={valEditingId}
          onOpen={(id) => { setValEditingId(id); setValMode('edit'); }}
          onDone={() => { setValMode('list'); setValEditingId(null); }}
          onCancel={() => { setValMode('list'); setValEditingId(null); }}
        />
      ) : (
        <PerformanceTab
          employeeId={employeeId}
          employeeName={employee?.name ?? employee?.email ?? ''}
          canEdit={canEdit}
          periodLabel={periodLabel}
          mode={perfMode}
          editingId={perfEditingId}
          onOpen={(id) => { setPerfEditingId(id); setPerfMode('edit'); }}
          onDone={() => { setPerfMode('list'); setPerfEditingId(null); }}
          onCancel={() => { setPerfMode('list'); setPerfEditingId(null); }}
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

// ============================================================
// VALUES TAB — existing behavior preserved verbatim.
// ============================================================

function GoForwardBanner({ employeeId, periodLabel, canEdit }: { employeeId: string; periodLabel: string; canEdit: boolean }) {
  const navigate = useNavigate();
  const statusQ = trpc.reviewSession.status.useQuery({ employeeId, periodLabel });
  const create = trpc.reviewSession.createFromSession.useMutation({
    onSuccess: (r) => navigate(`/coaching-plans/${r.id}`),
    onError: (e) => alert(e.message),
  });
  const st = statusQ.data;
  if (!st) return null;

  if (st.planId) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-emerald-800">
          <ShieldCheck size={16} className="text-emerald-600" />
          Go-forward plan created for this review{st.planTrack === 'pip' ? ' · PIP track' : ''}.
        </div>
        <button onClick={() => navigate(`/coaching-plans/${st.planId}`)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 shrink-0">
          Open plan <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const Item = ({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) => (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {ok ? <CheckCircle2 size={14} className="text-green-600" /> : <Circle size={14} className="text-gray-300" />}
      <span className={ok ? 'text-gray-700' : 'text-gray-500'}>{label}</span>
      {hint && <span className="text-gray-400">({hint})</span>}
    </span>
  );

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[11px] uppercase tracking-wide text-gray-500">Go-forward</span>
          <Item ok={st.hasValues} label="Values" />
          <Item ok={st.performanceFinal} label="Performance final"
            hint={st.performanceFinal ? undefined : st.hasPerformance ? 'not final' : 'not started'} />
        </div>
        {canEdit && (
          <button onClick={() => create.mutate({ employeeId, periodLabel })}
            disabled={!st.canDraft || create.isLoading}
            title={st.canDraft ? 'Draft the coaching plan from this review' : 'Mark the performance review Final first'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
            {create.isLoading ? 'Drafting…' : 'Create coaching plan'} <ArrowRight size={14} />
          </button>
        )}
      </div>
      {!st.canDraft && (
        <p className="text-xs text-amber-600 mt-1.5">Complete the performance review and mark it <b>Final</b> to unlock the go-forward.</p>
      )}
    </div>
  );
}

function ValuesTab({ employeeId, employeeName, canEdit, values, periodLabel, mode, editingId, onOpen, onDone, onCancel }: {
  employeeId: string; employeeName: string; canEdit: boolean; values: any[]; periodLabel: string;
  mode: 'list' | 'edit'; editingId: string | null;
  onOpen: (id: string) => void; onDone: () => void; onCancel: () => void;
}) {
  const evalsQuery = trpc.values.listEvaluations.useQuery({ employeeId }, { enabled: !!employeeId });
  const pillars = useMemo(() => Array.from(new Set((values ?? []).map((v: any) => v.pillar))), [values]);

  if (!employeeId) {
    return <div className="ls-card p-10 text-center text-sm text-ls-ink-3">Select an employee to see their reviews.</div>;
  }
  if (mode === 'list') {
    return (
      <ValuesEvaluationList
        employeeName={employeeName}
        rows={evalsQuery.data ?? []}
        loading={evalsQuery.isLoading}
        canEdit={canEdit}
        onOpen={onOpen}
      />
    );
  }
  return (
    <ValuesEvaluationForm
      key={editingId ?? 'new'}
      employeeId={employeeId}
      editingId={editingId}
      newPeriodLabel={periodLabel}
      values={values ?? []}
      pillars={pillars as string[]}
      onDone={() => { onDone(); evalsQuery.refetch(); }}
      onCancel={onCancel}
    />
  );
}

function ValuesEvaluationList({ employeeName, rows, loading, canEdit, onOpen }: {
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

function ValuesEvaluationForm({ employeeId, editingId, newPeriodLabel, values, pillars, onDone, onCancel }: {
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

// ============================================================
// PERFORMANCE TAB — parallel instrument scoring against a FLAT list of
// performance criteria (no pillar grouping) via trpc.performance.*.
// ============================================================

function PerformanceTab({ employeeId, employeeName, canEdit, periodLabel, mode, editingId, onOpen, onDone, onCancel }: {
  employeeId: string; employeeName: string; canEdit: boolean; periodLabel: string;
  mode: 'list' | 'edit'; editingId: string | null;
  onOpen: (id: string) => void; onDone: () => void; onCancel: () => void;
}) {
  const criteria = trpc.performance.listCriteria.useQuery();
  const evalsQuery = trpc.performance.listEvaluations.useQuery({ employeeId }, { enabled: !!employeeId });

  if (!employeeId) {
    return <div className="ls-card p-10 text-center text-sm text-ls-ink-3">Select an employee to see their reviews.</div>;
  }
  if (mode === 'list') {
    return (
      <PerformanceEvaluationList
        employeeName={employeeName}
        rows={evalsQuery.data ?? []}
        loading={evalsQuery.isLoading}
        canEdit={canEdit}
        onOpen={onOpen}
      />
    );
  }
  return (
    <PerformanceEvaluationForm
      key={editingId ?? 'new'}
      employeeId={employeeId}
      editingId={editingId}
      newPeriodLabel={periodLabel}
      criteria={criteria.data ?? []}
      onDone={() => { onDone(); evalsQuery.refetch(); }}
      onCancel={onCancel}
    />
  );
}

function PerformanceEvaluationList({ employeeName, rows, loading, canEdit, onOpen }: {
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
            <th className="px-3 py-2 font-medium text-center">Criteria</th>
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

function PerformanceEvaluationForm({ employeeId, editingId, newPeriodLabel, criteria, onDone, onCancel }: {
  employeeId: string; editingId: string | null; newPeriodLabel: string; criteria: any[];
  onDone: () => void; onCancel: () => void;
}) {
  const existing = trpc.performance.getEvaluation.useQuery({ id: editingId! }, { enabled: !!editingId });
  const save = trpc.performance.saveEvaluation.useMutation({ onSuccess: onDone, onError: (e) => alert(e.message) });
  const del = trpc.performance.deleteEvaluation.useMutation({ onSuccess: onDone, onError: (e) => alert(e.message) });

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
      existing.data.scores.forEach((x: any) => { s[x.criterionId] = x.score; if (x.notes) n[x.criterionId] = x.notes; });
      setScores(s); setNotes(n);
    }
  }, [editingId, existing.data]);

  const submit = () => {
    const scoreArr = Object.entries(scores)
      .filter(([, v]) => v >= 1 && v <= 5)
      .map(([criterionId, score]) => ({ criterionId, score, notes: notes[criterionId] || undefined }));
    if (scoreArr.length === 0) { alert('Score at least one criterion before saving.'); return; }
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

      {criteria.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">No active performance criteria to score. Add them in Core Data → Performance Criteria.</div>
      ) : (
        <div className="mb-4">
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {criteria.map((c) => (
              <div key={c.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    {c.definition && <div className="text-xs text-gray-500">{c.definition}</div>}
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button"
                        onClick={() => setScores((s) => ({ ...s, [c.id]: n }))}
                        className={`w-8 h-8 rounded-md text-sm font-semibold border transition-colors ${
                          scores[c.id] === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {scores[c.id] != null && (
                  <input className="w-full mt-2 px-2 py-1.5 border border-gray-200 rounded text-xs" placeholder="Notes (optional)"
                    value={notes[c.id] ?? ''} onChange={(e) => setNotes((nn) => ({ ...nn, [c.id]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        </div>
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
