// storage.js - Saves last folder path between sessions
const { ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

// Save folder path
function saveLastFolder(path) {
  store.set('lastFolder', path);
}

// Load last folder
function loadLastFolder() {
  return store.get('lastFolder');
}

// Add to renderer.js (at the top)
const { saveLastFolder, loadLastFolder } = require('./storage');

// Modify folder selection in renderer.js:
ipcRenderer.on('selected-folder', (event, path) => {
  saveLastFolder(path); // Save the path
  // ... rest of your existing code
});

// On app start (renderer.js):
window.addEventListener('DOMContentLoaded', () => {
  const lastFolder = loadLastFolder();
  if (lastFolder) ipcRenderer.send('open-folder-dialog');
});