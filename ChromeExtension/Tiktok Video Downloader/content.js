function findVideoSource() {
  const video = document.querySelector('video');
  return video?.currentSrc || video?.src || null;
}

function getPageType() {
  const pathname = location.pathname.replace(/\/$/, '');
  if (pathname === '') return 'home';
  if (/^\/@[^/]+\/photo\/\d+$/.test(pathname)) return 'photo';
  if (/^\/@[^/]+\/video\/\d+$/.test(pathname) || /^\/video\/\d+$/.test(pathname)) {
    return 'video';
  }
  if (/^\/@[^/]+$/.test(pathname)) return 'user';
  return 'other';
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

function saveBlob(blob, filename) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
}

async function downloadCurrentVideo(button, videoPageUrl, authorId) {
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
    saveBlob(blob, getVideoFilename(videoPageUrl, authorId));

    setDownloadButtonIcon(button);
    button.disabled = false;
    button.title = 'Tải video này';
  } catch {
    button.title = 'Không tải được. Thử lại.';
    setDownloadButtonIcon(button);
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

function findVideoAuthorAvatar(video, card) {
  const cardAvatar = card.querySelector('a[data-e2e="video-author-avatar"]');
  if (cardAvatar) return cardAvatar;

  let node = video;
  for (let level = 0; node && level < 20; level += 1) {
    const avatar = node.matches?.('a[data-e2e="video-author-avatar"]')
      ? node
      : node.querySelector?.('a[data-e2e="video-author-avatar"]');
    if (avatar) return avatar;
    node = node.parentElement;
  }

  return null;
}

function findSectionActionBarContainer(video, card) {
  const selector = '[class*="SectionActionBarContainer"]';
  const cardContainer = card.matches?.(selector) ? card : card.querySelector(selector);
  if (cardContainer) return cardContainer;

  let node = video;
  for (let level = 0; node && level < 20; level += 1) {
    if (node.matches?.(selector)) return node;
    const container = node.querySelector?.(selector);
    if (container) return container;
    node = node.parentElement;
  }

  return null;
}

function findBrowseActionRow(video) {
  const player = video.closest('[data-e2e="browse-video"]');
  if (!player) return null;
  const videoTop = video.getBoundingClientRect().top;
  const likeIcon = [...document.querySelectorAll('[data-e2e="browse-like-icon"]')]
    .filter((icon) => icon.getBoundingClientRect().height > 0)
    .sort((left, right) => Math.abs(left.getBoundingClientRect().top - videoTop) - Math.abs(right.getBoundingClientRect().top - videoTop))[0];
  return likeIcon?.closest('button')?.parentElement || null;
}

function isPrimaryBrowseVideo(video) {
  const player = video.closest('[data-e2e="browse-video"]');
  if (!player) return false;
  const candidates = [...player.querySelectorAll('video')];
  const visible = candidates.filter((item) => {
    const rect = item.getBoundingClientRect();
    return rect.width > 80 && rect.height > 80;
  });
  const ranked = (visible.length ? visible : candidates).sort((left, right) => {
    const leftRect = left.getBoundingClientRect();
    const rightRect = right.getBoundingClientRect();
    return (rightRect.width * rightRect.height) - (leftRect.width * leftRect.height);
  });
  return ranked[0] === video;
}

function getDownloadButtonTarget(video, card, pageType) {
  const browseRow = findBrowseActionRow(video);
  if (browseRow) return { container: browseRow, pageType: 'browse' };

  if (pageType === 'video' || pageType === 'photo') {
    const actionBar = findSectionActionBarContainer(video, card);
    if (actionBar) return { container: actionBar };
    return { container: card };
  }

  if (pageType === 'home') {
    const actionBar = findSectionActionBarContainer(video, card);
    if (actionBar) return { container: actionBar };

    const avatar = findVideoAuthorAvatar(video, card);
    if (avatar?.parentElement) return { container: avatar.parentElement, before: avatar };
  }

  return { container: card };
}

const buttonByVideo = new WeakMap();
let domObserver = null;
let injectTimer = 0;

function isPreferredTarget(pageType, target) {
  if (pageType === 'browse') return true;
  if (pageType !== 'home' && pageType !== 'video') return true;
  const container = target.container || target;
  return Boolean(container.matches?.('[class*="SectionActionBarContainer"]'));
}

function nodeMayAffectDownloadButton(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.classList.contains('tiktok-card-download-button')) return false;
  if (node.tagName === 'VIDEO') return true;
  if (node.tagName === 'IMG' && /photomode/.test(node.currentSrc || node.src || node.getAttribute('src') || '')) return true;
  if (node.matches?.('[class*="SectionActionBarContainer"], [class*="PhotoPlayer"], [class*="ImgPhoto"], [class*="PhotoVideo"], a[href*="/photo/"], [data-e2e="user-post-item"], a[data-e2e="video-author-avatar"], [data-e2e="browse-video"], [data-e2e="browse-like-icon"]')) return true;
  return Boolean(node.querySelector?.('video, img[src*="photomode"], [class*="SectionActionBarContainer"], [class*="PhotoPlayer"], [class*="ImgPhoto"], [class*="PhotoVideo"], a[href*="/photo/"], [data-e2e="user-post-item"], a[data-e2e="video-author-avatar"], [data-e2e="browse-video"], [data-e2e="browse-like-icon"]'));
}

