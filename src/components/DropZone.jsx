import { useCallback, useRef, useState } from 'react';
import styles from './DropZone.module.css';
import { FolderOpen } from 'lucide-react';

export default function DropZone({ onFolderDropped, children }) {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    const items = Array.from(e.dataTransfer.items || []);
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry && entry.isDirectory) {
        // Get path via File object (Electron provides full paths)
        const file = item.getAsFile();
        if (file && file.path) {
          onFolderDropped(file.path);
          return;
        }
      }
    }
    // Fallback: try files array
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0 && files[0].path) {
      // If it's a directory, the path will point to it
      onFolderDropped(files[0].path);
    }
  }, [onFolderDropped]);

  return (
    <div
      className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <FolderOpen size={48} strokeWidth={1} />
            <p>Drop folder here</p>
          </div>
        </div>
      )}
    </div>
  );
}
