import { useState, useEffect, useCallback } from 'react';
import { tasksApi, subtasksApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface SubtaskNode {
  id: number;
  content: string;
  status: string;
  created_at: string;
  done_at?: string | null;
  parent_subtask_id: number | null;
  sort_order?: number;
  children: SubtaskNode[];
}

function buildSubtree(flat: any[], parentId: number | null): SubtaskNode[] {
  return flat
    .filter(s => (s.parent_subtask_id ?? null) === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s: any): SubtaskNode => ({
      id: s.id,
      content: s.content,
      status: s.status,
      created_at: s.created_at,
      done_at: s.done_at ?? null,
      parent_subtask_id: s.parent_subtask_id ?? null,
      sort_order: s.sort_order,
      children: buildSubtree(flat, s.id),
    }));
}

export default function Tasks() {
  const [date, setDate] = useState(todayStr());
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskEditText, setTaskEditText] = useState('');

  const [editingSub, setEditingSub] = useState<{ taskId: number; subId: number } | null>(null);
  const [subEditText, setSubEditText] = useState('');

  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [subtaskMap, setSubtaskMap] = useState<Record<number, any[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inProgressTasks, completedTasks] = await Promise.all([
        tasksApi.list({ status: 'in_progress' }),
        tasksApi.list({ date }),
      ]);
      setInProgress(inProgressTasks);
      setCompleted(completedTasks);

      const subtaskEntries = await Promise.all(
        [...inProgressTasks, ...completedTasks].map((t: any) => subtasksApi.list(t.id))
      );
      const map: Record<number, any[]> = {};
      [...inProgressTasks, ...completedTasks].forEach((t: any, i: number) => {
        map[t.id] = subtaskEntries[i];
      });
      setSubtaskMap(map);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

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
      showToast('添加成功');
      load();
    } catch {
      showToast('添加失败', 'error');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await tasksApi.update(id, { status: 'completed' });
      showToast('已完成');
      load();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleReopen = async (id: number) => {
    try {
      await tasksApi.update(id, { status: 'in_progress' });
      showToast('已重新打开');
      load();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tasksApi.delete(id);
      showToast('删除成功');
      load();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const startEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskEditText(task.content);
  };
  const cancelEditTask = () => setEditingTaskId(null);
  const saveEditTask = async () => {
    if (editingTaskId == null) return;
    const val = taskEditText.trim();
    if (!val) { setEditingTaskId(null); return; }
    try {
      await tasksApi.update(editingTaskId, { content: val });
      setEditingTaskId(null);
      showToast('保存成功');
      load();
    } catch {
      showToast('保存失败', 'error');
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
      showToast('添加失败', 'error');
    }
  };

  const handleToggleSubtask = async (taskId: number, subId: number, currentStatus: string) => {
    try {
      await subtasksApi.update(taskId, subId, { status: currentStatus === 'pending' ? 'done' : 'pending' });
      await refreshSubtasks(taskId);
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteSubtask = async (taskId: number, subId: number) => {
    try {
      await subtasksApi.delete(taskId, subId);
      await refreshSubtasks(taskId);
    } catch {
      showToast('删除失败', 'error');
    }
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
      showToast('保存成功');
    } catch {
      showToast('保存失败', 'error');
    }
  };

  const renderAddChildInput = (taskId: number, parentKey: string, parentSubtaskId: number | null) => (
    <div className="flex gap-2">
      <input
        type="text"
        value={subInputs[parentKey] || ''}
        onChange={e => setSubInputs(prev => ({ ...prev, [parentKey]: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(taskId, parentKey, parentSubtaskId); }}
        placeholder="添加子项..."
        className="flex-1 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
      />
      <button
        onClick={() => handleAddSubtask(taskId, parentKey, parentSubtaskId)}
        className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700"
      >
        添加
      </button>
    </div>
  );

  const renderSubtaskNode = (taskId: number, node: SubtaskNode) => {
    const isEditingSub = editingSub?.subId === node.id;
    return (
      <div key={node.id} className="space-y-1">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={node.status === 'done'}
              onChange={() => handleToggleSubtask(taskId, node.id, node.status)}
              className="rounded"
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
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
              />
            ) : (
              <span
                onClick={() => startEditSub(taskId, node.id, node.content)}
                className={`text-sm cursor-pointer hover:underline ${node.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : ''}`}
              >
                {node.content}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {node.status === 'done' && node.done_at
                ? `完成于 ${formatTime(node.done_at)}`
                : `创建于 ${formatTime(node.created_at)}`}
            </span>
          </div>
          <button
            onClick={() => handleDeleteSubtask(taskId, node.id)}
            className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
          >
            删除
          </button>
        </div>
        <div className="ml-4 space-y-1">
          {node.children.map(child => renderSubtaskNode(taskId, child))}
          {renderAddChildInput(taskId, `sub:${node.id}`, node.id)}
        </div>
      </div>
    );
  };

  const renderInProgressTask = (task: any) => {
    const flat = subtaskMap[task.id] || [];
    const tree = buildSubtree(flat, null);
    const doneCount = flat.filter((s: any) => s.status === 'done').length;

    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingTaskId === task.id ? (
              <input
                type="text"
                value={taskEditText}
                onChange={e => setTaskEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEditTask();
                  if (e.key === 'Escape') cancelEditTask();
                }}
                onBlur={cancelEditTask}
                autoFocus
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
              />
            ) : (
              <p
                onClick={() => startEditTask(task)}
                className="text-sm cursor-pointer hover:underline"
              >
                {task.content}
              </p>
            )}
            <div className="flex gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {task.tags && <span className="text-blue-500 dark:text-blue-400">{task.tags}</span>}
              <span>{formatTime(task.created_at)}</span>
              {flat.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400">{doneCount}/{flat.length} 子项</span>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => handleComplete(task.id)}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-800"
            >
              完成
            </button>
            <ConfirmButton onConfirm={() => handleDelete(task.id)} />
          </div>
        </div>

        <div className="ml-4 mt-2 space-y-1">
          {tree.map(node => renderSubtaskNode(task.id, node))}
          {renderAddChildInput(task.id, `task:${task.id}`, null)}
        </div>
      </div>
    );
  };

  const renderCompletedSubtaskNode = (node: SubtaskNode) => (
    <div key={node.id} className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-300">└</span>
        <span className={`text-sm ${node.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
          {node.content}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {node.status === 'done' && node.done_at ? `完成于 ${formatTime(node.done_at)}` : `未完成`}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="ml-4 space-y-1">
          {node.children.map(child => renderCompletedSubtaskNode(child))}
        </div>
      )}
    </div>
  );

  const renderCompletedTask = (task: any) => {
    const flat = subtaskMap[task.id] || [];
    const tree = buildSubtree(flat, null);
    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingTaskId === task.id ? (
              <input
                type="text"
                value={taskEditText}
                onChange={e => setTaskEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEditTask();
                  if (e.key === 'Escape') cancelEditTask();
                }}
                onBlur={cancelEditTask}
                autoFocus
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
              />
            ) : (
              <p
                onClick={() => startEditTask(task)}
                className="text-sm cursor-pointer hover:underline"
              >
                {task.content}
              </p>
            )}
            <div className="flex gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {task.tags && <span className="text-blue-500 dark:text-blue-400">{task.tags}</span>}
              <span>{new Date(task.created_at).toLocaleDateString()}</span>
              {flat.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400">{flat.filter((s: any) => s.status === 'done').length}/{flat.length} 子项</span>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => handleReopen(task.id)} className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-800">重新打开</button>
            <ConfirmButton onConfirm={() => handleDelete(task.id)} />
          </div>
        </div>
        {tree.length > 0 && (
          <div className="ml-4 mt-2 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
            {tree.map(node => renderCompletedSubtaskNode(node))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Doing</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="开始做什么？"
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
          />
          <div>
            <span className="block text-xs text-gray-400 dark:text-gray-500 mb-1">可选标签</span>
            <TagInput value={tags} onChange={setTags} />
          </div>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 self-start"
          >
            添加到正在做
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">正在做 ({inProgress.length})</h2>
          {inProgress.length === 0 ? (
            <EmptyState message="没有正在做的任务" />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700 mb-6">
              {inProgress.map(task => (
                <div key={task.id} className="p-4">{renderInProgressTask(task)}</div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">已经完成</h2>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
            />
          </div>
          {completed.length === 0 ? (
            <EmptyState message="当天没有已完成的任务" onRetry={load} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700">
              {completed.map(task => (
                <div key={task.id} className="p-4">{renderCompletedTask(task)}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
