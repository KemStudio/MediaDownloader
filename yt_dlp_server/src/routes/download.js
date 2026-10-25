const fs = require('fs');
const os = require('os');
const path = require('path');
const { sendJson } = require('../http');
const { resolveSource } = require('../sources');
const { runDownloader } = require('../downloader');
const { savePhotoPost } = require('../photos');
const tiktok = require('../sources/tiktok');

async function handleDownload(response, videoPageUrl) {
  const source = resolveSource(videoPageUrl);
  if (!source) {
    sendJson(response, 400, { error: 'A supported video URL is required.' });
    return;
  }

  const filename = source.filename(videoPageUrl);
  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), `${source.id}-downloader-`));
  const stem = filename.replace(/\.[^.]+$/, '');
  const outputTemplate = path.join(tempDirectory, `${stem}.%(ext)s`);

  try {
    const result = await runDownloader(videoPageUrl, outputTemplate, source);
    if (!result.ok) {
      await fs.promises.rm(tempDirectory, { recursive: true, force: true });
      sendJson(response, 502, { error: result.error });
      return;
    }

    pipeDownload(response, result.filePath, {
      'Content-Type': source.contentType || 'video/mp4',
      'Content-Length': result.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }, tempDirectory);
  } catch (error) {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true });
    sendJson(response, 500, { error: error.message });
  }
}

async function handleImageDownload(response, body) {
  const pageUrl = typeof body?.url === 'string' ? body.url : '';
  const imageUrls = Array.isArray(body?.images) ? body.images.filter((imageUrl) => typeof imageUrl === 'string') : [];
  if (!tiktok.match(pageUrl)) {
    sendJson(response, 400, { error: 'Cần một link TikTok hợp lệ.' });
    return;
  }

  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tiktok-photos-'));
  try {
    const result = await savePhotoPost(pageUrl, imageUrls, tempDirectory);
    if (!result.ok) {
      await fs.promises.rm(tempDirectory, { recursive: true, force: true });
      sendJson(response, 502, { error: result.error });
      return;
    }

    pipeDownload(response, result.filePath, {
      'Content-Type': result.contentType,
      'Content-Length': result.size,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store'
    }, tempDirectory);
  } catch (error) {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true });
    sendJson(response, 500, { error: error.message });
  }
}

function pipeDownload(response, filePath, headers, tempDirectory) {
  const stream = fs.createReadStream(filePath);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    fs.rm(tempDirectory, { recursive: true, force: true }, () => {});
  };
  response.writeHead(200, headers);
  response.on('close', cleanup);
  stream.on('error', () => {
    cleanup();
    response.destroy();
  });
  stream.pipe(response);
}

module.exports = { handleDownload, handleImageDownload };
