// OKRs — live nested objectives → key results → tasks (DD-002 Planning).
import { useState, type ReactNode } from 'react';
import { ChevronRight, Target, KeyRound, CheckSquare, Trash2 } from 'lucide-react';
import { trpc } from '../lib/trpc';

type Light = 'green' | 'yellow' | 'red';
interface OkrRow {
  id: string; parentId: string | null; type: string; title: string;
  owner: string | null; status: string; light: string | null;
  dueDate: string | null; description: string | null; sortOrder: number;
}

const LIGHT_HEX: Record<Light, string> = { green: '#2E9E7B', yellow: '#C99300', red: '#C2615A' };
const TYPE_ICON: Record<string, typeof Target> = { objective: Target, key_result: KeyRound, task: CheckSquare };

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  on_hold: 'On hold',
  complete: 'Complete',
};
const PERSON_GROUPS = [
  { type: 'objective', label: 'Objectives' },
  { type: 'key_result', label: 'Key Results' },
  { type: 'task', label: 'Tasks' },
] as const;

export default function Okrs() {
  const { data, isLoading, refetch } = trpc.okrs.list.useQuery();
  const create = trpc.okrs.create.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.okrs.remove.useMutation({ onSuccess: () => { setSelected(null); refetch(); } });
  const { data: org } = trpc.organization.list.useQuery();

  const [view, setView] = useState<'plan' | 'people'>('plan');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const rows = (data ?? []) as OkrRow[];
  const childrenOf = (pid: string | null) =>
    rows.filter((r) => r.parentId === pid).sort((a, b) => a.sortOrder - b.sortOrder);
  const sel = rows.find((r) => r.id === selected) ?? null;
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const members = org?.members ?? [];
  const selectedPerson = members.find((p) => p.id === selectedPersonId) ?? null;
  const ownedOkrs = selectedPerson
    ? rows.filter(
        (n) => (n.owner ?? '').trim().toLowerCase() === selectedPerson.name.trim().toLowerCase(),
      )
    : [];
  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  const renderNode = (n: OkrRow, depth: number): ReactNode => {
    const Icon = TYPE_ICON[n.type] ?? Target;
    const kids = childrenOf(n.id);
    const isExp = expanded[n.id] ?? depth < 1;
    const active = selected === n.id;
    return (
      <div key={n.id}>
        <div onClick={() => setSelected(n.id)}
          className={`flex items-center gap-1.5 py-1.5 pr-3 cursor-pointer rounded-md ${active ? 'bg-ls-blue-50' : 'hover:bg-ls-bg-2'}`}
          style={{ paddingLeft: 12 + depth * 18 }}>
          <button onClick={(e) => { e.stopPropagation(); if (kids.length) toggle(n.id); }}
            className={`w-4 shrink-0 text-ls-ink-3 transition-transform ${isExp ? 'rotate-90' : ''}`}
            style={{ visibility: kids.length ? 'visible' : 'hidden' }}><ChevronRight size={13} /></button>
          <Icon size={14} className="shrink-0 text-ls-blue-deep" />
          <span className={`flex-1 text-[13px] truncate ${n.type === 'objective' ? 'font-semibold' : ''}`}>{n.title}</span>
          {n.light && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LIGHT_HEX[n.light as Light] }} />}
        </div>
        {isExp && kids.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">OKRs</h1>
      <p className="text-sm text-ls-ink-3 mb-5">Objectives down to key results and the tasks teams commit to.</p>

      <div className="inline-flex gap-1 p-1 rounded-lg bg-ls-bg-2 mb-5">
        {([['plan', 'Plan'], ['people', 'By Person']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`text-sm font-semibold px-3.5 py-1.5 rounded-md ${
              view === v ? 'bg-ls-card text-ls-blue-deep shadow-sm' : 'text-ls-ink-3 hover:text-ls-ink-2'
            }`}>{label}</button>
        ))}
      </div>

      {view === 'plan' && (
        <div className="ls-card overflow-hidden flex min-h-[520px]">
          <div className="w-[340px] shrink-0 border-r border-ls-line py-2 overflow-y-auto">
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-ls-line">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Plan</span>
              <button onClick={() => create.mutate({ type: 'objective', title: 'New Objective', light: 'green' })}
                disabled={create.isPending}
                className="ls-btn ls-btn-primary text-xs py-1.5 px-2.5">+ Objective</button>
            </div>
            {isLoading && <div className="px-3 py-3 text-sm text-ls-ink-3">Loading…</div>}
            {!isLoading && childrenOf(null).map((n) => renderNode(n, 0))}
          </div>

          <div className="flex-1 p-5 min-w-0">
            {sel ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep capitalize">{sel.type.replace('_', ' ')}</span>
                  <button onClick={() => remove.mutate({ id: sel.id })}
                    className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-risk"><Trash2 size={13} /> Archive</button>
                </div>
                <h2 className="text-lg font-bold mb-4">{sel.title}</h2>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <Field label="Owner">{sel.owner ?? '—'}</Field>
                  <Field label="Status">{sel.status.replace('_', ' ')}</Field>
                  {sel.light && (
                    <Field label="Status light">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: LIGHT_HEX[sel.light as Light] }} />
                        <span className="capitalize">{sel.light}</span>
                      </span>
                    </Field>
                  )}
                  {sel.dueDate && <Field label="Due date">{sel.dueDate}</Field>}
                </dl>
                {sel.description && (
                  <div className="mt-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1.5">Description</div>
                    <p className="text-sm text-ls-ink-2">{sel.description}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-ls-ink-3">Select an item to see its details.</div>
            )}
          </div>
        </div>
      )}

      {view === 'people' && (
        <div className="ls-card overflow-hidden flex min-h-[520px]">
          <div className="w-[340px] shrink-0 border-r border-ls-line py-2 overflow-y-auto">
            <div className="px-3 pb-2 mb-1 border-b border-ls-line">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">People</span>
            </div>
            {members.map((p) => {
              const isSel = p.id === selectedPersonId;
              return (
                <button key={p.id} onClick={() => setSelectedPersonId(p.id)}
                  className={`w-full text-left flex items-center gap-2.5 py-1.5 px-3 rounded-md ${
                    isSel ? 'bg-ls-bg-2' : 'hover:bg-ls-bg-2'
                  }`}>
                  <span className="w-7 h-7 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center text-[11px] font-bold shrink-0">
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ls-ink truncate">{p.name}</span>
                    <span className="block text-[12px] text-ls-ink-3 truncate">{p.role}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-5 min-w-0">
            {selectedPerson ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-ls-active text-white flex items-center justify-center font-bold shrink-0">
                    {initials(selectedPerson.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14.5px]">{selectedPerson.name}</div>
                    <div className="text-[12.5px] text-ls-ink-3">{selectedPerson.role}</div>
                  </div>
                </div>

                {ownedOkrs.length === 0 ? (
                  <div className="text-sm text-ls-ink-3">No OKRs owned yet.</div>
                ) : (
                  PERSON_GROUPS.map((g) => {
                    const items = ownedOkrs.filter((n) => n.type === g.type);
                    if (items.length === 0) return null;
                    return (
                      <div key={g.type} className="mb-4 last:mb-0">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-2">{g.label}</div>
                        {items.map((n) => (
                          <div key={n.id} className="flex items-start gap-2.5 py-1.5">
                            <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                              style={{ background: n.light ? LIGHT_HEX[n.light as Light] : '#8A969E' }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-ls-ink">{n.title}</div>
                              <div className="text-[12px] text-ls-ink-3">{STATUS_LABEL[n.status] ?? n.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-ls-ink-3">Select a person to see their OKRs.</div>
            )}
          </div>
        </div>
      )}
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
