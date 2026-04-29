const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts, PDFArray, PDFString, PDFHexString } = require('pdf-lib');

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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Window management
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.close());
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized());

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximizeChange', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximizeChange', false));

  // File System Handlers
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:openFiles', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    return result.filePaths;
  });

  ipcMain.handle('fs:readDir', async (_event, dirPath) => {
    try {
      const files = fs.readdirSync(dirPath);
      return files.map(file => {
        const stats = fs.statSync(path.join(dirPath, file));
        return {
          name: file,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      });
    } catch (e) {
      console.error('[syme] fs:readDir error:', e.message);
      throw e;
    }
  });

  ipcMain.handle('fs:renameFiles', async (_event, operations) => {
    const results = [];
    for (const op of operations) {
      try {
        fs.renameSync(op.oldPath, op.newPath);
        results.push({ success: true, ...op });
      } catch (e) {
        results.push({ success: false, error: e.message, ...op });
      }
    }
    return results;
  });

  // PDF Handlers
  ipcMain.handle('pdf:getInfo', async (_event, filePath) => {
    try {
      const bytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      return {
        pages: pdfDoc.getPageCount(),
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        creator: pdfDoc.getCreator(),
      };
    } catch (e) {
      console.error('[syme] pdf:getInfo error:', e.message);
      throw e;
    }
  });

  ipcMain.handle('pdf:scan', async (_event, { filePath, findText }) => {
    let occurrences = [];
    const searchTerm = findText.toLowerCase();

    try {
      const buffer = fs.readFileSync(filePath);
      const contentStr = buffer.toString('latin1').toLowerCase();
      
      // 1. ABSOLUTE BINARY SCAN
      let binaryCount = 0;
      let bPos = contentStr.indexOf(searchTerm);
      while (bPos !== -1) {
        binaryCount++;
        bPos = contentStr.indexOf(searchTerm, bPos + 1);
      }

      // 2. STRUCTURAL SCAN
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { height } = page.getSize();
          
          const annots = page.node.get(pdfDoc.context.obj('Annots'));
          if (annots instanceof PDFArray) {
            for (let j = 0; j < annots.size(); j++) {
              const annotRef = annots.get(j);
              const annot = pdfDoc.context.lookup(annotRef);
              if (!annot) continue;

              const a = pdfDoc.context.lookup(annot.get(pdfDoc.context.obj('A')));
              const uriObj = a ? pdfDoc.context.lookup(a.get(pdfDoc.context.obj('URI'))) : null;
              
              let isMatch = false;
              if (uriObj instanceof PDFString || uriObj instanceof PDFHexString) {
                const url = uriObj.decodeText().toLowerCase();
                if (url.includes(searchTerm)) isMatch = true;
              }

              if (isMatch) {
                const rect = annot.get(pdfDoc.context.obj('Rect'));
                if (rect instanceof PDFArray) {
                  const [x1, y1, x2, y2] = rect.asArray().map(n => n.asNumber());
                  occurrences.push({
                    page: i + 1,
                    x: x1,
                    y: height - y2,
                    width: x2 - x1,
                    height: y2 - y1,
                    text: 'Link Annotation',
                    type: 'annotation'
                  });
                }
              }
            }
          }
        }
      } catch (libErr) {
        console.warn('[Syme] Structural scan failed:', libErr.message);
      }

      if (occurrences.length === 0 && binaryCount > 0) {
        occurrences.push({ page: 1, x: 0, y: 0, width: 0, height: 0, type: 'binary_only' });
      }

      return { 
        count: Math.max(binaryCount, occurrences.length), 
        occurrences, 
        text: binaryCount > 0 
          ? `Detected ${binaryCount} instances in DNA. Painting masks for ${occurrences.length} structural links.`
          : 'No literal matches found.'
      };
    } catch (e) {
      return { count: 0, occurrences: [], error: e.message };
    }
  });

  ipcMain.handle('pdf:process', async (_event, { filePath, rules }) => {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const searchTerm = rules.findText.toLowerCase();
      const occurrences = rules.occurrences || [];
      
      // Phase 1: White Out & Link Removal
      for (const occ of occurrences) {
        const pageIndex = occ.page - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          const page = pages[pageIndex];
          const { height } = page.getSize();
          
          if (occ.width > 0) {
            page.drawRectangle({
              x: occ.x - 1,
              y: height - occ.y - occ.height - 1, 
              width: occ.width + 2,
              height: occ.height + 2,
              color: rgb(1, 1, 1),
            });
          }
        }
      }

      // Phase 2: Binary DNA Wipe
      let finalBuffer = Buffer.from(await pdfDoc.save());
      const searchBuffer = Buffer.from(searchTerm, 'utf8');
      const replacement = Buffer.alloc(searchBuffer.length, 32); 
      
      let bPos = finalBuffer.indexOf(searchBuffer);
      let replacedCount = 0;
      while (bPos !== -1) {
        finalBuffer.fill(replacement, bPos, bPos + searchBuffer.length);
        replacedCount++;
        bPos = finalBuffer.indexOf(searchBuffer, bPos + 1);
      }

      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const name = path.basename(filePath, ext);
      const newPath = path.join(dir, `${name}_cleaned${ext}`);
      
      fs.writeFileSync(newPath, finalBuffer);
      return { success: true, newPath, count: Math.max(replacedCount, occurrences.length) };
    } catch (e) {
      console.error('[syme] pdf:process error:', e.message);
      return { success: false, error: e.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
