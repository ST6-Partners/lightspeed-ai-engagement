// ============================================================
// ENGAGEMENT QUESTIONS (admin) — question bank + survey VERSIONS.
// Pick/create a named version (e.g. "V1 — Marketing"), check which questions it
// includes, then SAVE to apply it to that version's Take Survey. Edit wording or
// add custom questions to the shared bank. Core questions can be turned off (per
// version) but never deleted. Mutations are admin-only (enforced server-side).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { DRIVERS } from '../../lib/engagementSurvey';
import { Plus, Trash2, ListChecks, Save, Copy, Star } from 'lucide-react';
import ImportButton from '../../components/ImportButton';

const inputCls = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

export default function EngagementQuestions() {
  const utils = trpc.useContext();
  const { data: bank } = trpc.engagementSurveyQuestions.list.useQuery();
  const imp = trpc.engagementSurveyQuestions.import.useMutation({ onSuccess: () => utils.engagementSurveyQuestions.list.invalidate() });
  const { data: versions } = trpc.engagementSurveyVersions.list.useQuery();

  const invalidateBank = () => utils.engagementSurveyQuestions.list.invalidate();
  const invalidateVersions = () => utils.engagementSurveyVersions.list.invalidate();

  const update = trpc.engagementSurveyQuestions.update.useMutation({ onSuccess: invalidateBank, onError: (e) => alert(e.message) });
  const create = trpc.engagementSurveyQuestions.create.useMutation({ onError: (e) => alert(e.message) });
  const remove = trpc.engagementSurveyQuestions.remove.useMutation({ onSuccess: invalidateBank, onError: (e) => alert(e.message) });
  const createVersion = trpc.engagementSurveyVersions.create.useMutation({ onError: (e) => alert(e.message) });
  const renameVersion = trpc.engagementSurveyVersions.rename.useMutation({ onSuccess: invalidateVersions, onError: (e) => alert(e.message) });
  const setDefaultVersion = trpc.engagementSurveyVersions.setDefault.useMutation({ onSuccess: invalidateVersions, onError: (e) => alert(e.message) });
  const removeVersion = trpc.engagementSurveyVersions.remove.useMutation({ onSuccess: invalidateVersions, onError: (e) => alert(e.message) });
  const saveQuestions = trpc.engagementSurveyVersions.setQuestions.useMutation({
    onSuccess: () => { invalidateVersions(); setJustSaved(true); setTimeout(() => setJustSaved(false), 2500); },
    onError: (e) => alert(e.message),
  });

  const [selectedId, setSelectedId] = useState<string>('');
  const [membership, setMembership] = useState<Set<string>>(new Set());
  const [justSaved, setJustSaved] = useState(false);

  // Default the selected version, and (re)load its membership when the version changes.
  const selected = useMemo(() => versions?.find((v) => v.id === selectedId), [versions, selectedId]);
  useEffect(() => {
    if (!versions?.length) return;
    if (!selectedId || !versions.find((v) => v.id === selectedId)) {
      setSelectedId((versions.find((v) => v.isDefault) ?? versions[0]).id);
    }
  }, [versions, selectedId]);
  useEffect(() => {
    if (selected) setMembership(new Set(selected.questionIds));
  }, [selected]);

  const savedSet = useMemo(() => new Set(selected?.questionIds ?? []), [selected]);
  const dirty = useMemo(() => {
    if (membership.size !== savedSet.size) return true;
    for (const id of membership) if (!savedSet.has(id)) return true;
    return false;
  }, [membership, savedSet]);

  const rows = useMemo(() => (bank ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [bank]);
  const grouped = useMemo(() => {
    const out: { key: string; title: string; items: typeof rows }[] = [];
    for (const q of rows) {
      let g = out.find((x) => x.key === q.section);
      if (!g) { g = { key: q.section, title: q.sectionTitle, items: [] }; out.push(g); }
      g.items.push(q);
    }
    return out;
  }, [rows]);
  const sections = useMemo(() => grouped.map((g) => ({ key: g.key, title: g.title })), [grouped]);

  const toggle = (id: string) => setMembership((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const [text, setText] = useState('');
  const [section, setSection] = useState('');
  const [driver, setDriver] = useState('');
  const addQuestion = async () => {
    if (!text.trim() || !section) { alert('Enter question text and pick a section.'); return; }
    const sec = sections.find((s) => s.key === section);
    const row = await create.mutateAsync({ text: text.trim(), section, sectionTitle: sec?.title ?? section, driver: driver || null, type: 'likert5', isActive: true });
    await invalidateBank();
    setMembership((prev) => new Set(prev).add(row.id)); // stage into current version
    setText(''); setDriver('');
  };

  const onSave = () => { if (selectedId) saveQuestions.mutate({ id: selectedId, questionIds: [...membership] }); };

  const newVersion = async () => {
    const name = prompt('Name the new version (e.g. "V2 — Sales"):')?.trim();
    if (!name) return;
    const v = await createVersion.mutateAsync({ name, copyFromVersionId: selectedId || undefined });
    await invalidateVersions(); setSelectedId(v.id);
  };
  const doRename = () => { const n = prompt('Rename version:', selected?.name)?.trim(); if (n && selected) renameVersion.mutate({ id: selected.id, name: n }); };
  const doDelete = () => { if (selected && confirm(`Delete version "${selected.name}"?`)) removeVersion.mutate({ id: selected.id }); };

  const activeCount = membership.size;

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks className="text-blue-600" size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Engagement Questions</h1>
          <div className="my-2"><ImportButton label="Import questions" hint="CSV: text, driver, section, sectionTitle"
            onImport={async (rows) => imp.mutateAsync({ rows: rows.map((r) => ({ text: r.text ?? r.question ?? '', driver: r.driver, section: r.section, sectionTitle: r.sectiontitle })) })} /></div>
          <p className="text-sm text-gray-500">Build named survey versions (e.g. one for Marketing, one for Sales). Check the questions a version includes, then Save — that version’s Take Survey tab updates to match.</p>
        </div>
      </div>

      {/* Version bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-800">Version:</span>
        <select className={inputCls} value={selectedId} onChange={(e) => {
          if (dirty && !confirm('Discard unsaved changes to this version?')) return;
          setSelectedId(e.target.value);
        }}>
          {(versions ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}{v.isDefault ? ' (default)' : ''}</option>)}
        </select>
        <button onClick={newVersion} className="inline-flex items-center gap-1 px-2.5 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"><Plus size={14} /> New</button>
        <button onClick={doRename} disabled={!selected} className="px-2.5 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">Rename</button>
        <button onClick={() => selected && setDefaultVersion.mutate({ id: selected.id })} disabled={!selected || selected.isDefault}
          className="inline-flex items-center gap-1 px-2.5 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40"><Star size={14} /> Make default</button>
        <button onClick={doDelete} disabled={!selected || selected.isDefault} className="px-2.5 py-2 border border-gray-300 rounded-md text-sm text-red-600 hover:bg-red-50 disabled:opacity-40">Delete</button>
        <div className="ml-auto flex items-center gap-3">
          {justSaved && <span className="text-[13px] text-green-600">✓ Saved — live on the survey</span>}
          {dirty && !justSaved && <span className="text-[13px] text-amber-600">Unsaved changes</span>}
          <button onClick={onSave} disabled={!dirty || saveQuestions.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Save size={15} /> {saveQuestions.isPending ? 'Saving…' : 'Save survey'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-5 text-sm text-gray-600 flex items-center gap-2">
        <Copy size={14} className="text-gray-400" />
        <b>{activeCount}</b> question{activeCount === 1 ? '' : 's'} in “{selected?.name ?? '…'}”. New versions start as a copy of the version you were on.
      </div>

      {/* Add custom question (to the shared bank) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <div className="text-sm font-semibold text-gray-800 mb-2">Add a question to the bank</div>
        <textarea className={inputCls + ' w-full mb-2'} rows={2} placeholder="Question text…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap gap-2 items-center">
          <select className={inputCls} value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Section…</option>
            {sections.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}
          </select>
          <select className={inputCls} value={driver} onChange={(e) => setDriver(e.target.value)}>
            <option value="">Driver (analytics)…</option>
            {DRIVERS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <button onClick={addQuestion} disabled={create.isPending}
            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Question list — checkbox = included in the selected version */}
      {grouped.map((g) => (
        <div key={g.key} className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">{g.title}</div>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {g.items.map((q) => (
              <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0" title="Include in this version">
                  <input type="checkbox" className="sr-only peer" checked={membership.has(q.id)} onChange={() => toggle(q.id)} />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </label>
                <div className="flex-1 min-w-0">
                  <input className="w-full text-sm text-gray-900 bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1"
                    defaultValue={q.text}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== q.text) update.mutate({ id: q.id, text: v }); }} />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-gray-400">{q.driver ?? 'no driver'}</span>
                    {q.isCore
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">core</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">custom</span>}
                    {q.type === 'text' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">free text</span>}
                  </div>
                </div>
                {!q.isCore && (
                  <button onClick={() => { if (confirm('Delete this question from the bank (all versions)?')) remove.mutate({ id: q.id }); }}
                    className="text-gray-300 hover:text-red-500 shrink-0" title="Delete from bank">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
