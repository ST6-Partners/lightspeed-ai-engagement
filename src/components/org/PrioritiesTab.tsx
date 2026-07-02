import { trpc } from '../../lib/trpc';
import { TabState, Empty, errKind } from './atoms';

const PILL: Record<string, { label: string; bg: string; fg: string }> = {
  objective:  { label: 'Objective', bg: '#dbeafe', fg: '#1e40af' },
  key_result: { label: 'KR',        bg: '#dcfce7', fg: '#166534' },
  task:       { label: 'Task',      bg: '#fef3c7', fg: '#92400e' },
  ktbr:       { label: 'KTBR',      bg: '#f3e8ff', fg: '#6d28d9' },
};

export default function PrioritiesTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = trpc.orgScreen.prioritiesByUser.useQuery({ userId: employeeId });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data?.hasData) return <Empty text="No priorities set" />;
  return (
    <div className="space-y-2">
      {data.items.map((it) => {
        const p = PILL[it.itemType] ?? PILL.ktbr;
        return (
          <div key={it.id} className="flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
              style={{ background: p.bg, color: p.fg }}>{p.label}</span>
            <span className="text-[13px] min-w-0 truncate" style={{ color: '#1a1a2e' }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}
