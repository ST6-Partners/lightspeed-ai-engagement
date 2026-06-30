import { useEffect, useRef, useState } from 'react';
import { trpc } from '../lib/trpc';
import { Plus, Trash2, Link2, X, ChevronDown, PenLine } from 'lucide-react';
import type { PlanItem } from '../components/planning/PlanItemForm';

// ---- helpers --------------------------------------------------------------

/** Returns the current week's Monday as a YYYY-MM-DD string. */
function currentMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun .. 6=Sat
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Flatten the plan tree to objective + key_result items, for the link chip lookup. */
function flattenLinkable(nodes: PlanItem[] | undefined): PlanItem[] {
  const out: PlanItem[] = [];
  const walk = (list: PlanItem[]) => {
    for (const n of list) {
      if (n.type === 'objective' || n.type === 'key_result') out.push(n);
      if (n.children) walk(n.children);
    }
  };
  if (nodes) walk(nodes);
  return out;
}

interface OkrGroup { objective: PlanItem; keyResults: PlanItem[]; }

/** Group the plan tree into { objective, keyResults } for the OKR dropdown. */
function groupByObjective(nodes: PlanItem[] | undefined): OkrGroup[] {
  const groups: OkrGroup[] = [];
  const walk = (list: PlanItem[]) => {
    for (const n of list) {
      if ((n.type as string) === 'group') walk(n.children || []);
      else if (n.type === 'objective') {
        groups.push({ objective: n, keyResults: (n.children || []).filter((c) => c.type === 'key_result') });
      }
    }
  };
  if (nodes) walk(nodes);
  return groups;
}

const MOODS = [1, 2, 3, 4, 5];
const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };

// ---- add-priority dropdown ------------------------------------------------

interface AddPriorityMenuProps {
  groups: OkrGroup[];
  busy: boolean;
  /** title = '' for a blank free-text priority; planItemId links it to an OKR. */
  onAdd: (payload: { title: string; planItemId?: string }) => void;
}

