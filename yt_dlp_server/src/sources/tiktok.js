const { URL } = require('url');

function match(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
  } catch {
    return false;
  }
}

function filename(videoPageUrl) {
  const pathname = new URL(videoPageUrl).pathname;
  const userId = pathname.match(/@([^/]+)/)?.[1] || 'tiktok-user';
  const videoId = pathname.match(/\/(?:video|photo)\/(\d+)/)?.[1] || Date.now().toString();
  return `${userId}_${videoId}.mp4`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

module.exports = {
  id: 'tiktok',
  contentType: 'video/mp4',
  match,
  filename
};
