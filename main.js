const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,           // allow require() in renderer
      contextIsolation: false,         // must be false if using require() directly
      enableRemoteModule: true,
      webSecurity: false               // allow blob: and file: URLs
    }
  });

  mainWindow.loadFile('index.html');

  // Optional: Open DevTools
  // mainWindow.webContents.openDevTools();

  // Media shortcut keys
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send('shortcut', 'playpause');
  });

  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send('shortcut', 'next');
  });

  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send('shortcut', 'prev');
  });

  globalShortcut.register('CommandOrControl+ArrowUp', () => {
    mainWindow.webContents.send('shortcut', 'volup');
  });

  globalShortcut.register('CommandOrControl+ArrowDown', () => {
    mainWindow.webContents.send('shortcut', 'voldown');
  });

  globalShortcut.register('CommandOrControl+M', () => {
    mainWindow.webContents.send('shortcut', 'mute');
  });

  globalShortcut.register('CommandOrControl+T', () => {
    mainWindow.webContents.send('shortcut', 'theme');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