function scheduleInject() {
  clearTimeout(injectTimer);
  injectTimer = setTimeout(injectDownloadButtons, 200);
}

const photoButtonByPlayer = new WeakMap();

function imageSource(img) {
  return img.currentSrc || img.src || img.getAttribute('src') || '';
}

function collectPhotoUrls(player) {
  const nested = player.querySelector?.('[class*="PhotoPlayer"], [class*="ImgPhotoSlide"]')?.closest('[class*="PhotoPlayer"]');
  const scope = nested || player;
  const images = scope.tagName === 'IMG' ? [scope] : [...scope.querySelectorAll('img')];
  const seen = new Set();
  const full = [];
  const covers = [];
  images.forEach((img) => {
    const src = imageSource(img);
    if (!src.includes('photomode')) return;
    let key = src;
    try { key = new URL(src).pathname; } catch {}
    if (seen.has(key)) return;
    seen.add(key);
    if (src.includes('tplv-photomode-image')) full.push(src);
    else covers.push(src);
  });
  return full.length ? full : covers;
}

function photoPageUrl(player) {
  const scope = player.closest?.('article, [data-e2e="user-post-item"], a[href*="/photo/"]') || player;
  const link = scope.matches?.('a[href*="/photo/"]') ? scope : scope.querySelector?.('a[href*="/photo/"]');
  if (link?.href) return link.href.split('?')[0];

  const authorId = scope.querySelector?.('a[data-e2e="video-author-avatar"]')
    ?.getAttribute('href')?.match(/\/@([^/?]+)/)?.[1]
    || location.pathname.match(/@([^/]+)/)?.[1];
  const pathId = location.pathname.match(/\/photo\/(\d+)/)?.[1];
  const markup = scope.outerHTML || '';
  const postId = pathId && markup.includes(pathId)
    ? pathId
    : markup.match(/\/photo\/(\d+)/)?.[1] || null;
  if (authorId && postId) return `https://www.tiktok.com/@${authorId}/photo/${postId}`;
  if (/\/photo\/\d+/.test(location.pathname)) return location.href.split('?')[0];
  return null;
}

function rootIsPhoto(root) {
  if (root.matches?.('[class*="PhotoPlayer"], [class*="ImgPhotoSlide"], [class*="PhotoVideo"], a[href*="/photo/"]')) return true;
  if (root.tagName === 'IMG' && (/photomode/.test(imageSource(root)) || /image posted/i.test(root.alt || ''))) return true;
  if (root.querySelector?.('[class*="PhotoPlayer"], [class*="ImgPhotoSlide"], [class*="PhotoVideo"], a[href*="/photo/"]')) return true;
  const hasPhoto = [...root.querySelectorAll('img')].some((img) => /tplv-photomode-(image|zoomcover)/.test(imageSource(img)) || /image posted/i.test(img.alt || ''));
  if (!hasPhoto) return false;
  const hasVisibleVideo = [...root.querySelectorAll('video')].some((video) => {
    const rect = video.getBoundingClientRect();
    return rect.width > 80 && rect.height > 80;
  });
  return !hasVisibleVideo;
}

