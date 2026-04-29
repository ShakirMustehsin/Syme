import styles from './Sidebar.module.css';
import { FolderOpen, Play, Undo, Trash2, Plus, Scissors, Type, Hash, BookOpen, Save, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BUILTIN_PRESETS } from '../lib/renameEngine';

const CASE_OPTIONS = [
  { value: 'none', label: 'No change' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'titlecase', label: 'Title Case' },
  { value: 'snake_case', label: 'snake_case' },
  { value: 'kebab-case', label: 'kebab-case' },
];

export default function Sidebar({
  folderPath,
  rules,
  setRules,
  onSelectFolder,
  onApply,
  onUndo,
  canUndo,
  historyCount,
  hasChanges,
  fileCount,
  changedCount,
  allPresets,
  onSavePreset,
  onDeletePreset,
  onApplyPreset,
  activeModule,
  setActiveModule,
  onShowAbout,
}) {
  const [activePanel, setActivePanel] = useState('rules'); // 'rules' | 'transform' | 'numbering' | 'presets'
  const [savePresetName, setSavePresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const update = (key, val) => setRules(r => ({ ...r, [key]: val }));

  const handleSavePreset = () => {
    if (savePresetName.trim()) {
      onSavePreset(savePresetName.trim(), rules);
      setSavePresetName('');
      setShowSaveInput(false);
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Module Switcher */}
      <div className={styles.moduleSwitcher}>
        <button 
          className={activeModule === 'rename' ? styles.moduleTabActive : styles.moduleTab}
          onClick={() => setActiveModule('rename')}
        >
          Rename
        </button>
        <button 
          className={activeModule === 'pdf' ? styles.moduleTabActive : styles.moduleTab}
          onClick={() => setActiveModule('pdf')}
        >
          PDF Cleaner
        </button>
      </div>

      {activeModule === 'rename' ? (
        <>
          {/* Folder selector */}
          <div className={styles.topSection}>
        <button className={styles.folderBtn} onClick={onSelectFolder}>
          <FolderOpen size={16} />
          <span>{folderPath ? 'Change Folder' : 'Select Folder'}</span>
        </button>
        {folderPath && (
          <div className={styles.pathDisplay} title={folderPath}>
            <span className={styles.pathDot} />
            {folderPath}
          </div>
        )}
      </div>

      {/* Panel tabs */}
      <div className={styles.panelTabs}>
        <button className={activePanel === 'rules' ? styles.panelTabActive : styles.panelTab} onClick={() => setActivePanel('rules')}>
          <Scissors size={14} /> Rules
        </button>
        <button className={activePanel === 'transform' ? styles.panelTabActive : styles.panelTab} onClick={() => setActivePanel('transform')}>
          <Type size={14} /> Case
        </button>
        <button className={activePanel === 'numbering' ? styles.panelTabActive : styles.panelTab} onClick={() => setActivePanel('numbering')}>
          <Hash size={14} /> Number
        </button>
        <button className={activePanel === 'presets' ? styles.panelTabActive : styles.panelTab} onClick={() => setActivePanel('presets')}>
          <BookOpen size={14} /> Presets
        </button>
      </div>

      {/* Panel content */}
      <div className={styles.panelContent}>
        <AnimatePresence mode="wait">

          {activePanel === 'rules' && (
            <motion.div key="rules" className={styles.panel} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              {/* Mode tabs */}
              <div className={styles.fieldLabel}>Mode</div>
              <div className={styles.modeTabs}>
                {[
                  { id: 'remove', icon: <Trash2 size={13} />, label: 'Remove' },
                  { id: 'add', icon: <Plus size={13} />, label: 'Add' },
                  { id: 'replace', icon: <Scissors size={13} />, label: 'Replace' },
                ].map(m => (
                  <button
                    key={m.id}
                    className={rules.mode === m.id ? styles.modeTabActive : styles.modeTab}
                    onClick={() => update('mode', m.id)}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {/* Dynamic inputs */}
              <AnimatePresence mode="wait">
                {(rules.mode === 'remove' || rules.mode === 'replace') && (
                  <motion.div key="find-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>{rules.mode === 'remove' ? 'Text to Remove' : 'Find'}</label>
                      <input
                        className={styles.input}
                        placeholder={rules.useRegex ? 'Regex pattern…' : 'e.g. Copy of'}
                        value={rules.findText}
                        onChange={e => update('findText', e.target.value)}
                      />
                    </div>
                    {rules.mode === 'replace' && (
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Replace With</label>
                        <input
                          className={styles.input}
                          placeholder="Replacement text"
                          value={rules.replaceText}
                          onChange={e => update('replaceText', e.target.value)}
                        />
                      </div>
                    )}
                    <div className={styles.checkRow}>
                      <label className={styles.check}>
                        <input type="checkbox" checked={rules.useRegex} onChange={e => update('useRegex', e.target.checked)} />
                        Regex mode
                      </label>
                      <label className={styles.check}>
                        <input type="checkbox" checked={rules.caseInsensitive} onChange={e => update('caseInsensitive', e.target.checked)} />
                        Ignore case
                      </label>
                    </div>
                    {rules.useRegex && (
                      <div className={styles.regexTip}>
                        <span>Tip: <code>\d+</code> = digits, <code>\s+</code> = spaces, <code>[_-]</code> = underscore or hyphen</span>
                      </div>
                    )}
                  </motion.div>
                )}
                {rules.mode === 'add' && (
                  <motion.div key="add-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Prefix</label>
                      <input
                        className={styles.input}
                        placeholder="Added before name"
                        value={rules.prefix}
                        onChange={e => update('prefix', e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Suffix</label>
                      <input
                        className={styles.input}
                        placeholder="Added after name"
                        value={rules.suffix}
                        onChange={e => update('suffix', e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auto-trim */}
              <div className={styles.divider} />
              <div className={styles.checkRow}>
                <label className={styles.check}>
                  <input type="checkbox" checked={rules.autoTrim} onChange={e => update('autoTrim', e.target.checked)} />
                  Auto-trim spaces &amp; separators
                </label>
              </div>
            </motion.div>
          )}

          {activePanel === 'transform' && (
            <motion.div key="transform" className={styles.panel} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div className={styles.fieldLabel}>Case Transformation</div>
              <div className={styles.caseGrid}>
                {CASE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={rules.caseTransform === opt.value ? styles.caseOptionActive : styles.caseOption}
                    onClick={() => update('caseTransform', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activePanel === 'numbering' && (
            <motion.div key="numbering" className={styles.panel} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div className={styles.checkRow} style={{ marginBottom: 16 }}>
                <label className={styles.check}>
                  <input type="checkbox" checked={rules.numberingEnabled} onChange={e => update('numberingEnabled', e.target.checked)} />
                  Enable sequential numbering
                </label>
              </div>
              <div style={{ opacity: rules.numberingEnabled ? 1 : 0.35, pointerEvents: rules.numberingEnabled ? 'auto' : 'none' }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Position</label>
                  <div className={styles.modeTabs}>
                    <button className={rules.numberingPosition === 'prefix' ? styles.modeTabActive : styles.modeTab} onClick={() => update('numberingPosition', 'prefix')}>Prefix</button>
                    <button className={rules.numberingPosition === 'suffix' ? styles.modeTabActive : styles.modeTab} onClick={() => update('numberingPosition', 'suffix')}>Suffix</button>
                  </div>
                </div>
                <div className={styles.inlineRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Start at</label>
                    <input className={styles.input} type="number" min="0" value={rules.numberingStart} onChange={e => update('numberingStart', Number(e.target.value))} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Digits</label>
                    <input className={styles.input} type="number" min="1" max="6" value={rules.numberingPad} onChange={e => update('numberingPad', Number(e.target.value))} />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Separator</label>
                  <input className={styles.input} placeholder="e.g. _ or -" value={rules.numberingSeparator} onChange={e => update('numberingSeparator', e.target.value)} />
                </div>
              </div>
            </motion.div>
          )}

          {activePanel === 'presets' && (
            <motion.div key="presets" className={styles.panel} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
              <div className={styles.fieldLabel}>Built-in Presets</div>
              {allPresets.filter(p => !p.isUser).map(p => (
                <button key={p.id} className={styles.presetItem} onClick={() => onApplyPreset(p.rules)}>
                  {p.name}
                </button>
              ))}

              {allPresets.some(p => p.isUser) && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.fieldLabel}>Your Presets</div>
                  {allPresets.filter(p => p.isUser).map(p => (
                    <div key={p.id} className={styles.presetItemRow}>
                      <button className={styles.presetItem} style={{ flex: 1 }} onClick={() => onApplyPreset(p.rules)}>
                        {p.name}
                      </button>
                      <button className={styles.presetDelete} onClick={() => onDeletePreset(p.id)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </>
              )}

              <div className={styles.divider} />
              {showSaveInput ? (
                <div className={styles.saveRow}>
                  <input
                    className={styles.input}
                    placeholder="Preset name…"
                    value={savePresetName}
                    onChange={e => setSavePresetName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                    autoFocus
                  />
                  <button className={styles.saveBtn} onClick={handleSavePreset}><Save size={14} /></button>
                  <button className={styles.cancelBtn} onClick={() => { setShowSaveInput(false); setSavePresetName(''); }}><X size={14} /></button>
                </div>
              ) : (
                <button className={styles.secondaryBtn} onClick={() => setShowSaveInput(true)}>
                  <Save size={14} /> Save Current Rules
                </button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Action buttons */}
          <div className={styles.actions}>
            <button
              className={hasChanges ? styles.applyBtn : styles.applyBtnDisabled}
              onClick={onApply}
              disabled={!hasChanges}
            >
              <Play size={16} />
              Apply {changedCount > 0 ? `(${changedCount})` : ''} Changes
            </button>
            <button
              className={canUndo ? styles.undoBtn : styles.undoBtnDisabled}
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo size={15} />
              Undo {historyCount > 0 ? `(${historyCount})` : ''}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.panelContent}>
          <div className={styles.panel}>
            <div className={styles.fieldLabel}>Module: PDF Cleaner</div>
            <p className={styles.pathDisplay} style={{ fontSize: '11px', marginTop: '8px' }}>
              Select PDFs in the main area to begin sanitization.
            </p>
          </div>
        </div>
      )}

      <div className={styles.sidebarFooter}>
        <button className={styles.aboutBtn} onClick={onShowAbout}>
          <Info size={14} /> About Syme
        </button>
      </div>
    </aside>
  );
}
