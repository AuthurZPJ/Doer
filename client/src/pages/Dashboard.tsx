import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, tasksApi, todosApi, meetingsApi, learningsApi, issuesApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

interface DashboardData {
  inProgressTasks: any[];
  completedTasks: any[];
  meetings: any[];
  todos: any[];
  learnings: any[];
  issues: any[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const priorityColors: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-gray-500',
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < todayStr();
}

export default function Dashboard() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<DashboardData>({
    inProgressTasks: [], completedTasks: [], meetings: [], todos: [], learnings: [], issues: []
  });
  const [loading, setLoading] = useState(true);
  const [quickInput, setQuickInput] = useState('');
  const [quickCategory, setQuickCategory] = useState('tasks');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dashboardApi.get(date);
      setData(result);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const handleQuickAdd = async () => {
    const content = quickInput.trim();
    if (!content) return;
    try {
      switch (quickCategory) {
        case 'tasks':
          await tasksApi.create({ content });
          break;
        case 'todos':
          await todosApi.create({ content, priority: 'medium' });
          break;
        case 'issues':
          await issuesApi.create({ content });
          break;
        case 'meetings':
          await meetingsApi.create({ title: content, meeting_date: date });
          break;
        case 'learnings':
          await learningsApi.create({ title: content });
          break;
      }
      setQuickInput('');
      showToast('添加成功');
      load();
    } catch {
      showToast('添加失败', 'error');
    }
  };

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">今日看板</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <select
          value={quickCategory}
          onChange={e => setQuickCategory(e.target.value)}
          className="border border-gray-300 rounded px-2 py-2 text-sm"
        >
          <option value="tasks">正在做</option>
          <option value="todos">未来计划</option>
          <option value="meetings">会议</option>
          <option value="learnings">学习</option>
          <option value="issues">问题</option>
        </select>
        <input
          type="text"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
          placeholder="快速记录..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleQuickAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          添加
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card title="正在做" link="/tasks" count={data.inProgressTasks.length}>
          {data.inProgressTasks.length === 0 ? <EmptyState message="暂无" /> : data.inProgressTasks.slice(0, 10).map((t: any) => (
            <div key={t.id} className="text-sm py-1 border-b border-gray-100 last:border-0">
              {t.content}
              {t.tags && <span className="ml-2 text-xs text-blue-500">{t.tags}</span>}
            </div>
          ))}
        </Card>

        <Card title="未来计划" link="/todos" count={data.todos.length}>
          {data.todos.length === 0 ? <EmptyState message="暂无" /> : data.todos.slice(0, 10).map((t: any) => (
            <div key={t.id} className="text-sm py-1 border-b border-gray-100 last:border-0">
              <span className={priorityColors[t.priority]}>●</span> {t.content}
              {isOverdue(t.due_date) && <span className="ml-1 text-xs text-red-500">已逾期</span>}
              {t.due_date && !isOverdue(t.due_date) && <span className="ml-1 text-xs text-yellow-600">{t.due_date}</span>}
            </div>
          ))}
        </Card>

        <Card title="今日会议" link="/meetings" count={data.meetings.length}>
          {data.meetings.length === 0 ? <EmptyState message="暂无" /> : data.meetings.map((m: any) => (
            <div key={m.id} className="text-sm py-1 border-b border-gray-100 last:border-0">
              {m.title}
            </div>
          ))}
        </Card>

        <Card title="学习知识点" link="/learnings" count={data.learnings.length}>
          {data.learnings.length === 0 ? <EmptyState message="暂无" /> : data.learnings.map((l: any) => (
            <div key={l.id} className="text-sm py-1 border-b border-gray-100 last:border-0">
              {l.title}
            </div>
          ))}
        </Card>

        <Card title="当前问题" link="/issues" count={data.issues.length}>
          {data.issues.length === 0 ? <EmptyState message="暂无" /> : data.issues.map((i: any) => (
            <div key={i.id} className="text-sm py-1 border-b border-gray-100 last:border-0">
              {i.content}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, link, count, children }: { title: string; link: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      <div className="flex-1 min-h-[100px]">{children}</div>
      <Link to={link} className="text-xs text-blue-500 hover:text-blue-700 mt-2">查看全部 →</Link>
    </div>
  );
}
