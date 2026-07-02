import { trpc } from '../../lib/trpc';
import { Bar } from './atoms';
import { TabState, Empty, errKind } from './atoms';

export default function OkrsTab({ employeeId, name }: { employeeId: string; name: string }) {
  const { data, isLoading, error } = trpc.okrs.byUser.useQuery({ userId: employeeId, name });
  if (isLoading) return <TabState kind="loading" />;
  if (error) return <TabState kind={errKind(error)} />;
  if (!data?.hasData) return <Empty text="No OKRs on file" />;
  return (
    <div className="space-y-3">
      {data.objectives.map((o) => (
        <div key={o.id}>
          <Bar label={o.title} value={o.progress} />
          {o.keyResults.length > 0 && (
            <div className="pl-3 mt-1">
              {o.keyResults.map((k) => (
                <div key={k.id} style={{ fontSize: 11 }}>
                  <div className="flex justify-between" style={{ color: '#6b7280' }}>
                    <span className="truncate">{k.title}</span><span>{Math.round(k.progress)}%</span>
                  </div>
                  <div style={{ height: 4, background: '#eef0f2', borderRadius: 2, marginTop: 2, marginBottom: 4 }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, k.progress))}%`, height: 4, background: '#93c5fd', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
