/**
 * routes/fixtures.js
 * CRUD endpoints for fixture rows.
 */

import { Router } from 'express';
import { store } from '../store/dataStore.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(store.getAll());
});

router.post('/', (req, res) => {
  const { date, round, home, away, venue, category, grade, time } = req.body;

  if (!date) return res.status(400).json({ error: 'date is required' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  if (!home && !away) return res.status(400).json({ error: 'at least one of home or away is required' });

  const row = store.add({ date, round: round||'', home: home||'', away: away||'', venue: venue||'', category: category||'', grade: grade||'', time: time||'' });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { date } = req.body;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

  const updated = store.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Fixture not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (!store.delete(req.params.id)) return res.status(404).json({ error: 'Fixture not found' });
  res.json({ success: true });
});

router.delete('/', (req, res) => {
  store.clear();
  res.json({ success: true });
});

export default router;
