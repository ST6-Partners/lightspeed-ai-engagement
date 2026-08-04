// ============================================================
// SHARED IMPORT BUTTON — used by all 13 admin data imports (Core Data, Org
// Data, and the engagement / check-in / manager / peer question lists).
//
// Accepts CSV, Excel and PDF. One component so a format is added once:
//
//   .csv   parsed in the browser (src/lib/csv.ts) and imported straight away —
//          it is already rows and columns, so there is nothing to confirm.
//   .xlsx  parsed on the server (services/tableUpload.ts). A one-sheet workbook
//          imports straight away and names the sheet it used; a workbook with
//          several populated sheets asks which one.
//   .xls   rejected on the server with re-save guidance (exceljs cannot read
//          the old binary format).
//   .pdf   read on the server by Claude (services/pdfRows.ts) and ALWAYS shown
//          as a preview first. A PDF has no real columns, so the values are
//          inferred — the admin confirms before anything is written. Requires
//          `columns` to be supplied; without it PDF is refused rather than
//          guessed at.
// ============================================================
import { useRef, useState } from 'react';
import { Upload, AlertTriangle, X } from 'lucide-react';
import { parseCsv } from '../lib/csv';
import { trpc } from '../lib/trpc';

export type ImportResult = { added?: number; updated?: number; skipped?: number; errors?: string[] };

type Pending =
  | { kind: 'sheets'; fileName: string; sheets: { sheet: string; rows: Record<string, string>[] }[] }
  | { kind: 'pdf'; fileName: string; rows: Record<string, string>[]; notes: string[] };

/** File -> base64 (the server does the parsing; see services/tableUpload.ts). */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const res = String(reader.result ?? '');
      const comma = res.indexOf(',');
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.readAsDataURL(file);
  });
}

const PREVIEW_ROWS = 8;

/**
 * The `hint` prop is written for the admin ("CSV, Excel or PDF: email, name…").
 * The AI only needs the part that describes the columns, so strip the leading
 * format list before sending it as context.
 */
function columnHintForAi(hint?: string): string | undefined {
  if (!hint) return undefined;
  const stripped = hint.replace(/^\s*(csv|excel|pdf|,|or|and|columns|:|\s)+/i, '').trim();
  return stripped || undefined;
}

