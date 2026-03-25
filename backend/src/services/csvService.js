/**
 * csvService.js
 * CSV parsing and generation.
 *
 * Current format:
 *   Date,Round,Home,Away,Venue,Category,Grade,Time
 *
 * Backward-compatible with old format:
 *   Date,Round,Opponent,Location,Category,Grade,Time
 *   → Opponent+Location are converted to Home+Away on import.
 */

import { parse }    from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { v4 as uuidv4 } from 'uuid';

export const CSV_COLUMNS  = ['Date', 'Round', 'Home', 'Away', 'Venue', 'Category', 'Grade', 'Time'];
export const TEMPLATE_CSV = CSV_COLUMNS.join(',') + '\n';

export function parseCSV(csvText) {
  if (!csvText?.trim()) return [];

  const records = parse(csvText.trim(), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const rows = [];
  for (const record of records) {
    // Normalise column names (case-insensitive)
    const n = {};
    for (const [k, v] of Object.entries(record)) n[k.toLowerCase().trim()] = (v || '').trim();

    const date     = n['date']     || '';
    const round    = n['round']    || '';
    const category = n['category'] || '';
    const grade    = n['grade']    || '';
    const time     = n['time']     || '';

    // Skip empty rows
    if (!date && !n['home'] && !n['away'] && !n['opponent']) continue;

    // Determine home/away — support both old and new format
    let home, away, venue;
    if (n['home'] !== undefined || n['away'] !== undefined) {
      // New format
      home  = n['home']  || '';
      away  = n['away']  || '';
      venue = n['venue'] || '';
    } else {
      // Old format: Opponent + Location → derive home/away
      const opponent = n['opponent'] || '';
      const location = (n['location'] || '').toLowerCase();
      if (location === 'away') {
        home  = opponent;       // opponent is at home
        away  = '[Your Club]';  // we are away
      } else {
        home  = '[Your Club]';  // we are at home
        away  = opponent;
      }
      venue = (location !== 'home' && location !== 'away') ? (n['location'] || '') : '';
    }

    // Validate date
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error(`Invalid date "${date}" — use YYYY-MM-DD (e.g. 2026-05-12)`);

    // Validate time
    if (time && !/^\d{1,2}:\d{2}$/.test(time))
      throw new Error(`Invalid time "${time}" — use HH:MM (e.g. 15:30)`);

    rows.push({ id: uuidv4(), date, round, home, away, venue, category, grade, time });
  }

  return rows;
}

export function rowsToCSV(rows) {
  const data = rows.map(r => ({
    Date:     r.date     || '',
    Round:    r.round    || '',
    Home:     r.home     || '',
    Away:     r.away     || '',
    Venue:    r.venue    || '',
    Category: r.category || '',
    Grade:    r.grade    || '',
    Time:     r.time     || '',
  }));
  return stringify(data, { header: true, columns: CSV_COLUMNS });
}
