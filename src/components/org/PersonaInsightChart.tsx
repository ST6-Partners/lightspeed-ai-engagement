// PersonaInsightChart — three equal-height SVG panels (spec §8.1):
//   "Conscious Persona"  (bars = consciousScore)
//   "Preference Flow"    (signed conscious − lessConscious; chevron up/down)
//   "Less Conscious Persona" (bars = lessConsciousScore)
// One column per profile, ordered blue→green→yellow→red. Frame #334155
// (outer 2.5, inner/midline 1.5). In-bar % label 20px/600 white, except
// short bars (<14%) use #4b5563 and yellow always uses #1a1a2e.
import { INSIGHT_COLORS, INSIGHT_ORDER } from './orgLib';

export type InsightProfile = {
  color: string | null;
  consciousScore: number | null;
  lessConsciousScore: number | null;
  isPrimary: boolean;
};

const CELL_W = 54;
const CELL_H = 250;
const FRAME = '#334155';

function ordered(profiles: InsightProfile[]): InsightProfile[] {
  const byColor = new Map(profiles.map((p) => [p.color ?? '', p]));
  const inOrder = INSIGHT_ORDER.map((c) => byColor.get(c)).filter(Boolean) as InsightProfile[];
  // include any profiles whose color isn't in the canonical order, appended
  const extra = profiles.filter((p) => !INSIGHT_ORDER.includes(p.color ?? ''));
  return [...inOrder, ...extra];
}

function labelColor(color: string, valuePct: number): string {
  if (color === '#ffd400') return '#1a1a2e';   // white illegible on yellow
  if (valuePct < 14) return '#4b5563';          // short bar → label sits above
  return '#fff';
}

// A vertical-bar panel (Conscious / Less Conscious).
function BarPanel({ cols, values }: { cols: InsightProfile[]; values: (number | null)[] }) {
  const w = cols.length * CELL_W;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${CELL_H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {cols.map((p, i) => {
        const color = INSIGHT_COLORS[p.color ?? ''] ?? '#94a3b8';
        const v = Math.max(0, Math.min(100, values[i] ?? 0));
        const h = (v / 100) * CELL_H;
        const x = i * CELL_W;
        const y = CELL_H - h;
        const cx = x + CELL_W / 2;
        const short = v < 14;
        return (
          <g key={i}>
            <rect x={x + 1} y={y} width={CELL_W - 2} height={h} fill={color} />
            <text x={cx} y={short ? y - 8 : y + 24} textAnchor="middle"
              style={{ fontSize: 20, fontWeight: 600, fill: labelColor(color, v) }}>
              {Math.round(v)}%
            </text>
            {/* inner column divider */}
            {i > 0 && <line x1={x} y1={0} x2={x} y2={CELL_H} stroke={FRAME} strokeWidth={1.5} />}
          </g>
        );
      })}
      {/* outer frame */}
      <rect x={0} y={0} width={w} height={CELL_H} fill="none" stroke={FRAME} strokeWidth={2.5} />
    </svg>
  );
}

// The signed "Preference Flow" panel — chevron up (positive) / down (negative)
// from the midline, magnitude scaled to half-cell.
function FlowPanel({ cols }: { cols: InsightProfile[] }) {
  const w = cols.length * CELL_W;
  const mid = CELL_H / 2;
  const halfCell = CELL_H / 2;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${CELL_H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {cols.map((p, i) => {
        const color = INSIGHT_COLORS[p.color ?? ''] ?? '#94a3b8';
        const signed = (p.consciousScore ?? 0) - (p.lessConsciousScore ?? 0); // -100..100
        const m = (Math.min(100, Math.abs(signed)) / 100) * halfCell;
        const x = i * CELL_W;
        const cx = x + CELL_W / 2;
        const bw = CELL_W * 0.6;
        const up = signed >= 0;
        const apex = up ? mid - m : mid + m;
        const pts = `${cx - bw / 2},${mid} ${cx + bw / 2},${mid} ${cx},${apex}`;
        return (
          <g key={i}>
            <polygon points={pts} fill={color} />
            <text x={cx} y={up ? apex - 6 : apex + 16} textAnchor="middle"
              style={{ fontSize: 11, fontWeight: 600, fill: '#4b5563' }}>
              {signed > 0 ? '+' : ''}{Math.round(signed)}
            </text>
            {i > 0 && <line x1={x} y1={0} x2={x} y2={CELL_H} stroke={FRAME} strokeWidth={1.5} />}
          </g>
        );
      })}
      {/* midline + outer frame */}
      <line x1={0} y1={mid} x2={w} y2={mid} stroke={FRAME} strokeWidth={1.5} />
      <rect x={0} y={0} width={w} height={CELL_H} fill="none" stroke={FRAME} strokeWidth={2.5} />
    </svg>
  );
}

const HEADER: React.CSSProperties = {
  fontSize: 11.25, fontWeight: 500, color: '#6b7280', textAlign: 'center',
  whiteSpace: 'pre-line', alignSelf: 'end', marginBottom: 12,
};

export default function PersonaInsightChart({ profiles }: { profiles: InsightProfile[] }) {
  const cols = ordered(profiles);
  if (cols.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 18 }}>
      {/* headers row */}
      <div style={HEADER}>{'Conscious\nPersona'}</div>
      <div style={HEADER}>{'Preference\nFlow'}</div>
      <div style={HEADER}>{'Less Conscious\nPersona'}</div>
      {/* charts row */}
      <BarPanel cols={cols} values={cols.map((p) => p.consciousScore)} />
      <FlowPanel cols={cols} />
      <BarPanel cols={cols} values={cols.map((p) => p.lessConsciousScore)} />
    </div>
  );
}
