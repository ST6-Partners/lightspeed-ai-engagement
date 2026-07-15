import { useMemo, useState } from 'react';
import { Plus, Pencil, X, ChevronRight, ChevronDown, Target, KeyRound, CheckSquare } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { TabState, Empty, errKind } from './atoms';
import { TOKENS } from './orgLib';

const MAX = 3;

const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  objective:  { label: 'Objective', bg: '#dbeafe', fg: '#1e40af' },
  key_result: { label: 'KR',        bg: '#dcfce7', fg: '#166534' },
  task:       { label: 'Task',      bg: '#fef3c7', fg: '#92400e' },
  ktbr:       { label: 'KTBR',      bg: '#f3e8ff', fg: '#6d28d9' },
};

const TYPE_ICON: Record<string, typeof Target> = {
  objective: Target, key_result: KeyRound, task: CheckSquare,
};

type OkrRow = { id: string; parentId: string | null; type: string; title: string };
type ModalState = { mode: 'add' } | { mode: 'edit'; id: string; current: string | null } | null;

export default function PrioritiesTab({ employeeId }: { employeeId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.orgScreen.prioritiesByUser.useQuery({ userId: employeeId });
  const { data: me } = trpc.auth.me.useQuery();
  const role = (me as { role?: string } | undefined)?.role ?? 'user';
  const canManage = ['manager', 'admin', 'sysadmin'].includes(role);

  const [modal, setModal] = useState<ModalState>(null);
  const [err, setErr] = useState<string | null>(null);

  const onErr = (e: unknown) => {
    const code = (e as { data?: { code?: string } })?.data?.code;
    setErr(code === 'FORBIDDEN' ? 'Only managers can set priorities.'
      : (e as { message?: string })?.message ?? 'Could not save.');
  };
  const done = () => { utils.orgScreen.prioritiesByUser.invalidate({ userId: employeeId }); setModal(null); setErr(null); };
  const add = trpc.orgScreen.prioritiesAdd.useMutation({ onSuccess: done, onError: onErr });
  const edit = trpc.orgScreen.prioritiesEdit.useMutation({ onSuccess: done, onError: onErr });
  const del = trpc.orgScreen.prioritiesDelete.useMutation({
    onSuccess: () => utils.orgScreen.prioritiesByUser.invalidate({ userId: employeeId }),
    onError: onErr,
  });

  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;

  const items = data?.items ?? [];
  const count = items.length;

  const pick = (okrNodeId: string) => {
    setErr(null);
    if (modal?.mode === 'edit') edit.mutate({ id: modal.id, okrNodeId });
    else add.mutate({ userId: employeeId, okrNodeId });
  };

  return (
    <div>
      {/* Header: count + add */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TOKENS.idle }}>
          Priorities {count}/{MAX}
        </span>
        {canManage && (
          <button
            onClick={() => { setErr(null); setModal({ mode: 'add' }); }}
            disabled={count >= MAX}
            title={count >= MAX ? `Up to ${MAX} priorities` : 'Add a priority'}
            className="flex items-center justify-center rounded-md"
            style={{
              width: 22, height: 22, border: `1px solid ${TOKENS.border}`,
              color: count >= MAX ? '#c4c9d0' : TOKENS.selBar,
              cursor: count >= MAX ? 'default' : 'pointer', background: '#fff',
            }}>
            <Plus size={14} />
          </button>
        )}
      </div>

      {err && <div className="text-[11px] mb-2" style={{ color: '#b91c1c' }}>{err}</div>}

      {count === 0 ? (
        <Empty text={canManage ? 'No priorities set — click + to add one.' : 'No priorities set'} />
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const p = PILL[it.itemType] ?? PILL.ktbr;
            return (
              <div key={it.id} className="flex items-center gap-2 group">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                  style={{ background: p.bg, color: p.fg }}>{p.label}</span>
                <span className="text-[13px] min-w-0 truncate flex-1" style={{ color: '#1a1a2e' }}>{it.label}</span>
                {canManage && (
                  <span className="flex items-center gap-1 shrink-0">
                    {/* Only OKR-backed items can be re-picked from the tree */}
                    {it.okrNodeId && (
                      <button title="Change" onClick={() => { setErr(null); setModal({ mode: 'edit', id: it.id, current: it.okrNodeId }); }}
                        style={{ color: TOKENS.idle }}><Pencil size={13} /></button>
                    )}
                    <button title="Remove" disabled={del.isLoading}
                      onClick={() => { setErr(null); del.mutate({ id: it.id }); }}
                      style={{ color: '#b91c1c', opacity: del.isLoading ? 0.5 : 1 }}><X size={14} /></button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <OkrPickerModal
          title={modal.mode === 'edit' ? 'Change priority' : 'Add a priority'}
          currentId={modal.mode === 'edit' ? modal.current : null}
          saving={add.isLoading || edit.isLoading}
          onPick={pick}
          onClose={() => { setModal(null); setErr(null); }}
        />
      )}
    </div>
  );
}

// OKR tree picker — mirrors the OKRs page left-pane tree (objective → KR → task).
// Pick a node at any level; confirm applies it as the person's priority.
function OkrPickerModal({ title, currentId, saving, onPick, onClose }: {
  title: string; currentId: string | null; saving: boolean;
  onPick: (okrNodeId: string) => void; onClose: () => void;
}) {
  const { data, isLoading } = trpc.okrs.list.useQuery();
  const rows = (data ?? []) as OkrRow[];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<string | null>(currentId);

  const childrenOf = useMemo(() => {
    const m = new Map<string | null, OkrRow[]>();
    for (const r of rows) { const a = m.get(r.parentId) ?? []; a.push(r); m.set(r.parentId, a); }
    return m;
  }, [rows]);
  const activeIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const roots = rows.filter((r) => !r.parentId || !activeIds.has(r.parentId));

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const Row = ({ node, depth }: { node: OkrRow; depth: number }) => {
    const kids = childrenOf.get(node.id) ?? [];
    const isOpen = expanded[node.id] ?? depth === 0;
    const Icon = TYPE_ICON[node.type] ?? Target;
    const selected = sel === node.id;
    return (
      <div>
        <div className="flex items-center gap-1 rounded-md"
          style={{ paddingLeft: 8 + depth * 16, background: selected ? TOKENS.selBg : 'transparent' }}>
          <button onClick={() => kids.length && toggle(node.id)}
            style={{ width: 16, color: TOKENS.idle, visibility: kids.length ? 'visible' : 'hidden' }}>
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <button onClick={() => setSel(node.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left py-1.5">
            <Icon size={13} style={{ color: TOKENS.idle, flexShrink: 0 }} />
            <span className="text-[13px] truncate" style={{ color: '#1a1a2e', fontWeight: selected ? 600 : 400 }}>
              {node.title}
            </span>
          </button>
        </div>
        {isOpen && kids.map((k) => <Row key={k.id} node={k} depth={depth + 1} />)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,.45)' }} onClick={onClose}>
      <div className="rounded-xl shadow-xl flex flex-col" style={{ background: '#fff', width: 460, maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: `1px solid ${TOKENS.borderSoft}` }}>
          <div className="text-[15px] font-semibold" style={{ color: TOKENS.activeText }}>{title}</div>
          <button onClick={onClose} style={{ color: TOKENS.idle }}><X size={18} /></button>
        </div>
        <div className="text-[12px]" style={{ padding: '8px 18px 0', color: TOKENS.idle }}>
          Pick an objective, key result, or task.
        </div>
        <div className="flex-1 overflow-auto" style={{ padding: '8px 12px' }}>
          {isLoading ? <div className="text-[12px]" style={{ color: TOKENS.idle }}>Loading OKRs…</div>
            : roots.length === 0 ? <Empty text="No OKRs available." />
            : roots.map((r) => <Row key={r.id} node={r} depth={0} />)}
        </div>
        <div className="flex gap-2" style={{ padding: '12px 18px', borderTop: `1px solid ${TOKENS.borderSoft}` }}>
          <button onClick={() => sel && onPick(sel)} disabled={!sel || saving}
            className="flex-1 text-[13px] font-medium rounded-lg py-2"
            style={{ background: !sel || saving ? '#c7d2fe' : TOKENS.selBar, color: '#fff', cursor: !sel || saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving…' : 'Add priority'}
          </button>
          <button onClick={onClose} className="text-[13px] rounded-lg py-2 px-4" style={{ border: `1px solid ${TOKENS.border}`, color: TOKENS.idle }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
