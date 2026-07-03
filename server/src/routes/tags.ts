import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const info = getDb().prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name.trim(), color || null);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch {
    res.status(409).json({ error: '标签已存在' });
  }
});

router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  const updates: string[] = [];
  const values: any[] = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
  if (color !== undefined) { updates.push('color = ?'); values.push(color || null); }
  if (updates.length === 0) return res.status(400).json({ error: 'no fields to update' });
  values.push(req.params.id);
  try {
    getDb().prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: '标签名已存在' });
  }
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
