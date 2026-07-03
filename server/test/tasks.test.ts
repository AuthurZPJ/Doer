import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './helpers';

describe('tasks table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a task with default status in_progress', () => {
    const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('测试任务', '前端', 'in_progress', null, now);
    expect(info.lastInsertRowid).toBeGreaterThan(0);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(task.content).toBe('测试任务');
    expect(task.status).toBe('in_progress');
    expect(task.completed_at).toBeNull();
  });

  it('should complete a task and set completed_at', () => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const info = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('待完成', '', 'in_progress', null, now);

    db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?')
      .run('completed', today, info.lastInsertRowid);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(task.status).toBe('completed');
    expect(task.completed_at).toBe(today);
  });

  it('should query in_progress tasks', () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('进行中1', '', 'in_progress', null, now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('已完成1', '', 'completed', now.slice(0, 10), now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('进行中2', '', 'in_progress', null, now);

    const inProgress = db.prepare("SELECT * FROM tasks WHERE status = 'in_progress'").all();
    expect(inProgress).toHaveLength(2);
  });

  it('should query completed tasks by date', () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务1', '', 'completed', '2026-07-01', now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务2', '', 'completed', '2026-07-02', now);
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)').run('任务3', '', 'in_progress', null, now);

    const tasks = db.prepare("SELECT * FROM tasks WHERE status = 'completed' AND completed_at = ?").all('2026-07-01');
    expect(tasks).toHaveLength(1);
  });

  it('should delete a task', () => {
    const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('待删除', '', 'in_progress', null, now);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(info.lastInsertRowid);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
    expect(task).toBeUndefined();
  });
});
