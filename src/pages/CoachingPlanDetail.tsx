// ============================================================
// COACHING PLAN DETAIL — edit + AI regenerate + export to PDF
//
// Shows the plan crafted from a review: an editable narrative summary,
// strengths, and 1-3 focus areas (each tied to a company value + a coaching
// note). "Regenerate with AI" re-drafts from the source review. "Export to PDF"
// renders a clean printable document in a new window and triggers the browser
// print dialog (Save as PDF) to hand to the employee during feedback.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { fmtDate } from '../lib/date';
import { ArrowLeft, Trash2, Save, Sparkles, Printer, Plus, X, HeartHandshake, ShieldAlert } from 'lucide-react';

const RANK = { user: 1, manager: 2, admin: 3, sysadmin: 4 } as const;

type Focus = { valueId: string | null; itemType: 'value' | 'criterion' | null; itemId: string | null; itemName: string | null; title: string; coachingNote: string };

export default function CoachingPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: me } = trpc.auth.me.useQuery();
  const canEdit = !!me && (RANK[(me.role as keyof typeof RANK)] ?? 0) >= RANK.manager;

  const planQuery = trpc.coaching.get.useQuery({ id: id! }, { enabled: !!id });
  const { data: values } = trpc.values.list.useQuery();
  const plan = planQuery.data;

  const save = trpc.coaching.save.useMutation({ onSuccess: () => planQuery.refetch(), onError: (e) => alert(e.message) });
  const remove = trpc.coaching.remove.useMutation({ onSuccess: () => navigate('/coaching-plans'), onError: (e) => alert(e.message) });
  const regen = trpc.coaching.draftFromReview.useMutation({ onError: (e) => alert(e.message) });
  const regenSession = trpc.reviewSession.draftFromSession.useMutation({ onError: (e) => alert(e.message) });
  const forkPip = trpc.reviewSession.forkToPip.useMutation({
    onSuccess: (r) => navigate(`/pips/${r.pipId}`),
    onError: (e) => alert(e.message),
  });

  const [status, setStatus] = useState<'draft' | 'final'>('draft');
  const [summary, setSummary] = useState('');
  const [strengths, setStrengths] = useState('');
  const [focus, setFocus] = useState<Focus[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    if (plan) {
      setStatus((plan.status as 'draft' | 'final') ?? 'draft');
      setSummary(plan.summaryNarrative ?? '');
      setStrengths(plan.strengths ?? '');
      setAiGenerated(plan.aiGenerated ?? false);
      setFocus((plan.focusAreas ?? []).map((f: any) => ({ valueId: f.valueId, itemType: f.itemType ?? (f.valueId ? 'value' : null), itemId: f.itemId ?? f.valueId ?? null, itemName: f.valueName ?? null, title: f.title, coachingNote: f.coachingNote ?? '' })));
    }
  }, [plan]);

  if (planQuery.isLoading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;
  if (!plan) return <div className="p-8 text-center text-gray-500">Plan not found. <Link className="text-blue-600" to="/coaching-plans">Back to list</Link></div>;

  const updateFocus = (i: number, patch: Partial<Focus>) => setFocus((f) => f.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const addFocus = () => setFocus((f) => f.length >= 3 ? f : [...f, { valueId: null, itemType: null, itemId: null, itemName: null, title: '', coachingNote: '' }]);
  const removeFocus = (i: number) => setFocus((f) => f.filter((_, idx) => idx !== i));

  const doSave = () => {
    const cleaned = focus.filter((f) => f.title.trim());
    save.mutate({
      id: plan.id, status, summaryNarrative: summary || null, strengths: strengths || null,
      aiGenerated, focusAreas: cleaned.map((f) => ({ valueId: f.valueId, itemType: f.itemType, itemId: f.itemId, title: f.title.trim(), coachingNote: f.coachingNote || null })),
    });
  };

  const applyDraft = (d: any) => {
    setSummary(d.summaryNarrative); setStrengths(d.strengths); setAiGenerated(d.aiGenerated);
    setFocus((d.focusAreas ?? []).map((f: any) => ({
      valueId: f.valueId ?? (f.itemType === 'value' ? f.itemId : null),
      itemType: f.itemType ?? (f.valueId ? 'value' : null), itemId: f.itemId ?? f.valueId ?? null,
      itemName: null, title: f.title, coachingNote: f.coachingNote,
    })));
  };

  const regenerate = () => {
    if (!confirm('Replace the narrative, strengths, and focus areas with a fresh AI draft from the review? Unsaved edits will be lost.')) return;
    if (plan.sessionId) {
      regenSession.mutate({ employeeId: plan.employeeId as string, periodLabel: plan.periodLabel ?? null }, { onSuccess: applyDraft });
    } else if (plan.evaluationId) {
      regen.mutate({ evaluationId: plan.evaluationId }, { onSuccess: applyDraft });
    } else {
      alert('This plan is not linked to a review, so it cannot be regenerated.');
    }
  };
  const regenerating = regen.isLoading || regenSession.isLoading;

  const exportPdf = () => printPlan({
    employeeName: plan.employeeName, periodLabel: plan.periodLabel, authorName: plan.authorName,
    createdAt: plan.createdAt as any, summary, strengths,
    focus: focus.filter((f) => f.title.trim()),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/coaching-plans')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Coaching Plans
      </button>

      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="ls-eyebrow mb-1 flex items-center gap-1.5"><HeartHandshake size={13} className="text-emerald-600" /> Coaching Plan</div>
          <h1 className="text-2xl font-bold tracking-tight">{plan.employeeName}</h1>
          <p className="text-sm text-ls-ink-3 mt-0.5">
            {plan.periodLabel || 'No period'}
            {(plan.sessionId || plan.evaluationId) ? <> · from review · </> : <> · </>}
            <span className="text-gray-400">created {fmtDate(plan.createdAt as any)}{plan.authorName ? ` by ${plan.authorName}` : ''}</span>
            {aiGenerated && <span className="ml-1.5 inline-flex items-center gap-1 text-violet-600"><Sparkles size={12} /> AI-drafted</span>}
            {(plan as any).track === 'pip' && <span className="ml-1.5 inline-flex items-center gap-1 text-rose-600 font-medium"><ShieldAlert size={12} /> PIP track</span>}
          </p>
        </div>
        <button onClick={exportPdf}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0">
          <Printer size={16} /> Export to PDF
        </button>
      </div>

      {!canEdit && <div className="mb-4 text-xs text-gray-400">View only — manager role required to edit.</div>}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-40">
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Status</label>
          <select disabled={!canEdit} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50"
            value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'final')}>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>
        {canEdit && (plan.sessionId || plan.evaluationId) && (
          <button onClick={regenerate} disabled={regenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-violet-200 text-violet-700 rounded-md text-sm font-medium hover:bg-violet-50 disabled:opacity-50">
            <Sparkles size={14} /> {regenerating ? 'Regenerating…' : 'Regenerate with AI'}
          </button>
        )}
        {canEdit && plan.sessionId && (plan as any).track !== 'pip' && (
          <button onClick={() => { if (confirm('Convert this into a PIP track? A Performance Improvement Plan will be created, seeded from this review\'s weakest items and the focus areas below. The coaching plan stays intact.')) forkPip.mutate({ planId: plan.id }); }}
            disabled={forkPip.isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 text-rose-700 rounded-md text-sm font-medium hover:bg-rose-50 disabled:opacity-50">
            <ShieldAlert size={14} /> {forkPip.isLoading ? 'Creating PIP…' : 'Convert to PIP'}
          </button>
        )}
        {(plan as any).track === 'pip' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md"><ShieldAlert size={14} /> PIP attached — find it under PIPs</span>
        )}
      </div>

      {/* Narrative */}
      <Section title="Review summary" hint="The narrative story of this review — shared with the employee.">
        <textarea disabled={!canEdit} rows={6} value={summary} onChange={(e) => setSummary(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm leading-relaxed disabled:bg-gray-50"
          placeholder="Written summary of the review…" />
      </Section>

      {/* Strengths */}
      <Section title="Strengths" hint="Positive feedback on where this person is strong.">
        <textarea disabled={!canEdit} rows={4} value={strengths} onChange={(e) => setStrengths(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm leading-relaxed disabled:bg-gray-50"
          placeholder="What this person does well…" />
      </Section>

      {/* Focus areas */}
      <Section title={`Growth areas to focus on (${focus.length}/3)`} hint="1-3 areas to work on, drawn from the lower-scoring values.">
        <div className="space-y-3">
          {focus.map((f, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <input disabled={!canEdit} value={f.title} onChange={(e) => updateFocus(i, { title: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:bg-gray-50" placeholder="Focus area title" />
                {canEdit && (
                  <button onClick={() => removeFocus(i)} className="p-1 text-gray-300 hover:text-red-600" title="Remove"><X size={16} /></button>
                )}
              </div>
              <div className="flex flex-col gap-2 pl-8">
                {f.itemType === 'criterion' && f.itemName && (
                  <div className="text-xs text-gray-500">Mapped to performance criterion: <span className="font-medium text-gray-700">{f.itemName}</span></div>
                )}
                <select disabled={!canEdit} value={f.itemType === 'criterion' ? '' : (f.valueId ?? '')}
                  onChange={(e) => { const v = e.target.value || null; updateFocus(i, { valueId: v, itemType: v ? 'value' : null, itemId: v, itemName: null }); }}
                  className="w-full sm:w-64 px-3 py-1.5 border border-gray-300 rounded-md text-xs bg-white disabled:bg-gray-50">
                  <option value="">{f.itemType === 'criterion' ? 'Keep performance-criterion mapping' : 'Not tied to a value'}</option>
                  {(values ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <textarea disabled={!canEdit} rows={2} value={f.coachingNote} onChange={(e) => updateFocus(i, { coachingNote: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs disabled:bg-gray-50" placeholder="Coaching note — the concrete action to work on…" />
              </div>
            </div>
          ))}
          {canEdit && focus.length < 3 && (
            <button onClick={addFocus} className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 text-gray-500 rounded-md text-sm hover:border-blue-400 hover:text-blue-600">
              <Plus size={14} /> Add focus area
            </button>
          )}
        </div>
      </Section>

      {canEdit && (
        <div className="flex justify-between items-center mt-6">
          <button onClick={() => { if (confirm('Delete this coaching plan?')) remove.mutate({ id: plan.id }); }}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"><Trash2 size={14} /> Delete</button>
          <button onClick={doSave} disabled={save.isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save size={15} /> {save.isLoading ? 'Saving…' : 'Save plan'}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

// --- Print-to-PDF: render a clean document in a new window ---
function printPlan(p: {
  employeeName: string; periodLabel: string | null; authorName: string | null;
  createdAt: string; summary: string; strengths: string;
  focus: { valueId: string | null; title: string; coachingNote: string }[];
}) {
  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const para = (s: string) => esc(s).split(/\n+/).filter(Boolean).map((t) => `<p>${t}</p>`).join('') || '<p class="muted">—</p>';
  const focusHtml = p.focus.length
    ? p.focus.map((f, i) => `
        <div class="focus">
          <div class="focus-h"><span class="num">${i + 1}</span>${esc(f.title)}</div>
          ${f.coachingNote ? `<div class="focus-note">${esc(f.coachingNote)}</div>` : ''}
        </div>`).join('')
    : '<p class="muted">No focus areas.</p>';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Coaching Plan — ${esc(p.employeeName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 48px; line-height: 1.55; }
    .brand { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #0891b2; font-weight: 700; }
    h1 { font-size: 26px; margin: 4px 0 2px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; margin: 26px 0 10px; }
    p { margin: 0 0 9px; font-size: 14px; }
    .muted { color: #9ca3af; }
    .focus { border: 1px solid #e5e7eb; border-left: 4px solid #059669; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; }
    .focus-h { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .num { background: #d1fae5; color: #047857; width: 20px; height: 20px; border-radius: 50%; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
    .focus-note { font-size: 13px; color: #4b5563; margin-top: 5px; }
    .foot { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
    @media print { body { padding: 24px; } @page { margin: 18mm; } }
  </style></head><body>
    <div class="brand">Lightspeed · AI Engagement</div>
    <h1>Coaching Plan</h1>
    <div class="meta">${esc(p.employeeName)}${p.periodLabel ? ` · ${esc(p.periodLabel)}` : ''} · ${fmtDate(p.createdAt)}${p.authorName ? ` · prepared by ${esc(p.authorName)}` : ''}</div>
    <h2>Review Summary</h2>
    ${para(p.summary)}
    <h2>Strengths</h2>
    ${para(p.strengths)}
    <h2>Growth Areas to Focus On</h2>
    ${focusHtml}
    <div class="foot">Generated from a values-based performance review · Confidential — for the feedback conversation.</div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) { alert('Please allow pop-ups to export the PDF.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = () => { w.focus(); w.print(); };
  // Fallback if onload already fired.
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 400);
}
