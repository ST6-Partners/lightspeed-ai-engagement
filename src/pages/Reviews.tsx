// ============================================================
// REVIEWS — Employee performance evaluation (Engagement group)
//
// A manager/reviewer picks an EMPLOYEE and scores them 1-5 against each
// active company value (framework mirrored from ATA), with per-value notes +
// overall notes, saved as a dated evaluation. History is listed per employee.
// Company-value definitions are read-only here (managed in Core Data →
// Company Values / ATA). Standalone build (2026-07-08); the Organization
// screen's separate Review tab is intentionally untouched.
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { Star, Plus, Trash2, ArrowLeft } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;
const today = () => new Date().toISOString().slice(0, 10);
const band = (n: number | null) =>
  n == null ? 'text-gray-400' : n >= 4 ? 'text-green-600' : n >= 3 ? 'text-blue-600' : n >= 2 ? 'text-amber-600' : 'text-red-600';

export default function Reviews() {
  const { data: me } = trpc.auth.me.useQuery();
  const canEdit = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.manager;

  const { data: employees } = trpc.values.listEmployees.useQuery();
  const { data: values } = trpc.values.list.useQuery();

  const [employeeId, setEmployeeId] = useState('');
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const evalsQuery = trpc.values.listEvaluations.useQuery({ employeeId }, { enabled: !!employeeId });
  const employee = (employees ?? []).find((e: any) => e.id === employeeId);

  const pillars = useMemo(
    () => Array.from(new Set((values ?? []).map((v: any) => v.pillar))),
    [values],
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Star size={22} className="text-amber-500" /> Reviews</h1>
      <p className="text-sm text-ls-ink-3 mb-5">Score employees against the company values.</p>

      {/* Employee picker */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Employee</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setMode('list'); setEditingId(null); }}>
            <option value="">Select an employee…</option>
            {(employees ?? []).map((e: any) => (
              <option key={e.id} value={e.id}>{e.name ?? e.email}</option>
            ))}
          </select>
        </div>
        {employeeId && canEdit && mode === 'list' && (
          <button
            onClick={() => { setEditingId(null); setMode('edit'); }}
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            <Plus size={15} /> New evaluation
          </button>
        )}
      </div>

      {!employeeId ? (
        <div className="ls-card p-10 text-center text-sm text-ls-ink-3">Select an employee to see their evaluations.</div>
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
          values={values ?? []}
          pillars={pillars as string[]}
          onDone={() => { setMode('list'); setEditingId(null); evalsQuery.refetch(); }}
          onCancel={() => { setMode('list'); setEditingId(null); }}
        />
      )}
    </div>
  );
}

function EvaluationList({ employeeName, rows, loading, canEdit, onOpen }: {
  employeeName: string; rows: any[]; loading: boolean; canEdit: boolean; onOpen: (id: string) => void;
}) {
  if (loading) return <div className="text-gray-400 text-sm py-6 text-center">Loading…</div>;
  if (rows.length === 0) return <div className="ls-card p-10 text-center text-sm text-ls-ink-3">No evaluations yet for {employeeName}.</div>;
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
              <td className="px-3 py-2 text-gray-600">{new Date(r.evaluatedAt).toLocaleDateString()}</td>
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
      {!canEdit && <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">View only — manager role required to add or edit evaluations.</div>}
    </div>
  );
}

function EvaluationForm({ employeeId, editingId, values, pillars, onDone, onCancel }: {
  employeeId: string; editingId: string | null; values: any[]; pillars: string[];
  onDone: () => void; onCancel: () => void;
}) {
  const existing = trpc.values.getEvaluation.useQuery({ id: editingId! }, { enabled: !!editingId });
  const save = trpc.values.saveEvaluation.useMutation({ onSuccess: onDone, onError: (e) => alert(e.message) });
  const del = trpc.values.deleteEvaluation.useMutation({ onSuccess: onDone, onError: (e) => alert(e.message) });

  const [periodLabel, setPeriodLabel] = useState('');
  const [status, setStatus] = useState<'draft' | 'final'>('draft');
  const [overallNotes, setOverallNotes] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingId && existing.data) {
      setPeriodLabel(existing.data.periodLabel ?? '');
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
      periodLabel: periodLabel || null,
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
          <button onClick={() => { if (confirm('Delete this evaluation?')) del.mutate({ id: editingId }); }}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"><Trash2 size={14} /> Delete</button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Review period</label>
          <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. 2026 H1" />
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
          {save.isLoading ? 'Saving…' : 'Save evaluation'}
        </button>
      </div>
    </div>
  );
}
