const form = document.querySelector('#download-form');
const urlInput = document.querySelector('#video-url');
const pasteButton = document.querySelector('#paste-button');
const status = document.querySelector('#status');

function showStatus(message, type = '') {
  status.textContent = message;
  status.className = `status ${type}`;
}

function isTikTokUrl(value) {
  try {
    const url = new URL(value);
    return /(^|\.)tiktok\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isPhotoUrl(value) {
  try {
    return /\/photo\/\d+/.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && isTikTokUrl(tab.url)) urlInput.value = tab.url;
}

async function saveDownload(response, fallbackMessage, fallbackName) {
  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  const filename = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || fallbackName;
  const blob = await response.blob();
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

async function downloadFromServer(videoPageUrl) {
  const response = await fetch(`http://127.0.0.1:8787/download?url=${encodeURIComponent(videoPageUrl)}`);
  await saveDownload(response, 'Local server không thể tải video.', 'tiktok-video.mp4');
}

async function downloadPhotos(pageUrl) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Hãy mở bài ảnh TikTok trên tab hiện tại.');
  let images = [];
  let resolvedUrl = pageUrl;
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PHOTO_IMAGES', pageUrl });
    images = result?.images || [];
    if (result?.pageUrl) resolvedUrl = result.pageUrl;
  } catch {
    throw new Error('Hãy mở đúng bài ảnh trên TikTok rồi tải lại.');
  }
  if (!images.length) throw new Error('Không thấy ảnh trên tab TikTok đang mở.');
  const response = await fetch('http://127.0.0.1:8787/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: resolvedUrl, images })
  });
  await saveDownload(response, 'Local server không thể tải ảnh.', 'tiktok-photos.zip');
}

pasteButton.addEventListener('click', async () => {
  try {
    urlInput.value = await navigator.clipboard.readText();
    showStatus('Đã dán link từ clipboard.', 'success');
  } catch {
    showStatus('Chrome chưa cho phép đọc clipboard. Hãy dán bằng Ctrl + V.', 'error');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const videoUrl = urlInput.value.trim();
  if (!isTikTokUrl(videoUrl)) {
    showStatus('Vui lòng nhập một link TikTok hợp lệ.', 'error');
    return;
  }
  try {
    if (isPhotoUrl(videoUrl)) {
      showStatus('Đang tải ảnh qua server local...', '');
      await downloadPhotos(videoUrl);
      showStatus('Đã bắt đầu tải ảnh.', 'success');
      return;
    }
    showStatus('Đang tải video qua server local...', '');
    await downloadFromServer(videoUrl);
    showStatus('Đã bắt đầu tải video.', 'success');
  } catch (error) {
    const message = error instanceof TypeError
      ? 'Không kết nối được server local. Hãy chạy npm start.'
      : error.message;
    showStatus(message, 'error');
  }
});

loadCurrentTab();
