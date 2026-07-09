// ============================================================
// DATE DISPLAY — app-wide month/day/year formatting (MM/DD/YYYY).
// Use fmtDate for calendar dates and fmtDateTime for timestamps. Date-only
// strings ("YYYY-MM-DD") are parsed at local midnight to avoid an off-by-one
// from UTC parsing. Do NOT use these for <input type="date"> values (those
// must stay ISO) or for numeric formatting.
// ============================================================

function toDate(input?: string | number | Date | null): Date | null {
  if (input == null || input === '') return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + 'T00:00:00');
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(input?: string | number | Date | null): string {
  const d = toDate(input);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function fmtDateTime(input?: string | number | Date | null): string {
  const d = toDate(input);
  if (!d) return '';
  return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
