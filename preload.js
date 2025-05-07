const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data)
  },
  // Media metadata for taskbar/dock
  setThumbarButtons: (buttons) => ipcRenderer.invoke('set-thumbar-buttons', buttons),
  updateMediaMetadata: (metadata) => ipcRenderer.invoke('update-media-metadata', metadata)
});