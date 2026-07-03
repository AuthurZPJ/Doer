import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './helpers';

describe('tasks table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a task', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const info = db.prepare(
      'INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)'
    ).run('测试任务', '前端', today, now);
    expect(info.lastInsertRowid).toBeGreaterThan(0);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(task.content).toBe('测试任务');
    expect(task.tags).toBe('前端');
    expect(task.completed_at).toBe(today);
  });

  it('should update a task', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const info = db.prepare(
      'INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)'
    ).run('旧内容', '', today, now);
    db.prepare('UPDATE tasks SET content = ?, tags = ? WHERE id = ?').run('新内容', '后端', info.lastInsertRowid);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(task.content).toBe('新内容');
    expect(task.tags).toBe('后端');
  });

  it('should delete a task', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const info = db.prepare(
      'INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)'
    ).run('待删除', '', today, now);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(info.lastInsertRowid);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
    expect(task).toBeUndefined();
  });

  it('should query tasks by date', () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)').run('任务1', '', '2026-07-01', now);
    db.prepare('INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)').run('任务2', '', '2026-07-02', now);
    db.prepare('INSERT INTO tasks (content, tags, completed_at, created_at) VALUES (?, ?, ?, ?)').run('任务3', '', '2026-07-01', now);

    const tasks = db.prepare('SELECT * FROM tasks WHERE completed_at = ? ORDER BY created_at DESC').all('2026-07-01');
    expect(tasks).toHaveLength(2);
  });
});
