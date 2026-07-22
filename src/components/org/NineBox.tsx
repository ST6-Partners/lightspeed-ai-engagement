import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Person, BOX_NAMES, boxPerformance, boxPotential, TOKENS } from './orgLib';
import { Empty, TabState } from './atoms';

// Subtle diagonal wash: green (high/high) → amber → red (low/low), by axis sum.
function cellTint(box: number): string {
  const sum = boxPerformance(box) + boxPotential(box); // 0..4
  return ['#fdecec', '#fdeede', '#fcf6e3', '#eef7ec', '#e6f5ea'][sum];
}

export default function NineBox({ people, scope, canPlace }: { people: Person[]; scope?: 'individual' | 'directs' | 'descendants'; canPlace?: (id: string) => boolean }) {
  const ids = people.map((p) => p.id);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.orgScreen.nineboxByIds.useQuery({ ids }, { enabled: ids.length > 0 });
  const rate = trpc.orgScreen.nineboxRate.useMutation({
    onSuccess: () => { utils.orgScreen.nineboxByIds.invalidate({ ids }); setEditing(null); },
    onError: (e) => setErr(e.data?.code === 'FORBIDDEN' ? 'Only managers can rate.' : 'Could not save rating.'),
  });
  const clear = trpc.orgScreen.nineboxClear.useMutation({
    onSuccess: () => { utils.orgScreen.nineboxByIds.invalidate({ ids }); setEditing(null); },
    onError: (e) => setErr(e.data?.code === 'FORBIDDEN' ? 'Only managers can rate.' : 'Could not remove rating.'),
  });
  const [editing, setEditing] = useState<Person | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (ids.length === 0) return <Empty text="No one in this scope" />;
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <div className="text-[12px]" style={{ color: TOKENS.idle }}>Could not load ratings.</div>;

  // Ratings keyed by user. The scoped `people` list is the source of truth for
  // who appears — rated people land in their grid box, everyone else in scope
  // shows under Unrated. So the panels always match the current scope.
  const ratingByUser = new Map<string, number>();
  for (const r of data?.people ?? []) if (r.box != null) ratingByUser.set(r.userId, r.box);
  const inBox = (box: number) => people.filter((p) => ratingByUser.get(p.id) === box);
  const unrated = people.filter((p) => !ratingByUser.has(p.id));

  // Top performers (7/8/9) and Needs attention (1/2/4) for the right rail.
  // Hidden for a single person (Individual scope) — a leaderboard of one is noise.
  const withBox = people.map((p) => ({ person: p, box: ratingByUser.get(p.id) ?? null }));
  const topPerformers = withBox.filter((x) => x.box != null && [7, 8, 9].includes(x.box as number));
  const needsAttention = withBox.filter((x) => x.box != null && [1, 2, 4].includes(x.box as number));
  const showRail = scope !== 'individual';

  const doRate = (userId: string, box: number) => { setErr(null); rate.mutate({ userId, box }); };
  const doClear = (userId: string) => { setErr(null); clear.mutate({ userId }); };

  // A placed person: clicking opens the reposition modal (does NOT change the
  // tree selection — that was the old bug).
  // Placement is gated (Stage 2): only the viewer's placeable people are
  // clickable; everyone else is read-only. No predicate = allow (safe default).
  const editable = (id: string) => (canPlace ? canPlace(id) : true);
  const Chip = ({ person }: { person: Person }) => {
    const can = editable(person.id);
    const cls = 'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] w-full';
    const st = { background: '#fff', border: `1px solid ${TOKENS.border}` };
    const body = (
      <>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.selBar }} />
        <span className="truncate" style={{ maxWidth: 100 }}>{person.name}</span>
      </>
    );
    return can ? (
      <button onClick={() => { setErr(null); setEditing(person); }} className={cls} style={st} title="Click to reposition">{body}</button>
    ) : (
      <div className={cls} style={{ ...st, opacity: 0.7 }} title="View only — you cannot place this person">{body}</div>
    );
  };

  return (
    <div className="flex gap-6 items-start flex-wrap">
      {/* Grid + axes */}
      <div className="flex gap-2">
        <div className="flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TOKENS.idle, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Potential →</div>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-2" style={{ width: 468 }}>
            {[2, 1, 0].map((row) => [1, 2, 3].map((col) => {
              const box = row * 3 + col;
              const occupants = inBox(box);
              return (
                <div key={box} className="rounded-lg p-2 flex flex-col" style={{ height: 132, background: cellTint(box), border: `1px solid ${TOKENS.borderSoft}` }}>
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: TOKENS.idle }}>
                    <span className="font-semibold">{BOX_NAMES[box]}</span><span>{box}</span>
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto">
                    {occupants.map((o) => <Chip key={o.id} person={o} />)}
                  </div>
                </div>
              );
            }))}
          </div>
          <div className="text-center text-[10px] font-bold uppercase tracking-wide mt-1" style={{ color: TOKENS.idle }}>Performance →</div>
        </div>
      </div>

      {/* Top performers / Needs attention — next to the chart. 9 Box only; hidden for a single person. */}
      {showRail && (
        <div style={{ minWidth: 220 }}>
          <RailList title={`Top performers (${topPerformers.length})`} color="#15803d" items={topPerformers} />
          <div style={{ height: 12 }} />
          <RailList title={`Needs attention (${needsAttention.length})`} color="#b91c1c" items={needsAttention} />
        </div>
      )}

      {/* Unrated list — everyone in scope without a rating */}
      <div style={{ minWidth: 180 }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: TOKENS.idle }}>Unrated ({unrated.length})</div>
        {err && <div className="text-[11px] mb-2" style={{ color: '#b91c1c' }}>{err}</div>}
        <div className="space-y-1">
          {unrated.map((u) => (
            editable(u.id) ? (
              <button key={u.id} onClick={() => { setErr(null); setEditing(u); }}
                className="w-full text-left rounded px-2 py-1 text-[12px]"
                style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}` }}
                title="Click to place on the grid">
                {u.name}
              </button>
            ) : (
              <div key={u.id} className="w-full text-left rounded px-2 py-1 text-[12px]"
                style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}`, opacity: 0.7 }}
                title="View only — you cannot place this person">
                {u.name}
              </div>
            )
          ))}
          {unrated.length === 0 && <div className="text-[11px]" style={{ color: TOKENS.idle }}>Everyone in scope is rated.</div>}
        </div>
      </div>


      {/* Reposition / place modal */}
      {editing && (
        <RateModal
          person={editing}
          current={ratingByUser.get(editing.id) ?? null}
          saving={rate.isLoading}
          removing={clear.isLoading}
          onPick={(b) => doRate(editing.id, b)}
          onRemove={() => doClear(editing.id)}
          onClose={() => { setErr(null); setEditing(null); }}
        />
      )}
    </div>
  );
}

