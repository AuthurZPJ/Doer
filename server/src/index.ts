import express from 'express';
import cors from 'cors';
import { initDb } from './db/index.js';
import tasksRouter from './routes/tasks.js';
import todosRouter from './routes/todos.js';
import meetingsRouter from './routes/meetings.js';
import learningsRouter from './routes/learnings.js';
import issuesRouter from './routes/issues.js';
import dashboardRouter from './routes/dashboard.js';
import weeklyReportRouter from './routes/weekly-report.js';
import tagsRouter from './routes/tags.js';
import backupRouter from './routes/backup.js';
import subtasksRouter from './routes/subtasks.js';
import searchRouter from './routes/search.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDb();
console.log('Database initialized');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tasks', tasksRouter);
app.use('/api/tasks/:taskId/subtasks', subtasksRouter);
app.use('/api/todos', todosRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/learnings', learningsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/weekly-report', weeklyReportRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/search', searchRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
