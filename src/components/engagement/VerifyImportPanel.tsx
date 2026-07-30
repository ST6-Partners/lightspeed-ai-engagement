// ============================================================
// CHECK THE NUMBERS — verification surface for imported surveys.
//
// Answers "how do I know these figures are real?" three ways:
//   1. recomputes every company figure from the stored source rows and shows
//      stored-vs-recomputed side by side
//   2. exposes the individual statements behind each driver, with the weights
//   3. downloads the app's stored copy of the source rows, to diff against the
//      original 15Five file
// ============================================================
import { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Check, AlertTriangle } from 'lucide-react';
import { trpc } from '../../lib/trpc';

const sel = 'px-3 py-1.5 border border-ls-line rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ls-blue';
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(2)}%`);

export default function VerifyImportPanel({ periods }: { periods: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [periodId, setPeriodId] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const chosen = periodId || periods[periods.length - 1]?.id || '';
  const audit = trpc.engagementAnalytics.importAudit.useQuery(
    { periodId: chosen }, { enabled: open && Boolean(chosen) },
  );
  const rows = trpc.engagementAnalytics.importSourceRows.useQuery(
    { periodId: chosen }, { enabled: false },
  );

  const download = async () => {
    const res = await rows.refetch();
    const data = res.data ?? [];
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...data.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    const label = periods.find((p) => p.id === chosen)?.label ?? 'survey';
    a.href = url; a.download = `${label.replace(/[^\w-]+/g, '-')}-source-rows.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const d = audit.data;

  return (
    <div className="ls-card mt-4 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ls-bg-2 transition-colors">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Check the numbers
          </h2>
          <p className="text-[12px] text-ls-ink-3 mt-0.5 ml-6">
            See where every imported figure came from, and download the source rows.
          </p>
        </div>
        <span className="ls-chip bg-ls-bg-2 text-ls-ink-2">Admin</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-ls-line">
          <div className="flex items-center gap-2 mt-3 mb-4 flex-wrap">
            <label className="text-[11px] font-semibold uppercase text-ls-ink-3">Survey</label>
            <select className={sel} value={chosen} onChange={(e) => setPeriodId(e.target.value)}>
              {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button onClick={download} className="ls-btn ls-btn-ghost inline-flex items-center gap-1.5 text-sm">
              <Download size={14} /> Download source rows
            </button>
          </div>

          {audit.isLoading && <p className="text-sm text-ls-ink-3">Checking…</p>}
          {audit.error && <p className="text-sm text-ls-risk">{audit.error.message}</p>}

          {d && d.sourceRowCount === 0 && (
            <div className="ls-card p-4 border-l-4 border-ls-blue text-[13px] text-ls-ink-2">
              This survey has no stored source rows — its figures were loaded directly rather than
              imported from a file, so there is nothing to recompute against. Anything imported
              through this page can be checked here.
            </div>
          )}

          {d && d.sourceRowCount > 0 && (
            <>
              <p className="text-[13px] text-ls-ink-2 mb-3">
                Held for <b>{d.period.label}</b>: {d.sourceRowCount} source row(s) —{' '}
                {d.companyStatements} company statement(s), {d.deptStatements} department statement(s)
                across {d.departments} department(s). {d.storedMetricCount} figure(s) calculated from them.
              </p>

              <div className={`ls-card p-3 mb-4 border-l-4 ${d.allMatch ? 'border-ls-thrive' : 'border-ls-risk'}`}>
                <p className="text-[13px] font-semibold flex items-center gap-1.5">
                  {d.allMatch
                    ? <><Check size={15} className="text-ls-thrive" /> Every figure recomputes to the same value from the source rows.</>
                    : <><AlertTriangle size={15} className="text-ls-risk" /> Some figures no longer match their source rows — re-import this survey.</>}
                </p>
                <p className="text-[12px] text-ls-ink-3 mt-1">
                  Each figure is recalculated from scratch and compared to what&rsquo;s stored. Nothing is
                  estimated or AI-generated — a driver is the average of its statements, weighted by
                  how many people answered each.
                </p>
              </div>

              {d.checks.length > 0 && (
                <table className="w-full text-[12.5px] mb-4">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wide text-ls-ink-3 border-b border-ls-line">
                      <th className="text-left py-1.5">Figure</th>
                      <th className="text-right">Stored</th>
                      <th className="text-right">Recomputed</th>
                      <th className="text-right">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.checks.map((c) => (
                      <tr key={c.label} className="border-b border-ls-line last:border-0">
                        <td className="py-1.5">{c.label}</td>
                        <td className="text-right tabular-nums">{pct(c.stored)}</td>
                        <td className="text-right tabular-nums">{pct(c.recomputed)}</td>
                        <td className="text-right">{c.matches ? '✓' : '✗'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {d.driverBreakdown.length > 0 && (
                <>
                  <h3 className="text-[13px] font-bold mb-2">What each driver is made of</h3>
                  <div className="space-y-1.5">
                    {d.driverBreakdown.map((db) => (
                      <div key={db.driver} className="border border-ls-line rounded-md">
                        <button
                          onClick={() => setExpanded(expanded === db.driver ? null : db.driver)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-ls-bg-2">
                          <span className="font-semibold">{db.driver.replace(/_/g, ' ')}</span>
                          <span className="text-ls-ink-3 text-[12px]">{db.statements.length} statement(s)</span>
                        </button>
                        {expanded === db.driver && (
                          <table className="w-full text-[12px] border-t border-ls-line">
                            <thead>
                              <tr className="text-[10.5px] font-bold uppercase text-ls-ink-3">
                                <th className="text-left px-3 py-1.5">Statement</th>
                                <th className="text-right">Favorable</th>
                                <th className="text-right">Answered</th>
                                <th className="text-right px-3">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {db.statements.map((st, i) => (
                                <tr key={`${db.driver}-${i}`} className="border-t border-ls-line">
                                  <td className="px-3 py-1.5">{st.statement}</td>
                                  <td className="text-right tabular-nums">{st.favorable ?? '—'}</td>
                                  <td className="text-right tabular-nums">{st.totalResponses ?? '—'}</td>
                                  <td className="text-right tabular-nums px-3">{pct(st.favorablePct)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
