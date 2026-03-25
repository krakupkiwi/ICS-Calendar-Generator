/**
 * CalendarPreview.jsx
 * Card-based view of fixtures grouped by round then category.
 * Each card = one ICS event (date + category group).
 * Read-only — switch to Editor tab to make changes.
 */

import React, { useMemo, useState } from 'react';
import { api, toClubSlug, downloadBlob } from '../api/client.js';
import styles from './CalendarPreview.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(time) {
  if (!time) return 'TBC';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`;
}

function gradeColor(grade) {
  const g = (grade || '').toLowerCase();
  if (g.includes('first') || g.includes('a grade')) return '#58a6ff';
  if (g.includes('reserve') || g.includes('b grade')) return '#bc8cff';
  if (g.includes('u/18') || g.includes('u18')) return '#3fb950';
  if (g.includes('women') || g.includes('league tag')) return '#f0883e';
  if (g.includes('u/16') || g.includes('u16')) return '#ffa657';
  if (g.includes('u/14') || g.includes('u14')) return '#79c0ff';
  return '#8b949e';
}

export default function CalendarPreview({ rows, clubName = '', groupBy = 'category' }) {
  const fixtures = useMemo(() => groupRows(rows, groupBy, clubName), [rows, groupBy, clubName]);

  // Unique teams for per-team export panel (excludes BYE / TBC placeholders)
  const teams = useMemo(() => {
    if (groupBy !== 'team') return [];
    return [...new Set([
      ...rows.map(r => r.home?.trim()),
      ...rows.map(r => r.away?.trim()),
    ].filter(t => t && t !== 'BYE' && t !== 'TBC'))].sort();
  }, [rows, groupBy]);

  if (fixtures.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📅</div>
        <p>No fixtures to preview. Add fixtures in the Editor tab.</p>
      </div>
    );
  }

  const rounds = groupByRound(fixtures);
  const groupLabel = { category: 'Date + Category', grade: 'Date + Grade', venue: 'Date + Venue', team: 'Date + Team', match: 'Date + Match' };

  return (
    <div className={styles.container}>
      <p className={styles.previewNote}>
        Each card = one calendar event. Grouped by <strong>{groupLabel[groupBy] || groupBy}</strong>.
      </p>

      {/* Per-team export panel — only shown in Team mode */}
      {groupBy === 'team' && teams.length > 0 && (
        <TeamExportPanel teams={teams} clubName={clubName} groupBy={groupBy} />
      )}

      {rounds.map(({ round, fixtures: roundFixtures }) => (
        <div key={round} className={styles.roundBlock}>
          <div className={styles.roundHeader}>
            <span className={styles.roundPill}>{round || 'Unspecified Round'}</span>
            <span className={styles.roundCount}>
              {roundFixtures.length} event{roundFixtures.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={styles.cards}>
            {roundFixtures.map(fixture => (
              <FixtureCard key={`${fixture.date}-${fixture.groupKey}`} fixture={fixture} clubName={clubName} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FixtureCard({ fixture, clubName = '' }) {
  // Determine home/away perspective for the viewing club
  const myTeam = clubName.toLowerCase();
  const isMyHome = myTeam && fixture.home?.toLowerCase() === myTeam;
  const isMyAway = myTeam && fixture.away?.toLowerCase() === myTeam;

  const showGrades = fixture.games.length > 0 &&
    !(fixture.games.length === 1 && fixture.games[0].grade === fixture.groupKey);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardDate}>{formatDate(fixture.date)}</div>
        {fixture.venue && (
          <span className={`${styles.venue} ${isMyHome ? styles.home : isMyAway ? styles.away : styles.neutral}`}>
            {fixture.venue}
          </span>
        )}
      </div>

      <div className={styles.categoryRow}>
        <span className={styles.categoryLabel}>{fixture.label}</span>
        {fixture.groupKey !== fixture.label && (
          <span className={styles.groupKeyHint} title="Event grouping key">{fixture.groupKey}</span>
        )}
        {isMyHome && <span className={styles.homePill}>HOME</span>}
        {isMyAway && <span className={styles.awayPill}>AWAY</span>}
      </div>

      {/* Home vs Away */}
      <div className={styles.matchup}>
        <span className={`${styles.teamName} ${isMyHome ? styles.myTeam : ''}`}>
          {fixture.home || 'TBC'}
        </span>
        <span className={styles.vsDivider}>vs</span>
        <span className={`${styles.teamName} ${isMyAway ? styles.myTeam : ''}`}>
          {fixture.away || 'TBC'}
        </span>
      </div>

      {fixture.games.length > 0 && (
        <div className={styles.games}>
          {fixture.games.map((game, i) => (
            <div key={i} className={styles.game}>
              <span
                className={styles.gameGrade}
                style={{ color: gradeColor(game.grade), borderLeftColor: gradeColor(game.grade) }}
              >
                {showGrades ? (game.grade || fixture.groupKey) : fixture.groupKey}
              </span>
              <span className={styles.gameTime}>{formatTime(game.time)}</span>
            </div>
          ))}
        </div>
      )}

      {/* UID preview */}
      <div className={styles.uidPreview} title="This is the stable UID used in the ICS file">
        🔑 fixture-{fixture.date}-{toSlug(fixture.groupKey)}@…
      </div>
    </div>
  );
}

// ── Per-team export panel ────────────────────────────────────────────────────

function TeamExportPanel({ teams, clubName, groupBy }) {
  const [busy,    setBusy]    = useState(null);  // team name currently downloading
  const [done,    setDone]    = useState(null);  // team name just completed
  const [error,   setError]   = useState(null);

  const name = clubName || 'Sports Fixtures';
  const club = toClubSlug(clubName);

  async function download(team) {
    setBusy(team);
    setError(null);
    try {
      const blob = await api.exportICS(name, club, '', team, groupBy);
      downloadBlob(blob, `calendar-${team.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`);
      setDone(team);
      setTimeout(() => setDone(null), 2000);
    } catch (e) {
      setError(`Failed to download ${team}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll() {
    setBusy('__all__');
    setError(null);
    for (const team of teams) {
      try {
        const blob = await api.exportICS(name, club, '', team, groupBy);
        downloadBlob(blob, `calendar-${team.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`);
      } catch { /* continue */ }
    }
    setBusy(null);
    setDone('__all__');
    setTimeout(() => setDone(null), 2000);
  }

  return (
    <div className={styles.teamExportPanel}>
      <div className={styles.teamExportHeader}>
        <span className={styles.teamExportTitle}>📥 Download per-team ICS calendars</span>
        <button
          className={`${styles.teamExportAllBtn} ${done === '__all__' ? styles.teamExportDone : ''}`}
          onClick={downloadAll}
          disabled={!!busy}
          title="Download a separate .ics file for every team"
        >
          {busy === '__all__' ? '⏳ Downloading all…' : done === '__all__' ? '✓ All downloaded' : '⬇ Download All'}
        </button>
      </div>
      {error && <div className={styles.teamExportError}>{error}</div>}
      <div className={styles.teamExportGrid}>
        {teams.map(team => (
          <button
            key={team}
            className={`${styles.teamExportBtn} ${done === team ? styles.teamExportDone : ''}`}
            onClick={() => download(team)}
            disabled={!!busy}
          >
            {busy === team ? '⏳' : done === team ? '✓' : '⬇'} {team}
          </button>
        ))}
      </div>
    </div>
  );
}

