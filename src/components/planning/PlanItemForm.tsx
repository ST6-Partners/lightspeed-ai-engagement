import { useState } from 'react';
import { trpc } from '../../lib/trpc';
import { X } from 'lucide-react';

// Local node shape — mirrors the planning.tree node. Don't import server types.
export type PlanItemType = 'theme' | 'objective' | 'key_result' | 'task';
export type PlanItemStatus = 'not_started' | 'in_progress' | 'on_hold' | 'complete';
export type Stoplight = 'green' | 'yellow' | 'red' | null;

export interface PlanItem {
  id: string;
  type: PlanItemType;
  category: 'strategic' | 'standard';
  parentId: string | null;
  sortOrder: number;
  title: string;
  description: string | null;
  ownerId: string | null;
  ownerName: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: PlanItemStatus;
  spirit: string | null;
  problem: string | null;
  measure: string | null;
  target: string | null;
  forecast: string | null;
  stoplightCurrent: Stoplight;
  stoplightForecast: Stoplight;
  archivedAt: string | null;
  children: PlanItem[];
}

interface PlanItemFormProps {
  mode: 'create' | 'edit';
  initial?: PlanItem;
  defaultType?: PlanItemType;
  parentId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_LABELS: Record<PlanItemType, string> = {
  theme: 'Theme',
  objective: 'Objective',
  key_result: 'Key Result',
  task: 'Task',
};

const STATUS_LABELS: Record<PlanItemStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  on_hold: 'On hold',
  complete: 'Complete',
};

export default function PlanItemForm({
  mode,
  initial,
  defaultType,
  parentId,
  onClose,
  onSaved,
}: PlanItemFormProps) {
  const [type, setType] = useState<PlanItemType>(initial?.type ?? defaultType ?? 'objective');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<PlanItemStatus>(initial?.status ?? 'not_started');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');

  // OKR-only fields
  const [spirit, setSpirit] = useState(initial?.spirit ?? '');
  const [problem, setProblem] = useState(initial?.problem ?? '');
  const [measure, setMeasure] = useState(initial?.measure ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [forecast, setForecast] = useState(initial?.forecast ?? '');
  const [stoplightCurrent, setStoplightCurrent] = useState<Stoplight>(initial?.stoplightCurrent ?? null);
  const [stoplightForecast, setStoplightForecast] = useState<Stoplight>(initial?.stoplightForecast ?? null);

  const showOkrFields = type === 'objective' || type === 'key_result';

  const createMutation = trpc.planning.createItem.useMutation({
    onSuccess: () => onSaved(),
  });
  const updateMutation = trpc.planning.updateItem.useMutation({
    onSuccess: () => onSaved(),
  });

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  const handleSubmit = () => {
    if (!title.trim()) return;

    const okrPayload = showOkrFields
      ? {
          spirit: spirit || undefined,
          problem: problem || undefined,
          measure: measure || undefined,
          target: target || undefined,
          forecast: forecast || undefined,
          stoplightCurrent: stoplightCurrent ?? undefined,
          stoplightForecast: stoplightForecast ?? undefined,
        }
      : {};

    if (mode === 'create') {
      createMutation.mutate({
        type,
        parentId: parentId,
        title: title.trim(),
        description: description || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        ...okrPayload,
      });
    } else if (initial) {
      updateMutation.mutate({
        id: initial.id,
        title: title.trim(),
        description: description || undefined,
        status,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        ...okrPayload,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-xl my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? `New ${TYPE_LABELS[type]}` : `Edit ${TYPE_LABELS[type]}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Title</label>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Description</label>
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlanItemType)}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {(Object.keys(TYPE_LABELS) as PlanItemType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanItemStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {(Object.keys(STATUS_LABELS) as PlanItemStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Start date</label>
              <input
                type="date"
                value={startDate ?? ''}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Due date</label>
              <input
                type="date"
                value={dueDate ?? ''}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {showOkrFields && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">OKR Details</p>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Spirit</label>
                <input
                  type="text"
                  placeholder="Spirit / intent"
                  value={spirit}
                  onChange={(e) => setSpirit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Problem</label>
                <textarea
                  placeholder="Problem this addresses"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Measure</label>
                  <input
                    type="text"
                    placeholder="How it's measured"
                    value={measure}
                    onChange={(e) => setMeasure(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Target</label>
                  <input
                    type="text"
                    placeholder="Target value"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Forecast</label>
                <input
                  type="text"
                  placeholder="Forecast value"
                  value={forecast}
                  onChange={(e) => setForecast(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Current stoplight</label>
                  <select
                    value={stoplightCurrent ?? ''}
                    onChange={(e) => setStoplightCurrent((e.target.value || null) as Stoplight)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">—</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Forecast stoplight</label>
                  <select
                    value={stoplightForecast ?? ''}
                    onChange={(e) => setStoplightForecast((e.target.value || null) as Stoplight)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">—</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
