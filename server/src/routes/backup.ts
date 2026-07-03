import { Router } from 'express';
import { getDb, getDbPath } from '../db/index.js';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const router = Router();

router.post('/', (_req, res) => {
  const db = getDb();
  db.pragma('wal_checkpoint(FULL)');
  const dbPath = getDbPath();
  const backupDir = join(dirname(dbPath), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const now = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const backupName = `doer_${now}.db`;
  const backupPath = join(backupDir, backupName);
  copyFileSync(dbPath, backupPath);
  res.json({ ok: true, path: backupPath, filename: backupName });
});

export default router;
