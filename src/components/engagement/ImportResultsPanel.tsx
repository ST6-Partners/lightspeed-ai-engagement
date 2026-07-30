// ============================================================
// IMPORT PAST SURVEY RESULTS — admin-only panel on the Engagement Surveys
// landing. Takes a raw 15Five export (as exported, no reshaping), names the
// period inline, and loads both the statement-level rows and the derived
// aggregates. Re-uploading the same period label replaces that period's data
// instead of duplicating it.
// ============================================================
import { useRef, useState } from 'react';
import { Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import { parseCsv } from '../../lib/csv';

const input = 'px-3 py-2 border border-ls-line rounded-md text-sm focus:outline-none focus:border-ls-blue focus:ring-2 focus:ring-ls-blue-50';
const lbl = 'block text-xs font-medium text-ls-ink-3 uppercase tracking-wide mb-1';

type Result = {
  shape: string;
  periodCreated: boolean;
  replacedMetrics: number;
  columnsDetected: string[];
  statementRows: number;
  metricsAdded: number;
  questionMetrics: number;
  driverMetrics: number;
  overallMetrics: number;
  droppedRows: number;
  unmatchedStatements: number;
  unmappedDimensions: string[];
};

const SHAPE_LABEL: Record<string, string> = {
  'company-statements': 'Company-wide statements',
  'department-statements': 'Statements broken out by department',
  'department-scores': 'Department engagement scores',
};

export default function ImportResultsPanel() {
  const utils = trpc.useContext();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [periodDate, setPeriodDate] = useState('');
  const [scaleMax, setScaleMax] = useState('4');
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const importer = trpc.engagementAnalytics.importSurveyExport.useMutation();
  const ready = label.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(periodDate);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) throw new Error('That file has no data rows.');
      const res = await importer.mutateAsync({
        period: { label: label.trim(), periodDate, scaleMax: Number(scaleMax) },
        rows, replace, makeCurrent: false,
      });
      setResult(res as Result);
      utils.engagementAnalytics.invalidate();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
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
        <span className="ls-chip bg-ls-bg-2 text-ls-ink-2">Admin</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-ls-line">
          <p className="text-[13px] text-ls-ink-2 mt-3 mb-4 max-w-2xl">
            Export your results from 15Five and upload the file as-is — no need to rearrange
            columns. Name the survey below and it appears alongside the in-app surveys, with
            department and statement detail intact.
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
            <span className="text-ls-ink-3">(prevents double-counting)</span>
          </label>

          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!ready || busy}
              className="ls-btn ls-btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
              <Upload size={15} /> {busy ? 'Importing…' : 'Choose file & import'}
            </button>
            {!ready && <span className="text-[12px] text-ls-ink-3">Add a survey name and close date first.</span>}
          </div>

          {err && (
            <div className="ls-card p-3 mt-4 border-l-4 border-ls-risk text-[13px] text-ls-ink-2">{err}</div>
          )}

          {result && (
            <div className="ls-card p-4 mt-4 border-l-4 border-ls-thrive">
              <p className="text-[13px] font-semibold text-ls-ink-1 mb-2">
                Imported {SHAPE_LABEL[result.shape] ?? result.shape}
                {result.periodCreated ? ' — new survey created.' : ' — added to the existing survey.'}
              </p>
              <ul className="text-[12px] text-ls-ink-2 space-y-0.5">
                <li>{result.statementRows} statement row(s) stored</li>
                <li>
                  {result.metricsAdded} result figure(s) calculated
                  {' '}({result.overallMetrics} overall, {result.driverMetrics} by driver, {result.questionMetrics} by question)
                </li>
                {result.replacedMetrics > 0 && <li>{result.replacedMetrics} previous figure(s) replaced</li>}
                {result.droppedRows > 0 && <li>{result.droppedRows} blank/unlabelled row(s) skipped</li>}
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
