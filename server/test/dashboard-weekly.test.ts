import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './helpers';

describe('dashboard aggregation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should aggregate all modules for a given date', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('进行中', '前端', 'in_progress', null, now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('已完成', '后端', 'completed', today, now);
    db.prepare('INSERT INTO meetings (title, content, tags, meeting_date, created_at) VALUES (?, ?, ?, ?, ?)').run('会议1', '', '', today, now);
    db.prepare('INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('待办1', 'high', null, '', 'pending', now);
    db.prepare('INSERT INTO learnings (title, content, tags, created_at) VALUES (?, ?, ?, ?)').run('学习1', '', '', now);
    db.prepare('INSERT INTO issues (content, tags, status, created_at) VALUES (?, ?, ?, ?)').run('问题1', '', 'open', now);

    const inProgressTasks = db.prepare("SELECT * FROM tasks WHERE status = 'in_progress'").all();
    const completedTasks = db.prepare("SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ?").all(today);
    const meetings = db.prepare('SELECT * FROM meetings WHERE meeting_date = ?').all(today);
    const todos = db.prepare("SELECT * FROM todos WHERE status = 'pending'").all();
    const learnings = db.prepare('SELECT * FROM learnings ORDER BY created_at DESC LIMIT 5').all();
    const issues = db.prepare("SELECT * FROM issues WHERE status = 'open'").all();

    expect(inProgressTasks).toHaveLength(1);
    expect(completedTasks).toHaveLength(1);
    expect(meetings).toHaveLength(1);
    expect(todos).toHaveLength(1);
    expect(learnings).toHaveLength(1);
    expect(issues).toHaveLength(1);
  });

  it('should not include other dates in completed tasks', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('今天的', '', 'completed', today, now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('昨天的', '', 'completed', yesterday, now);

    const tasks = db.prepare("SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ?").all(today);
    expect(tasks).toHaveLength(1);
    expect((tasks[0] as any).content).toBe('今天的');
  });
});

describe('weekly report', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should group completed tasks by tag', () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务A', '前端', 'completed', '2026-06-29', now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务B', '前端', 'completed', '2026-06-30', now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务C', '后端', 'completed', '2026-07-01', now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务D', '', 'completed', '2026-07-02', now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('进行中', '前端', 'in_progress', null, now);

    const weekStart = '2026-06-29';
    const allTasks = db.prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at >= ? AND completed_at <= ?"
    ).all(weekStart, '2026-07-05') as any[];

    const summaryByTag: Record<string, string[]> = {};
    for (const task of allTasks) {
      const tags = (task.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tags.length === 0) {
        const key = '未分类';
        if (!summaryByTag[key]) summaryByTag[key] = [];
        summaryByTag[key].push(task.content);
      } else {
        for (const tag of tags) {
          if (!summaryByTag[tag]) summaryByTag[tag] = [];
          summaryByTag[tag].push(task.content);
        }
      }
    }

    expect(summaryByTag['前端']).toEqual(['任务A', '任务B']);
    expect(summaryByTag['后端']).toEqual(['任务C']);
    expect(summaryByTag['未分类']).toEqual(['任务D']);
    expect(summaryByTag['前端']).not.toContain('进行中');
  });

  it('should return empty summary for a week with no completed tasks', () => {
    const tasks = db.prepare(
      "SELECT * FROM tasks WHERE status = 'completed' AND completed_at >= ? AND completed_at <= ?"
    ).all('2026-01-01', '2026-01-07');
    expect(tasks).toHaveLength(0);
  });

  it('should include done subtasks of completed tasks in weekly report', () => {
    const now = new Date().toISOString();
    const taskInfo = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('开发Doer', '前端', 'completed', '2026-06-29', now);
    const taskId = taskInfo.lastInsertRowid;

    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at, done_at) VALUES (?, ?, ?, ?, ?)')
      .run(taskId, '设计数据库', 'done', now, '2026-06-29T10:00:00Z');
    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)')
      .run(taskId, '写API', 'pending', now);

    const doneSubs = db.prepare(
      "SELECT * FROM subtasks WHERE task_id = ? AND status = 'done'"
    ).all(taskId) as any[];

    expect(doneSubs).toHaveLength(1);
    expect(doneSubs[0].content).toBe('设计数据库');
  });

  it('should include done subtasks of in_progress tasks as standalone', () => {
    const now = new Date().toISOString();
    const taskInfo = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('大项目', '后端', 'in_progress', null, now);
    const taskId = taskInfo.lastInsertRowid;

    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at, done_at) VALUES (?, ?, ?, ?, ?)')
      .run(taskId, '子项1', 'done', now, '2026-06-29T10:00:00Z');

    const standalone = db.prepare(
      `SELECT s.*, t.tags as parent_tags FROM subtasks s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.status = 'done' AND date(s.done_at) = ? AND t.status != 'completed'`
    ).all('2026-06-29') as any[];

    expect(standalone).toHaveLength(1);
    expect(standalone[0].content).toBe('子项1');
    expect(standalone[0].parent_tags).toBe('后端');
  });
});
