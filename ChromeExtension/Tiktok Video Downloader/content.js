function findVideoSource() {
  const video = document.querySelector('video');
  return video?.currentSrc || video?.src || null;
}

function getPageType() {
  const pathname = location.pathname.replace(/\/$/, '');
  if (/^\/video\/\d+$/.test(pathname) || /\/video\/\d+$/.test(pathname)) return 'video';
  if (/^\/@[^/]+$/.test(pathname)) return 'user';
  return 'home';
}

function getVideoFilename(videoPageUrl, authorId) {
  const pageUrl = new URL(videoPageUrl, location.href);
  const userMatch = pageUrl.pathname.match(/@([^/]+)/);
  const videoMatch = pageUrl.pathname.match(/\/video\/(\d+)/);
  const userId = authorId || userMatch?.[1] || 'tiktok-user';
  const videoId = videoMatch?.[1] || Date.now().toString();
  return `${userId}_${videoId}.mp4`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getVideoAuthorId(video, card) {
  const authorLink = card.querySelector('a[data-e2e="video-author-avatar"]');
  const scopedAuthorId = authorLink?.getAttribute('href')?.match(/\/@([^/?]+)/)?.[1];
  if (scopedAuthorId) return scopedAuthorId;

  let node = video;
  for (let level = 0; node && level < 20; level += 1) {
    const authorLink = node.matches?.('a[data-e2e="video-author-avatar"]')
      ? node
      : node.querySelector?.('a[data-e2e="video-author-avatar"]');
    const authorId = authorLink?.getAttribute('href')?.match(/\/@([^/?]+)/)?.[1];
    if (authorId) return authorId;
    node = node.parentElement;
  }

  return card.querySelector('a[data-e2e="video-author-avatar"]')
    ?.getAttribute('href')?.match(/\/@([^/?]+)/)?.[1] || null;
}

function getVideoIdFromPlayer(video) {
  let node = video;
  for (let level = 0; node && level < 12; level += 1) {
    const playerId = node.id?.match(/-(\d{15,})$/)?.[1];
    if (playerId) return playerId;
    node = node.parentElement;
  }
  return null;
}

function findNearestVideoLink(video, root) {
  const videoRect = video.getBoundingClientRect();
  const videoCenter = {
    x: videoRect.left + videoRect.width / 2,
    y: videoRect.top + videoRect.height / 2
  };
  let closestLink = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  root.querySelectorAll('a[href*="/video/"]').forEach((link) => {
    const linkRect = link.getBoundingClientRect();
    if (!linkRect.width && !linkRect.height) return;
    const linkCenter = {
      x: linkRect.left + linkRect.width / 2,
      y: linkRect.top + linkRect.height / 2
    };
    const distance = Math.hypot(linkCenter.x - videoCenter.x, linkCenter.y - videoCenter.y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestLink = link.href;
    }
  });

  return closestLink;
}

function extractVideoUrlFromMarkup(element) {
  const markup = element.outerHTML || '';
  const match = markup.match(/(?:https?:\/\/www\.tiktok\.com)?(\/@[^/"'<>\s]+\/video\/\d+)/);
  return match ? new URL(match[1], location.origin).href : null;
}

function getVideoPageUrl(video, card) {
  if (getPageType() === 'video') return location.href;

  const cinemaContainer = video.closest('[data-cinema-mode-open="true"]');
  const scope = cinemaContainer || card;
  const scopedLink = findNearestVideoLink(video, scope);
  if (scopedLink) return scopedLink;

  let node = video;
  for (let level = 0; node && level < 10; level += 1) {
    const link = node.matches?.('a[href*="/video/"]') ? node.href : findNearestVideoLink(video, node);
    if (link) return link;
    const markupLink = extractVideoUrlFromMarkup(node);
    if (markupLink) return markupLink;
    node = node.parentElement;
  }

  const videoId = getVideoIdFromPlayer(video);
  const authorId = getVideoAuthorId(video, card);
  if (videoId && authorId) {
    return `https://www.tiktok.com/@${authorId}/video/${videoId}`;
  }

  const cardLink = findNearestVideoLink(video, scope);
  if (cardLink) return cardLink;

  const links = cinemaContainer
    ? scope.querySelectorAll('a[href*="/video/"]')
    : document.querySelectorAll('a[href*="/video/"]');
  return findNearestVideoLink(video, { querySelectorAll: () => links });
}

async function downloadCurrentVideo(button, videoPageUrl, authorId) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = '...';

  try {
    const response = await fetch(
      `http://127.0.0.1:8787/download?url=${encodeURIComponent(videoPageUrl)}`
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || 'Download failed');
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error('Server returned an empty file');
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = getVideoFilename(videoPageUrl, authorId);
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);

    button.textContent = 'Xong';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2_000);
  } catch {
    button.textContent = 'Lỗi';
    button.disabled = false;
  }
}

function findVideoCard(video) {
  const cinemaContainer = video.closest('[data-cinema-mode-open="true"]');
  if (cinemaContainer) return cinemaContainer;
  let candidate = video.parentElement;
  const videoRect = video.getBoundingClientRect();

  for (let level = 0; candidate && level < 7; level += 1) {
    const rect = candidate.getBoundingClientRect();
    if (rect.width >= videoRect.width && rect.height >= videoRect.height && rect.width > 120) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }

  return video.parentElement;
}

function injectDownloadButtons() {
  document.querySelectorAll('video').forEach((video) => {
    const card = findVideoCard(video);
    if (!card || card.querySelector(':scope > .tiktok-card-download-button')) return;

    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    const button = document.createElement('button');
    button.className = 'tiktok-card-download-button';
    button.type = 'button';
    button.textContent = 'Tải';
    button.title = 'Tải video này';
    button.dataset.pageType = getPageType();
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const videoPageUrl = getVideoPageUrl(video, card);
      const authorId = getVideoAuthorId(video, card);
      if (videoPageUrl) {
        downloadCurrentVideo(button, videoPageUrl, authorId);
      } else {
        button.textContent = 'Lỗi';
        setTimeout(() => { button.textContent = 'Tải'; }, 2_000);
      }
    });

    card.append(button);
  });
}

function downloadVideo(videoUrl) {
  if (!videoUrl) return false;

  const link = document.createElement('a');
  link.href = videoUrl;
  link.download = 'tiktok-video.mp4';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

const buttonStyle = document.createElement('style');
buttonStyle.textContent = `
  .tiktok-card-download-button {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    min-width: 42px;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    color: #fff;
    background: #f04b35;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .24);
    cursor: pointer;
    font: 700 12px Arial, sans-serif;
  }
  .tiktok-card-download-button:hover { background: #cf3828; }
  .tiktok-card-download-button:disabled { opacity: .7; cursor: wait; }
`;
document.documentElement.append(buttonStyle);
injectDownloadButtons();
new MutationObserver(injectDownloadButtons).observe(document.documentElement, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_VIDEO_SOURCE') {
    sendResponse({ videoUrl: findVideoSource() });
  }
  if (message.type === 'DOWNLOAD_VIDEO') {
    sendResponse({
      started: downloadVideo(message.videoUrl),
      sourceType: message.videoUrl?.startsWith('blob:') ? 'blob' : 'direct'
    });
  }
  return true;
});
