import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Plus, Archive, Pencil } from 'lucide-react';
import PlanItemForm, { PlanItem, PlanItemType } from '../components/planning/PlanItemForm';

const TYPE_BADGE: Record<PlanItemType, string> = {
  theme: 'Theme',
  objective: 'Objective',
  key_result: 'Key Result',
  task: 'Task',
};

// What type a child of a given parent should default to.
const CHILD_TYPE: Partial<Record<PlanItemType, PlanItemType>> = {
  theme: 'objective',
  objective: 'key_result',
  key_result: 'task',
};

function Stoplight({ value }: { value: 'green' | 'yellow' | 'red' | null }) {
  const color =
    value === 'green'
      ? 'bg-green-500'
      : value === 'yellow'
      ? 'bg-yellow-500'
      : value === 'red'
      ? 'bg-red-500'
      : 'bg-gray-300';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

interface FormState {
  mode: 'create' | 'edit';
  initial?: PlanItem;
  defaultType?: PlanItemType;
  parentId?: string;
}

interface NodeRowProps {
  node: PlanItem;
  depth: number;
  onEdit: (node: PlanItem) => void;
  onAddChild: (node: PlanItem) => void;
  onArchive: (id: string) => void;
}

function NodeRow({ node, depth, onEdit, onAddChild, onArchive }: NodeRowProps) {
  const childType = CHILD_TYPE[node.type];

  return (
    <div>
      <div
        className="group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50"
        style={{ paddingLeft: 16 + depth * 24 }}
      >
        <Stoplight value={node.stoplightCurrent} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">{node.title}</span>
            <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-700">
              {TYPE_BADGE[node.type]}
            </span>
            {node.category === 'standard' && (
              <span className="inline-flex px-1.5 py-0.5 text-[11px] rounded-full bg-gray-200 text-gray-600 font-medium">
                SO
              </span>
            )}
            {node.ownerName && (
              <span className="text-xs text-gray-500">· {node.ownerName}</span>
            )}
          </div>
          {node.type === 'key_result' && (node.measure || node.target) && (
            <div className="text-xs text-gray-400 mt-0.5">
              {node.measure && <span>{node.measure}</span>}
              {node.measure && node.target && <span> → </span>}
              {node.target && <span>Target: {node.target}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {childType && (
            <button
              onClick={() => onAddChild(node)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={`Add ${TYPE_BADGE[childType]}`}
            >
              <Plus size={14} />
              {TYPE_BADGE[childType]}
            </button>
          )}
          <button
            onClick={() => onEdit(node)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onArchive(node.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Archive"
          >
            <Archive size={15} />
          </button>
        </div>
      </div>

      {node.children?.map((child) => (
        <NodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}

export default function Plan() {
  const { data: tree, refetch, isLoading } = trpc.planning.tree.useQuery();
  const archiveMutation = trpc.planning.archiveItem.useMutation({ onSuccess: () => refetch() });

  const [form, setForm] = useState<FormState | null>(null);

  const handleSaved = () => {
    refetch();
    setForm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan</h1>
          <p className="text-gray-500 text-sm mt-1">Themes, objectives, key results, and tasks</p>
        </div>
        <button
          onClick={() => setForm({ mode: 'create', defaultType: 'objective' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Objective
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : !tree || tree.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No plan items yet. Create an objective to get started.
          </div>
        ) : (
          (tree as PlanItem[]).map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              depth={0}
              onEdit={(n) => setForm({ mode: 'edit', initial: n })}
              onAddChild={(n) =>
                setForm({
                  mode: 'create',
                  parentId: n.id,
                  defaultType: CHILD_TYPE[n.type] ?? 'task',
                })
              }
              onArchive={(id) => archiveMutation.mutate({ id })}
            />
          ))
        )}
      </div>

      {form && (
        <PlanItemForm
          mode={form.mode}
          initial={form.initial}
          defaultType={form.defaultType}
          parentId={form.parentId}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