function toSlug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fixture';
}

function computeGroupKey(row, groupBy, clubName = '') {
  switch (groupBy) {
    case 'grade':  return row.grade?.trim() || row.category?.trim() || 'fixture';
    case 'venue':  return row.venue?.trim() || 'unknown-venue';
    case 'team': {
      if (clubName) {
        const ctx = clubName.toLowerCase();
        if ((row.home || '').toLowerCase() === ctx) return row.home.trim();
        if ((row.away || '').toLowerCase() === ctx) return row.away.trim();
      }
      return row.home?.trim() || row.away?.trim() || 'unknown';
    }
    case 'match': {
      const h = (row.home || 'home').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const a = (row.away || 'away').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `${h}-vs-${a}`;
    }
    default:       return row.category?.trim() || row.grade?.trim() || 'fixture';
  }
}

function groupRows(rows, groupBy = 'category', clubName = '') {
  const map = new Map();
  for (const row of rows) {
    if (!row.date) continue;
    const gk  = computeGroupKey(row, groupBy, clubName);
    const key = `${row.date}|${gk}`;
    if (!map.has(key)) {
      map.set(key, {
        date:     row.date,
        groupKey: gk,
        label:    row.category?.trim() || row.grade?.trim() || 'Fixture', // always category for display
        round:    row.round || '',
        home:     row.home || (row.location?.toLowerCase() !== 'away' ? '' : row.opponent) || '',
        away:     row.away || (row.location?.toLowerCase() === 'away' ? '' : row.opponent) || '',
        venue:    row.venue || '',
        games:    [],
      });
    }
    const f = map.get(key);
    if (row.round && !f.round) f.round = row.round;
    if (row.home  && !f.home)  f.home  = row.home;
    if (row.away  && !f.away)  f.away  = row.away;
    if (row.venue && !f.venue) f.venue = row.venue;
    if (row.grade || row.time) {
      f.games.push({ grade: row.grade || '', time: row.time || '' });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.groupKey.localeCompare(b.groupKey);
    })
    .map(f => ({ ...f, games: f.games.sort((a, b) => (a.time||'').localeCompare(b.time||'')) }));
}

function groupByRound(fixtures) {
  const map = new Map();
  for (const f of fixtures) {
    const key = f.round || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  return Array.from(map.entries()).map(([round, fixtures]) => ({ round, fixtures }));
}
