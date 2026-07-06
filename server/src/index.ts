import express from 'express';
import cors from 'cors';
import { initDb, closeDb, getDb } from './db/index.js';
import tasksRouter from './routes/tasks.js';
import todosRouter from './routes/todos.js';
import meetingsRouter from './routes/meetings.js';
import learningsRouter from './routes/learnings.js';
import dashboardRouter from './routes/dashboard.js';
import weeklyReportRouter from './routes/weekly-report.js';
import tagsRouter from './routes/tags.js';
import backupRouter from './routes/backup.js';
import subtasksRouter from './routes/subtasks.js';
import searchRouter from './routes/search.js';

export const app = express();
const PORT = 3001;

app.use(cors({ origin: (origin, cb) => {
  if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) cb(null, true);
  else cb(new Error('CORS not allowed'));
} }));
app.use(express.json());

initDb();
console.log('Database initialized');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tasks', tasksRouter);
app.use('/api/tasks/:taskId/subtasks', subtasksRouter);

app.get('/api/subtasks', (req, res) => {
  const ids = String(req.query.task_ids || '').split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return res.json({});
  const ph = ids.map(() => '?').join(',');
  const rows = getDb().prepare(
    `SELECT * FROM subtasks WHERE task_id IN (${ph}) ORDER BY sort_order ASC, created_at ASC`
  ).all(...ids) as any[];
  const map: Record<number, any[]> = {};
  for (const r of rows) {
    if (!map[r.task_id]) map[r.task_id] = [];
    map[r.task_id].push(r);
  }
  res.json(map);
});
app.use('/api/todos', todosRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/learnings', learningsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/weekly-report', weeklyReportRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/search', searchRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

if (!process.env.VITEST) {
  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  function shutdown() {
    closeDb();
    server.close();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('message', (msg: unknown) => { if (msg === 'shutdown') shutdown(); });
  process.on('beforeExit', () => { closeDb(); });
}
