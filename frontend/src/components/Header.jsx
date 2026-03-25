import React from 'react';
import styles from './Header.module.css';

export default function Header({ clubName, onClubNameChange }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.icon}>🏉</span>
          <div>
            <div className={styles.appName}>ICS Calendar Generator</div>
            <div className={styles.tagline}>Fixture Manager & Subscription Calendar</div>
          </div>
        </div>
        <div className={styles.clubInput}>
          <label htmlFor="clubName" className={styles.clubLabel}>Club / Calendar Name</label>
          <input
            id="clubName"
            type="text"
            value={clubName}
            onChange={e => onClubNameChange(e.target.value)}
            placeholder="e.g. Redcliffe Dolphins RLFC"
            className={styles.input}
          />
        </div>
      </div>
    </header>
  );
}
