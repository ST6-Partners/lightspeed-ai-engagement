import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Search, Info, UserPlus, X, Trash2 } from 'lucide-react';
import ImportButton from '../../components/ImportButton';

const ROLE_OPTIONS = ['user', 'manager', 'admin', 'sysadmin'] as const;
const ROLE_COLORS: Record<string, string> = {
  sysadmin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  user: 'bg-gray-100 text-gray-800',
};

// Employees = the users directory (Core Data). Beyond app-level role/flags, each
// record carries Title + Department (managed lookups) and a Manager (another
// employee). Accounts are still created at sign-up; this screen curates them.
export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const utils = trpc.useContext();
  const { data: userList = [], isLoading } = trpc.auth.listUsers.useQuery();
  const { data: titles = [] } = trpc.jobTitles.list.useQuery();
  const { data: depts = [] } = trpc.departments.list.useQuery();
  const updateMutation = trpc.auth.updateUser.useMutation({
    onSuccess: () => utils.auth.listUsers.invalidate(),
  });
  const importEmployees = trpc.auth.importUsers.useMutation({ onSuccess: () => utils.auth.listUsers.invalidate() });
  const set = (id: string, patch: Record<string, unknown>) => updateMutation.mutate({ id, ...patch } as any);

  // ── Add Employee (admin create) ──────────────────────────────
  const EMPTY = { name: '', email: '', role: 'user', jobTitleId: '', departmentId: '', managerId: '', leaderBadge: '', isActive: true, tempPassword: '' };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [addError, setAddError] = useState<string | null>(null);
  const f = (patch: Partial<typeof EMPTY>) => setForm((prev) => ({ ...prev, ...patch }));
  const createMutation = trpc.auth.createUser.useMutation({
    onSuccess: () => { utils.auth.listUsers.invalidate(); setForm(EMPTY); setShowAdd(false); setAddError(null); },
    onError: (e: any) => setAddError(e.message ?? 'Could not add employee.'),
  });
  const submitAdd = () => {
    setAddError(null);
    if (!form.email.trim()) { setAddError('Email is required.'); return; }
    createMutation.mutate({
      email: form.email.trim(),
      name: form.name.trim() || undefined,
      role: form.role as any,
      jobTitleId: form.jobTitleId || null,
      departmentId: form.departmentId || null,
      managerId: form.managerId || null,
      leaderBadge: (form.leaderBadge || null) as any,
      isActive: form.isActive,
      tempPassword: form.tempPassword.trim() || undefined,
    } as any);
  };

  // ── Remove Employee (admin hard delete) ──────────────────────
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = trpc.auth.deleteUser.useMutation({
    onSuccess: () => { utils.auth.listUsers.invalidate(); setPendingDelete(null); setDeleteError(null); },
    onError: (e: any) => setDeleteError(e.message ?? 'Could not remove employee.'),
  });

  // ── Edit Employee (click a name → full edit modal, one Save) ──
  const EDIT_EMPTY = { name: '', email: '', role: 'user', jobTitleId: '', departmentId: '', managerId: '', managerIds: [] as string[], primaryManagerId: '', leaderBadge: '', isActive: true, isBeta: false, isHrAccess: false };
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);
  const [editError, setEditError] = useState<string | null>(null);
  const [managerSearch, setManagerSearch] = useState('');
  const ef = (patch: Partial<typeof EDIT_EMPTY>) => setEditForm((prev) => ({ ...prev, ...patch }));
  const openEdit = (u: any) => {
    setEditError(null);
    setManagerSearch('');
    setEditForm({
      name: u.name ?? '', email: u.email ?? '', role: u.role ?? 'user',
      jobTitleId: u.jobTitleId ?? '', departmentId: u.departmentId ?? '',
      managerId: u.managerId ?? '',
      managerIds: (u.managerIds ?? (u.managerId ? [u.managerId] : [])) as string[],
      primaryManagerId: u.managerId ?? '',
      leaderBadge: u.leaderBadge ?? '',
      isActive: !!u.isActive, isBeta: !!u.isBeta, isHrAccess: !!u.isHrAccess,
    });
    setEditUser(u);
  };
  const editMutation = trpc.auth.updateUser.useMutation({
    onSuccess: () => { utils.auth.listUsers.invalidate(); setEditUser(null); setEditError(null); },
    onError: (e: any) => setEditError(e.message ?? 'Could not save changes.'),
  });
  const submitEdit = () => {
    if (!editUser) return;
    setEditError(null);
    if (!editForm.email.trim()) { setEditError('Email is required.'); return; }
    editMutation.mutate({
      id: editUser.id,
      name: editForm.name.trim() || null,
      email: editForm.email.trim(),
      role: editForm.role as any,
      jobTitleId: editForm.jobTitleId || null,
      departmentId: editForm.departmentId || null,
      managerIds: editForm.managerIds,
      primaryManagerId: editForm.primaryManagerId || null,
      leaderBadge: (editForm.leaderBadge || null) as any,
      isActive: editForm.isActive,
      isBeta: editForm.isBeta,
      isHrAccess: editForm.isHrAccess,
    } as any);
  };

  const filtered = userList.filter((u: any) => {
    const q = searchQuery.toLowerCase();
    return (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
  });
  const activeCount = userList.filter((u: any) => u.isActive).length;
  const nameById = new Map<string, string>(userList.map((u: any) => [u.id, u.name ?? u.email ?? '—']));
  // Manager picker on the Add Employee form, sorted by first name.
  const firstName = (n: string) => (n ?? '').trim().split(/\s+/)[0].toLowerCase();
  const employeesByFirstName = [...userList].sort((a: any, b: any) =>
    firstName(a.name ?? a.email ?? '').localeCompare(firstName(b.name ?? b.email ?? '')));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Employees</h2>
          <p className="text-sm text-gray-500">The staff directory. Accounts are created at sign-up; assign each person a title, department, manager, and app role here. Title and Department come from the Core Data lookups.</p>
        </div>
        <ImportButton label="Import employees" hint="CSV: email, name, role, title, department, manager, leaderBadge"
          onImport={async (rows) => importEmployees.mutateAsync({ rows: rows.map((r) => ({ email: r.email ?? '', name: r.name, role: r.role, title: r.title, department: r.department, manager: r.manager, leaderBadge: r.leaderbadge })) })} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">Title &amp; Department are managed in Core Data → Job Titles / Departments. Manager is another employee (their boss).</div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{userList.length} total</div>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{activeCount} active</div>
        <button onClick={() => { setShowAdd((v) => !v); setAddError(null); }}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">
          {showAdd ? <X size={14} /> : <UserPlus size={14} />}{showAdd ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">New employee</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-xs text-gray-600">Name
              <input value={form.name} onChange={(e) => f({ name: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Full name" />
            </label>
            <label className="text-xs text-gray-600">Email <span className="text-red-500">*</span>
              <input type="email" value={form.email} onChange={(e) => f({ email: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" placeholder="name@company.com" />
            </label>
            <label className="text-xs text-gray-600">Role
              <select value={form.role} onChange={(e) => f({ role: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">Title
              <select value={form.jobTitleId} onChange={(e) => f({ jobTitleId: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                {titles.map((t: any) => <option key={t.id} value={t.id}>{t.title}{t.level ? ` · ${t.level}` : ''}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">Department
              <select value={form.departmentId} onChange={(e) => f({ departmentId: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">Manager
              <select value={form.managerId} onChange={(e) => f({ managerId: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">— (top of tree)</option>
                {employeesByFirstName.map((m: any) => <option key={m.id} value={m.id}>{nameById.get(m.id)}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">Leader badge
              <select value={form.leaderBadge} onChange={(e) => f({ leaderBadge: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                <option value="ELT">ELT</option>
                <option value="SLT">SLT</option>
              </select>
            </label>
            <label className="text-xs text-gray-600">Temp password <span className="text-gray-400">(optional)</span>
              <input type="text" value={form.tempPassword} onChange={(e) => f({ tempPassword: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" placeholder="min 8 chars — leave blank for directory-only" />
            </label>
            <label className="text-xs text-gray-600 flex items-center gap-2 mt-5">
              <input type="checkbox" checked={form.isActive} onChange={(e) => f({ isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Active
            </label>
          </div>
          {addError && <div className="text-xs text-red-600">{addError}</div>}
          <div className="flex items-center gap-2">
            <button onClick={submitAdd} disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              <UserPlus size={14} />{createMutation.isPending ? 'Adding…' : 'Add employee'}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(EMPTY); setAddError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
            <span className="text-xs text-gray-400">Directory record on the users table — powers the org tree via Manager.</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search employees..." className="w-full text-sm focus:outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading employees...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{searchQuery ? `No employees matching "${searchQuery}"` : 'No employees yet.'}</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-3 py-3 w-16">Active</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3 w-[170px]">Title</th>
                <th className="px-3 py-3 w-[150px]">Department</th>
                <th className="px-3 py-3 w-[170px]">Manager</th>
                <th className="px-3 py-3 w-[110px]">Role</th>
                <th className="px-3 py-3 w-[90px]">Badge</th>
                <th className="px-3 py-3 w-12">Remove</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user: any) => (
                <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-3">
                    {/* Display-only status; the editable checkbox lives in the edit popup */}
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-700' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <button type="button" onClick={() => openEdit(user)}
                      title="Edit employee"
                      className="font-medium text-blue-700 hover:text-blue-900 hover:underline text-left">
                      {user.name ?? '—'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">{user.email || '—'}</td>

                  {/* Title — managed job_titles lookup */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.jobTitleId ?? ''} onChange={(e) => set(user.id, { jobTitleId: e.target.value || null })}
                      className="w-full px-2 py-1 rounded text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500">
                      <option value="">—</option>
                      {titles.map((t: any) => <option key={t.id} value={t.id}>{t.title}{t.level ? ` · ${t.level}` : ''}</option>)}
                    </select>
                  </td>

                  {/* Department — managed departments lookup */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.departmentId ?? ''} onChange={(e) => set(user.id, { departmentId: e.target.value || null })}
                      className="w-full px-2 py-1 rounded text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500">
                      <option value="">—</option>
                      {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>

                  {/* Manager (primary) — another employee. "+N" = extra managers; manage them in the modal. */}
                  <td className="px-3 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <select value={user.managerId ?? ''} onChange={(e) => set(user.id, { managerId: e.target.value || null })}
                        className="w-full px-2 py-1 rounded text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500">
                        <option value="">—</option>
                        {employeesByFirstName.filter((m: any) => m.id !== user.id).map((m: any) => (
                          <option key={m.id} value={m.id}>{nameById.get(m.id)}</option>
                        ))}
                      </select>
                      {Array.isArray(user.managerIds) && user.managerIds.length > 1 && (
                        <span title="Additional managers — edit in the employee modal" className="shrink-0 text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-1 py-0.5">+{user.managerIds.length - 1}</span>
                      )}
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.role} onChange={(e) => set(user.id, { role: e.target.value })}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </td>

                  {/* Leader badge — Org tree tier (ELT/SLT) */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.leaderBadge ?? ''} onChange={(e) => set(user.id, { leaderBadge: e.target.value || null })}
                      className="w-full px-2 py-1 rounded text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500">
                      <option value="">—</option>
                      <option value="ELT">ELT</option>
                      <option value="SLT">SLT</option>
                    </select>
                  </td>

                  {/* Remove — hard delete with confirm */}
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => { setDeleteError(null); setPendingDelete(user); }}
                      title="Remove employee"
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!deleteMutation.isPending) setPendingDelete(null); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-full bg-red-100 text-red-600 flex-shrink-0"><Trash2 size={18} /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Remove {pendingDelete.name ?? pendingDelete.email ?? 'this employee'}?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This permanently deletes the directory record and can&apos;t be undone. Anyone reporting to them has their manager cleared, and their own reviews, coaching plans, and survey responses are removed with them. If you only want to hide them, set them to <span className="font-medium">Inactive</span> instead.
                </p>
              </div>
            </div>
            {deleteError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{deleteError}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate({ id: pendingDelete.id })} disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                <Trash2 size={14} />{deleteMutation.isPending ? 'Removing…' : 'Remove employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!editMutation.isPending) setEditUser(null); }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Edit {editUser.name ?? editUser.email ?? 'employee'}</h3>
              <button onClick={() => setEditUser(null)} className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-xs text-gray-600">Name
                <input value={editForm.name} onChange={(e) => ef({ name: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Full name" />
              </label>
              <label className="text-xs text-gray-600">Email <span className="text-red-500">*</span>
                <input type="email" value={editForm.email} onChange={(e) => ef({ email: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" placeholder="name@company.com" />
              </label>
              <label className="text-xs text-gray-600">Role
                <select value={editForm.role} onChange={(e) => ef({ role: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600">Title
                <select value={editForm.jobTitleId} onChange={(e) => ef({ jobTitleId: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">—</option>
                  {titles.map((t: any) => <option key={t.id} value={t.id}>{t.title}{t.level ? ` · ${t.level}` : ''}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600">Department
                <select value={editForm.departmentId} onChange={(e) => ef({ departmentId: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">—</option>
                  {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <div className="text-xs text-gray-600 sm:col-span-2 lg:col-span-3">Managers
                <input value={managerSearch} onChange={(e) => setManagerSearch(e.target.value)}
                  placeholder="Search people…"
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500" />
                <div className="mt-1 max-h-40 overflow-auto rounded border border-gray-300 p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
                  {employeesByFirstName.filter((m: any) => m.id !== editUser.id && (editForm.managerIds.includes(m.id) || (nameById.get(m.id) ?? '').toLowerCase().includes(managerSearch.toLowerCase()))).map((m: any) => {
                    const checked = editForm.managerIds.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700">
                        <input type="checkbox" checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...editForm.managerIds, m.id]
                              : editForm.managerIds.filter((x) => x !== m.id);
                            const primary = next.includes(editForm.primaryManagerId) ? editForm.primaryManagerId : (next[0] ?? '');
                            ef({ managerIds: next, primaryManagerId: primary });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="truncate">{nameById.get(m.id)}</span>
                      </label>
                    );
                  })}
                </div>
                <span className="mt-1 block text-[11px] text-gray-400">Pick one or more. The primary manager (below) is the one who can place them on the 9 Box.</span>
              </div>
              <label className="text-xs text-gray-600">Primary manager
                <select value={editForm.primaryManagerId} onChange={(e) => ef({ primaryManagerId: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">— (top of tree)</option>
                  {editForm.managerIds.map((mid) => <option key={mid} value={mid}>{nameById.get(mid)}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600 flex items-center gap-2 mt-5">
                <input type="checkbox" checked={editForm.isHrAccess} onChange={(e) => ef({ isHrAccess: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> HR access (company-wide view)
              </label>
              <label className="text-xs text-gray-600">Leader badge
                <select value={editForm.leaderBadge} onChange={(e) => ef({ leaderBadge: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">—</option>
                  <option value="ELT">ELT</option>
                  <option value="SLT">SLT</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 flex items-center gap-2 mt-5">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => ef({ isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Active
              </label>
            </div>
            {editError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{editError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditUser(null)} disabled={editMutation.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={submitEdit} disabled={editMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {editMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
