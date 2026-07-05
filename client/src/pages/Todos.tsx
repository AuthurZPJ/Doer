import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { todosApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import TagInput from '../components/TagInput';
import ConfirmButton from '../components/ConfirmButton';
import DatePicker from '../components/DatePicker';
import { todayStr } from '../utils/date';
import type { Todo } from '../types';

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

function sortByPriority(arr: Todo[]): Todo[] {
  return [...arr].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
}

function groupTodos(todos: Todo[]): { key: string; labelKey: string; color: string; items: Todo[] }[] {
  const today = todayStr();
  const groups: Record<string, Todo[]> = { overdue: [], today: [], soon: [], none: [], later: [] };
  for (const todo of todos) {
    if (!todo.due_date) {
      groups.none.push(todo);
    } else if (todo.due_date < today) {
      groups.overdue.push(todo);
    } else if (todo.due_date === today) {
      groups.today.push(todo);
    } else {
      const diff = Math.floor((Date.parse(todo.due_date) - Date.parse(today)) / 86400000);
      if (diff <= 7) groups.soon.push(todo);
      else groups.later.push(todo);
    }
  }
  const meta = [
    { key: 'overdue', labelKey: 'todos.groupOverdue', color: 'text-red-600 dark:text-red-400' },
    { key: 'today', labelKey: 'todos.groupToday', color: 'text-orange-600' },
    { key: 'soon', labelKey: 'todos.groupSoon', color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'none', labelKey: 'todos.groupNone', color: 'text-gray-500 dark:text-gray-400' },
    { key: 'later', labelKey: 'todos.groupLater', color: 'text-gray-500 dark:text-gray-400' },
  ];
  return meta
    .map(m => ({ ...m, items: sortByPriority(groups[m.key]) }))
    .filter(g => g.items.length > 0);
}

export default function Todos() {
  const { t } = useTranslation();
  const priorityLabels: Record<string, string> = {
    high: t('todos.priorityHigh'),
    medium: t('todos.priorityMedium'),
    low: t('todos.priorityLow'),
  };
  const [todos, setTodos] = useState<Todo[]>([]);
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
      showToast(t('common.loadFail'), 'error');
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
      showToast(t('common.addSuccess'));
      load();
    } catch {
      showToast(t('common.addFail'), 'error');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await todosApi.update(id, { status: 'done' });
      showToast(t('todos.started'));
      load();
    } catch {
      showToast(t('common.operateFail'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await todosApi.delete(id);
      showToast(t('common.deleteSuccess'));
      load();
    } catch {
      showToast(t('common.deleteFail'), 'error');
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 tracking-tight dark:text-gray-100">{t('todos.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6 transition-base fade-in">
        <div className="flex flex-col gap-3">
            <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder={t('todos.planWhat')}
            aria-label={t('todos.planWhat')}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-3 items-center">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              aria-label={t('todos.priority')}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm transition-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="high">{t('todos.priorityHigh')}</option>
              <option value="medium">{t('todos.priorityMedium')}</option>
              <option value="low">{t('todos.priorityLow')}</option>
            </select>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
            />
          </div>
          <TagInput value={tags} onChange={setTags} />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-base hover:bg-blue-700 self-start"
          >
            {t('common.add')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 mr-2"></div>{t('common.loading')}</div>
      ) : todos.length === 0 ? (
        <div className="fade-in"><EmptyState message={t('todos.noTodos')} onRetry={load} /></div>
      ) : (
        <div className="space-y-6">
          {groupTodos(todos).map(group => (
            <div key={group.key} className="slide-up">
              <h2 className={`text-base font-bold mb-2 tracking-wide ${group.color}`}>
                {t(group.labelKey)}（{group.items.length}）
              </h2>
              <div className="space-y-2">
                {group.items.map(todo => (
                  <div key={todo.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 transition-base hover:shadow-md ${priorityColors[todo.priority]}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm">{todo.content}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{t('todos.priority')}: {priorityLabels[todo.priority]}</span>
                          {todo.due_date && (
                            <span className={isOverdue(todo.due_date) ? 'text-red-500 dark:text-red-400' : ''}>
                              {t('todos.dueDate')}: {todo.due_date}{isOverdue(todo.due_date) ? ` (${t('todos.overdue')})` : ''}
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
                          {t('todos.start')}
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
