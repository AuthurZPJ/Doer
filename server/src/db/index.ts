import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '../../data');
const DB_PATH = join(DB_DIR, 'doer.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

let db: Database.Database;

export function initDb(): Database.Database {
  mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as any[];
  if (taskCols.length === 0) return;

  const hasStatus = taskCols.some(c => c.name === 'status');
  const completedAtCol = taskCols.find(c => c.name === 'completed_at');

  if (!hasStatus || (completedAtCol && completedAtCol.notnull === 1)) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
        completed_at TEXT,
        created_at TEXT NOT NULL
      );
      INSERT INTO tasks_new (id, content, tags, status, completed_at, created_at)
        SELECT id, content, tags,
          CASE WHEN ${hasStatus ? 'status' : "'completed'"} IN ('in_progress', 'completed')
            THEN ${hasStatus ? 'status' : "'completed'"} ELSE 'completed' END,
          completed_at, created_at
        FROM tasks;
      DROP TABLE tasks;
      ALTER TABLE tasks_new RENAME TO tasks;
    `);
  }

  const subtaskCols = db.prepare("PRAGMA table_info(subtasks)").all() as any[];
  if (subtaskCols.length > 0) {
    if (!subtaskCols.some(c => c.name === 'sort_order')) {
      db.exec("ALTER TABLE subtasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
    }
    if (!subtaskCols.some(c => c.name === 'parent_subtask_id')) {
      db.exec("ALTER TABLE subtasks ADD COLUMN parent_subtask_id INTEGER REFERENCES subtasks(id) ON DELETE CASCADE");
    }
  }

  const issueCols = db.prepare("PRAGMA table_info(issues)").all() as any[];
  if (issueCols.length > 0 && !issueCols.some(c => c.name === 'task_id')) {
    db.exec("ALTER TABLE issues ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL");
  }
}

export function getDb(): Database.Database {
  if (!db) {
    return initDb();
  }
  return db;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function saveTags(tagsStr: string): void {
  if (!tagsStr) return;
  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length === 0) return;
  const stmt = getDb().prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  for (const tag of tags) {
    stmt.run(tag);
  }
}
