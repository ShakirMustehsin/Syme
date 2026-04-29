const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, PDFArray, PDFString, PDFHexString } = require('pdf-lib');

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: Math.min(1280, width * 0.9),
    height: Math.min(850, height * 0.9),
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Window management (Handlers registered once)
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow.close());
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized());

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximizeChange', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximizeChange', false));
}

// Ensure handlers are only registered once
function registerIpcHandlers() {
  ipcMain.handle('dialog:openFiles', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: options.filters || [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    return result.filePaths;
  });

  ipcMain.handle('pdf:getInfo', async (_event, filePath) => {
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return { pages: pdfDoc.getPageCount(), title: pdfDoc.getTitle() };
  });

  // ADVANCED SCAN ENGINE (Streaming-ready)
  ipcMain.handle('pdf:scan', async (_event, { filePath, findText, mode, caseInsensitive, wholeWord }) => {
    let occurrences = [];
    try {
      const buffer = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      const searchTerm = caseInsensitive ? findText.toLowerCase() : findText;

      // Construct Regex based on mode
      let regex;
      const flags = caseInsensitive ? 'gi' : 'g';
      if (mode === 'regex') {
        regex = new RegExp(findText, flags);
      } else if (mode === 'word' || wholeWord) {
        regex = new RegExp(`\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
      } else {
        regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      }

      // 1. Structural Scan (Page-by-Page)
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { height } = page.getSize();
        
        // Link Annotation Processing
        const annots = page.node.get(pdfDoc.context.obj('Annots'));
        if (annots instanceof PDFArray) {
          for (let j = 0; j < annots.size(); j++) {
            const annot = pdfDoc.context.lookup(annots.get(j));
            const a = annot ? pdfDoc.context.lookup(annot.get(pdfDoc.context.obj('A'))) : null;
            const uriObj = a ? pdfDoc.context.lookup(a.get(pdfDoc.context.obj('URI'))) : null;
            
            let uri = null;
            if (uriObj instanceof PDFString || uriObj instanceof PDFHexString) {
              uri = uriObj.decodeText();
            }

            if (uri && uri.match(regex)) {
              const rect = annot.get(pdfDoc.context.obj('Rect')).asArray().map(n => n.asNumber());
              occurrences.push({
                page: i + 1, x: rect[0], y: height - rect[3], width: rect[2] - rect[0], height: rect[3] - rect[1],
                text: uri, type: 'annotation'
              });
            }
          }
        }
      }

      // 2. DNA Scan (Binary)
      const contentStr = buffer.toString('latin1');
      const dnaMatches = [...contentStr.matchAll(regex)].length;

      return { count: Math.max(dnaMatches, occurrences.length), occurrences, dnaMatches };
    } catch (e) {
      return { count: 0, occurrences: [], error: e.message };
    }
  });

  // ADVANCED REDACTION ENGINE (Streaming Chunk Processing)
  ipcMain.handle('pdf:process', async (_event, { filePath, rules }) => {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const occurrences = rules.occurrences || [];

      // Phase 1: Structural Redaction (Page by Page)
      for (const occ of occurrences) {
        const page = pages[occ.page - 1];
        if (page && occ.width > 0) {
          const { height } = page.getSize();
          page.drawRectangle({
            x: occ.x - 1, y: height - occ.y - occ.height - 1,
            width: occ.width + 2, height: occ.height + 2,
            color: rgb(1, 1, 1),
          });
        }
      }

      // Phase 2: Binary DNA Scrubbing
      let finalBuffer = Buffer.from(await pdfDoc.save());
      const flags = rules.caseInsensitive ? 'gi' : 'g';
      let regex;
      if (rules.mode === 'regex') regex = new RegExp(rules.findText, flags);
      else if (rules.mode === 'word' || rules.wholeWord) regex = new RegExp(`\\b${rules.findText}\\b`, flags);
      else regex = new RegExp(rules.findText, flags);

      const contentStr = finalBuffer.toString('latin1');
      const matches = [...contentStr.matchAll(regex)];
      
      for (const match of matches.reverse()) {
        const replacement = Buffer.alloc(match[0].length, 32); // Space character
        finalBuffer.fill(replacement, match.index, match.index + match[0].length);
      }

      const newPath = filePath.replace('.pdf', '_redacted.pdf');
      fs.writeFileSync(newPath, finalBuffer);
      return { success: true, newPath, count: Math.max(matches.length, occurrences.length) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
