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

function dateOf(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

router.get('/', (req, res) => {
  const weekStartParam = (req.query.week_start as string) || getWeekStart(new Date().toISOString().slice(0, 10));
  const weekStart = getWeekStart(weekStartParam);
  const weekEnd = addDays(weekStart, 6);

  const db = getDb();
  const days: any[] = [];
  const summaryEntries: { content: string; tags: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);

    const completedTasks = db.prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ? ORDER BY created_at ASC"
    ).all(date) as any[];

    const tasksWithSubs = completedTasks.map(task => {
      const subtasks = db.prepare(
        "SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC"
      ).all(task.id) as any[];

      const doneSubs = subtasks.filter(s => s.status === 'done');

      if (doneSubs.length > 0) {
        summaryEntries.push({ content: task.content, tags: task.tags });
        for (const sub of doneSubs) {
          summaryEntries.push({ content: `  └ ${sub.content}`, tags: task.tags });
        }
      } else {
        summaryEntries.push({ content: task.content, tags: task.tags });
      }

      return { ...task, subtasks };
    });

    const doneSubtasksStandalone = db.prepare(
      `SELECT s.*, t.tags as parent_tags FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.status = 'done' AND date(s.done_at) = ? AND t.status != 'completed'
       ORDER BY s.done_at ASC`
    ).all(date) as any[];

    for (const sub of doneSubtasksStandalone) {
      summaryEntries.push({ content: `  └ ${sub.content} (主任务未完成)`, tags: sub.parent_tags });
    }

    days.push({ date, tasks: tasksWithSubs, standaloneSubtasks: doneSubtasksStandalone });
  }

  const summaryByTag: Record<string, string[]> = {};
  for (const entry of summaryEntries) {
    const tags = (entry.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      const key = '未分类';
      if (!summaryByTag[key]) summaryByTag[key] = [];
      summaryByTag[key].push(entry.content);
    } else {
      for (const tag of tags) {
        if (!summaryByTag[tag]) summaryByTag[tag] = [];
        summaryByTag[tag].push(entry.content);
      }
    }
  }

  res.json({ week_start: weekStart, week_end: weekEnd, days, summary_by_tag: summaryByTag });
});

export default router;