function findPhotoPlayers() {
  const players = new Set();
  const add = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    const root = element.closest?.('[class*="PhotoPlayer"], article, [data-e2e="user-post-item"]') || element;
    if (rootIsPhoto(root)) players.add(root);
  };

  document.querySelectorAll('[class*="PhotoPlayer"], [class*="ImgPhotoSlide"], [class*="PhotoVideo"]').forEach(add);
  document.querySelectorAll('a[href*="/photo/"]').forEach((link) => add(link.closest('[data-e2e="user-post-item"], article') || link));
  document.querySelectorAll('img').forEach((img) => {
    const src = imageSource(img);
    const isPhotoImage = /tplv-photomode-(image|zoomcover)/.test(src) || /image posted/i.test(img.alt || '');
    if (!isPhotoImage) return;
    const rect = img.getBoundingClientRect();
    if (rect.width < 48 || rect.height < 48) return;
    add(img);
  });

  return [...players].filter((player) => ![...players].some((other) => other !== player && player.contains(other)));
}

function findPhotoPlayer(pageUrl) {
  const players = findPhotoPlayers();
  const postId = pageUrl?.match(/\/photo\/(\d+)/)?.[1];
  if (!postId) return players[0] || null;
  return players.find((player) => (player.closest('article, [data-e2e="user-post-item"]') || player).outerHTML.includes(postId))
    || (location.pathname.includes(postId) ? players[0] : null);
}

function photoCard(player) {
  const postItem = player.matches?.('[data-e2e="user-post-item"]')
    ? player
    : player.closest?.('[data-e2e="user-post-item"]');
  if (postItem) return postItem;
  return player.closest?.('article') || findVideoCard(player);
}

function getPhotoButtonTarget(player, card) {
  const routeType = getPageType();
  const layoutType = routeType === 'photo' ? 'video' : routeType;
  const target = getDownloadButtonTarget(player, card, layoutType);
  return { container: target.container || card, pageType: target.pageType || layoutType };
}

async function downloadCurrentPhotos(button, player) {
  button.disabled = true;
  button.textContent = '...';
  try {
    const images = collectPhotoUrls(player);
    const pageUrl = photoPageUrl(player);
    if (!images.length || !pageUrl) throw new Error('No images');
    const response = await fetch('http://127.0.0.1:8787/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pageUrl, images })
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    if (!blob.size) throw new Error('Server returned an empty file');
    const filename = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'tiktok-photos.zip';
    if (filename.endsWith('.zip')) {
      const tail = new Uint8Array(await blob.slice(-Math.min(blob.size, 64)).arrayBuffer());
      const valid = tail.some((_, index) => index <= tail.length - 4
        && tail[index] === 0x50 && tail[index + 1] === 0x4b && tail[index + 2] === 0x05 && tail[index + 3] === 0x06);
      if (!valid) throw new Error('Zip hỏng');
    }
    saveBlob(blob, filename);
    button.title = 'Tải ảnh này';
  } catch {
    button.title = 'Không tải được. Thử lại.';
  }
  setDownloadButtonIcon(button);
  button.disabled = false;
}

function attachPhotoButton(player) {
  const trackedButton = photoButtonByPlayer.get(player);
  if (trackedButton?.isConnected) return;

  const card = photoCard(player);
  if (!card) return;
  const target = getPhotoButtonTarget(player, card);
  const buttonHost = target.container;
  if (!buttonHost) return;
  const existingButton = hostDownloadButtons(buttonHost).find((button) => button.dataset.media === 'photo');
  if (existingButton) {
    photoButtonByPlayer.set(player, existingButton);
    return;
  }
  if ((target.pageType === 'user' || target.pageType === 'photo') && getComputedStyle(card).position === 'static') {
    card.style.position = 'relative';
  }

  const button = document.createElement('button');
  button.className = 'tiktok-card-download-button';
  button.type = 'button';
  button.dataset.pageType = target.pageType;
  button.dataset.media = 'photo';
  setDownloadButtonIcon(button);
  button.title = 'Tải ảnh này';
  button.setAttribute('aria-label', 'Tải ảnh này');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    downloadCurrentPhotos(button, player);
  }, true);
  buttonHost.append(button);
  photoButtonByPlayer.set(player, button);
}

