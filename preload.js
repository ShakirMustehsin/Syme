const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File system
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFiles: (options) => ipcRenderer.invoke('dialog:openFiles', options || {}),
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  renameFiles: (operations) => ipcRenderer.invoke('fs:renameFiles', operations),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window:maximizeChange', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('window:maximizeChange', handler);
  },

  // PDF
  getPDFInfo: (filePath) => ipcRenderer.invoke('pdf:getInfo', filePath),
  scanPDF: (filePath, rules) => ipcRenderer.invoke('pdf:scan', { filePath, ...rules }),
  processPDF: (filePath, rules) => ipcRenderer.invoke('pdf:process', { filePath, rules }),
});