function RailList({ title, color, items }: { title: string; color: string; items: { person: Person; box: number | null }[] }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color }}>{title}</div>
      {items.length === 0 ? (
        <div className="text-[11px]" style={{ color: TOKENS.idle }}>None in scope.</div>
      ) : (
        <div className="space-y-1">
          {items.map((x) => (
            <div key={x.person.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate" style={{ color: TOKENS.activeText }}>
                {x.person.name}
                {x.person.dept && <span className="text-[11px]" style={{ color: TOKENS.idle }}> · {x.person.dept}</span>}
              </span>
              <span className="text-[11px] whitespace-nowrap" style={{ color }}>{x.box != null ? BOX_NAMES[x.box] : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RateModal({ person, current, saving, removing, onPick, onRemove, onClose }: {
  person: Person; current: number | null; saving: boolean; removing: boolean;
  onPick: (b: number) => void; onRemove: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,.45)' }} onClick={onClose}>
      <div className="rounded-xl p-5 shadow-xl" style={{ background: '#fff', width: 328 }} onClick={(e) => e.stopPropagation()}>
        <div className="text-[15px] font-semibold" style={{ color: TOKENS.activeText }}>{person.name}</div>
        <div className="text-[12px] mb-3" style={{ color: TOKENS.idle }}>
          {current ? `Currently ${BOX_NAMES[current]} (${current}) — choose a new position` : 'Choose a 9-box position'}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((b) => (
            <button key={b} disabled={saving} onClick={() => onPick(b)}
              className="rounded-lg p-2 text-left"
              style={{
                background: cellTint(b),
                border: b === current ? `2px solid ${TOKENS.selBar}` : `1px solid ${TOKENS.borderSoft}`,
                opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer', height: 58,
              }}>
              <div className="text-[10px] font-semibold leading-tight" style={{ color: TOKENS.activeText }}>{BOX_NAMES[b]}</div>
              <div className="text-[10px]" style={{ color: TOKENS.idle }}>{b}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {current != null && (
            <button onClick={onRemove} disabled={removing}
              className="flex-1 text-[12px] rounded-lg py-2"
              style={{ border: '1px solid #fecaca', color: '#b91c1c', background: '#fef2f2', opacity: removing ? 0.6 : 1, cursor: removing ? 'default' : 'pointer' }}>
              Remove rating
            </button>
          )}
          <button onClick={onClose} className="flex-1 text-[12px] rounded-lg py-2" style={{ border: `1px solid ${TOKENS.border}`, color: TOKENS.idle }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
