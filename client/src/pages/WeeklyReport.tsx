import { useState, useEffect, useCallback } from 'react';
import { weeklyReportApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

function getWeekStart(date: string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function WeeklyReport() {
  const [weekStart, setWeekStart] = useState(getWeekStart(todayStr()));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await weeklyReportApi.get(weekStart);
      setReport(result);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const handleThisWeek = () => setWeekStart(getWeekStart(todayStr()));

  const weekEnd = report?.week_end || addDays(weekStart, 6);
  const totalTasks = report?.days?.reduce((sum: number, d: any) => sum + d.tasks.length + (d.standaloneSubtasks?.length || 0), 0) || 0;

  const hasDayContent = (day: any) => day.tasks.length > 0 || (day.standaloneSubtasks?.length || 0) > 0;

  const handleExport = () => {
    if (!report) return;
    let md = `# 周报 ${weekStart} ~ ${weekEnd}\n\n`;
    md += `## 每日完成\n\n`;
    for (const day of report.days) {
      if (!hasDayContent(day)) continue;
      const weekday = weekdayNames[new Date(day.date).getDay() === 0 ? 6 : new Date(day.date).getDay() - 1];
      md += `### ${day.date} ${weekday}\n`;
      for (const task of day.tasks) {
        md += `- ${task.content}${task.tags ? ` [${task.tags}]` : ''}\n`;
        const doneSubs = (task.subtasks || []).filter((s: any) => s.status === 'done');
        for (const sub of doneSubs) {
          md += `  - └ ${sub.content}\n`;
        }
      }
      for (const sub of (day.standaloneSubtasks || [])) {
        md += `- └ ${sub.content} (主任务未完成)${sub.parent_tags ? ` [${sub.parent_tags}]` : ''}\n`;
      }
      md += '\n';
    }
    md += `## 按标签汇总\n\n`;
    for (const [tag, tasks] of Object.entries(report.summary_by_tag)) {
      md += `### ${tag}\n`;
      for (const task of tasks as string[]) {
        md += `- ${task}\n`;
      }
      md += '\n';
    }
    navigator.clipboard.writeText(md);
    showToast('已复制到剪贴板');
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">周报</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">上一周</button>
          <span className="text-sm text-gray-500">{weekStart} ~ {weekEnd}</span>
          <button onClick={handleNextWeek} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">下一周</button>
          <button onClick={handleThisWeek} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">本周</button>
          <button onClick={handleExport} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">导出Markdown</button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : !report || totalTasks === 0 ? (
        <EmptyState message="本周暂无记录" onRetry={load} />
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <p className="text-sm text-gray-500">本周共完成 {totalTasks} 项工作</p>
          </div>

          <h2 className="text-sm font-semibold text-gray-600 mb-2">每日完成</h2>
          <div className="space-y-3 mb-6">
            {report.days.map((day: any, i: number) => (
              <div key={day.date} className="bg-white rounded-lg shadow p-4">
                <p className="text-sm font-medium mb-2">
                  {day.date} {weekdayNames[i]}
                  <span className="ml-2 text-xs text-gray-400">{day.tasks.length + (day.standaloneSubtasks?.length || 0)} 项</span>
                </p>
                {!hasDayContent(day) ? (
                  <p className="text-sm text-gray-300">无</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {day.tasks.map((t: any) => {
                      const doneSubs = (t.subtasks || []).filter((s: any) => s.status === 'done');
                      return (
                        <li key={t.id}>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{t.content}</span>
                            {t.tags && <span className="text-xs text-blue-500">[{t.tags}]</span>}
                          </div>
                          {doneSubs.length > 0 && (
                            <ul className="ml-4 space-y-0.5 mt-0.5">
                              {doneSubs.map((sub: any) => (
                                <li key={sub.id} className="flex items-start gap-2 text-gray-500">
                                  <span className="text-gray-300">└</span>
                                  <span className="text-xs">{sub.content}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                    {(day.standaloneSubtasks || []).map((sub: any) => (
                      <li key={`sub-${sub.id}`} className="flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">└ {sub.content}</span>
                        <span className="text-xs text-yellow-600">主任务未完成</span>
                        {sub.parent_tags && <span className="text-xs text-blue-500">[{sub.parent_tags}]</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 mb-2">按标签汇总</h2>
          <div className="bg-white rounded-lg shadow p-4">
            {Object.entries(report.summary_by_tag).map(([tag, tasks]) => (
              <div key={tag} className="mb-4 last:mb-0">
                <p className="text-sm font-medium text-blue-600 mb-1">{tag}</p>
                <ul className="text-sm space-y-1 ml-4">
                  {(tasks as string[]).map((task, i) => (
                    <li key={i} className={`text-gray-600 ${task.startsWith('  └') ? 'ml-4 text-xs text-gray-500' : ''}`}>
                      • {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
