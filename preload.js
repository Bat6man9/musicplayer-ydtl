/*
  Preload script - safely exposes Electron APIs to renderer process
  Security bridge between main and renderer processes
  Exposes controlled IPC communication methods
*/

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe Electron APIs to renderer's window.electron
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // Basic IPC methods
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data)
  },
  // Windows-specific taskbar controls
  setThumbarButtons: (buttons) => ipcRenderer.invoke('set-thumbar-buttons', buttons),
  // Media metadata for OS integration
  updateMediaMetadata: (metadata) => ipcRenderer.invoke('update-media-metadata', metadata)
});