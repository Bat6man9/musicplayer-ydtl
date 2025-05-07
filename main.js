// Import required Electron modules and Node.js path module
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// Declare global variables for the main window and system tray
let mainWindow;
let tray = null;

/**
 * Creates the main application window with specific settings and configurations
 */
function createWindow() {
  // Create a new BrowserWindow with custom settings
  mainWindow = new BrowserWindow({
    width: 800,  // Initial window width
    height: 600, // Initial window height
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Preload script for security
      nodeIntegration: false, // Disable Node.js integration in renderer for security
      contextIsolation: true  // Enable context isolation for security
    },
    frame: false, // Remove default window frame
    titleBarStyle: 'hidden', // Hide default title bar
    titleBarOverlay: false  // Disable title bar overlay
  });

  // Load the main HTML file into the window
  mainWindow.loadFile('index.html');

  // Initialize the system tray
  createTray();

  // Register global media key shortcuts
  const { globalShortcut } = require('electron');
  
  // Register MediaPlayPause key and send IPC event to renderer
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send('media-key', 'playpause');
  });
  
  // Register MediaNextTrack key and send IPC event to renderer
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send('media-key', 'next');
  });
  
  // Register MediaPreviousTrack key and send IPC event to renderer
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send('media-key', 'previous');
  });

  // Handle window focus event to reset taskbar progress
  mainWindow.on('focus', () => {
    mainWindow.setProgressBar(-1); // Reset progress bar
  });
}

/**
 * Creates and configures the system tray icon and menu
 */
function createTray() {
  // Path to the tray icon image
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  // Create native image from file
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  // Create tray icon with resized image (16x16 pixels)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  // Build context menu for the tray icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Play/Pause', // Menu item label
      click: () => mainWindow.webContents.send('tray-control', 'playpause') // Send IPC event on click
    },
    {
      label: 'Next Track',
      click: () => mainWindow.webContents.send('tray-control', 'next')
    },
    {
      label: 'Previous Track',
      click: () => mainWindow.webContents.send('tray-control', 'previous')
    },
    { type: 'separator' }, // Visual separator in menu
    {
      label: 'Show App',
      click: () => mainWindow.show() // Show the main window
    },
    {
      label: 'Quit',
      click: () => app.quit() // Quit the application
    }
  ]);
  
  // Set tooltip that appears when hovering over tray icon
  tray.setToolTip('Electron Music Player');
  // Assign the context menu to the tray icon
  tray.setContextMenu(contextMenu);
  
  // Show main window when tray icon is clicked
  tray.on('click', () => mainWindow.show());
}

// When Electron has finished initialization, create the application window
app.whenReady().then(createWindow);

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// macOS-specific behavior: recreate window when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handler for progress updates from the renderer process
ipcMain.on('update-progress', (event, progress) => {
  if (mainWindow) {
    mainWindow.setProgressBar(progress); // Update window progress bar
  }
});