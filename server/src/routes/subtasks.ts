import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router({ mergeParams: true });

router.get('/', (req, res) => {
  const taskId = req.params.taskId;
  const rows = getDb().prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC'
  ).all(taskId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const taskId = req.params.taskId;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const now = new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)'
  ).run(taskId, content, 'pending', now);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { content, status } = req.body;
  const db = getDb();
  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id) as any;
  if (!subtask) return res.status(404).json({ error: 'subtask not found' });

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (status !== undefined) {
    updates.status = status;
    updates.done_at = status === 'done' ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE subtasks SET ${setClause} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
