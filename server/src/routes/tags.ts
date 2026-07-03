import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(rows);
});

export default router;
