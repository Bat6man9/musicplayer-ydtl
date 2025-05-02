// playerControls.js
const { ipcRenderer } = require('electron');
const audioPlayer = new Audio();

// Volume Control
document.getElementById('volume').addEventListener('input', (e) => {
  audioPlayer.volume = e.target.value;
});

// Skip Forward/Backward
document.getElementById('skip-forward').addEventListener('click', () => {
  audioPlayer.currentTime += 10; // Skip 10 seconds forward
});

document.getElementById('skip-back').addEventListener('click', () => {
  audioPlayer.currentTime -= 10; // Skip 10 seconds back
});

// Progress Bar Seek
document.getElementById('progress').addEventListener('input', (e) => {
  const seekTime = (e.target.value / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;
});

// Time Update Listener (for progress bar)
audioPlayer.addEventListener('timeupdate', () => {
  const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  document.getElementById('progress').value = progress || 0;
});