import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './helpers';

describe('todos table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a todo with default status pending', () => {
    const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('待办事项', 'high', '2026-07-10', '后端', 'pending', now);

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(todo.content).toBe('待办事项');
    expect(todo.priority).toBe('high');
    expect(todo.status).toBe('pending');
    expect(todo.done_at).toBeNull();
  });

  it('should start a todo: mark done and auto-create in_progress task', () => {
    const now = new Date().toISOString();

    const todoInfo = db.prepare(
      'INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('完成报告', 'medium', null, '文档', 'pending', now);
    const todoId = todoInfo.lastInsertRowid;

    const tx = db.transaction(() => {
      db.prepare('UPDATE todos SET status = ?, done_at = ? WHERE id = ?').run('done', now, todoId);
      const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId) as any;
      db.prepare(
        'INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(todo.content, todo.tags, 'in_progress', null, now);
    });
    tx();

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId) as any;
    expect(todo.status).toBe('done');
    expect(todo.done_at).toBe(now);

    const tasks = db.prepare("SELECT * FROM tasks WHERE status = 'in_progress' AND content = ?").all('完成报告') as any[];
    expect(tasks).toHaveLength(1);
    expect(tasks[0].tags).toBe('文档');
    expect(tasks[0].completed_at).toBeNull();
  });

  it('should reject invalid priority', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        'INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('测试', 'invalid', null, '', 'pending', now);
    }).toThrow();
  });

  it('should query pending todos sorted by priority', () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('低', 'low', null, '', 'pending', now);
    db.prepare('INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('高', 'high', null, '', 'pending', now);
    db.prepare('INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('中', 'medium', null, '', 'pending', now);
    db.prepare('INSERT INTO todos (content, priority, due_date, tags, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('已完成', 'high', null, '', 'done', now);

    const pending = db.prepare(
      `SELECT * FROM todos WHERE status = 'pending'
       ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`
    ).all() as any[];
    expect(pending).toHaveLength(3);
    expect(pending[0].content).toBe('高');
    expect(pending[1].content).toBe('中');
    expect(pending[2].content).toBe('低');
  });
});
