import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const date = (req.query.date as string) || today();
  const db = getDb();
  const inProgressTasks = db.prepare(
    "SELECT * FROM tasks WHERE status = 'in_progress' ORDER BY created_at ASC"
  ).all();
  const completedTasks = db.prepare(
    "SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ? ORDER BY created_at DESC"
  ).all(date);
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
  const issues = db.prepare(
    `SELECT * FROM issues WHERE status = 'open' ORDER BY created_at DESC`
  ).all();
  res.json({ inProgressTasks, completedTasks, meetings, todos, learnings, issues });
});

export default router;
