/**
 * GitHubPublish.jsx
 *
 * Publishes ICS files for every category and team to a GitHub repository
 * using the GitHub Contents API. Raw file URLs are permanent subscription endpoints.
 *
 * Settings (token + repo) are stored in localStorage — never sent anywhere
 * except directly to api.github.com.
 */

import React, { useState } from 'react';
import { api, toClubSlug } from '../api/client.js';
import styles from './GitHubPublish.module.css';

// Encode a UTF-8 string to base64 safely (handles non-ASCII characters)
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  // Process in chunks to avoid call-stack limits on large files
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function toFileSlug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fixture';
}

/** Create or update a single file in a GitHub repo via the Contents API. */
async function githubPutFile(token, repo, path, content, message) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  // Fetch existing SHA so GitHub knows we're updating, not creating a conflict
  let sha;
  try {
    const existing = await fetch(url, { headers });
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
    }
  } catch { /* file doesn't exist yet — that's fine */ }

  const body = { message, content: toBase64(content) };
  if (sha) body.sha = sha;

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API returned ${res.status}`);
  }
  return res.json();
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={copy}>
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
  );
}

export default function GitHubPublish({ categories, teams, clubName, groupBy = 'category' }) {
  const [token, setToken]       = useState(() => localStorage.getItem('githubToken') || '');
  const [repo, setRepo]         = useState(() => localStorage.getItem('githubRepo') || '');
  const [branch, setBranch]     = useState(() => localStorage.getItem('githubBranch') || 'main');
  const [savedBadge, setSaved]  = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults]   = useState(null);
  const [pubError, setPubError] = useState(null);

  const club = toClubSlug(clubName);
  const name = clubName || 'Sports Fixtures';

  const settingsValid = token.trim().length > 0 && /^[^/]+\/[^/]+$/.test(repo.trim());
  const hasContent    = categories.length > 0 || teams.length > 0;

  function saveSettings() {
    localStorage.setItem('githubToken',  token.trim());
    localStorage.setItem('githubRepo',   repo.trim());
    localStorage.setItem('githubBranch', branch.trim() || 'main');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function publish() {
    setPublishing(true);
    setPubError(null);
    setResults(null);

    const t = token.trim();
    const r = repo.trim();
    const b = branch.trim() || 'main';

    if (!settingsValid) {
      setPubError('Save valid settings first — token and repo (owner/repo) are required.');
      setPublishing(false);
      return;
    }

    // Build list of files to push: one per category + one per team
    const items = [
      ...categories.map(cat  => ({ label: cat,  type: 'category', path: `calendars/${toFileSlug(cat)}.ics`,  params: [name, club, cat,  '']  })),
      ...teams.map(     team => ({ label: team, type: 'team',     path: `calendars/${toFileSlug(team)}.ics`, params: [name, club, '',   team] })),
    ];

    const date = new Date().toISOString().slice(0, 10);
    const out  = [];

    for (const item of items) {
      try {
        const blob    = await api.exportICS(...item.params, groupBy);
        const content = await blob.text();
        await githubPutFile(t, r, item.path, content, `Update ${item.label} fixtures (${date})`);
        out.push({
          label: item.label,
          type:  item.type,
          url:   `https://raw.githubusercontent.com/${r}/${b}/${item.path}`,
          ok:    true,
        });
      } catch (e) {
        out.push({ label: item.label, type: item.type, error: e.message, ok: false });
      }
    }

    setResults(out);
    setPublishing(false);
  }

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>🚀 GitHub Auto-Publish</h3>
        <p className={styles.desc}>
          Push ICS files to a public GitHub repository. The raw URLs become permanent
          subscription endpoints — re-publish whenever fixtures change and subscribers
          update automatically on their next poll.
        </p>
      </div>

      {/* Settings */}
      <div className={styles.settings}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Personal Access Token</label>
            <input
              type="password"
              className={styles.input}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="github_pat_… or ghp_…"
              autoComplete="off"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Repository <span className={styles.labelHint}>(owner/repo)</span></label>
            <input
              type="text"
              className={styles.input}
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="myclub/fixture-calendars"
            />
          </div>
          <div className={styles.fieldNarrow}>
            <label className={styles.label}>Branch</label>
            <input
              type="text"
              className={styles.input}
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
            />
          </div>
        </div>
        <div className={styles.settingsFooter}>
          <button
            className={styles.saveBtn}
            onClick={saveSettings}
            disabled={!token.trim() || !repo.trim()}
          >
            {savedBadge ? '✓ Saved' : '💾 Save Settings'}
          </button>
          <span className={styles.settingsNote}>
            Token is stored only in your browser. The repo must be <strong>public</strong> for calendar apps to read it.
          </span>
        </div>
      </div>

      {/* Publish button */}
      <button
        className={styles.publishBtn}
        onClick={publish}
        disabled={!settingsValid || !hasContent || publishing}
        title={!hasContent ? 'Add fixtures first' : !settingsValid ? 'Save settings first' : ''}
      >
        {publishing
          ? <><span className={styles.spinner} />Publishing…</>
          : '🚀 Publish to GitHub'}
      </button>

      {pubError && <div className={styles.errorBanner}>{pubError}</div>}

      {/* Results */}
      {results && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsTitle}>Published files</span>
            <span className={styles.resultsCount}>
              {results.filter(r => r.ok).length}/{results.length} succeeded
            </span>
          </div>
          {results.map(r => (
            <div key={r.label + r.type} className={`${styles.result} ${r.ok ? styles.ok : styles.fail}`}>
              <div className={styles.resultTop}>
                <span className={styles.resultLabel}>
                  {r.type === 'category' ? '📁' : '👤'} {r.label}
                </span>
                {r.ok
                  ? <span className={styles.badge}>✓ Published</span>
                  : <span className={styles.badgeFail}>✗ Failed</span>}
              </div>
              {r.ok
                ? (
                  <div className={styles.urlRow}>
                    <span className={styles.urlText}>{r.url}</span>
                    <CopyButton text={r.url} />
                  </div>
                )
                : <div className={styles.errMsg}>{r.error}</div>
              }
            </div>
          ))}
        </div>
      )}

      {/* Token setup guide */}
      <details className={styles.guide}>
        <summary className={styles.guideSummary}>How to create a GitHub token</summary>
        <div className={styles.guideBody}>
          <ol>
            <li>Go to <strong>GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong></li>
            <li>Click <strong>Generate new token</strong></li>
            <li>Set <strong>Repository access</strong> to only your fixture calendar repo</li>
            <li>Under <strong>Permissions → Repository → Contents</strong>, choose <strong>Read and write</strong></li>
            <li>Generate, copy, and paste the token above</li>
          </ol>
          <p className={styles.guideNote}>
            Classic tokens (<code>ghp_…</code>) also work — just make sure the <code>repo</code> scope is ticked.
            Files are written to <code>calendars/seniors.ics</code>, <code>calendars/juniors.ics</code>, etc.
          </p>
        </div>
      </details>
    </section>
  );
}
