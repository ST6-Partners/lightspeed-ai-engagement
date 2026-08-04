// ============================================================
// VIEW AS — sysadmin preview switcher (AIE 2026-08-03)
//
// Sits under the Access grid. Pick a level and the whole app resolves as that
// level for this browser session only; your stored record is untouched, so
// this can never lock you out the way actually demoting yourself would.
// ============================================================

import { Eye } from 'lucide-react';
import { trpc } from '../../lib/trpc';

const LEVELS = [
  { id: 'elt', label: 'ELT' },
  { id: 'slt', label: 'SLT' },
  { id: 'hr', label: 'HR' },
  { id: 'admin', label: 'Admin' },
  { id: 'manager', label: 'Manager' },
  { id: 'user', label: 'User' },
];

export default function PreviewSwitcher() {
  const { data } = trpc.accessControl.previewState.useQuery();
  const start = trpc.accessControl.startPreview.useMutation({
    onSuccess: () => window.location.assign('/'),
  });

  if (!data?.canPreview) return null;

  return (
    <div className="mt-6 pt-4 border-t border-ls-line">
      <div className="flex items-center gap-2">
        <Eye size={16} className="text-ls-ink-2" />
        <h4 className="text-[13px] font-semibold text-ls-ink">View as</h4>
      </div>
      <p className="text-[11px] text-ls-ink-2 mt-1 mb-3 max-w-xl leading-relaxed">
        See the app exactly as one of these levels sees it — the sidebar, the pages, and what
        the server will hand back. Your own access level is not changed, so you can always
        come back: an orange bar stays at the top of every page with a button to stop.
      </p>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => start.mutate({ level: l.id as never })}
            disabled={start.isPending}
            className="ls-btn ls-btn-ghost !py-1 !px-3 !text-xs"
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
