import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { weeklyReportApi } from '../api';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import DatePicker from '../components/DatePicker';
import i18n from '../i18n';
import { todayStr, toDateStr, parseLocalDate } from '../utils/date';
import type { WeeklyReport as WeeklyReportData, WeeklyReportDay } from '../types';

function getWeekStart(date: string): string {
  const d = parseLocalDate(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function getWeekdayNames() {
  return [i18n.t('weekday.mon'), i18n.t('weekday.tue'), i18n.t('weekday.wed'), i18n.t('weekday.thu'), i18n.t('weekday.fri'), i18n.t('weekday.sat'), i18n.t('weekday.sun')];
}

interface SubtaskNode {
  id: number;
  content: string;
  notes?: string;
  status: string;
  children?: SubtaskNode[];
}

function renderSubtaskTree(nodes: SubtaskNode[]) {
  return nodes.map(node => (
    <div key={node.id}>
      <div className="flex items-center gap-2 py-0.5">
        <span className={`text-xs ${node.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-500 dark:text-gray-400'}`}>{node.content}</span>
      </div>
      {node.notes && node.notes.trim() && (
        <p className="ml-3 text-xs text-gray-400 dark:text-gray-500 italic whitespace-pre-wrap">{node.notes.trim()}</p>
      )}
      {node.children && node.children.length > 0 && (
        <div className="ml-3 pl-3 border-l border-gray-200 dark:border-gray-600 space-y-0.5">
          {renderSubtaskTree(node.children)}
        </div>
      )}
    </div>
  ));
}

function flattenToMarkdown(nodes: SubtaskNode[], depth: number): string {
  const indent = '  '.repeat(depth);
  let out = '';
  for (const node of nodes) {
    const checked = node.status === 'done' ? '[x]' : '[ ]';
    out += `${indent}- ${checked} ${node.content}\n`;
    if (node.notes && node.notes.trim()) {
      out += `${indent}  > ${node.notes.trim().replace(/\n/g, '\n' + indent + '  > ')}\n`;
    }
    if (node.children && node.children.length > 0) {
      out += flattenToMarkdown(node.children, depth + 1);
    }
  }
  return out;
}

function pct(done: number, total: number): string {
  if (total === 0) return '';
  return `(${(done / total * 100).toFixed(1)}%)`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    return ok;
  }
}
function TagBadge({ tags }: { tags: string }) {
  if (!tags) return null;
  return (
    <>
      {tags.split(',').map(tag => (
        <span key={tag} className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs px-1.5 py-0.5 rounded">{tag.trim()}</span>
      ))}
    </>
  );
}

interface ExportSections {
  overview: boolean;
  weekly: boolean;
  daily: boolean;
  summary: boolean;
  weekTasks?: boolean;
}

function reportToMarkdown(r: WeeklyReportData, start: string, end: string, sections: ExportSections = { overview: true, weekly: false, daily: true, summary: true }, skipPreamble = false): string {
  const weekdayNames = getWeekdayNames();
  const hasDayContent = (day: WeeklyReportDay) => day.tasks.length > 0 || (day.standalone_groups?.length || 0) > 0;

  const activeDays = r.days.filter(hasDayContent).length;
  const totalTasks = r.days.reduce((sum, d) => sum + d.tasks.length + (d.standalone_groups?.length || 0), 0);
  const tagNames = Object.keys(r.summary_by_tag);
  const subtaskPct = r.subtask_stats && r.subtask_stats.total_subtasks > 0
    ? `${r.subtask_stats.total_done}/${r.subtask_stats.total_subtasks} (${(r.subtask_stats.total_done / r.subtask_stats.total_subtasks * 100).toFixed(1)}%)`
    : `${r.subtask_stats?.total_done || 0}/${r.subtask_stats?.total_subtasks || 0}`;

  let md = `# ${i18n.t('weeklyReport.reportTitle')} ${start} ~ ${end}\n\n`;
  if (!skipPreamble) {
    md += `${i18n.t('weeklyReport.aiPreamble')}\n\n`;
  }

  if (sections.overview) {
    md += `## ${i18n.t('weeklyReport.overview') || 'Overview'}\n\n`;
    md += `- ${i18n.t('weeklyReport.dateRange') || 'Date Range'}: ${start} ~ ${end}\n`;
    md += `- ${i18n.t('weeklyReport.completedTasks') || 'Completed Tasks'}: ${totalTasks}\n`;
    md += `- ${i18n.t('weeklyReport.activeDays') || 'Active Days'}: ${activeDays}/7\n`;
    md += `- ${i18n.t('weeklyReport.tagsInvolved') || 'Tags'}: ${tagNames.length > 0 ? tagNames.join(', ') : '-'}\n`;
    md += `- ${i18n.t('weeklyReport.subtaskProgress') || 'Subtask Progress'}: ${subtaskPct}\n\n`;
  }

  if (sections.weekly) {
    md += `## ${i18n.t('weeklyReport.weeklySummary') || 'Weekly Summary'}\n\n`;
    md += `| ${i18n.t('weeklyReport.week') || 'Week'} | ${i18n.t('weeklyReport.completedTasks') || 'Completed Tasks'} | ${i18n.t('weeklyReport.activeDays') || 'Active Days'} | ${i18n.t('weeklyReport.tagsInvolved') || 'Tags'} | ${i18n.t('weeklyReport.subtaskProgress') || 'Subtask Progress'} |\n`;
    md += `|------|------|------|------|------|\n`;
    const tagsStr = tagNames.length > 0 ? tagNames.join(', ') : '-';
    md += `| ${start} ~ ${end} | ${totalTasks} | ${activeDays}/7 | ${tagsStr} | ${subtaskPct} |\n\n`;
  }

  if (sections.weekTasks) {
    let idx = 1;
    const allTasks: { content: string; tags: string; notes: string; done_subtasks: number; total_subtasks: number; subtask_tree: SubtaskNode[] }[] = [];
    const allGroups: { parent_task_content: string; parent_tags: string; done_subtasks: number; total_subtasks: number; subtask_tree: SubtaskNode[] }[] = [];
    for (const day of r.days) {
      if (!hasDayContent(day)) continue;
      for (const task of day.tasks) {
        allTasks.push(task);
      }
      for (const g of (day.standalone_groups || [])) {
        allGroups.push(g);
      }
    }
    if (allTasks.length > 0) {
      md += `\n**${i18n.t('weeklyReport.completedTasks') || 'Completed Tasks'}**\n\n`;
      for (const task of allTasks) {
        const progress = task.total_subtasks > 0 ? ` \`${i18n.t('weeklyReport.progress') || 'Progress'}: ${task.done_subtasks}/${task.total_subtasks} ${pct(task.done_subtasks, task.total_subtasks)}\`` : '';
        const tags = task.tags ? ` \`${i18n.t('common.tags') || 'Tags'}: ${task.tags}\`` : '';
        md += `${idx}. ${task.content}${tags}${progress}\n`;
        if (task.notes && task.notes.trim()) {
          md += `   > ${task.notes.trim().replace(/\n/g, '\n   > ')}\n`;
        }
        if (task.subtask_tree && task.subtask_tree.length > 0) {
          md += flattenToMarkdown(task.subtask_tree, 1);
        }
        idx++;
      }
    }
    if (allGroups.length > 0) {
      md += `\n**${i18n.t('weeklyReport.inProgressSubtasks') || 'In-Progress Task Subtasks'}**\n\n`;
      let gIdx = 1;
      for (const g of allGroups) {
        const progress = g.total_subtasks > 0 ? ` \`${i18n.t('weeklyReport.progress') || 'Progress'}: ${g.done_subtasks}/${g.total_subtasks} ${pct(g.done_subtasks, g.total_subtasks)}\`` : '';
        const tags = g.parent_tags ? ` \`${i18n.t('common.tags') || 'Tags'}: ${g.parent_tags}\`` : '';
        md += `${gIdx}. ${g.parent_task_content}${tags}${progress}\n`;
        if (g.subtask_tree && g.subtask_tree.length > 0) {
          md += flattenToMarkdown(g.subtask_tree, 1);
        }
        gIdx++;
      }
    }
    md += '\n';
  }

  if (sections.daily) {
    md += `## ${i18n.t('weeklyReport.dailyComplete')}\n\n`;
    for (const day of r.days) {
      if (!hasDayContent(day)) continue;
      const weekday = weekdayNames[parseLocalDate(day.date).getDay() === 0 ? 6 : parseLocalDate(day.date).getDay() - 1];
      md += `### ${day.date} ${weekday}\n`;

      if (day.tasks.length > 0) {
        md += `\n**${i18n.t('weeklyReport.completedTasks') || 'Completed Tasks'}**\n\n`;
        let idx = 1;
        for (const task of day.tasks) {
          const progress = task.total_subtasks > 0 ? ` \`${i18n.t('weeklyReport.progress') || 'Progress'}: ${task.done_subtasks}/${task.total_subtasks} ${pct(task.done_subtasks, task.total_subtasks)}\`` : '';
          const tags = task.tags ? ` \`${i18n.t('common.tags') || 'Tags'}: ${task.tags}\`` : '';
          md += `${idx}. ${task.content}${tags}${progress}\n`;
          if (task.notes && task.notes.trim()) {
            md += `   > ${task.notes.trim().replace(/\n/g, '\n   > ')}\n`;
          }
          if (task.subtask_tree && task.subtask_tree.length > 0) {
            md += flattenToMarkdown(task.subtask_tree, 1);
          }
          idx++;
        }
      }

      if ((day.standalone_groups?.length || 0) > 0) {
        md += `\n**${i18n.t('weeklyReport.inProgressSubtasks') || 'In-Progress Task Subtasks'}**\n\n`;
        let idx = 1;
        for (const g of (day.standalone_groups || [])) {
          const progress = g.total_subtasks > 0 ? ` \`${i18n.t('weeklyReport.progress') || 'Progress'}: ${g.done_subtasks}/${g.total_subtasks} ${pct(g.done_subtasks, g.total_subtasks)}\`` : '';
          const tags = g.parent_tags ? ` \`${i18n.t('common.tags') || 'Tags'}: ${g.parent_tags}\`` : '';
          md += `${idx}. ${g.parent_task_content}${tags}${progress}\n`;
          if (g.subtask_tree && g.subtask_tree.length > 0) {
            md += flattenToMarkdown(g.subtask_tree, 1);
          }
          idx++;
        }
      }
      md += '\n';
    }
  }

  if (sections.summary) {
    md += `## ${i18n.t('weeklyReport.summaryByTag')}\n\n`;
    for (const [tag, items] of Object.entries(r.summary_by_tag)) {
      const tagLabel = tag === 'untagged' ? (i18n.t('common.noTags') || 'No Tags') : tag;
      md += `### ${tagLabel} (${items.length})\n\n`;
      md += `| ${i18n.t('weeklyReport.task') || 'Task'} | ${i18n.t('weeklyReport.progress') || 'Progress'} | ${i18n.t('common.status') || 'Status'} | ${i18n.t('tasks.notes') || 'Notes'} |\n`;
      md += `|------|------|------|------|\n`;
      for (const item of items) {
        const progress = item.total_subtasks > 0 ? `${item.done_subtasks}/${item.total_subtasks} ${pct(item.done_subtasks, item.total_subtasks)}` : '-';
        const status = item.is_in_progress_parent ? i18n.t('common.inProgress') || 'In Progress' : i18n.t('common.completed') || 'Completed';
        const notes = item.notes && item.notes.trim() ? item.notes.trim().replace(/\|/g, '/').replace(/\n/g, ' ') : '-';
        md += `| ${item.content} | ${progress} | ${status} | ${notes} |\n`;
      }
      md += '\n';
    }
  }
  return md;
}

export default function WeeklyReport() {
  const { t } = useTranslation();
  const weekdayNames = [t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat'), t('weekday.sun')];
  const [weekStart, setWeekStart] = useState(getWeekStart(todayStr()));
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState(getWeekStart(todayStr()));
  const [exportTo, setExportTo] = useState(getWeekStart(todayStr()));
  const [cachedReports, setCachedReports] = useState<Record<string, WeeklyReportData>>({});
  const [cacheLoading, setCacheLoading] = useState(false);
  const reqIdRef = useRef(0);
  const cacheReqIdRef = useRef(0);
  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const result = await weeklyReportApi.get(weekStart);
      if (reqId !== reqIdRef.current) return;
      setReport(result);
    } catch {
      if (reqId !== reqIdRef.current) return;
      showToast(t('common.loadFail'), 'error');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const reqId = ++cacheReqIdRef.current;
    setCacheLoading(true);
    const reports: Record<string, WeeklyReportData> = {};
    let current = exportFrom;
    (async () => {
      while (current <= exportTo) {
        try {
          reports[current] = await weeklyReportApi.get(current);
        } catch {}
        current = addDays(current, 7);
      }
      if (reqId !== cacheReqIdRef.current) return;
      setCachedReports(reports);
      setCacheLoading(false);
    })();
  }, [exportFrom, exportTo]);

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const handleThisWeek = () => setWeekStart(getWeekStart(todayStr()));
  const handleWeekPicker = (v: string) => {
    if (v) setWeekStart(getWeekStart(v));
  };

  const weekEnd = addDays(weekStart, 6);
  const hasDayContent = (day: WeeklyReportDay) => day.tasks.length > 0 || (day.standalone_groups?.length || 0) > 0;
  const allDays = report?.days || [];
  const totalTasks = allDays.reduce((sum, d) => sum + d.tasks.length + (d.standalone_groups?.length || 0), 0) || 0;

  const handleExport = async () => {
    if (!report) return;
    const md = reportToMarkdown(report, weekStart, weekEnd, { overview: true, weekly: false, daily: true, summary: true });
    const ok = await copyToClipboard(md);
    showToast(ok ? t('weeklyReport.copied') : t('weeklyReport.copyFailManual'), ok ? 'success' : 'error');
  };

  const handleExportRange = () => {
    const fromWeek = getWeekStart(exportFrom);
    const toWeek = getWeekStart(exportTo);
    if (fromWeek > toWeek) {
      showToast(t('weeklyReport.startAfterEnd'), 'error');
      return;
    }
    if (cacheLoading) {
      showToast(t('weeklyReport.exporting'), 'error');
      return;
    }
    const reports: WeeklyReportData[] = [];
    let current = fromWeek;
    while (current <= toWeek) {
      const r = cachedReports[current];
      if (r) reports.push(r);
      current = addDays(current, 7);
    }

    let perWeekMd = '';
    const globalTagMap: Record<string, { count: number; done: number; total: number; items: { content: string; notes: string; done_subtasks: number; total_subtasks: number; is_in_progress_parent: boolean; week: string }[] }> = {};
    let weekCount = 0;
    for (const r of reports) {
      const currentWeek = r.week_start;
      if (r.days.some((d) => hasDayContent(d))) {
        weekCount++;
        for (const [tag, items] of Object.entries(r.summary_by_tag)) {
          if (!globalTagMap[tag]) globalTagMap[tag] = { count: 0, done: 0, total: 0, items: [] };
          globalTagMap[tag].count += items.length;
          for (const item of items) {
            globalTagMap[tag].done += item.done_subtasks;
            globalTagMap[tag].total += item.total_subtasks;
            globalTagMap[tag].items.push({
              content: item.content,
              notes: item.notes || '',
              done_subtasks: item.done_subtasks,
              total_subtasks: item.total_subtasks,
              is_in_progress_parent: item.is_in_progress_parent,
              week: currentWeek,
            });
          }
        }
        perWeekMd += reportToMarkdown(r, currentWeek, addDays(currentWeek, 6), { overview: false, weekly: false, daily: false, summary: false, weekTasks: true }, true) + '\n---\n\n';
      }
    }

    let header = `# ${t('weeklyReport.reportTitle')} ${fromWeek} ~ ${addDays(toWeek, 6)}\n\n`;
    header += `${t('weeklyReport.aiPreamble')}\n\n`;
    let globalSummary = '';
    if (Object.keys(globalTagMap).length > 0) {
      globalSummary = `## ${t('weeklyReport.globalTagSummary') || 'Global Tag Summary'}\n\n`;
      for (const [tag, data] of Object.entries(globalTagMap)) {
        const tagLabel = tag === 'untagged' ? (t('common.noTags') || 'No Tags') : tag;
        const tagPct = data.total > 0 ? `${data.done}/${data.total} (${(data.done / data.total * 100).toFixed(1)}%)` : '-';
        globalSummary += `### ${tagLabel} (${data.count}) — ${tagPct}\n\n`;
        globalSummary += `| ${t('weeklyReport.week') || 'Week'} | ${t('weeklyReport.task') || 'Task'} | ${t('weeklyReport.progress') || 'Progress'} | ${t('common.status') || 'Status'} | ${t('tasks.notes') || 'Notes'} |\n`;
        globalSummary += `|------|------|------|------|------|\n`;
        for (const item of data.items) {
          const progress = item.total_subtasks > 0 ? `${item.done_subtasks}/${item.total_subtasks}` : '-';
          const status = item.is_in_progress_parent ? t('common.inProgress') || 'In Progress' : t('common.completed') || 'Completed';
          const notes = item.notes && item.notes.trim() ? item.notes.trim().replace(/\|/g, '/').replace(/\n/g, ' ') : '-';
          globalSummary += `| ${item.week} ~ ${addDays(item.week, 6)} | ${item.content} | ${progress} | ${status} | ${notes} |\n`;
        }
        globalSummary += '\n';
      }
    }
    const finalMd = header + globalSummary + perWeekMd;
    if (weekCount === 0) {
      showToast(t('weeklyReport.noRecordsRange'), 'error');
      return;
    }
    copyToClipboard(finalMd.trimEnd()).then((ok) => {
      showToast(ok ? t('weeklyReport.copied') : t('weeklyReport.copyFail'), ok ? 'success' : 'error');
      if (ok) setShowExport(false);
    });
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('weeklyReport.title')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-base">‹</button>
          <DatePicker value={weekStart} onChange={handleWeekPicker} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{weekStart} ~ {weekEnd}</span>
          <button onClick={handleNextWeek} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-base">›</button>
          <button onClick={handleThisWeek} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-base">{t('weeklyReport.thisWeek')}</button>
          <button onClick={() => setShowExport(!showExport)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-base">{t('weeklyReport.export')}</button>
        </div>
      </div>

      {showExport && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 fade-in">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('weeklyReport.exportOptions')}</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              className="text-left px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-base"
            >
              <div className="font-medium">{t('weeklyReport.exportCurrentWeek')} ({weekStart} ~ {weekEnd})</div>
              <div className="text-xs text-gray-400 mt-0.5">{t('weeklyReport.singleWeekHint')}</div>
            </button>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex-wrap">
              <div className="w-full mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('weeklyReport.exportRange')}</span>
                <span className="text-xs text-gray-400 ml-2">{t('weeklyReport.multiWeekHint')}</span>
              </div>
              <DatePicker value={exportFrom} onChange={(v) => setExportFrom(getWeekStart(v))} />
              <span className="text-gray-400">~</span>
              <DatePicker value={exportTo} onChange={(v) => setExportTo(getWeekStart(v))} />
              <span className="text-xs text-gray-400">{exportFrom} ~ {addDays(exportTo, 6)}</span>
              <button
                onClick={handleExportRange}
                disabled={cacheLoading}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 ml-auto transition-base"
              >
                {cacheLoading ? t('weeklyReport.exporting') : t('weeklyReport.export')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500"><div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 mr-2"></div>{t('common.loading')}</div>
      ) : !report || totalTasks === 0 ? (
        <EmptyState message={t('weeklyReport.noRecords')} onRetry={load} />
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 transition-base">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('weeklyReport.weeklyTotal')} <span className="font-semibold text-gray-700 dark:text-gray-200">{totalTasks}</span> {t('weeklyReport.itemsWork')}
              {report.subtask_stats && report.subtask_stats.total_subtasks > 0 && (
                <span className="ml-2 text-gray-400">· {t('weeklyReport.subtasks')} {report.subtask_stats.total_done}/{report.subtask_stats.total_subtasks} {t('weeklyReport.completedLabel')}</span>
              )}
            </p>
          </div>

          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 tracking-wide mb-2">{t('weeklyReport.dailyComplete')}</h2>
          <div className="space-y-3 mb-6 slide-up">
            {allDays.map((day) => {
              const weekday = weekdayNames[parseLocalDate(day.date).getDay() === 0 ? 6 : parseLocalDate(day.date).getDay() - 1];
              const dayCount = day.tasks.length + (day.standalone_groups?.length || 0);
              return (
                <div key={day.date} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-base">
                  <p className="text-sm font-medium mb-3 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {day.date} {weekday}
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">{dayCount} {t('weeklyReport.itemsWork')}</span>
                  </p>
                  <div className="space-y-2">
                    {day.tasks.map((task) => (
                      <div key={task.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border-l-4 border-green-400 transition-base">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="font-medium dark:text-gray-100">{task.content}</span>
                          {task.total_subtasks > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{task.done_subtasks}/{task.total_subtasks} {t('weeklyReport.completedLabel')}</span>
                          )}
                          {task.tags && <TagBadge tags={task.tags} />}
                        </div>
                        {task.notes && task.notes.trim() && (
                          <div className="mt-2 bg-gray-100 dark:bg-gray-700/40 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap flex gap-1.5">
                            <span className="shrink-0">📝</span>
                            <span className="italic">{task.notes.trim()}</span>
                          </div>
                        )}
                        {task.subtask_tree && task.subtask_tree.length > 0 && (
                          <div className="mt-2 ml-3 pl-3 border-l border-gray-200 dark:border-gray-600 space-y-0.5">
                            {renderSubtaskTree(task.subtask_tree)}
                          </div>
                        )}
                      </div>
                    ))}
                    {(day.standalone_groups || []).map((g) => (
                      <div key={`grp-${g.parent_task_id}`} className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border-l-4 border-yellow-400 transition-base">
                        <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">{t('weeklyReport.standaloneGroup')}</p>
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">{g.parent_task_content}</span>
                          {g.total_subtasks > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{g.done_subtasks}/{g.total_subtasks} {t('weeklyReport.completedLabel')}</span>
                          )}
                          {g.parent_tags && <TagBadge tags={g.parent_tags} />}
                        </div>
                        {g.subtask_tree && g.subtask_tree.length > 0 && (
                          <div className="mt-2 ml-3 pl-3 border-l border-gray-200 dark:border-gray-600 space-y-0.5">
                            {renderSubtaskTree(g.subtask_tree)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 tracking-wide mb-2">{t('weeklyReport.summaryByTag')}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 transition-base space-y-4">
            {Object.entries(report.summary_by_tag).map(([tag, items]) => (
              <div key={tag}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-medium px-2 py-0.5 rounded">{tag}</span>
                  <span className="text-xs text-gray-400">{items.length} {t('weeklyReport.itemsWork')}</span>
                </div>
                <div className="space-y-2 ml-1">
                  {items.map((item, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border-l-4 border-blue-400 transition-base">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">{item.content}</span>
                        {item.total_subtasks > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">{item.done_subtasks}/{item.total_subtasks} {t('weeklyReport.completedLabel')}</span>
                        )}
                        {item.is_in_progress_parent && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">{t('weeklyReport.inProgressLabel')}</span>
                        )}
                      </div>
                      {item.subtask_tree && item.subtask_tree.length > 0 && (
                        <div className="mt-1.5 ml-3 pl-3 border-l border-gray-200 dark:border-gray-600 space-y-0.5">
                          {renderSubtaskTree(item.subtask_tree)}
                        </div>
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
