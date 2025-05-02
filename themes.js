// themes.js
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    // Save theme preference (optional)
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
  });
  
  // Initialize theme from storage (optional)
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }