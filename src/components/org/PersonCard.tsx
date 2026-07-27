import { Person, TabKey, TIER_BADGE, TOKENS, personInitials, personColor, tenureLabel, hireDateLabel } from './orgLib';
import PrioritiesTab from './PrioritiesTab';
import OkrsTab from './OkrsTab';
import EngagementTab from './EngagementTab';
import AssessmentsTab from './AssessmentsTab';
import ReviewTab from './ReviewTab';

export default function PersonCard({ person, tab, periodId, reviewPeriod, managerName, reportingLine }: { person: Person; tab: TabKey; periodId?: string; reviewPeriod?: string | null; managerName?: string | null; reportingLine?: string | null }) {
  const badge = person.leaderBadge ? TIER_BADGE[person.leaderBadge] : null;
  const infoRows: { label: string; value: string }[] = [];
  if (person.location) infoRows.push({ label: 'Location', value: person.location });
  if (person.businessUnit) infoRows.push({ label: 'Business Unit', value: person.businessUnit });
  if (person.eltLeader) infoRows.push({ label: 'ELT Leader', value: person.eltLeader });
  if (person.hireYear != null) infoRows.push({ label: 'Hire date', value: hireDateLabel(person.hireYear, person.hireMonth, person.hireDay) });
  if (person.hireYear != null) infoRows.push({ label: 'Tenure', value: tenureLabel(person.hireYear) });
  if (managerName) infoRows.push({ label: 'Manager', value: managerName });
  if (reportingLine) infoRows.push({ label: 'Reports up', value: reportingLine });
  return (
    <div className="rounded-lg p-3" style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.borderSoft}` }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="shrink-0 rounded-full flex items-center justify-center"
            style={{ width: 32, height: 32, background: personColor(person.name), color: '#fff', fontSize: 12, fontWeight: 700 }}>
            {personInitials(person.name)}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-[13.5px] truncate" style={{ color: TOKENS.activeText }}>{person.name}</div>
            <div className="text-[11px] truncate" style={{ color: TOKENS.idle }}>
              {person.title ?? '—'}{person.dept ? ` · ${person.dept}` : ''}
            </div>
          </div>
        </div>
        {badge && (
          <span className="rounded px-1 text-[9px] font-bold shrink-0"
            style={{ background: badge.bg, color: badge.fg }}>{person.leaderBadge}</span>
        )}
      </div>
      {infoRows.length > 0 && (
        <div className="mb-2 flex flex-col gap-0.5">
          {infoRows.map((r) => (
            <div key={r.label} className="text-[11px] truncate" style={{ color: TOKENS.idle }}>
              <span style={{ fontWeight: 600 }}>{r.label}:</span> {r.value}
            </div>
          ))}
        </div>
      )}
      <div style={{ borderTop: `1px solid ${TOKENS.borderSoft}`, paddingTop: 10 }}>
        {tab === 'priorities' && <PrioritiesTab employeeId={person.id} />}
        {tab === 'okrs' && <OkrsTab employeeId={person.id} name={person.name} />}
        {tab === 'engagement' && <EngagementTab employeeId={person.id} periodId={periodId} />}
        {tab === 'assessments' && <AssessmentsTab employeeId={person.id} />}
        {tab === 'review' && <ReviewTab employeeId={person.id} period={reviewPeriod} />}
      </div>
    </div>
  );
}
