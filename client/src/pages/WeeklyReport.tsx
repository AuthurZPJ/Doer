import { useState, useEffect, useCallback } from 'react';
import { weeklyReportApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import DatePicker from '../components/DatePicker';

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

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return ok;
}

export default function WeeklyReport() {
  const [weekStart, setWeekStart] = useState(getWeekStart(todayStr()));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState(getWeekStart(todayStr()));
  const [exportTo, setExportTo] = useState(getWeekStart(todayStr()));
  const [exporting, setExporting] = useState(false);

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
  const handleWeekPicker = (v: string) => {
    if (v) setWeekStart(getWeekStart(v));
  };

  const weekEnd = addDays(weekStart, 6);
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
    const ok = copyToClipboard(md);
    showToast(ok ? '已复制到剪贴板' : '复制失败，请手动复制', ok ? 'success' : 'error');
  };

  const reportToMarkdown = (r: any, start: string, end: string): string => {
    let md = `# 周报 ${start} ~ ${end}\n\n`;
    if (r.subtask_stats) {
      md += `> 子任务: ${r.subtask_stats.total_done}/${r.subtask_stats.total_subtasks} 已完成\n\n`;
    }
    md += `## 每日完成\n\n`;
    for (const day of r.days) {
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
    for (const [tag, items] of Object.entries(r.summary_by_tag)) {
      md += `### ${tag}\n`;
      for (const item of items as any[]) {
        const countStr = item.total_subtasks > 0 ? ` (${item.done_subtasks}/${item.total_subtasks})` : '';
        const label = item.is_in_progress_parent ? ' (进行中任务的已完成子项)' : '';
        md += `- ${item.content}${countStr}${label}\n`;
        md += flattenToMarkdown(item.subtask_tree || [], 1);
      }
      md += '\n';
    }
    return md;
  };

  const handleExportRange = async () => {
    const fromWeek = getWeekStart(exportFrom);
    const toWeek = getWeekStart(exportTo);
    if (fromWeek > toWeek) {
      showToast('起始周不能晚于结束周', 'error');
      return;
    }
    setExporting(true);
    try {
      let allMd = '';
      let current = fromWeek;
      while (current <= toWeek) {
        const r = await weeklyReportApi.get(current);
        if (r.days.some((d: any) => hasDayContent(d))) {
          allMd += reportToMarkdown(r, current, addDays(current, 6)) + '\n---\n\n';
        }
        current = addDays(current, 7);
      }
      if (!allMd) {
        showToast('该区间暂无记录', 'error');
      } else {
        const ok = copyToClipboard(allMd.trimEnd());
        showToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error');
        setShowExport(false);
      }
    } catch {
      showToast('导出失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFromToThis = async () => {
    const fromWeek = getWeekStart(exportFrom);
    const thisWeek = getWeekStart(todayStr());
    if (fromWeek > thisWeek) {
      showToast('起始周不能晚于本周', 'error');
      return;
    }
    setExporting(true);
    try {
      let allMd = '';
      let current = fromWeek;
      while (current <= thisWeek) {
        const r = await weeklyReportApi.get(current);
        if (r.days.some((d: any) => hasDayContent(d))) {
          allMd += reportToMarkdown(r, current, addDays(current, 6)) + '\n---\n\n';
        }
        current = addDays(current, 7);
      }
      if (!allMd) {
        showToast('该区间暂无记录', 'error');
      } else {
        const ok = copyToClipboard(allMd.trimEnd());
        showToast(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error');
        setShowExport(false);
      }
    } catch {
      showToast('导出失败', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">周报</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">‹</button>
          <DatePicker value={weekStart} onChange={handleWeekPicker} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{weekStart} ~ {weekEnd}</span>
          <button onClick={handleNextWeek} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">›</button>
          <button onClick={handleThisWeek} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">本周</button>
          <button onClick={() => setShowExport(!showExport)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">导出</button>
        </div>
      </div>

      {showExport && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">导出选项</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              导出当前周 ({weekStart} ~ {weekEnd})
            </button>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">导出周区间:</span>
              <DatePicker value={exportFrom} onChange={(v) => setExportFrom(getWeekStart(v))} />
              <span className="text-gray-400">~</span>
              <DatePicker value={exportTo} onChange={(v) => setExportTo(getWeekStart(v))} />
              <span className="text-xs text-gray-400">{exportFrom} ~ {addDays(exportTo, 6)}</span>
              <button
                onClick={handleExportRange}
                disabled={exporting}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 ml-auto"
              >
                {exporting ? '导出中...' : '导出'}
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded">
              <span className="text-sm text-gray-600 dark:text-gray-400">从指定周至本周:</span>
              <DatePicker value={exportFrom} onChange={(v) => setExportFrom(getWeekStart(v))} />
              <span className="text-xs text-gray-400">{exportFrom} ~ {addDays(getWeekStart(todayStr()), 6)}</span>
              <button
                onClick={handleExportFromToThis}
                disabled={exporting}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 ml-auto"
              >
                {exporting ? '导出中...' : '导出'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      ) : !report || totalTasks === 0 ? (
        <EmptyState message="本周暂无记录" onRetry={load} />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              本周共完成 {totalTasks} 项工作
              {report.subtask_stats && (
                <span className="ml-2 text-gray-400">· 子任务 {report.subtask_stats.total_done}/{report.subtask_stats.total_subtasks} 已完成</span>
              )}
            </p>
          </div>

          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">每日完成</h2>
          <div className="space-y-3 mb-6">
            {report.days.map((day: any, i: number) => (
              <div key={day.date} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-sm font-medium mb-2 dark:text-gray-100">
                  {day.date} {weekdayNames[i]}
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{day.tasks.length + (day.standalone_groups?.length || 0)} 项</span>
                </p>
                {!hasDayContent(day) ? (
                  <p className="text-sm text-gray-300 dark:text-gray-600">无</p>
                ) : (
                  <div className="space-y-2">
                    {day.tasks.map((t: any) => (
                      <div key={t.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3 border-l-4 border-green-400">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span className="font-medium dark:text-gray-100">{t.content}</span>
                          {t.total_subtasks > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{t.done_subtasks}/{t.total_subtasks} 已完成</span>
                          )}
                          {t.tags && <span className="text-xs text-blue-500 dark:text-blue-400">[{t.tags}]</span>}
                        </div>
                        {t.subtask_tree && t.subtask_tree.length > 0 && (
                          <ul className="ml-4 border-l border-gray-200 dark:border-gray-600 pl-3 space-y-0.5 mt-1">
                            {renderSubtaskTree(t.subtask_tree)}
                          </ul>
                        )}
                      </div>
                    ))}
                    {(day.standalone_groups || []).map((g: any) => (
                      <div key={`grp-${g.parent_task_id}`} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md p-3 border-l-4 border-yellow-400">
                        <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">进行中任务的已完成子项</p>
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-gray-600 dark:text-gray-400 font-medium">{g.parent_task_content}</span>
                          {g.total_subtasks > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{g.done_subtasks}/{g.total_subtasks} 已完成</span>
                          )}
                          {g.parent_tags && <span className="text-xs text-blue-500 dark:text-blue-400">[{g.parent_tags}]</span>}
                        </div>
                        {g.subtask_tree && g.subtask_tree.length > 0 && (
                          <ul className="ml-4 border-l border-gray-200 dark:border-gray-600 pl-3 space-y-0.5 mt-1">
                            {renderSubtaskTree(g.subtask_tree)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">按标签汇总</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            {Object.entries(report.summary_by_tag).map(([tag, items]) => (
              <div key={tag} className="mb-4 last:mb-0">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">{tag}</p>
                <div className="space-y-2 ml-2">
                  {(items as any[]).map((item, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2 border-l-4 border-blue-400">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">{item.content}</span>
                        {item.total_subtasks > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{item.done_subtasks}/{item.total_subtasks} 已完成</span>
                        )}
                        {item.is_in_progress_parent && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">进行中任务的已完成子项</span>
                        )}
                      </div>
                      {item.subtask_tree && item.subtask_tree.length > 0 && (
                        <ul className="ml-2 space-y-0.5 mt-1">
                          {renderSummarySubtasks(item.subtask_tree)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
