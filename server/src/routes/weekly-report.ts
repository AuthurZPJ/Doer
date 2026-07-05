import { Router } from 'express';
import { getDb } from '../db/index.js';
import { todayStr, toDateStr, parseLocalDate } from '../utils/date.js';

const router = Router();

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

interface SubtaskNode {
  id: number;
  content: string;
  notes: string;
  status: string;
  parent_subtask_id: number | null;
  children: SubtaskNode[];
}

function buildSubtaskTree(subtasks: any[]): SubtaskNode[] {
  const done = subtasks.filter(s => s.status === 'done');
  const byId = new Map<number, SubtaskNode>();
  for (const s of done) {
    byId.set(s.id, {
      id: s.id,
      content: s.content,
      notes: s.notes || '',
      status: s.status,
      parent_subtask_id: s.parent_subtask_id ?? null,
      children: [],
    });
  }
  const roots: SubtaskNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_subtask_id != null ? byId.get(node.parent_subtask_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function placeholders(n: number): string {
  return new Array(n).fill('?').join(',');
}

router.get('/', (req, res) => {
  const weekStartParam = (req.query.week_start as string) || getWeekStart(todayStr());
  const weekStart = getWeekStart(weekStartParam);
  const weekEnd = addDays(weekStart, 6);

  const db = getDb();
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) weekDates.push(addDays(weekStart, i));

  const completedTasksByDate = new Map<string, any[]>();
  const allCompletedTaskIds: number[] = [];
  for (const date of weekDates) {
    const tasks = db.prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ? ORDER BY created_at ASC"
    ).all(date) as any[];
    completedTasksByDate.set(date, tasks);
    for (const t of tasks) allCompletedTaskIds.push(t.id);
  }

  const subtaskMap = new Map<number, any[]>();
  if (allCompletedTaskIds.length > 0) {
    const ph = placeholders(allCompletedTaskIds.length);
    const allSubs = db.prepare(
      `SELECT * FROM subtasks WHERE task_id IN (${ph}) ORDER BY created_at ASC`
    ).all(...allCompletedTaskIds) as any[];
    for (const s of allSubs) {
      if (!subtaskMap.has(s.task_id)) subtaskMap.set(s.task_id, []);
      subtaskMap.get(s.task_id)!.push(s);
    }
  }

  const standaloneByDate = new Map<string, any[]>();
  const allStandaloneTaskIds = new Set<number>();
  for (const date of weekDates) {
    const rows = db.prepare(
      `SELECT s.*, t.tags as parent_tags, t.content as parent_content, t.notes as parent_notes
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.status = 'done' AND date(s.done_at, 'localtime') = ? AND t.status != 'completed'
       ORDER BY s.done_at ASC`
    ).all(date) as any[];
    standaloneByDate.set(date, rows);
    for (const r of rows) allStandaloneTaskIds.add(r.task_id);
  }

  const parentCountMap = new Map<number, number>();
  if (allStandaloneTaskIds.size > 0) {
    const ids = Array.from(allStandaloneTaskIds);
    const ph = placeholders(ids.length);
    const counts = db.prepare(
      `SELECT task_id, COUNT(*) as c FROM subtasks WHERE task_id IN (${ph}) GROUP BY task_id`
    ).all(...ids) as any[];
    for (const row of counts) parentCountMap.set(row.task_id, row.c);
  }

  const days: any[] = [];
  const summaryItems: any[] = [];
  let totalDone = 0;
  let totalSubtasks = 0;
  const standaloneParentSeen = new Set<number>();

  for (const date of weekDates) {
    const completedTasks = completedTasksByDate.get(date) || [];

    const tasksWithSubs = completedTasks.map(task => {
      const subtasks = subtaskMap.get(task.id) || [];
      const doneCount = subtasks.filter(s => s.status === 'done').length;
      const tree = buildSubtaskTree(subtasks);

      totalDone += doneCount;
      totalSubtasks += subtasks.length;

      summaryItems.push({
        content: task.content,
        notes: task.notes || '',
        done_subtasks: doneCount,
        total_subtasks: subtasks.length,
        subtask_tree: tree,
        is_in_progress_parent: false,
        tags: task.tags,
      });

      return {
        ...task,
        done_subtasks: doneCount,
        total_subtasks: subtasks.length,
        subtask_tree: tree,
      };
    });

    const standaloneRows = standaloneByDate.get(date) || [];
    const groupMap = new Map<number, any>();
    for (const row of standaloneRows) {
      if (!groupMap.has(row.task_id)) {
        groupMap.set(row.task_id, {
          parent_task_id: row.task_id,
          parent_task_content: row.parent_content,
          parent_tags: row.parent_tags,
          parent_notes: row.parent_notes || '',
          total_subtasks: parentCountMap.get(row.task_id) || 0,
          rows: [],
        });
      }
      groupMap.get(row.task_id).rows.push(row);
    }

    const standaloneGroups = Array.from(groupMap.values()).map(g => {
      const doneCount = g.rows.length;
      const tree = buildSubtaskTree(g.rows);

      totalDone += doneCount;
      if (!standaloneParentSeen.has(g.parent_task_id)) {
        standaloneParentSeen.add(g.parent_task_id);
        totalSubtasks += g.total_subtasks;
      }

      summaryItems.push({
        content: g.parent_task_content,
        notes: g.parent_notes,
        done_subtasks: doneCount,
        total_subtasks: g.total_subtasks,
        subtask_tree: tree,
        is_in_progress_parent: true,
        tags: g.parent_tags,
      });

      return {
        parent_task_id: g.parent_task_id,
        parent_task_content: g.parent_task_content,
        parent_tags: g.parent_tags,
        done_subtasks: doneCount,
        total_subtasks: g.total_subtasks,
        subtask_tree: tree,
      };
    });

    days.push({ date, tasks: tasksWithSubs, standalone_groups: standaloneGroups });
  }

  const summaryByTag: Record<string, any[]> = {};
  for (const item of summaryItems) {
    const tags = String(item.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const keys = tags.length === 0 ? ['untagged'] : tags;
    for (const key of keys) {
      if (!summaryByTag[key]) summaryByTag[key] = [];
      summaryByTag[key].push({
        content: item.content,
        notes: item.notes,
        done_subtasks: item.done_subtasks,
        total_subtasks: item.total_subtasks,
        subtask_tree: item.subtask_tree,
        is_in_progress_parent: item.is_in_progress_parent,
      });
    }
  }

  res.json({
    week_start: weekStart,
    week_end: weekEnd,
    days,
    summary_by_tag: summaryByTag,
    subtask_stats: { total_done: totalDone, total_subtasks: totalSubtasks },
  });
});

export default router;
