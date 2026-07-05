import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { tasksApi, subtasksApi, tagsApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';
import DatePicker from '../components/DatePicker';
import { todayStr } from '../utils/date';
import type { Task, Subtask, Tag } from '../types';

function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface SubtaskNode {
  id: number;
  content: string;
  notes: string;
  status: string;
  created_at: string;
  done_at?: string | null;
  parent_subtask_id: number | null;
  sort_order?: number;
  children: SubtaskNode[];
}

function buildSubtree(flat: Subtask[], parentId: number | null): SubtaskNode[] {
  return flat
    .filter(s => (s.parent_subtask_id ?? null) === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s): SubtaskNode => ({
      id: s.id,
      content: s.content,
      notes: s.notes || '',
      status: s.status,
      created_at: s.created_at,
      done_at: s.done_at ?? null,
      parent_subtask_id: s.parent_subtask_id ?? null,
      sort_order: s.sort_order,
      children: buildSubtree(flat, s.id),
    }));
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

interface SubtaskListProps {
  taskId: number;
  nodes: SubtaskNode[];
  onMove: (nodeId: number, direction: 'up' | 'down') => void;
  renderNode: (taskId: number, node: SubtaskNode) => React.ReactNode;
  renderAddChild: (taskId: number, parentKey: string, parentSubtaskId: number | null) => React.ReactNode;
  parentSubtaskId: number | null;
}

function SortableSubtaskList({ taskId, nodes, onMove, renderNode, renderAddChild, parentSubtaskId }: SubtaskListProps) {
  return (
    <div>
      {nodes.map((node, i) => (
        <div key={node.id}>
          <div className="flex items-start gap-0.5">
            <div className="flex flex-col shrink-0 justify-center pt-0.5">
              <button
                onClick={() => onMove(node.id, 'up')}
                disabled={i === 0}
                className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
                aria-label="move up"
              >
                ▲
              </button>
              <button
                onClick={() => onMove(node.id, 'down')}
                disabled={i === nodes.length - 1}
                className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
                aria-label="move down"
              >
                ▼
              </button>
            </div>
            <div className="flex-1 min-w-0">{renderNode(taskId, node)}</div>
          </div>
        </div>
      ))}
      <div className="pl-1 py-0.5">
        {renderAddChild(taskId, `sub:${parentSubtaskId ?? 'root'}`, parentSubtaskId)}
      </div>
    </div>
  );
}

function AddChildInput({ taskId, parentKey, parentSubtaskId, value, onChange, onSubmit }: {
  taskId: number;
  parentKey: string;
  parentSubtaskId: number | null;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (taskId: number, parentKey: string, parentSubtaskId: number | null) => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-base py-0.5"
      >
        {t('tasks.addSubtask')}
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center fade-in">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSubmit(taskId, parentKey, parentSubtaskId); setActive(false); }
          if (e.key === 'Escape') { setActive(false); onChange(''); }
        }}
        onBlur={() => { if (!value.trim()) setActive(false); }}
        placeholder={t('tasks.subtaskPlaceholder')}
        autoFocus
        className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700/50"
      />
      <button
        onClick={() => { onSubmit(taskId, parentKey, parentSubtaskId); setActive(false); }}
        className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-base"
      >
        {t('common.add')}
      </button>
      <button
        onClick={() => { setActive(false); onChange(''); }}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
      >
        ✕
      </button>
    </div>
  );
}

