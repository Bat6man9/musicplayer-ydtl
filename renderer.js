document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    themeBtn: document.getElementById('themeBtn'),
    folderInput: document.getElementById('folderInput'),
    fileInput: document.getElementById('fileInput'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    muteBtn: document.getElementById('muteBtn'),
    seekBar: document.getElementById('seekBar'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    nowPlaying: document.getElementById('nowPlaying'),
    fileList: document.getElementById('fileList'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    albumArt: document.getElementById('albumArt'),
    currentFolder: document.getElementById('currentFolder'),
    clearBtn: document.getElementById('clearBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn')
  };

  const audio = new Audio();
  let tracks = [];
  let currentTrackIndex = 0;
  let isPlaying = false;
  let isShuffled = false;
  let isRepeated = false;
  let originalOrder = [];
  let lastVolume = 1;
  let currentFolderPath = '';
  let notificationTimeout;

  init();

  function init() {
    loadThemePreference();
    bindEventListeners();
    requestNotificationPermission();
    updateSeekBar();
    setupMediaControls();
    setupTaskbarControls();
  }

  function bindEventListeners() {
    elements.themeBtn.addEventListener('click', toggleTheme);
    elements.folderInput.addEventListener('change', handleFolderUpload);
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.prevBtn.addEventListener('click', playPreviousTrack);
    elements.nextBtn.addEventListener('click', playNextTrack);
    elements.volumeSlider.addEventListener('input', setVolume);
    elements.muteBtn.addEventListener('click', toggleMute);
    elements.seekBar.addEventListener('input', handleSeekInput);
    elements.seekBar.addEventListener('change', handleSeekChange);
    elements.shuffleBtn.addEventListener('click', toggleShuffle);
    elements.repeatBtn.addEventListener('click', toggleRepeat);
    elements.clearBtn.addEventListener('click', clearPlaylist);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('keydown', handleKeyboardShortcuts);

    audio.addEventListener('timeupdate', updateSeekBar);
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('loadedmetadata', () => {
      updateTrackInfo(true);
      updateSeekBar();
      updateMediaMetadata();
    });
    audio.addEventListener('canplay', updateSeekBar);
    audio.addEventListener('play', () => {
      updateMediaMetadata();
      updateTaskbarProgress();
    });
    audio.addEventListener('pause', () => {
      updateMediaMetadata();
      updateTaskbarProgress();
    });
  }

  /* SYSTEM TRAY AND MEDIA KEY INTEGRATION */
  function setupMediaControls() {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('tray-control', (event, action) => {
        handleMediaAction(action);
      });
      
      window.electron.ipcRenderer.on('media-key', (event, action) => {
        handleMediaAction(action);
      });
    }
  }

  function handleMediaAction(action) {
    switch(action) {
      case 'playpause':
        togglePlayPause();
        break;
      case 'next':
        playNextTrack();
        break;
      case 'previous':
        playPreviousTrack();
        break;
    }
  }

  /* TASKBAR/DOCK INTEGRATION */
  function setupTaskbarControls() {
    if (window.electron?.ipcRenderer) {
      // Set initial thumbar buttons
      const buttons = [
        {
          tooltip: 'Previous',
          icon: 'assets/taskbar-previous.png',
          click: 'previous'
        },
        {
          tooltip: isPlaying ? 'Pause' : 'Play',
          icon: isPlaying ? 'assets/taskbar-pause.png' : 'assets/taskbar-play.png',
          click: 'playpause'
        },
        {
          tooltip: 'Next',
          icon: 'assets/taskbar-next.png',
          click: 'next'
        }
      ];
      window.electron.ipcRenderer.invoke('set-thumbar-buttons', buttons);
    }
  }

  function updateTaskbarProgress() {
    if (window.electron?.ipcRenderer) {
      const progress = audio.duration > 0 ? audio.currentTime / audio.duration : -1;
      window.electron.ipcRenderer.send('update-progress', progress);
    }
  }

  function updateMediaMetadata() {
    if (window.electron?.ipcRenderer && tracks.length > 0 && currentTrackIndex >= 0) {
      const track = tracks[currentTrackIndex];
      const metadata = {
        title: track.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        state: isPlaying ? 'playing' : 'paused',
        duration: audio.duration || 0,
        position: audio.currentTime || 0
      };
      window.electron.ipcRenderer.invoke('update-media-metadata', metadata);
    }
  }

  /* FULLSCREEN FUNCTIONALITY */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      elements.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
      }
    }
  }

  /* NOTIFICATION SYSTEM */
  function requestNotificationPermission() {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  function showTrackNotification(trackName) {
    if (Notification.permission === 'granted') {
      // Clear any pending notification
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
      
      // Close any existing notification
      if (window.currentNotification) {
        window.currentNotification.close();
      }

      notificationTimeout = setTimeout(() => {
        const notification = new Notification('🎵 Now Playing', {
          body: trackName,
          silent: true,
          icon: 'assets/notification-icon.png'
        });
        
        notification.onclick = () => {
          window.focus();
        };
        
        window.currentNotification = notification;
      }, 300); // Small delay to prevent rapid notifications
    }
  }

  /* THEME MANAGEMENT */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = elements.themeBtn.querySelector('i');
    if (newTheme === 'dark') {
      icon.classList.replace('fa-sun', 'fa-moon');
    } else {
      icon.classList.replace('fa-moon', 'fa-sun');
    }
  }

  function loadThemePreference() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = elements.themeBtn.querySelector('i');
    icon.classList.add(theme === 'dark' ? 'fa-moon' : 'fa-sun');
  }

  /* MUSIC PLAYBACK FUNCTIONS */
  function handleFolderUpload(e) {
    const files = Array.from(e.target.files).filter(file =>
      file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
    );
    if (!files.length) return;
    
    if (files[0].webkitRelativePath) {
      currentFolderPath = files[0].webkitRelativePath.split('/')[0];
      elements.currentFolder.querySelector('.folder-path').textContent = currentFolderPath;
    }
    
    tracks = files;
    originalOrder = [...files];
    currentTrackIndex = 0;
    renderPlaylist();
    playTrack(currentTrackIndex);
  }

  function handleFileUpload(e) {
    const files = Array.from(e.target.files).filter(file =>
      file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
    );
    if (!files.length) return;
    
    currentFolderPath = 'Individual Files';
    elements.currentFolder.querySelector('.folder-path').textContent = currentFolderPath;
    
    tracks = files;
    originalOrder = [...files];
    currentTrackIndex = 0;
    renderPlaylist();
    playTrack(currentTrackIndex);
  }

  function clearPlaylist() {
    tracks = [];
    originalOrder = [];
    currentTrackIndex = 0;
    audio.src = '';
    elements.nowPlaying.innerHTML = '<i class="fas fa-play"></i> Now Playing: None';
    elements.currentFolder.querySelector('.folder-path').textContent = 'No folder selected';
    elements.fileList.innerHTML = '';
    elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    isPlaying = false;
    updateSeekBar();
    updateMediaMetadata();
    updateTaskbarProgress();
    
    // Hide album art and show placeholder
    elements.albumArt.style.display = 'none';
    document.querySelector('.album-art-placeholder').style.display = 'flex';
  }

  function playTrack(index) {
    if (!tracks.length) return;
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];
    audio.src = URL.createObjectURL(track);
    
    const trackName = track.name.replace(/\.[^/.]+$/, '');
    elements.nowPlaying.innerHTML = `<i class="fas fa-play"></i> Now Playing: ${trackName}`;
    highlightSelectedTrack();
    
    // Try to extract album art (placeholder for actual implementation)
    const albumArtPlaceholder = document.querySelector('.album-art-placeholder');
    elements.albumArt.style.display = 'none';
    albumArtPlaceholder.style.display = 'flex';
    
    audio.play().then(() => {
      isPlaying = true;
      elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      elements.playPauseBtn.classList.add('playing');
      showTrackNotification(trackName);
      updateMediaMetadata();
      updateTaskbarProgress();
      setupTaskbarControls(); // Update taskbar buttons
    }).catch(console.error);
  }

  function togglePlayPause() {
    if (!tracks.length) return;
    if (isPlaying) {
      audio.pause();
      elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      audio.play();
      elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
    elements.playPauseBtn.classList.toggle('playing', isPlaying);
    updateMediaMetadata();
    setupTaskbarControls(); // Update taskbar buttons
  }

  function playNextTrack() {
    if (!tracks.length) return;
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(currentTrackIndex);
  }

  function playPreviousTrack() {
    if (!tracks.length) return;
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(currentTrackIndex);
  }

  function handleTrackEnd() {
    isRepeated ? playTrack(currentTrackIndex) : playNextTrack();
  }

  /* VOLUME CONTROLS */
  function setVolume() {
    audio.volume = elements.volumeSlider.value;
    lastVolume = audio.volume;
    const icon = elements.muteBtn.querySelector('i');
    if (audio.volume === 0) {
      icon.classList.replace('fa-volume-up', 'fa-volume-mute');
    } else {
      icon.classList.replace('fa-volume-mute', 'fa-volume-up');
    }
  }

  function toggleMute() {
    const icon = elements.muteBtn.querySelector('i');
    if (audio.volume > 0) {
      lastVolume = audio.volume;
      audio.volume = 0;
      elements.volumeSlider.value = 0;
      icon.classList.replace('fa-volume-up', 'fa-volume-mute');
    } else {
      audio.volume = lastVolume || 1;
      elements.volumeSlider.value = audio.volume;
      icon.classList.replace('fa-volume-mute', 'fa-volume-up');
    }
  }

  /* SEEK BAR FUNCTIONS */
  function handleSeekInput() {
    elements.currentTime.textContent = formatTime(elements.seekBar.value);
  }

  function handleSeekChange() {
    audio.currentTime = elements.seekBar.value;
    updateTaskbarProgress();
  }

  function updateSeekBar() {
    if (isNaN(audio.duration)) return;
    
    elements.seekBar.max = audio.duration || 0;
    elements.seekBar.value = audio.currentTime || 0;
    elements.currentTime.textContent = formatTime(audio.currentTime || 0);
    elements.duration.textContent = formatTime(audio.duration || 0);
    
    // Update taskbar progress
    if (isPlaying) {
      updateTaskbarProgress();
    }
  }

  function updateTrackInfo(forceUpdate = false) {
    if (!forceUpdate) return;
    const listItems = elements.fileList.querySelectorAll('.track-duration');
    if (listItems[currentTrackIndex]) {
      listItems[currentTrackIndex].textContent = formatTime(audio.duration);
    }
  }

  /* PLAYLIST MANAGEMENT */
  function renderPlaylist() {
    elements.fileList.innerHTML = '';
    tracks.forEach((track, index) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.innerHTML = `
        <span class="track-info">${track.name.replace(/\.[^/.]+$/, '')}</span>
        <span class="track-duration">0:00</span>
      `;
      li.addEventListener('click', () => playTrack(index));
      elements.fileList.appendChild(li);
    });
    highlightSelectedTrack();
  }

  function highlightSelectedTrack() {
    const items = elements.fileList.querySelectorAll('.file-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === currentTrackIndex);
    });
  }

  function toggleShuffle() {
    isShuffled = !isShuffled;
    elements.shuffleBtn.classList.toggle('active', isShuffled);
    const icon = elements.shuffleBtn.querySelector('i');
    if (isShuffled) {
      icon.style.transform = 'rotate(180deg)';
      const currentTrack = tracks[currentTrackIndex];
      const remaining = tracks.filter((_, i) => i !== currentTrackIndex);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      tracks = [currentTrack, ...remaining];
    } else {
      icon.style.transform = 'rotate(0deg)';
      const current = tracks[currentTrackIndex].name;
      tracks = [...originalOrder];
      currentTrackIndex = tracks.findIndex(t => t.name === current);
    }
    renderPlaylist();
  }

  function toggleRepeat() {
    isRepeated = !isRepeated;
    elements.repeatBtn.classList.toggle('active', isRepeated);
    const icon = elements.repeatBtn.querySelector('i');
    if (isRepeated) {
      icon.classList.add('fa-spin');
    } else {
      icon.classList.remove('fa-spin');
    }
  }

  /* KEYBOARD SHORTCUTS */
  function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey && e.key === 'ArrowUp') {
      adjustVolume(0.05);
    } else if (e.ctrlKey && e.key === 'ArrowDown') {
      adjustVolume(-0.05);
    } else {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) playPreviousTrack();
          else if (!e.ctrlKey) seekRelative(-5);
          break;
        case 'ArrowRight':
          if (e.ctrlKey) playNextTrack();
          else if (!e.ctrlKey) seekRelative(5);
          break;
        case 'm':
          if (e.ctrlKey) toggleMute();
          break;
        case 's':
          if (e.ctrlKey) toggleShuffle();
          break;
        case 'r':
          if (e.ctrlKey) toggleRepeat();
          break;
        case 't':
          if (e.ctrlKey) toggleTheme();
          break;
        case 'd':
          if (e.ctrlKey) clearPlaylist();
          break;
        case 'f':
          if (e.ctrlKey) toggleFullscreen();
          break;
      }
    }
  }

  function seekRelative(seconds) {
    if (!tracks.length) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration));
    updateSeekBar();
  }

  function adjustVolume(delta) {
    let newVolume = Math.min(1, Math.max(0, audio.volume + delta));
    audio.volume = newVolume;
    elements.volumeSlider.value = newVolume;
    const icon = elements.muteBtn.querySelector('i');
    if (newVolume === 0) {
      icon.classList.replace('fa-volume-up', 'fa-volume-mute');
    } else {
      icon.classList.replace('fa-volume-mute', 'fa-volume-up');
    }
  }

  /* UTILITY FUNCTIONS */
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
});