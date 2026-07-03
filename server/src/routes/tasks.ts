import { Router } from 'express';
import { getDb, saveTags } from '../db/index.js';

const router = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const status = req.query.status as string;
  const date = req.query.date as string;

  if (status === 'in_progress') {
    const rows = getDb().prepare(
      "SELECT * FROM tasks WHERE status = 'in_progress' ORDER BY created_at ASC"
    ).all();
    res.json(rows);
  } else if (date) {
    const rows = getDb().prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ? ORDER BY created_at DESC"
    ).all(date);
    res.json(rows);
  } else {
    const rows = getDb().prepare(
      "SELECT * FROM tasks WHERE status = 'completed' ORDER BY completed_at DESC"
    ).all();
    res.json(rows);
  }
});

router.post('/', (req, res) => {
  const { content, tags = '', status = 'in_progress' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const now = new Date().toISOString();
  const completedAt = status === 'completed' ? today() : null;
  const info = getDb().prepare(
    'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(content, tags, status, completedAt, now);
  saveTags(tags);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { content, tags, status } = req.body;
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  if (!task) return res.status(404).json({ error: 'task not found' });

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) updates.tags = tags;
  if (status !== undefined) {
    updates.status = status;
    updates.completed_at = status === 'completed' ? today() : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values);
  if (tags !== undefined) saveTags(tags);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
