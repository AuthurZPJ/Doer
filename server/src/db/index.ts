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
  return db;
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
