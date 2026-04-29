import styles from './PreviewList.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileType2, Image, Video, Music, FileText, Code, AlertTriangle,
  ChevronDown, Filter, ArrowUpDown, Download
} from 'lucide-react';
import { useState } from 'react';
import { FILE_CATEGORIES } from '../lib/renameEngine';

const CATEGORY_ICONS = {
  images: <Image size={15} />,
  videos: <Video size={15} />,
  audio: <Music size={15} />,
  documents: <FileText size={15} />,
  code: <Code size={15} />,
  other: <FileType2 size={15} />,
};

const CATEGORIES_LIST = ['all', 'images', 'videos', 'audio', 'documents', 'code', 'other'];

function getCategory(ext) {
  const clean = ext.replace('.', '').toLowerCase();
  for (const [cat, exts] of Object.entries(FILE_CATEGORIES)) {
    if (exts.includes(clean)) return cat;
  }
  return 'other';
}

export default function PreviewList({ previewFiles, conflictNames, onExportLog }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'ext' | 'changed'

  const totalFiles = previewFiles.length;
  const changedCount = previewFiles.filter(f => f.isChanged).length;
  const conflictCount = conflictNames ? conflictNames.size : 0;

  // Filtering
  let filtered = previewFiles;
  if (activeFilter !== 'all') {
    filtered = filtered.filter(f => getCategory(f.ext) === activeFilter);
  }
  if (showChangedOnly) {
    filtered = filtered.filter(f => f.isChanged);
  }

  // Sorting
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'ext') return a.ext.localeCompare(b.ext);
    if (sortBy === 'changed') return (b.isChanged ? 1 : 0) - (a.isChanged ? 1 : 0);
    return a.name.localeCompare(b.name);
  });

  return (
    <main className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>Live Preview</span>
          <span className={styles.stat}>{totalFiles} files</span>
          {changedCount > 0 && <span className={styles.statChanged}>{changedCount} will rename</span>}
          {conflictCount > 0 && (
            <span className={styles.statConflict}>
              <AlertTriangle size={12} /> {conflictCount} conflicts
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showChangedOnly}
              onChange={e => setShowChangedOnly(e.target.checked)}
            />
            Changed only
          </label>
          <button className={styles.sortBtn} onClick={() => setSortBy(s => s === 'name' ? 'ext' : s === 'ext' ? 'changed' : 'name')}>
            <ArrowUpDown size={13} />
            {sortBy === 'name' ? 'Name' : sortBy === 'ext' ? 'Type' : 'Status'}
          </button>
          <button className={styles.exportBtn} onClick={onExportLog} title="Export rename log">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterBar}>
        {CATEGORIES_LIST.map(cat => (
          <button
            key={cat}
            className={activeFilter === cat ? styles.filterTabActive : styles.filterTab}
            onClick={() => setActiveFilter(cat)}
          >
            {cat === 'all' ? <Filter size={12} /> : CATEGORY_ICONS[cat]}
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* File list */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <FileType2 size={40} strokeWidth={1} />
            <p>{totalFiles === 0 ? 'Select a folder to begin.' : 'No files match the current filter.'}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((file, i) => {
              const isConflict = conflictNames && conflictNames.has(file.newName) && file.isChanged;
              const cat = getCategory(file.ext);
              return (
                <motion.div
                  key={file.path}
                  layout
                  className={`${styles.item} ${file.isChanged ? styles.itemChanged : ''} ${isConflict ? styles.itemConflict : ''}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(i * 0.01, 0.3) }}
                >
                  <span className={styles.icon}>{CATEGORY_ICONS[cat]}</span>
                  <div className={styles.names}>
                    <span className={file.isChanged ? styles.oldName : styles.name}>{file.name}</span>
                    {file.isChanged && (
                      <div className={styles.newRow}>
                        <span className={styles.arrow}>→</span>
                        <span className={`${styles.newName} ${isConflict ? styles.newNameConflict : ''}`}>{file.newName}</span>
                        {isConflict && <span className={styles.conflictBadge}><AlertTriangle size={11} /> conflict</span>}
                      </div>
                    )}
                  </div>
                  <span className={styles.extBadge}>{file.ext || '—'}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
