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

async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && isTikTokUrl(tab.url)) urlInput.value = tab.url;
}

async function downloadFromServer(videoPageUrl) {
  const response = await fetch(`http://127.0.0.1:8787/download?url=${encodeURIComponent(videoPageUrl)}`);
  if (!response.ok) {
    let message = 'Local server không thể tải video.';
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'tiktok-video.mp4';
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
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
