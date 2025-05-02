const { app, BrowserWindow, ipcMain, dialog } = require('electron') // Added ipcMain and dialog
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Keep this true for security
      nodeIntegration: false // Keep this false for security
    }
  })

  win.loadFile('index.html')
  
  // Open DevTools for debugging (optional)
  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  // Add this IPC handler for folder selection
  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!result.canceled) {
      return result.filePaths[0]
    }
    return null
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})