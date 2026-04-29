import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Heart, FileText, Info } from 'lucide-react';
import styles from './AboutModal.module.css';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <img src="/syme.png" alt="Syme" className={styles.logo} />
              <div className={styles.version}>v1.0.0</div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.content}>
            <h2 className={styles.aboutTitle}>About Syme</h2>
            <p className={styles.description}>
              Syme is a file name refinement utility built on a simple idea:
              <br /><br />
              <strong>Most names carry more than they need.</strong>
              <br /><br />
              Inspired by the character Syme from the novel <em>1984</em> by George Orwell, a specialist in reducing language to its most efficient form, this tool follows the same philosophy: eliminate the unnecessary and preserve the essential.
            </p>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>How it works</h3>
              <p className={styles.sectionText}>
                Syme processes files within a selected directory and applies controlled transformations:
              </p>
              <ul className={styles.featureList}>
                <li>Removes unwanted patterns (case-insensitive)</li>
                <li>Adds structured prefixes or suffixes</li>
                <li>Cleans residual separators like underscores, hyphens, and extra spaces</li>
                <li>Provides a full preview before any change is applied</li>
                <li>Supports undo to maintain safety and control</li>
              </ul>
              <p className={styles.sectionText} style={{ marginTop: '12px' }}>
                Every action is visible, reversible, and intentional.
              </p>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Philosophy</h3>
              <p className={styles.sectionText}>
                <strong>Reduction is clarity.</strong>
                <br />
                Syme avoids automation that hides decisions. Instead, it gives you control, one deliberate transformation at a time.
              </p>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Author</h3>
              <p className={styles.sectionText}>
                Created by <strong>Astra Calce</strong>
                <br />
                This project is part of an ongoing exploration of minimal, utility-driven software, where function, clarity, and design coexist.
              </p>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>📜 Copyright & Usage</h3>
              <p className={styles.sectionText}>
                Syme is distributed for personal and educational use.
              </p>
              <ul className={styles.featureList}>
                <li>All original code and design are authored by Astra Calce</li>
                <li>Contributions are managed through GitHub</li>
                <li>This tool does not modify or bypass protected content</li>
                <li>Users are responsible for how they apply file transformations</li>
              </ul>
            </div>

            <div className={styles.closingNote}>
              <p>Syme does not try to do everything.</p>
              <p>It does one thing well:</p>
              <p><strong>It removes what does not belong.</strong></p>
            </div>
          </div>

          <div className={styles.footer}>
            <button className={styles.footerLink}>
              <ExternalLink size={14} /> Documentation
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
