import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

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

interface SubtaskNode {
  id: number;
  content: string;
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

router.get('/', (req, res) => {
  const weekStartParam = (req.query.week_start as string) || getWeekStart(new Date().toISOString().slice(0, 10));
  const weekStart = getWeekStart(weekStartParam);
  const weekEnd = addDays(weekStart, 6);

  const db = getDb();
  const days: any[] = [];
  const summaryItems: any[] = [];
  let totalDone = 0;
  let totalSubtasks = 0;
  const standaloneParentSeen = new Set<number>();

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);

    const completedTasks = db.prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ? ORDER BY created_at ASC"
    ).all(date) as any[];

    const tasksWithSubs = completedTasks.map(task => {
      const subtasks = db.prepare(
        "SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC"
      ).all(task.id) as any[];

      const doneCount = subtasks.filter(s => s.status === 'done').length;
      const tree = buildSubtaskTree(subtasks);

      totalDone += doneCount;
      totalSubtasks += subtasks.length;

      summaryItems.push({
        content: task.content,
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

    const standaloneRows = db.prepare(
      `SELECT s.*, t.tags as parent_tags, t.content as parent_content
       FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.status = 'done' AND date(s.done_at) = ? AND t.status != 'completed'
       ORDER BY s.done_at ASC`
    ).all(date) as any[];

    const groupMap = new Map<number, any>();
    for (const row of standaloneRows) {
      if (!groupMap.has(row.task_id)) {
        const totalOfParent = db.prepare(
          "SELECT COUNT(*) as c FROM subtasks WHERE task_id = ?"
        ).get(row.task_id) as any;
        groupMap.set(row.task_id, {
          parent_task_id: row.task_id,
          parent_task_content: row.parent_content,
          parent_tags: row.parent_tags,
          total_subtasks: totalOfParent.c,
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
    const keys = tags.length === 0 ? ['未分类'] : tags;
    for (const key of keys) {
      if (!summaryByTag[key]) summaryByTag[key] = [];
      summaryByTag[key].push({
        content: item.content,
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
