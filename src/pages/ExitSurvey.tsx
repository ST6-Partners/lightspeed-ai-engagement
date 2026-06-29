// Exit Survey — full two-part exit diagnostic (DD-002 Engagement).
// List -> detail with savable Part A (employee) + Part B (manager) forms and a
// live HR comparison (surprise gap, mirrored answers, felt-vs-self, surprise
// matrix, auto-flags, coaching brief, anonymity guard). People leave bosses, so
// the questions diagnose manager quality; the signature mechanic is "surprise",
// which flips owner by exit type.
import { useState } from 'react';
import { trpc } from '../lib/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../server/src/router';

type ExitRow = inferRouterOutputs<AppRouter>['exitSurvey']['list'][number];
type Answers = Record<string, number | string>;
type Mode = 'vol' | 'invol';

const ANON_N = 4;
const BEHAVIORS = [
  'Gave clear, direct feedback', 'Recognized good work', 'Cared about growth & development',
  'Removed obstacles / had my back', 'Treated fairly', 'Was someone I could be honest with',
];
const REASONS_VOL = ['Manager / leadership', 'Career growth & opportunity', 'Compensation & benefits', 'The work itself / role', 'Work-life balance', 'Company direction', 'Recognition', 'Relocation / personal', 'Better external offer'];
const REASONS_INVOL = ['Performance', 'Role fit / skills', 'Behavior / conduct', 'Attendance', 'Role eliminated / restructure'];

type QType = 'scale' | 'choice' | 'chips' | 'behaviors' | 'text';
interface Q { key: string; num: string; topic: string; branch: 'shared' | 'adapts' | 'split'; type: QType; sig?: boolean; vol: string; invol: string; lo?: string; hi?: string; volOpts?: string[]; involOpts?: string[]; }