function AddPriorityMenu({ groups, busy, onAdd }: AddPriorityMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (payload: { title: string; planItemId?: string }) => {
    onAdd(payload);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        <Plus size={14} />
        Add priority
        <ChevronDown size={13} className="opacity-80" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 max-h-80 overflow-auto bg-white rounded-lg border border-gray-200 shadow-lg z-30">
          {/* Write-my-own — set apart at top */}
          <button
            onClick={() => pick({ title: '' })}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            <PenLine size={14} />
            Write my own…
          </button>
          <div className="border-t border-gray-100" />

          {groups.length === 0 ? (
            <div className="p-3 text-xs text-gray-400">No objectives or key results yet. Add them on the OKRs screen.</div>
          ) : (
            groups.map((g) => (
              <div key={g.objective.id} className="py-1">
                {/* Objective — linkable */}
                <button
                  onClick={() => pick({ title: g.objective.title, planItemId: g.objective.id })}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  <span className="text-sm font-semibold text-gray-900">{g.objective.title}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">Objective</span>
                </button>
                {/* Key results — linkable, indented */}
                {g.keyResults.map((kr) => (
                  <button
                    key={kr.id}
                    onClick={() => pick({ title: kr.title, planItemId: kr.id })}
                    className="w-full text-left pl-7 pr-3 py-1.5 hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{kr.title}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">Key Result</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- commit row -----------------------------------------------------------

interface CommitRowProps {
  commit: { id: string; title: string; planItemId: string | null; sortOrder: number };
  linkables: PlanItem[];
  groups: OkrGroup[];
  onChanged: () => void;
}

function CommitRow({ commit, linkables, groups, onChanged }: CommitRowProps) {
  const [title, setTitle] = useState(commit.title);
  const [showPicker, setShowPicker] = useState(false);

  const updateCommit = trpc.planning.updateCommit.useMutation({ onSuccess: () => onChanged() });
  const removeCommit = trpc.planning.removeCommit.useMutation({ onSuccess: () => onChanged() });

  const linked = linkables.find((l) => l.id === commit.planItemId);

  const saveTitle = () => {
    if (title.trim() && title !== commit.title) {
      updateCommit.mutate({ id: commit.id, title: title.trim() });
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="What's your priority?"
        className="flex-1 px-2 py-1 text-sm border border-transparent rounded-md hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="relative">
        {linked ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
            <Link2 size={12} />
            <span className="max-w-[160px] truncate">{linked.title}</span>
            <button
              onClick={() => updateCommit.mutate({ id: commit.id, planItemId: null })}
              className="hover:text-blue-900"
              title="Unlink"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setShowPicker((s) => !s)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-blue-600 rounded transition-colors"
            title="Link to an OKR"
          >
            <Link2 size={14} />
            Link to OKR
          </button>
        )}

        {showPicker && !linked && (
          <div className="absolute right-0 mt-1 w-72 max-h-72 overflow-auto bg-white rounded-lg border border-gray-200 shadow-lg z-20">
            {groups.length === 0 ? (
              <div className="p-3 text-xs text-gray-400">No objectives or key results yet.</div>
            ) : (
              groups.map((g) => (
                <div key={g.objective.id} className="py-1">
                  <button
                    onClick={() => { updateCommit.mutate({ id: commit.id, planItemId: g.objective.id }); setShowPicker(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-900">{g.objective.title}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">Objective</span>
                  </button>
                  {g.keyResults.map((kr) => (
                    <button
                      key={kr.id}
                      onClick={() => { updateCommit.mutate({ id: commit.id, planItemId: kr.id }); setShowPicker(false); }}
                      className="w-full text-left pl-7 pr-3 py-1.5 hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">{kr.title}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">Key Result</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => removeCommit.mutate({ id: commit.id })}
        className="p-1 text-gray-300 hover:text-red-600 transition-colors"
        title="Remove"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ---- page -----------------------------------------------------------------

export default function MyWeek() {
  const weekStart = currentMonday();

  const { data: week, refetch } = trpc.planning.getWeek.useQuery({ weekStart });
  const { data: tree } = trpc.planning.tree.useQuery();
  const linkables = flattenLinkable(tree as PlanItem[] | undefined);
  const groups = groupByObjective(tree as PlanItem[] | undefined);

  const upsertWeek = trpc.planning.upsertWeek.useMutation({ onSuccess: () => refetch() });
  const addCommit = trpc.planning.addCommit.useMutation({ onSuccess: () => refetch() });

  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [mood, setMood] = useState<number | null>(null);

  // Hydrate local form state when the plan loads/changes.
  useEffect(() => {
    if (week?.plan) {
      setWins(week.plan.wins ?? '');
      setChallenges(week.plan.challenges ?? '');
      setMood(week.plan.mood ?? null);
    }
  }, [week?.plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const planId = week?.plan?.id ?? null;

  // Add a priority — blank free-text (title:'') or pre-linked to an OKR (planItemId).
  // Creates the weekly plan first if it doesn't exist yet.
  const handleAddPriority = (payload: { title: string; planItemId?: string }) => {
    if (planId) {
      addCommit.mutate({ weeklyPlanId: planId, ...payload });
    } else {
      upsertWeek.mutate(
        { weekStart },
        { onSuccess: (plan) => addCommit.mutate({ weeklyPlanId: plan.id, ...payload }) }
      );
    }
  };

  const handleSave = () => {
    upsertWeek.mutate({
      weekStart,
      wins: wins || undefined,
      challenges: challenges || undefined,
      mood: mood ?? undefined,
    });
  };

  const weekLabel = new Date(weekStart + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const addBusy = addCommit.isLoading || upsertWeek.isLoading;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Week</h1>
        <p className="text-gray-500 text-sm mt-1">Week of {weekLabel}</p>
      </div>

      {/* Priorities */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">What I'm working on this week</h2>
            <p className="text-xs text-gray-400 mt-0.5">Add what you'll do this week — pick an OKR or write your own.</p>
          </div>
          <AddPriorityMenu groups={groups} busy={addBusy} onAdd={handleAddPriority} />
        </div>

        {!week?.commits || week.commits.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No priorities yet. Click “Add priority” to pick an OKR or write your own.
          </div>
        ) : (
          week.commits
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((commit) => (
              <CommitRow
                key={commit.id}
                commit={commit}
                linkables={linkables}
                groups={groups}
                onChanged={() => refetch()}
              />
            ))
        )}
      </div>

      {/* Check-in */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Wins</label>
          <textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            rows={3}
            placeholder="What went well this week?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Challenges</label>
          <textarea
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            rows={3}
            placeholder="What got in the way?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Mood</label>
          <div className="flex items-center gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`w-10 h-10 rounded-full text-lg flex items-center justify-center border transition-colors ${
                  mood === m
                    ? 'bg-blue-600 border-blue-600 ring-2 ring-blue-200'
                    : 'bg-white border-gray-200 hover:border-blue-400'
                }`}
                title={`Mood ${m}`}
              >
                {MOOD_EMOJI[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={upsertWeek.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {upsertWeek.isLoading ? 'Saving...' : 'Save check-in'}
          </button>
          <span className="text-xs text-gray-400">Optional — no scoring, no lock.</span>
        </div>
      </div>
    </div>
  );
}
