import { Router } from 'express';
import { getDb, saveTags } from '../db/index.js';
import { isValidDate } from '../utils/validate.js';

const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date as string;
  if (date) {
    const rows = getDb().prepare(
      'SELECT * FROM meetings WHERE meeting_date = ? ORDER BY created_at DESC'
    ).all(date);
    res.json(rows);
  } else {
    const rows = getDb().prepare(
      'SELECT * FROM meetings ORDER BY meeting_date DESC, created_at DESC'
    ).all();
    res.json(rows);
  }
});

router.post('/', (req, res) => {
  const { title, content = '', tags = '', meeting_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!meeting_date) return res.status(400).json({ error: 'meeting_date is required' });
  if (!isValidDate(meeting_date)) return res.status(400).json({ error: 'invalid meeting_date' });
  const now = new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO meetings (title, content, tags, meeting_date, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(title, content, tags, meeting_date, now);
  saveTags(tags);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { title, content, tags, meeting_date } = req.body;
  const db = getDb();
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'meeting not found' });
  const fields: string[] = [];
  const values: any[] = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
  if (meeting_date !== undefined) {
    if (!isValidDate(meeting_date)) return res.status(400).json({ error: 'invalid meeting_date' });
    fields.push('meeting_date = ?'); values.push(meeting_date);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  if (tags !== undefined) saveTags(tags);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const info = getDb().prepare('DELETE FROM meetings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'meeting not found' });
  res.json({ ok: true });
});

export default router;
