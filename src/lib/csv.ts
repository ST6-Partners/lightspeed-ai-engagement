// Minimal, dependency-free CSV parser for admin data imports.
// Handles quoted fields, escaped quotes ("") , commas and newlines inside
// quotes, and CRLF. Returns an array of row objects keyed by the (lowercased,
// trimmed) header row. Intended for controlled admin uploads, not arbitrary data.

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      pushField(); pushRow();
    } else if (c === '\r') {
      // ignore — handled by \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}
