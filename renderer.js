const folderInput = document.getElementById('folderInput');
const fileList = document.getElementById('fileList');
const audioPlayer = document.getElementById('audioPlayer');
const nowPlaying = document.getElementById('nowPlaying');

const supportedFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

// Load from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
  const storedFiles = JSON.parse(localStorage.getItem('audioFiles'));
  if (storedFiles && storedFiles.length > 0) {
    renderFileList(storedFiles);
  }
});

// Handle folder selection
folderInput.addEventListener('change', function () {
  const files = Array.from(this.files);
  const audioFiles = files.filter(file => supportedFormats.includes(file.type));

  if (audioFiles.length > 0) {
    const fileData = audioFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    localStorage.setItem('audioFiles', JSON.stringify(fileData));
    renderFileList(fileData);
  } else {
    fileList.innerHTML = "<li>No compatible audio files found.</li>";
  }
});

// Render audio file list
function renderFileList(fileData) {
  fileList.innerHTML = '';
  fileData.forEach((file, index) => {
    const li = document.createElement('li');
    li.textContent = file.name;
    li.className = 'file-item';
    li.addEventListener('click', () => {
      audioPlayer.src = file.url;
      audioPlayer.play();
      nowPlaying.textContent = `Now Playing: ${file.name}`;
    });
    fileList.appendChild(li);
  });
}
