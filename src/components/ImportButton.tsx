// Reusable CSV import button. Reads a file, parses it client-side, hands the
// row objects to the caller's onImport (which posts to a tRPC mutation), and
// shows a compact result. Used across Core Data + Org Data admin screens.
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { parseCsv } from '../lib/csv';

export type ImportResult = { added?: number; updated?: number; skipped?: number; errors?: string[] };

export default function ImportButton({
  label = 'Import CSV', accept = '.csv,text/csv', hint, onImport,
}: {
  label?: string;
  accept?: string;
  hint?: string;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult | void>;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) { setMsg('No rows found in that file.'); return; }
      const res = (await onImport(rows)) || {};
      const parts: string[] = [];
      if (res.added != null) parts.push(`${res.added} added`);
      if (res.updated != null) parts.push(`${res.updated} updated`);
      if (res.skipped != null) parts.push(`${res.skipped} skipped`);
      let out = parts.length ? `Imported ${rows.length} row(s): ${parts.join(', ')}.` : `Imported ${rows.length} row(s).`;
      if (res.errors?.length) out += ` ${res.errors.length} error(s): ${res.errors.slice(0, 3).join('; ')}`;
      setMsg(out);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={onFile} />
      <button onClick={() => ref.current?.click()} disabled={busy}
        className="inline-flex items-center gap-1.5 text-sm border border-ls-line rounded-lg px-3 py-2 text-ls-ink-2 hover:bg-ls-bg-2 disabled:opacity-50">
        <Upload size={15} /> {busy ? 'Importing…' : label}
      </button>
      {hint && !msg && <span className="text-[11px] text-ls-ink-3">{hint}</span>}
      {msg && <span className="text-[11px] text-ls-ink-3 max-w-xs">{msg}</span>}
    </div>
  );
}
