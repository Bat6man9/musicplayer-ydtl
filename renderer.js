document.addEventListener('DOMContentLoaded', () => {
  const { ipcRenderer } = require('electron');
  const mm = require('music-metadata-browser');

  const folderInput = document.getElementById('folderInput');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const audioPlayer = document.getElementById('audioPlayer');
  const nowPlaying = document.getElementById('nowPlaying');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const muteBtn = document.getElementById('muteBtn');
  const albumArt = document.getElementById('albumArt');
  const seekBar = document.getElementById('seekBar');
  const currentTimeDisplay = document.getElementById('currentTime');
  const durationDisplay = document.getElementById('duration');

  let audioFiles = [];
  let currentTrackIndex = -1;

  const supportedExtensions = ['.mp3', '.wav', '.ogg', '.png', '.jpg', '.jpeg'];

  function formatTime(sec) {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  async function loadTrack(index) {
    if (index < 0 || index >= audioFiles.length) return;
    currentTrackIndex = index;
    const file = audioFiles[currentTrackIndex];
    const blobUrl = URL.createObjectURL(file);
    audioPlayer.src = blobUrl;
    audioPlayer.play();

    let displayName = file.name;

    try {
      const metadata = await mm.parseBlob(file);
      const { title, artist, picture } = metadata.common;

      if (title || artist) {
        displayName = `${artist || 'Unknown Artist'} - ${title || 'Unknown Title'}`;
      }

      if (picture && picture.length > 0) {
        const imageBlob = new Blob([picture[0].data], { type: picture[0].format });
        albumArt.src = URL.createObjectURL(imageBlob);
        albumArt.style.display = 'block';
      } else {
        albumArt.style.display = 'none';
      }
    } catch (err) {
      console.warn('Metadata read failed:', err);
      albumArt.style.display = 'none';
    }

    nowPlaying.textContent = `Now Playing: ${displayName}`;
    highlightSelected(index);
  }

  function highlightSelected(index) {
    const items = fileList.querySelectorAll('li');
    items.forEach((item, i) => {
      item.style.background = i === index ? '#50507a' : '';
    });
  }

  function renderFileList(files) {
    fileList.innerHTML = '';
    files.forEach((file, i) => {
      if (!/\.(mp3|wav|ogg)$/i.test(file.name)) return;
      const li = document.createElement('li');
      li.textContent = file.name;
      li.classList.add('file-item');
      li.addEventListener('click', () => loadTrack(i));
      fileList.appendChild(li);
    });

    const firstAudioIndex = files.findIndex(file => /\.(mp3|wav|ogg)$/i.test(file.name));
    if (firstAudioIndex !== -1) loadTrack(firstAudioIndex);
  }

  // Folder upload
  folderInput.addEventListener('change', (e) => {
    audioFiles = Array.from(e.target.files).filter(file =>
      supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    console.log('Loaded folder files:', audioFiles.map(f => f.name));
    renderFileList(audioFiles);
  });

  // File upload
  fileInput.addEventListener('change', (e) => {
    audioFiles = Array.from(e.target.files).filter(file =>
      supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    console.log('Loaded single files:', audioFiles.map(f => f.name));
    renderFileList(audioFiles);
  });

  // Drag & drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.items)
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(file => supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)));
    if (droppedFiles.length > 0) {
      audioFiles = droppedFiles;
      console.log('Dropped files:', audioFiles.map(f => f.name));
      renderFileList(audioFiles);
    }
  });

  // Playback controls
  prevBtn.addEventListener('click', () => {
    if (currentTrackIndex > 0) loadTrack(currentTrackIndex - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (currentTrackIndex < audioFiles.length - 1) loadTrack(currentTrackIndex + 1);
  });
  audioPlayer.addEventListener('ended', () => {
    if (currentTrackIndex < audioFiles.length - 1) loadTrack(currentTrackIndex + 1);
  });

  // Progress bar
  audioPlayer.addEventListener('loadedmetadata', () => {
    seekBar.max = Math.floor(audioPlayer.duration);
    durationDisplay.textContent = formatTime(audioPlayer.duration);
  });
  audioPlayer.addEventListener('timeupdate', () => {
    seekBar.value = Math.floor(audioPlayer.currentTime);
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
  });
  seekBar.addEventListener('input', () => {
    audioPlayer.currentTime = seekBar.value;
  });

  // Volume
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value;
  });
  muteBtn.addEventListener('click', () => {
    audioPlayer.muted = !audioPlayer.muted;
    muteBtn.textContent = audioPlayer.muted ? '🔇' : '🔊';
  });

  // Keyboard shortcuts via IPC
  ipcRenderer.on('shortcut', (_, action) => {
    switch (action) {
      case 'playpause': audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause(); break;
      case 'next': nextBtn.click(); break;
      case 'prev': prevBtn.click(); break;
      case 'volup':
        audioPlayer.volume = Math.min(1, audioPlayer.volume + 0.1);
        volumeSlider.value = audioPlayer.volume;
        break;
      case 'voldown':
        audioPlayer.volume = Math.max(0, audioPlayer.volume - 0.1);
        volumeSlider.value = audioPlayer.volume;
        break;
      case 'mute': muteBtn.click(); break;
      case 'theme':
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
        break;
    }
  });

  // Load saved theme
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
  }
});
