// ============================================================
// UPLOAD ASSESSMENT (PDF) — admin panel on Core Data → Assessments.
//
// Three steps, deliberately: pick the person → read the PDF → confirm what was
// found → save. The parse step writes nothing. Vendor reports (Criteria CCAT /
// EPP, Insights Discovery) are formatted documents, not data feeds, so the
// extraction is best-effort; every field lands in an editable form with notes
// about anything that couldn't be found. Nothing reaches a person's record
// until the admin presses Save.
//
// The confirm form is also the only way to hand-enter CCAT / EPP / Insights
// values — the page's other editors cover the summary block only.
// ============================================================
import { useMemo, useRef, useState } from 'react';
import { Upload, AlertTriangle, Check, X, FileText } from 'lucide-react';
import { trpc } from '../../lib/trpc';

type Kind = 'ccat' | 'epp' | 'insights';
type InsightColor = 'blue' | 'green' | 'yellow' | 'red';

type CcatSection = { label: string; score: number | null; sortOrder?: number };
type EppAttribute = { name: string; st6Score: number | null; sortOrder?: number };
type InsightProfile = {
  color: InsightColor; consciousScore: number | null;
  lessConsciousScore: number | null; isPrimary?: boolean; sortOrder?: number;
};

type Draft = {
  kind: Kind | 'unknown';
  fileName: string;
  detectedName: string | null;
  notes: string[];
  nameMismatch: { pdfName: string; personName: string } | null;
  ccat: { sections: CcatSection[] } | null;
  epp: { profileName: string | null; score: number | null; attributes: EppAttribute[] } | null;
  insights: {
    insightsType: string | null; consciousWheel: string | null; lessWheel: string | null;
    preferenceFlow: number | null; completedAt: string | null; profiles: InsightProfile[];
  } | null;
  textPreview: string;
};

const inputCls =
  'px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';
const lblCls = 'block text-[11px] uppercase tracking-wide text-gray-500 mb-1';

const KIND_LABEL: Record<Kind, string> = {
  ccat: 'CCAT — Criteria Cognitive Aptitude Test',
  epp: 'EPP — Criteria Employee Personality Profile',
  insights: 'Insights Discovery',
};

/** '' -> null so a cleared field stores NULL rather than 0. */
const toN = (s: string): number | null => (s.trim() === '' ? null : Number(s));
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/** File -> base64; parsing happens server-side (services/assessmentPdf.ts). */
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

