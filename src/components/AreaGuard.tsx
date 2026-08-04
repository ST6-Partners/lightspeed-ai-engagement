// ============================================================
// AREA GUARD (AIE 2026-08-03)
//
// Hiding a link is not access control — the route is still reachable by
// typing the URL. This wraps each area's routes and refuses to render when
// the Access grid says no. The server enforces the same rule on every
// procedure; this is the polite version so people get a sentence instead of
// a screen of failed requests.
// ============================================================

import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { trpc } from '../lib/trpc';

type Area = 'planning' | 'engagement' | 'insights' | 'documents' | 'assessments';

export default function AreaGuard({ area, children }: { area: Area; children?: ReactNode }) {
  const { data: areas, isLoading } = trpc.accessControl.myAreas.useQuery();

  // Render nothing while resolving rather than flashing content we may block.
  if (isLoading || !areas) return null;

  if (areas[area] === 'none') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock size={28} className="text-ls-ink-3 mb-3" />
        <p className="text-[15px] font-semibold text-ls-ink">You do not have access to this page</p>
        <p className="text-xs text-ls-ink-2 mt-1 max-w-sm">
          If you think you should, ask an administrator to check your access level.
        </p>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
