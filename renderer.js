// Wait for the DOM to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
  // Object containing references to all important DOM elements
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

  // Audio element for playback
  const audio = new Audio();
  // Array to store track list
  let tracks = [];
  // Index of currently playing track
  let currentTrackIndex = 0;
  // Playback state flag
  let isPlaying = false;
  // Shuffle state flag
  let isShuffled = false;
  // Repeat state flag
  let isRepeated = false;
  // Original track order (for shuffle functionality)
  let originalOrder = [];
  // Last volume level before mute
  let lastVolume = 1;
  // Current folder path
  let currentFolderPath = '';
  // Timeout reference for notifications
  let notificationTimeout;

  // Initialize the application
  init();

  /**
   * Initializes the application by:
   * - Loading theme preference
   * - Binding event listeners
   * - Requesting notification permission
   * - Setting up UI elements
   */
  function init() {
    loadThemePreference();
    bindEventListeners();
    requestNotificationPermission();
    updateSeekBar();
    setupMediaControls();
    setupTaskbarControls();
  }

  /**
   * Binds event listeners to DOM elements and audio events
   */
  function bindEventListeners() {
    // UI element event listeners
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

    // Audio element event listeners
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

  /**
   * Sets up IPC communication for media controls from system tray/media keys
   */
  function setupMediaControls() {
    if (window.electron?.ipcRenderer) {
      // Listen for tray control events
      window.electron.ipcRenderer.on('tray-control', (event, action) => {
        handleMediaAction(action);
      });
      
      // Listen for media key events
      window.electron.ipcRenderer.on('media-key', (event, action) => {
        handleMediaAction(action);
      });
    }
  }

  /**
   * Handles media actions from system tray or media keys
   * @param {string} action - The action to perform ('playpause', 'next', 'previous')
   */
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

  /**
   * Sets up taskbar/dock controls (Windows/Linux specific)
   */
  function setupTaskbarControls() {
    if (window.electron?.ipcRenderer) {
      // Create thumbar buttons configuration
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
      // Send buttons configuration to main process
      window.electron.ipcRenderer.invoke('set-thumbar-buttons', buttons);
    }
  }

  /**
   * Updates taskbar/dock progress indicator
   */
  function updateTaskbarProgress() {
    if (window.electron?.ipcRenderer) {
      // Calculate progress percentage (0-1) or -1 to reset
      const progress = audio.duration > 0 ? audio.currentTime / audio.duration : -1;
      // Send progress update to main process
      window.electron.ipcRenderer.send('update-progress', progress);
    }
  }

  /**
   * Updates media metadata for OS media controls
   */
  function updateMediaMetadata() {
    if (window.electron?.ipcRenderer && tracks.length > 0 && currentTrackIndex >= 0) {
      const track = tracks[currentTrackIndex];
      // Prepare metadata object
      const metadata = {
        title: track.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        state: isPlaying ? 'playing' : 'paused',
        duration: audio.duration || 0,
        position: audio.currentTime || 0
      };
      // Send metadata to main process
      window.electron.ipcRenderer.invoke('update-media-metadata', metadata);
    }
  }

  /* FULLSCREEN FUNCTIONALITY */

  /**
   * Toggles fullscreen mode
   */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      elements.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
        elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
      }
    }
  }

  /* NOTIFICATION SYSTEM */

  /**
   * Requests permission for desktop notifications
   */
  function requestNotificationPermission() {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  /**
   * Shows a now playing notification
   * @param {string} trackName - Name of the currently playing track
   */
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

      // Show new notification after small delay
      notificationTimeout = setTimeout(() => {
        const notification = new Notification('🎵 Now Playing', {
          body: trackName,
          silent: true,
          icon: 'assets/notification-icon.png'
        });
        
        // Focus window when notification is clicked
        notification.onclick = () => {
          window.focus();
        };
        
        window.currentNotification = notification;
      }, 300); // Small delay to prevent rapid notifications
    }
  }

  /* THEME MANAGEMENT */

  /**
   * Toggles between light and dark theme
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle button icon
    const icon = elements.themeBtn.querySelector('i');
    if (newTheme === 'dark') {
      icon.classList.replace('fa-sun', 'fa-moon');
    } else {
      icon.classList.replace('fa-moon', 'fa-sun');
    }
  }

  /**
   * Loads theme preference from localStorage
   */
  function loadThemePreference() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = elements.themeBtn.querySelector('i');
    icon.classList.add(theme === 'dark' ? 'fa-moon' : 'fa-sun');
  }

  /* MUSIC PLAYBACK FUNCTIONS */

  /**
   * Handles folder upload event
   * @param {Event} e - File input change event
   */
  function handleFolderUpload(e) {
    // Filter for audio files
    const files = Array.from(e.target.files).filter(file =>
      file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
    );
    if (!files.length) return;
    
    // Extract folder path from first file
    if (files[0].webkitRelativePath) {
      currentFolderPath = files[0].webkitRelativePath.split('/')[0];
      elements.currentFolder.querySelector('.folder-path').textContent = currentFolderPath;
    }
    
    // Initialize track list
    tracks = files;
    originalOrder = [...files];
    currentTrackIndex = 0;
    renderPlaylist();
    playTrack(currentTrackIndex);
  }

  /**
   * Handles file upload event
   * @param {Event} e - File input change event
   */
  function handleFileUpload(e) {
    // Filter for audio files
    const files = Array.from(e.target.files).filter(file =>
      file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
    );
    if (!files.length) return;
    
    // Set folder path display
    currentFolderPath = 'Individual Files';
    elements.currentFolder.querySelector('.folder-path').textContent = currentFolderPath;
    
    // Initialize track list
    tracks = files;
    originalOrder = [...files];
    currentTrackIndex = 0;
    renderPlaylist();
    playTrack(currentTrackIndex);
  }

  /**
   * Clears the current playlist and resets player state
   */
  function clearPlaylist() {
    tracks = [];
    originalOrder = [];
    currentTrackIndex = 0;
    audio.src = '';
    // Update UI elements
    elements.nowPlaying.innerHTML = '<i class="fas fa-play"></i> Now Playing: None';
    elements.currentFolder.querySelector('.folder-path').textContent = 'No folder selected';
    elements.fileList.innerHTML = '';
    elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    isPlaying = false;
    updateSeekBar();
    updateMediaMetadata();
    updateTaskbarProgress();
    
    // Reset album art display
    elements.albumArt.style.display = 'none';
    document.querySelector('.album-art-placeholder').style.display = 'flex';
  }

  /**
   * Plays a track from the playlist
   * @param {number} index - Index of the track to play
   */
  function playTrack(index) {
    if (!tracks.length) return;
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];
    // Create object URL for the audio file
    audio.src = URL.createObjectURL(track);
    
    // Update now playing display
    const trackName = track.name.replace(/\.[^/.]+$/, '');
    elements.nowPlaying.innerHTML = `<i class="fas fa-play"></i> Now Playing: ${trackName}`;
    highlightSelectedTrack();
    
    // Reset album art display (placeholder for actual implementation)
    const albumArtPlaceholder = document.querySelector('.album-art-placeholder');
    elements.albumArt.style.display = 'none';
    albumArtPlaceholder.style.display = 'flex';
    
    // Start playback
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

  /**
   * Toggles between play and pause states
   */
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

  /**
   * Plays the next track in the playlist
   */
  function playNextTrack() {
    if (!tracks.length) return;
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(currentTrackIndex);
  }

  /**
   * Plays the previous track in the playlist
   */
  function playPreviousTrack() {
    if (!tracks.length) return;
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(currentTrackIndex);
  }

  /**
   * Handles track end event (plays next or repeats based on repeat state)
   */
  function handleTrackEnd() {
    isRepeated ? playTrack(currentTrackIndex) : playNextTrack();
  }

  /* VOLUME CONTROLS */

  /**
   * Sets the audio volume based on slider value
   */
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

  /**
   * Toggles mute state
   */
  function toggleMute() {
    const icon = elements.muteBtn.querySelector('i');
    if (audio.volume > 0) {
      // Mute
      lastVolume = audio.volume;
      audio.volume = 0;
      elements.volumeSlider.value = 0;
      icon.classList.replace('fa-volume-up', 'fa-volume-mute');
    } else {
      // Unmute
      audio.volume = lastVolume || 1;
      elements.volumeSlider.value = audio.volume;
      icon.classList.replace('fa-volume-mute', 'fa-volume-up');
    }
  }

  /* SEEK BAR FUNCTIONS */

  /**
   * Handles seek bar input (updates time display without changing playback)
   */
  function handleSeekInput() {
    elements.currentTime.textContent = formatTime(elements.seekBar.value);
  }

  /**
   * Handles seek bar change (updates playback position)
   */
  function handleSeekChange() {
    audio.currentTime = elements.seekBar.value;
    updateTaskbarProgress();
  }

  /**
   * Updates seek bar position and time displays
   */
  function updateSeekBar() {
    if (isNaN(audio.duration)) return;
    
    elements.seekBar.max = audio.duration || 0;
    elements.seekBar.value = audio.currentTime || 0;
    elements.currentTime.textContent = formatTime(audio.currentTime || 0);
    elements.duration.textContent = formatTime(audio.duration || 0);
    
    // Update taskbar progress if playing
    if (isPlaying) {
      updateTaskbarProgress();
    }
  }

  /**
   * Updates track duration in playlist
   * @param {boolean} forceUpdate - Whether to force update
   */
  function updateTrackInfo(forceUpdate = false) {
    if (!forceUpdate) return;
    const listItems = elements.fileList.querySelectorAll('.track-duration');
    if (listItems[currentTrackIndex]) {
      listItems[currentTrackIndex].textContent = formatTime(audio.duration);
    }
  }

  /* PLAYLIST MANAGEMENT */

  /**
   * Renders the playlist in the UI
   */
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

  /**
   * Highlights the currently selected track in the playlist
   */
  function highlightSelectedTrack() {
    const items = elements.fileList.querySelectorAll('.file-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === currentTrackIndex);
    });
  }

  /**
   * Toggles shuffle mode
   */
  function toggleShuffle() {
    isShuffled = !isShuffled;
    elements.shuffleBtn.classList.toggle('active', isShuffled);
    const icon = elements.shuffleBtn.querySelector('i');
    if (isShuffled) {
      // Shuffle the playlist (keeping current track first)
      icon.style.transform = 'rotate(180deg)';
      const currentTrack = tracks[currentTrackIndex];
      const remaining = tracks.filter((_, i) => i !== currentTrackIndex);
      // Fisher-Yates shuffle algorithm
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      tracks = [currentTrack, ...remaining];
    } else {
      // Restore original order
      icon.style.transform = 'rotate(0deg)';
      const current = tracks[currentTrackIndex].name;
      tracks = [...originalOrder];
      currentTrackIndex = tracks.findIndex(t => t.name === current);
    }
    renderPlaylist();
  }

  /**
   * Toggles repeat mode
   */
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

  /**
   * Handles keyboard shortcuts
   * @param {KeyboardEvent} e - Keydown event
   */
  function handleKeyboardShortcuts(e) {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT') return;
    
    // Volume control with Ctrl+Arrow keys
    if (e.ctrlKey && e.key === 'ArrowUp') {
      adjustVolume(0.05);
    } else if (e.ctrlKey && e.key === 'ArrowDown') {
      adjustVolume(-0.05);
    } else {
      // Other keyboard shortcuts
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

  /**
   * Seeks forward or backward in the current track
   * @param {number} seconds - Number of seconds to seek (positive or negative)
   */
  function seekRelative(seconds) {
    if (!tracks.length) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration));
    updateSeekBar();
  }

  /**
   * Adjusts volume by a specified delta
   * @param {number} delta - Volume change amount (-0.05 to 0.05 typically)
   */
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

  /**
   * Formats seconds into MM:SS time string
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
});