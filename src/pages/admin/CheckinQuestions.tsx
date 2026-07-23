// ============================================================
// CHECK-IN QUESTIONS (admin) — manage the check-in question bank + cadence.
// Choose which questions are Included in the live check-in, their type
// (1-5 scale / eNPS 0-10 / written), category, and order. Set how often the
// check-in runs. Mutations are admin-only (enforced server-side).
// ============================================================

import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Plus, Trash2, GripVertical, ListChecks } from 'lucide-react';
import ImportButton from '../../components/ImportButton';

const inputCls = 'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600';

const TYPES = [
  { value: 'scale5', label: '1–5 scale' },
  { value: 'enps', label: 'eNPS (0–10)' },
  { value: 'text', label: 'Written' },
];
const CATEGORIES = ['morale', 'priorities', 'manager_support', 'values', 'growth', 'general'];
const CADENCES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

export default function CheckinQuestions() {
  const utils = trpc.useContext();
  const { data: questions } = trpc.checkinQuestions.list.useQuery({ includeInactive: true });
  const imp = trpc.checkinQuestions.import.useMutation({ onSuccess: () => utils.checkinQuestions.list.invalidate() });
  const { data: settings } = trpc.checkinSettings.get.useQuery();

  const invalidate = () => utils.checkinQuestions.list.invalidate();
  const create = trpc.checkinQuestions.create.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const update = trpc.checkinQuestions.update.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const remove = trpc.checkinQuestions.remove.useMutation({ onSuccess: invalidate, onError: (e) => alert(e.message) });
  const setCadence = trpc.checkinSettings.update.useMutation({
    onSuccess: () => utils.checkinSettings.get.invalidate(), onError: (e) => alert(e.message),
  });

  const [text, setText] = useState('');
  const [type, setType] = useState('scale5');
  const [category, setCategory] = useState('general');

  const rows = (questions ?? []).slice().sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const includedCount = rows.filter((q: any) => q.included && q.isActive).length;

  const addQuestion = () => {
    if (!text.trim()) return;
    const maxSort = rows.reduce((m: number, q: any) => Math.max(m, q.sortOrder), 0);
    create.mutate({ text, type: type as any, category, included: true, sortOrder: maxSort + 10 });
    setText('');
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks className="text-blue-600" size={22} />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Check-in Questions</h1>
          <div className="my-2"><ImportButton label="Import questions" hint="CSV: text, category, driver"
            onImport={async (rows) => imp.mutateAsync({ rows: rows.map((r) => ({ text: r.text ?? r.question ?? '', category: r.category, driver: r.driver })) })} /></div>
          <p className="text-sm text-gray-500">Pick which questions the check-in asks, their type, and how often it runs.</p>
        </div>
      </div>

      {/* Cadence */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-800">How often:</span>
        <select className={inputCls} value={settings?.cadence ?? 'weekly'}
          onChange={(e) => setCadence.mutate({ cadence: e.target.value as any })}>
          {CADENCES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{includedCount} question{includedCount === 1 ? '' : 's'} in the check-in</span>
      </div>

      {/* Add new */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">New question</label>
            <input className={`${inputCls} w-full`} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="e.g. What do you intend to accomplish before your next check-in?" />
          </div>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <button onClick={addQuestion} disabled={!text.trim() || create.isLoading}
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {rows.map((q: any) => (
          <div key={q.id} className={`bg-white border rounded-lg p-3 flex items-center gap-3 ${q.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
            <GripVertical size={16} className="text-gray-300 shrink-0" />
            <label className="flex items-center gap-2 shrink-0" title="Include in the check-in">
              <input type="checkbox" checked={!!q.included}
                onChange={(e) => update.mutate({ id: q.id, included: e.target.checked })} />
              <span className="text-xs text-gray-500">Included</span>
            </label>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-gray-900">{q.text}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  {TYPES.find((t) => t.value === q.type)?.label ?? q.type}
                </span>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                  {String(q.category).replace('_', ' ')}
                </span>
                {!q.isActive && <span className="text-[10px] text-gray-400">retired</span>}
              </div>
            </div>
            <button onClick={() => update.mutate({ id: q.id, isActive: !q.isActive })}
              className="text-xs text-gray-500 hover:text-gray-800 shrink-0">
              {q.isActive ? 'Retire' : 'Restore'}
            </button>
            <button onClick={() => { if (confirm('Delete this question permanently?')) remove.mutate({ id: q.id }); }}
              className="text-gray-400 hover:text-red-600 shrink-0" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">No questions yet — add one above.</div>
        )}
      </div>
    </div>
  );
}
