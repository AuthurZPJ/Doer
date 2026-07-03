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

router.get('/', (req, res) => {
  const weekStartParam = (req.query.week_start as string) || getWeekStart(new Date().toISOString().slice(0, 10));
  const weekStart = getWeekStart(weekStartParam);

  const db = getDb();
  const days = [];
  const allTasks: any[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const tasks = db.prepare(
      'SELECT * FROM tasks WHERE completed_at = ? ORDER BY created_at ASC'
    ).all(date) as any[];
    days.push({ date, tasks });
    allTasks.push(...tasks);
  }

  const summaryByTag: Record<string, string[]> = {};
  for (const task of allTasks) {
    const tags = (task.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      const key = '未分类';
      if (!summaryByTag[key]) summaryByTag[key] = [];
      summaryByTag[key].push(task.content);
    } else {
      for (const tag of tags) {
        if (!summaryByTag[tag]) summaryByTag[tag] = [];
        summaryByTag[tag].push(task.content);
      }
    }
  }

  res.json({ week_start: weekStart, days, summary_by_tag: summaryByTag });
});

export default router;
