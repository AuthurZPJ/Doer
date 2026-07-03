import { useState, useEffect, useCallback } from 'react';
import { todosApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const priorityColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-300',
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < todayStr();
}

export default function Todos() {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await todosApi.list('pending');
      setTodos(result);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await todosApi.create({
        content: content.trim(),
        priority,
        due_date: dueDate || null,
        tags,
      });
      setContent('');
      setPriority('medium');
      setDueDate('');
      setTags('');
      showToast('添加成功');
      load();
    } catch {
      showToast('添加失败', 'error');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await todosApi.update(id, { status: 'done' });
      showToast('已转入正在做');
      load();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await todosApi.delete(id);
      showToast('删除成功');
      load();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">未来计划</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="计划做什么？"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-3 items-center">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
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
      ) : todos.length === 0 ? (
        <EmptyState message="没有未来计划" onRetry={load} />
      ) : (
        <div className="space-y-2">
          {todos.map(todo => (
            <div key={todo.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${priorityColors[todo.priority]}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm">{todo.content}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>优先级: {priorityLabels[todo.priority]}</span>
                    {todo.due_date && (
                      <span className={isOverdue(todo.due_date) ? 'text-red-500' : ''}>
                        截止: {todo.due_date}{isOverdue(todo.due_date) ? ' (已逾期)' : ''}
                      </span>
                    )}
                    {todo.tags && <span className="text-blue-500">{todo.tags}</span>}
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleStart(todo.id)}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    开始做
                  </button>
                  <ConfirmButton onConfirm={() => handleDelete(todo.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
