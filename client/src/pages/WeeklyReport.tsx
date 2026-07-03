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

interface SubtaskNode {
  id: number;
  content: string;
  children?: SubtaskNode[];
}

function renderSubtaskTree(nodes: SubtaskNode[]) {
  return nodes.map(node => (
    <li key={node.id}>
      <div className="flex items-start gap-2">
        <span className="text-gray-300">└</span>
        <span className="text-xs text-gray-500">{node.content}</span>
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="ml-3 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
          {renderSubtaskTree(node.children)}
        </ul>
      )}
    </li>
  ));
}

function renderSummarySubtasks(nodes: SubtaskNode[]) {
  return nodes.map(node => (
    <li key={node.id}>
      <div className="flex items-start gap-2 ml-3">
        <span className="text-gray-300">·</span>
        <span className="text-xs text-gray-400">{node.content}</span>
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="ml-4 space-y-0.5 mt-0.5">
          {renderSummarySubtasks(node.children)}
        </ul>
      )}
    </li>
  ));
}

function flattenToMarkdown(nodes: SubtaskNode[], depth: number): string {
  const indent = '  '.repeat(depth);
  let out = '';
  for (const node of nodes) {
    out += `${indent}- ${node.content}\n`;
    if (node.children && node.children.length > 0) {
      out += flattenToMarkdown(node.children, depth + 1);
    }
  }
  return out;
}

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
  const totalTasks = report?.days?.reduce((sum: number, d: any) => sum + d.tasks.length + (d.standalone_groups?.length || 0), 0) || 0;

  const hasDayContent = (day: any) => day.tasks.length > 0 || (day.standalone_groups?.length || 0) > 0;

  const handleExport = () => {
    if (!report) return;
    let md = `# 周报 ${weekStart} ~ ${weekEnd}\n\n`;
    if (report.subtask_stats) {
      md += `> 子任务: ${report.subtask_stats.total_done}/${report.subtask_stats.total_subtasks} 已完成\n\n`;
    }
    md += `## 每日完成\n\n`;
    for (const day of report.days) {
      if (!hasDayContent(day)) continue;
      const weekday = weekdayNames[new Date(day.date).getDay() === 0 ? 6 : new Date(day.date).getDay() - 1];
      md += `### ${day.date} ${weekday}\n`;
      for (const task of day.tasks) {
        const countStr = task.total_subtasks > 0 ? ` (${task.done_subtasks}/${task.total_subtasks})` : '';
        md += `- ${task.content}${countStr}${task.tags ? ` [${task.tags}]` : ''}\n`;
        md += flattenToMarkdown(task.subtask_tree || [], 1);
      }
      for (const g of (day.standalone_groups || [])) {
        const countStr = g.total_subtasks > 0 ? ` (${g.done_subtasks}/${g.total_subtasks})` : '';
        md += `- ${g.parent_task_content} (进行中任务的已完成子项)${countStr}${g.parent_tags ? ` [${g.parent_tags}]` : ''}\n`;
        md += flattenToMarkdown(g.subtask_tree || [], 1);
      }
      md += '\n';
    }
    md += `## 按标签汇总\n\n`;
    for (const [tag, items] of Object.entries(report.summary_by_tag)) {
      md += `### ${tag}\n`;
      for (const item of items as any[]) {
        const countStr = item.total_subtasks > 0 ? ` (${item.done_subtasks}/${item.total_subtasks})` : '';
        const label = item.is_in_progress_parent ? ' (进行中任务的已完成子项)' : '';
        md += `- ${item.content}${countStr}${label}\n`;
        md += flattenToMarkdown(item.subtask_tree || [], 1);
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
            <p className="text-sm text-gray-500">
              本周共完成 {totalTasks} 项工作
              {report.subtask_stats && (
                <span className="ml-2 text-gray-400">· 子任务 {report.subtask_stats.total_done}/{report.subtask_stats.total_subtasks} 已完成</span>
              )}
            </p>
          </div>

          <h2 className="text-sm font-semibold text-gray-600 mb-2">每日完成</h2>
          <div className="space-y-3 mb-6">
            {report.days.map((day: any, i: number) => (
              <div key={day.date} className="bg-white rounded-lg shadow p-4">
                <p className="text-sm font-medium mb-2">
                  {day.date} {weekdayNames[i]}
                  <span className="ml-2 text-xs text-gray-400">{day.tasks.length + (day.standalone_groups?.length || 0)} 项</span>
                </p>
                {!hasDayContent(day) ? (
                  <p className="text-sm text-gray-300">无</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {day.tasks.map((t: any) => (
                      <li key={t.id}>
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{t.content}</span>
                          {t.total_subtasks > 0 && (
                            <span className="text-xs text-gray-400">{t.done_subtasks}/{t.total_subtasks} 已完成</span>
                          )}
                          {t.tags && <span className="text-xs text-blue-500">[{t.tags}]</span>}
                        </div>
                        {t.subtask_tree && t.subtask_tree.length > 0 && (
                          <ul className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
                            {renderSubtaskTree(t.subtask_tree)}
                          </ul>
                        )}
                      </li>
                    ))}
                    {(day.standalone_groups || []).map((g: any) => (
                      <li key={`grp-${g.parent_task_id}`} className="mt-2">
                        <p className="text-xs font-medium text-yellow-600 mb-1">进行中任务的已完成子项</p>
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{g.parent_task_content}</span>
                          {g.total_subtasks > 0 && (
                            <span className="text-xs text-gray-400">{g.done_subtasks}/{g.total_subtasks} 已完成</span>
                          )}
                          {g.parent_tags && <span className="text-xs text-blue-500">[{g.parent_tags}]</span>}
                        </div>
                        {g.subtask_tree && g.subtask_tree.length > 0 && (
                          <ul className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
                            {renderSubtaskTree(g.subtask_tree)}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 mb-2">按标签汇总</h2>
          <div className="bg-white rounded-lg shadow p-4">
            {Object.entries(report.summary_by_tag).map(([tag, items]) => (
              <div key={tag} className="mb-4 last:mb-0">
                <p className="text-sm font-medium text-blue-600 mb-1">{tag}</p>
                <ul className="text-sm space-y-1 ml-4">
                  {(items as any[]).map((item, i) => (
                    <li key={i}>
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-700">{item.content}</span>
                        {item.total_subtasks > 0 && (
                          <span className="text-xs text-gray-400">{item.done_subtasks}/{item.total_subtasks} 已完成</span>
                        )}
                        {item.is_in_progress_parent && (
                          <span className="text-xs text-yellow-600">进行中任务的已完成子项</span>
                        )}
                      </div>
                      {item.subtask_tree && item.subtask_tree.length > 0 && (
                        <ul className="ml-4 space-y-0.5 mt-0.5">
                          {renderSummarySubtasks(item.subtask_tree)}
                        </ul>
                      )}
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
