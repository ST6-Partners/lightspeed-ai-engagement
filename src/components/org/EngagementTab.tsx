import { trpc } from '../../lib/trpc';
import { Badge, Bar, TabState, Empty, errKind } from './atoms';

function scoreColor(s: number | null | undefined) {
  if (s == null) return null;
  if (s >= 67) return '#22c55e';
  if (s >= 34) return '#f59e0b';
  return '#ef4444';
}

export default function EngagementTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = trpc.orgScreen.engagementByUser.useQuery({ userId: employeeId });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data?.hasData) return <Empty text="No engagement signal yet" />;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Badge value={data.score ?? '—'} color={scoreColor(data.score)} />
        <div>
          <div className="text-[12px]" style={{ color: '#6b7280' }}>Thriving score</div>
          <div className="text-[15px] font-semibold" style={{ color: '#1a1a2e' }}>{data.score ?? '—'}/100</div>
        </div>
      </div>
      {data.drivers.map((d, i) => <Bar key={i} label={d.label} value={d.value} />)}
    </div>
  );
}
