import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  const db = getDb();

  const completedTasks = db.prepare(
    "SELECT * FROM tasks WHERE status = 'completed' AND completed_at >= ? AND completed_at <= ? ORDER BY completed_at ASC"
  ).all(monthStart, monthEnd) as any[];

  const tagCount: Record<string, number> = {};
  for (const task of completedTasks) {
    const tags = (task.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      tagCount['未分类'] = (tagCount['未分类'] || 0) + 1;
    } else {
      for (const tag of tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
  }

  const meetings = db.prepare(
    "SELECT * FROM meetings WHERE meeting_date >= ? AND meeting_date <= ? ORDER BY meeting_date ASC"
  ).all(monthStart, monthEnd) as any[];

  const issuesCreated = db.prepare(
    "SELECT * FROM issues WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC"
  ).all(`${monthStart}T00:00:00Z`, `${monthEnd}T23:59:59Z`) as any[];

  const issuesResolved = issuesCreated.filter(i => i.status === 'resolved');

  res.json({
    month,
    completed_tasks_count: completedTasks.length,
    tag_distribution: tagCount,
    meetings_count: meetings.length,
    issues_created: issuesCreated.length,
    issues_resolved: issuesResolved.length,
    resolution_rate: issuesCreated.length > 0 ? Math.round((issuesResolved.length / issuesCreated.length) * 100) : 0,
  });
});

export default router;
