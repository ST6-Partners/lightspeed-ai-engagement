// ============================================================
// CHECK-INS — the standalone weekly pulse. Fires on its own weekly clock
// (independent of the 1:1). Every week: 3 fixed anchor taps (Best-Self /
// Sentiment / Workload) + 2 rotating taps (driver + value) + 1 optional
// open-text. eNPS (0..10) replaces the driver slot on rotation week 12.
// Rotation comes from src/lib/weeklyCheckin.ts. Two sub-tabs: This Week + Past.
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { trpc } from '../lib/trpc';
import { CheckCircle2, ClipboardCheck, History } from 'lucide-react';
import { ANCHORS, planForDate, weekStartISO } from '../lib/weeklyCheckin';

const labelCls = 'block text-[11px] uppercase tracking-wide text-gray-500 mb-1';
const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

// Module-scope presentational helpers (kept out of the component body so inputs
// don't remount / lose focus on each render).
function Scale({ max, value, onChange }: { max: 5 | 10; value: number | null; onChange: (v: number) => void }) {
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
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}>
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
const QRow = ({ text, children }: { text: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="text-sm font-medium text-gray-900 min-w-0">{text}</span>
    <div className="shrink-0">{children}</div>
  </div>
);

const avgAnchors = (r: any) => {
  const v = [r.bestSelf, r.sentiment, r.workload].filter((x: any) => typeof x === 'number');
  return v.length ? (v.reduce((a: number, b: number) => a + b, 0) / v.length) : 0;
};

type View = 'form' | 'history';

export default function CheckIns() {
  const [view, setView] = useState<View>('form');
  const plan = useMemo(() => planForDate(new Date()), []);
  const weekOf = useMemo(() => weekStartISO(new Date()), []);

  const { data: people } = trpc.pip.listUsers.useQuery();
  const utils = trpc.useContext();
  const { data: history, isLoading: hLoading } = trpc.checkins.list.useQuery(undefined, { enabled: view === 'history' });

  const [respondentId, setRespondentId] = useState('');
  const [anchor, setAnchor] = useState<Record<string, number>>({});
  const [driverVal, setDriverVal] = useState<number | null>(null);
  const [valueVal, setValueVal] = useState<number | null>(null);
  const [enps, setEnps] = useState<number | null>(null);
  const [openText, setOpenText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.checkins.submit.useMutation({
    onSuccess: () => { setSubmitted(true); utils.checkins.list.invalidate(); },
    onError: (e) => alert(e.message),
  });

  const setAnchorVal = (k: string, v: number) => setAnchor((a) => ({ ...a, [k]: v }));

  const anchorsDone = ANCHORS.every((a) => anchor[a.key] != null);
  const driverDone = plan.isEnpsWeek ? enps != null : driverVal != null;
  const canSubmit = !!respondentId && anchorsDone && driverDone && valueVal != null && !submit.isLoading;

  const reset = () => {
    setRespondentId(''); setAnchor({}); setDriverVal(null); setValueVal(null);
    setEnps(null); setOpenText(''); setSubmitted(false);
  };

  const doSubmit = () => {
    submit.mutate({
      respondentId,
      weekOf,
      rotationIndex: plan.rotationIndex,
      bestSelf: anchor.bestSelf,
      sentiment: anchor.sentiment,
      workload: anchor.workload,
      driver: plan.isEnpsWeek
        ? { key: 'enps', text: plan.driver.text, driver: 'commitment', value: enps ?? undefined }
        : { key: plan.driver.key, text: plan.driver.text, driver: plan.driver.driver, value: driverVal ?? undefined },
      valueItem: { key: plan.value.key, text: plan.value.text, driver: 'values', value: valueVal ?? undefined },
      enps: plan.isEnpsWeek ? (enps ?? undefined) : undefined,
      openPrompt: plan.openPrompt,
      openText: openText.trim() || undefined,
    });
  };

  const tabBar = () => (
    <div className="flex gap-1 mb-4 border-b border-gray-200">
      {([{ key: 'form' as const, label: 'This Week', icon: ClipboardCheck },
         { key: 'history' as const, label: 'Past Responses', icon: History }]).map(({ key, label, icon: Icon }) => {
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
        {rows.map((r: any) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{r.respondentName ?? '—'}</div>
                <div className="text-xs text-gray-500">Week of {r.weekOf} · cycle week {r.rotationIndex + 1}</div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                avg {avgAnchors(r).toFixed(1)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2 text-center">
              {[['Best-Self', r.bestSelf], ['Lightspeed', r.sentiment], ['Workload', r.workload]].map(([lbl, v]) => (
                <div key={lbl as string} className="bg-gray-50 rounded-md py-1.5">
                  <div className="text-base font-bold text-gray-900">{(v as number) ?? '–'}</div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500">{lbl}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              {r.driver && <div className="flex justify-between gap-3"><span className="text-gray-600 min-w-0">{r.driver.text}</span><span className="shrink-0 font-semibold text-gray-900">{r.driver.value ?? '–'}</span></div>}
              {r.valueItem && <div className="flex justify-between gap-3"><span className="text-gray-600 min-w-0">{r.valueItem.text}</span><span className="shrink-0 font-semibold text-gray-900">{r.valueItem.value ?? '–'}</span></div>}
              {r.openText && <div className="mt-1 text-gray-700"><span className="text-xs text-gray-400 block">{r.openPrompt}</span>{r.openText}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderForm = () => {
    if (submitted) {
      return (
        <div className="max-w-xl mx-auto mt-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600 mb-3" size={44} />
          <h2 className="text-xl font-bold text-gray-900">Check-in submitted</h2>
          <p className="text-sm text-gray-500 mt-1">Thanks — that takes less than a minute and it really helps.</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Submit another</button>
            <button onClick={() => { setSubmitted(false); setView('history'); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-blue-400 hover:text-blue-700">View past responses</button>
          </div>
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
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{plan.weekLabel}</span>
        </div>

        <Card>
          <div className="text-[11px] uppercase tracking-wide text-blue-600 font-semibold mb-1">This week</div>
          {ANCHORS.map((a) => (
            <QRow key={a.key} text={a.text}>
              <Scale max={5} value={anchor[a.key] ?? null} onChange={(v) => setAnchorVal(a.key, v)} />
            </QRow>
          ))}
        </Card>

        <Card>
          {plan.isEnpsWeek
            ? <QRow text={plan.driver.text}><Scale max={10} value={enps} onChange={setEnps} /></QRow>
            : <QRow text={plan.driver.text}><Scale max={5} value={driverVal} onChange={setDriverVal} /></QRow>}
          <QRow text={plan.value.text}><Scale max={5} value={valueVal} onChange={setValueVal} /></QRow>
        </Card>

        <Card>
          <label className={labelCls}>{plan.openPrompt} <span className="normal-case text-gray-400">(optional)</span></label>
          <textarea rows={2} className={`${inputCls} w-full`} value={openText} onChange={(e) => setOpenText(e.target.value)}
            placeholder="Optional — a sentence is plenty." />
        </Card>

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
        A quick weekly pulse — under a minute. Same three questions every week plus a couple that rotate, so we can see how you're doing over time.
      </p>
      {tabBar()}
      {view === 'history' ? renderHistory() : renderForm()}
    </div>
  );
}
