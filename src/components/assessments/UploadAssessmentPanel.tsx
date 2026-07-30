// ============================================================
// UPLOAD ASSESSMENT (PDF) — admin panel on Core Data → Assessments.
//
// Three steps, deliberately: pick the person → read the PDF(s) → confirm what
// was found → save. The parse step writes nothing.
//
// Several files can be read at once — a person usually has a CCAT, an EPP and
// an Insights report, so uploading them one at a time is three round trips
// through the same form. Each file becomes its own reviewable draft; Save
// writes them all. Vendor reports (Criteria CCAT /
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

/** A single uploaded file: its draft (or the reason it couldn't be read) plus save state. */
type Item = {
  id: string;
  fileName: string;
  draft: Draft | null;
  parseError: string | null;
  status: 'ready' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  rowsWritten: number;
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

// Mirrors the server guard (express.json 25mb for /api/trpc, ~18mb of file
// after base64 inflation). Checked here too so an oversized file is refused
// before it is read and posted.
const MAX_FILE_BYTES = 18 * 1024 * 1024;

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // One entry per uploaded file, each independently reviewable and saveable.
  const [items, setItems] = useState<Item[]>([]);
  const [saved, setSaved] = useState<{ personName: string; savedKinds: Kind[]; rows: number } | null>(null);
  const [files, setFiles] = useState<Record<string, { name: string; base64: string }>>({});

  const parser = trpc.orgScreen.assessmentImportParse.useMutation();
  const committer = trpc.orgScreen.assessmentImportCommit.useMutation();

  const sorted = useMemo(
    () => [...users].sort((a, b) => str(a.name || a.email).localeCompare(str(b.name || b.email))),
    [users],
  );
  const target = sorted.find((u) => u.id === targetId);
  const targetLabel = target ? (target.name || target.email || 'that person') : '';

  const reset = () => {
    setItems([]); setErr(null); setSaved(null); setFiles({});
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const parseOne = async (
    name: string, base64: string, kind: '' | Kind, id: string,
  ): Promise<Item> => {
    try {
      const res = await parser.mutateAsync({
        fileName: name, fileBase64: base64,
        kind: kind === '' ? undefined : kind,
        userId: targetId || undefined,
      });
      return { id, fileName: name, draft: res as Draft, parseError: null, status: 'ready', saveError: null, rowsWritten: 0 };
    } catch (e) {
      return {
        id, fileName: name, draft: null,
        parseError: e instanceof Error ? e.message : 'Could not read that PDF.',
        status: 'error', saveError: null, rowsWritten: 0,
      };
    }
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    if (!targetId) {
      setErr('Choose who these assessments are for first.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
    const ok = picked.filter((f) => f.size <= MAX_FILE_BYTES);
    setErr(tooBig.length
      ? `${tooBig.map((f) => `"${f.name}"`).join(', ')} ${tooBig.length === 1 ? 'is' : 'are'} over the 18MB limit and ${tooBig.length === 1 ? 'was' : 'were'} skipped. Assessment reports are normally under 5MB.`
      : null);
    if (ok.length === 0) { if (fileRef.current) fileRef.current.value = ''; return; }

    setBusy(true); setSaved(null);
    setProgress({ done: 0, total: ok.length });
    // Sequential rather than parallel: each file is a PDF parse on the server,
    // and a progress count is more useful than a marginally faster burst.
    const collected: Item[] = [];
    const fileMap: Record<string, { name: string; base64: string }> = {};
    for (let i = 0; i < ok.length; i++) {
      const f = ok[i];
      const id = `${Date.now()}-${i}-${f.name}`;
      try {
        const base64 = await toBase64(f);
        fileMap[id] = { name: f.name, base64 };
        collected.push(await parseOne(f.name, base64, kindHint, id));
      } catch {
        collected.push({
          id, fileName: f.name, draft: null,
          parseError: 'Could not read that file off disk.',
          status: 'error', saveError: null, rowsWritten: 0,
        });
      }
      setProgress({ done: i + 1, total: ok.length });
    }
    setItems((prev) => [...prev, ...collected]);
    setFiles((prev) => ({ ...prev, ...fileMap }));
    setBusy(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /** Re-read one file after the type was set by hand (used when detection failed). */
  const reparse = async (id: string) => {
    const f = files[id];
    if (!f || kindHint === '') return;
    setBusy(true);
    const next = await parseOne(f.name, f.base64, kindHint, id);
    setItems((prev) => prev.map((it) => (it.id === id ? next : it)));
    setBusy(false);
  };

  const discard = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setFiles((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const saveable = items.filter((it) => it.draft && it.draft.kind !== 'unknown' && it.status !== 'saved');

  /** Commit every reviewed draft. Sequential — each write replaces its own type. */
  const saveAll = async () => {
    if (!targetId || saveable.length === 0) return;
    setBusy(true); setErr(null);
    const savedKinds: Kind[] = [];
    let rows = 0;
    let personName = targetLabel;

    for (const it of saveable) {
      const d = it.draft!;
      const kind = d.kind as Kind;
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: 'saving', saveError: null } : x)));
      try {
        const res = await committer.mutateAsync({
          userId: targetId,
          kind,
          sourceFile: d.fileName,
          ccat: kind === 'ccat' ? { sections: d.ccat?.sections ?? [] } : undefined,
          epp: kind === 'epp'
            ? { profileName: d.epp?.profileName ?? null, score: d.epp?.score ?? null, attributes: d.epp?.attributes ?? [] }
            : undefined,
          insights: kind === 'insights'
            ? {
                insightsType: d.insights?.insightsType ?? null,
                consciousWheel: d.insights?.consciousWheel ?? null,
                lessWheel: d.insights?.lessWheel ?? null,
                preferenceFlow: d.insights?.preferenceFlow ?? null,
                completedAt: d.insights?.completedAt || null,
                profiles: d.insights?.profiles ?? [],
              }
            : undefined,
        });
        personName = res.personName;
        savedKinds.push(kind);
        rows += res.rowsWritten;
        setItems((prev) => prev.map((x) => (x.id === it.id
          ? { ...x, status: 'saved', rowsWritten: res.rowsWritten } : x)));
      } catch (e) {
        // Keep going — one bad report shouldn't strand the others.
        setItems((prev) => prev.map((x) => (x.id === it.id
          ? { ...x, status: 'error', saveError: e instanceof Error ? e.message : 'Could not save this one.' } : x)));
      }
    }

    if (savedKinds.length > 0) {
      setSaved({ personName, savedKinds, rows });
      // The Organization → Assessments card reads the same rows, so refresh both.
      utils.orgScreen.invalidate();
      onSaved(targetId);
    }
    setBusy(false);
  };

  // ---- draft mutators, scoped to one uploaded file ----
  const patchDraft = (id: string, fn: (d: Draft) => Draft) =>
    setItems((prev) => prev.map((it) => (it.id === id && it.draft ? { ...it, draft: fn(it.draft) } : it)));

  const patchCcat = (id: string, i: number, patch: Partial<CcatSection>) =>
    patchDraft(id, (d) => (d.ccat
      ? { ...d, ccat: { sections: d.ccat.sections.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)) } }
      : d));

  const patchEppAttr = (id: string, i: number, patch: Partial<EppAttribute>) =>
    patchDraft(id, (d) => (d.epp
      ? { ...d, epp: { ...d.epp, attributes: d.epp.attributes.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) } }
      : d));

  const patchEpp = (id: string, patch: Partial<{ profileName: string | null; score: number | null }>) =>
    patchDraft(id, (d) => (d.epp ? { ...d, epp: { ...d.epp, ...patch } } : d));

  const patchInsight = (id: string, i: number, patch: Partial<InsightProfile>) =>
    patchDraft(id, (d) => (d.insights
      ? { ...d, insights: { ...d.insights, profiles: d.insights.profiles.map((pr, idx) => (idx === i ? { ...pr, ...patch } : pr)) } }
      : d));

  const patchInsightMeta = (id: string, patch: Record<string, unknown>) =>
    patchDraft(id, (d) => (d.insights ? { ...d, insights: { ...d.insights, ...patch } } : d));

  // Two files of the same type would both write, the second replacing the first.
  const dupKinds = (() => {
    const seen = new Map<string, number>();
    for (const it of items) {
      if (it.draft && it.draft.kind !== 'unknown') {
        seen.set(it.draft.kind, (seen.get(it.draft.kind) ?? 0) + 1);
      }
    }
    return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k as Kind);
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Upload size={15} /> Upload assessment PDFs
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Upload CCAT, EPP, and Insights Discovery reports as they come from the vendor — pick as
            many as you like at once. Nothing is saved until you review what was read from each
            file. HR and admins only.
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500">importer v2</span>
      </div>

      {/* Step 1 — who these are for (required) */}
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
            <option value="">Detect from each file</option>
            <option value="ccat">CCAT</option>
            <option value="epp">EPP</option>
            <option value="insights">Insights Discovery</option>
          </select>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple
            onChange={onFiles} className="hidden" id="assessment-pdf" />
          <label
            htmlFor="assessment-pdf"
            aria-disabled={!targetId || busy}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
              !targetId || busy
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            }`}
          >
            <Upload size={15} />
            {busy && progress
              ? `Reading ${progress.done} of ${progress.total}…`
              : busy ? 'Working…' : items.length > 0 ? 'Add more PDFs' : 'Choose PDFs'}
          </label>
        </div>
      </div>
      {!targetId ? (
        <p className="text-xs text-gray-500 mt-2">Pick a person before choosing files — an assessment is always saved against one person.</p>
      ) : (
        <p className="text-xs text-gray-400 mt-2">
          Hold Shift or Cmd to select several at once (e.g. a CCAT, an EPP and an Insights report). Max 18MB each.
        </p>
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
            Saved {saved.savedKinds.map((k) => k.toUpperCase()).join(' + ')} for{' '}
            <strong>{saved.personName}</strong> ({saved.rows} row{saved.rows === 1 ? '' : 's'}).
            {' '}It now shows on Organization → Assessments.
          </span>
        </div>
      )}

      {dupKinds.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            More than one {dupKinds.map((k) => k.toUpperCase()).join(' and ')} report here. Saving
            keeps only the last of each — discard the ones you don’t want.
          </span>
        </div>
      )}

      {/* Step 2 — review each file */}
      {items.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4 space-y-4">
          <div className="text-sm bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            Saving {items.length === 1 ? 'this report' : `these ${items.length} reports`} to <strong>{targetLabel}</strong>
          </div>

          {items.map((it) => {
            const d = it.draft;
            return (
              <div key={it.id} className={`border rounded-lg p-3 ${
                it.status === 'saved' ? 'border-green-300 bg-green-50/40'
                  : it.status === 'error' ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2 truncate">
                      <FileText size={14} className="shrink-0" /> <span className="truncate">{it.fileName}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {it.status === 'saved' && <span className="text-green-700 font-medium">Saved · {it.rowsWritten} row{it.rowsWritten === 1 ? '' : 's'}</span>}
                      {it.status === 'saving' && 'Saving…'}
                      {it.status !== 'saved' && it.status !== 'saving' && d && d.kind !== 'unknown' && <>read as <span className="font-medium">{KIND_LABEL[d.kind]}</span></>}
                      {it.status !== 'saved' && it.status !== 'saving' && d && d.kind === 'unknown' && 'type not recognised'}
                    </div>
                  </div>
                  <button onClick={() => discard(it.id)}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 shrink-0">
                    <X size={13} /> {it.status === 'saved' ? 'Clear' : 'Discard'}
                  </button>
                </div>

                {it.parseError && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" /> <span>{it.parseError}</span>
                  </div>
                )}
                {it.saveError && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-2">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" /> <span>{it.saveError}</span>
                  </div>
                )}

                {d && it.status !== 'saved' && (
                  <>
                    {d.nameMismatch && (
                      <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-md px-3 py-2 mb-3">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                        <span>
                          This report is for <strong>{d.nameMismatch.pdfName}</strong> but you selected{' '}
                          <strong>{d.nameMismatch.personName}</strong>. Check you picked the right person before saving.
                        </span>
                      </div>
                    )}

                    {d.notes.length > 0 && (
                      <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                        <div className="font-medium mb-1">Couldn’t read everything from this file — fill these in:</div>
                        <ul className="list-disc ml-4 space-y-0.5">
                          {d.notes.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                      </div>
                    )}

                    {d.kind === 'unknown' && (
                      <div className="text-sm text-gray-600 mb-3">
                        Set the assessment type above, then{' '}
                        <button onClick={() => reparse(it.id)} disabled={kindHint === '' || busy}
                          className="text-blue-600 font-medium disabled:text-gray-400">
                          read this file again
                        </button>.
                      </div>
                    )}

                    {/* CCAT */}
                    {d.kind === 'ccat' && d.ccat && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">
                          <strong>Overall</strong> is the raw score out of 50. The other rows are 0–100 percentiles.
                        </div>
                        {d.ccat.sections.map((sec, i) => (
                          <div key={i} className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className={lblCls}>Label</label>
                              <input className={`${inputCls} w-full`} value={sec.label}
                                onChange={(e) => patchCcat(it.id, i, { label: e.target.value })} />
                            </div>
                            <div className="w-28">
                              <label className={lblCls}>{sec.label.toLowerCase() === 'overall' ? 'Raw /50' : 'Percentile'}</label>
                              <input className={`${inputCls} w-full ${sec.score === null ? 'border-amber-400' : ''}`}
                                value={str(sec.score)} placeholder="—"
                                onChange={(e) => patchCcat(it.id, i, { score: toN(e.target.value) })} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* EPP */}
                    {d.kind === 'epp' && d.epp && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-[220px]">
                            <label className={lblCls}>EPP profile</label>
                            <input className={`${inputCls} w-full`} value={str(d.epp.profileName)}
                              placeholder={"e.g. Analysis, Planning & Consulting"}
                              onChange={(e) => patchEpp(it.id, { profileName: e.target.value })} />
                          </div>
                          <div className="w-28">
                            <label className={lblCls}>Badge score</label>
                            <input className={`${inputCls} w-full`} value={str(d.epp.score)} placeholder="0–100"
                              onChange={(e) => patchEpp(it.id, { score: toN(e.target.value) })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {d.epp.attributes.map((a, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 text-sm text-gray-800">{a.name}</span>
                              <input className={`${inputCls} w-20 ${a.st6Score === null ? 'border-amber-400' : ''}`}
                                value={str(a.st6Score)} placeholder="—"
                                onChange={(e) => patchEppAttr(it.id, i, { st6Score: toN(e.target.value) })} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {d.kind === 'insights' && d.insights && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={lblCls}>Persona type</label>
                            <input className={`${inputCls} w-full`} value={str(d.insights.insightsType)}
                              placeholder="e.g. Reforming Director"
                              onChange={(e) => patchInsightMeta(it.id, { insightsType: e.target.value })} />
                          </div>
                          <div>
                            <label className={lblCls}>Completed (YYYY-MM-DD)</label>
                            <input className={`${inputCls} w-full`} value={str(d.insights.completedAt)} placeholder="2026-06-04"
                              onChange={(e) => patchInsightMeta(it.id, { completedAt: e.target.value })} />
                          </div>
                          <div>
                            <label className={lblCls}>Conscious wheel position</label>
                            <input className={`${inputCls} w-full`} value={str(d.insights.consciousWheel)}
                              onChange={(e) => patchInsightMeta(it.id, { consciousWheel: e.target.value })} />
                          </div>
                          <div>
                            <label className={lblCls}>Less conscious wheel position</label>
                            <input className={`${inputCls} w-full`} value={str(d.insights.lessWheel)}
                              onChange={(e) => patchInsightMeta(it.id, { lessWheel: e.target.value })} />
                          </div>
                          <div className="w-32">
                            <label className={lblCls}>Preference flow %</label>
                            <input className={`${inputCls} w-full`} value={str(d.insights.preferenceFlow)}
                              onChange={(e) => patchInsightMeta(it.id, { preferenceFlow: toN(e.target.value) })} />
                          </div>
                        </div>
                        <div>
                          <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-1">
                            <span />
                            <span className={lblCls}>Conscious %</span>
                            <span className={lblCls}>Less conscious %</span>
                          </div>
                          {d.insights.profiles.map((pr, i) => (
                            <div key={pr.color} className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-1.5 items-center">
                              <span className="text-sm text-gray-800 capitalize">{pr.color}</span>
                              <input className={`${inputCls} w-full ${pr.consciousScore === null ? 'border-amber-400' : ''}`}
                                value={str(pr.consciousScore)} placeholder="—"
                                onChange={(e) => patchInsight(it.id, i, { consciousScore: toN(e.target.value) })} />
                              <input className={`${inputCls} w-full`} value={str(pr.lessConsciousScore)} placeholder="—"
                                onChange={(e) => patchInsight(it.id, i, { lessConsciousScore: toN(e.target.value) })} />
                            </div>
                          ))}
                          <p className="text-[11px] text-gray-400 mt-1">
                            The highest conscious energy becomes the lead colour on the person card.
                          </p>
                        </div>
                      </div>
                    )}

                    <details className="mt-3">
                      <summary className="text-xs text-gray-400 cursor-pointer">Show the text read from this PDF</summary>
                      <pre className="mt-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">{d.textPreview}</pre>
                    </details>
                  </>
                )}
              </div>
            );
          })}

          {/* Step 3 — commit everything reviewed */}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={saveAll} disabled={busy || !targetId || saveable.length === 0}
              className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Check size={15} />
              {busy ? 'Saving…' : saveable.length > 1
                ? `Save all ${saveable.length} to ${targetLabel}`
                : `Save to ${targetLabel}`}
            </button>
            {saveable.length > 0 && (
              <span className="text-xs text-gray-500">
                Replaces this person’s existing{' '}
                {[...new Set(saveable.map((x) => (x.draft!.kind as Kind).toUpperCase()))].join(' + ')} data.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
