// ============================================================
// ENGAGEMENT QUESTIONS (admin) — manage the engagement-survey question bank.
// Toggle which questions appear on the live survey, edit wording, add custom
// questions, and delete custom ones (core 66 can be turned off but not deleted).
// Grouped by section. Mutations are admin-only (enforced server-side).
// ============================================================
import { useMemo, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { DRIVERS } from '../../lib/engagementSurvey';
import { Plus, Trash2, ListChecks } from 'lucide-react';

const inputCls = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

export default function EngagementQuestions() {
  const utils = trpc.useContext();
  const { data: questions } = trpc.engagementSurveyQuestions.list.useQuery();
  const invalidate = () => utils.engagementSurveyQuestions.list.invalidate();
  const setActive = trpc.engagementSurveyQuestions.setActive.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const update = trpc.engagementSurveyQuestions.update.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const create = trpc.engagementSurveyQuestions.create.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const remove = trpc.engagementSurveyQuestions.remove.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });

  const rows = useMemo(
    () => (questions ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [questions],
  );
  const activeCount = rows.filter((q) => q.isActive).length;

  // Section list (for the add form) derived from existing questions.
  const sections = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of rows) if (!m.has(q.section)) m.set(q.section, q.sectionTitle);
    return [...m.entries()].map(([key, title]) => ({ key, title }));
  }, [rows]);

  const grouped = useMemo(() => {
    const out: { key: string; title: string; items: typeof rows }[] = [];
    for (const q of rows) {
      let g = out.find((x) => x.key === q.section);
      if (!g) { g = { key: q.section, title: q.sectionTitle, items: [] }; out.push(g); }
      g.items.push(q);
    }
    return out;
  }, [rows]);

  const [text, setText] = useState('');
  const [section, setSection] = useState('');
  const [driver, setDriver] = useState('');

  const addQuestion = () => {
    if (!text.trim() || !section) { alert('Enter question text and pick a section.'); return; }
    const sec = sections.find((s) => s.key === section);
    create.mutate({
      text: text.trim(),
      section,
      sectionTitle: sec?.title ?? section,
      driver: driver || null,
      type: 'likert5',
      isActive: true,
    });
    setText(''); setDriver('');
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks className="text-blue-600" size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Engagement Questions</h1>
          <p className="text-sm text-gray-500">Choose which questions the engagement survey asks. Toggle any on or off individually; add your own. Core questions can be turned off but not deleted.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-600">
        <b>{activeCount}</b> of {rows.length} questions are on the survey.
      </div>

      {/* Add custom question */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        <div className="text-sm font-semibold text-gray-800 mb-2">Add a question</div>
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

      {/* Grouped question list */}
      {grouped.map((g) => (
        <div key={g.key} className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">{g.title}</div>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {g.items.map((q) => (
              <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={q.isActive}
                    onChange={(e) => setActive.mutate({ id: q.id, isActive: e.target.checked })} />
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
                  <button onClick={() => { if (confirm('Delete this question?')) remove.mutate({ id: q.id }); }}
                    className="text-gray-300 hover:text-red-500 shrink-0" title="Delete">
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
