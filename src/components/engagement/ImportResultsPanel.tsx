// ============================================================
// IMPORT PAST SURVEY RESULTS — admin-only panel on the Engagement Surveys
// landing. Takes a raw 15Five export (as exported, no reshaping), names the
// period inline, and loads both the statement-level rows and the derived
// aggregates. Re-uploading the same period label replaces that period's data
// instead of duplicating it.
// ============================================================
import { useRef, useState } from 'react';
import { Upload, ChevronDown, ChevronRight, X } from 'lucide-react';
import { trpc } from '../../lib/trpc';

const input = 'px-3 py-2 border border-ls-line rounded-md text-sm focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50';
const lbl = 'block text-xs font-medium text-ls-ink-3 uppercase tracking-wide mb-1';

type SheetReport = { sheet: string; shape: string; rows: number; columns: string[] };

type Result = {
  periodId: string;
  sheets: SheetReport[];
  periodCreated: boolean;
  replacedMetrics: number;
  columnsDetected: string[];
  statementRows: number;
  metricsAdded: number;
  questionMetrics: number;
  driverMetrics: number;
  overallMetrics: number;
  droppedRows: number;
  countsWerePercentages: boolean;
  departmentsCovered: number;
  derivedCompanyOverall: boolean;
  unmatchedStatements: number;
  unmappedDimensions: string[];
};

const SHAPE_LABEL: Record<string, string> = {
  'company-statements': 'company-wide statements',
  'department-statements': 'statements by department',
  'department-scores': 'department engagement scores',
  unrecognised: 'not recognised — skipped',
};

/** File -> base64 (parsing happens server-side; see services/tableUpload.ts). */
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