export default function ImportButton({
  label = 'Import',
  accept = '.csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  hint,
  columns,
  onImport,
}: {
  label?: string;
  accept?: string;
  hint?: string;
  /**
   * The column keys this import expects, lowercase (e.g. ['email','name']).
   * Required for PDF uploads — it is what tells the AI which fields to look
   * for. Omit it and the button still handles CSV and Excel.
   */
  columns?: string[];
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult | void>;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Importing…');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const parseTable = trpc.importParse.table.useMutation();
  const parsePdf = trpc.importParse.pdf.useMutation();

  const clearInput = () => { if (ref.current) ref.current.value = ''; };
  const reset = () => { setBusy(false); setBusyLabel('Importing…'); clearInput(); };

  /** Runs the caller's import and renders the added/updated/skipped summary. */
  const runImport = async (rows: Record<string, string>[], source?: string) => {
    setBusy(true);
    setBusyLabel('Importing…');
    try {
      const res = (await onImport(rows)) || {};
      const parts: string[] = [];
      if (res.added != null) parts.push(`${res.added} added`);
      if (res.updated != null) parts.push(`${res.updated} updated`);
      if (res.skipped != null) parts.push(`${res.skipped} skipped`);
      let out = parts.length
        ? `Imported ${rows.length} row(s): ${parts.join(', ')}.`
        : `Imported ${rows.length} row(s).`;
      if (source) out += ` (from ${source})`;
      if (res.errors?.length) out += ` ${res.errors.length} error(s): ${res.errors.slice(0, 3).join('; ')}`;
      setMsg(out);
      setError(null);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setMsg(null);
    } finally {
      reset();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setError(null);
    setPending(null);

    const name = file.name.toLowerCase();
    const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

    try {
      // ---- PDF: AI read, then preview ----
      if (isPdf) {
        if (!columns?.length) {
          setError('PDF is not supported for this import. Upload an Excel or CSV file instead.');
          reset();
          return;
        }
        setBusy(true);
        setBusyLabel('Reading PDF…');
        const res = await parsePdf.mutateAsync({
          fileBase64: await toBase64(file),
          fileName: file.name,
          columns,
          hint: columnHintForAi(hint),
        });
        setBusy(false);
        clearInput();
        if (res.rows.length === 0) {
          setError(res.notes[0] ?? 'No rows could be read from that PDF.');
          return;
        }
        setPending({ kind: 'pdf', fileName: file.name, rows: res.rows, notes: res.notes });
        return;
      }

      // ---- Excel: deterministic server read ----
      if (isExcel) {
        setBusy(true);
        setBusyLabel('Reading spreadsheet…');
        const res = await parseTable.mutateAsync({
          fileBase64: await toBase64(file), fileName: file.name,
        });
        setBusy(false);
        clearInput();
        const sheets = res.sheets.filter((s) => s.rows.length > 0);
        if (sheets.length === 0) {
          setError('No rows found in that spreadsheet.');
          return;
        }
        if (sheets.length === 1) {
          await runImport(sheets[0].rows, `sheet “${sheets[0].sheet}”`);
          return;
        }
        setPending({ kind: 'sheets', fileName: file.name, sheets });
        return;
      }

      // ---- CSV: already rows and columns, import directly ----
      setBusy(true);
      const rows = parseCsv(await file.text());
      setBusy(false);
      if (rows.length === 0) {
        setError('No rows found in that file.');
        reset();
        return;
      }
      await runImport(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      reset();
    }
  };

  const previewCols = columns?.length
    ? columns.map((c) => c.trim().toLowerCase())
    : Object.keys(pending?.kind === 'pdf' ? pending.rows[0] ?? {} : {});

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={onFile} />
      <button onClick={() => ref.current?.click()} disabled={busy}
        className="inline-flex items-center gap-1.5 text-sm border border-ls-line rounded-lg px-3 py-2 text-ls-ink-2 hover:bg-ls-bg-2 disabled:opacity-50">
        <Upload size={15} /> {busy ? busyLabel : label}
      </button>
      {hint && !msg && !error && !pending && (
        <span className="text-[11px] text-ls-ink-3">{hint}</span>
      )}
      {msg && <span className="text-[11px] text-ls-ink-3 max-w-xs">{msg}</span>}
      {error && <span className="text-[11px] text-red-600 max-w-xs">{error}</span>}

      {/* ---- Which sheet? (Excel workbook with more than one populated sheet) ---- */}
      {pending?.kind === 'sheets' && (
        <div className="mt-2 w-full max-w-xl border border-ls-line rounded-lg bg-white p-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-[13px] text-ls-ink-2">
              <span className="font-medium">{pending.fileName}</span> has more than one sheet with
              data. Which one should be imported?
            </p>
            <button onClick={() => setPending(null)} className="text-ls-ink-3 hover:text-ls-ink-2">
              <X size={15} />
            </button>
          </div>
          <ul className="space-y-1.5">
            {pending.sheets.map((s) => (
              <li key={s.sheet}>
                <button
                  onClick={() => runImport(s.rows, `sheet “${s.sheet}”`)}
                  disabled={busy}
                  className="w-full text-left text-[13px] border border-ls-line rounded-md px-3 py-2 hover:bg-ls-bg-2 disabled:opacity-50">
                  <span className="font-medium">{s.sheet}</span>
                  <span className="text-ls-ink-3"> · {s.rows.length} row(s)</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Confirm what the AI read out of the PDF ---- */}
      {pending?.kind === 'pdf' && (
        <div className="mt-2 w-full max-w-3xl border border-ls-line rounded-lg bg-white p-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-[13px] text-ls-ink-2">
                Read <span className="font-medium">{pending.rows.length} row(s)</span> from{' '}
                <span className="font-medium">{pending.fileName}</span>.
              </p>
              <p className="text-[11px] text-ls-ink-3 mt-0.5">
                A PDF has no real columns, so these values were worked out from the text. Check them
                before importing — nothing has been saved yet.
              </p>
            </div>
            <button onClick={() => setPending(null)} className="text-ls-ink-3 hover:text-ls-ink-2">
              <X size={15} />
            </button>
          </div>

          {pending.notes.length > 0 && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <ul className="text-[11px] text-amber-900 space-y-0.5">
                {pending.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto border border-ls-line rounded-md">
            <table className="min-w-full text-[12px]">
              <thead className="bg-ls-bg-2">
                <tr>
                  {previewCols.map((c) => (
                    <th key={c} className="text-left font-medium text-ls-ink-3 px-2 py-1.5 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                  <tr key={i} className="border-t border-ls-line">
                    {previewCols.map((c) => (
                      <td key={c} className="px-2 py-1.5 align-top">
                        {r[c] ? r[c] : <span className="text-ls-ink-3">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pending.rows.length > PREVIEW_ROWS && (
            <p className="text-[11px] text-ls-ink-3 mt-1.5">
              Showing the first {PREVIEW_ROWS} of {pending.rows.length} rows.
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => runImport(pending.rows, pending.fileName)}
              disabled={busy}
              className="ls-btn ls-btn-primary text-sm disabled:opacity-50">
              {busy ? 'Importing…' : `Import ${pending.rows.length} row(s)`}
            </button>
            <button
              onClick={() => setPending(null)}
              disabled={busy}
              className="text-sm border border-ls-line rounded-lg px-3 py-2 text-ls-ink-2 hover:bg-ls-bg-2 disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
