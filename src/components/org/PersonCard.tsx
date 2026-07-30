import { Person, TabKey, TIER_BADGE, TOKENS, personInitials, personColor } from './orgLib';
import PrioritiesTab from './PrioritiesTab';
import OkrsTab from './OkrsTab';
import EngagementTab from './EngagementTab';
import AssessmentsTab from './AssessmentsTab';
import ReviewTab from './ReviewTab';

// The card body shows ONLY the selected tab's content for this person. Profile
// fields (location, tenure, manager, reporting line, etc.) intentionally live on
// the "Export talent profile" PDF, not on the card. The identity header (avatar,
// name, title, leader badge) stays so the card is still attributable.
export default function PersonCard({ person, tab, periodId, reviewPeriod, okrPeriodId, cadence, readOnly }: { person: Person; tab: TabKey; periodId?: string; reviewPeriod?: string | null; okrPeriodId?: string; cadence?: 'done' | 'due' | 'overdue'; readOnly?: boolean; managerName?: string | null; reportingLine?: string | null }) {
  const badge = person.leaderBadge ? TIER_BADGE[person.leaderBadge] : null;
  return (
    <div className="rounded-lg p-5" style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.borderSoft}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <span className="shrink-0 rounded-full flex items-center justify-center"
            style={{ width: 44, height: 44, background: personColor(person.name), color: '#fff', fontSize: 15, fontWeight: 700 }}>
            {personInitials(person.name)}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-[16px] truncate" style={{ color: TOKENS.activeText }}>{person.name}</div>
            <div className="text-[13px] truncate" style={{ color: TOKENS.idle }}>
              {person.title ?? '—'}{person.dept ? ` · ${person.dept}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(cadence === 'due' || cadence === 'overdue') && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={cadence === 'overdue' ? { background: '#fde2e0', color: '#b91c1c' } : { background: '#fef3c7', color: '#92400e' }}
              title={cadence === 'overdue' ? 'Overdue this period' : 'Due this period'}>{cadence}</span>
          )}
          {badge && (
            <span className="rounded px-1 text-[9px] font-bold"
              style={{ background: badge.bg, color: badge.fg }}>{person.leaderBadge}</span>
          )}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${TOKENS.borderSoft}`, paddingTop: 14 }}>
        {tab === 'priorities' && <PrioritiesTab employeeId={person.id} readOnly={readOnly} />}
        {tab === 'okrs' && <OkrsTab employeeId={person.id} name={person.name} periodId={okrPeriodId} />}
        {tab === 'engagement' && <EngagementTab employeeId={person.id} periodId={periodId} />}
        {tab === 'assessments' && <AssessmentsTab employeeId={person.id} />}
        {tab === 'review' && <ReviewTab employeeId={person.id} period={reviewPeriod} />}
      </div>
    </div>
  );
}
