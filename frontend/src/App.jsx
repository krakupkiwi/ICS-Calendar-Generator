import React, { useState } from 'react';
import Header from './components/Header.jsx';
import ImportExport from './components/ImportExport.jsx';
import FixtureEditor from './components/FixtureEditor.jsx';
import CalendarPreview from './components/CalendarPreview.jsx';
import SubscribePanel from './components/SubscribePanel.jsx';
import { useFixtures } from './hooks/useFixtures.js';
import styles from './App.module.css';

const TABS = [
  { id: 'editor',    label: '✏ Editor',           title: 'Add and edit fixture rows' },
  { id: 'preview',   label: '📅 Preview',          title: 'View fixtures as calendar cards' },
  { id: 'subscribe', label: '📡 Subscribe & Share', title: 'Subscription URLs and download by category or team' },
  { id: 'guide',     label: '❓ Help',             title: 'How to use this tool' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [clubName,  setClubName]  = useState(() => localStorage.getItem('clubName')  || '');
  const [groupBy,     setGroupBy]     = useState(() => localStorage.getItem('groupBy')      || 'category');
  const [groupByLocked, setGroupByLocked] = useState(() => localStorage.getItem('groupByLocked') === 'true');

  const { rows, loading, error, addRow, updateRow, deleteRow, refetch } = useFixtures();

  function handleClubNameChange(name) {
    setClubName(name);
    localStorage.setItem('clubName', name);
  }

  function handleGroupByChange(val) {
    if (groupByLocked) return;
    setGroupBy(val);
    localStorage.setItem('groupBy', val);
  }

  function toggleGroupByLock() {
    const next = !groupByLocked;
    setGroupByLocked(next);
    localStorage.setItem('groupByLocked', String(next));
  }

  function handleSettingsImport(settings) {
    if (settings.clubName !== undefined) handleClubNameChange(settings.clubName);
    if (settings.groupBy  !== undefined) handleGroupByChange(settings.groupBy);
  }

  return (
    <div className={styles.app}>
      <Header clubName={clubName} onClubNameChange={handleClubNameChange} />

      <main className={styles.main}>
        <div className={styles.container}>

          <ImportExport clubName={clubName} onImport={refetch} onClear={refetch} onSettingsImport={handleSettingsImport} />

          <div className={`${styles.groupingBar} ${groupByLocked ? styles.groupingBarLocked : ''}`}>
            <span className={styles.groupingLabel}>Group events by</span>
            <div className={styles.groupingOptions}>
              {[
                { value: 'category', label: 'Category', hint: 'Seniors / Juniors / Womens' },
                { value: 'grade',    label: 'Grade',     hint: 'First Grade / Reserve / U18' },
                { value: 'venue',    label: 'Venue',     hint: 'one event per ground' },
                { value: 'team',     label: 'Team',      hint: 'one event per team (home or away)' },
                { value: 'match',    label: 'Per Game',  hint: 'one event per match' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.groupingBtn} ${groupBy === opt.value ? styles.groupingActive : ''}`}
                  onClick={() => handleGroupByChange(opt.value)}
                  disabled={groupByLocked}
                  title={groupByLocked ? 'Unlock to change' : opt.hint}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              className={`${styles.lockBtn} ${groupByLocked ? styles.lockBtnOn : ''}`}
              onClick={toggleGroupByLock}
              title={groupByLocked ? 'Unlock grouping' : 'Lock grouping to prevent accidental changes'}
            >
              {groupByLocked ? '🔒' : '🔓'}
            </button>
            <span className={styles.groupingHint}>
              {groupByLocked
                ? 'Grouping locked'
                : groupBy !== 'category' && '⚠ Changing this alters UIDs — existing subscribers may see duplicates'}
            </span>
          </div>

          <nav className={styles.tabs} role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.title}
              >
                {tab.label}
              </button>
            ))}
            <div className={styles.tabSpacer} />
            {rows.length > 0 && (
              <span className={styles.fixtureCount}>
                {countEvents(rows)} event{countEvents(rows) !== 1 ? 's' : ''} · {rows.length} row{rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </nav>

          <div className={styles.panel}>
            {activeTab === 'editor' && (
              <FixtureEditor rows={rows} loading={loading} error={error}
                onAdd={addRow} onUpdate={updateRow} onDelete={deleteRow} />
            )}
            {activeTab === 'preview' && (
              <CalendarPreview rows={rows} clubName={clubName} groupBy={groupBy} />
            )}
            {activeTab === 'subscribe' && (
              <SubscribePanel clubName={clubName} groupBy={groupBy} />
            )}
            {activeTab === 'guide' && <HelpGuide />}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        ICS Calendar Generator · Open source · Runs fully offline
      </footer>
    </div>
  );
}

// Count unique ICS events: (date + category/grade)
function countEvents(rows) {
  const seen = new Set(rows.map(r => `${r.date}|${r.category?.trim() || r.grade?.trim() || ''}`));
  return seen.size;
}

function HelpGuide() {
  return (
    <div className={styles.guide}>
      <h2>How to Use This Tool</h2>

      <section>
        <h3>1. Set Your Club Name</h3>
        <p>Enter your club name in the header. This becomes the calendar title and forms part of the event IDs.</p>
        <p>Example: "North Beach FC" → event IDs like <code>fixture-2026-05-02-seniors@northbeachfccal</code></p>
      </section>

      <section>
        <h3>2. Add Fixtures</h3>
        <p>In the <strong>Editor</strong> tab, click <strong>"+ Add Fixture Row"</strong>. Fill in:</p>
        <ul>
          <li><strong>Date</strong> — YYYY-MM-DD (e.g. 2026-05-12)</li>
          <li><strong>Round</strong> — optional label (e.g. "Round 5")</li>
          <li><strong>Home Team</strong> — team playing at home (listed first)</li>
          <li><strong>Away Team</strong> — visiting team</li>
          <li><strong>Venue</strong> — ground name (optional)</li>
          <li><strong>Category</strong> — team group: Seniors, Juniors, Womens… <em>used in event UIDs</em></li>
          <li><strong>Grade</strong> — specific competition: First Grade, U/18, etc.</li>
          <li><strong>Kick-off</strong> — HH:MM (e.g. 15:30)</li>
        </ul>
        <p>One row = one grade on one match day. Rows with the same <strong>Date + Category</strong> become one calendar event.</p>
      </section>

      <section>
        <h3>3. Import from CSV</h3>
        <p>Click <strong>📋 Get Template</strong> to download a blank spreadsheet, fill it in Excel or Google Sheets, then click <strong>📂 Import CSV</strong>.</p>
        <pre>Date,Round,Home,Away,Venue,Category,Grade,Time</pre>
        <p>Old-format CSVs with <code>Opponent</code> and <code>Location</code> columns are also accepted — they'll be converted automatically.</p>
      </section>

      <section>
        <h3>4. Preview</h3>
        <p>The <strong>Preview</strong> tab shows fixture cards grouped by round, one card per ICS event. Check this before exporting.</p>
      </section>

      <section>
        <h3>5. Subscribe & Share</h3>
        <p>The <strong>Subscribe & Share</strong> tab is where the magic happens:</p>
        <ul>
          <li>Copy a <strong>live subscription URL</strong> per category or per team</li>
          <li>Download separate <strong>.ics files</strong> for static hosting (GitHub, Dropbox)</li>
          <li>Instructions for Apple Calendar, Google Calendar, Outlook</li>
        </ul>
        <p>Subscribers only need to subscribe once. Their calendar updates automatically whenever the fixture data changes.</p>
      </section>

      <section className={styles.tipBox}>
        <h3>💡 Tips</h3>
        <ul>
          <li>Rows with the same <strong>Date + Category</strong> group into one calendar event</li>
          <li>Event start = earliest kickoff; end = latest kickoff + 2 hours</li>
          <li><strong>UIDs are stable</strong> — re-exporting won't create duplicates in subscribed calendars</li>
          <li>Team-filtered calendars show "Seniors vs Wests <em>[HOME]</em>" or "<em>[AWAY]</em>" from that team's perspective</li>
          <li>Works for any sport — rugby league, cricket, soccer, netball, AFL, etc.</li>
        </ul>
      </section>
    </div>
  );
}
