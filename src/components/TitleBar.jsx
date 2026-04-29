import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './TitleBar.module.css';

export default function TitleBar({ isDarkMode, onToggleDarkMode }) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Sync initial state — guard against IPC race on HMR reload
    window.electronAPI.isMaximized()
      .then(setIsMaximized)
      .catch(() => {});

    // Listen for changes
    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized);
    return cleanup;
  }, []);

  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose   = () => window.electronAPI?.closeWindow();

  return (
    <div className={styles.bar}>
      {/* Drag region — covers most of the bar */}
      <div className={styles.dragRegion} />

      {/* Brand */}
      <div className={styles.brand}>
        <img src="/syme.png" alt="Syme" className={styles.logo} />
        <span className={styles.brandTag}>Reduce the unnecessary.</span>
      </div>

      {/* Right-side utilities */}
      <div className={styles.rightSide}>
        <button 
          className={styles.themeToggle} 
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Window controls — no-drag so clicks register */}
        <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles.minimize}`}
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize window"
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1.5" rx="0.75" fill="currentColor"/></svg>
        </button>

        <button
          className={`${styles.btn} ${styles.maximize}`}
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        >
          {isMaximized ? (
            /* Restore icon */
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="2" y="0" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <rect x="0" y="2" width="8" height="8" rx="1" fill="var(--bg-secondary)" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          ) : (
            /* Maximize icon */
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            </svg>
          )}
        </button>

        <button
          className={`${styles.btn} ${styles.close}`}
          onClick={handleClose}
          title="Close"
          aria-label="Close window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
);
}
