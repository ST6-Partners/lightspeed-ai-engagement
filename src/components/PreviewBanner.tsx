// ============================================================
// PREVIEW BANNER (AIE 2026-08-03)
//
// The way out of "view as" mode. Renders on every page above everything else
// while a preview is active, so there is never a screen you can reach where
// the exit is missing — which is the whole point: previewing as User hides the
// Admin screen, and if the only way back lived in there you would be stuck.
//
// Stop calls a procedure that checks the STORED level, not the previewed one.
// ============================================================

import { Eye } from 'lucide-react';
import { trpc } from '../lib/trpc';

const LABELS: Record<string, string> = {
  sysadmin: 'Sysadmin', elt: 'ELT', hr: 'HR', manager: 'Manager', user: 'User',
};

export default function PreviewBanner() {
  const utils = trpc.useContext();
  const { data } = trpc.accessControl.previewState.useQuery();

  const stop = trpc.accessControl.stopPreview.useMutation({
    onSuccess: async () => {
      // Everything access-dependent has to re-resolve, so clear the lot.
      await utils.invalidate();
      window.location.reload();
    },
  });

  if (!data?.previewLevel) return null;

  return (
    <div className="w-full bg-ls-watch-bg border-b border-ls-watch/30 px-4 py-2 flex items-center justify-center gap-3 text-[13px]">
      <Eye size={15} className="text-ls-watch shrink-0" />
      <span className="text-ls-watch">
        You are viewing the app as <strong className="font-semibold">{LABELS[data.previewLevel] ?? data.previewLevel}</strong>.
        Your own access is unchanged.
      </span>
      <button
        onClick={() => stop.mutate()}
        disabled={stop.isPending}
        className="ls-btn ls-btn-ghost !py-1 !px-3 !text-xs shrink-0"
      >
        {stop.isPending ? 'Returning…' : `Back to ${LABELS[data.realLevel ?? 'sysadmin']}`}
      </button>
    </div>
  );
}
