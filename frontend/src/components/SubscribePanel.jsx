/**
 * SubscribePanel.jsx
 *
 * - Per-category and per-team live subscription URLs (using configurable public base URL)
 * - Combined filter with interactive dropdowns
 * - GitHub Auto-Publish
 * - Static file hosting helpers (GitHub, Google Drive, Dropbox link converters)
 * - App-by-app subscribe instructions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api, toClubSlug, downloadBlob } from '../api/client.js';
import styles from './SubscribePanel.module.css';
import GitHubPublish from './GitHubPublish.jsx';

// ── helpers ──────────────────────────────────────────────────────────────────

function convertDriveURL(input) {
  const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : null;
}

function convertDropboxURL(input) {
  if (!input.includes('dropbox.com')) return null;
  return input.replace(/[?&]dl=\d/, '').replace(/[?&]raw=\d/, '') +
    (input.includes('?') ? '&raw=1' : '?raw=1');
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const markCopied = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const fallback = () => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); markCopied(); } catch {}
      document.body.removeChild(el);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(markCopied).catch(fallback);
    } else {
      fallback();
    }
  }
  return (
    <button
      className={`${styles.copyBtn} ${copied ? styles.copied : ''} ${className || ''}`}
      onClick={copy}
      title="Copy URL"
    >
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
  );
}

// ── URLRow ────────────────────────────────────────────────────────────────────

function URLRow({ url }) {
  return (
    <div className={styles.urlRow}>
      <span className={styles.urlText}>{url}</span>
      <CopyButton text={url} />
    </div>
  );
}

// ── LinkConverter ─────────────────────────────────────────────────────────────

function LinkConverter({ placeholder, convert, hint }) {
  const [input, setInput]   = useState('');
  const [result, setResult] = useState(null);
  const [error, setError]   = useState(false);

  function handleConvert() {
    const out = convert(input.trim());
    if (out) { setResult(out); setError(false); }
    else      { setResult(null); setError(true); }
  }

  return (
    <div className={styles.converter}>
      <div className={styles.converterRow}>
        <input
          type="text"
          className={styles.converterInput}
          value={input}
          onChange={e => { setInput(e.target.value); setResult(null); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleConvert()}
          placeholder={placeholder}
        />
        <button className={styles.convertBtn} onClick={handleConvert} disabled={!input.trim()}>
          Convert
        </button>
      </div>
      {hint && !result && !error && <div className={styles.converterHint}>{hint}</div>}
      {error  && <div className={styles.converterError}>Could not extract a valid URL from that link.</div>}
      {result && <URLRow url={result} />}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SubscribePanel({ clubName, groupBy = 'category' }) {
  const [categories, setCategories] = useState([]);
  const [teams,      setTeams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busy,       setBusy]       = useState(false);
  const [status,     setStatus]     = useState(null);

  // Public URL override — replaces localhost in subscription URLs
  const [publicBase, setPublicBase] = useState(() => localStorage.getItem('publicBaseURL') || '');
  const [baseSaved,  setBaseSaved]  = useState(false);

  // Combined filter selections
  const [selCat,  setSelCat]  = useState('');
  const [selTeam, setSelTeam] = useState('');

  const baseURL  = (publicBase.trim() || window.location.origin).replace(/\/$/, '');
  const club     = toClubSlug(clubName);
  const name     = clubName || 'Sports Fixtures';
  const apiBase  = `${baseURL}/api/export/ics`;

  function buildURL(params) {
    const p = new URLSearchParams({ name, club, ...params });
    if (groupBy && groupBy !== 'category') p.set('groupBy', groupBy);
    return `${apiBase}?${p}`;
  }

  function flash(type, message) {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, teamRes] = await Promise.all([api.getCategories(), api.getTeams()]);
      setCategories(catRes.categories);
      setTeams(teamRes.teams);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Default selectors once data loads
  useEffect(() => {
    if (categories.length > 0 && !selCat) setSelCat(categories[0]);
  }, [categories]);
  useEffect(() => {
    if (teams.length > 0 && !selTeam) setSelTeam(teams[0]);
  }, [teams]);

  function savePublicBase() {
    localStorage.setItem('publicBaseURL', publicBase.trim());
    setBaseSaved(true);
    setTimeout(() => setBaseSaved(false), 2000);
  }

  async function downloadCategoryICS(category) {
    setBusy(true);
    try {
      const blob = await api.exportICS(name, club, category, '', groupBy);
      downloadBlob(blob, `calendar-${category.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics`);
      flash('success', `✓ ${category} ICS downloaded`);
    } catch (e) { flash('error', `✗ ${e.message}`); }
    finally { setBusy(false); }
  }

  async function downloadTeamICS(team) {
    setBusy(true);
    try {
      const blob = await api.exportICS(name, club, '', team, groupBy);
      downloadBlob(blob, `calendar-${team.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics`);
      flash('success', `✓ ${team} ICS downloaded`);
    } catch (e) { flash('error', `✗ ${e.message}`); }
    finally { setBusy(false); }
  }

  // Build combined URL from dropdowns
  const combinedParams = {};
  if (selCat)  combinedParams.category = selCat;
  if (selTeam) combinedParams.team     = selTeam;
  const combinedURL = buildURL(combinedParams);

  if (loading) return <div className={styles.loading}>Loading fixture data…</div>;

  return (
    <div className={styles.container}>

      {status && (
        <div className={`${styles.banner} ${styles[status.type]}`}>{status.message}</div>
      )}

      {/* ── Public URL override ────────────────────────────────────────── */}
      <section className={styles.urlOverrideBox}>
        <div className={styles.urlOverrideHeader}>
          <span className={styles.urlOverrideTitle}>🌐 Public Server URL</span>
          <span className={styles.urlOverrideBadge}>
            {publicBase.trim() ? 'Custom' : 'localhost (not shareable)'}
          </span>
        </div>
        <p className={styles.urlOverrideDesc}>
          Subscription URLs below use this base. While running locally the URLs point to
          <code>localhost</code> which only works on this machine. Enter your public address
          (Cloudflare Tunnel, Railway, your domain, etc.) to generate shareable URLs.
        </p>
        <div className={styles.urlOverrideRow}>
          <input
            type="url"
            className={styles.urlOverrideInput}
            value={publicBase}
            onChange={e => setPublicBase(e.target.value)}
            placeholder="https://my-club.cfargotunnel.com"
          />
          <button
            className={styles.urlOverrideSave}
            onClick={savePublicBase}
            disabled={!publicBase.trim()}
          >
            {baseSaved ? '✓ Saved' : 'Save'}
          </button>
          {publicBase.trim() && (
            <button
              className={styles.urlOverrideClear}
              onClick={() => { setPublicBase(''); localStorage.removeItem('publicBaseURL'); }}
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* ── How subscriptions work ─────────────────────────────────────── */}
      <section className={styles.explainerBox}>
        <h3>📡 How ICS Subscriptions Work</h3>
        <p>
          When someone <strong>subscribes</strong> to a calendar URL their app stores it and
          re-fetches on a schedule:
        </p>
        <ul>
          <li><strong>Apple Calendar</strong> — every ~1 hour (configurable)</li>
          <li><strong>Google Calendar</strong> — every 8–24 hours (not user-configurable)</li>
          <li><strong>Outlook</strong> — varies, typically every few hours</li>
        </ul>
        <p>
          Events are matched by their <strong>UID</strong> — same UID means update in place,
          not a new duplicate.
        </p>
        <div className={styles.tipRow}>
          <span className={styles.tipIcon}>💡</span>
          <span>
            <strong>Running on a public server?</strong> Enter the URL above and the links
            below become live subscription endpoints — update fixtures here and subscribers
            see changes on their next poll.
          </span>
        </div>
        <div className={styles.tipRow}>
          <span className={styles.tipIcon}>📁</span>
          <span>
            <strong>Running locally?</strong> Use the download buttons to get .ics files, then
            host them (GitHub, Google Drive, Dropbox). Use the <em>🚀 GitHub Auto-Publish</em> section
            below to do this automatically.
          </span>
        </div>
      </section>

      {/* ── Per-category subscriptions ─────────────────────────────────── */}
      <section>
        <h3 className={styles.sectionTitle}>Subscribe by Category</h3>
        <p className={styles.sectionDesc}>
          Each category gets its own calendar. Members subscribe only to what's relevant.
        </p>
        {categories.length === 0 ? (
          <p className={styles.empty}>No categories found. Add fixtures with a Category value first.</p>
        ) : (
          <div className={styles.cards}>
            {categories.map(cat => (
              <div key={cat} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardLabel}>{cat}</span>
                  <button className={styles.dlBtn} onClick={() => downloadCategoryICS(cat)} disabled={busy}>
                    ⬇ Download
                  </button>
                </div>
                <URLRow url={buildURL({ category: cat })} />
                <div className={styles.cardHint}>
                  Paste into Apple Calendar → File → New Calendar Subscription, or Google Calendar → + → From URL
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Per-team subscriptions ─────────────────────────────────────── */}
      <section>
        <h3 className={styles.sectionTitle}>Subscribe by Team</h3>
        <p className={styles.sectionDesc}>
          Each team gets a personalised calendar showing their fixtures labelled [HOME] or [AWAY].
        </p>
        {teams.length === 0 ? (
          <p className={styles.empty}>No teams found. Add Home/Away names to your fixtures first.</p>
        ) : (
          <div className={styles.cards}>
            {teams.map(team => (
              <div key={team} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardLabel}>{team}</span>
                  <button className={styles.dlBtn} onClick={() => downloadTeamICS(team)} disabled={busy}>
                    ⬇ Download
                  </button>
                </div>
                <URLRow url={buildURL({ team })} />
                <div className={styles.cardHint}>
                  Events show "Seniors vs Wests [HOME]" or "Seniors vs Norths [AWAY]" from this team's perspective.
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Combined filter (interactive) ──────────────────────────────── */}
      {(categories.length > 0 || teams.length > 0) && (
        <section>
          <h3 className={styles.sectionTitle}>Combined Filter</h3>
          <p className={styles.sectionDesc}>
            Build a custom URL by selecting a category, a team, or both. Leave either on
            <em> All</em> to omit that filter.
          </p>
          <div className={styles.combinedBuilder}>
            <div className={styles.combinedSelects}>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Category</label>
                <select
                  className={styles.select}
                  value={selCat}
                  onChange={e => setSelCat(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Team</label>
                <select
                  className={styles.select}
                  value={selTeam}
                  onChange={e => setSelTeam(e.target.value)}
                >
                  <option value="">All teams</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <URLRow url={combinedURL} />
          </div>
        </section>
      )}

      {/* ── How to subscribe (app instructions) ───────────────────────── */}
      <section>
        <h3 className={styles.sectionTitle}>How to Subscribe</h3>
        <div className={styles.appInstructions}>
          <div className={styles.appBlock}>
            <div className={styles.appName}>🍎 Apple Calendar</div>
            <ol>
              <li>File → <strong>New Calendar Subscription…</strong></li>
              <li>Paste the URL → click Subscribe</li>
              <li>Set <strong>Auto-refresh</strong> to "Every Hour"</li>
            </ol>
          </div>
          <div className={styles.appBlock}>
            <div className={styles.appName}>🔵 Google Calendar</div>
            <ol>
              <li>Click <strong>+</strong> next to "Other calendars"</li>
              <li>Select <strong>From URL</strong></li>
              <li>Paste the URL → Add Calendar</li>
            </ol>
            <p className={styles.appNote}>Google refreshes every 8–24 hours. Not configurable.</p>
          </div>
          <div className={styles.appBlock}>
            <div className={styles.appName}>📧 Outlook</div>
            <ol>
              <li>Calendar → <strong>Add Calendar</strong></li>
              <li>Subscribe from web</li>
              <li>Paste the URL</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── GitHub Auto-Publish ────────────────────────────────────────── */}
      <GitHubPublish categories={categories} teams={teams} clubName={clubName} groupBy={groupBy} />

      {/* ── Static file hosting ───────────────────────────────────────── */}
      <section className={styles.staticSection}>
        <h3 className={styles.staticTitle}>📁 Static File Hosting</h3>
        <p>
          Download .ics files and host them publicly. Share the <strong>direct file URL</strong> —
          not the page/preview URL. Subscribers update on their next poll when you re-upload.
        </p>

        {/* GitHub */}
        <div className={styles.hostingBlock}>
          <div className={styles.hostingName}>GitHub</div>
          <div className={styles.hostingSteps}>
            <div>1. Create a public repo and upload your <code>.ics</code> file</div>
            <div>2. Open the file on GitHub → click <strong>Raw</strong></div>
            <div>3. Copy the <code>raw.githubusercontent.com/…</code> URL</div>
          </div>
          <div className={styles.hostingNote}>
            Or use <strong>🚀 GitHub Auto-Publish</strong> above to push files automatically.
          </div>
        </div>

        {/* Google Drive */}
        <div className={styles.hostingBlock}>
          <div className={styles.hostingName}>Google Drive</div>
          <div className={styles.hostingSteps}>
            <div>1. Upload your <code>.ics</code> file to Google Drive</div>
            <div>2. Right-click → <strong>Share</strong> → set to "Anyone with the link"</div>
            <div>3. Copy the share link and paste it below to get the direct URL</div>
          </div>
          <LinkConverter
            placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
            convert={convertDriveURL}
            hint="Paste your Google Drive share link to convert it to a direct subscription URL"
          />
          <div className={styles.hostingNote}>
            ⚠ Google Calendar may not accept Drive URLs. Apple Calendar and Outlook generally work.
          </div>
        </div>

        {/* Dropbox */}
        <div className={styles.hostingBlock}>
          <div className={styles.hostingName}>Dropbox</div>
          <div className={styles.hostingSteps}>
            <div>1. Upload your <code>.ics</code> file to Dropbox</div>
            <div>2. Click <strong>Share</strong> → copy the link</div>
            <div>3. Paste it below to convert it to a direct download URL</div>
          </div>
          <LinkConverter
            placeholder="https://www.dropbox.com/s/…/file.ics?dl=0"
            convert={convertDropboxURL}
            hint="Paste your Dropbox share link to convert it (changes dl=0 to raw=1)"
          />
        </div>
      </section>

    </div>
  );
}
