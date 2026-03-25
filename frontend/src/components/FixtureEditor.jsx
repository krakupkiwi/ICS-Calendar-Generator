/**
 * FixtureEditor.jsx
 * Spreadsheet-style editor. Each row = one grade on one match day.
 *
 * Columns: Date | Round | Home | Away | Venue | Category | Grade | Kick-off | Actions
 */

import React, { useState } from 'react';
import styles from './FixtureEditor.module.css';

const CATEGORIES = ['Seniors','Reserves','Juniors','Womens','Masters','Open Age','Touch','Other'];
const GRADES     = ['First Grade','Reserve Grade','A Grade','B Grade','U/18','U/16','U/14','U/12','Womens League Tag','Womens Open','Masters 35s','Touch Football','Other'];
const EMPTY_ROW  = { date:'', round:'', home:'', away:'', venue:'', category:'', grade:'', time:'' };

function GradeBadge({ grade }) {
  const color = gradeColor(grade);
  return <span className={styles.badge} style={{ '--badge-color': color }}>{grade || '—'}</span>;
}

function CategoryBadge({ category }) {
  return category
    ? <span className={styles.catBadge}>{category}</span>
    : <span className={styles.catEmpty}>—</span>;
}

function gradeColor(grade) {
  const g = (grade||'').toLowerCase();
  if (g.includes('first')||g.includes('a grade'))   return 'var(--grade-1)';
  if (g.includes('reserve')||g.includes('b grade')) return 'var(--grade-2)';
  if (g.includes('u/18')||g.includes('u18'))        return 'var(--grade-3)';
  if (g.includes('women')||g.includes('league tag')) return 'var(--grade-4)';
  if (g.includes('u/16')||g.includes('u16'))        return 'var(--grade-5)';
  if (g.includes('u/14')||g.includes('u14'))        return 'var(--grade-6)';
  return 'var(--text-secondary)';
}

function formatDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function FixtureEditor({ rows, onAdd, onUpdate, onDelete, loading, error }) {
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [adding, setAdding]   = useState(false);
  const [newRow, setNewRow]   = useState({ ...EMPTY_ROW });
  const [busy, setBusy]       = useState(false);
  const [rowError, setRowError] = useState(null);

  const grouped = groupByDate(rows);

  function startEdit(row) { setEditing(row.id); setEditData({ ...row }); setRowError(null); }
  function cancelEdit()   { setEditing(null); setEditData({}); setRowError(null); }

  async function saveEdit() {
    if (!validate(editData)) return;
    setBusy(true);
    try { await onUpdate(editing, editData); setEditing(null); setEditData({}); }
    catch (e) { setRowError(e.message); }
    finally { setBusy(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this fixture row?')) return;
    setBusy(true);
    try { await onDelete(id); }
    catch (e) { setRowError(e.message); }
    finally { setBusy(false); }
  }

  function startAdd() {
    setAdding(true);
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      setNewRow({ ...EMPTY_ROW, date: last.date, round: last.round, home: last.home, away: last.away, venue: last.venue, category: last.category });
    } else {
      setNewRow({ ...EMPTY_ROW });
    }
    setRowError(null);
  }

  function cancelAdd() { setAdding(false); setNewRow({ ...EMPTY_ROW }); setRowError(null); }

  async function saveAdd() {
    if (!validate(newRow)) return;
    setBusy(true);
    try { await onAdd(newRow); setAdding(false); }
    catch (e) { setRowError(e.message); }
    finally { setBusy(false); }
  }

  function validate(row) {
    if (!row.date)  { setRowError('Date is required'); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) { setRowError('Date must be YYYY-MM-DD'); return false; }
    if (!row.home && !row.away) { setRowError('At least one of Home or Away is required'); return false; }
    if (row.time && !/^\d{1,2}:\d{2}$/.test(row.time)) { setRowError('Time must be HH:MM'); return false; }
    setRowError(null); return true;
  }

  if (loading) return <div className={styles.loading}>Loading fixtures…</div>;
  if (error)   return (
    <div className={styles.errorBanner}>
      ⚠ Could not load fixtures: {error}
      <br /><small>Is the backend running? Try: <code>docker-compose up</code></small>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      {rowError && <div className={styles.rowError}>{rowError}</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Round</th>
              <th>Home Team</th>
              <th>Away Team</th>
              <th>Venue</th>
              <th title="Groups rows into ICS events — used in event UIDs">
                Category <span className={styles.uidHint}>= UID</span>
              </th>
              <th>Grade</th>
              <th>Kick-off</th>
              <th className={styles.actionsCol}></th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && !adding && (
              <tr><td colSpan={9} className={styles.emptyCell}>
                No fixtures yet. Click "+ Add Fixture Row" below or import a CSV.
              </td></tr>
            )}

            {grouped.map(({ dateKey, rows: dayRows }) => (
              <React.Fragment key={dateKey}>
                {dayRows.map((row, idx) => (
                  editing === row.id ? (
                    <EditRow key={row.id} data={editData} onChange={setEditData} onSave={saveEdit} onCancel={cancelEdit} busy={busy} />
                  ) : (
                    <tr key={row.id} className={idx === 0 ? styles.firstInGroup : ''}>
                      <td className={styles.dateCell}>
                        {idx === 0
                          ? <span className={styles.dateVal}>{formatDate(row.date)}</span>
                          : <span className={styles.dateDitto}>″</span>}
                      </td>
                      <td className={styles.roundCell}>{row.round}</td>
                      <td className={styles.teamCell}>
                        <span className={styles.homeTeam}>{row.home || <span className={styles.tbc}>TBC</span>}</span>
                      </td>
                      <td className={styles.teamCell}>
                        {row.away || <span className={styles.tbc}>TBC</span>}
                      </td>
                      <td className={styles.venueCell}>{row.venue || <span className={styles.tbc}>—</span>}</td>
                      <td><CategoryBadge category={row.category} /></td>
                      <td><GradeBadge grade={row.grade} /></td>
                      <td className={styles.timeCell}>
                        {row.time ? <span className={styles.time}>{row.time}</span> : <span className={styles.tbc}>TBC</span>}
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={styles.btnEdit}   onClick={() => startEdit(row)} title="Edit">✏</button>
                        <button className={styles.btnDelete} onClick={() => handleDelete(row.id)} title="Delete">✕</button>
                      </td>
                    </tr>
                  )
                ))}
              </React.Fragment>
            ))}

            {adding && (
              <EditRow key="new" data={newRow} onChange={setNewRow} onSave={saveAdd} onCancel={cancelAdd} busy={busy} isNew />
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.addBar}>
        {!adding
          ? <button className={styles.btnAdd} onClick={startAdd}>+ Add Fixture Row</button>
          : <span className={styles.addHint}>Fill in the row above and click ✓</span>}
        <span className={styles.rowCount}>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function EditRow({ data, onChange, onSave, onCancel, busy }) {
  function set(field, value) { onChange(prev => ({ ...prev, [field]: value })); }
  const catCustom  = data.category && !CATEGORIES.includes(data.category);
  const gradeCustom = data.grade   && !GRADES.includes(data.grade);

  return (
    <tr className={styles.editRow}>
      <td><input type="date" value={data.date||''} onChange={e=>set('date',e.target.value)} /></td>
      <td><input type="text" value={data.round||''} onChange={e=>set('round',e.target.value)} placeholder="Round 5" /></td>
      <td>
        <input type="text" value={data.home||''} onChange={e=>set('home',e.target.value)} placeholder="Home team *" />
      </td>
      <td>
        <input type="text" value={data.away||''} onChange={e=>set('away',e.target.value)} placeholder="Away team *" />
      </td>
      <td>
        <input type="text" value={data.venue||''} onChange={e=>set('venue',e.target.value)} placeholder="Venue (optional)" />
      </td>
      <td>
        <select value={catCustom ? '__custom__' : (data.category||'')}
          onChange={e => set('category', e.target.value === '__custom__' ? '' : e.target.value)}>
          <option value="">No category…</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">Custom…</option>
        </select>
        {catCustom && <input type="text" value={data.category||''} onChange={e=>set('category',e.target.value)} placeholder="Category name" style={{marginTop:'4px'}} />}
      </td>
      <td>
        <select value={gradeCustom ? '__custom__' : (data.grade||'')}
          onChange={e => set('grade', e.target.value === '__custom__' ? '' : e.target.value)}>
          <option value="">Grade (optional)…</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          <option value="__custom__">Custom…</option>
        </select>
        {gradeCustom && <input type="text" value={data.grade||''} onChange={e=>set('grade',e.target.value)} placeholder="Grade name" style={{marginTop:'4px'}} />}
      </td>
      <td><input type="time" value={data.time||''} onChange={e=>set('time',e.target.value)} /></td>
      <td className={styles.actionsCell}>
        <button className={styles.btnSave}   onClick={onSave}   disabled={busy} title="Save">✓</button>
        <button className={styles.btnCancel} onClick={onCancel} disabled={busy} title="Cancel">✕</button>
      </td>
    </tr>
  );
}

function groupByDate(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.date || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([dateKey,rows])=>({ dateKey, rows }));
}
