import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './helpers';

describe('subtasks table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a subtask linked to a task', () => {
    const now = new Date().toISOString();
    const taskInfo = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('主任务', '', 'in_progress', null, now);

    const subInfo = db.prepare(
      'INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)'
    ).run(taskInfo.lastInsertRowid, '子项1', 'pending', now);

    const sub = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subInfo.lastInsertRowid) as any;
    expect(sub.task_id).toBe(taskInfo.lastInsertRowid);
    expect(sub.content).toBe('子项1');
    expect(sub.status).toBe('pending');
    expect(sub.done_at).toBeNull();
  });

  it('should mark a subtask done with timestamp', () => {
    const now = new Date().toISOString();
    const taskInfo = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('主任务', '', 'in_progress', null, now);

    const subInfo = db.prepare(
      'INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)'
    ).run(taskInfo.lastInsertRowid, '子项1', 'pending', now);

    const doneTime = new Date().toISOString();
    db.prepare('UPDATE subtasks SET status = ?, done_at = ? WHERE id = ?').run('done', doneTime, subInfo.lastInsertRowid);

    const sub = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subInfo.lastInsertRowid) as any;
    expect(sub.status).toBe('done');
    expect(sub.done_at).toBe(doneTime);
  });

  it('should query subtasks by task_id ordered by created_at', () => {
    const now = new Date().toISOString();
    const taskInfo = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('主任务', '', 'in_progress', null, now);

    const taskId = taskInfo.lastInsertRowid;
    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)').run(taskId, '子项A', 'pending', '2026-07-01T10:00:00Z');
    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)').run(taskId, '子项B', 'pending', '2026-07-01T09:00:00Z');

    const subs = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC').all(taskId) as any[];
    expect(subs).toHaveLength(2);
    expect(subs[0].content).toBe('子项B');
    expect(subs[1].content).toBe('子项A');
  });

  it('should cascade delete subtasks when parent task is deleted', () => {
    const now = new Date().toISOString();
    const taskInfo = db.prepare(
      'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('主任务', '', 'in_progress', null, now);

    const taskId = taskInfo.lastInsertRowid;
    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)').run(taskId, '子项1', 'pending', now);
    db.prepare('INSERT INTO subtasks (task_id, content, status, created_at) VALUES (?, ?, ?, ?)').run(taskId, '子项2', 'pending', now);

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    const subs = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId);
    expect(subs).toHaveLength(0);
  });
});
