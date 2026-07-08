// ============================================================
// CORE DATA · COMPANY VALUES — read-only viewer of the values framework.
//
// The framework is OWNED BY the AI Talent Assessment app (ATA). This screen
// is a read-only mirror: there is no add/edit/delete here on purpose. Admins
// can "Refresh from source" to pull the latest definitions + rubric from ATA
// into the local cache (values.syncFromSource). Until the ATA endpoint is
// configured, local starter ("seed") values are shown so evaluations work.
// ============================================================

import { trpc } from '../../lib/trpc';
import { RefreshCw, Lock } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;

export default function CompanyValues() {
  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.admin;

  const { data: values, isLoading, refetch } = trpc.values.list.useQuery({ includeInactive: true });
  const { data: status, refetch: refetchStatus } = trpc.values.syncStatus.useQuery();
  const sync = trpc.values.syncFromSource.useMutation({
    onSuccess: (r) => { refetch(); refetchStatus(); alert(`Synced ${r.upserted} value(s) from ATA.`); },
    onError: (e) => alert(e.message),
  });

  const active = (values ?? []).filter((v: any) => v.active);
  const pillars = Array.from(new Set(active.map((v: any) => v.pillar)));
  const lastSynced = status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : 'never';

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Company Values</h2>
          <p className="text-sm text-gray-500">
            The company values framework used by employee performance evaluations (Engagement → Reviews).
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
            <RefreshCw size={15} className={sync.isLoading ? 'animate-spin' : ''} /> Refresh from source
          </button>
        )}
      </div>

      {/* Read-only / source banner */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm mb-4">
        <Lock size={15} className="mt-0.5 shrink-0" />
        <div>
          Read-only. These definitions are maintained in the AI Talent Assessment app and mirrored here to
          keep a single source of truth. Source: <span className="font-medium">{status?.configured ? 'ATA (live)' : 'local starter values'}</span>
          {' · '}last synced: <span className="font-medium">{lastSynced}</span>
          {!status?.configured && <> · <span className="italic">sync endpoint not configured yet</span></>}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm py-6 text-center">Loading…</div>
      ) : active.length === 0 ? (
        <div className="text-gray-500 text-sm py-6 text-center bg-white border border-gray-200 rounded-lg">No values yet.</div>
      ) : (
        pillars.map((pillar) => (
          <div key={pillar as string} className="mb-4">
            <h3 className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">{pillar as string}</h3>
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {active.filter((v: any) => v.pillar === pillar).map((v: any) => (
                <div key={v.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{v.name}</span>
                    {v.category && <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{v.category}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 ml-auto">{v.source}</span>
                  </div>
                  {v.description && <p className="text-sm text-gray-500 mt-0.5">{v.description}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