export default function Tasks() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [date, setDate] = useState(todayStr());
  const [inProgress, setInProgress] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskEditText, setTaskEditText] = useState('');

  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [inlineNotes, setInlineNotes] = useState('');

  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const [inlineTags, setInlineTags] = useState('');

  const [editingSubNotesId, setEditingSubNotesId] = useState<number | null>(null);
  const [inlineSubNotes, setInlineSubNotes] = useState('');

  const [tagList, setTagList] = useState<Tag[]>([]);
  const tagColorMap = new Map(tagList.map(t => [t.name, t.color || '#3b82f6']));

  const [editingSub, setEditingSub] = useState<{ taskId: number; subId: number } | null>(null);
  const [subEditText, setSubEditText] = useState('');

  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [subtaskMap, setSubtaskMap] = useState<Record<number, Subtask[]>>({});
  const subtaskMapRef = useRef(subtaskMap);
  subtaskMapRef.current = subtaskMap;
  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const [inProgressTasks, completedTasks] = await Promise.all([
        tasksApi.list({ status: 'in_progress' }),
        tasksApi.list({ date }),
      ]);
      if (reqId !== reqIdRef.current) return;
      setInProgress(inProgressTasks);
      setCompleted(completedTasks);

      const subtaskEntries = await Promise.all(
        [...inProgressTasks, ...completedTasks].map((task) => subtasksApi.list(task.id))
      );
      if (reqId !== reqIdRef.current) return;
      const map: Record<number, Subtask[]> = {};
      [...inProgressTasks, ...completedTasks].forEach((task, i) => {
        map[task.id] = subtaskEntries[i];
      });
      setSubtaskMap(map);
    } catch {
      if (reqId !== reqIdRef.current) return;
      showToast(t('common.loadFail'), 'error');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    tagsApi.list().then(setTagList).catch(() => {});
  }, []);

  const refreshSubtasks = async (taskId: number) => {
    const subs = await subtasksApi.list(taskId);
    setSubtaskMap(prev => ({ ...prev, [taskId]: subs }));
  };

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await tasksApi.create({ content: content.trim(), tags });
      setContent('');
      setTags('');
      showToast(t('common.addSuccess'));
      load();
    } catch {
      showToast(t('common.addFail'), 'error');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await tasksApi.update(id, { status: 'completed' });
      showToast(t('common.complete'));
      load();
    } catch {
      showToast(t('common.operateFail'), 'error');
    }
  };

  const handleReopen = async (id: number) => {
    try {
      await tasksApi.update(id, { status: 'in_progress' });
      showToast(t('common.reopened'));
      load();
    } catch {
      showToast(t('common.operateFail'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tasksApi.delete(id);
      showToast(t('common.deleteSuccess'));
      load();
    } catch {
      showToast(t('common.deleteFail'), 'error');
    }
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskEditText(task.content);
  };

  const startEditNotes = (task: Task) => {
    setEditingNotesId(task.id);
    setInlineNotes(task.notes || '');
  };
  const cancelEditNotes = () => { setEditingNotesId(null); setInlineNotes(''); };
  const saveEditNotes = async () => {
    if (editingNotesId == null) return;
    try {
      await tasksApi.update(editingNotesId, { notes: inlineNotes });
      setEditingNotesId(null);
      setInlineNotes('');
      showToast(t('common.saveSuccess'));
      load();
    } catch {
      showToast(t('common.saveFail'), 'error');
    }
  };

  const startEditTags = (task: Task) => {
    setEditingTagsId(task.id);
    setInlineTags(task.tags || '');
  };
  const cancelEditTags = () => { setEditingTagsId(null); setInlineTags(''); };
  const saveEditTags = async () => {
    if (editingTagsId == null) return;
    try {
      await tasksApi.update(editingTagsId, { tags: inlineTags });
      setEditingTagsId(null);
      setInlineTags('');
      showToast(t('common.saveSuccess'));
      load();
    } catch {
      showToast(t('common.saveFail'), 'error');
    }
  };
  const cancelEditTask = () => setEditingTaskId(null);
  const saveEditTask = async () => {
    if (editingTaskId == null) return;
    const val = taskEditText.trim();
    if (!val) { setEditingTaskId(null); return; }
    try {
      await tasksApi.update(editingTaskId, { content: val });
      setEditingTaskId(null);
      showToast(t('common.saveSuccess'));
      load();
    } catch {
      showToast(t('common.saveFail'), 'error');
    }
  };

  const handleAddSubtask = async (taskId: number, parentKey: string, parentSubtaskId: number | null) => {
    const val = (subInputs[parentKey] || '').trim();
    if (!val) return;
    try {
      await subtasksApi.create(taskId, val, parentSubtaskId);
      setSubInputs(prev => ({ ...prev, [parentKey]: '' }));
      await refreshSubtasks(taskId);
    } catch {
      showToast(t('common.addFail'), 'error');
    }
  };

  const handleToggleSubtask = async (taskId: number, subId: number, currentStatus: string) => {
    try {
      await subtasksApi.update(taskId, subId, { status: currentStatus === 'pending' ? 'done' : 'pending' });
      await refreshSubtasks(taskId);
    } catch {
      showToast(t('common.operateFail'), 'error');
    }
  };

  const handleDeleteSubtask = async (taskId: number, subId: number) => {
    try {
      await subtasksApi.delete(taskId, subId);
      await refreshSubtasks(taskId);
    } catch {
      showToast(t('common.deleteFail'), 'error');
    }
  };

  const handleMoveSubtask = (taskId: number, nodeId: number, direction: 'up' | 'down') => {
    const flat = subtaskMapRef.current[taskId];
    if (!flat) return;
    const node = flat.find(s => s.id === nodeId);
    if (!node) return;
    const parent = node.parent_subtask_id ?? null;
    const siblings = flat
      .filter(s => (s.parent_subtask_id ?? null) === parent)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = siblings.findIndex(s => s.id === nodeId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    const reordered = arrayMove(siblings, index, targetIndex);
    const items = reordered.map((s, i) => ({ id: s.id, sort_order: i, parent_subtask_id: parent }));
    setSubtaskMap(prev => {
      const updated = [...(prev[taskId] || [])];
      for (const item of items) {
        const idx = updated.findIndex(s => s.id === item.id);
        if (idx !== -1) updated[idx] = { ...updated[idx], sort_order: item.sort_order };
      }
      return { ...prev, [taskId]: updated };
    });
    subtasksApi.reorder(taskId, items).catch(() => {
      showToast(t('common.operateFail'), 'error');
      refreshSubtasks(taskId);
    });
  };

  const handleMoveTask = (taskId: number, direction: 'up' | 'down') => {
    const list = [...inProgress].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = list.findIndex(t => t.id === taskId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const reordered = arrayMove(list, index, targetIndex);
    const items = reordered.map((t, i) => ({ id: t.id, sort_order: i }));
    setInProgress(reordered);
    tasksApi.reorder(items).catch(() => {
      showToast(t('common.operateFail'), 'error');
      load();
    });
  };

  const startEditSub = (taskId: number, subId: number, c: string) => {
    setEditingSub({ taskId, subId });
    setSubEditText(c);
  };
  const cancelEditSub = () => setEditingSub(null);
  const saveEditSub = async () => {
    if (!editingSub) return;
    const { taskId, subId } = editingSub;
    const val = subEditText.trim();
    if (!val) { setEditingSub(null); return; }
    try {
      await subtasksApi.update(taskId, subId, { content: val });
      setEditingSub(null);
      await refreshSubtasks(taskId);
      showToast(t('common.saveSuccess'));
    } catch {
      showToast(t('common.saveFail'), 'error');
    }
  };

  const startEditSubNotes = (subId: number, notes: string) => {
    setEditingSubNotesId(subId);
    setInlineSubNotes(notes || '');
  };
  const cancelEditSubNotes = () => { setEditingSubNotesId(null); setInlineSubNotes(''); };
  const saveEditSubNotes = async (taskId: number) => {
    if (editingSubNotesId == null) return;
    try {
      await subtasksApi.update(taskId, editingSubNotesId, { notes: inlineSubNotes });
      setEditingSubNotesId(null);
      setInlineSubNotes('');
      await refreshSubtasks(taskId);
      showToast(t('common.saveSuccess'));
    } catch {
      showToast(t('common.saveFail'), 'error');
    }
  };

  const renderAddChildInput = (taskId: number, parentKey: string, parentSubtaskId: number | null) => (
    <AddChildInput taskId={taskId} parentKey={parentKey} parentSubtaskId={parentSubtaskId} value={subInputs[parentKey] || ''} onChange={(v) => setSubInputs(prev => ({ ...prev, [parentKey]: v }))} onSubmit={handleAddSubtask} />
  );

  const renderSubtaskNode = (taskId: number, node: SubtaskNode) => {
    const isEditingSub = editingSub?.subId === node.id;
    const isEditingSubNotes = editingSubNotesId === node.id;
    const hasChildren = node.children.length > 0;
    const hasNotes = !!(node.notes && node.notes.trim());
    return (
      <div className="relative">
        <div className="flex items-center justify-between group py-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={node.status === 'done'}
              onChange={() => handleToggleSubtask(taskId, node.id, node.status)}
              className="rounded cursor-pointer shrink-0"
            />
            {isEditingSub ? (
              <input
                type="text"
                value={subEditText}
                onChange={e => setSubEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEditSub();
                  if (e.key === 'Escape') cancelEditSub();
                }}
                onBlur={cancelEditSub}
                autoFocus
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <span
                onClick={() => startEditSub(taskId, node.id, node.content)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditSub(taskId, node.id, node.content); } }}
                tabIndex={0}
                role="button"
                className={`text-sm cursor-pointer hover:underline truncate ${node.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {node.content}
              </span>
            )}
            {!hasNotes && !isEditingSubNotes && (
              <span
                onClick={() => startEditSubNotes(node.id, node.notes)}
                className="text-xs text-gray-400 dark:text-gray-500 italic cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-base shrink-0"
              >
                + {t('tasks.notes')}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {node.status === 'done' && node.done_at
                ? `✓ ${formatTime(node.done_at, locale)}`
                : formatTime(node.created_at, locale)}
            </span>
          </div>
          <button
            onClick={() => handleDeleteSubtask(taskId, node.id)}
            className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-base shrink-0 ml-2"
          >
            {t('common.delete')}
          </button>
        </div>
        {(hasNotes || isEditingSubNotes) && (
          <div className="mt-1 ml-6 bg-gray-100 dark:bg-gray-700/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="text-xs shrink-0">📝</span>
            {isEditingSubNotes ? (
              <input
                type="text"
                value={inlineSubNotes}
                onChange={e => setInlineSubNotes(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEditSubNotes(taskId);
                  if (e.key === 'Escape') cancelEditSubNotes();
                }}
                onBlur={() => saveEditSubNotes(taskId)}
                autoFocus
                placeholder={t('tasks.notesPlaceholder')}
                className="flex-1 text-xs italic bg-transparent outline-none text-gray-600 dark:text-gray-300"
              />
            ) : (
              <span
                onClick={() => startEditSubNotes(node.id, node.notes)}
                className="flex-1 text-xs text-gray-600 dark:text-gray-300 italic cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-base"
              >
                {node.notes.trim()}
              </span>
            )}
          </div>
        )}
        {hasChildren && (
          <div className="ml-5 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-0.5">
            <SortableSubtaskList
              taskId={taskId}
              nodes={node.children}
              parentSubtaskId={node.id}
              onMove={(nodeId, dir) => handleMoveSubtask(taskId, nodeId, dir)}
              renderNode={renderSubtaskNode}
              renderAddChild={renderAddChildInput}
            />
          </div>
        )}
        {!hasChildren && (
          <div className="ml-8 pl-1 py-0.5">
            {renderAddChildInput(taskId, `sub:${node.id}`, node.id)}
          </div>
        )}
      </div>
    );
  };

  const renderTagsInline = (task: Task) => {
    if (editingTagsId === task.id) return null;
    const tags = (task.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    if (tags.length === 0) {
      return (
        <span
          onClick={() => startEditTags(task)}
          className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500 transition-base"
        >
          {t('common.noTags')}
        </span>
      );
    }
    return (
      <div
        onClick={() => startEditTags(task)}
        className="flex flex-wrap gap-1 cursor-pointer"
      >
        {tags.map(tag => (
          <span
            key={tag}
            className="text-xs px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: tagColorMap.get(tag) || '#3b82f6' }}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  const renderTagsEditor = (task: Task) => {
    if (editingTagsId !== task.id) return null;
    return (
      <div
        className="space-y-2"
        onKeyDown={e => {
          if (e.key === 'Enter' && !(e.target as HTMLInputElement).value?.trim()) {
            saveEditTags();
          }
          if (e.key === 'Escape') cancelEditTags();
        }}
      >
        <TagInput value={inlineTags} onChange={setInlineTags} />
        <div className="flex gap-2 justify-end">
          <button onClick={saveEditTags} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-base">{t('common.save')}</button>
          <button onClick={cancelEditTags} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1">{t('common.cancel')}</button>
        </div>
      </div>
    );
  };

  const renderNotes = (task: Task) => {
    const notes = task.notes || '';
    if (editingNotesId === task.id) {
      return (
        <div className="mt-2 bg-gray-100 dark:bg-gray-700/40 rounded-lg px-2.5 py-1.5 flex gap-1.5">
          <span className="shrink-0 text-xs">📝</span>
          <textarea
            value={inlineNotes}
            onChange={e => setInlineNotes(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditNotes(); }
              if (e.key === 'Escape') cancelEditNotes();
            }}
            onBlur={cancelEditNotes}
            autoFocus
            rows={2}
            placeholder={t('tasks.notesPlaceholder')}
            className="flex-1 text-xs italic bg-transparent outline-none resize-y text-gray-600 dark:text-gray-300"
          />
        </div>
      );
    }
    if (!notes.trim()) return null;
    return (
      <div
        onClick={() => startEditNotes(task)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditNotes(task); } }}
        className="mt-2 bg-gray-100 dark:bg-gray-700/40 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap flex gap-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-base"
      >
        <span className="shrink-0">📝</span>
        <span className="italic">{notes.trim()}</span>
      </div>
    );
  };

  const renderInProgressTask = (task: Task, taskIndex: number) => {
    const flat = subtaskMap[task.id] || [];
    const tree = buildSubtree(flat, null);
    const doneCount = flat.filter((s) => s.status === 'done').length;

    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="flex flex-col shrink-0 justify-center pt-0.5">
              <button
                onClick={() => handleMoveTask(task.id, 'up')}
                disabled={taskIndex === 0}
                className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
                aria-label="move up"
              >
                ▲
              </button>
              <button
                onClick={() => handleMoveTask(task.id, 'down')}
                disabled={taskIndex === inProgress.length - 1}
                className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
                aria-label="move down"
              >
                ▼
              </button>
            </div>
            <input
              type="checkbox"
              checked={false}
              onChange={() => handleComplete(task.id)}
              aria-label={t('common.complete')}
              className="rounded cursor-pointer shrink-0 mt-1"
            />
            <div className="flex-1 min-w-0">
            {editingTaskId === task.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={taskEditText}
                  onChange={e => setTaskEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEditTask();
                    if (e.key === 'Escape') cancelEditTask();
                  }}
                  autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={saveEditTask} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-base">{t('common.save')}</button>
                  <button onClick={cancelEditTask} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => startEditTask(task)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditTask(task); } }}
                tabIndex={0}
                role="button"
                className="text-sm cursor-pointer hover:underline"
              >
                {task.content}
              </p>
            )}
            <div className="flex gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500 flex-wrap items-center">
              {renderTagsInline(task)}
              {(editingNotesId !== task.id && !(task.notes || '').trim()) && (
                <span
                  onClick={() => startEditNotes(task)}
                  className="cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-base"
                >
                  + {t('tasks.notes')}
                </span>
              )}
              <span>{formatTime(task.created_at, locale)}</span>
              {task.due_date && (
                <span className={task.due_date < todayStr() ? 'text-red-500 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>
                  {t('tasks.dueDate')}: {task.due_date}{task.due_date < todayStr() ? ` (${t('tasks.overdue')})` : ''}
                </span>
              )}
              {flat.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400">{doneCount}/{flat.length} {t('tasks.subtaskCount')}</span>
              )}
            </div>
            {renderTagsEditor(task)}
            {renderNotes(task)}
            </div>
          </div>
          <ConfirmButton onConfirm={() => handleDelete(task.id)} />
        </div>

        {tree.length > 0 && (
          <div className="mt-3 ml-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-0.5">
            <SortableSubtaskList
              taskId={task.id}
              nodes={tree}
              parentSubtaskId={null}
              onMove={(nodeId, dir) => handleMoveSubtask(task.id, nodeId, dir)}
              renderNode={renderSubtaskNode}
              renderAddChild={renderAddChildInput}
            />
          </div>
        )}
        {tree.length === 0 && (
          <div className="mt-2 pl-1">
            {renderAddChildInput(task.id, `task:${task.id}`, null)}
          </div>
        )}
      </div>
    );
  };

  const renderCompletedSubtaskNode = (node: SubtaskNode) => (
    <div key={node.id} className="relative">
      <div className="flex items-center gap-2 py-0.5">
        <span className={`text-sm ${node.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
          {node.content}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {node.status === 'done' && node.done_at ? `✓ ${formatTime(node.done_at, locale)}` : t('tasks.notCompleted')}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5">
          {node.children.map(child => renderCompletedSubtaskNode(child))}
        </div>
      )}
    </div>
  );

  const renderCompletedTask = (task: Task) => {
    const flat = subtaskMap[task.id] || [];
    const tree = buildSubtree(flat, null);
    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <input
              type="checkbox"
              checked
              onChange={() => handleReopen(task.id)}
              aria-label={t('common.reopen')}
              className="rounded cursor-pointer shrink-0 mt-1"
            />
            <div className="flex-1 min-w-0">
            {editingTaskId === task.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={taskEditText}
                  onChange={e => setTaskEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEditTask();
                    if (e.key === 'Escape') cancelEditTask();
                  }}
                  autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={saveEditTask} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-base">{t('common.save')}</button>
                  <button onClick={cancelEditTask} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => startEditTask(task)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditTask(task); } }}
                tabIndex={0}
                role="button"
                className="text-sm cursor-pointer hover:underline"
              >
                {task.content}
              </p>
            )}
            <div className="flex gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500 flex-wrap items-center">
              {renderTagsInline(task)}
              {(editingNotesId !== task.id && !(task.notes || '').trim()) && (
                <span
                  onClick={() => startEditNotes(task)}
                  className="cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-base"
                >
                  + {t('tasks.notes')}
                </span>
              )}
              <span>{task.completed_at ? new Date(task.completed_at).toLocaleDateString() : new Date(task.created_at).toLocaleDateString()}</span>
              {task.due_date && <span>{t('tasks.dueDate')}: {task.due_date}</span>}
              {flat.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400">{flat.filter((s) => s.status === 'done').length}/{flat.length} {t('tasks.subtaskCount')}</span>
              )}
            </div>
            {renderTagsEditor(task)}
            {renderNotes(task)}
            </div>
          </div>
          <ConfirmButton onConfirm={() => handleDelete(task.id)} />
        </div>
        {tree.length > 0 && (
          <div className="mt-3 ml-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-0.5">
            {tree.map(node => renderCompletedSubtaskNode(node))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 tracking-tight">{t('tasks.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6 transition-base fade-in">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder={t('tasks.startWhat')}
            aria-label={t('tasks.startWhat')}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div>
            <span className="block text-xs text-gray-400 dark:text-gray-500 mb-1">{t('common.optionalTags')}</span>
            <TagInput value={tags} onChange={setTags} />
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-base hover:bg-blue-700 self-start"
          >
            {t('tasks.addToDoing')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 mr-2"></div>{t('common.loading')}</div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 tracking-wide">{t('tasks.inProgress')} ({inProgress.length})</h2>
          {inProgress.length === 0 ? (
            <div className="fade-in"><EmptyState message={t('tasks.noInProgress')} /></div>
          ) : (
            <div className="space-y-3 mb-6 slide-up">
              {inProgress.map((task, i) => (
                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-blue-400 transition-base hover:shadow-md">{renderInProgressTask(task, i)}</div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 tracking-wide">{t('tasks.completed')}</h2>
            <DatePicker
              value={date}
              onChange={setDate}
            />
          </div>
          {completed.length === 0 ? (
            <div className="fade-in"><EmptyState message={t('tasks.noCompleted')} onRetry={load} /></div>
          ) : (
            <div className="space-y-3 slide-up">
              {completed.map(task => (
                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-green-400 transition-base hover:shadow-md">{renderCompletedTask(task)}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
