/**
 * dataStore.js
 * Simple file-backed in-memory store for fixture rows.
 * Data is persisted to /data/fixtures.json (Docker volume).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_PATH = process.env.DATA_PATH || './data/fixtures.json';

function ensureDataDir() {
  const dir = dirname(DATA_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function load() {
  ensureDataDir();
  if (!existsSync(DATA_PATH)) return [];
  try {
    const raw = readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function save(rows) {
  ensureDataDir();
  writeFileSync(DATA_PATH, JSON.stringify(rows, null, 2), 'utf-8');
}

// In-memory cache
let rows = load();

export const store = {
  /** Return all rows, sorted by date then time */
  getAll() {
    return [...rows].sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return (a.time || '').localeCompare(b.time || '');
    });
  },

  /** Add a new row */
  add(row) {
    const newRow = { ...row, id: uuidv4() };
    rows.push(newRow);
    save(rows);
    return newRow;
  },

  /** Update a row by id */
  update(id, updates) {
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...updates, id };
    save(rows);
    return rows[idx];
  },

  /** Delete a row by id */
  delete(id) {
    const before = rows.length;
    rows = rows.filter(r => r.id !== id);
    if (rows.length === before) return false;
    save(rows);
    return true;
  },

  /** Replace all rows (used during CSV import) */
  replaceAll(newRows) {
    rows = newRows.map(r => ({ ...r, id: r.id || uuidv4() }));
    save(rows);
    return rows;
  },

  /** Append new rows without touching existing rows or their IDs */
  appendAll(newRows) {
    const added = newRows.map(r => ({ ...r, id: uuidv4() }));
    rows = [...rows, ...added];
    save(rows);
    return added;
  },

  /** Clear all data */
  clear() {
    rows = [];
    save(rows);
  }
};
