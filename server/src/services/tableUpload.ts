// ============================================================
// TABLE UPLOAD — turns an uploaded .xlsx or .csv file into header-keyed rows,
// server-side.
//
// Parsing happens on the server on purpose: a spreadsheet library on the client
// would add ~1MB to an already-large bundle for a screen only admins ever open.
// The client just base64s the file and posts it.
//
// A workbook is returned SHEET BY SHEET rather than flattened. 15Five splits its
// engagement export across several sheets with different shapes (company
// statements, department statements, department scores), so the caller detects
// and imports each sheet independently instead of forcing one column layout
// across the whole file.
// ============================================================
import ExcelJS from 'exceljs';

export type SheetRows = { sheet: string; rows: Record<string, string>[] };

/** Header keys are lowercased + trimmed to match the CSV path's behaviour. */
const headerKey = (v: string) => v.trim().toLowerCase();

/** Excel cells arrive as strings, numbers, dates, formula results, or rich text. */
function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    // formula cells carry their computed result
    if ('result' in v) return cellToString(v.result);
    // hyperlink cells
    if ('text' in v && typeof v.text === 'string') return v.text.trim();
    // rich text runs
    if ('richText' in v && Array.isArray(v.richText)) {
      return (v.richText as Array<{ text?: string }>).map((r) => r.text ?? '').join('').trim();
    }
    if ('error' in v) return '';
  }
  return String(value).trim();
}

/**
 * Minimal CSV reader — mirrors the client's src/lib/csv.ts so both upload paths
 * behave identically (quoted fields, escaped quotes, embedded commas/newlines).
 */
export function parseCsvText(text: string): Record<string, string>[] {
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
    } else if (c === '"') inQuotes = true;
    else if (c === ',') pushField();
    else if (c === '\n') { pushField(); pushRow(); }
    else if (c !== '\r') field += c;
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map(headerKey);
  return nonEmpty.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

/**
 * Finds the header row. Exports often carry a title line or a blank line above
 * the real header, so rather than assuming row 1, take the first row with at
 * least two non-empty cells.
 */
function findHeaderRow(ws: ExcelJS.Worksheet): number | null {
  const limit = Math.min(ws.rowCount, 20);
  for (let i = 1; i <= limit; i++) {
    const values = (ws.getRow(i).values as unknown[]) ?? [];
    const filled = values.filter((v) => cellToString(v) !== '').length;
    if (filled >= 2) return i;
  }
  return null;
}

function worksheetToRows(ws: ExcelJS.Worksheet): Record<string, string>[] {
  const headerRowIdx = findHeaderRow(ws);
  if (headerRowIdx == null) return [];

  const headerValues = (ws.getRow(headerRowIdx).values as unknown[]) ?? [];
  // exceljs row.values is 1-indexed with a leading hole; keep the index alignment.
  const headers: Array<string | null> = headerValues.map((v) => {
    const s = cellToString(v);
    return s === '' ? null : headerKey(s);
  });

  const out: Record<string, string>[] = [];
  for (let i = headerRowIdx + 1; i <= ws.rowCount; i++) {
    const values = (ws.getRow(i).values as unknown[]) ?? [];
    const o: Record<string, string> = {};
    let any = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const s = cellToString(values[idx]);
      o[h] = s;
      if (s !== '') any = true;
    });
    if (any) out.push(o);
  }
  return out;
}

const isZip = (buf: Buffer) => buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b; // "PK"

/**
 * Parses an uploaded file into one entry per sheet. CSV yields a single entry.
 * Detection is by magic bytes first (a mislabelled extension is common when
 * someone renames a file) and falls back to the filename.
 */
export async function parseUploadedTable(fileBase64: string, fileName: string): Promise<SheetRows[]> {
  const buf = Buffer.from(fileBase64, 'base64');
  if (buf.length === 0) throw new Error('That file is empty.');

  const looksXlsx = isZip(buf) || /\.xlsx?$/i.test(fileName);
  if (!looksXlsx) {
    const rows = parseCsvText(buf.toString('utf8'));
    return rows.length ? [{ sheet: fileName, rows }] : [];
  }

  if (!isZip(buf)) {
    // .xls (old binary format) is not a zip and exceljs cannot read it.
    throw new Error('That looks like an older .xls file. Open it and save as .xlsx or .csv, then upload again.');
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  const out: SheetRows[] = [];
  wb.eachSheet((ws) => {
    const rows = worksheetToRows(ws);
    if (rows.length) out.push({ sheet: ws.name, rows });
  });
  return out;
}
