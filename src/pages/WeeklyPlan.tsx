// Weekly Plan — live, per-user weekly check-in (DD-002 Planning). No scoring, no lock.
import { useEffect, useState } from 'react';
import { Hand } from 'lucide-react';
import { trpc } from '../lib/trpc';

const MOODS = ['😞', '😐', '🙂', '😀', '🤩'];
const MOOD_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Energized'];
const PULSE = ['Disagree', 'Neutral', 'Agree'];

export default function WeeklyPlan() {
  const { data, refetch } = trpc.weeklyPlan.getCurrent.useQuery();
  const save = trpc.weeklyPlan.save.useMutation({ onSuccess: () => refetch() });

  const [priorities, setPriorities] = useState<string[]>(['']);
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [pulse, setPulse] = useState<string | null>(null);

  // Hydrate local form when the server check-in loads/changes.
  useEffect(() => {
    if (!data) return;
    const c = data.checkin;
    setPriorities(c?.priorities?.length ? c.priorities : ['']);
    setWins(c?.wins ?? '');
    setBlockers(c?.blockers ?? '');
    setMood(c?.mood ?? null);
    setPulse(c?.pulseAnswer ?? null);
  }, [data?.weekStart, data?.checkin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekStart = data?.weekStart ?? '';
  const setPriority = (i: number, v: string) => setPriorities((p) => p.map((x, idx) => (idx === i ? v : x)));

  const onSave = () =>
    save.mutate({
      weekStart,
      priorities: priorities.filter((p) => p.trim()),
      wins, blockers, mood, pulseAnswer: pulse, status: 'saved',
    });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Weekly Plan</h1>
            <span className={`ls-chip ${data?.checkin?.status === 'saved' ? 'bg-ls-thrive-bg text-ls-thrive' : 'bg-ls-watch-bg text-ls-watch'}`}>
              {data?.checkin?.status === 'saved' ? 'Saved' : 'In progress · Not submitted'}
            </span>
          </div>
          <p className="text-sm text-ls-ink-3 mt-1.5">Optional weekly check-in — no scoring, no lock.{weekStart ? ` Week of ${weekStart}.` : ''}</p>
        </div>
      </div>

      <section className="ls-card p-5 mt-5">
        <h2 className="font-bold mb-3">Priorities this week</h2>
        <div className="space-y-2.5">
          {priorities.map((p, i) => (
            <input key={i} value={p} onChange={(e) => setPriority(i, e.target.value)} placeholder="Add a priority…"
              className="w-full text-sm border border-ls-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
          ))}
        </div>
        <button onClick={() => setPriorities((p) => [...p, ''])} className="text-sm font-medium text-ls-blue-deep mt-3">+ Add priority</button>
      </section>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <section className="ls-card p-5">
          <h2 className="font-bold mb-3">Wins this week 🎉</h2>
          <textarea value={wins} onChange={(e) => setWins(e.target.value)}
            className="w-full text-sm border border-ls-line rounded-lg px-3 py-2.5 min-h-[96px] focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
        </section>
        <section className="ls-card p-5">
          <h2 className="font-bold mb-3">Challenges / blockers ⚠️</h2>
          <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)}
            className="w-full text-sm border border-ls-line rounded-lg px-3 py-2.5 min-h-[96px] focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
        </section>
      </div>

      <section className="ls-card p-5 mt-4">
        <h2 className="font-bold mb-1">How are you doing?</h2>
        <p className="text-sm text-ls-ink-3 mb-3">A quick mood &amp; energy check — just for you and your manager.</p>
        <div className="flex gap-2.5 flex-wrap">
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setMood(i + 1)}
              className={`flex-1 min-w-[90px] text-center py-3 px-2 rounded-lg border ${mood === i + 1 ? 'border-ls-blue bg-ls-blue-50' : 'border-ls-line bg-white'}`}>
              <div className="text-2xl leading-none">{m}</div>
              <div className={`text-[11px] mt-1.5 ${mood === i + 1 ? 'text-ls-blue-deeper font-semibold' : 'text-ls-ink-3'}`}>{i + 1} · {MOOD_LABELS[i]}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="ls-card p-5 mt-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold">Pulse question</h2>
          <span className="ls-chip bg-ls-bg-2 text-ls-ink-3">Optional · Anonymous</span>
        </div>
        <p className="text-[15px] font-medium my-3">"I have clear goals for the next few months."</p>
        <div className="flex gap-2 flex-wrap">
          {PULSE.map((opt) => (
            <button key={opt} onClick={() => setPulse(opt)}
              className={`ls-chip px-4 py-2 border ${pulse === opt ? 'border-ls-thrive bg-ls-thrive-bg text-ls-thrive font-semibold' : 'border-ls-line text-ls-ink-2'}`}>
              {opt}{pulse === opt ? ' ✓' : ''}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-2.5 mt-5">
        <span className="text-[12px] text-ls-ink-3 mr-auto">Soft and optional — submit whenever you're ready.</span>
        <button onClick={onSave} disabled={save.isPending} className="ls-btn ls-btn-primary">
          <Hand size={15} /> {save.isPending ? 'Saving…' : 'Save check-in'}
        </button>
      </div>
    </div>
  );
}
