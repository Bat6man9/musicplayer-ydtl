const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false
  });

  mainWindow.loadFile('index.html');

  // Create system tray
  createTray();

  // Media key handling
  const { globalShortcut } = require('electron');
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send('media-key', 'playpause');
  });
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send('media-key', 'next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send('media-key', 'previous');
  });

  // Taskbar progress
  mainWindow.on('focus', () => {
    mainWindow.setProgressBar(-1); // Reset progress
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Play/Pause',
      click: () => mainWindow.webContents.send('tray-control', 'playpause')
    },
    {
      label: 'Next Track',
      click: () => mainWindow.webContents.send('tray-control', 'next')
    },
    {
      label: 'Previous Track',
      click: () => mainWindow.webContents.send('tray-control', 'previous')
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => mainWindow.show()
    },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);
  
  tray.setToolTip('Electron Music Player');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle progress updates from renderer
ipcMain.on('update-progress', (event, progress) => {
  if (mainWindow) {
    mainWindow.setProgressBar(progress);
  }
});