import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'doer-int-'));
process.env.DOER_DB_DIR = tmpDir;

const { app } = await import('../src/index.ts');
const { getDb } = await import('../src/db/index.ts');

beforeEach(() => {
  getDb().exec(
    'DELETE FROM subtasks; DELETE FROM tasks; DELETE FROM todos; DELETE FROM meetings; DELETE FROM learnings; DELETE FROM tags;'
  );
});

afterAll(() => {
  try { getDb().close(); } catch {}
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Tasks API', () => {
  it('POST /api/tasks with valid data returns 201 and id', async () => {
    const res = await request(app).post('/api/tasks').send({ content: 'my task', tags: 'work' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('number');
  });

  it('POST /api/tasks without content returns 400', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/tasks with invalid status returns 400', async () => {
    const res = await request(app).post('/api/tasks').send({ content: 'x', status: 'bogus' });
    expect(res.status).toBe(400);
  });

  it('GET /api/tasks?status=in_progress returns in_progress tasks', async () => {
    await request(app).post('/api/tasks').send({ content: 'ongoing' });
    await request(app).post('/api/tasks').send({ content: 'done one', status: 'completed' });
    const res = await request(app).get('/api/tasks?status=in_progress');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBe('ongoing');
  });

  it('GET /api/tasks?date= returns completed tasks for that date', async () => {
    const created = await request(app).post('/api/tasks').send({ content: 'finished', status: 'completed' });
    const all = await request(app).get('/api/tasks');
    const task = all.body.find((t: any) => t.id === created.body.id);
    const date = task.completed_at;
    const res = await request(app).get(`/api/tasks?date=${date}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((t: any) => t.id === created.body.id)).toBe(true);
  });

  it('PUT /api/tasks/:id with valid update returns 200', async () => {
    const created = await request(app).post('/api/tasks').send({ content: 'orig' });
    const res = await request(app).put(`/api/tasks/${created.body.id}`).send({ content: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('PUT /api/tasks/:id with invalid status returns 400', async () => {
    const created = await request(app).post('/api/tasks').send({ content: 'orig' });
    const res = await request(app).put(`/api/tasks/${created.body.id}`).send({ status: 'bogus' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/tasks/99999 returns 404', async () => {
    const res = await request(app).put('/api/tasks/99999').send({ content: 'x' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/tasks/:id returns 200', async () => {
    const created = await request(app).post('/api/tasks').send({ content: 'to delete' });
    const res = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('DELETE /api/tasks/99999 returns 404', async () => {
    const res = await request(app).delete('/api/tasks/99999');
    expect(res.status).toBe(404);
  });
});

describe('Todos API', () => {
  it('POST /api/todos with invalid priority returns 400', async () => {
    const res = await request(app).post('/api/todos').send({ content: 'x', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/todos/:id status=done auto-creates in_progress task', async () => {
    const created = await request(app).post('/api/todos').send({ content: 'finish report', tags: 'docs' });
    const res = await request(app).put(`/api/todos/${created.body.id}`).send({ status: 'done' });
    expect(res.status).toBe(200);
    const tasks = await request(app).get('/api/tasks?status=in_progress');
    expect(tasks.body.some((t: any) => t.content === 'finish report')).toBe(true);
  });
});

describe('Subtasks API', () => {
  it('POST /api/tasks/:taskId/subtasks returns 201', async () => {
    const task = await request(app).post('/api/tasks').send({ content: 'parent' });
    const res = await request(app).post(`/api/tasks/${task.body.id}/subtasks`).send({ content: 'child' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('GET /api/tasks/:taskId/subtasks returns ordered list', async () => {
    const task = await request(app).post('/api/tasks').send({ content: 'parent' });
    await request(app).post(`/api/tasks/${task.body.id}/subtasks`).send({ content: 'first' });
    await request(app).post(`/api/tasks/${task.body.id}/subtasks`).send({ content: 'second' });
    const res = await request(app).get(`/api/tasks/${task.body.id}/subtasks`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].content).toBe('first');
    expect(res.body[1].content).toBe('second');
  });

  it('DELETE /api/tasks/:taskId/subtasks/:id returns 200', async () => {
    const task = await request(app).post('/api/tasks').send({ content: 'parent' });
    const sub = await request(app).post(`/api/tasks/${task.body.id}/subtasks`).send({ content: 'child' });
    const res = await request(app).delete(`/api/tasks/${task.body.id}/subtasks/${sub.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('Tags API', () => {
  it('POST /api/tags with duplicate name returns 409', async () => {
    await request(app).post('/api/tags').send({ name: 'frontend' });
    const res = await request(app).post('/api/tags').send({ name: 'frontend' });
    expect(res.status).toBe(409);
  });

  it('GET /api/tags returns list', async () => {
    await request(app).post('/api/tags').send({ name: 'alpha' });
    await request(app).post('/api/tags').send({ name: 'beta' });
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Backup API', () => {
  it('POST /api/backup creates a backup file', async () => {
    const res = await request(app).post('/api/backup');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('filename');
    expect(res.body.filename).toMatch(/\.db$/);
  });

  it('GET /api/backup returns array of filenames', async () => {
    await request(app).post('/api/backup');
    const res = await request(app).get('/api/backup');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/backup/restore with invalid filename returns 400', async () => {
    const res = await request(app).post('/api/backup/restore').send({ filename: '../bad' });
    expect(res.status).toBe(400);
  });
});

describe('Search API', () => {
  it('GET /api/search?q= returns matched sections', async () => {
    await request(app).post('/api/tasks').send({ content: 'integration test task' });
    const res = await request(app).get('/api/search?q=integration');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(res.body).toHaveProperty('todos');
    expect(res.body).toHaveProperty('meetings');
    expect(res.body).toHaveProperty('learnings');
    expect(res.body.tasks.some((t: any) => t.content.includes('integration'))).toBe(true);
  });
});

describe('Weekly Report API', () => {
  it('GET /api/weekly-report returns report shape', async () => {
    const res = await request(app).get('/api/weekly-report');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('week_start');
    expect(res.body).toHaveProperty('week_end');
    expect(Array.isArray(res.body.days)).toBe(true);
    expect(res.body.days).toHaveLength(7);
    expect(res.body).toHaveProperty('summary_by_tag');
    expect(res.body).toHaveProperty('subtask_stats');
  });
});
