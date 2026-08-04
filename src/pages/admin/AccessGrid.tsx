// ============================================================
// ACCESS GRID — sysadmin tab (AIE 2026-08-03)
//
// Seven access levels down the side, five areas across the top. Each cell
// sets how far that level reaches in that area. Documents offers only in/out
// because it holds settings rather than people.
//
// Nothing saves until "Save changes" is pressed; the button stays disabled
// while the grid matches what is stored, so an accidental visit cannot write.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Lock, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import PreviewSwitcher from './PreviewSwitcher';

// Five levels (2026-08-03, revised from seven the same day): SLT folded into
// ELT and Admin into Sysadmin — each pair was the same group of people.
const LEVELS = [
  { id: 'sysadmin', label: 'Sysadmin' },
  { id: 'elt', label: 'ELT' },
  { id: 'hr', label: 'HR' },
  { id: 'manager', label: 'Manager' },
  { id: 'user', label: 'User' },
] as const;

const AREAS = [
  { id: 'planning', label: 'Planning' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'insights', label: 'Insights' },
  { id: 'documents', label: 'Documents' },
  { id: 'assessments', label: 'Assessments' },
] as const;

type Level = (typeof LEVELS)[number]['id'];
type Area = (typeof AREAS)[number]['id'];
type Reach = 'none' | 'down_org' | 'all';
type Grid = Record<Level, Record<Area, Reach>>;

const REACH_LABEL: Record<Reach, string> = {
  none: 'No access',
  down_org: 'Down org',
  all: 'All access',
};

// Documents is Core Data — settings, not people — so down-org has no meaning.
const AREAS_WITHOUT_DOWN_ORG: Area[] = ['documents'];

function optionsFor(area: Area): Reach[] {
  return AREAS_WITHOUT_DOWN_ORG.includes(area)
    ? ['none', 'all']
    : ['none', 'down_org', 'all'];
}

export default function AccessGrid() {
  const utils = trpc.useContext();
  const { data, isLoading, error } = trpc.accessControl.grid.useQuery();
  const [draft, setDraft] = useState<Grid | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (data?.grid) setDraft(JSON.parse(JSON.stringify(data.grid)) as Grid);
  }, [data]);

  const save = trpc.accessControl.setGrid.useMutation({
    onSuccess: async () => {
      await utils.accessControl.grid.invalidate();
      await utils.accessControl.myAreas.invalidate();
      setMsg({ kind: 'ok', text: 'Access saved. People see the change next time they load the app.' });
    },
    onError: (e) => setMsg({ kind: 'err', text: e.message }),
  });

  const reset = trpc.accessControl.resetGrid.useMutation({
    onSuccess: async () => {
      await utils.accessControl.grid.invalidate();
      await utils.accessControl.myAreas.invalidate();
      setMsg({ kind: 'ok', text: 'Back to the original settings.' });
    },
    onError: (e) => setMsg({ kind: 'err', text: e.message }),
  });

  // Only the cells that actually changed get sent.
  const changed = useMemo(() => {
    if (!draft || !data?.grid) return [];
    const out: { level: Level; area: Area; reach: Reach }[] = [];
    for (const l of LEVELS) {
      for (const a of AREAS) {
        if (draft[l.id][a.id] !== data.grid[l.id][a.id]) {
          out.push({ level: l.id, area: a.id, reach: draft[l.id][a.id] });
        }
      }
    }
    return out;
  }, [draft, data]);

  const setCell = (level: Level, area: Area, reach: Reach) => {
    setMsg(null);
    setDraft((d) => (d ? { ...d, [level]: { ...d[level], [area]: reach } } : d));
  };

  if (isLoading) return <div className="p-4 text-sm text-ls-ink-2">Loading access settings…</div>;
  if (error) return <div className="p-4 text-sm text-ls-risk">{error.message}</div>;
  if (!draft) return null;

  return (
    <div className="p-1">
      <div className="flex items-center gap-2">
        <Lock size={18} className="text-ls-ink-2" />
        <h3 className="text-[15px] font-semibold text-ls-ink">Access</h3>
        <span className="text-[11px] px-2 py-0.5 rounded bg-ls-blue-50 text-ls-blue-deep">Sysadmin only</span>
      </div>
      <p className="text-xs text-ls-ink-2 mt-1 mb-4">
        Set what each access level can reach in each area of the app.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left font-medium text-ls-ink-2 pb-2 pr-2 w-[90px]">Level</th>
              {AREAS.map((a) => (
                <th key={a.id} className="text-left font-medium text-ls-ink-2 pb-2 px-1">{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((l, i) => (
              <tr key={l.id} className={i ? 'border-t border-ls-line' : ''}>
                <td className="py-1.5 pr-2 font-medium text-ls-ink whitespace-nowrap">{l.label}</td>
                {AREAS.map((a) => (
                  <td key={a.id} className="py-1 px-1">
                    <select
                      className="w-full h-[30px] text-[11px] border border-ls-line rounded px-1 bg-white text-ls-ink"
                      value={draft[l.id][a.id]}
                      onChange={(e) => setCell(l.id, a.id, e.target.value as Reach)}
                    >
                      {optionsFor(a.id).map((r) => (
                        <option key={r} value={r}>{REACH_LABEL[r]}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-ls-line text-[11px] text-ls-ink-2">
        <span><strong className="font-medium text-ls-ink">No access</strong> — hidden from the sidebar, blocked if typed in</span>
        <span><strong className="font-medium text-ls-ink">Down org</strong> — you and everyone who rolls up to you</span>
        <span><strong className="font-medium text-ls-ink">All access</strong> — everyone</span>
      </div>

      <p className="text-[11px] text-ls-ink-2 mt-3 leading-relaxed">
        Two things this grid never overrides: results stay hidden for any group smaller than three
        people, and the HR-only parts of the exit survey stay HR-only. Anyone with people reporting
        to them keeps manager access to their own team whatever their level says.
      </p>

      <div className="flex items-center gap-2 mt-4">
        <button
          className="ls-btn ls-btn-primary text-xs"
          disabled={!changed.length || save.isLoading}
          onClick={() => save.mutate({ cells: changed })}
        >
          {save.isLoading ? 'Saving…' : changed.length ? `Save ${changed.length} change${changed.length > 1 ? 's' : ''}` : 'Save changes'}
        </button>
        <button
          className="ls-btn text-xs flex items-center gap-1"
          disabled={reset.isLoading}
          onClick={() => reset.mutate()}
        >
          <RotateCcw size={12} /> Reset to defaults
        </button>
        {msg && (
          <span className={`text-[11px] flex items-center gap-1 ${msg.kind === 'ok' ? 'text-ls-thrive' : 'text-ls-risk'}`}>
            {msg.kind === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />}{msg.text}
          </span>
        )}
      </div>

      <PreviewSwitcher />
    </div>
  );
}
