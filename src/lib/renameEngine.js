/**
 * Syme Rename Engine
 * Pure functions for transforming filenames. No UI coupling.
 */

/**
 * Apply all rename rules to a single filename.
 * @param {string} filename - Original filename (with extension)
 * @param {Object} rules - Rename rule set
 * @returns {{ stem: string, ext: string, newName: string }}
 */
export function applyRules(filename, rules) {
  const {
    mode,
    findText = '',
    replaceText = '',
    prefix = '',
    suffix = '',
    autoTrim = true,
    caseInsensitive = true,
    useRegex = false,
    caseTransform = 'none',
    numberingEnabled = false,
    numberingStart = 1,
    numberingPad = 3,
    numberingPosition = 'suffix',
    numberingIndex = 0, // caller must supply per-file index
    numberingSeparator = ' ',
  } = rules;

  // Split stem and extension
  const lastDot = filename.lastIndexOf('.');
  let stem = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot !== -1 ? filename.slice(lastDot) : '';

  // --- Mode: Remove ---
  if (mode === 'remove' && findText) {
    stem = applyFind(stem, findText, '', caseInsensitive, useRegex);
  }

  // --- Mode: Replace ---
  if (mode === 'replace' && findText) {
    stem = applyFind(stem, findText, replaceText, caseInsensitive, useRegex);
  }

  // --- Mode: Add ---
  if (mode === 'add') {
    stem = `${prefix}${stem}${suffix}`;
  }

  // --- Case transformation ---
  stem = applyCaseTransform(stem, caseTransform);

  // --- Auto-trim ---
  if (autoTrim) {
    stem = stem
      .replace(/[\s_-]{2,}/g, ' ')   // collapse repeated separators
      .replace(/^[\s_-]+|[\s_-]+$/g, '') // trim leading/trailing
      .trim();
  }

  // --- Numbering ---
  if (numberingEnabled) {
    const num = String(numberingStart + numberingIndex).padStart(numberingPad, '0');
    if (numberingPosition === 'prefix') {
      stem = `${num}${numberingSeparator}${stem}`;
    } else {
      stem = `${stem}${numberingSeparator}${num}`;
    }
  }

  const newName = stem + ext;
  return { stem, ext, newName };
}

/**
 * Apply find/replace (literal or regex) to a string.
 */
function applyFind(str, find, replace, caseInsensitive, useRegex) {
  try {
    const flags = caseInsensitive ? 'gi' : 'g';
    const pattern = useRegex
      ? new RegExp(find, flags)
      : new RegExp(escapeRegex(find), flags);
    return str.replace(pattern, replace);
  } catch {
    // Invalid regex — return original
    return str;
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply case transformation.
 */
function applyCaseTransform(str, transform) {
  switch (transform) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'titlecase':
      return str.replace(/\b\w/g, c => c.toUpperCase());
    case 'snake_case':
      return str
        .replace(/[\s\-]+/g, '_')
        .replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '_' : '') + c.toLowerCase())
        .replace(/__+/g, '_')
        .toLowerCase();
    case 'kebab-case':
      return str
        .replace(/[\s_]+/g, '-')
        .replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase())
        .replace(/--+/g, '-')
        .toLowerCase();
    default:
      return str;
  }
}

/**
 * Detect conflicts in a list of proposed new names.
 * Returns a Map of newName -> count.
 */
export function detectConflicts(previews) {
  const counts = new Map();
  for (const { newName } of previews) {
    counts.set(newName, (counts.get(newName) || 0) + 1);
  }
  // Return only duplicates
  const conflicts = new Set();
  for (const [name, count] of counts) {
    if (count > 1) conflicts.add(name);
  }
  return conflicts;
}

/**
 * Auto-resolve conflicts by appending (1), (2) etc.
 */
export function resolveConflicts(previews) {
  const seen = new Map();
  return previews.map(p => {
    if (!seen.has(p.newName)) {
      seen.set(p.newName, 0);
      return p;
    }
    // Conflict — bump suffix
    const count = seen.get(p.newName) + 1;
    seen.set(p.newName, count);
    const lastDot = p.newName.lastIndexOf('.');
    const stem = lastDot !== -1 ? p.newName.slice(0, lastDot) : p.newName;
    const ext = lastDot !== -1 ? p.newName.slice(lastDot) : '';
    return { ...p, newName: `${stem} (${count})${ext}`, hasConflict: true };
  });
}

/** File type category map */
export const FILE_CATEGORIES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'],
  videos: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf'],
  code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'html', 'css'],
};

export function getCategory(ext) {
  const clean = ext.replace('.', '').toLowerCase();
  for (const [cat, exts] of Object.entries(FILE_CATEGORIES)) {
    if (exts.includes(clean)) return cat;
  }
  return 'other';
}

/** Generate a CSV log string from operation results */
export function generateLog(operations) {
  const timestamp = new Date().toISOString();
  const header = 'Timestamp,Original,Renamed,Status,Error\n';
  const rows = operations.map(op =>
    `"${timestamp}","${op.oldPath}","${op.newPath}","${op.success ? 'success' : 'error'}","${op.error || ''}"`
  );
  return header + rows.join('\n');
}

/** Built-in presets */
export const BUILTIN_PRESETS = [
  {
    id: 'clean_copy',
    name: 'Remove "Copy of"',
    rules: { mode: 'remove', findText: 'Copy of ', autoTrim: true, caseInsensitive: true },
  },
  {
    id: 'remove_parens',
    name: 'Remove (1), (2)...',
    rules: { mode: 'remove', findText: '\\(\\d+\\)', useRegex: true, autoTrim: true, caseInsensitive: false },
  },
  {
    id: 'snake_to_spaces',
    name: 'Underscores → Spaces',
    rules: { mode: 'replace', findText: '_', replaceText: ' ', autoTrim: true, caseInsensitive: false },
  },
  {
    id: 'to_lowercase',
    name: 'Lowercase All',
    rules: { mode: 'remove', findText: '', caseTransform: 'lowercase', autoTrim: true },
  },
  {
    id: 'sequence_prefix',
    name: 'Add Sequence Number',
    rules: { mode: 'remove', findText: '', numberingEnabled: true, numberingPosition: 'prefix', numberingStart: 1, numberingPad: 3, numberingSeparator: ' - ', autoTrim: true },
  },
];
