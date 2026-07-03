import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Tasks() {
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tasksApi.list(date);
      setTasks(result);
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

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">今日完成</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="完成了什么？"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <TagInput value={tags} onChange={setTags} />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 self-start"
          >
            添加
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : tasks.length === 0 ? (
        <EmptyState message="今天还没有记录" onRetry={load} />
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {tasks.map(task => (
            <div key={task.id} className="p-4">
              {editingId === task.id ? (
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
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm">{task.content}</p>
                    {task.tags && <span className="text-xs text-blue-500 mt-1 inline-block">{task.tags}</span>}
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => handleEdit(task)} className="text-sm text-gray-500 hover:text-gray-700">编辑</button>
                    <ConfirmButton onConfirm={() => handleDelete(task.id)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
