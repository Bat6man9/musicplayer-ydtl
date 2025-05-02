// metadata.js - Read artist/title from MP3s
const mm = require('music-metadata');

async function getMetadata(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    return {
      title: metadata.common.title || path.basename(filePath),
      artist: metadata.common.artist || 'Unknown Artist'
    };
  } catch (err) {
    return {
      title: path.basename(filePath),
      artist: 'Unknown Artist'
    };
  }
}

// In renderer.js (modify playlist creation):
listItem.textContent = `${metadata.artist} - ${metadata.title}`;