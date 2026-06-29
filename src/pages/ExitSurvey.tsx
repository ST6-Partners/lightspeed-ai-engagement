// Exit Survey — live list + create; two-part diagnostic preview (DD-002 Engagement).
import { useState } from 'react';
import { trpc } from '../lib/trpc';

type Mode = 'vol' | 'invol';
const TABS = ['Overview', 'Part A · Employee', 'Part B · Manager', 'Recent & HR'] as const;
type Tab = (typeof TABS)[number];

interface Q { n: string; vol: string; invol: string; sig?: boolean; }
const PART_A: Q[] = [
  { n: 'Q1', vol: "What's the primary reason you're leaving?", invol: 'In your understanding, what was the main reason for your departure?' },
  { n: 'Q2', vol: 'How surprised do you think your manager was by your resignation?', invol: 'How surprised were you to be let go?', sig: true },
  { n: 'Q3', vol: 'Did you make your concerns known to your manager?', invol: 'Had your manager clearly told you your job was at risk?' },
  { n: 'Q5', vol: 'Would you work for this manager again?', invol: 'Would you work for this manager again?', sig: true },
];
const PART_B: Q[] = [
  { n: 'M1', vol: 'How surprised were you by this resignation?', invol: 'How surprised do you think they were to be let go?', sig: true },
  { n: 'M2', vol: 'Had you identified this person as a flight risk?', invol: 'Had you clearly told them their job was at risk?' },
  { n: 'M3', vol: 'When did you last give clear, direct feedback?', invol: 'When did you last give clear, direct feedback?' },
];

export default function ExitSurvey() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [mode, setMode] = useState<Mode>('vol');
  const { data: surveys, refetch } = trpc.exitSurvey.list.useQuery();
  const create = trpc.exitSurvey.create.useMutation({ onSuccess: () => { setName(''); refetch(); } });
  const [name, setName] = useState('');

  const rows = surveys ?? [];
  const gap = (s: { surpriseEmployee: number | null; surpriseManager: number | null }) =>
    s.surpriseEmployee != null && s.surpriseManager != null ? Math.abs(s.surpriseEmployee - s.surpriseManager) : 0;
  const headline = [...rows].sort((a, b) => gap(b) - gap(a))[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight">Exit Survey</h1>
      <p className="text-sm text-ls-ink-3 mb-5">
        A two-part exit diagnostic — departing employee and manager — built for side-by-side comparison.
        People leave (and stay) for a boss, so exit questions diagnose manager quality.
      </p>

      <div className="flex gap-1 border-b border-ls-line mb-5 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm font-semibold px-3.5 py-2.5 -mb-px border-b-2 ${tab === t ? 'text-ls-blue-deep border-ls-blue' : 'text-ls-ink-3 border-transparent hover:text-ls-ink-2'}`}>{t}</button>
        ))}
      </div>

      {(tab === 'Part A · Employee' || tab === 'Part B · Manager') && (
        <div className="ls-card p-3 mb-5 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Exit type</span>
          <div className="flex bg-ls-bg-2 rounded-full p-1 gap-1">
            {(['vol', 'invol'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-[13px] font-semibold px-4 py-1.5 rounded-full ${mode === m ? 'bg-ls-active text-white' : 'text-ls-ink-2'}`}>
                {m === 'vol' ? 'Voluntary · Resignation' : 'Involuntary · Termination'}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="ls-card p-5">
            <h3 className="font-bold mb-1">The surprise signal</h3>
            <p className="text-sm text-ls-ink-2">
              The signature question is <strong>surprise</strong> — it flips owner by exit type. A blindsided
              manager (resignation) and a blindsided employee (termination) are the same diagnosis: clear,
              direct feedback wasn't happening. The gap between the two answers is the diagnostic.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card title="Mirrored pairs">Every diagnostic question on Part A has a twin on Part B. Built for comparison, not collection.</Card>
            <Card title="Manager-quality core">The behavior block — feedback, recognition, growth, fairness, honesty — is identical in both permutations.</Card>
            <Card title="Divergence engine">The comparison + coaching brief doesn't care which way the exit ran.</Card>
          </div>
        </div>
      )}

      {tab === 'Part A · Employee' && <Questions list={PART_A} mode={mode} />}
      {tab === 'Part B · Manager' && <Questions list={PART_B} mode={mode} />}

      {tab === 'Recent & HR' && (
        <div className="space-y-4">
          {headline && gap(headline) >= 2 && (
            <div className="ls-card p-5 border-l-4 border-ls-risk">
              <span className="ls-chip bg-ls-risk-bg text-ls-risk mb-2">Surprise quadrant · Manager red flag</span>
              <h3 className="text-lg font-bold mt-2">{headline.subjectName} — surprise gap of {gap(headline)}</h3>
              <p className="text-sm text-ls-ink-2 mt-1.5">The gap between the two surprise answers is the headline.</p>
              <div className="flex gap-7 mt-4 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">Employee surprise</div>
                  <div className="text-3xl font-extrabold text-ls-blue-deep">{headline.surpriseEmployee ?? '—'} / 5</div>
                </div>
                <div className="self-center text-ls-risk font-semibold">→ gap →</div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ls-ink-3">Manager surprise</div>
                  <div className="text-3xl font-extrabold text-ls-blue">{headline.surpriseManager ?? '—'} / 5</div>
                </div>
              </div>
            </div>
          )}

          <div className="ls-card p-4 flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">New exit diagnostic</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Departing person's name…"
                className="mt-1 w-full text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
            </div>
            <button disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate({ subjectName: name.trim(), exitType: mode })}
              className="ls-btn ls-btn-primary disabled:opacity-50">Create</button>
          </div>

          <div className="font-semibold">Recent exits</div>
          {rows.length === 0 && <div className="text-sm text-ls-ink-3">No exit diagnostics yet.</div>}
          {rows.map((s) => {
            const g = gap(s);
            const tone = g >= 3 ? 'bg-ls-risk-bg text-ls-risk' : g === 2 ? 'bg-ls-watch-bg text-ls-watch' : 'bg-ls-thrive-bg text-ls-thrive';
            return (
              <div key={s.id} className="ls-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center font-bold shrink-0">
                  {s.subjectName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{s.subjectName}</div>
                  <div className="text-[12px] text-ls-ink-3">
                    {[s.subjectRole, s.exitType === 'vol' ? 'Resignation' : 'Termination', s.leftOn ? `Left ${s.leftOn}` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`ls-chip ${tone}`}>Surprise gap: {g}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Questions({ list, mode }: { list: Q[]; mode: Mode }) {
  return (
    <div className="space-y-3.5">
      {list.map((q) => (
        <div key={q.n} className={`ls-card p-5 ${q.sig ? 'border-ls-blue ring-1 ring-ls-blue' : ''}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {q.sig ? <span className="ls-chip bg-ls-active text-white">★ Coordinated · mirrored</span>
              : <span className="text-[11px] font-bold tracking-wider text-ls-ink-3">{q.n}</span>}
          </div>
          <div className="text-[15px] font-semibold mb-3">{q[mode]}</div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="w-10 text-center text-sm border border-ls-line rounded-lg py-2 text-ls-ink-2">{i}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: string }) {
  return (
    <div className="ls-card p-4">
      <h4 className="font-semibold mb-1.5">{title}</h4>
      <p className="text-[13px] text-ls-ink-2">{children}</p>
    </div>
  );
}