function injectDownloadButtons() {
  domObserver?.disconnect();
  try {
    document.querySelectorAll('video').forEach(attachDownloadButton);
    findPhotoPlayers().forEach(attachPhotoButton);
  } finally {
    domObserver?.observe(document.documentElement, { childList: true, subtree: true });
  }
}

function hostDownloadButtons(buttonHost) {
  return [...buttonHost.querySelectorAll(':scope > .tiktok-card-download-button')];
}

function attachDownloadButton(video) {
  const card = findVideoCard(video);
  if (!card) return;

  const routeType = getPageType();
  const target = getDownloadButtonTarget(video, card, routeType);
  if (!target) return;
  const pageType = target.pageType || routeType;
  let buttonHost = target.container || target;
  if (pageType === 'user') {
    const postItem = video.closest('[data-e2e="user-post-item"]');
    if (postItem) {
      buttonHost = postItem;
      if (getComputedStyle(postItem).position === 'static') postItem.style.position = 'relative';
    }
  }
  if (pageType === 'browse' && !isPrimaryBrowseVideo(video)) return;
  if (pageType === 'browse') {
    video.closest('[data-e2e="browse-video"]')
      ?.querySelectorAll('.tiktok-card-download-button')
      .forEach((button) => {
        if (button.dataset.media !== 'photo') button.remove();
      });
  }

  const trackedButton = buttonByVideo.get(video);
  const hostButtons = hostDownloadButtons(buttonHost).filter((button) => button.dataset.media !== 'photo');
  const existingButton = trackedButton?.isConnected ? trackedButton : hostButtons[0] || null;
  if (trackedButton?.isConnected && trackedButton.dataset.placed === 'preferred' && trackedButton.parentElement === buttonHost) {
    hostButtons.forEach((button) => {
      if (button !== trackedButton) button.remove();
    });
    return;
  }
  if (existingButton) {
    hostButtons.forEach((button) => {
      if (button !== existingButton) button.remove();
    });
    if (existingButton.dataset.pageType !== pageType) {
      existingButton.dataset.pageType = pageType;
      setDownloadButtonIcon(existingButton);
    }
    if (target.before && existingButton !== target.before && !buttonHost.contains(existingButton)) {
      buttonHost.insertBefore(existingButton, target.before);
    } else if (existingButton.parentElement !== buttonHost) {
      buttonHost.append(existingButton);
    }
    if (isPreferredTarget(pageType, target)) existingButton.dataset.placed = 'preferred';
    buttonByVideo.set(video, existingButton);
    return;
  }

  if ((pageType === 'user' || pageType === 'video' || pageType === 'photo') && getComputedStyle(card).position === 'static') {
    card.style.position = 'relative';
  }
  const button = document.createElement('button');
  button.className = 'tiktok-card-download-button';
  button.type = 'button';
  button.dataset.pageType = pageType;
  setDownloadButtonIcon(button);
  button.title = 'Tải video này';
  button.setAttribute('aria-label', 'Tải video này');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const postItem = video.closest('[data-e2e="user-post-item"]');
    const gridLink = postItem?.querySelector('a[href*="/video/"]')?.href?.split('?')[0];
    const videoPageUrl = gridLink || getVideoPageUrl(video, card);
    const authorId = getVideoAuthorId(video, card);
    if (videoPageUrl) {
      downloadCurrentVideo(button, videoPageUrl, authorId);
    } else {
      setDownloadButtonIcon(button);
    }
  }, true);

  if (target.before) {
    target.container.insertBefore(button, target.before);
  } else {
    buttonHost.append(button);
  }
  buttonByVideo.set(video, button);
  if (isPreferredTarget(pageType, target)) button.dataset.placed = 'preferred';
}

