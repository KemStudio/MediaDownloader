chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DOWNLOAD_VIDEO' && message.url) {
    chrome.downloads.download({
      url: message.url,
      saveAs: true,
      filename: 'tiktok-video.mp4'
    });
  }
});