export default function UploadAssessmentPanel({
  users, selectedUserId, onSaved,
}: {
  users: Array<{ id: string; name?: string | null; email?: string | null; title?: string | null }>;
  selectedUserId: string;
  onSaved: (userId: string) => void;
}) {
  const utils = trpc.useContext();
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Who this upload is for. Seeded from the page's selection but always shown
  // and always required — attribution is never silent.
  const [targetId, setTargetId] = useState(selectedUserId);
  const [kindHint, setKindHint] = useState<'' | Kind>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<{ personName: string; kind: Kind; rowsWritten: number } | null>(null);
  const [lastFile, setLastFile] = useState<{ name: string; base64: string } | null>(null);

  const parser = trpc.orgScreen.assessmentImportParse.useMutation();
  const committer = trpc.orgScreen.assessmentImportCommit.useMutation();

  const sorted = useMemo(
    () => [...users].sort((a, b) => str(a.name || a.email).localeCompare(str(b.name || b.email))),
    [users],
  );
  const target = sorted.find((u) => u.id === targetId);
  const targetLabel = target ? (target.name || target.email || 'that person') : '';

  const reset = () => {
    setDraft(null); setErr(null); setSaved(null); setLastFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const runParse = async (name: string, base64: string, kind: '' | Kind) => {
    setBusy(true); setErr(null); setSaved(null);
    try {
      const res = await parser.mutateAsync({
        fileName: name, fileBase64: base64,
        kind: kind === '' ? undefined : kind,
        userId: targetId || undefined,
      });
      setDraft(res as Draft);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read that PDF.');
      setDraft(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files ?? [])[0];
    if (!file) return;
    if (!targetId) { setErr('Choose who this assessment is for first.'); if (fileRef.current) fileRef.current.value = ''; return; }
    const base64 = await toBase64(file);
    setLastFile({ name: file.name, base64 });
    await runParse(file.name, base64, kindHint);
  };

  const save = async () => {
    if (!draft || draft.kind === 'unknown' || !targetId) return;
    setBusy(true); setErr(null);
    try {
      const res = await committer.mutateAsync({
        userId: targetId,
        kind: draft.kind,
        sourceFile: draft.fileName,
        ccat: draft.kind === 'ccat' ? { sections: draft.ccat?.sections ?? [] } : undefined,
        epp: draft.kind === 'epp'
          ? { profileName: draft.epp?.profileName ?? null, score: draft.epp?.score ?? null, attributes: draft.epp?.attributes ?? [] }
          : undefined,
        insights: draft.kind === 'insights'
          ? {
              insightsType: draft.insights?.insightsType ?? null,
              consciousWheel: draft.insights?.consciousWheel ?? null,
              lessWheel: draft.insights?.lessWheel ?? null,
              preferenceFlow: draft.insights?.preferenceFlow ?? null,
              completedAt: draft.insights?.completedAt || null,
              profiles: draft.insights?.profiles ?? [],
            }
          : undefined,
      });
      setSaved({ personName: res.personName, kind: res.kind as Kind, rowsWritten: res.rowsWritten });
      setDraft(null); setLastFile(null);
      if (fileRef.current) fileRef.current.value = '';
      // The Organization → Assessments card reads the same rows, so refresh both.
      utils.orgScreen.invalidate();
      onSaved(targetId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that assessment.');
    } finally {
      setBusy(false);
    }
  };

  // ---- draft mutators (kept shallow; the draft is a plain editable object) ----
  const patchCcat = (i: number, patch: Partial<CcatSection>) => setDraft((d) => {
    if (!d?.ccat) return d;
    const sections = d.ccat.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    return { ...d, ccat: { sections } };
  });
  const patchEppAttr = (i: number, patch: Partial<EppAttribute>) => setDraft((d) => {
    if (!d?.epp) return d;
    const attributes = d.epp.attributes.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    return { ...d, epp: { ...d.epp, attributes } };
  });
  const patchEpp = (patch: Partial<{ profileName: string | null; score: number | null }>) => setDraft((d) =>
    d?.epp ? { ...d, epp: { ...d.epp, ...patch } } : d);
  const patchInsight = (i: number, patch: Partial<InsightProfile>) => setDraft((d) => {
    if (!d?.insights) return d;
    const profiles = d.insights.profiles.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    return { ...d, insights: { ...d.insights, profiles } };
  });
  const patchInsightMeta = (patch: Record<string, unknown>) => setDraft((d) =>
    d?.insights ? { ...d, insights: { ...d.insights, ...patch } } : d);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Upload size={15} /> Upload assessment PDF
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Upload a CCAT, EPP, or Insights Discovery report as it comes from the vendor. Nothing is
            saved until you review what was read from the file. Admin only.
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500">importer v1</span>
      </div>

      {/* Step 1 — who is this for (required) */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px]">
          <label className={lblCls}>Uploading for <span className="text-red-500">*</span></label>
          <select
            className={`${inputCls} w-full ${!targetId ? 'border-red-300' : ''}`}
            value={targetId}
            onChange={(e) => { setTargetId(e.target.value); reset(); }}
          >
            <option value="">Select a person…</option>
            {sorted.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}{u.title ? ` — ${u.title}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="w-56">
          <label className={lblCls}>Assessment type</label>
          <select className={`${inputCls} w-full`} value={kindHint}
            onChange={(e) => setKindHint(e.target.value as '' | Kind)}>
            <option value="">Detect from the file</option>
            <option value="ccat">CCAT</option>
            <option value="epp">EPP</option>
            <option value="insights">Insights Discovery</option>
          </select>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={onFile} className="hidden" id="assessment-pdf" />
          <label
            htmlFor="assessment-pdf"
            aria-disabled={!targetId || busy}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
              !targetId || busy
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            }`}
          >
            <Upload size={15} /> {busy ? 'Reading…' : 'Choose PDF'}
          </label>
        </div>
      </div>
      {!targetId && (
        <p className="text-xs text-gray-500 mt-2">Pick a person before choosing a file — an assessment is always saved against one person.</p>
      )}

      {err && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> <span>{err}</span>
        </div>
      )}

      {saved && (
        <div className="mt-3 flex items-start gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <Check size={15} className="mt-0.5 shrink-0" />
          <span>
            Saved {saved.kind.toUpperCase()} for <strong>{saved.personName}</strong> ({saved.rowsWritten} row
            {saved.rowsWritten === 1 ? '' : 's'}). It now shows on Organization → Assessments.
          </span>
        </div>
      )}

      {/* Step 2 — confirm what was read */}
      {draft && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={14} /> Review before saving
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {draft.fileName}
                {draft.kind !== 'unknown' && <> · read as <span className="font-medium">{KIND_LABEL[draft.kind]}</span></>}
              </div>
            </div>
            <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <X size={13} /> Discard
            </button>
          </div>

          {/* Saving-to restatement — the attribution check */}
          <div className="text-sm bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-3">
            Saving to <strong>{targetLabel}</strong>
            {draft.detectedName && <> · the PDF names <strong>{draft.detectedName}</strong></>}
          </div>

          {draft.nameMismatch && (
            <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-md px-3 py-2 mb-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                This report is for <strong>{draft.nameMismatch.pdfName}</strong> but you selected{' '}
                <strong>{draft.nameMismatch.personName}</strong>. Check you picked the right person before saving.
              </span>
            </div>
          )}

          {draft.notes.length > 0 && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
              <div className="font-medium mb-1">Couldn’t read everything from the file — fill these in:</div>
              <ul className="list-disc ml-4 space-y-0.5">
                {draft.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}

          {draft.kind === 'unknown' && (
            <div className="text-sm text-gray-600 mb-3">
              Pick the assessment type above, then{' '}
              <button
                onClick={() => lastFile && runParse(lastFile.name, lastFile.base64, kindHint)}
                disabled={kindHint === '' || !lastFile}
                className="text-blue-600 font-medium disabled:text-gray-400"
              >
                read the file again
              </button>.
            </div>
          )}

          {/* CCAT */}
          {draft.kind === 'ccat' && draft.ccat && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                <strong>Overall</strong> is the raw score out of 50. The other rows are 0–100 percentiles.
              </div>
              {draft.ccat.sections.map((s, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={lblCls}>Label</label>
                    <input className={`${inputCls} w-full`} value={s.label}
                      onChange={(e) => patchCcat(i, { label: e.target.value })} />
                  </div>
                  <div className="w-28">
                    <label className={lblCls}>{s.label.toLowerCase() === 'overall' ? 'Raw /50' : 'Percentile'}</label>
                    <input className={`${inputCls} w-full ${s.score === null ? 'border-amber-400' : ''}`}
                      value={str(s.score)} placeholder="—"
                      onChange={(e) => patchCcat(i, { score: toN(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EPP */}
          {draft.kind === 'epp' && draft.epp && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <label className={lblCls}>EPP profile</label>
                  <input className={`${inputCls} w-full`} value={str(draft.epp.profileName)}
                    placeholder="e.g. Analysis, Planning & Consulting"
                    onChange={(e) => patchEpp({ profileName: e.target.value })} />
                </div>
                <div className="w-28">
                  <label className={lblCls}>Badge score</label>
                  <input className={`${inputCls} w-full`} value={str(draft.epp.score)} placeholder="0–100"
                    onChange={(e) => patchEpp({ score: toN(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {draft.epp.attributes.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-800">{a.name}</span>
                    <input className={`${inputCls} w-20 ${a.st6Score === null ? 'border-amber-400' : ''}`}
                      value={str(a.st6Score)} placeholder="—"
                      onChange={(e) => patchEppAttr(i, { st6Score: toN(e.target.value) })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {draft.kind === 'insights' && draft.insights && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lblCls}>Persona type</label>
                  <input className={`${inputCls} w-full`} value={str(draft.insights.insightsType)}
                    placeholder="e.g. Reforming Director"
                    onChange={(e) => patchInsightMeta({ insightsType: e.target.value })} />
                </div>
                <div>
                  <label className={lblCls}>Completed (YYYY-MM-DD)</label>
                  <input className={`${inputCls} w-full`} value={str(draft.insights.completedAt)} placeholder="2026-06-04"
                    onChange={(e) => patchInsightMeta({ completedAt: e.target.value })} />
                </div>
                <div>
                  <label className={lblCls}>Conscious wheel position</label>
                  <input className={`${inputCls} w-full`} value={str(draft.insights.consciousWheel)}
                    onChange={(e) => patchInsightMeta({ consciousWheel: e.target.value })} />
                </div>
                <div>
                  <label className={lblCls}>Less conscious wheel position</label>
                  <input className={`${inputCls} w-full`} value={str(draft.insights.lessWheel)}
                    onChange={(e) => patchInsightMeta({ lessWheel: e.target.value })} />
                </div>
                <div className="w-32">
                  <label className={lblCls}>Preference flow %</label>
                  <input className={`${inputCls} w-full`} value={str(draft.insights.preferenceFlow)}
                    onChange={(e) => patchInsightMeta({ preferenceFlow: toN(e.target.value) })} />
                </div>
              </div>
              <div>
                <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-1">
                  <span />
                  <span className={lblCls}>Conscious %</span>
                  <span className={lblCls}>Less conscious %</span>
                </div>
                {draft.insights.profiles.map((p, i) => (
                  <div key={p.color} className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-1.5 items-center">
                    <span className="text-sm text-gray-800 capitalize">{p.color}</span>
                    <input className={`${inputCls} w-full ${p.consciousScore === null ? 'border-amber-400' : ''}`}
                      value={str(p.consciousScore)} placeholder="—"
                      onChange={(e) => patchInsight(i, { consciousScore: toN(e.target.value) })} />
                    <input className={`${inputCls} w-full`} value={str(p.lessConsciousScore)} placeholder="—"
                      onChange={(e) => patchInsight(i, { lessConsciousScore: toN(e.target.value) })} />
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 mt-1">
                  The highest conscious energy becomes the lead colour on the person card.
                </p>
              </div>
            </div>
          )}

          {draft.kind !== 'unknown' && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button onClick={save} disabled={busy || !targetId}
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Check size={15} /> {busy ? 'Saving…' : `Save to ${targetLabel}`}
              </button>
              <span className="text-xs text-gray-500">
                Replaces this person’s existing {draft.kind.toUpperCase()} data.
              </span>
            </div>
          )}

          <details className="mt-3">
            <summary className="text-xs text-gray-400 cursor-pointer">Show the text read from the PDF</summary>
            <pre className="mt-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">{draft.textPreview}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