function setDownloadButtonIcon(button) {
  const icon = document.createElement('img');
  const iconName = button.dataset.pageType === 'video' || button.dataset.pageType === 'photo'
    ? 'icon_download_trang.png'
    : 'icon_download_den.png';
  icon.src = chrome.runtime.getURL(iconName);
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  button.replaceChildren(icon);
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
    color: #000;
    background: #fff;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .24);
    cursor: pointer;
    font: 700 12px Arial, sans-serif;
  }
  .tiktok-card-download-button[data-page-type="home"] {
    position: static;
    align-self: center;
    margin-top: 8px;
  }
  .tiktok-card-download-button[data-page-type="home"],
  .tiktok-card-download-button[data-page-type="user"] {
    min-width: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    display: grid;
    place-items: center;
    color: #000;
    background: #fff;
    font-size: 18px;
  }
  [data-e2e="user-post-item"] .tiktok-card-download-button {
    opacity: 0;
    pointer-events: none;
    transition: opacity .12s ease;
  }
  [data-e2e="user-post-item"]:hover .tiktok-card-download-button,
  [data-e2e="user-post-item"]:focus-within .tiktok-card-download-button {
    opacity: 1;
    pointer-events: auto;
  }
  .tiktok-card-download-button img {
    width: 18px;
    height: 18px;
    display: block;
    object-fit: contain;
  }
  .tiktok-card-download-button[data-page-type="video"],
  .tiktok-card-download-button[data-page-type="photo"] {
    position: static;
    flex: 0 0 auto;
    margin-left: 8px;
    color: #000;
    background: #fff;
  }
  .tiktok-card-download-button[data-page-type="browse"] {
    position: static;
    align-self: center;
    min-width: 32px;
    width: 32px;
    height: 32px;
    margin-left: 8px;
    padding: 0;
    display: grid;
    place-items: center;
    color: #000;
    background: #fff;
    box-shadow: none;
  }
  .tiktok-card-download-button[data-page-type="video"]:hover,
  .tiktok-card-download-button[data-page-type="photo"]:hover {
    background: #f2f2f2;
  }
  .tiktok-card-download-button[data-page-type="home"]:hover,
  .tiktok-card-download-button[data-page-type="user"]:hover {
    background: #f2f2f2;
  }
  .tiktok-card-download-button:hover { background: #f2f2f2; }
  .tiktok-card-download-button:disabled { opacity: .7; cursor: wait; }
`;
document.documentElement.append(buttonStyle);
domObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    const added = [...mutation.addedNodes];
    const removed = [...mutation.removedNodes];
    const buttonRemoved = removed.some((node) => node.nodeType === Node.ELEMENT_NODE && (
      node.classList?.contains('tiktok-card-download-button') || node.querySelector?.('.tiktok-card-download-button')
    ));
    if (buttonRemoved || added.some(nodeMayAffectDownloadButton)) {
      scheduleInject();
      return;
    }
  }
});
injectDownloadButtons();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_VIDEO_SOURCE') {
    sendResponse({ videoUrl: findVideoSource() });
  }
  if (message.type === 'GET_PHOTO_IMAGES') {
    const player = findPhotoPlayer(message.pageUrl);
    sendResponse({
      images: player ? collectPhotoUrls(player) : [],
      pageUrl: player ? photoPageUrl(player) : null
    });
  }
  if (message.type === 'DOWNLOAD_VIDEO') {
    sendResponse({
      started: downloadVideo(message.videoUrl),
      sourceType: message.videoUrl?.startsWith('blob:') ? 'blob' : 'direct'
    });
  }
  return true;
});
