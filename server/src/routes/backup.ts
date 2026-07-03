import { Router } from 'express';
import { getDb, getDbPath, initDb } from '../db/index.js';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
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

router.get('/', (_req, res) => {
  const dbPath = getDbPath();
  const backupDir = join(dirname(dbPath), 'backups');
  if (!existsSync(backupDir)) return res.json([]);
  const files = readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();
  res.json(files);
});

router.post('/restore', (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });

  const dbPath = getDbPath();
  const backupDir = join(dirname(dbPath), 'backups');
  const backupPath = join(backupDir, filename);

  if (!existsSync(backupPath)) return res.status(404).json({ error: 'backup file not found' });

  try {
    const db = getDb();
    db.close();
    copyFileSync(backupPath, dbPath);
    initDb();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'restore failed' });
  }
});

router.delete('/', (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });

  const dbPath = getDbPath();
  const backupDir = join(dirname(dbPath), 'backups');
  const backupPath = join(backupDir, filename);

  if (!existsSync(backupPath)) return res.status(404).json({ error: 'backup file not found' });

  const { unlinkSync } = require('fs');
  unlinkSync(backupPath);
  res.json({ ok: true });
});

export default router;
