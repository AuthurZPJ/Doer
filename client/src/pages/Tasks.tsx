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

export default function Tasks() {
  const [date, setDate] = useState(todayStr());
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [subtaskInputs, setSubtaskInputs] = useState<Record<number, string>>({});
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
        inProgressTasks.map((t: any) => subtasksApi.list(t.id))
      );
      const map: Record<number, any[]> = {};
      inProgressTasks.forEach((t: any, i: number) => {
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

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setEditContent(task.content);
    setEditTags(task.tags || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await tasksApi.update(editingId, { content: editContent, tags: editTags });
      setEditingId(null);
      showToast('保存成功');
      load();
    } catch {
      showToast('保存失败', 'error');
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

  const handleAddSubtask = async (taskId: number) => {
    const val = (subtaskInputs[taskId] || '').trim();
    if (!val) return;
    try {
      await subtasksApi.create(taskId, val);
      setSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
      const subs = await subtasksApi.list(taskId);
      setSubtaskMap(prev => ({ ...prev, [taskId]: subs }));
    } catch {
      showToast('添加失败', 'error');
    }
  };

  const handleToggleSubtask = async (taskId: number, subId: number, currentStatus: string) => {
    try {
      await subtasksApi.update(taskId, subId, { status: currentStatus === 'pending' ? 'done' : 'pending' });
      const subs = await subtasksApi.list(taskId);
      setSubtaskMap(prev => ({ ...prev, [taskId]: subs }));
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteSubtask = async (taskId: number, subId: number) => {
    try {
      await subtasksApi.delete(taskId, subId);
      const subs = await subtasksApi.list(taskId);
      setSubtaskMap(prev => ({ ...prev, [taskId]: subs }));
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const renderInProgressTask = (task: any) => {
    const subs = subtaskMap[task.id] || [];
    const doneCount = subs.filter((s: any) => s.status === 'done').length;
    const isExpanded = expandedTaskId === task.id;

    if (editingId === task.id) {
      return (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <TagInput value={editTags} onChange={setEditTags} />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="text-sm text-blue-600 hover:text-blue-800">保存</button>
            <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {subs.length > 0 && (
              <button
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            )}
            <div className="flex-1">
              <p className="text-sm">{task.content}</p>
              <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
                {task.tags && <span className="text-blue-500">{task.tags}</span>}
                <span>{formatTime(task.created_at)}</span>
                {subs.length > 0 && (
                  <span className="text-gray-500">{doneCount}/{subs.length} 子项</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => handleComplete(task.id)}
              className="text-sm text-green-600 hover:text-green-800"
            >
              完成
            </button>
            <button onClick={() => handleEdit(task)} className="text-sm text-gray-500 hover:text-gray-700">编辑</button>
            <ConfirmButton onConfirm={() => handleDelete(task.id)} />
          </div>
        </div>

        {isExpanded && subs.length > 0 && (
          <div className="mt-3 ml-6 space-y-1">
            {subs.map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sub.status === 'done'}
                    onChange={() => handleToggleSubtask(task.id, sub.id, sub.status)}
                    className="rounded"
                  />
                  <span className={`text-sm ${sub.status === 'done' ? 'text-gray-400 line-through' : ''}`}>
                    {sub.content}
                  </span>
                  <span className="text-xs text-gray-400">
                    {sub.status === 'done' && sub.done_at
                      ? `完成于 ${formatTime(sub.done_at)}`
                      : `创建于 ${formatTime(sub.created_at)}`}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSubtask(task.id, sub.id)}
                  className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 ml-6 flex gap-2">
          <input
            type="text"
            value={subtaskInputs[task.id] || ''}
            onChange={e => setSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(task.id); }}
            placeholder="添加子项..."
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => handleAddSubtask(task.id)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            添加
          </button>
        </div>
      </div>
    );
  };

  const renderCompletedTask = (task: any) => {
    if (editingId === task.id) {
      return (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <TagInput value={editTags} onChange={setEditTags} />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="text-sm text-blue-600 hover:text-blue-800">保存</button>
            <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm">{task.content}</p>
          <div className="flex gap-2 mt-1 text-xs text-gray-400">
            {task.tags && <span className="text-blue-500">{task.tags}</span>}
            <span>{new Date(task.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={() => handleEdit(task)} className="text-sm text-gray-500 hover:text-gray-700">编辑</button>
          <ConfirmButton onConfirm={() => handleDelete(task.id)} />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">今日完成</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="开始做什么？"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <TagInput value={tags} onChange={setTags} />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 self-start"
          >
            添加到正在做
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">正在做 ({inProgress.length})</h2>
          {inProgress.length === 0 ? (
            <EmptyState message="没有正在做的任务" />
          ) : (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-100 mb-6">
              {inProgress.map(task => (
                <div key={task.id} className="p-4">{renderInProgressTask(task)}</div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-sm font-semibold text-gray-600">已经完成</h2>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          {completed.length === 0 ? (
            <EmptyState message="当天没有已完成的任务" onRetry={load} />
          ) : (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
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
