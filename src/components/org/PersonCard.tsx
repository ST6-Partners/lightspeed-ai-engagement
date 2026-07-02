import { Person, TabKey, TIER_BADGE, TOKENS } from './orgLib';
import PrioritiesTab from './PrioritiesTab';
import OkrsTab from './OkrsTab';
import EngagementTab from './EngagementTab';
import AssessmentsTab from './AssessmentsTab';
import ReviewTab from './ReviewTab';

export default function PersonCard({ person, tab }: { person: Person; tab: TabKey }) {
  const badge = person.leaderBadge ? TIER_BADGE[person.leaderBadge] : null;
  return (
    <div className="rounded-lg p-3" style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.borderSoft}` }}>
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-[13.5px] truncate" style={{ color: TOKENS.activeText }}>{person.name}</div>
          <div className="text-[11px] truncate" style={{ color: TOKENS.idle }}>
            {person.title ?? '—'}{person.dept ? ` · ${person.dept}` : ''}
          </div>
        </div>
        {badge && (
          <span className="rounded px-1 text-[9px] font-bold shrink-0"
            style={{ background: badge.bg, color: badge.fg }}>{person.leaderBadge}</span>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${TOKENS.borderSoft}`, paddingTop: 10 }}>
        {tab === 'priorities' && <PrioritiesTab employeeId={person.id} />}
        {tab === 'okrs' && <OkrsTab employeeId={person.id} name={person.name} />}
        {tab === 'engagement' && <EngagementTab employeeId={person.id} />}
        {tab === 'assessments' && <AssessmentsTab employeeId={person.id} />}
        {tab === 'review' && <ReviewTab employeeId={person.id} />}
      </div>
    </div>
  );
}
