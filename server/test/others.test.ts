import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, saveTagsWithDb } from './helpers';

describe('meetings table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a meeting', () => {
    const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO meetings (title, content, tags, meeting_date, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run('周会', '讨论了X', '周报', '2026-07-03', now);

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(meeting.title).toBe('周会');
    expect(meeting.content).toBe('讨论了X');
    expect(meeting.meeting_date).toBe('2026-07-03');
  });

  it('should query meetings by date', () => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO meetings (title, content, tags, meeting_date, created_at) VALUES (?, ?, ?, ?, ?)').run('会议1', '', '', '2026-07-03', now);
    db.prepare('INSERT INTO meetings (title, content, tags, meeting_date, created_at) VALUES (?, ?, ?, ?, ?)').run('会议2', '', '', '2026-07-04', now);

    const meetings = db.prepare('SELECT * FROM meetings WHERE meeting_date = ?').all('2026-07-03') as any[];
    expect(meetings).toHaveLength(1);
    expect(meetings[0].title).toBe('会议1');
  });
});

describe('learnings table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a learning', () => {
    const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO learnings (title, content, tags, created_at) VALUES (?, ?, ?, ?)'
    ).run('React Hooks', 'useEffect用法', '前端', now);

    const learning = db.prepare('SELECT * FROM learnings WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(learning.title).toBe('React Hooks');
    expect(learning.content).toBe('useEffect用法');
  });

  it('should query learnings ordered by created_at desc', () => {
    db.prepare('INSERT INTO learnings (title, content, tags, created_at) VALUES (?, ?, ?, ?)').run('旧', '', '', '2026-07-01T00:00:00Z');
    db.prepare('INSERT INTO learnings (title, content, tags, created_at) VALUES (?, ?, ?, ?)').run('新', '', '', '2026-07-03T00:00:00Z');

    const learnings = db.prepare('SELECT * FROM learnings ORDER BY created_at DESC').all() as any[];
    expect(learnings[0].title).toBe('新');
    expect(learnings[1].title).toBe('旧');
  });
});

describe('tags table', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('should insert a tag', () => {
    const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run('前端', '#3490dc');
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(tag.name).toBe('前端');
    expect(tag.color).toBe('#3490dc');
  });

  it('should enforce unique tag name', () => {
    db.prepare('INSERT INTO tags (name) VALUES (?)').run('前端');
    expect(() => {
      db.prepare('INSERT INTO tags (name) VALUES (?)').run('前端');
    }).toThrow();
  });

  it('should save tags from comma-separated string without duplicates', () => {
    saveTagsWithDb(db, '前端, 后端, 前端, 测试');
    const tags = db.prepare('SELECT * FROM tags ORDER BY id').all() as any[];
    expect(tags).toHaveLength(3);
    expect(tags.map(t => t.name)).toEqual(['前端', '后端', '测试']);
  });

  it('should not fail on empty or whitespace-only tags', () => {
    saveTagsWithDb(db, '');
    saveTagsWithDb(db, ' , , ');
    const tags = db.prepare('SELECT * FROM tags').all();
    expect(tags).toHaveLength(0);
  });

  it('should update tag name and color', () => {
    const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run('前端', '#3b82f6');
    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run('前端开发', '#ef4444', info.lastInsertRowid);
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid) as any;
    expect(tag.name).toBe('前端开发');
    expect(tag.color).toBe('#ef4444');
  });

  it('should delete a tag without affecting task records', () => {
    db.prepare('INSERT INTO tags (name) VALUES (?)').run('前端');
    const tagId = (db.prepare('SELECT * FROM tags WHERE name = ?').get('前端') as any).id;
    db.prepare('INSERT INTO tasks (content, tags, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('任务', '前端', 'in_progress', null, new Date().toISOString());
    db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
    expect(db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId)).toBeUndefined();
    const task = db.prepare('SELECT * FROM tasks WHERE content = ?').get('任务') as any;
    expect(task.tags).toBe('前端');
  });
});
