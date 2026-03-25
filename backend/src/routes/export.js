/**
 * routes/export.js
 * Import/export endpoints for CSV and ICS formats.
 */

import { Router } from 'express';
import multer from 'multer';
import { store } from '../store/dataStore.js';
import { parseCSV, rowsToCSV, TEMPLATE_CSV } from '../services/csvService.js';
import { generateICS } from '../services/icsService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/import/csv — replace all fixtures from CSV upload
router.post('/import/csv', upload.single('file'), (req, res) => {
  try {
    let csvText = req.file ? req.file.buffer.toString('utf-8') : req.body.csv;
    if (!csvText) return res.status(400).json({ error: 'No CSV data provided.' });

    const rows = parseCSV(csvText);
    const saved = store.replaceAll(rows);
    res.json({ success: true, imported: saved.length, message: `Imported ${saved.length} fixture rows` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/import/csv/append — add fixtures from CSV without touching existing rows
router.post('/import/csv/append', upload.single('file'), (req, res) => {
  try {
    let csvText = req.file ? req.file.buffer.toString('utf-8') : req.body.csv;
    if (!csvText) return res.status(400).json({ error: 'No CSV data provided.' });

    const rows = parseCSV(csvText);
    const added = store.appendAll(rows);
    res.json({ success: true, imported: added.length, message: `Appended ${added.length} fixture rows` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/export/csv — download all fixtures as CSV
router.get('/export/csv', (req, res) => {
  const rows = store.getAll();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fixtures.csv"');
  res.send(rowsToCSV(rows));
});

// GET /api/export/template — download empty CSV template (headers only)
router.get('/export/template', (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fixtures-template.csv"');
  res.send(TEMPLATE_CSV);
});

// GET /api/export/ics — download ICS calendar
//   ?name=    Calendar display name
//   ?club=    Club slug for UIDs (derived from name if omitted)
//   ?category= Filter to one category (e.g. "Seniors")
//   ?team=     Filter to one team name (e.g. "North Beach FC")
router.get('/export/ics', (req, res) => {
  const rows           = store.getAll();
  const calName        = req.query.name     || 'Sports Fixtures';
  const club           = req.query.club     || '';
  const categoryFilter = req.query.category || '';
  const teamFilter     = req.query.team     || '';
  const groupBy        = req.query.groupBy  || 'category';

  const ics = generateICS(rows, calName, club, categoryFilter, teamFilter, groupBy);

  const filePart = [categoryFilter, teamFilter].filter(Boolean).join('-');
  const filename = filePart ? `calendar-${filePart.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics` : 'calendar.ics';

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.send(ics);
});

// GET /api/export/categories — list unique categories in current data
router.get('/export/categories', (req, res) => {
  const rows = store.getAll();
  const categories = [...new Set(
    rows.map(r => r.category?.trim() || r.grade?.trim()).filter(Boolean)
  )].sort();
  res.json({ categories });
});

// GET /api/export/teams — list unique team names (home + away) in current data
router.get('/export/teams', (req, res) => {
  const rows = store.getAll();
  const teams = [...new Set([
    ...rows.map(r => r.home?.trim()),
    ...rows.map(r => r.away?.trim()),
    ...rows.map(r => r.opponent?.trim()), // backward compat
  ].filter(Boolean))].sort();
  res.json({ teams });
});

export default router;
