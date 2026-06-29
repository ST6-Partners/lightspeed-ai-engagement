// Organization — people view with engagement read (DD-002 Planning · DD-003 signal-not-alarm)
import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Status = 'thrive' | 'watch' | 'risk';
type Trend = 'up' | 'down' | 'flat';
interface Person {
  name: string; role: string; team: string;
  status: Status; trend: Trend; lastCheckIn: string; recognitions: number;
  spark: number[];
}

const PEOPLE: Person[] = [
  { name: 'Charles Harris', role: 'Senior Engineer', team: 'Platform', status: 'thrive', trend: 'up', lastCheckIn: '1d ago', recognitions: 3, spark: [6, 8, 9, 12, 16, 19] },
  { name: 'Danny Lee', role: 'Engineer', team: 'Platform', status: 'thrive', trend: 'flat', lastCheckIn: '2d ago', recognitions: 2, spark: [12, 13, 12, 14, 13, 14] },
  { name: 'Vixey Douglas', role: 'Designer', team: 'Brand', status: 'watch', trend: 'down', lastCheckIn: '3d ago', recognitions: 1, spark: [16, 14, 13, 11, 10, 9] },
  { name: 'Josh Poirier', role: 'Engineer', team: 'CS', status: 'risk', trend: 'down', lastCheckIn: 'No check-in', recognitions: 0, spark: [12, 11, 9, 7, 5, 4] },
  { name: 'Crystal Fischer', role: 'Product Designer', team: 'Growth', status: 'thrive', trend: 'up', lastCheckIn: '1d ago', recognitions: 4, spark: [8, 9, 11, 13, 16, 18] },
  { name: 'Joseph Guevara', role: 'Engineer', team: 'Platform', status: 'thrive', trend: 'up', lastCheckIn: '2d ago', recognitions: 3, spark: [9, 10, 12, 13, 15, 17] },
];

const STATUS_META: Record<Status, { label: string; text: string; bg: string }> = {
  thrive: { label: 'Thriving', text: 'text-ls-thrive', bg: 'bg-ls-thrive-bg' },
  watch: { label: 'Steady', text: 'text-ls-watch', bg: 'bg-ls-watch-bg' },
  risk: { label: 'At risk', text: 'text-ls-risk', bg: 'bg-ls-risk-bg' },
};

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 90 + 1;
      const y = 22 - ((v - min) / (max - min || 1)) * 18 - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width="92" height="24" viewBox="0 0 92 24">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

const SPARK_COLOR: Record<Status, string> = { thrive: '#2E9E7B', watch: '#C99300', risk: '#C2615A' };
const TABS = ['People', 'Pulse', 'Org Tree'] as const;

export default function Organization() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('People');
  const thriving = Math.round((PEOPLE.filter((p) => p.status === 'thrive').length / PEOPLE.length) * 100);
  const atRisk = PEOPLE.filter((p) => p.status === 'risk').length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="ls-eyebrow mb-1">Planning</div>
      <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
      <p className="text-sm text-ls-ink-3 mb-5">
        A continuous read of how the org is thriving — updated from signals, never from a survey blast.
      </p>

      <div className="flex gap-1 border-b border-ls-line mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-semibold px-3.5 py-2.5 -mb-px border-b-2 ${
              tab === t ? 'text-ls-blue-deep border-ls-blue' : 'text-ls-ink-3 border-transparent hover:text-ls-ink-2'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== 'Org Tree' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          <Stat k="Thriving" v={`${thriving}%`} d="▲ 4 pts vs last month" tone="text-ls-thrive" />
          <Stat k="eNPS" v="+34" d="steady" />
          <Stat k="Check-in rate" v="6 of 8" d="▲ 6 pts" tone="text-ls-blue-deep" />
          <Stat k="At risk" v={String(atRisk)} d="worth a look" tone="text-ls-risk" />
        </div>
      )}

      {tab === 'People' && (
        <div className="space-y-3">
          {PEOPLE.map((p) => {
            const m = STATUS_META[p.status];
            const TrendIcon = p.trend === 'up' ? TrendingUp : p.trend === 'down' ? TrendingDown : Minus;
            return (
              <div key={p.name} className="ls-card p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-ls-active text-white flex items-center justify-center font-bold shrink-0">
                  {p.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px]">{p.name}</div>
                  <div className="text-[12.5px] text-ls-ink-3">{p.role} · {p.team}</div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[12px] text-ls-ink-3">
                  <span>{p.lastCheckIn}</span>
                  <span>{p.recognitions} recognitions</span>
                  <TrendIcon size={15} className={m.text} />
                </div>
                <Spark data={p.spark} color={SPARK_COLOR[p.status]} />
                <span className={`ls-chip ${m.bg} ${m.text} min-w-[78px] justify-center`}>{m.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'Pulse' && (
        <div className="ls-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Thriving trend</div>
            <span className="text-xs text-ls-ink-3">Last 8 weeks</span>
          </div>
          <div className="flex items-end gap-2 h-24">
            {[54, 50, 58, 52, 62, 60, 68, 72].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full max-w-[30px] rounded-t" style={{ height: h, background: i > 5 ? '#2E89B8' : '#BFE0F0' }} />
                <span className="text-[10px] text-ls-ink-3">W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Org Tree' && (
        <div className="ls-card p-5">
          <div className="font-semibold mb-3">Reporting structure</div>
          <Tree name="Mark Friedman" role="Leadership" depth={0} />
          <Tree name="Brooke Friedman" role="Product Manager" depth={1} />
          {PEOPLE.map((p) => (
            <Tree key={p.name} name={p.name} role={p.role} depth={2} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ k, v, d, tone }: { k: string; v: string; d: string; tone?: string }) {
  return (
    <div className="ls-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ls-ink-3">{k}</div>
      <div className={`text-2xl font-extrabold mt-1.5 ${tone || ''}`}>{v}</div>
      <div className="text-[12.5px] text-ls-ink-3 mt-1">{d}</div>
    </div>
  );
}

function Tree({ name, role, depth }: { name: string; role: string; depth: number }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5" style={{ paddingLeft: depth * 22 }}>
      <span className="w-7 h-7 rounded-full bg-ls-bg-2 text-ls-ink-2 flex items-center justify-center text-[11px] font-bold">
        {name.split(' ').map((n) => n[0]).join('')}
      </span>
      <span className="text-sm font-medium text-ls-ink">{name}</span>
      <span className="text-xs text-ls-ink-3">· {role}</span>
    </div>
  );
}
