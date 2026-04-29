import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { applyRules, detectConflicts, resolveConflicts, generateLog, BUILTIN_PRESETS } from './lib/renameEngine';
import { useHistory } from './hooks/useHistory';
import { usePresets } from './hooks/usePresets';
import Sidebar from './components/Sidebar';
import PreviewList from './components/PreviewList';
import DropZone from './components/DropZone';
import Toast from './components/Toast';
import TitleBar from './components/TitleBar';
import AboutModal from './components/AboutModal';
import PDFCleaner from './components/PDFCleaner';
import './App.css';

// Default rules state
const DEFAULT_RULES = {
  mode: 'remove',
  findText: '',
  replaceText: '',
  prefix: '',
  suffix: '',
  autoTrim: true,
  caseInsensitive: true,
  useRegex: false,
  caseTransform: 'none',
  numberingEnabled: false,
  numberingStart: 1,
  numberingPad: 3,
  numberingPosition: 'suffix',
  numberingSeparator: ' ',
};

let toastIdCounter = 0;

export default function App() {
  const [folderPath, setFolderPath] = useState(null);
  const [files, setFiles] = useState([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [toasts, setToasts] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [activeModule, setActiveModule] = useState('rename'); // 'rename' | 'pdf'
  const [showAbout, setShowAbout] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const logRef = useRef([]);

  // Apply dark mode theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const { history, pushHistory, popHistory, canUndo, historyCount } = useHistory();
  const { allPresets, savePreset, deletePreset } = usePresets(BUILTIN_PRESETS);

  // ---- Toast helpers ----
  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ---- File loading ----
  const loadFiles = useCallback(async (path) => {
    if (!window.electronAPI) return;
    const dirFiles = await window.electronAPI.readDir(path);
    setFiles(dirFiles);
  }, []);

  const handleSelectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      addToast('Electron API not available in browser mode.', 'error');
      return;
    }
    const path = await window.electronAPI.openDirectory();
    if (path) {
      setFolderPath(path);
      await loadFiles(path);
    }
  }, [loadFiles, addToast]);

  const handleFolderDrop = useCallback(async (path) => {
    setFolderPath(path);
    await loadFiles(path);
    addToast(`Loaded folder: ${path.split(/[\\/]/).pop()}`, 'success');
  }, [loadFiles, addToast]);

  // ---- Preview computation ----
  const previewFiles = useMemo(() => {
    const previews = files.map((f, index) => {
      const { newName } = applyRules(f.name, { ...rules, numberingIndex: index });
      return {
        ...f,
        newName,
        isChanged: f.name !== newName,
      };
    });
    return resolveConflicts(previews);
  }, [files, rules]);

  const conflictNames = useMemo(() => detectConflicts(previewFiles), [previewFiles]);

  const changedFiles = useMemo(() => previewFiles.filter(f => f.isChanged), [previewFiles]);
  const hasChanges = changedFiles.length > 0;

  // ---- Apply rename ----
  const handleApply = useCallback(async () => {
    if (!hasChanges || isApplying || !window.electronAPI) return;

    setIsApplying(true);
    const loadingId = addToast('Renaming files…', 'loading', 0);

    const operations = changedFiles.map(f => {
      const pathParts = f.path.replace(/\\/g, '/').split('/');
      pathParts.pop();
      const basePath = pathParts.join('/');
      return { oldPath: f.path, newPath: `${basePath}/${f.newName}` };
    });

    try {
      const results = await window.electronAPI.renameFiles(operations);
      removeToast(loadingId);

      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      // Accumulate log
      logRef.current = [...logRef.current, ...results];

      if (successes.length > 0) {
        pushHistory(successes);
        await loadFiles(folderPath);
        addToast(`Renamed ${successes.length} file${successes.length > 1 ? 's' : ''} successfully.`, 'success');
      }
      if (failures.length > 0) {
        addToast(`${failures.length} file${failures.length > 1 ? 's' : ''} failed to rename.`, 'error');
      }
    } catch (err) {
      removeToast(loadingId);
      addToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  }, [hasChanges, isApplying, changedFiles, folderPath, loadFiles, pushHistory, addToast, removeToast]);

  // ---- Undo ----
  const handleUndo = useCallback(async () => {
    if (!canUndo || !window.electronAPI) return;

    const lastOps = popHistory();
    if (!lastOps) return;

    const reverseOps = lastOps.map(op => ({
      oldPath: op.newPath,
      newPath: op.oldPath,
    }));

    const loadingId = addToast('Undoing rename…', 'loading', 0);
    try {
      const results = await window.electronAPI.renameFiles(reverseOps);
      removeToast(loadingId);
      if (results.some(r => r.success)) {
        await loadFiles(folderPath);
        addToast('Undo successful.', 'success');
      } else {
        addToast('Undo failed — files may have been moved.', 'error');
      }
    } catch (err) {
      removeToast(loadingId);
      addToast(`Undo error: ${err.message}`, 'error');
    }
  }, [canUndo, popHistory, folderPath, loadFiles, addToast, removeToast]);

  // ---- Export log ----
  const handleExportLog = useCallback(() => {
    if (logRef.current.length === 0) {
      addToast('No operations logged yet.', 'error');
      return;
    }
    const csv = generateLog(logRef.current);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syme_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Log exported.', 'success');
  }, [addToast]);

  // ---- Preset application ----
  const handleApplyPreset = useCallback((presetRules) => {
    setRules(prev => ({ ...DEFAULT_RULES, ...presetRules }));
    addToast('Preset applied.', 'success');
  }, [addToast]);

  return (
    <div style={appStyles.root}>
      <TitleBar 
        isDarkMode={isDarkMode} 
        onToggleDarkMode={toggleDarkMode} 
      />

      {/* Body */}
      <DropZone onFolderDropped={handleFolderDrop}>
        <div className="appBody">
          <Sidebar
            folderPath={folderPath}
            rules={rules}
            setRules={setRules}
            onSelectFolder={handleSelectFolder}
            onApply={handleApply}
            onUndo={handleUndo}
            canUndo={canUndo}
            historyCount={historyCount}
            hasChanges={hasChanges}
            fileCount={files.length}
            changedCount={changedFiles.length}
            allPresets={allPresets}
            onSavePreset={savePreset}
            onDeletePreset={deletePreset}
            onApplyPreset={handleApplyPreset}
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            onShowAbout={() => setShowAbout(true)}
          />

          {activeModule === 'rename' ? (
            <PreviewList
              previewFiles={previewFiles}
              conflictNames={conflictNames}
              onExportLog={handleExportLog}
            />
          ) : (
            <PDFCleaner addToast={addToast} removeToast={removeToast} />
          )}
        </div>
      </DropZone>

      {/* Modals */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  );
}

const appStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
  },
};
