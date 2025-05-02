const fs = require('fs')
const path = require('path')

let folderPath = ''

document.getElementById('select-folder').addEventListener('click', async () => {
  folderPath = await window.electronAPI.openFolderDialog()
  
  if (folderPath) {
    const playlist = document.getElementById('playlist')
    playlist.innerHTML = ''

    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error('Error reading folder:', err)
        return
      }

      const musicFiles = files.filter(file => 
        ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase())
      )

      musicFiles.forEach(file => {
        const listItem = document.createElement('div')
        listItem.textContent = file
        playlist.appendChild(listItem)
      })
    })
  }
})