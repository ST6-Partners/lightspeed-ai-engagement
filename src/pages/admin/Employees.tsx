import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Search, Clock, Info } from 'lucide-react';

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
  const set = (id: string, patch: Record<string, unknown>) => updateMutation.mutate({ id, ...patch } as any);

  const filtered = userList.filter((u: any) => {
    const q = searchQuery.toLowerCase();
    return (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
  });
  const activeCount = userList.filter((u: any) => u.isActive).length;
  const nameById = new Map<string, string>(userList.map((u: any) => [u.id, u.name ?? u.email ?? '—']));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Employees</h2>
        <p className="text-sm text-gray-500">The staff directory. Accounts are created at sign-up; assign each person a title, department, manager, and app role here. Title and Department come from the Core Data lookups.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">Title &amp; Department are managed in Core Data → Job Titles / Departments. Manager is another employee (their boss).</div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{userList.length} total</div>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{activeCount} active</div>
      </div>

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
                <th className="px-3 py-3 w-10">Active</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3 w-[170px]">Title</th>
                <th className="px-3 py-3 w-[150px]">Department</th>
                <th className="px-3 py-3 w-[170px]">Manager</th>
                <th className="px-3 py-3 w-[110px]">Role</th>
                <th className="px-3 py-3 w-[90px]">Badge</th>
                <th className="px-3 py-3 w-10">Beta</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user: any) => (
                <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={user.isActive} onChange={() => set(user.id, { isActive: !user.isActive })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 font-medium">{user.name ?? '—'}</td>
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

                  {/* Manager — another employee (their boss) */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.managerId ?? ''} onChange={(e) => set(user.id, { managerId: e.target.value || null })}
                      className="w-full px-2 py-1 rounded text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500">
                      <option value="">—</option>
                      {userList.filter((m: any) => m.id !== user.id).map((m: any) => (
                        <option key={m.id} value={m.id}>{nameById.get(m.id)}</option>
                      ))}
                    </select>
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.role} onChange={(e) => set(user.id, { role: e.target.value })}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </td>

                  {/* Leader badge — Org tree tier (ELT/SLT/ST6) */}
                  <td className="px-3 py-3 text-sm">
                    <select value={user.leaderBadge ?? ''} onChange={(e) => set(user.id, { leaderBadge: e.target.value || null })}
                      className="w-full px-2 py-1 rounded text-xs border border-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500">
                      <option value="">—</option>
                      <option value="ELT">ELT</option>
                      <option value="SLT">SLT</option>
                      <option value="ST6">ST6</option>
                    </select>
                  </td>

                  {/* Beta */}
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={user.isBeta} onChange={() => set(user.id, { isBeta: !user.isBeta })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
