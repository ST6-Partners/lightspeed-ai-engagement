// ============================================================
// ITEM GUARD (AIE 2026-08-03)
//
// Per-item gate for Core Data pages. The area guard covers /core-data as a
// whole; this covers the eleven pages inside it, because a user may read most
// of them and not the instruments.
//
// Needed because filtering the sidebar was not enough — the Core Data hub
// renders its own card list, and every sub-page has a direct URL.
// ============================================================

import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { trpc } from '../lib/trpc';

export default function ItemGuard({ item, children }: { item: string; children?: ReactNode }) {
  const { data: caps, isLoading } = trpc.accessControl.myCapabilities.useQuery();
  if (isLoading || !caps) return null;

  if (!(caps.coreDataItems as string[]).includes(item)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock size={28} className="text-ls-ink-3 mb-3" />
        <p className="text-[15px] font-semibold text-ls-ink">You do not have access to this page</p>
        <p className="text-xs text-ls-ink-2 mt-1">Ask an administrator if you think you should.</p>
      </div>
    );
  }
  return <>{children ?? <Outlet />}</>;
}
