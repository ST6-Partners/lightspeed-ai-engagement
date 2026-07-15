// Weekly Plan — live, per-user weekly check-in (DD-002 Planning). No scoring, no lock.
import { useEffect, useRef, useState } from 'react';
import { Hand, Link2, X, Trash2, Pencil } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { fmtDate } from '../lib/date';
import { fireConfetti } from '../lib/confetti';

const MOODS = ['😞', '😐', '🙂', '😀', '🤩'];
const MOOD_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Energized'];
const PULSE = ['Disagree', 'Neutral', 'Agree'];

type Priority = { text: string; okrNodeId: string | null; done?: boolean };

// One objective with its key-result children, for the grouped OKR picker.
type OkrGroup = {
  objective: { id: string; title: string };
  keyResults: { id: string; title: string }[];
};

export default function WeeklyPlan() {
  const { data, refetch } = trpc.weeklyPlan.getCurrent.useQuery();
  const save = trpc.weeklyPlan.save.useMutation({ onSuccess: () => refetch() });
  const { data: okrs, refetch: refetchOkrs } = trpc.okrs.list.useQuery();
  const updateOkr = trpc.okrs.update.useMutation({ onSuccess: () => refetchOkrs() });
  const { data: ciPriorities } = trpc.checkins.myLatestPriorities.useQuery();

  const [priorities, setPriorities] = useState<Priority[]>([{ text: '', okrNodeId: null }]);
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [pulse, setPulse] = useState<string | null>(null);
  const [addedCi, setAddedCi] = useState<Set<number>>(new Set());

  // Which picker is open: 'add' for the Add-priority button, or a row index for a row's link control.
  const [picker, setPicker] = useState<'add' | number | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Hydrate local form when the server check-in loads/changes.
  useEffect(() => {
    if (!data) return;
    const c = data.checkin;
    const raw = c?.priorities ?? [];
    const norm: Priority[] = raw.map((p: string | { text: string; okrNodeId?: string | null; done?: boolean }) =>
      typeof p === 'string' ? { text: p, okrNodeId: null, done: false } : { text: p.text, okrNodeId: p.okrNodeId ?? null, done: p.done ?? false },
    );
    setPriorities(norm.length ? norm : [{ text: '', okrNodeId: null }]);
    setWins(c?.wins ?? '');
    setBlockers(c?.blockers ?? '');
    setMood(c?.mood ?? null);
    setPulse(c?.pulseAnswer ?? null);
  }, [data?.weekStart, data?.checkin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close any open picker on outside click.
  useEffect(() => {
    if (picker === null) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPicker(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [picker]);

  const weekStart = data?.weekStart ?? '';

  // Non-archived objectives + key results, grouped by objective.
  const active = (okrs ?? []).filter((n) => !n.archivedAt);
  const groups: OkrGroup[] = active
    .filter((n) => n.type === 'objective')
    .map((obj) => ({
      objective: { id: obj.id, title: obj.title },
      keyResults: active
        .filter((n) => n.type === 'key_result' && n.parentId === obj.id)
        .map((kr) => ({ id: kr.id, title: kr.title })),
    }));
  const nodeTitle = (id: string | null): string | null => {
    if (!id) return null;
    const n = active.find((x) => x.id === id);
    return n ? n.title : null;
  };

  const setText = (i: number, v: string) =>
    setPriorities((p) => p.map((x, idx) => (idx === i ? { ...x, text: v } : x)));
  const setLink = (i: number, id: string | null) =>
    setPriorities((p) => p.map((x, idx) => (idx === i ? { ...x, okrNodeId: id } : x)));
  const setDone = (i: number, v: boolean) =>
    setPriorities((p) => p.map((x, idx) => (idx === i ? { ...x, done: v } : x)));
  const okrDone = (id: string | null) => !!id && (okrs ?? []).find((n) => n.id === id)?.status === 'complete';
  const toggleLinked = (id: string, done: boolean) => updateOkr.mutate({ id, status: done ? 'complete' : 'not_started' });
  const removeRow = (i: number) => setPriorities((p) => p.filter((_, idx) => idx !== i));
  const addOwn = () => setPriorities((p) => [...p, { text: '', okrNodeId: null }]);
  const addFromNode = (id: string, title: string) =>
    setPriorities((p) => [...p, { text: title, okrNodeId: id }]);
  const addCiOne = (i: number, text: string) => { setPriorities((p) => [...p, { text, okrNodeId: null }]); setAddedCi((sx) => new Set(sx).add(i)); };
  const addCiAll = () => {
    const items = ciPriorities?.items ?? [];
    const toAdd = items.filter((_, i) => !addedCi.has(i));
    if (toAdd.length) setPriorities((p) => [...p, ...toAdd.map((t) => ({ text: t, okrNodeId: null }))]);
    setAddedCi(new Set(items.map((_, i) => i)));
  };

  const onSave = () =>
    save.mutate({
      weekStart,
      priorities: priorities
        .filter((p) => p.text.trim() || p.okrNodeId)
        .map((p) => ({ text: p.text, okrNodeId: p.okrNodeId, done: p.done ?? false })),
      wins, blockers, mood, pulseAnswer: pulse, status: 'saved',
    });

  // Shared grouped OKR menu. `onPick` receives the chosen node id + title.
  // `withWriteOwn` adds the "Write my own…" item (used by the Add-priority dropdown).
  const okrMenu = (onPick: (id: string, title: string) => void, withWriteOwn: boolean) => (
    <div
      ref={pickerRef}
      className="absolute z-20 mt-1 w-72 max-h-80 overflow-auto ls-card p-1.5 shadow-lg border border-ls-line bg-white rounded-lg"
    >
      {withWriteOwn && (
        <>
          <button
            onClick={() => { addOwn(); setPicker(null); }}
            className="w-full text-left text-sm px-2.5 py-2 rounded-md hover:bg-ls-bg-2"
          >
            ✏️ Write my own…
          </button>
          <div className="border-t border-ls-line my-1.5" />
        </>
      )}
      {groups.length === 0 ? (
        <div className="text-xs text-ls-ink-3 px-2.5 py-2">No OKRs yet.</div>
      ) : (
        groups.map((g) => (
          <div key={g.objective.id} className="py-0.5">
            <button
              onClick={() => { onPick(g.objective.id, g.objective.title); setPicker(null); }}
              className="w-full text-left text-sm font-bold px-2.5 py-1.5 rounded-md hover:bg-ls-bg-2"
            >
              {g.objective.title}
            </button>
            {g.keyResults.map((kr) => (
              <button
                key={kr.id}
                onClick={() => { onPick(kr.id, kr.title); setPicker(null); }}
                className="w-full text-left text-sm px-2.5 py-1.5 pl-6 rounded-md hover:bg-ls-bg-2 text-ls-ink-2"
              >
                {kr.title}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );

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

      {ciPriorities && ciPriorities.items.length > 0 && (
        <section className="ls-card p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="font-bold">Priorities from check-in</h2>
            <button onClick={addCiAll} className="text-sm font-medium text-ls-blue-deep hover:underline whitespace-nowrap">+ Add all to my priorities</button>
          </div>
          <p className="text-sm text-ls-ink-3 mb-3">From your check-in on {fmtDate(ciPriorities.weekOf)} — add any of these to your plan below.</p>
          <ul className="space-y-2">
            {ciPriorities.items.map((it, i) => {
              const added = addedCi.has(i);
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-ls-ink-3 shrink-0">•</span>
                  <span className="flex-1 text-sm text-ls-ink">{it}</span>
                  <button disabled={added} onClick={() => addCiOne(i, it)}
                    className={`text-sm font-medium inline-flex items-center gap-1 whitespace-nowrap ${added ? 'text-ls-thrive' : 'text-ls-blue-deep hover:underline'}`}>
                    {added ? '✓ Added' : '+ add to my priorities'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="ls-card p-5 mt-5">
        <h2 className="font-bold mb-3">Priorities this week</h2>
        {(data?.assigned?.length ?? 0) > 0 && (
          <div className="space-y-2 mb-3">
            {data!.assigned.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                <span className="ls-chip inline-flex items-center whitespace-nowrap"
                  style={{ background: '#f3e8ff', color: '#6d28d9', fontWeight: 600 }}>
                  Assigned by {a.assignedByName ?? 'your manager'}
                </span>
                <span className="flex-1 text-sm" style={{ color: '#1a1a2e' }}>{a.label}</span>
                <span className="text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}
                  title="Set by your manager in the Organization screen - managed there, not editable here">
                  manager-assigned
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2.5">
          {priorities.map((p, i) => {
            const linked = nodeTitle(p.okrNodeId);
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={p.okrNodeId ? okrDone(p.okrNodeId) : !!p.done}
                  onChange={(e) => { const v = e.target.checked; if (p.okrNodeId) toggleLinked(p.okrNodeId, v); else setDone(i, v); if (v) fireConfetti(); }}
                  title={p.okrNodeId ? 'Mark this OKR complete' : 'Mark done'}
                  className="w-4 h-4 shrink-0 accent-ls-blue-deep cursor-pointer"
                />
                <input
                  value={p.text}
                  onChange={(e) => setText(i, e.target.value)}
                  placeholder="Add a priority…"
                  className={`flex-1 text-sm border border-ls-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50 ${(p.okrNodeId ? okrDone(p.okrNodeId) : p.done) ? 'line-through text-ls-ink-3' : ''}`}
                />
                {linked ? (
                  <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep inline-flex items-center gap-1 whitespace-nowrap">
                    🔗 {linked}
                    <button onClick={() => setLink(i, null)} aria-label="Unlink OKR" className="text-ls-blue-deep">
                      <X size={13} />
                    </button>
                  </span>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setPicker(picker === i ? null : i)}
                      className="text-sm font-medium text-ls-blue-deep inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Link2 size={14} /> link to OKR
                    </button>
                    {picker === i && okrMenu((id) => setLink(i, id), false)}
                  </div>
                )}
                <button onClick={() => removeRow(i)} aria-label="Remove priority" className="text-ls-ink-3 hover:text-ls-watch">
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="relative inline-block mt-3">
          <button
            onClick={() => setPicker(picker === 'add' ? null : 'add')}
            className="text-sm font-medium text-ls-blue-deep inline-flex items-center gap-1"
          >
            <Pencil size={14} /> + Add priority
          </button>
          {picker === 'add' && okrMenu((id, title) => addFromNode(id, title), true)}
        </div>
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
