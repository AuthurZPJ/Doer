import { Router } from 'express';
import { getDb } from '../db/index.js';
import { todayStr } from '../utils/date.js';

const router = Router();

router.get('/', (req, res) => {
  const date = (req.query.date as string) || todayStr();
  const db = getDb();
  const inProgressTasks = db.prepare(
    "SELECT * FROM tasks WHERE status = 'in_progress' ORDER BY created_at ASC"
  ).all() as any[];
  const subtaskMap = new Map<number, any>();
  if (inProgressTasks.length > 0) {
    const subtaskCounts = db.prepare(
      `SELECT task_id,
         COUNT(*) as subtask_total,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as subtask_done
       FROM subtasks WHERE task_id IN (${inProgressTasks.map(() => '?').join(',')})
       GROUP BY task_id`
    ).all(inProgressTasks.map(t => t.id)) as any[];
    subtaskCounts.forEach(s => subtaskMap.set(s.task_id, s));
  }
  const inProgressTasksWithSubs = inProgressTasks.map(t => {
    const sc = subtaskMap.get(t.id);
    return { ...t, subtask_total: sc ? sc.subtask_total : 0, subtask_done: sc ? sc.subtask_done : 0 };
  });
  const meetings = db.prepare(
    'SELECT * FROM meetings WHERE meeting_date = ? ORDER BY created_at DESC'
  ).all(date);
  const todos = db.prepare(
    `SELECT * FROM todos WHERE status = 'pending'
     ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
     due_date ASC NULLS LAST, created_at ASC`
  ).all();
  const learnings = db.prepare(
    'SELECT * FROM learnings ORDER BY created_at DESC LIMIT 5'
  ).all();
  res.json({ inProgressTasks: inProgressTasksWithSubs, meetings, todos, learnings });
});

export default router;
