import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const date = (req.query.date as string) || today();
  const rows = getDb().prepare(
    'SELECT * FROM tasks WHERE completed_at = ? ORDER BY created_at DESC'
  ).all(date);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { content, tags = '' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const now = new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(content, tags, today(), now);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { content, tags } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
  if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });
  values.push(req.params.id);
  getDb().prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
