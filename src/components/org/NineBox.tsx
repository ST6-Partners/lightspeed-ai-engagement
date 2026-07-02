import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Person, BOX_NAMES, boxPerformance, boxPotential, TOKENS } from './orgLib';
import { Empty, TabState } from './atoms';

// Subtle diagonal wash: green (high/high) → amber → red (low/low), by axis sum.
function cellTint(box: number): string {
  const sum = boxPerformance(box) + boxPotential(box); // 0..4
  return ['#fdecec', '#fdeede', '#fcf6e3', '#eef7ec', '#e6f5ea'][sum];
}

function Picker({ onPick, onClose }: { onPick: (b: number) => void; onClose: () => void }) {
  return (
    <div className="absolute z-20 p-2 rounded-lg shadow-lg" style={{ background: '#fff', border: `1px solid ${TOKENS.border}` }}>
      <div className="grid grid-cols-3 gap-1" style={{ width: 108 }}>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((b) => (
          <button key={b} onClick={() => onPick(b)}
            className="text-[11px] font-semibold rounded"
            style={{ height: 30, background: cellTint(b), border: `1px solid ${TOKENS.borderSoft}` }}>{b}</button>
        ))}
      </div>
      <button onClick={onClose} className="mt-1 w-full text-[10px]" style={{ color: TOKENS.idle }}>cancel</button>
    </div>
  );
}

export default function NineBox({ people, onSelect }: { people: Person[]; onSelect: (id: string) => void }) {
  const ids = people.map((p) => p.id);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.orgScreen.nineboxByIds.useQuery({ ids }, { enabled: ids.length > 0 });
  const rate = trpc.orgScreen.nineboxRate.useMutation({
    onSuccess: () => utils.orgScreen.nineboxByIds.invalidate({ ids }),
    onError: (e) => setErr(e.data?.code === 'FORBIDDEN' ? 'Only managers can rate.' : 'Could not save rating.'),
  });
  const [picking, setPicking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (ids.length === 0) return <Empty text="No one in this scope" />;
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <div className="text-[12px]" style={{ color: TOKENS.idle }}>Couldn’t load ratings.</div>;

  const byId = new Map(people.map((p) => [p.id, p]));
  const rated = data?.people.filter((r) => r.box != null) ?? [];
  const unrated = data?.people.filter((r) => r.box == null) ?? [];
  const inBox = (box: number) => rated.filter((r) => r.box === box);

  const doRate = (userId: string, box: number) => { setErr(null); setPicking(null); rate.mutate({ userId, box }); };

  const Chip = ({ userId, name }: { userId: string; name: string }) => (
    <div className="relative">
      <button
        onClick={() => { onSelect(userId); setPicking(picking === userId ? null : userId); }}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
        style={{ background: '#fff', border: `1px solid ${TOKENS.border}` }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.selBar }} />
        <span className="truncate" style={{ maxWidth: 90 }}>{name}</span>
      </button>
      {picking === userId && <Picker onPick={(b) => doRate(userId, b)} onClose={() => setPicking(null)} />}
    </div>
  );

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
                    {occupants.map((o) => <Chip key={o.userId} userId={o.userId} name={o.name} />)}
                  </div>
                </div>
              );
            }))}
          </div>
          <div className="text-center text-[10px] font-bold uppercase tracking-wide mt-1" style={{ color: TOKENS.idle }}>Performance →</div>
        </div>
      </div>

      {/* Unrated list */}
      <div style={{ minWidth: 180 }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: TOKENS.idle }}>Unrated ({unrated.length})</div>
        {err && <div className="text-[11px] mb-2" style={{ color: '#b91c1c' }}>{err}</div>}
        <div className="space-y-1">
          {unrated.map((u) => (
            <div key={u.userId} className="relative">
              <button onClick={() => { onSelect(u.userId); setPicking(picking === u.userId ? null : u.userId); }}
                className="w-full text-left rounded px-2 py-1 text-[12px]"
                style={{ background: '#fff', border: `1px solid ${TOKENS.borderSoft}` }}>
                {byId.get(u.userId)?.name ?? u.name}
              </button>
              {picking === u.userId && <Picker onPick={(b) => doRate(u.userId, b)} onClose={() => setPicking(null)} />}
            </div>
          ))}
          {unrated.length === 0 && <div className="text-[11px]" style={{ color: TOKENS.idle }}>Everyone in scope is rated.</div>}
        </div>
      </div>
    </div>
  );
}
