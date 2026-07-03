import { useState, useEffect, useCallback } from 'react';
import { monthlyStatsApi } from '../api';
import { showToast } from '../components/Toast';

interface MonthlyStatsData {
  month: string;
  completed_tasks_count: number;
  tag_distribution: Record<string, number>;
  meetings_count: number;
  issues_created: number;
  issues_resolved: number;
  resolution_rate: number;
}

const BAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function MonthlyStats() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthlyStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const result = await monthlyStatsApi.get(m);
      setData(result);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [load, month]);

  const tagEntries = data ? Object.entries(data.tag_distribution) : [];
  const maxCount = tagEntries.length > 0 ? Math.max(...tagEntries.map(([, c]) => c)) : 0;

  const cards = data ? [
    { label: '已完成任务', value: data.completed_tasks_count, color: 'text-blue-600' },
    { label: '会议次数', value: data.meetings_count, color: 'text-green-600' },
    { label: '提出问题', value: data.issues_created, color: 'text-orange-600' },
    { label: '已解决问题', value: data.issues_resolved, color: 'text-teal-600' },
    { label: '解决率', value: `${data.resolution_rate}%`, color: 'text-purple-600' },
  ] : [];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">月度统计</h1>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {cards.map(card => (
              <div key={card.label} className="bg-white rounded-lg shadow p-4 text-center">
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">标签分布</h2>
            {tagEntries.length === 0 ? (
              <p className="text-sm text-gray-400">本月暂无已完成任务</p>
            ) : (
              <div className="space-y-3">
                {tagEntries.map(([tag, count], idx) => (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20 shrink-0 truncate">{tag}</span>
                    <div className="flex-1 bg-gray-100 rounded h-6 overflow-hidden">
                      <div
                        className={`${BAR_COLORS[idx % BAR_COLORS.length]} h-full rounded flex items-center justify-end px-2`}
                        style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, minWidth: count > 0 ? '1.5rem' : 0 }}
                      >
                        <span className="text-xs text-white font-medium">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
