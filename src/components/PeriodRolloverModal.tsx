// ============================================================
// PERIOD ROLLOVER MODAL — shown on the Weekly Plan when the priorities
// period has turned over. AI Engagement, 2026-07-30 (PM request).
//
// Why it lives on the Weekly Plan and not app-wide: this is the employee-facing
// half of the period cadence, and the Weekly Plan is where an IC actually works.
// The app-wide PeriodNoticeModal handles the manager-facing 9 Box / review notice.
//
// Why carry-over exists at all: priorities are period-scoped and a past period is
// locked server-side, so the moment a period rolls the list is empty — and the
// employee cannot refill it, because creating priorities is manager-gated. Without
// this they are stuck looking at an empty list with no available action.
//
// Items are pre-checked, so the default action matches "my old priorities carried
// over" while still letting someone drop what is no longer relevant. Completed
// priorities are deliberately NOT offered: finished work carried forward is noise.
// ============================================================

import { useState, useEffect } from 'react';
import { CalendarClock, Lock, X } from 'lucide-react';
import { trpc } from '../lib/trpc';

export default function PeriodRolloverModal() {
  const utils = trpc.useContext();
  const { data } = trpc.orgScreen.prioritiesRolloverPreview.useQuery();
  const [dismissed, setDismissed] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Pre-check everything once the preview lands.
  useEffect(() => {
    if (data?.showPrompt) setPicked(new Set(data.items.map((i) => i.id)));
  }, [data]);

  const carry = trpc.orgScreen.prioritiesCarryOver.useMutation({
    onSuccess: () => {
      setDismissed(true);
      utils.orgScreen.prioritiesRolloverPreview.invalidate();
      utils.orgScreen.prioritiesByUser.invalidate();
      utils.cadence.status.invalidate();
      utils.weeklyPlan.getCurrent.invalidate();
    },
  });

  if (dismissed || !data?.showPrompt || data.items.length === 0) return null;

  const toggle = (id: string) =>
    setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      role="dialog" aria-modal="true" aria-labelledby="rollover-title">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <CalendarClock size={18} className="text-blue-600" />
            </span>
            <div>
              <div className="ls-eyebrow">New period · {data.currentPeriodLabel}</div>
              <h2 id="rollover-title" className="text-[17px] font-bold tracking-tight text-gray-900">
                Carry your priorities forward?
              </h2>
            </div>
          </div>
          <button type="button" onClick={() => setDismissed(true)} title="Not now"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 flex items-start gap-2 text-[13px] leading-snug text-gray-600">
            <Lock size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <span>
              {data.previousPeriodLabel} is now closed and view-only. These priorities
              weren&rsquo;t finished — pick the ones that still matter for {data.currentPeriodLabel}.
            </span>
          </p>
          <ul className="space-y-1.5">
            {data.items.map((i) => (
              <li key={i.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] leading-snug text-gray-800 transition-colors hover:bg-gray-50">
                  <input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600" />
                  <span>
                    {i.label}
                    {i.assigned && <span className="ml-1.5 text-[11px] text-gray-400">· assigned by your manager</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button type="button" onClick={() => setDismissed(true)}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            Start fresh
          </button>
          <button type="button" disabled={picked.size === 0 || carry.isLoading}
            onClick={() => carry.mutate({ ids: [...picked] })}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40">
            {carry.isLoading ? 'Carrying over…' : `Carry over ${picked.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}
