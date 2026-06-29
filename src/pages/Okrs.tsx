// OKRs — nested objectives → key results → tasks (DD-002 Planning).
import { useState, type ReactNode } from 'react';
import { ChevronRight, Target, KeyRound, CheckSquare } from 'lucide-react';

type NodeType = 'objective' | 'key_result' | 'task';
type Light = 'green' | 'yellow' | 'red';
interface OkrNode {
  id: string; type: NodeType; title: string; owner: string;
  status: string; light?: Light; due?: string; description?: string;
  children?: OkrNode[];
}

const TREE: OkrNode[] = [
  {
    id: 'o1', type: 'objective', title: 'Ship AI into the core product', owner: 'Brooke Friedman',
    status: 'In progress', light: 'yellow', due: '2026-09-30',
    description: 'Embed AI capabilities into the flagship product surfaces customers use daily.',
    children: [
      {
        id: 'kr1', type: 'key_result', title: 'AI assist adopted by 60% of weekly actives', owner: 'Charles Harris',
        status: 'In progress', light: 'yellow', due: '2026-08-29',
        description: 'Drive adoption of inline AI assist across the editor.',
        children: [
          { id: 't1', type: 'task', title: 'Inline assist entry points in editor toolbar', owner: 'Danny Lee', status: 'Complete' },
          { id: 't2', type: 'task', title: 'Onboarding tour highlighting AI assist', owner: 'Vixey Douglas', status: 'In progress' },
        ],
      },
      {
        id: 'kr2', type: 'key_result', title: 'Reduce AI response latency below 800ms p95', owner: 'Marius Meissner',
        status: 'On hold', light: 'red', due: '2026-07-31',
        description: 'Cut tail latency so AI feels instant.',
      },
    ],
  },
  {
    id: 'o2', type: 'objective', title: 'Build the AI go-to-market motion', owner: 'Josh Poirier',
    status: 'In progress', light: 'green', due: '2026-11-30',
    description: 'Stand up the sales and marketing motion for AI-native positioning.',
    children: [
      {
        id: 'kr3', type: 'key_result', title: 'AI-native messaging live across all channels', owner: 'Crystal Fischer',
        status: 'Complete', light: 'green', due: '2026-05-15',
        description: 'Refresh site, decks, and outbound around AI-native.',
      },
    ],
  },
];

const LIGHT_HEX: Record<Light, string> = { green: '#2E9E7B', yellow: '#C99300', red: '#C2615A' };
const TYPE_ICON = { objective: Target, key_result: KeyRound, task: CheckSquare } as const;

function flatten(nodes: OkrNode[], map: Record<string, OkrNode> = {}): Record<string, OkrNode> {
  for (const n of nodes) { map[n.id] = n; if (n.children) flatten(n.children, map); }
  return map;
}
const BY_ID = flatten(TREE);

export default function Okrs() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ o1: true, kr1: true, o2: true });
  const [selected, setSelected] = useState<string>('kr1');
  const sel = BY_ID[selected];

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const renderNode = (n: OkrNode, depth: number) => {
    const Icon = TYPE_ICON[n.type];
    const hasChildren = !!n.children?.length;
    const isExp = !!expanded[n.id];
    const active = selected === n.id;
    return (
      <div key={n.id}>
        <div
          onClick={() => setSelected(n.id)}
          className={`flex items-center gap-1.5 py-1.5 pr-3 cursor-pointer rounded-md ${active ? 'bg-ls-blue-50' : 'hover:bg-ls-bg-2'}`}
          style={{ paddingLeft: 12 + depth * 18 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(n.id); }}
            className={`w-4 shrink-0 text-ls-ink-3 transition-transform ${isExp ? 'rotate-90' : ''}`}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            <ChevronRight size={13} />
          </button>
          <Icon size={14} className="shrink-0 text-ls-blue-deep" />
          <span className={`flex-1 text-[13px] truncate ${n.type === 'objective' ? 'font-semibold' : ''}`}>{n.title}</span>
          {n.light && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LIGHT_HEX[n.light] }} />}
        </div>
        {isExp && n.children?.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">OKRs</h1>
      <p className="text-sm text-ls-ink-3 mb-5">
        Your organization's objectives down to key results and the tasks teams commit to.
      </p>

      <div className="ls-card overflow-hidden flex min-h-[520px]">
        <div className="w-[340px] shrink-0 border-r border-ls-line py-2 overflow-y-auto">
          <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-ls-line">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Plan</span>
            <button className="ls-btn ls-btn-primary text-xs py-1.5 px-2.5">+ Objective</button>
          </div>
          {TREE.map((n) => renderNode(n, 0))}
        </div>

        <div className="flex-1 p-5 min-w-0">
          {sel && (
            <>
              <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep capitalize mb-3">{sel.type.replace('_', ' ')}</span>
              <h2 className="text-lg font-bold mb-4">{sel.title}</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Owner">{sel.owner}</Field>
                <Field label="Status">{sel.status}</Field>
                {sel.light && (
                  <Field label="Status light">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: LIGHT_HEX[sel.light] }} />
                      <span className="capitalize">{sel.light}</span>
                    </span>
                  </Field>
                )}
                {sel.due && <Field label="Due date">{sel.due}</Field>}
              </dl>
              {sel.description && (
                <div className="mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1.5">Description</div>
                  <p className="text-sm text-ls-ink-2">{sel.description}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1">{label}</div>
      <div className="text-ls-ink">{children}</div>
    </div>
  );
}
