import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) return res.json({ tasks: [], meetings: [], learnings: [], issues: [] });

  const db = getDb();
  const pattern = `%${q}%`;

  const tasks = db.prepare(
    "SELECT * FROM tasks WHERE content LIKE ? OR tags LIKE ? ORDER BY created_at DESC LIMIT 20"
  ).all(pattern, pattern);

  const meetings = db.prepare(
    "SELECT * FROM meetings WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY meeting_date DESC LIMIT 20"
  ).all(pattern, pattern, pattern);

  const learnings = db.prepare(
    "SELECT * FROM learnings WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY created_at DESC LIMIT 20"
  ).all(pattern, pattern, pattern);

  const issues = db.prepare(
    "SELECT * FROM issues WHERE content LIKE ? OR tags LIKE ? ORDER BY created_at DESC LIMIT 20"
  ).all(pattern, pattern);

  res.json({ tasks, meetings, learnings, issues });
});

export default router;
