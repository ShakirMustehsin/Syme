import React, { useState, useCallback, useMemo } from 'react';
import { FileText, Search, Trash2, Scissors, AlertCircle, CheckCircle, Loader2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PDFCleaner.module.css';

export default function PDFCleaner({ addToast, removeToast }) {
  const [files, setFiles] = useState([]); // Array of { file, path, name, status, text, pages }
  const [rules, setRules] = useState({
    mode: 'remove',
    findText: '',
    replaceText: '',
    useRegex: false,
    caseInsensitive: true,
    scope: 'all', 
    pageRange: '',
  });
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [scanStatus, setScanStatus] = useState({ count: 0, scanning: false });
  const [showRawText, setShowRawText] = useState(false);

  // Auto-select first file
  React.useEffect(() => {
    if (files.length > 0 && selectedFileIndex === null) {
      setSelectedFileIndex(0);
    }
  }, [files, selectedFileIndex]);

  const handleSelectFiles = async () => {
    if (!window.electronAPI) return;
    const filePaths = await window.electronAPI.openFiles({
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    
    if (filePaths.length > 0) {
      const newFiles = filePaths.map(p => ({
        path: p,
        name: p.split(/[\\/]/).pop(),
        status: 'pending',
        text: '',
        pages: 0,
        occurrences: [], 
        error: null
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (droppedFiles.length === 0) {
      addToast('Please drop PDF files only.', 'error');
      return;
    }

    const newFiles = droppedFiles.map(f => ({
      file: f,
      path: f.path, 
      name: f.name,
      status: 'pending',
      text: '',
      pages: 0,
      occurrences: [],
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [addToast]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFileIndex === index) {
      setSelectedFileIndex(files.length > 1 ? 0 : null);
    }
  };

  // Load file info when files change
  React.useEffect(() => {
    const loadInfo = async () => {
      const updatedFiles = [...files];
      let changed = false;

      for (let i = 0; i < updatedFiles.length; i++) {
        if (updatedFiles[i].status === 'pending') {
          try {
            updatedFiles[i].status = 'loading';
            const info = await window.electronAPI.getPDFInfo(updatedFiles[i].path);
            if (info.pages > 0) {
              updatedFiles[i].pages = info.pages;
              updatedFiles[i].text = `Title: ${info.title || 'Untitled'}\nAuthor: ${info.author || 'Unknown'}\nPages: ${info.pages}\n\n[Analyzing content...]`;
              
              if (updatedFiles[i].name.toLowerCase().includes('scan')) {
                updatedFiles[i].status = 'warning';
              } else {
                updatedFiles[i].status = 'ready';
              }
            }
            changed = true;
          } catch (e) {
            updatedFiles[i].status = 'error';
            updatedFiles[i].error = e.message;
            changed = true;
          }
        }
      }

      if (changed) setFiles(updatedFiles);
    };

    loadInfo();
  }, [files]);


  const [isProcessing, setIsProcessing] = useState(false);


  // Live scan for occurrences when findText or files change
  React.useEffect(() => {
    if (!rules.findText || rules.findText.length < 3 || files.length === 0) {
      setScanStatus({ count: 0, scanning: false });
      return;
    }

    const timer = setTimeout(async () => {
      setScanStatus(prev => ({ ...prev, scanning: true }));
      
      const updatedFiles = [...files];
      let totalMatches = 0;

      for (let i = 0; i < updatedFiles.length; i++) {
        const file = updatedFiles[i];
        if (file.status === 'ready' || file.status === 'warning') {
          try {
            // Call the high-speed binary backend scanner
            const result = await window.electronAPI.scanPDF(file.path, rules);
            
            updatedFiles[i].occurrences = result.occurrences || [];
            // Force status message update
            updatedFiles[i].text = result.text || 'No instances found.';
            totalMatches += (result.count || 0);
          } catch (e) {
            console.error(`Backend scan error for ${file.name}:`, e);
          }
        }
      }
      
      setFiles(updatedFiles);
      setScanStatus({ count: totalMatches, scanning: false });
    }, 600);

    return () => clearTimeout(timer);
  }, [rules.findText, rules.caseInsensitive, rules.useRegex, files.length]);

  const handleApply = async () => {
    if (files.length === 0 || !rules.findText || scanStatus.count === 0) return;
    
    const confirmCleanup = window.confirm(`Syme will mask ${scanStatus.count} instances of "${rules.findText}" across ${files.length} file(s). This action creates new files and cannot be undone. Continue?`);
    if (!confirmCleanup) return;

    setIsProcessing(true);
    const toastId = addToast(`Cleaning ${files.length} PDF(s)...`, 'loading', 0);

    try {
      let successCount = 0;
      for (const f of files) {
        // Pass occurrences to the backend so it knows exactly where to "clean"
        const result = await window.electronAPI.processPDF(f.path, { 
          ...rules, 
          occurrences: f.occurrences 
        });
        if (result.success) successCount++;
      }
      removeToast(toastId);
      addToast(`Successfully cleaned ${successCount} PDF(s).`, 'success');
    } catch (e) {
      removeToast(toastId);
      addToast(`Error processing PDFs: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container} onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}>
      <div className={styles.header}>
        <h2 className={styles.title}>PDF Text Cleaner</h2>
        <p className={styles.subtitle}>Sanitize and refine PDF content with precision.</p>
      </div>

      <div className={styles.mainLayout}>
        {/* Left: File List & Rules */}
        <div className={styles.leftPanel}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Target Files</h3>
              <span className={styles.badge}>{files.length}</span>
            </div>
            
            {files.length === 0 ? (
              <div className={styles.dropZone}>
                <FileText size={32} />
                <p>Drop PDF files here</p>
                <button className={styles.selectBtn} onClick={handleSelectFiles}>Select Files</button>
              </div>
            ) : (
              <div className={styles.fileList}>
                {files.map((f, i) => (
                  <div 
                    key={i} 
                    className={`${styles.fileItem} ${selectedFileIndex === i ? styles.fileItemActive : ''}`}
                    onClick={() => setSelectedFileIndex(i)}
                  >
                    <FileText size={16} />
                    <div className={styles.fileItemContent}>
                      <span className={styles.fileName}>{f.name}</span>
                      {f.occurrences.length > 0 && (
                        <span className={styles.matchBadge}>{f.occurrences.length} matches</span>
                      )}
                    </div>
                    <button className={styles.removeFileBtn} onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button className={styles.addMoreBtn} onClick={handleSelectFiles}>
                  <Plus size={14} /> Add More Files
                </button>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Cleanup Rules</h3>
            <div className={styles.ruleBox}>
              {/* ... existing modeTabs ... */}
              <div className={styles.modeTabs}>
                <button 
                  className={rules.mode === 'remove' ? styles.modeTabActive : styles.modeTab}
                  onClick={() => setRules(r => ({ ...r, mode: 'remove' }))}
                >
                  <Trash2 size={13} /> Remove
                </button>
                <button 
                  className={rules.mode === 'replace' ? styles.modeTabActive : styles.modeTab}
                  onClick={() => setRules(r => ({ ...r, mode: 'replace' }))}
                >
                  <Scissors size={13} /> Replace
                </button>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{rules.mode === 'remove' ? 'Text to Remove' : 'Find Text'}</label>
                <div className={styles.inputWrapper}>
                  <Search size={14} className={styles.searchIcon} />
                  <input 
                    className={styles.input}
                    placeholder="Search pattern..."
                    value={rules.findText}
                    onChange={e => setRules(r => ({ ...r, findText: e.target.value }))}
                  />
                  {scanStatus.scanning && <Loader2 size={12} className={`${styles.spinner} ${styles.inputLoader}`} />}
                </div>
              </div>

              {rules.findText.length > 2 && !scanStatus.scanning && (
                <div className={styles.scanSummary}>
                  <CheckCircle size={12} />
                  Found {scanStatus.count} instances across {files.length} files.
                </div>
              )}
              {/* ... existing replace fields ... */}
              {rules.mode === 'replace' && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Replace With</label>
                  <input 
                    className={styles.input}
                    placeholder="Replacement text"
                    value={rules.replaceText}
                    onChange={e => setRules(r => ({ ...r, replaceText: e.target.value }))}
                  />
                </div>
              )}

              <div className={styles.checkRow}>
                <label className={styles.check}>
                  <input type="checkbox" checked={rules.useRegex} onChange={e => setRules(r => ({ ...r, useRegex: e.target.checked }))} />
                  Regex
                </label>
                <label className={styles.check}>
                  <input type="checkbox" checked={rules.caseInsensitive} onChange={e => setRules(r => ({ ...r, caseInsensitive: e.target.checked }))} />
                  Ignore Case
                </label>
              </div>
              {/* ... existing divider/scope ... */}
              <div className={styles.divider} />

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Scope</label>
                <select 
                  className={styles.select}
                  value={rules.scope}
                  onChange={e => setRules(r => ({ ...r, scope: e.target.value }))}
                >
                  <option value="all">Entire Document</option>
                  <option value="first">First Page Only</option>
                  <option value="range">Specific Page Range</option>
                </select>
              </div>

              {rules.scope === 'range' && (
                <div className={styles.fieldGroup}>
                  <input 
                    className={styles.input}
                    placeholder="e.g. 1-3, 5, 8-10"
                    value={rules.pageRange}
                    onChange={e => setRules(r => ({ ...r, pageRange: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          <button 
            className={styles.applyBtn} 
            disabled={files.length === 0 || !rules.findText || isProcessing || scanStatus.count === 0}
            onClick={handleApply}
          >
            {isProcessing ? <Loader2 className={styles.spinner} size={16} /> : <Trash2 size={16} />}
            {isProcessing ? 'Cleaning...' : `Remove ${scanStatus.count > 0 ? scanStatus.count : ''} Occurrences`}
          </button>
        </div>

        {/* Right: Preview Panel */}
        <div className={styles.rightPanel}>
          <div className={styles.previewHeader}>
            <h3 className={styles.sectionTitle}>Content Preview</h3>
            {selectedFileIndex !== null && (
              <button 
                className={`${styles.debugBtn} ${showRawText ? styles.debugBtnActive : ''}`}
                onClick={() => setShowRawText(!showRawText)}
                title="Diagnostic View: Show raw text extraction"
              >
                <AlertCircle size={13} /> {showRawText ? 'Hide Raw Text' : 'X-Ray View'}
              </button>
            )}
          </div>
          <div className={styles.previewContent}>
            {selectedFileIndex === null ? (
              <div className={styles.emptyPreview}>
                <Search size={48} />
                <p>Select a file to preview text content</p>
              </div>
            ) : (
              <div className={styles.textContent}>
                <div className={styles.fileInfo}>
                  <strong>{files[selectedFileIndex].name}</strong>
                  <span>{files[selectedFileIndex].pages || '?'} pages</span>
                </div>
                <div className={styles.textScroll}>
                  {showRawText ? (
                    <div className={styles.rawTextContainer}>
                      <div className={styles.debugHeader}>Diagnostic View: Raw PDF Stream</div>
                      <pre className={styles.pre}>{files[selectedFileIndex].text || 'No text extracted.'}</pre>
                    </div>
                  ) : files[selectedFileIndex].status === 'warning' ? (
                    <div className={styles.ocrWarning}>
                      <AlertCircle size={48} className={styles.warningIcon} />
                      <h4 className={styles.warningTitle}>Non-selectable Text Detected</h4>
                      <p className={styles.warningText}>This file appears to be a scan or image-based PDF. Try the "X-Ray View" above to verify if any text is readable.</p>
                    </div>
                  ) : files[selectedFileIndex].text ? (
                    <pre className={styles.pre}>{files[selectedFileIndex].text}</pre>
                  ) : (
                    <div className={styles.noText}>
                      <AlertCircle size={24} />
                      <p>Scanning text content...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
