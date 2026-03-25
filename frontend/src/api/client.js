/**
 * api/client.js
 * Thin wrapper around fetch for the backend API.
 */

const BASE = '/api';

async function request(method, path, body, isFormData = false) {
  const opts = {
    method,
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const j = await res.json(); message = j.error || message; } catch {}
    throw new Error(message);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/calendar') || ct.includes('text/csv')) return res.blob();
  return res.json();
}

export const api = {
  // Fixtures CRUD
  getFixtures:   ()        => request('GET',    '/fixtures'),
  addFixture:    (row)     => request('POST',   '/fixtures', row),
  updateFixture: (id, row) => request('PUT',    `/fixtures/${id}`, row),
  deleteFixture: (id)      => request('DELETE', `/fixtures/${id}`),
  clearFixtures: ()        => request('DELETE', '/fixtures'),

  // Import
  importCSV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/import/csv', fd, true);
  },

  // Export
  exportCSV:      ()                        => request('GET', '/export/csv'),
  exportTemplate: ()                        => request('GET', '/export/template'),
  exportICS: (name, club, category = '', team = '', groupBy = 'category') => {
    const p = new URLSearchParams();
    if (name)     p.set('name', name);
    if (club)     p.set('club', club);
    if (category) p.set('category', category);
    if (team)     p.set('team', team);
    if (groupBy && groupBy !== 'category') p.set('groupBy', groupBy);
    return request('GET', `/export/ics?${p}`);
  },

  // Metadata for subscribe panel
  getCategories: () => request('GET', '/export/categories'),
  getTeams:      () => request('GET', '/export/teams'),
};

/** Derive compact club slug from display name: "North Beach FC" → "northbeachfc" */
export function toClubSlug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mycal';
}

/** Trigger a file download from a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
