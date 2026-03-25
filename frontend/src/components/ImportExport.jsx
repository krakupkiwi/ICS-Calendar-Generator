import React, { useRef, useState } from 'react';
import { api, toClubSlug, downloadBlob } from '../api/client.js';
import styles from './ImportExport.module.css';

const SETTINGS_KEYS = ['clubName', 'githubToken', 'githubRepo', 'githubBranch', 'publicBaseURL'];

export default function ImportExport({ clubName, onImport, onClear, onSettingsImport }) {
  const fileRef     = useRef();
  const appendRef   = useRef();
  const settingsRef = useRef();
  const [status, setStatus] = useState(null);
  const [busy,   setBusy]   = useState(false);

  function flash(type, message) {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  }

  // ── Fixture import/export ────────────────────────────────────────────────

  async function handleCSVImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await api.importCSV(file);
      flash('success', `✓ Imported ${result.imported} rows from ${file.name}`);
      onImport?.();
    } catch (err) { flash('error', `✗ Import failed: ${err.message}`); }
    finally { setBusy(false); e.target.value = ''; }
  }

  async function handleCSVAppend(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await api.appendCSV(file);
      flash('success', `✓ Appended ${result.imported} rows from ${file.name}`);
      onImport?.();
    } catch (err) { flash('error', `✗ Append failed: ${err.message}`); }
    finally { setBusy(false); e.target.value = ''; }
  }

  async function handleExportICS(category = '', team = '') {
    setBusy(true);
    try {
      const name   = clubName || 'Sports Fixtures';
      const club   = toClubSlug(clubName);
      const blob   = await api.exportICS(name, club, category, team);
      const suffix = [category, team].filter(Boolean).join('-');
      downloadBlob(blob, suffix ? `calendar-${suffix.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics` : 'calendar.ics');
      flash('success', `✓ calendar${suffix ? `-${suffix}` : ''}.ics downloaded`);
    } catch (err) { flash('error', `✗ Export failed: ${err.message}`); }
    finally { setBusy(false); }
  }

  async function handleExportCSV() {
    setBusy(true);
    try {
      downloadBlob(await api.exportCSV(), 'fixtures.csv');
      flash('success', '✓ fixtures.csv downloaded');
    } catch (err) { flash('error', `✗ ${err.message}`); }
    finally { setBusy(false); }
  }

  async function handleDownloadTemplate() {
    setBusy(true);
    try {
      downloadBlob(await api.exportTemplate(), 'fixtures-template.csv');
      flash('success', '✓ fixtures-template.csv downloaded');
    } catch (err) { flash('error', `✗ ${err.message}`); }
    finally { setBusy(false); }
  }

  async function handleClear() {
    if (!window.confirm('Clear ALL fixtures? This cannot be undone.')) return;
    setBusy(true);
    try { await api.clearFixtures(); flash('success', '✓ All fixtures cleared'); onClear?.(); }
    catch (err) { flash('error', `✗ ${err.message}`); }
    finally { setBusy(false); }
  }

  // ── Settings export / import / reset ────────────────────────────────────

  function handleExportSettings() {
    const data = { version: 1 };
    data.clubName = clubName || '';
    SETTINGS_KEYS.forEach(k => { data[k] = localStorage.getItem(k) || ''; });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'ics-cal-settings.json');
    flash('success', '✓ Settings exported to ics-cal-settings.json');
  }

  async function handleImportSettings(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text     = await file.text();
      const settings = JSON.parse(text);
      SETTINGS_KEYS.forEach(k => {
        if (settings[k] !== undefined) localStorage.setItem(k, settings[k]);
      });
      onSettingsImport?.(settings);
      flash('success', '✓ Settings restored — reload the page if values look stale');
    } catch (err) { flash('error', `✗ Could not read settings file: ${err.message}`); }
    finally { e.target.value = ''; }
  }

  function handleResetSettings() {
    if (!window.confirm('Reset all settings (club name, GitHub token, public URL, etc.)?\nFixture data is not affected.')) return;
    SETTINGS_KEYS.forEach(k => localStorage.removeItem(k));
    onSettingsImport?.({ clubName: '', githubToken: '', githubRepo: '', githubBranch: 'main', publicBaseURL: '' });
    flash('success', '✓ Settings cleared');
  }

  return (
    <div className={styles.bar}>
      {/* Import */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>Import</span>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleCSVImport} style={{ display:'none' }} />
        <input ref={appendRef} type="file" accept=".csv,text/csv" onChange={handleCSVAppend} style={{ display:'none' }} />
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => fileRef.current.click()} disabled={busy} title="Replace ALL existing fixtures with this CSV">
          📂 Import CSV
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => appendRef.current.click()} disabled={busy} title="Add fixtures from this CSV without removing existing ones">
          ➕ Append CSV
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleDownloadTemplate} disabled={busy} title="Download empty CSV with correct headers">
          📋 Get Template
        </button>
      </div>

      {/* Export */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>Export</span>
        <button className={`${styles.btn} ${styles.btnAccent}`} onClick={() => handleExportICS()} disabled={busy} title="Download all fixtures as one ICS file">
          📅 All Fixtures .ICS
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExportCSV} disabled={busy}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Settings */}
      <div className={styles.group}>
        <span className={styles.groupLabel}>Settings</span>
        <input ref={settingsRef} type="file" accept=".json,application/json" onChange={handleImportSettings} style={{ display:'none' }} />
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExportSettings} title="Save club name, GitHub token, public URL to a file">
          💾 Save Settings
        </button>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => settingsRef.current.click()} title="Restore settings from a previously saved file">
          📥 Load Settings
        </button>
      </div>

      {/* Danger */}
      <div className={styles.group}>
        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleClear} disabled={busy} title="Delete all fixture rows">
          🗑 Clear Fixtures
        </button>
        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleResetSettings} title="Clear club name, GitHub token, and other settings (keeps fixtures)">
          ↺ Reset Settings
        </button>
      </div>

      {status && (
        <div className={`${styles.status} ${styles[status.type]}`}>{status.message}</div>
      )}
    </div>
  );
}