export default function ImportResultsPanel({ onOpenSurvey }: { onOpenSurvey?: (periodId: string) => void }) {
  const utils = trpc.useContext();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [periodDate, setPeriodDate] = useState('');
  const [scaleMax, setScaleMax] = useState('4');
  const [replace, setReplace] = useState(true);
  const [queued, setQueued] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const importer = trpc.engagementAnalytics.importSurveyExport.useMutation();
  const ready = label.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(periodDate);

  const addFiles = (incoming: FileList | File[] | null) => {
    const list = Array.from(incoming ?? []);
    if (list.length === 0) return;
    setErr(null);
    // De-duplicate by name+size so adding the same file twice can't double-count.
    setQueued((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...list.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (idx: number) => setQueued((prev) => prev.filter((_, i) => i !== idx));

  const runImport = async () => {
    if (queued.length === 0 || !ready) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const files = await Promise.all(
        queued.map(async (f) => ({ name: f.name, base64: await toBase64(f) })),
      );
      const res = await importer.mutateAsync({
        period: { label: label.trim(), periodDate, scaleMax: Number(scaleMax) },
        files,
        replace, makeCurrent: false,
      });
      setResult(res as Result);
      setQueued([]);
      utils.engagementAnalytics.invalidate();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ls-card mt-5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ls-bg-2 transition-colors">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Import past survey results
          </h2>
          <p className="text-[12px] text-ls-ink-3 mt-0.5 ml-6">
            Upload a 15Five export to add a historical survey. HR / admin only.
          </p>
        </div>
        <span className="flex items-center gap-2">
          <span className="ls-chip bg-ls-bg-2 text-ls-ink-3 font-mono text-[10px]">importer v4</span>
          <span className="ls-chip bg-ls-bg-2 text-ls-ink-2">Admin</span>
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-ls-line">
          <p className="text-[13px] text-ls-ink-2 mt-3 mb-4 max-w-2xl">
            Export your results from 15Five and upload them as-is — Excel or CSV, no need to
            rearrange columns. Add as many files as you need; multi-sheet workbooks load whole.
            Everything merges into the one survey you name here, and it appears alongside the in-app
            surveys with department and statement detail intact.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className={lbl}>Survey name</label>
              <input className={input + ' w-full'} value={label} placeholder="e.g. 2025 H1"
                onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Date the survey closed</label>
              <input type="date" className={input + ' w-full'} value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Answer scale</label>
              <select className={input + ' w-full'} value={scaleMax} onChange={(e) => setScaleMax(e.target.value)}>
                <option value="4">4-point (15Five)</option>
                <option value="5">5-point (in-app survey)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-ls-ink-2 mb-4">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace this survey&rsquo;s existing results if it has already been uploaded
            <span className="text-ls-ink-3">(prevents double-counting — untick to add a second file to the same survey)</span>
          </label>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)} />

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              dragging ? 'border-ls-blue bg-ls-blue-50' : 'border-ls-line'}`}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="ls-btn ls-btn-ghost inline-flex items-center gap-1.5 disabled:opacity-50">
              <Upload size={15} /> {queued.length === 0 ? 'Add files' : 'Add more files'}
            </button>
            <p className="text-[12px] text-ls-ink-3 mt-2">
              or drag them here. Add one at a time or several at once — they can live in different
              folders, and they all import into the survey named above.
            </p>
          </div>

          {queued.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {queued.map((f, i) => (
                <li key={`${f.name}-${f.size}-${i}`}
                  className="flex items-center justify-between gap-3 text-[13px] border border-ls-line rounded-md px-3 py-2">
                  <span className="truncate">
                    {f.name}
                    <span className="text-ls-ink-3"> · {Math.max(1, Math.round(f.size / 1024))} KB</span>
                  </span>
                  <button onClick={() => removeFile(i)} disabled={busy}
                    className="text-ls-ink-3 hover:text-ls-risk shrink-0" aria-label={`Remove ${f.name}`}>
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3 flex-wrap mt-4">
            <button
              onClick={runImport}
              disabled={!ready || busy || queued.length === 0}
              className="ls-btn ls-btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
              {busy ? 'Importing…' : `Import ${queued.length || ''} file${queued.length === 1 ? '' : 's'}`.trim()}
            </button>
            {queued.length === 0 && <span className="text-[12px] text-ls-ink-3">Add at least one file.</span>}
            {queued.length > 0 && !ready && (
              <span className="text-[12px] text-ls-ink-3">Add a survey name and close date first.</span>
            )}
          </div>

          {err && (
            <div className="ls-card p-3 mt-4 border-l-4 border-ls-risk text-[13px] text-ls-ink-2">{err}</div>
          )}

          {result && (
            <div className="ls-card p-4 mt-4 border-l-4 border-ls-thrive">
              <p className="text-[13px] font-semibold text-ls-ink-1 mb-2">
                Import complete{result.periodCreated ? ' — new survey created.' : ' — added to the existing survey.'}
              </p>
              {result.sheets.length > 0 && (
                <ul className="text-[12px] text-ls-ink-2 mb-2 space-y-0.5">
                  {result.sheets.map((sh) => (
                    <li key={sh.sheet} className={sh.shape === 'unrecognised' ? 'text-ls-ink-3' : ''}>
                      <b>{sh.sheet}</b> — {SHAPE_LABEL[sh.shape] ?? sh.shape}
                      {sh.shape !== 'unrecognised' && ` (${sh.rows} row(s))`}
                      {sh.shape === 'unrecognised' && sh.columns.length > 0 && (
                        <span className="text-ls-ink-3"> · columns: {sh.columns.join(', ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="text-[12px] text-ls-ink-2 space-y-0.5">
                <li>{result.statementRows} statement row(s) stored</li>
                <li>
                  {result.metricsAdded} result figure(s) calculated
                  {' '}({result.overallMetrics} overall, {result.driverMetrics} by driver, {result.questionMetrics} by question)
                </li>
                {result.departmentsCovered > 0 && <li>{result.departmentsCovered} department(s) covered</li>}
                {result.replacedMetrics > 0 && <li>{result.replacedMetrics} previous figure(s) replaced</li>}
                {result.derivedCompanyOverall && (
                  <li className="text-ls-ink-3">
                    No company-wide sheet was included, so the company figure was rolled up from the
                    departments (weighted by respondents). Upload the company sheet too if you have it.
                  </li>
                )}
                {result.droppedRows > 0 && <li>{result.droppedRows} blank/unlabelled row(s) skipped</li>}
                {result.countsWerePercentages && (
                  <li className="text-ls-ink-3">
                    The favorable/neutral/unfavorable columns held percentages, not head counts — read as percentages.
                  </li>
                )}
                {result.statementRows === 0 && (
                  <li className="text-ls-ink-3">
                    This file carried department totals only — no per-statement detail, so the
                    Statements and Heatmap tabs stay empty for this survey. Add the statement-level
                    export to fill them.
                  </li>
                )}
                {result.unmatchedStatements > 0 && (
                  <li className="text-ls-ink-3">
                    {result.unmatchedStatements} statement(s) didn&rsquo;t match a question in the bank — kept in the
                    detail view, but not charted per-question. Add them under Core Data &rarr; Survey Questions to chart them.
                  </li>
                )}
                {result.unmappedDimensions.length > 0 && (
                  <li className="text-ls-ink-3">
                    Categories not mapped to a driver: {result.unmappedDimensions.join(', ')}
                  </li>
                )}
              </ul>
              {onOpenSurvey && result.periodId && (
                <button
                  onClick={() => onOpenSurvey(result.periodId)}
                  className="ls-btn ls-btn-primary mt-3">
                  Open this survey &rarr;
                </button>
              )}

              <details className="mt-3">
                <summary className="text-[12px] text-ls-ink-3 cursor-pointer">Columns the app recognised</summary>
                <ul className="text-[11px] text-ls-ink-3 mt-1 space-y-0.5">
                  {result.columnsDetected.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </details>
            </div>
          )}

          <p className="text-[12px] text-ls-ink-3 mt-4 pt-3 border-t border-ls-line max-w-2xl">
            <b>Running a new survey instead?</b> Engagement surveys don&rsquo;t roll over on their own — the
            quarterly auto-advance setting doesn&rsquo;t apply to them. Create the next one in{' '}
            <b>Admin &rarr; Survey Periods</b> by setting its open and close dates.
          </p>
        </div>
      )}
    </div>
  );
}
