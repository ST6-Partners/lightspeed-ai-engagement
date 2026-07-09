// ============================================================
// CHECK-INS — configurable weekly pulse. Renders whatever questions are
// marked "included" in the bank (Core Data → Check-in Questions), mixing
// tap-scales (1..5 / eNPS 0..10) and written questions. Cadence label comes
// from settings. Two sub-tabs: This Period + Past Responses.
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { trpc } from '../lib/trpc';
import { CheckCircle2, ClipboardCheck, History, Settings } from 'lucide-react';
import { weekStartISO } from '../lib/weeklyCheckin';
import { CheckinQuestions } from './admin';

const labelCls = 'block text-[11px] uppercase tracking-wide text-gray-500 mb-1';
const inputCls = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

const CADENCE_LABEL: Record<string, string> = { weekly: 'Weekly check-in', biweekly: 'Every-2-weeks check-in', monthly: 'Monthly check-in' };

function Scale({ max, value, onChange }: { max: number; value: number | null; onChange: (v: number) => void }) {
  const base = Array.from({ length: max }, (_, i) => i + 1);
  const range = max === 10 ? [0, ...base] : base;
  return (
    <div className="flex flex-wrap gap-1">
      {range.map((v) => {
        const sel = value === v;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`w-9 h-9 rounded-md text-sm font-semibold border transition-colors ${
              sel ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

const Card = ({ children }: { children: ReactNode }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">{children}</div>
);

type Ans = { value?: number; answerText?: string };
type View = 'form' | 'history' | 'configure';

export default function CheckIns() {
  const [view, setView] = useState<View>('form');
  const periodStart = useMemo(() => weekStartISO(new Date()), []);

  const { data: people } = trpc.pip.listUsers.useQuery();
  const { data: questions } = trpc.checkinQuestions.list.useQuery();
  const { data: settings } = trpc.checkinSettings.get.useQuery();
  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.role === 'admin' || me?.role === 'sysadmin';
  const utils = trpc.useContext();
  const { data: history, isLoading: hLoading } = trpc.checkins.list.useQuery(undefined, { enabled: view === 'history' });

  const included = useMemo(
    () => (questions ?? []).filter((q: any) => q.included && q.isActive)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    [questions],
  );

  const [respondentId, setRespondentId] = useState('');
  const [answers, setAnswers] = useState<Record<string, Ans>>({});
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.checkins.submit.useMutation({
    onSuccess: () => { setSubmitted(true); utils.checkins.list.invalidate(); },
    onError: (e) => alert(e.message),
  });

  const setVal = (id: string, value: number) => setAnswers((a) => ({ ...a, [id]: { ...a[id], value } }));
  const setTxt = (id: string, answerText: string) => setAnswers((a) => ({ ...a, [id]: { ...a[id], answerText } }));

  const scaleQs = included.filter((q: any) => q.type !== 'text');
  const allScalesDone = scaleQs.every((q: any) => answers[q.id]?.value != null);
  const canSubmit = !!respondentId && included.length > 0 && allScalesDone && !submit.isLoading;

  const reset = () => { setRespondentId(''); setAnswers({}); setSubmitted(false); };

  const doSubmit = () => {
    const payload = included.map((q: any) => ({
      questionId: q.id,
      text: q.text,
      type: q.type,
      category: q.category,
      driver: q.driver ?? undefined,
      value: answers[q.id]?.value,
      answerText: answers[q.id]?.answerText?.trim() || undefined,
    }));
    submit.mutate({ respondentId, periodStart, answers: payload });
  };

  const cadenceLabel = CADENCE_LABEL[settings?.cadence ?? 'weekly'] ?? 'Check-in';

  const tabBar = () => (
    <div className="flex gap-1 mb-4 border-b border-gray-200">
      {([{ key: 'form' as const, label: 'This Period', icon: ClipboardCheck },
         { key: 'history' as const, label: 'Past Responses', icon: History },
         ...(isAdmin ? [{ key: 'configure' as const, label: 'Configure', icon: Settings }] : [])]).map(({ key, label, icon: Icon }) => {
        const on = view === key;
        return (
          <button key={key} type="button" onClick={() => setView(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              on ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Icon size={16} /> {label}
          </button>
        );
      })}
    </div>
  );

  const renderHistory = () => {
    if (hLoading) return <Card><div className="text-center text-gray-400 py-4">Loading responses…</div></Card>;
    const rows = history ?? [];
    if (rows.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <History className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-sm text-gray-500">No check-ins have been submitted yet.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">{rows.length} recorded {rows.length === 1 ? 'check-in' : 'check-ins'}</p>
        {rows.map((r: any) => {
          const ans: any[] = Array.isArray(r.answers) ? r.answers : [];
          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="mb-2">
                <div className="text-sm font-semibold text-gray-900">{r.respondentName ?? '—'}</div>
                <div className="text-xs text-gray-500">Period of {r.weekOf}</div>
              </div>
              <div className="space-y-1.5 text-sm">
                {ans.map((a, i) => (
                  <div key={i} className="border-t border-gray-100 pt-1.5 first:border-0 first:pt-0">
                    <div className="text-xs text-gray-400">{a.text}</div>
                    {a.type === 'text'
                      ? <div className="text-gray-800">{a.answerText || <span className="text-gray-400">—</span>}</div>
                      : <div className="font-semibold text-gray-900">{a.value ?? '–'}{a.type === 'enps' ? ' / 10' : ' / 5'}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderForm = () => {
    if (submitted) {
      return (
        <div className="max-w-xl mx-auto mt-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600 mb-3" size={44} />
          <h2 className="text-xl font-bold text-gray-900">Check-in submitted</h2>
          <p className="text-sm text-gray-500 mt-1">Thanks — that really helps your manager keep a pulse on how you're doing.</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Submit another</button>
            <button onClick={() => { setSubmitted(false); setView('history'); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-blue-400 hover:text-blue-700">View past responses</button>
          </div>
        </div>
      );
    }
    if (included.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No questions are included in the check-in yet. Add them in Core Data → Check-in Questions.</p>
        </div>
      );
    }
    return (
      <div className="max-w-2xl space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="w-full sm:w-2/3">
            <label className={labelCls}>You</label>
            <select className={`${inputCls} w-full`} value={respondentId} onChange={(e) => setRespondentId(e.target.value)}>
              <option value="">Select your name…</option>
              {(people ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{cadenceLabel}</span>
        </div>

        {included.map((q: any) => (
          <Card key={q.id}>
            {q.type === 'text' ? (
              <>
                <label className={labelCls}>{q.text}</label>
                <textarea rows={2} className={`${inputCls} w-full`} value={answers[q.id]?.answerText ?? ''}
                  onChange={(e) => setTxt(q.id, e.target.value)} placeholder="A sentence or two is plenty." />
              </>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-gray-900 min-w-0">{q.text}</span>
                <div className="shrink-0">
                  <Scale max={q.type === 'enps' ? 10 : 5} value={answers[q.id]?.value ?? null} onChange={(v) => setVal(q.id, v)} />
                </div>
              </div>
            )}
          </Card>
        ))}

        <div className="flex justify-end">
          <button onClick={doSubmit} disabled={!canSubmit}
            className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submit.isLoading ? 'Submitting…' : 'Submit check-in'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight">Check-ins</h1>
      <p className="text-sm text-ls-ink-3 mb-5">
        A quick pulse on how you're doing, what you're focused on, and what you need — so your manager stays in the loop between reviews.
      </p>
      {tabBar()}
      {view === 'configure' && isAdmin ? <CheckinQuestions /> : view === 'history' ? renderHistory() : renderForm()}
    </div>
  );
}
