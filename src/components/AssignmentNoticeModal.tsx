// ============================================================
// ASSIGNMENT NOTICE MODAL — "your manager gave you something".
// AI Engagement, 2026-07-30 (PM request).
//
// Fires on unread `priority_assigned` / `action_item_assigned` notifications.
// Before this, both arrived silently: an assigned priority appeared as a chip in
// the employee's Weekly Plan and an assigned action item just showed up in a box.
// Neither told the person anything had happened.
//
// Mounted app-wide rather than on the Weekly Plan (where the rollover modal
// lives) because an assignment is a "someone did something to you" event that
// shouldn't wait until the employee next opens their weekly planning page. The
// action button takes them to the Weekly Plan, which is where they act on it.
//
// Defers to PeriodNoticeModal: both are app-wide, and two stacked modals on one
// page load is worse than showing the period notice first and this one next time.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';
import { trpc } from '../lib/trpc';

const ASSIGNMENT_TYPES = ['priority_assigned', 'action_item_assigned'] as const;

export default function AssignmentNoticeModal() {
  const navigate = useNavigate();
  const utils = trpc.useContext();
  const [closed, setClosed] = useState(false);

  const { data: notifications } = trpc.notifications.list.useQuery();
  const dismiss = trpc.notifications.markNoticesRead.useMutation({
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const rows = notifications ?? [];
  const notices = rows.filter((n: any) => ASSIGNMENT_TYPES.includes(n.type) && !n.readAt);
  // Period notice wins this page load.
  const periodNoticePending = rows.some((n: any) => n.type === 'cadence_new_period' && !n.readAt);

  if (closed || periodNoticePending || notices.length === 0) return null;

  const act = (go: boolean) => {
    setClosed(true);
    dismiss.mutate({ types: [...ASSIGNMENT_TYPES] });
    if (go) navigate('/weekly-plan');
  };

  const priorities = notices.filter((n: any) => n.type === 'priority_assigned').length;
  const items = notices.length - priorities;
  const parts = [
    priorities ? `${priorities} ${priorities === 1 ? 'priority' : 'priorities'}` : null,
    items ? `${items} ${items === 1 ? 'action item' : 'action items'}` : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/40 px-4"
      role="dialog" aria-modal="true" aria-labelledby="assignment-title"
      onClick={() => act(false)}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <UserPlus size={18} className="text-blue-600" />
            </span>
            <div>
              <div className="ls-eyebrow">Assigned to you</div>
              <h2 id="assignment-title" className="text-[17px] font-bold tracking-tight text-gray-900">
                You have {parts.join(' and ')}
              </h2>
            </div>
          </div>
          <button type="button" onClick={() => act(false)} title="Dismiss"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <ul className="space-y-2.5 px-5 py-4">
          {notices.map((n: any) => (
            <li key={n.id} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-gray-700">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
              <span>{n.message}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button type="button" onClick={() => act(false)}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            Dismiss
          </button>
          <button type="button" onClick={() => act(true)}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700">
            Open my Weekly Plan
          </button>
        </div>
      </div>
    </div>
  );
}
