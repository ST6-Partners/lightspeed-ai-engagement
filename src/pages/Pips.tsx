import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Plus, Archive, ChevronRight } from 'lucide-react';
import PipForm from '../components/pip/PipForm';
import { STATUS_LABELS, STATUS_CLASS } from '../components/pip/types';
import type { PipStatus } from '../components/pip/types';

function StatusBadge({ status }: { status: PipStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

// Landing list of all Performance Improvement Plans (CRUD entry point).
export default function Pips() {
  const navigate = useNavigate();
  const { data: rows, refetch, isLoading } = trpc.pip.list.useQuery();
  const archive = trpc.pip.archive.useMutation({ onSuccess: () => refetch() });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Improvement Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Performance improvement plans — supportive, time-bound, no surprises</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New PIP
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : !rows || rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No improvement plans yet. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Manager</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Start</th>
                <th className="px-4 py-2.5 font-medium">Final review</th>
                <th className="px-4 py-2.5 font-medium text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/pips/${p.id}`)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{p.employeeName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.roleLevel ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.managerName ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status as PipStatus} /></td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.finalReviewDate)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/pips/${p.id}`); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                      title="Open plan"
                    >
                      Open <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Archive this plan?')) archive.mutate({ id: p.id });
                      }}
                      className="ml-1 p-1 text-gray-300 hover:text-red-600 transition-colors align-middle"
                      title="Archive"
                    >
                      <Archive size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <PipForm
          onClose={() => setShowCreate(false)}
          onSaved={(id) => { setShowCreate(false); navigate(`/pips/${id}`); }}
        />
      )}
    </div>
  );
}
