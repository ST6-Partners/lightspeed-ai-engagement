import { fmtDate } from '../lib/date';
// OKRs — live nested objectives → key results → tasks (DD-002 Planning).
// Editable (title, owner linked to the Org directory, status, light, due,
// description); add key results / tasks inline; archive (reversible) vs delete
// (permanent); By-Person view via employee search; Archived section.
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Target, KeyRound, CheckSquare, Trash2, Pencil, Plus, Archive, RotateCcw, Search } from 'lucide-react';
import { trpc } from '../lib/trpc';

type Light = 'green' | 'yellow' | 'red';
interface OkrRow {
  id: string; parentId: string | null; type: string; title: string;
  owner: string | null; ownerUserId: string | null; status: string; light: string | null;
  dueDate: string | null; description: string | null; sortOrder: number;
}

const LIGHT_HEX: Record<Light, string> = { green: '#2E9E7B', yellow: '#C99300', red: '#C2615A' };
const TYPE_ICON: Record<string, typeof Target> = { objective: Target, key_result: KeyRound, task: CheckSquare };

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'complete', label: 'Complete' },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTS.map((s) => [s.value, s.label]));
const LIGHT_OPTS: { value: string; label: string }[] = [
  { value: '', label: '— None' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'red', label: 'Red' },
];
const CHILD_TYPE: Record<string, { type: 'key_result' | 'task'; label: string; title: string } | undefined> = {
  objective: { type: 'key_result', label: 'Key Result', title: 'New Key Result' },
  key_result: { type: 'task', label: 'Task', title: 'New Task' },
};
const PERSON_GROUPS = [
  { type: 'objective', label: 'Objectives' },
  { type: 'key_result', label: 'Key Results' },
  { type: 'task', label: 'Tasks' },
] as const;

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ls-active';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1';

interface EditForm {
  title: string; ownerUserId: string; status: string; light: string;
  dueDate: string; description: string;
}

