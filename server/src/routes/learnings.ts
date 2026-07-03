import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = getDb().prepare(
    'SELECT * FROM learnings ORDER BY created_at DESC'
  ).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { title, content = '', tags = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const now = new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO learnings (title, content, tags, created_at) VALUES (?, ?, ?, ?)'
  ).run(title, content, tags, now);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { title, content, tags } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
  if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });
  values.push(req.params.id);
  getDb().prepare(`UPDATE learnings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM learnings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
