import Database from 'better-sqlite3';
import { readFileSync, mkdtempSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../src/db/schema.sql');

export function createTestDb(): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'doer-test-'));
  const db = new Database(join(dir, 'test.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  return db;
}

export function saveTagsWithDb(db: Database.Database, tagsStr: string): void {
  if (!tagsStr) return;
  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length === 0) return;
  const stmt = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  for (const tag of tags) {
    stmt.run(tag);
  }
}
