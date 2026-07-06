import { Router } from 'express';
import { getDb, saveTags } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = getDb().prepare(
    'SELECT * FROM learnings ORDER BY created_at DESC LIMIT 500'
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
  saveTags(tags);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { title, content, tags } = req.body;
  const db = getDb();
  const learning = db.prepare('SELECT * FROM learnings WHERE id = ?').get(req.params.id);
  if (!learning) return res.status(404).json({ error: 'learning not found' });
  const fields: string[] = [];
  const values: any[] = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
  if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE learnings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  if (tags !== undefined) saveTags(tags);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const info = getDb().prepare('DELETE FROM learnings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'learning not found' });
  res.json({ ok: true });
});

export default router;
