import { Router } from 'express';
import { getDb, getDbPath, initDb, closeDb } from '../db/index.js';
import { copyFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, renameSync } from 'fs';
import { dirname, join, basename } from 'path';

const router = Router();

function getBackupDir(): string {
  return join(dirname(getDbPath()), 'backups');
}

function isSafeFilename(filename: string): boolean {
  return filename === basename(filename) && !filename.includes('..') && !filename.includes('/') && !filename.includes('\\') && filename.endsWith('.db');
}

router.post('/', (_req, res) => {
  const db = getDb();
  db.pragma('wal_checkpoint(FULL)');
  const dbPath = getDbPath();
  const backupDir = getBackupDir();
  mkdirSync(backupDir, { recursive: true });
  const now = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const backupName = `doer_${now}.db`;
  const backupPath = join(backupDir, backupName);
  copyFileSync(dbPath, backupPath);
  res.json({ ok: true, filename: backupName });
});

router.get('/', (_req, res) => {
  const backupDir = getBackupDir();
  if (!existsSync(backupDir)) return res.json([]);
  const files = readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();
  res.json(files);
});

router.post('/restore', (req, res) => {
  const { filename } = req.body;
  if (!filename || !isSafeFilename(filename)) return res.status(400).json({ error: 'invalid filename' });

  const dbPath = getDbPath();
  const backupPath = join(getBackupDir(), filename);

  if (!existsSync(backupPath)) return res.status(404).json({ error: 'backup file not found' });

  try {
    closeDb();
    const preRestorePath = dbPath + '.pre-restore';
    copyFileSync(dbPath, preRestorePath);
    const tmpPath = dbPath + '.tmp';
    copyFileSync(backupPath, tmpPath);
    renameSync(tmpPath, dbPath);
    unlinkSync(preRestorePath);
    initDb();
    res.json({ ok: true });
  } catch (err) {
    console.error('Restore failed:', err);
    try {
      const preRestorePath = dbPath + '.pre-restore';
      if (existsSync(preRestorePath)) {
        renameSync(preRestorePath, dbPath);
      }
      initDb();
    } catch {}
    res.status(500).json({ error: 'restore failed' });
  }
});

router.delete('/', (req, res) => {
  const { filename } = req.body;
  if (!filename || !isSafeFilename(filename)) return res.status(400).json({ error: 'invalid filename' });

  const backupPath = join(getBackupDir(), filename);

  if (!existsSync(backupPath)) return res.status(404).json({ error: 'backup file not found' });

  unlinkSync(backupPath);
  res.json({ ok: true });
});

export default router;
