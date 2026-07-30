// ============================================================
// MANAGE SURVEYS — archive, restore, and (for imported surveys) delete.
//
// Archiving is the safe default: the survey keeps every source row and figure,
// it just drops out of the survey list, the period pickers and the trend series
// until restored. Deleting is offered only for imported surveys — it exists to
// clear out test uploads — and requires typing the survey name.
// ============================================================
import { useState } from 'react';
import { ChevronDown, ChevronRight, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { trpc } from '../../lib/trpc';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function ManageSurveysPanel() {
  const utils = trpc.useContext();
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const all = trpc.engagementAnalytics.listAllPeriods.useQuery(undefined, { enabled: open });
  const refresh = () => {
    utils.engagementAnalytics.invalidate();
    utils.engagementSurvey.invalidate();
  };
  const onErr = (e: { message: string }) => setErr(e.message);

  const archive = trpc.engagementAnalytics.setArchived.useMutation({ onSuccess: () => { setErr(null); refresh(); }, onError: onErr });
  const remove = trpc.engagementAnalytics.deletePeriod.useMutation({
    onSuccess: () => { setErr(null); setConfirming(null); setTyped(''); refresh(); },
    onError: onErr,
  });

  const rows = all.data ?? [];
  const active = rows.filter((r) => !r.archivedAt);
  const archived = rows.filter((r) => r.archivedAt);
  const shown = showArchived ? archived : active;

  return (
    <div className="ls-card mt-4 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ls-bg-2 transition-colors">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Manage surveys
          </h2>
          <p className="text-[12px] text-ls-ink-3 mt-0.5 ml-6">
            Archive past surveys to tidy the list, or restore them later.
          </p>
        </div>
        <span className="ls-chip bg-ls-bg-2 text-ls-ink-2">Admin</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-ls-line">
          <div className="flex items-center gap-2 mt-3 mb-3 flex-wrap">
            <button onClick={() => setShowArchived(false)}
              className={`ls-btn text-xs ${!showArchived ? 'ls-btn-primary' : 'ls-btn-ghost'}`}>
              Active ({active.length})
            </button>
            <button onClick={() => setShowArchived(true)}
              className={`ls-btn text-xs ${showArchived ? 'ls-btn-primary' : 'ls-btn-ghost'}`}>
              Archived ({archived.length})
            </button>
          </div>

          <p className="text-[12px] text-ls-ink-3 mb-3 max-w-2xl">
            Archiving keeps everything — all source rows and figures stay in the database. The survey
            simply drops out of the survey list, the period dropdowns and the trend comparisons until
            you restore it.
          </p>

          {err && <div className="ls-card p-3 mb-3 border-l-4 border-ls-risk text-[13px] text-ls-ink-2">{err}</div>}
          {all.isLoading && <p className="text-sm text-ls-ink-3">Loading…</p>}
          {!all.isLoading && shown.length === 0 && (
            <p className="text-sm text-ls-ink-3">{showArchived ? 'Nothing archived.' : 'No surveys yet.'}</p>
          )}

          <div className="space-y-2">
            {shown.map((p) => (
              <div key={p.id} className="border border-ls-line rounded-md px-3 py-2.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] flex items-center gap-2 flex-wrap">
                      {p.label}
                      {p.isCurrent && <span className="ls-chip bg-ls-thrive-bg text-ls-thrive">Current</span>}
                      <span className="ls-chip bg-ls-bg-2 text-ls-ink-3">{p.source === 'import' ? 'Imported' : 'In-app'}</span>
                    </div>
                    <div className="text-[12px] text-ls-ink-3 mt-0.5">
                      Closed {fmtDate(p.periodDate)} · {p.responseCount || 0}
                      {p.eligibleCount ? ` / ${p.eligibleCount}` : ''} responded · {p.metricCount} figure(s)
                      {p.sourceRowCount > 0 && ` · ${p.sourceRowCount} source row(s)`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.archivedAt ? (
                      <button
                        onClick={() => archive.mutate({ periodId: p.id, archived: false })}
                        disabled={archive.isPending}
                        className="ls-btn ls-btn-ghost text-xs inline-flex items-center gap-1.5">
                        <RotateCcw size={13} /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => archive.mutate({ periodId: p.id, archived: true })}
                        disabled={archive.isPending || p.isCurrent}
                        title={p.isCurrent ? 'Make another survey current before archiving this one' : undefined}
                        className="ls-btn ls-btn-ghost text-xs inline-flex items-center gap-1.5 disabled:opacity-40">
                        <Archive size={13} /> Archive
                      </button>
                    )}
                    {p.source === 'import' && !p.isCurrent && (
                      <button
                        onClick={() => { setConfirming(confirming === p.id ? null : p.id); setTyped(''); setErr(null); }}
                        className="text-ls-ink-3 hover:text-ls-risk" aria-label={`Delete ${p.label}`}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {confirming === p.id && (
                  <div className="mt-3 pt-3 border-t border-ls-line">
                    <p className="text-[12.5px] text-ls-ink-2 mb-2">
                      This permanently deletes <b>{p.label}</b> — {p.metricCount} figure(s) and{' '}
                      {p.sourceRowCount} source row(s). It cannot be undone. Archive instead if you
                      only want it out of the way. Type <b>{p.label}</b> to confirm.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        className="px-3 py-1.5 border border-ls-line rounded-md text-sm"
                        value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={p.label} />
                      <button
                        onClick={() => remove.mutate({ periodId: p.id, confirmLabel: typed })}
                        disabled={remove.isPending || typed.trim().toLowerCase() !== p.label.trim().toLowerCase()}
                        className="ls-btn text-xs bg-ls-risk text-white disabled:opacity-40">
                        {remove.isPending ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button onClick={() => { setConfirming(null); setTyped(''); }} className="ls-btn ls-btn-ghost text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
