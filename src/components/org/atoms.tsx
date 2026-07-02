import { TOKENS } from './orgLib';

// Badge — 50x50 circle, colored fill, white centered value (spec §8).
export function Badge({ value, color }: { value: React.ReactNode; color?: string | null }) {
  return (
    <div className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: 50, height: 50, background: color || TOKENS.badgeGrey, color: '#fff', fontSize: 18, fontWeight: 500 }}>
      {value}
    </div>
  );
}

// Bar — label + value over a 6px track, fill clamped 0..100 (spec §8).
export function Bar({ label, value, display, color }: { label: string; value: number; display?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mb-2">
      <div className="flex justify-between" style={{ fontSize: 12 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{display ?? `${Math.round(value)}%`}</span>
      </div>
      <div style={{ height: 6, background: TOKENS.barTrack, borderRadius: 3, marginTop: 3 }}>
        <div style={{ width: `${pct}%`, height: 6, background: color || '#378ADD', borderRadius: 3 }} />
      </div>
    </div>
  );
}

export function TabState({ kind }: { kind: 'loading' | 'error' | 'forbidden'; empty?: string }) {
  const msg = kind === 'loading' ? 'Loading…' : kind === 'forbidden' ? 'You don’t have access to this.' : 'Couldn’t load.';
  return <div className="text-[12px]" style={{ color: TOKENS.idle }}>{msg}</div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="text-[12px]" style={{ color: TOKENS.idle }}>{text}</div>;
}

// Map a react-query/tRPC error to a state kind.
export function errKind(error: unknown): 'error' | 'forbidden' {
  const code = (error as { data?: { code?: string } })?.data?.code;
  return code === 'FORBIDDEN' ? 'forbidden' : 'error';
}