const PART_A: Q[] = [
  { key: 'reason', num: 'Q1', topic: 'Reason', branch: 'adapts', type: 'chips', vol: 'Primary reason for leaving?', invol: 'Your understanding of why you were let go?', volOpts: REASONS_VOL, involOpts: REASONS_INVOL },
  { key: 'pushpull', num: 'Q2', topic: 'Push vs. pull', branch: 'adapts', type: 'choice', vol: 'Which is closer to the truth?', invol: 'Was the decision clearly explained to you?', volOpts: ['Actively looking (pushed)', "Wasn't looking — pulled", 'A specific event decided it'], involOpts: ['Yes — clearly', 'Somewhat — vague', "No — I don't understand why"] },
  { key: 'surprise', num: 'Q3', topic: 'Surprise', branch: 'adapts', type: 'scale', sig: true, vol: 'How surprised do you think your manager was?', invol: 'How surprised were YOU to be let go?', lo: 'Saw it', hi: 'Blindsided' },
  { key: 'concerns', num: 'Q4', topic: 'Warning / concerns', branch: 'adapts', type: 'choice', vol: 'Did you make your concerns known to your manager?', invol: 'Had your manager clearly told you your job was at risk?', volOpts: ['Yes — clearly & more than once', 'I hinted, never directly', "No — didn't feel safe", 'Nothing to raise'], involOpts: ['Yes — clearly & more than once', 'Hinted, never directly', 'No — first I am hearing it'] },
  { key: 'behaviors', num: 'Q5', topic: 'Manager behaviors', branch: 'shared', type: 'behaviors', vol: 'How well did your manager do each of these? (1 rarely · 5 consistently)', invol: 'How well did your manager do each of these? (1 rarely · 5 consistently)' },
  { key: 'stood', num: 'Q6', topic: 'Knew where you stood', branch: 'shared', type: 'scale', vol: 'Did you always know where you stood — performance & growth?', invol: 'Did you always know where you stood — performance & growth?', lo: 'Never', hi: 'Always' },
  { key: 'course', num: 'Q7', topic: 'Course-correct', branch: 'adapts', type: 'choice', vol: 'A conversation that could have changed your mind?', invol: 'A real chance to course-correct (a clear plan)?', volOpts: ['Yes — nearly worked', 'Tried, too late', 'No one tried', 'Nothing could have'], involOpts: ['Yes — clear plan, had time', 'A plan, but unrealistic', 'No real chance'] },
  { key: 'enps', num: 'Q8', topic: 'Manager eNPS', branch: 'shared', type: 'scale', sig: true, vol: 'Would you work for this manager again?', invol: 'Would you work for this manager again?', lo: 'No way', hi: 'Absolutely' },
  { key: 'timeline', num: 'Q9', topic: 'Timeline', branch: 'adapts', type: 'chips', vol: 'When did you first start thinking about leaving?', invol: 'When were you first told there was a problem?', volOpts: ['This month', '1–3 months', '3–6 months', '6–12 months', 'Over a year'], involOpts: ['Only today', 'Past 2 weeks', 'Past month', 'Past quarter', 'Never until now'] },
  { key: 'safety', num: 'Q10', topic: 'Psychological safety', branch: 'shared', type: 'scale', vol: 'Did you feel safe raising problems on this team?', invol: 'Did you feel safe raising problems on this team?', lo: 'Not at all', hi: 'Completely' },
  { key: 'open', num: 'Q11', topic: 'Open text', branch: 'adapts', type: 'text', vol: 'One thing your manager could have done differently?', invol: 'One thing that, handled differently, might have changed this?' },
  { key: 'closing', num: 'Q12', topic: 'Closing', branch: 'split', type: 'scale', vol: 'Would you consider returning someday?', invol: 'Did this process feel fair?', lo: 'Never', hi: 'Definitely' },
];
const PART_B: Q[] = [
  { key: 'surprise', num: 'M1', topic: 'Surprise', branch: 'adapts', type: 'scale', sig: true, vol: 'How surprised were you by this resignation?', invol: 'How surprised do you think they were to be let go?', lo: 'Saw it', hi: 'Blindsided' },
  { key: 'awareness', num: 'M2', topic: 'Awareness / warning', branch: 'adapts', type: 'choice', vol: 'Had you identified them as a flight risk?', invol: 'Had you clearly told them their job was at risk?', volOpts: ["Yes — and I'd flagged it", 'Yes — kept it to myself', 'A vague sense', 'No — out of nowhere'], involOpts: ['Yes — clearly & more than once', 'I raised it, softly', 'No — not explicitly'] },
  { key: 'reason', num: 'M3', topic: 'Reason read', branch: 'adapts', type: 'chips', vol: 'What do you believe is their reason for leaving?', invol: 'Primary reason for the termination?', volOpts: REASONS_VOL, involOpts: REASONS_INVOL },
  { key: 'behaviors', num: 'M4', topic: 'Own behaviors', branch: 'shared', type: 'behaviors', vol: 'Honestly — how consistently did you do each of these? (1 rarely · 5 consistently)', invol: 'Honestly — how consistently did you do each of these? (1 rarely · 5 consistently)' },
  { key: 'cadence', num: 'M5', topic: '1:1 cadence', branch: 'shared', type: 'chips', vol: 'How regularly were you having real 1:1s?', invol: 'How regularly were you having real 1:1s?', volOpts: ['Weekly', 'Every 2 weeks', 'Monthly', 'Sporadically', 'Rarely / never'], involOpts: ['Weekly', 'Every 2 weeks', 'Monthly', 'Sporadically', 'Rarely / never'] },
  { key: 'lastFeedback', num: 'M6', topic: 'Last direct feedback', branch: 'shared', type: 'chips', vol: 'When did you last give clear, direct feedback?', invol: 'When did you last give clear, direct feedback?', volOpts: ['Past 2 weeks', 'Past month', 'Past quarter', 'Longer ago', 'Not sure I did'], involOpts: ['Past 2 weeks', 'Past month', 'Past quarter', 'Longer ago', 'Not sure I did'] },
  { key: 'intervention', num: 'M7', topic: 'Intervention', branch: 'adapts', type: 'choice', vol: 'Did you attempt a stay conversation / retention case?', invol: 'Was there a documented improvement plan (PIP)?', volOpts: ['Yes, before they resigned', 'Yes, but after notice', "No — wouldn't have mattered", "No — didn't see it in time"], involOpts: ['Yes — formal plan with time', 'Yes — brief or late', 'No formal plan'] },
  { key: 'regret', num: 'M8', topic: 'Reflection', branch: 'adapts', type: 'scale', sig: true, vol: 'Is this a regretted departure?', invol: 'Could earlier, clearer feedback have changed this?', lo: 'No', hi: 'Definitely' },
  { key: 'hindsight', num: 'M9', topic: 'Hindsight', branch: 'shared', type: 'text', vol: 'Looking back, what could have changed the outcome?', invol: 'Looking back, what could have changed the outcome?' },
  { key: 'pattern', num: 'M10', topic: 'Pattern check', branch: 'shared', type: 'choice', vol: 'First departure from your team in 12 months?', invol: 'First departure from your team in 12 months?', volOpts: ['Yes, first one', 'Second', 'Third or more'], involOpts: ['Yes, first one', 'Second', 'Third or more'] },
];

