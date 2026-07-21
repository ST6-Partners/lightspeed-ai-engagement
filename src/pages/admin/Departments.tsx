// ============================================================
// CORE DATA · DEPARTMENTS — manage the departments (teams) AND their members.
//
// Two jobs on one screen:
//   1. The managed department vocabulary (add / rename / activate / delete) —
//      feeds Job Titles, the PIP "Team / Department" field, and the Exit Survey.
//   2. Team membership — each department lists the people on it (name, title,
//      manager) and is editable: move a person to another team, remove them
//      from a team, or add an existing employee to a team. Membership is the
//      employee's single Department field (users.departmentId); a person is on
//      exactly one team at a time, matching the org chart.
// ============================================================

import { useState, useMemo } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown, Users, UserPlus, UserMinus } from 'lucide-react';

const inputCls =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

interface Dept { id: string; name: string; description: string | null; isActive: boolean; sortOrder: number; }
interface Emp { id: string; name: string | null; email: string; title: string | null; departmentId: string | null; managerId: string | null; isActive: boolean; }

export default function Departments() {
  const utils = trpc.useContext();
  const { data: depts, isLoading } = trpc.departments.list.useQuery({ includeInactive: true });
  const { data: users = [] } = trpc.auth.listUsers.useQuery();

  const create = trpc.departments.create.useMutation({ onSuccess: () => { resetNew(); utils.departments.list.invalidate(); } });
  const update = trpc.departments.update.useMutation({ onSuccess: () => { setEditing(null); utils.departments.list.invalidate(); } });
  const remove = trpc.departments.remove.useMutation({ onSuccess: () => utils.departments.list.invalidate(), onError: (e) => alert(e.message) });
  const moveEmp = trpc.auth.updateUser.useMutation({ onSuccess: () => utils.auth.listUsers.invalidate(), onError: (e) => alert(e.message) });

  const [nName, setNName] = useState('');
  const [nDesc, setNDesc] = useState('');
  const resetNew = () => { setNName(''); setNDesc(''); };
  const [editing, setEditing] = useState<Dept | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null); // deptId showing the "add person" picker
  const [pickerSearch, setPickerSearch] = useState('');

  const addDept = () => {
    if (!nName.trim()) return;
    create.mutate({ name: nName.trim(), description: nDesc || undefined });
  };
  const toggleExpand = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Membership grouping (active employees only) ───────────────
  const activeEmps = useMemo(() => (users as Emp[]).filter((u) => u.isActive), [users]);
  const nameById = useMemo(() => new Map<string, string>((users as Emp[]).map((u) => [u.id, u.name ?? u.email])), [users]);
  const membersByDept = useMemo(() => {
    const m = new Map<string, Emp[]>();
    for (const u of activeEmps) {
      const key = u.departmentId ?? '__none__';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(u);
    }
    for (const list of m.values()) list.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
    return m;
  }, [activeEmps]);
  const unassigned = membersByDept.get('__none__') ?? [];

  const sortedDepts = useMemo(
    () => [...((depts as Dept[]) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [depts],
  );

  // Members eligible to add to a department = everyone not already on it.
  const eligibleFor = (deptId: string) => {
    const q = pickerSearch.trim().toLowerCase();
    return activeEmps
      .filter((u) => u.departmentId !== deptId)
      .filter((u) => !q || (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || (u.title ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
  };

  const MemberRow = ({ u }: { u: Emp }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-900 font-medium truncate">{u.name ?? u.email}</div>
        <div className="text-xs text-gray-500 truncate">
          {u.title || '—'}{u.managerId ? <span className="text-gray-400"> · reports to {nameById.get(u.managerId) ?? '—'}</span> : null}
        </div>
      </div>
      {/* Move to another team */}
      <select
        className="text-xs border border-gray-200 rounded-md px-1.5 py-1 text-gray-600 bg-white max-w-[170px]"
        value={u.departmentId ?? ''}
        title="Move to another team"
        onChange={(e) => moveEmp.mutate({ id: u.id, departmentId: e.target.value || null } as any)}
      >
        <option value="">— Unassigned —</option>
        {sortedDepts.filter((d) => d.isActive || d.id === u.departmentId).map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button
        onClick={() => { if (confirm(`Remove ${u.name ?? u.email} from this team? (They'll be unassigned.)`)) moveEmp.mutate({ id: u.id, departmentId: null } as any); }}
        className="p-1 text-gray-400 hover:text-red-600 rounded" title="Remove from team">
        <UserMinus size={14} />
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Departments &amp; Teams</h2>
        <p className="text-sm text-gray-500">
          The managed list of departments (used by Job Titles, PIP, and the Exit Survey) and the people on each team.
          Each person is on one team at a time. Expand a department to see and edit its members.
        </p>
      </div>

      {/* Add department */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="w-56">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">New department</label>
          <input className={`${inputCls} w-full`} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. Data Science" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Description</label>
          <input className={`${inputCls} w-full`} value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="optional" />
        </div>
        <button onClick={addDept} disabled={!nName.trim() || create.isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} /> Add
        </button>
      </div>

      {/* Department cards */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Loading…</div>
      ) : sortedDepts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No departments yet. Add one above.</div>
      ) : (
        <div className="space-y-2">
          {sortedDepts.map((d) => {
            const isEd = editing?.id === d.id;
            const members = membersByDept.get(d.id) ?? [];
            const isOpen = expanded.has(d.id);
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button onClick={() => toggleExpand(d.id)} className="p-0.5 text-gray-400 hover:text-gray-700" title={isOpen ? 'Collapse' : 'Expand'}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {isEd ? (
                      <div className="flex flex-wrap gap-2">
                        <input className={`${inputCls} w-48`} value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} />
                        <input className={`${inputCls} flex-1 min-w-[140px]`} value={editing!.description ?? ''} placeholder="description"
                          onChange={(e) => setEditing({ ...editing!, description: e.target.value })} />
                      </div>
                    ) : (
                      <button onClick={() => toggleExpand(d.id)} className="text-left">
                        <span className={d.isActive ? 'text-gray-900 font-semibold' : 'text-gray-400 line-through'}>{d.name}</span>
                        {d.description ? <span className="text-gray-400 text-xs ml-2">{d.description}</span> : null}
                      </button>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                    <Users size={13} /> {members.length}
                  </span>

                  <button
                    onClick={() => update.mutate({ id: d.id, isActive: !d.isActive })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    title="Toggle active">
                    {d.isActive ? 'Active' : 'Inactive'}
                  </button>

                  <div className="whitespace-nowrap">
                    {isEd ? (
                      <>
                        <button onClick={() => update.mutate({ id: d.id, name: editing!.name.trim(), description: editing!.description || null })}
                          className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save"><Check size={15} /></button>
                        <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditing(d)} className="p-1 text-gray-400 hover:text-blue-600" title="Rename"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm(`Delete “${d.name}”? (Blocked if anyone is on it — remove members or deactivate instead.)`)) remove.mutate({ id: d.id }); }}
                          className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Member list */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {members.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-gray-400">No one is on this team yet.</div>
                    ) : (
                      <div>{members.map((u) => <MemberRow key={u.id} u={u} />)}</div>
                    )}

                    {/* Add person */}
                    <div className="px-3 py-2 border-t border-gray-100">
                      {addingTo === d.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input autoFocus className={`${inputCls} w-48`} placeholder="Search employee…" value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)} />
                          <select className={`${inputCls} flex-1 min-w-[180px]`} defaultValue=""
                            onChange={(e) => { if (e.target.value) { moveEmp.mutate({ id: e.target.value, departmentId: d.id } as any); setAddingTo(null); setPickerSearch(''); } }}>
                            <option value="">Select a person to add…</option>
                            {eligibleFor(d.id).map((u) => (
                              <option key={u.id} value={u.id}>
                                {(u.name ?? u.email)}{u.title ? ` — ${u.title}` : ''}{u.departmentId ? '' : '  (unassigned)'}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => { setAddingTo(null); setPickerSearch(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setAddingTo(d.id); setPickerSearch(''); }}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          <UserPlus size={14} /> Add person to {d.name}
                        </button>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">Adding someone moves them here from their current team (one team per person).</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned employees */}
          {unassigned.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-800">Unassigned</span>
                <span className="inline-flex items-center gap-1 text-xs text-amber-700"><Users size={13} /> {unassigned.length}</span>
                <span className="text-xs text-amber-600">— not on any team; assign each to a department</span>
              </div>
              <div>{unassigned.map((u) => <MemberRow key={u.id} u={u} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
