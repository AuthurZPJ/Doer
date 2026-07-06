import { Router } from 'express';
import { getDb, saveTags } from '../db/index.js';
import { todayStr } from '../utils/date.js';
import { isValidStatus, isValidDate } from '../utils/validate.js';

const router = Router();

router.get('/', (req, res) => {
  const status = req.query.status as string;
  const date = req.query.date as string;

  if (status === 'in_progress') {
    const rows = getDb().prepare(
      "SELECT * FROM tasks WHERE status = 'in_progress' ORDER BY sort_order ASC, created_at ASC"
    ).all();
    res.json(rows);
  } else if (date) {
    const rows = getDb().prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ? ORDER BY created_at DESC"
    ).all(date);
    res.json(rows);
  } else {
    const rows = getDb().prepare(
      "SELECT * FROM tasks WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 500"
    ).all();
    res.json(rows);
  }
});

router.post('/', (req, res) => {
  const { content, tags = '', notes = '', status = 'in_progress', due_date = null } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!isValidStatus(status)) return res.status(400).json({ error: 'invalid status' });
  if (!isValidDate(due_date)) return res.status(400).json({ error: 'invalid due_date' });
  const now = new Date().toISOString();
  const completedAt = status === 'completed' ? todayStr() : null;
  const info = getDb().prepare(
    'INSERT INTO tasks (content, tags, notes, status, due_date, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(content, tags, notes, status, due_date, completedAt, now);
  saveTags(tags);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { content, tags, notes, status, due_date } = req.body;
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  if (!task) return res.status(404).json({ error: 'task not found' });

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) updates.tags = tags;
  if (notes !== undefined) updates.notes = notes;
  if (due_date !== undefined) {
    if (!isValidDate(due_date)) return res.status(400).json({ error: 'invalid due_date' });
    updates.due_date = due_date;
  }
  if (status !== undefined) {
    if (!isValidStatus(status)) return res.status(400).json({ error: 'invalid status' });
    updates.status = status;
    updates.completed_at = status === 'completed' ? todayStr() : null;
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
  const info = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'task not found' });
  res.json({ ok: true });
});

router.patch('/reorder', (req, res) => {
  const { items } = req.body as { items: { id: number; sort_order: number }[] };
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  const db = getDb();
  const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ? AND status = ?');
  const tx = db.transaction(() => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id, 'in_progress');
    }
  });
  tx();
  res.json({ ok: true });
});

export default router;
