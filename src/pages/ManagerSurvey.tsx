// ============================================================
// MANAGER SURVEY — upward feedback filled out AFTER a 1:1 with your manager.
// An employee rates their manager 1..5 across the active Survey Questions.
// Two sub-tabs:
//   • After a 1:1  — the rating form (respondent + manager + date + ratings).
//   • Past Responses — the recorded history of submitted reviews.
// Respondent identity is still captured (may be needed by HR) — not anonymized.
// ============================================================

import { useMemo, useState } from 'react';
import { trpc } from '../lib/trpc';
import { CheckCircle2, ClipboardList, History } from 'lucide-react';

const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const labelCls = 'block text-[11px] uppercase tracking-wide text-gray-500 mb-1';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const avgOf = (r: Record<string, number>) => {
  const v = Object.values(r ?? {});
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};

type View = 'form' | 'history';

export default function ManagerSurvey() {
  const [view, setView] = useState<View>('form');

  const { data: people } = trpc.pip.listUsers.useQuery();
  const { data: questions, isLoading: qLoading } = trpc.managerSurveyQuestions.list.useQuery();
  const { data: scale } = trpc.managerRatingScale.list.useQuery();
  const utils = trpc.useContext();
  const { data: history, isLoading: hLoading } = trpc.managerSurvey.list.useQuery(undefined, {
    enabled: view === 'history',
  });

  const [respondentId, setRespondentId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [reviewDate, setReviewDate] = useState(todayISO());
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.managerSurvey.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      utils.managerSurvey.list.invalidate();
    },
    onError: (e) => alert(e.message),
  });

  const activeQuestions = questions ?? [];
  const scaleValues = useMemo(() => (scale ?? []).map((s) => s.value), [scale]);
  const questionText = useMemo(
    () => Object.fromEntries((questions ?? []).map((q) => [q.id, q.text])) as Record<string, string>,
    [questions],
  );

  const answeredCount = Object.keys(ratings).length;
  const allAnswered = activeQuestions.length > 0 && answeredCount === activeQuestions.length;
  const canSubmit =
    !!respondentId && !!managerId && !!reviewDate && allAnswered && respondentId !== managerId;

  const setRating = (qid: string, v: number) => setRatings((r) => ({ ...r, [qid]: v }));

  const resetForm = () => {
    setRespondentId(''); setManagerId(''); setReviewDate(todayISO()); setRatings({}); setSubmitted(false);
  };

  const TabBar = () => (
    <div className="flex gap-1 mb-4 border-b border-gray-200">
      {([
        { key: 'form' as const, label: 'After a 1:1', icon: ClipboardList },
        { key: 'history' as const, label: 'Past Responses', icon: History },
      ]).map(({ key, label, icon: Icon }) => {
        const on = view === key;
        return (
          <button key={key} type="button" onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              on ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            <Icon size={16} /> {label}
          </button>
        );
      })}
    </div>
  );

  // ── Past Responses view ────────────────────────────────
  const HistoryView = () => {
    if (hLoading) {
      return <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400">Loading responses…</div>;
    }
    const rows = history ?? [];
    if (rows.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <History className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">No manager feedback has been recorded yet.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">{rows.length} recorded {rows.length === 1 ? 'response' : 'responses'}</p>
        {rows.map((r) => {
          const avg = avgOf(r.ratings as Record<string, number>);
          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    Manager: {r.managerName ?? '—'}
                  </div>
                  <div className="text-xs text-gray-500">
                    by {r.respondentName ?? '—'} · {r.reviewDate}
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                  avg {avg.toFixed(1)}
                </span>
              </div>
              <div className="space-y-1.5">
                {Object.entries((r.ratings ?? {}) as Record<string, number>).map(([qid, v]) => (
                  <div key={qid} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-700 min-w-0">{questionText[qid] ?? qid}</span>
                    <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Submitted confirmation ─────────────────────────────
  const Submitted = () => (
    <div className="max-w-xl mx-auto mt-10 text-center">
      <CheckCircle2 className="mx-auto text-green-600 mb-3" size={44} />
      <h2 className="text-xl font-bold text-gray-900">Feedback submitted</h2>
      <p className="text-sm text-gray-500 mt-1">Thanks — your manager feedback has been recorded.</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button onClick={resetForm}
          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
          Submit another
        </button>
        <button onClick={() => { setSubmitted(false); setView('history'); }}
          className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-blue-400 hover:text-blue-700">
          View past responses
        </button>
      </div>
    </div>
  );

  // ── Rating form ────────────────────────────────────────
  const FormView = () => (
    <>
      {/* Header selectors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Employee (giving the rating)</label>
          <select className={`${inputCls} w-full`} value={respondentId} onChange={(e) => setRespondentId(e.target.value)}>
            <option value="">Select employee…</option>
            {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Manager (being rated)</label>
          <select className={`${inputCls} w-full`} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">Select manager…</option>
            {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>1:1 date</label>
          <input type="date" className={`${inputCls} w-full`} value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </div>
        {respondentId && managerId && respondentId === managerId && (
          <div className="sm:col-span-3 text-xs text-red-600">Employee and manager must be different people.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Questions */}
        <div className="lg:col-span-2 space-y-2">
          {qLoading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400">Loading questions…</div>
          ) : activeQuestions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
              No active questions. Add them in Core Data → Survey Questions.
            </div>
          ) : (
            activeQuestions.map((q, i) => (
              <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      <span className="text-gray-400 mr-1">{i + 1}.</span>{q.text}
                    </div>
                    {q.description && <div className="text-xs text-gray-500 mt-0.5">{q.description}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(scaleValues.length ? scaleValues : [1, 2, 3, 4, 5]).slice().sort((a, b) => a - b).map((v) => {
                      const sel = ratings[q.id] === v;
                      const meta = (scale ?? []).find((s) => s.value === v);
                      return (
                        <button key={v} type="button" title={meta?.label ?? String(v)}
                          onClick={() => setRating(q.id, v)}
                          className={`w-9 h-9 rounded-md text-sm font-semibold border transition-colors ${
                            sel ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                          }`}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">{answeredCount} of {activeQuestions.length} answered</span>
            <button onClick={() => submit.mutate({ respondentId, managerId, reviewDate, ratings })}
              disabled={!canSubmit || submit.isLoading}
              className="inline-flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submit.isLoading ? 'Submitting…' : 'Submit feedback'}
            </button>
          </div>
        </div>

        {/* Rating scale legend */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 lg:sticky lg:top-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Rating Scale</h3>
            <div className="space-y-3">
              {(scale ?? []).map((s) => (
                <div key={s.id} className="flex gap-2.5">
                  <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold shrink-0">{s.value}</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{s.label}</div>
                    {s.definition && <div className="text-xs text-gray-500 leading-snug">{s.definition}</div>}
                  </div>
                </div>
              ))}
              {(!scale || scale.length === 0) && (
                <div className="text-xs text-gray-500">No scale defined. Add levels in Core Data → Rating Scale.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="text-blue-600" size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manager Survey</h1>
          <p className="text-sm text-gray-500">
            Fill this out after your 1:1 with your manager. Rate each behavior from 1 to 5 using the scale on the right.
          </p>
        </div>
      </div>

      <TabBar />

      {view === 'history' ? <HistoryView /> : submitted ? <Submitted /> : <FormView />}
    </div>
  );
}
