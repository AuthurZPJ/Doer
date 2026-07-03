import { Router } from 'express';
import { getDb, saveTags } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const status = (req.query.status as string) || 'pending';
  const rows = getDb().prepare(
    `SELECT * FROM todos WHERE status = ?
     ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
     due_date ASC NULLS LAST, created_at ASC`
  ).all(status);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { content, priority = 'medium', due_date = null, tags = '' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const now = new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(content, priority, due_date, tags, 'pending', now);
  saveTags(tags);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { content, priority, due_date, tags, status } = req.body;
  const db = getDb();
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id) as any;
  if (!todo) return res.status(404).json({ error: 'todo not found' });

  const wasPending = todo.status === 'pending';
  const now = new Date().toISOString();

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (priority !== undefined) updates.priority = priority;
  if (due_date !== undefined) updates.due_date = due_date;
  if (tags !== undefined) updates.tags = tags;
  if (status !== undefined) {
    updates.status = status;
    updates.done_at = status === 'done' ? now : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];

  const tx = db.transaction(() => {
    db.prepare(`UPDATE todos SET ${setClause} WHERE id = ?`).run(...values);
    if (wasPending && status === 'done') {
      db.prepare(
        'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(todo.content, todo.tags || updates.tags || '', 'in_progress', null, now);
    }
  });
  tx();
  if (tags !== undefined) saveTags(tags);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
