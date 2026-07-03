import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const rows = getDb().prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).all(taskId);
  res.json(rows);
});

router.post('/', (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const { content, parent_subtask_id = null } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const now = new Date().toISOString();
  const maxOrder = getDb().prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM subtasks WHERE task_id = ? AND parent_subtask_id IS ?'
  ).get(taskId, parent_subtask_id) as any;
  const sortOrder = (maxOrder.max_order ?? -1) + 1;
  const info = getDb().prepare(
    'INSERT INTO subtasks (task_id, parent_subtask_id, content, status, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(taskId, parent_subtask_id, content, 'pending', sortOrder, now);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req: Request, res: Response) => {
  const { content, status, sort_order, parent_subtask_id } = req.body;
  const db = getDb();
  const taskId = req.params.taskId as string;
  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ?').get(req.params.id, taskId) as any;
  if (!subtask) return res.status(404).json({ error: 'subtask not found' });

  const updates: Record<string, any> = {};
  if (content !== undefined) updates.content = content;
  if (status !== undefined) {
    updates.status = status;
    updates.done_at = status === 'done' ? new Date().toISOString() : null;
  }
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (parent_subtask_id !== undefined) updates.parent_subtask_id = parent_subtask_id;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE subtasks SET ${setClause} WHERE id = ? AND task_id = ?`).run(...values, taskId);
  res.json({ ok: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  getDb().prepare('DELETE FROM subtasks WHERE id = ? AND task_id = ?').run(req.params.id, taskId);
  res.json({ ok: true });
});

export default router;