const num = (a: Answers | null | undefined, k: string) => (a && typeof a[k] === 'number' ? (a[k] as number) : 0);
const str = (a: Answers | null | undefined, k: string) => (a && a[k] != null ? String(a[k]) : '');
const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const surpriseGap = (r: ExitRow) => (r.surpriseEmployee != null && r.surpriseManager != null ? Math.abs(r.surpriseEmployee - r.surpriseManager) : null);
const BRANCH_LABEL: Record<string, [string, string]> = { shared: ['Shared', 'bg-ls-thrive-bg text-ls-thrive'], adapts: ['Adapts', 'bg-ls-watch-bg text-ls-watch'], split: ['Type-specific', 'bg-ls-blue-50 text-ls-blue-deep'] };

export default function ExitSurvey() {
  const { data, refetch } = trpc.exitSurvey.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  if (selected) return <Detail record={selected} all={rows} onBack={() => setSelectedId(null)} refetch={refetch} />;
  return <ListView rows={rows} refetch={refetch} onOpen={setSelectedId} />;
}

// ---------------- LIST ----------------
function ListView({ rows, refetch, onOpen }: { rows: ExitRow[]; refetch: () => void; onOpen: (id: string) => void }) {
  const create = trpc.exitSurvey.create.useMutation({ onSuccess: () => { setName(''); setRole(''); setMgr(''); refetch(); } });
  const [name, setName] = useState(''); const [role, setRole] = useState(''); const [mgr, setMgr] = useState(''); const [type, setType] = useState<Mode>('vol');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ls-eyebrow mb-1">Engagement</div>
      <h1 className="text-2xl font-bold tracking-tight">Exit Survey</h1>
      <p className="text-sm text-ls-ink-3 mb-5">A two-part exit diagnostic — departing employee and manager — built for side-by-side comparison. Click any row to open the full record: both completed forms and the HR comparison.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Card title="Mirrored pairs">Every diagnostic question on Part A has a twin on Part B. Built for comparison, not collection.</Card>
        <Card title="Manager-quality core">The behavior block — feedback, recognition, growth, fairness, honesty — is identical in both permutations.</Card>
        <Card title="Surprise, flipped by type">A blindsided manager (resignation) and a blindsided employee (termination) are the same diagnosis. The gap is the signal.</Card>
      </div>

      <div className="ls-card p-4 mb-5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-3">New exit diagnostic</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Departing person's name…" className="text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" className="text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
          <input value={mgr} onChange={(e) => setMgr(e.target.value)} placeholder="Manager (optional)" className="text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex bg-ls-bg-2 rounded-full p-1 gap-1">
            {(['vol', 'invol'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setType(m)} className={`text-[13px] font-semibold px-4 py-1.5 rounded-full ${type === m ? 'bg-ls-active text-white' : 'text-ls-ink-2'}`}>{m === 'vol' ? 'Voluntary · Resignation' : 'Involuntary · Termination'}</button>
            ))}
          </div>
          <button disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ subjectName: name.trim(), subjectRole: role.trim() || undefined, managerName: mgr.trim() || undefined, exitType: type })} className="ls-btn ls-btn-primary disabled:opacity-50">Create exit</button>
        </div>
      </div>

      <div className="font-semibold mb-2">All exits</div>
      <div className="ls-card overflow-hidden">
        {rows.length === 0 && <div className="text-sm text-ls-ink-3 p-8 text-center">No exit diagnostics yet — create one above.</div>}
        {rows.map((s) => {
          const g = surpriseGap(s);
          const tone = g == null ? 'bg-ls-bg-2 text-ls-ink-3' : g >= 3 ? 'bg-ls-risk-bg text-ls-risk' : g === 2 ? 'bg-ls-watch-bg text-ls-watch' : 'bg-ls-thrive-bg text-ls-thrive';
          const st = s.status === 'complete' ? 'Ready to review' : s.status === 'part_a_done' ? 'In progress' : 'Initiated';
          return (
            <div key={s.id} className="flex items-center gap-3 p-4 border-b border-ls-line last:border-0 hover:bg-ls-blue-50 cursor-pointer" onClick={() => onOpen(s.id)}>
              <div className="w-10 h-10 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center font-bold shrink-0">{initials(s.subjectName)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{s.subjectName}</div>
                <div className="text-[12px] text-ls-ink-3">{[s.subjectRole, s.exitType === 'vol' ? 'Resignation' : 'Termination', s.managerName].filter(Boolean).join(' · ')}</div>
              </div>
              <span className="ls-chip bg-ls-bg-2 text-ls-ink-2">{st}</span>
              <span className={`ls-chip ${tone}`}>{g == null ? 'surprise —' : `surprise gap ${g}`}</span>
              <button onClick={(e) => { e.stopPropagation(); onOpen(s.id); }} className="ls-btn ls-btn-ghost text-[13px]">Open →</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- DETAIL ----------------
const DTABS = ['Overview', 'Part A · Employee', 'Part B · Manager', 'Comparison'] as const;
type DTab = (typeof DTABS)[number];

function Detail({ record, all, onBack, refetch }: { record: ExitRow; all: ExitRow[]; onBack: () => void; refetch: () => void }) {
  const [tab, setTab] = useState<DTab>('Overview');
  const remove = trpc.exitSurvey.remove.useMutation({ onSuccess: () => { refetch(); onBack(); } });
  const vol = record.exitType === 'vol';
  const aDone = !!record.partA && Object.keys(record.partA).length > 0;
  const bDone = !!record.partB && Object.keys(record.partB).length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-sm text-ls-blue font-semibold mb-3">‹ All exits</button>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-12 h-12 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center font-bold shrink-0">{initials(record.subjectName)}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{record.subjectName}</h1>
          <p className="text-sm text-ls-ink-3">{[record.subjectRole, vol ? 'Resignation' : 'Termination', record.managerName ? `reports to ${record.managerName}` : null].filter(Boolean).join(' · ')}</p>
        </div>
        <button onClick={() => { if (confirm('Delete this exit record?')) remove.mutate({ id: record.id }); }} className="ls-btn ls-btn-ghost text-[13px] text-ls-risk">Delete</button>
      </div>

      <div className="flex gap-1 border-b border-ls-line mb-5 mt-3 flex-wrap">
        {DTABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm font-semibold px-3.5 py-2.5 -mb-px border-b-2 ${tab === t ? 'text-ls-blue-deep border-ls-blue' : 'text-ls-ink-3 border-transparent hover:text-ls-ink-2'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <StatusCard title="Part A · Employee" done={aDone} blurb="Confidential to the People Team." onClick={() => setTab('Part A · Employee')} />
          <StatusCard title="Part B · Manager" done={bDone} blurb="Asked first, within 24h, before seeing Part A." onClick={() => setTab('Part B · Manager')} />
          <div className="ls-card p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-1"><h3 className="font-bold">Comparison</h3><span className={`ls-chip ${aDone && bDone ? 'bg-ls-blue-50 text-ls-blue-deep' : 'bg-ls-bg-2 text-ls-ink-3'}`}>{aDone && bDone ? 'Ready' : 'Needs both responses'}</span></div>
            <p className="text-sm text-ls-ink-2">{aDone && bDone ? 'Both responses are in — open the comparison for divergence, the surprise quadrant, and the coaching brief.' : 'The comparison unlocks once both Part A and Part B are saved.'}</p>
            {aDone && bDone && <button onClick={() => setTab('Comparison')} className="ls-btn ls-btn-primary mt-3 text-[13px]">Open comparison →</button>}
          </div>
        </div>
      )}
      {tab === 'Part A · Employee' && <SurveyForm record={record} part="A" refetch={refetch} />}
      {tab === 'Part B · Manager' && <SurveyForm record={record} part="B" refetch={refetch} />}
      {tab === 'Comparison' && <Comparison record={record} all={all} />}
    </div>
  );
}

function StatusCard({ title, done, blurb, onClick }: { title: string; done: boolean; blurb: string; onClick: () => void }) {
  return (
    <div className="ls-card p-5">
      <div className="flex items-center justify-between mb-1"><h3 className="font-bold">{title}</h3><span className={`ls-chip ${done ? 'bg-ls-thrive-bg text-ls-thrive' : 'bg-ls-bg-2 text-ls-ink-3'}`}>{done ? 'Completed' : 'Awaiting'}</span></div>
      <p className="text-sm text-ls-ink-2 mb-3">{blurb}</p>
      <button onClick={onClick} className={`ls-btn text-[13px] ${done ? 'ls-btn-ghost' : 'ls-btn-primary'}`}>{done ? 'View / edit response' : 'Record response'}</button>
    </div>
  );
}

// ---------------- SURVEY FORM ----------------
function SurveyForm({ record, part, refetch }: { record: ExitRow; part: 'A' | 'B'; refetch: () => void }) {
  const qs = part === 'A' ? PART_A : PART_B;
  const vol = record.exitType === 'vol';
  const initial = (part === 'A' ? record.partA : record.partB) ?? {};
  const [vals, setVals] = useState<Answers>({ ...initial });
  const save = trpc.exitSurvey.saveResponse.useMutation({ onSuccess: () => refetch() });
  const set = (k: string, v: number | string) => setVals((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="ls-card p-3 mb-4 text-[13px] text-ls-ink-2">{part === 'A' ? '🔒 Confidential — the manager never sees these individual answers.' : '⏱️ Complete within 24h of notice, before reviewing the employee\'s responses.'}</div>
      <p className="text-sm text-ls-ink-3 mb-4">Part {part} · <b>{vol ? 'Voluntary (Resignation)' : 'Involuntary (Termination)'}</b> version. Edit and save; the comparison recomputes.</p>
      <div className="space-y-3.5">
        {qs.map((q) => {
          const text = vol ? q.vol : q.invol;
          const opts = (vol ? q.volOpts : q.involOpts) ?? [];
          const [bl, bcls] = BRANCH_LABEL[q.branch];
          return (
            <div key={q.key} className={`ls-card p-5 ${q.sig ? 'border-ls-blue ring-1 ring-ls-blue' : ''}`}>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] font-bold tracking-wider text-ls-ink-3">{q.num}</span>
                {q.sig && <span className="ls-chip bg-ls-active text-white">★ Coordinated</span>}
                <span className={`ls-chip ${bcls}`}>{bl}</span>
                <span className="text-[12px] text-ls-ink-3">{q.topic}</span>
              </div>
              <div className="text-[15px] font-semibold mb-3">{text}</div>
              {q.type === 'scale' && (
                <div>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} onClick={() => set(q.key, i)} className={`w-12 text-center text-sm border rounded-lg py-2 ${num(vals, q.key) === i ? 'border-ls-blue bg-ls-blue-50 text-ls-blue-deep font-bold' : 'border-ls-line text-ls-ink-2 hover:border-ls-blue'}`}>{i}</button>
                    ))}
                  </div>
                  {(q.lo || q.hi) && <div className="flex justify-between text-[11px] text-ls-ink-3 mt-1.5 w-[19rem] max-w-full"><span>{q.lo}</span><span>{q.hi}</span></div>}
                </div>
              )}
              {q.type === 'choice' && (
                <div className="space-y-2">
                  {opts.map((o) => (
                    <button key={o} onClick={() => set(q.key, o)} className={`w-full text-left text-sm border rounded-lg px-3.5 py-2.5 ${str(vals, q.key) === o ? 'border-ls-blue bg-ls-blue-50' : 'border-ls-line hover:border-ls-blue'}`}>{o}</button>
                  ))}
                </div>
              )}
              {q.type === 'chips' && (
                <div className="flex gap-2 flex-wrap">
                  {opts.map((o) => (
                    <button key={o} onClick={() => set(q.key, o)} className={`text-[13px] border rounded-full px-3.5 py-2 ${str(vals, q.key) === o ? 'border-ls-blue bg-ls-blue-50 text-ls-blue-deep font-semibold' : 'border-ls-line hover:border-ls-blue'}`}>{o}</button>
                  ))}
                </div>
              )}
              {q.type === 'behaviors' && (
                <div className="space-y-2.5">
                  {BEHAVIORS.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="flex-1 text-[13.5px]">{b}</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => set('b' + i, n)} className={`w-9 text-center text-sm border rounded-lg py-1.5 ${num(vals, 'b' + i) === n ? 'border-ls-blue bg-ls-blue-50 text-ls-blue-deep font-bold' : 'border-ls-line text-ls-ink-2 hover:border-ls-blue'}`}>{n}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'text' && (
                <textarea value={str(vals, q.key)} onChange={(e) => set(q.key, e.target.value)} rows={3} placeholder="Goes to HR." className="w-full text-sm border border-ls-line rounded-lg px-3 py-2 focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button disabled={save.isPending} onClick={() => save.mutate({ id: record.id, part, answers: vals, surprise: num(vals, 'surprise') || undefined })} className="ls-btn ls-btn-primary disabled:opacity-50">{(part === 'A' ? record.partA : record.partB) ? 'Update response' : 'Save response'}</button>
        {save.isSuccess && <span className="ls-chip bg-ls-thrive-bg text-ls-thrive">Saved</span>}
      </div>
    </div>
  );
}

// ---------------- COMPARISON ----------------
function Comparison({ record, all }: { record: ExitRow; all: ExitRow[] }) {
  const vol = record.exitType === 'vol';
  const A = record.partA; const B = record.partB;
  if (!A || !B || !Object.keys(A).length || !Object.keys(B).length) {
    return <div className="ls-card p-8 text-center text-sm text-ls-ink-3">The comparison unlocks once both Part A and Part B are saved.</div>;
  }
  const se = record.surpriseEmployee ?? num(A, 'surprise');
  const sm = record.surpriseManager ?? num(B, 'surprise');
  const gap = Math.abs(se - sm);
  const redFlag = gap >= 3;
  const reasonMatch = str(A, 'reason') === str(B, 'reason');
  const fb = (k: 'A' | 'B', i: number) => num(k === 'A' ? A : B, 'b' + i);
  const mgrCount = all.filter((r) => r.managerName && r.managerName === record.managerName).length;

  const rows: Array<[string, string, string, 'align' | 'partial' | 'div']> = [
    ['Primary reason', str(A, 'reason') || '—', str(B, 'reason') || '—', reasonMatch ? 'align' : 'div'],
    [vol ? 'Manager surprised?' : 'Employee surprised?', `${se}/5`, `${sm}/5`, redFlag ? 'div' : gap === 2 ? 'partial' : 'align'],
    ['Concerns surfaced vs. heard', str(A, 'concerns') || '—', str(B, 'awareness') || '—', str(A, 'concerns').startsWith('Yes') && str(B, 'awareness').startsWith('No') ? 'div' : 'partial'],
    ['Gave clear, direct feedback', `${fb('A', 0)}/5`, `${fb('B', 0)}/5`, Math.abs(fb('A', 0) - fb('B', 0)) >= 2 ? 'div' : 'align'],
    [vol ? 'Intervention attempted' : 'Chance to course-correct', str(A, 'course') || '—', str(B, 'intervention') || '—', 'partial'],
    ['Manager eNPS / regret', `Work again: ${num(A, 'enps') || '—'}/5`, `${vol ? 'Regret' : 'Feedback-fix'}: ${num(B, 'regret') || '—'}/5`, 'align'],
  ];
  const toneCls = (t: string) => t === 'align' ? 'bg-ls-thrive-bg text-ls-thrive' : t === 'partial' ? 'bg-ls-watch-bg text-ls-watch' : 'bg-ls-risk-bg text-ls-risk';
  const toneLbl = (t: string) => t === 'align' ? 'Aligned' : t === 'partial' ? 'Partial' : 'Divergent';

  const flags: Array<[string, string]> = [];
  if (redFlag) flags.push(['Surprise gap', `A ${gap}-point gap between the two stories — the signature of feedback that wasn't landing.`]);
  if (!reasonMatch) flags.push(['Reason mismatch', `Employee: "${str(A, 'reason')}" · Manager: "${str(B, 'reason')}". Managers under-attribute exits to themselves.`]);
  if (Math.abs(fb('A', 0) - fb('B', 0)) >= 2) flags.push(['Feedback blind spot', `Manager self-rates feedback ${fb('B', 0)}/5; employee felt ${fb('A', 0)}/5.`]);

  return (
    <div className="space-y-5">
      <div className={`ls-card p-3 text-[13px] ${mgrCount >= ANON_N ? 'text-ls-ink-2' : 'border-l-4 border-ls-watch text-ls-ink-2'}`}>
        🔒 <b>Anonymity guard.</b> {record.managerName || 'This manager'} has {mgrCount} exit{mgrCount === 1 ? '' : 's'} on record. {mgrCount >= ANON_N ? `At or above the n=${ANON_N} threshold — aggregate manager-level findings may be shared with the manager.` : `Below the n=${ANON_N} threshold — raw routes to HR + skip-level only; treat as named, confidential coaching.`}
      </div>

      <div className={`ls-card p-5 ${redFlag ? 'border-l-4 border-ls-risk' : 'border-l-4 border-ls-thrive'}`}>
        <span className={`ls-chip ${redFlag ? 'bg-ls-risk-bg text-ls-risk' : 'bg-ls-thrive-bg text-ls-thrive'}`}>{redFlag ? 'Surprise quadrant · Manager red flag' : 'Surprise reading'}</span>
        <h3 className="text-lg font-bold mt-2">{vol ? (redFlag ? 'Employee expected it — manager was blindsided.' : 'Surprise levels are broadly aligned.') : (redFlag ? 'Manager claims clear feedback — employee was blindsided.' : 'Surprise levels are broadly aligned.')}</h3>
        <div className="flex gap-7 mt-4 flex-wrap items-center">
          <div><div className="text-[11px] uppercase tracking-wide text-ls-ink-3">{vol ? 'Employee → manager surprise' : 'Employee → own surprise'}</div><div className="text-3xl font-extrabold text-ls-blue-deep">{se} / 5</div></div>
          <div className="self-center text-ls-risk font-semibold">→ gap {gap} →</div>
          <div><div className="text-[11px] uppercase tracking-wide text-ls-ink-3">{vol ? 'Manager → own surprise' : "Manager → employee's surprise"}</div><div className="text-3xl font-extrabold text-ls-blue">{sm} / 5</div></div>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Mirrored answers, side by side</h3>
        <div className="ls-card overflow-hidden">
          {rows.map(([q, e, m, t], i) => (
            <div key={i} className="p-3.5 border-b border-ls-line last:border-0">
              <div className="text-[13px] font-semibold text-ls-ink-2 mb-1.5">{q}</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-sm text-ls-blue-deep">{e}</div>
                <span className={`ls-chip ${toneCls(t)}`}>{toneLbl(t)}</span>
                <div className="flex-1 text-sm text-right">{m}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Manager behavior — felt vs. self-reported</h3>
        <div className="ls-card p-5 space-y-3">
          {BEHAVIORS.map((b, i) => {
            const e = fb('A', i); const m = fb('B', i); const g = Math.abs(e - m); const fl = g >= 2;
            return (
              <div key={i} className={fl ? 'border border-ls-risk-bg rounded-lg p-2.5 bg-ls-risk-bg/40' : ''}>
                <div className="flex justify-between text-[13px] mb-1"><span>{b}</span><span className={fl ? 'text-ls-risk font-bold' : 'text-ls-ink-3'}>{fl ? '▲ ' : ''}gap {g}</span></div>
                <div className="flex items-center gap-2 text-[11px]"><span className="w-14 text-right text-ls-ink-3">Felt {e}</span><div className="flex-1 h-2 rounded-full bg-ls-bg-2 overflow-hidden"><div className="h-full bg-ls-blue" style={{ width: `${e / 5 * 100}%` }} /></div></div>
                <div className="flex items-center gap-2 text-[11px] mt-1"><span className="w-14 text-right text-ls-ink-3">Self {m}</span><div className="flex-1 h-2 rounded-full bg-ls-bg-2 overflow-hidden"><div className="h-full bg-ls-blue/60" style={{ width: `${m / 5 * 100}%` }} /></div></div>
              </div>
            );
          })}
          <p className="text-[12px] text-ls-ink-3">Flag threshold is a gap of 2+ (highlighted), especially feedback and honesty.</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Auto-flagged findings</h3>
        {flags.length === 0 && <p className="text-sm text-ls-ink-3">No automated flags — the two stories largely agree.</p>}
        {flags.map(([h, p], i) => (
          <div key={i} className="ls-card p-4 mb-2 border-l-4 border-ls-risk"><h4 className="font-semibold text-[14px]">{h}</h4><p className="text-[13px] text-ls-ink-2">{p}</p></div>
        ))}
      </div>

      <div className="ls-card p-5 bg-ls-blue-50">
        <div className="text-[11px] uppercase tracking-wide text-ls-ink-3 mb-1">Auto-routed to · {record.managerName || 'the manager'}'s skip-level</div>
        <h3 className="font-bold mb-2">Coaching brief — not a verdict</h3>
        <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] text-ls-ink-2">
          <li><b>Pattern:</b> {redFlag ? `a departure the ${vol ? 'manager' : 'employee'} didn't see coming (gap ${gap}).` : 'an exit with aligned expectations.'}</li>
          <li><b>Root behavior:</b> last direct feedback "{str(B, 'lastFeedback') || '—'}"; employee rated feedback {fb('A', 0)}/5.</li>
          <li><b>Coach toward:</b> a real 1:1 cadence and a monthly "where you stand" conversation, so no future exit is a surprise.</li>
          <li><b>Calibration:</b> feed this exit back into the continual-signals flight-risk model.</li>
        </ul>
      </div>
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
