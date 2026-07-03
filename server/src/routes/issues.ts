import { Router } from 'express';
import { getDb, saveTags } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const status = (req.query.status as string) || 'open';
  const rows = getDb().prepare(
    'SELECT * FROM issues WHERE status = ? ORDER BY created_at DESC'
  ).all(status);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { content, tags = '', task_id = null } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const now = new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO issues (content, tags, status, task_id, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(content, tags, 'open', task_id, now);
  saveTags(tags);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { content, tags, status, task_id } = req.body;
  const db = getDb();
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id) as any;
  if (!issue) return res.status(404).json({ error: 'issue not found' });

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) updates.tags = tags;
  if (task_id !== undefined) updates.task_id = task_id;
  if (status !== undefined) {
    updates.status = status;
    updates.resolved_at = status === 'resolved' ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE issues SET ${setClause} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM issues WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
