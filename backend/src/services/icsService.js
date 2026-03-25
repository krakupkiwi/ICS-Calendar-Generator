/**
 * icsService.js
 * Generates ICS calendar from fixture rows.
 *
 * Grouping:  one event per (date + category), falling back to grade.
 *
 * UID format: fixture-{date}-{category-slug}@{club-slug}cal
 *   e.g.  fixture-2026-05-02-seniors@northbeachfccal
 *
 * Summary format:
 *   No team filter:  "Seniors: North Beach FC vs Wests — Round 4"
 *   Team filtered:   "Seniors vs Wests [HOME] — Round 4"
 *                    "Seniors vs North Beach FC [AWAY] — Round 4"
 *
 * Filtering:
 *   categoryFilter — include only rows matching this category (case-insensitive)
 *   teamFilter     — include only rows where home or away = team;
 *                    also adjusts event summaries to home/away perspective
 */

// ─── Slug helpers ─────────────────────────────────────────────────────────────
/** Compact slug for @domain part: "North Beach FC" → "northbeachfc" */
function clubSlug(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]/g,'') || 'mycal'; }
/** Hyphenated slug for identifier part: "Womens League Tag" → "womens-league-tag" */
function identSlug(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'fixture'; }

// ─── Date/time helpers ───────────────────────────────────────────────────────
function toICSDateTime(dateStr, timeStr) {
  const [y,m,d] = dateStr.split('-');
  const [h,min] = (timeStr||'10:00').split(':');
  return `${y}${m.padStart(2,'0')}${d.padStart(2,'0')}T${h.padStart(2,'0')}${min.padStart(2,'0')}00`;
}

function addMinsToDateTime(dateStr, timeStr, addMins) {
  const [y,m,d] = dateStr.split('-').map(Number);
  const [h,min] = (timeStr||'10:00').split(':').map(Number);
  const dt = new Date(y, m-1, d, h, min+addMins, 0);
  const p = n => String(n).padStart(2,'0');
  return `${dt.getFullYear()}${p(dt.getMonth()+1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`;
}

