// ============================================================
// PERIOD NOTICE MODAL — the new-period announcement.
//
// Replaces the short-lived Insights Dashboard "Periods" tab (removed 2026-07-30).
// A turnover is a moment worth interrupting someone for; a dashboard tab nobody
// opens is not. Design rules, per PM 2026-07-30:
//
//   * Fires on `cadence_new_period` ONLY, never on `cadence_overdue`. Modalling
//     the nag as well trains people to dismiss reflexively, which spends the
//     interruption budget for nothing. Overdue stays in the bell.
//   * Renders the notification messages VERBATIM. The server aggregates the count
//     into the message ("17 9 Box ratings now due"), so this component never has
//     to guess how many underlying rows produced a line, and stays correct if the
//     row shape changes again.
//   * Dismiss = mark those rows read (server-side), which is also the "already
//     saw it" flag. One dismissal per period, across devices. The rows survive in
//     the bell as read, so the notice is recoverable.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, X } from 'lucide-react';
import { trpc } from '../lib/trpc';

// Where each activity's work actually gets done. Without this the notice tells
// someone to set priorities and gives them nowhere to go.
const ACTION: Record<string, { label: string; to: string }> = {
  ninebox: { label: 'Rate the 9 Box', to: '/organization?tab=ninebox' },
  reviews: { label: 'Write reviews', to: '/organization?tab=review' },
  priorities: { label: 'Set priorities', to: '/organization?tab=priorities' },
};

export default function PeriodNoticeModal() {
  const navigate = useNavigate();
  const utils = trpc.useContext();
  // Suppress for the rest of this page-life the moment the user acts, so the
  // modal cannot flash back while the mutation settles.
  const [closed, setClosed] = useState(false);

  const { data: notifications } = trpc.notifications.list.useQuery();
  const dismiss = trpc.notifications.markNoticesRead.useMutation({
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const notices = (notifications ?? []).filter(
    (n: any) => n.type === 'cadence_new_period' && !n.readAt,
  );

  if (closed || notices.length === 0) return null;

  const close = () => { setClosed(true); dismiss.mutate({ types: ['cadence_new_period'] }); };
  const go = (to: string) => { setClosed(true); dismiss.mutate({ types: ['cadence_new_period'] }); navigate(to); };

  // One action button per distinct activity present, in a stable order.
  const activities = ['ninebox', 'reviews', 'priorities'].filter((a) =>
    notices.some((n: any) => n.referenceType === a),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      role="dialog" aria-modal="true" aria-labelledby="period-notice-title"
      onClick={close}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <CalendarClock size={18} className="text-blue-600" />
            </span>
            <div>
              <div className="ls-eyebrow">New period</div>
              <h2 id="period-notice-title" className="text-[17px] font-bold tracking-tight text-gray-900">
                A new period has opened
              </h2>
            </div>
          </div>
          <button type="button" onClick={close} title="Dismiss"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <ul className="space-y-2.5 px-5 py-4">
          {notices.map((n: any) => (
            <li key={n.id} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-gray-700">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
              <span>{n.message}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button type="button" onClick={close}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            Later
          </button>
          {activities.map((a, i) => (
            <button key={a} type="button" onClick={() => go(ACTION[a].to)}
              className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                i === 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              {ACTION[a].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
