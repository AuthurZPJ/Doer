import { useState, useEffect, useCallback } from 'react';
import { todosApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';
import DatePicker from '../components/DatePicker';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const priorityColors: Record<string, string> = {
  high: 'border-l-red-500 dark:border-l-red-500',
  medium: 'border-l-yellow-500 dark:border-l-yellow-500',
  low: 'border-l-gray-300 dark:border-l-gray-600',
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < todayStr();
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriority(arr: any[]): any[] {
  return [...arr].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
}

function groupTodos(todos: any[]): { key: string; label: string; color: string; items: any[] }[] {
  const today = todayStr();
  const groups: Record<string, any[]> = { overdue: [], today: [], soon: [], none: [], later: [] };
  for (const t of todos) {
    if (!t.due_date) {
      groups.none.push(t);
    } else if (t.due_date < today) {
      groups.overdue.push(t);
    } else if (t.due_date === today) {
      groups.today.push(t);
    } else {
      const diff = Math.floor((Date.parse(t.due_date) - Date.parse(today)) / 86400000);
      if (diff <= 7) groups.soon.push(t);
      else groups.later.push(t);
    }
  }
  const meta = [
    { key: 'overdue', label: '已逾期', color: 'text-red-600 dark:text-red-400' },
    { key: 'today', label: '今天截止', color: 'text-orange-600' },
    { key: 'soon', label: '即将截止', color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'none', label: '无截止日期', color: 'text-gray-500 dark:text-gray-400' },
    { key: 'later', label: '以后', color: 'text-gray-500 dark:text-gray-400' },
  ];
  return meta
    .map(m => ({ ...m, items: sortByPriority(groups[m.key]) }))
    .filter(g => g.items.length > 0);
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="计划做什么？"
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-3 items-center">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
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
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      ) : todos.length === 0 ? (
        <EmptyState message="没有未来计划" onRetry={load} />
      ) : (
        <div className="space-y-6">
          {groupTodos(todos).map(group => (
            <div key={group.key}>
              <h2 className={`text-sm font-semibold mb-2 ${group.color}`}>
                {group.label}（{group.items.length}）
              </h2>
              <div className="space-y-2">
                {group.items.map(todo => (
                  <div key={todo.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${priorityColors[todo.priority]}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm">{todo.content}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>优先级: {priorityLabels[todo.priority]}</span>
                          {todo.due_date && (
                            <span className={isOverdue(todo.due_date) ? 'text-red-500 dark:text-red-400' : ''}>
                              截止: {todo.due_date}{isOverdue(todo.due_date) ? ' (已逾期)' : ''}
                            </span>
                          )}
                          {todo.tags && <span className="text-blue-500 dark:text-blue-400">{todo.tags}</span>}
                        </div>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => handleStart(todo.id)}
                          className="text-sm text-green-600 dark:text-green-400 hover:text-green-800"
                        >
                          开始做
                        </button>
                        <ConfirmButton onConfirm={() => handleDelete(todo.id)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