function nowUTCStamp() {
  const d = new Date(); const p = n => String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function icsEscape(s) {
  return (s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n').replace(/\r/g,'');
}

function formatTime(t) {
  if (!t) return 'TBC';
  const [h,m] = t.split(':'); const hour = parseInt(h,10);
  return `${hour>12?hour-12:hour||12}:${m}${hour>=12?'pm':'am'}`;
}

// ─── Team helpers ─────────────────────────────────────────────────────────────
/** Get home/away from a row — handles both new and old (opponent/location) formats */
function getTeams(row) {
  if (row.home !== undefined || row.away !== undefined) {
    return { home: row.home||'', away: row.away||'', venue: row.venue||'' };
  }
  // Backward compat: old opponent+location format
  const opp = row.opponent || '';
  const loc = (row.location||'').toLowerCase();
  return {
    home:  loc === 'away' ? opp : '',
    away:  loc === 'away' ? '' : opp,
    venue: (loc !== 'home' && loc !== 'away') ? row.location||'' : '',
  };
}

/** Does this row involve the given team? */
function rowInvolvesTeam(row, team) {
  if (!team) return true;
  const t = team.toLowerCase();
  const { home, away } = getTeams(row);
  return home.toLowerCase() === t || away.toLowerCase() === t ||
    (row.opponent||'').toLowerCase() === t; // old format compat
}

// ─── Grouping key ─────────────────────────────────────────────────────────────
/**
 * groupBy modes:
 *   'category' (default) — date + category  (one event per team group per day)
 *   'grade'              — date + grade      (one event per grade per day)
 *   'venue'              — date + venue      (one event per ground per day)
 *   'match'              — date + home+away  (one event per individual game)
 */
function groupKeyFor(row, groupBy, clubContext = '') {
  switch (groupBy) {
    case 'grade':  return row.grade?.trim() || row.category?.trim() || 'fixture';
    case 'venue': {
      const { venue } = getTeams(row);
      return venue?.trim() || row.venue?.trim() || 'unknown-venue';
    }
    case 'team': {
      const { home, away } = getTeams(row);
      // Prefer whichever side matches the club context (so away games still group under our name)
      if (clubContext) {
        const ctx = clubContext.toLowerCase();
        if (home?.toLowerCase() === ctx) return home.trim();
        if (away?.toLowerCase() === ctx) return away.trim();
      }
      return home?.trim() || away?.trim() || 'unknown';
    }
    case 'match': {
      const { home, away } = getTeams(row);
      return `${identSlug(home||'home')}-vs-${identSlug(away||'away')}`;
    }
    default:       return row.category?.trim() || row.grade?.trim() || 'fixture';
  }
}

/** Always category-based label used for event summaries regardless of groupBy mode */
function summaryLabel(row) { return row.category?.trim() || row.grade?.trim() || 'Fixture'; }

// ─── Group rows into fixture events ───────────────────────────────────────────
function groupFixtures(rows, groupBy = 'category', clubContext = '') {
  const map = new Map();
  for (const row of rows) {
    if (!row.date) continue;
    const gk  = groupKeyFor(row, groupBy, clubContext);
    const key = `${row.date}|${gk}`;
    if (!map.has(key)) {
      const { home, away, venue } = getTeams(row);
      map.set(key, {
        date:     row.date,
        groupKey: gk,
        label:    summaryLabel(row),   // for SUMMARY line — always category-based
        round:    row.round    || '',
        home, away, venue,
        games: [],
      });
    }
    const g = map.get(key);
    if (row.round && !g.round) g.round = row.round;
    const { home, away, venue } = getTeams(row);
    if (home  && !g.home)  g.home  = home;
    if (away  && !g.away)  g.away  = away;
    if (venue && !g.venue) g.venue = venue;
    if (row.grade || row.time) g.games.push({ grade: row.grade||'', time: row.time||'' });
  }
  return Array.from(map.values())
    .sort((a,b) => a.date.localeCompare(b.date) || a.groupKey.localeCompare(b.groupKey))
    .map(f => ({ ...f, games: f.games.sort((a,b) => (a.time||'').localeCompare(b.time||'')) }));
}

// ─── Build SUMMARY line ───────────────────────────────────────────────────────
function buildSummary(fixture, teamFilter) {
  const roundTag = fixture.round ? ` — ${fixture.round}` : '';
  const cat      = fixture.label;   // always category, not groupKey

  if (!teamFilter) {
    // No filter: show both teams
    const h = fixture.home || 'TBC';
    const a = fixture.away || 'TBC';
    return `${cat}: ${h} vs ${a}${roundTag}`;
  }

  // Team-filtered: show from that team's perspective
  const isHome = fixture.home?.toLowerCase() === teamFilter.toLowerCase();
  const opponent = isHome ? (fixture.away||'TBC') : (fixture.home||'TBC');
  const tag = isHome ? '[HOME]' : '[AWAY]';
  return `${cat} vs ${opponent} ${tag}${roundTag}`;
}

// ─── Main export function ─────────────────────────────────────────────────────
/**
 * @param {Array}  rows
 * @param {string} calendarName
 * @param {string} club           — slug used in UIDs (derived from calendarName if empty)
 * @param {string} categoryFilter — only include rows with this category ('' = all)
 * @param {string} teamFilter     — only include rows involving this team ('' = all)
 */
export function generateICS(rows, calendarName = 'Sports Fixtures', club = '', categoryFilter = '', teamFilter = '', groupBy = 'category') {
  const domain   = clubSlug(club || calendarName);
  const dtstamp  = nowUTCStamp();

  // Apply filters
  let filtered = rows;
  if (categoryFilter) {
    filtered = filtered.filter(r => (r.category?.trim()||r.grade?.trim()||'').toLowerCase() === categoryFilter.toLowerCase());
  }
  if (teamFilter) {
    filtered = filtered.filter(r => rowInvolvesTeam(r, teamFilter));
  }

  // teamFilter is the exact team name (most specific); calendarName is the club's display name
  const clubContext = teamFilter || calendarName;
  const fixtures = groupFixtures(filtered, groupBy, clubContext);

  const eventBlocks = fixtures.map(fixture => {
    const times = fixture.games.map(g=>g.time).filter(Boolean).sort();
    const startT = times[0] || '10:00';
    const endT   = times[times.length-1] || startT;

    const dtStart = toICSDateTime(fixture.date, startT);
    const dtEnd   = addMinsToDateTime(fixture.date, endT, 120);
    const uid     = `fixture-${fixture.date}-${identSlug(fixture.groupKey)}@${domain}cal`;
    const summary = buildSummary(fixture, teamFilter);

    // Description
    const lines = [];
    if (fixture.round) lines.push(fixture.round);
    lines.push('');

    // Show opponent info
    if (teamFilter) {
      const isHome = fixture.home?.toLowerCase() === teamFilter.toLowerCase();
      lines.push(`${isHome ? 'HOME' : 'AWAY'} fixture`);
      lines.push(`Opponent: ${isHome ? (fixture.away||'TBC') : (fixture.home||'TBC')}`);
      if (fixture.venue) lines.push(`Venue: ${fixture.venue}`);
      else if (isHome)   lines.push('Venue: Home ground');
    } else {
      if (fixture.home)  lines.push(`Home: ${fixture.home}`);
      if (fixture.away)  lines.push(`Away: ${fixture.away}`);
      if (fixture.venue) lines.push(`Venue: ${fixture.venue}`);
    }

    if (fixture.games.length > 0) {
      const distinct = [...new Set(fixture.games.map(g=>g.grade).filter(Boolean))];
      if (distinct.length > 1 || (distinct.length === 1 && distinct[0] !== fixture.groupKey)) {
        lines.push('');
        lines.push('KICK-OFF TIMES:');
        for (const g of fixture.games) lines.push(`  • ${g.grade||fixture.label}: ${formatTime(g.time)}`);
      } else {
        lines.push('');
        lines.push(`Kick-off: ${formatTime(startT)}`);
      }
    }

    lines.push(''); lines.push('—'); lines.push('Generated by Sports ICS Calendar Generator');
    const description = lines.join('\\n');

    const location = fixture.venue || (teamFilter
      ? (fixture.home?.toLowerCase() === teamFilter.toLowerCase() ? 'Home' : 'Away')
      : (fixture.home ? `${fixture.home} (home ground)` : ''));

    const eventLines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
    ];
    if (location) eventLines.push(`LOCATION:${icsEscape(location)}`);
    eventLines.push('END:VEVENT');
    return eventLines.join('\r\n');
  });

  const calLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SportsICSCal//ICS Generator 1.0//EN',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    `X-WR-CALDESC:${icsEscape(calendarName + ' fixtures')}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR',
  ];

  return calLines.join('\r\n') + '\r\n';
}