export default function Okrs() {
  const { data, isLoading, refetch } = trpc.okrs.list.useQuery();
  const archivedQ = trpc.okrs.listArchived.useQuery();
  const { data: org } = trpc.organization.list.useQuery();

  const bump = () => { refetch(); archivedQ.refetch(); };
  const create = trpc.okrs.create.useMutation({ onSuccess: () => refetch() });
  const update = trpc.okrs.update.useMutation({ onSuccess: () => refetch() });
  const archive = trpc.okrs.archive.useMutation({ onSuccess: () => { setSelected(null); bump(); } });
  const unarchive = trpc.okrs.unarchive.useMutation({ onSuccess: bump });
  const remove = trpc.okrs.remove.useMutation({ onSuccess: () => { setSelected(null); bump(); } });

  const [view, setView] = useState<'plan' | 'people' | 'archived'>('plan');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personQuery, setPersonQuery] = useState('');
  const [showPersonMenu, setShowPersonMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    title: '', ownerUserId: '', status: 'not_started', light: '', dueDate: '', description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const rows = (data ?? []) as OkrRow[];
  const archivedRows = (archivedQ.data ?? []) as OkrRow[];
  const members = org?.members ?? [];
  const childrenOf = (pid: string | null) =>
    rows.filter((r) => r.parentId === pid).sort((a, b) => a.sortOrder - b.sortOrder);
  const sel = rows.find((r) => r.id === selected) ?? null;
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // Owner display resolves through the Organization directory via the user link
  // first, so a renamed employee always shows current data; the denormalized
  // name is only a fallback for unlinked legacy rows.
  const ownerName = (n: OkrRow): string | null => {
    if (n.ownerUserId) {
      const m = members.find((x) => x.id === n.ownerUserId);
      if (m) return m.name;
    }
    return n.owner && n.owner.trim() ? n.owner : null;
  };

  const startEdit = () => {
    if (!sel) return;
    setForm({
      title: sel.title,
      ownerUserId: sel.ownerUserId ?? '',
      status: sel.status,
      light: sel.light ?? '',
      dueDate: sel.dueDate ?? '',
      description: sel.description ?? '',
    });
    setFormError(null);
    setEditing(true);
  };

  // A freshly created node opens straight into edit mode, populated from the
  // returned row, so the user completes it immediately.
  const openInEdit = (row: OkrRow) => {
    setSelected(row.id);
    setForm({
      title: row.title,
      ownerUserId: row.ownerUserId ?? '',
      status: row.status,
      light: row.light ?? '',
      dueDate: row.dueDate ?? '',
      description: row.description ?? '',
    });
    setFormError(null);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!sel) return;
    const missing: string[] = [];
    if (!form.title.trim()) missing.push('Title');
    if (!form.ownerUserId) missing.push('Owner');
    if (!form.status) missing.push('Status');
    if (!form.light) missing.push('Status light');
    if (!form.dueDate) missing.push('Due date');
    if (!form.description.trim()) missing.push('Description');
    if (missing.length) {
      setFormError(`Every field is required to save. Still needed: ${missing.join(', ')}.`);
      return;
    }
    setFormError(null);
    const owner = members.find((m) => m.id === form.ownerUserId)?.name ?? null;
    update.mutate(
      {
        id: sel.id,
        title: form.title.trim(),
        ownerUserId: form.ownerUserId,
        owner,
        status: form.status as never,
        light: form.light as never,
        dueDate: form.dueDate,
        description: form.description.trim(),
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const missingField = (empty: boolean) => (formError && empty ? ' border-ls-risk ring-1 ring-ls-risk' : '');

  const addChild = () => {
    if (!sel) return;
    const spec = CHILD_TYPE[sel.type];
    if (!spec) return;
    const siblings = childrenOf(sel.id);
    create.mutate(
      { parentId: sel.id, type: spec.type, title: spec.title, sortOrder: (siblings.length + 1) * 10 },
      { onSuccess: (row) => { setExpanded((e) => ({ ...e, [sel.id]: true })); openInEdit(row as unknown as OkrRow); } },
    );
  };

  const deleteNode = (id: string) => {
    if (window.confirm('Permanently delete this OKR and everything under it? This cannot be undone.')) {
      remove.mutate({ id });
    }
  };

  // ── By Person: searchable employee picker ──
  const filteredMembers = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q));
  }, [members, personQuery]);
  const selectedPerson = members.find((p) => p.id === selectedPersonId) ?? null;
  const ownedOkrs = selectedPerson
    ? rows.filter((n) =>
        n.ownerUserId === selectedPerson.id ||
        (!n.ownerUserId && (n.owner ?? '').trim().toLowerCase() === selectedPerson.name.trim().toLowerCase()),
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
        <div onClick={() => { setSelected(n.id); setEditing(false); setFormError(null); }}
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

  const childSpec = sel ? CHILD_TYPE[sel.type] : undefined;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">OKRs</h1>
      <p className="text-sm text-ls-ink-3 mb-5">Objectives down to key results and the tasks teams commit to.</p>

      <div className="inline-flex gap-1 p-1 rounded-lg bg-ls-bg-2 mb-5">
        {([['plan', 'Plan'], ['people', 'By Person'], ['archived', 'Archived']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`text-sm font-semibold px-3.5 py-1.5 rounded-md ${
              view === v ? 'bg-ls-card text-ls-blue-deep shadow-sm' : 'text-ls-ink-3 hover:text-ls-ink-2'
            }`}>{label}{v === 'archived' && archivedRows.length ? ` (${archivedRows.length})` : ''}</button>
        ))}
      </div>

      {view === 'plan' && (
        <div className="ls-card overflow-hidden flex min-h-[520px]">
          <div className="w-[340px] shrink-0 border-r border-ls-line py-2 overflow-y-auto">
            <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-ls-line">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Plan</span>
              <button onClick={() => create.mutate({ type: 'objective', title: 'New Objective', light: 'green' }, { onSuccess: (row) => openInEdit(row as unknown as OkrRow) })}
                disabled={create.isPending}
                className="ls-btn ls-btn-primary text-xs py-1.5 px-2.5">+ Objective</button>
            </div>
            {isLoading && <div className="px-3 py-3 text-sm text-ls-ink-3">Loading…</div>}
            {!isLoading && childrenOf(null).map((n) => renderNode(n, 0))}
          </div>

          <div className="flex-1 p-5 min-w-0">
            {sel ? (
              editing ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep capitalize">{sel.type.replace('_', ' ')}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(false); setFormError(null); }}
                        className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5">Cancel</button>
                      <button onClick={saveEdit} disabled={update.isPending}
                        className="ls-btn ls-btn-primary text-xs py-1.5 px-3">
                        {update.isPending ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {formError && (
                      <div className="text-[12.5px] text-ls-risk border border-ls-risk rounded-md px-3 py-2" style={{ background: '#FBEAE8' }}>{formError}</div>
                    )}
                    <div>
                      <label className={labelCls}>Title *</label>
                      <input className={`${inputCls}${missingField(!form.title.trim())}`} value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Owner *</label>
                        <select className={`${inputCls}${missingField(!form.ownerUserId)}`} value={form.ownerUserId}
                          onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))}>
                          <option value="">— Unassigned</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>
                          ))}
                        </select>
                        <p className="text-[11px] text-ls-ink-3 mt-1">From the Organization directory.</p>
                      </div>
                      <div>
                        <label className={labelCls}>Status *</label>
                        <select className={`${inputCls}${missingField(!form.status)}`} value={form.status}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                          {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Status light *</label>
                        <select className={`${inputCls}${missingField(!form.light)}`} value={form.light}
                          onChange={(e) => setForm((f) => ({ ...f, light: e.target.value }))}>
                          {LIGHT_OPTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Due date *</label>
                        <input type="date" className={`${inputCls}${missingField(!form.dueDate)}`} value={form.dueDate}
                          onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Description *</label>
                      <textarea className={`${inputCls}${missingField(!form.description.trim())}`} rows={4} value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="ls-chip bg-ls-blue-50 text-ls-blue-deep capitalize">{sel.type.replace('_', ' ')}</span>
                    <div className="flex gap-2">
                      {childSpec && (
                        <button onClick={addChild} disabled={create.isPending}
                          className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-blue-deep">
                          <Plus size={13} /> {childSpec.label}</button>
                      )}
                      <button onClick={startEdit}
                        className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5"><Pencil size={13} /> Edit</button>
                      <button onClick={() => archive.mutate({ id: sel.id })} disabled={archive.isPending}
                        className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5"><Archive size={13} /> Archive</button>
                      <button onClick={() => deleteNode(sel.id)} disabled={remove.isPending}
                        className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-risk"><Trash2 size={13} /> Delete</button>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold mb-4">{sel.title}</h2>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <Field label="Owner">{ownerName(sel) ?? 'Unassigned'}</Field>
                    <Field label="Status">{STATUS_LABEL[sel.status] ?? sel.status.replace('_', ' ')}</Field>
                    <Field label="Status light">
                      {sel.light ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: LIGHT_HEX[sel.light as Light] }} />
                          <span className="capitalize">{sel.light}</span>
                        </span>
                      ) : '—'}
                    </Field>
                    <Field label="Due date">{sel.dueDate ? fmtDate(sel.dueDate) : '—'}</Field>
                  </dl>
                  <div className="mt-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-1.5">Description</div>
                    <p className="text-sm text-ls-ink-2 whitespace-pre-wrap">{sel.description || '—'}</p>
                  </div>
                </>
              )
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-ls-ink-3">Select an item to see its details.</div>
            )}
          </div>
        </div>
      )}

      {view === 'people' && (
        <div className="ls-card p-5 min-h-[520px]">
          <div className="relative max-w-sm mb-5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-ink-3" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search employees by name…"
              value={personQuery}
              onFocus={() => setShowPersonMenu(true)}
              onBlur={() => setTimeout(() => setShowPersonMenu(false), 150)}
              onChange={(e) => { setPersonQuery(e.target.value); setShowPersonMenu(true); setSelectedPersonId(null); }}
            />
            {showPersonMenu && filteredMembers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-ls-card border border-ls-line rounded-md shadow-lg max-h-64 overflow-y-auto py-1">
                {filteredMembers.map((p) => (
                  <button key={p.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedPersonId(p.id);
                      setPersonQuery(p.name);
                      setShowPersonMenu(false);
                    }}
                    className="w-full text-left flex items-center gap-2.5 py-1.5 px-3 hover:bg-ls-bg-2">
                    <span className="w-7 h-7 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {initials(p.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ls-ink truncate">{p.name}</span>
                      <span className="block text-[12px] text-ls-ink-3 truncate">{p.role}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
                            {n.description && <p className="text-[12.5px] text-ls-ink-2 mt-1 whitespace-pre-wrap">{n.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <div className="text-sm text-ls-ink-3">Search for an employee above to see the OKRs they own.</div>
          )}
        </div>
      )}

      {view === 'archived' && (
        <div className="ls-card p-5 min-h-[520px]">
          <div className="flex items-center gap-2 mb-4">
            <Archive size={16} className="text-ls-ink-3" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3">Archived OKRs</span>
          </div>
          {archivedQ.isLoading && <div className="text-sm text-ls-ink-3">Loading…</div>}
          {!archivedQ.isLoading && archivedRows.length === 0 && (
            <div className="text-sm text-ls-ink-3">Nothing archived. Archived OKRs are kept here and can be restored to the plan.</div>
          )}
          {PERSON_GROUPS.map((g) => {
            const items = archivedRows.filter((n) => n.type === g.type);
            if (items.length === 0) return null;
            return (
              <div key={g.type} className="mb-4 last:mb-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 mb-2">{g.label}</div>
                {items.map((n) => (
                  <div key={n.id} className="flex items-center gap-2.5 py-2 border-b border-ls-line last:border-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: n.light ? LIGHT_HEX[n.light as Light] : '#8A969E' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ls-ink truncate">{n.title}</div>
                      <div className="text-[12px] text-ls-ink-3">
                        {ownerName(n) ?? 'Unassigned'} · {STATUS_LABEL[n.status] ?? n.status}
                      </div>
                    </div>
                    <button onClick={() => unarchive.mutate({ id: n.id })} disabled={unarchive.isPending}
                      className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-blue-deep"><RotateCcw size={13} /> Restore</button>
                    <button onClick={() => deleteNode(n.id)} disabled={remove.isPending}
                      className="ls-btn ls-btn-ghost text-xs py-1.5 px-2.5 text-ls-risk"><Trash2 size={13} /> Delete</button>
                  </div>
                ))}
              </div>
            );
          })}
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
