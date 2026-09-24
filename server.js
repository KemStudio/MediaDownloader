const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const port = Number(process.env.PORT || 8787);
const wingetYtDlp = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe', 'yt-dlp.exe')
  : null;
const ytDlpCommand = process.env.YT_DLP_COMMAND
  || (wingetYtDlp && fs.existsSync(wingetYtDlp) ? wingetYtDlp : 'yt-dlp');

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isTikTokUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
  } catch {
    return false;
  }
}

function sendJson(response, statusCode, body) {
  if (response.headersSent) return;
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function getVideoFilename(videoPageUrl) {
  const pathname = new URL(videoPageUrl).pathname;
  const userId = pathname.match(/@([^/]+)/)?.[1] || 'tiktok-user';
  const videoId = pathname.match(/\/video\/(\d+)/)?.[1] || Date.now().toString();
  return `${userId}_${videoId}.mp4`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'GET' && requestUrl.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method !== 'GET' || requestUrl.pathname !== '/download') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const videoPageUrl = requestUrl.searchParams.get('url');
  if (!isTikTokUrl(videoPageUrl)) {
    sendJson(response, 400, { error: 'A valid TikTok URL is required.' });
    return;
  }

  const filename = getVideoFilename(videoPageUrl);
  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tiktok-downloader-'));
  const outputTemplate = path.join(tempDirectory, `${filename.slice(0, -4)}.%(ext)s`);

  try {
    const result = await runDownloader(videoPageUrl, outputTemplate);
    if (!result.ok) {
      sendJson(response, 502, { error: result.error });
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': result.size,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    });
    const stream = fs.createReadStream(result.filePath);
    stream.pipe(response);
    stream.on('close', () => fs.rm(tempDirectory, { recursive: true, force: true }, () => {}));
  } catch (error) {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true });
    sendJson(response, 500, { error: error.message });
  }
});

function runDownloader(videoPageUrl, outputTemplate) {
  return new Promise((resolve, reject) => {
    const downloader = spawn(ytDlpCommand, [
      '--no-playlist', '--format', 'bestvideo*+bestaudio/best', '--merge-output-format', 'mp4',
      '--output', outputTemplate, '--no-part', '--no-progress', '--quiet', videoPageUrl
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errorOutput = '';
    downloader.stderr.on('data', (chunk) => { errorOutput += chunk.toString(); });
    downloader.on('error', reject);
    downloader.on('close', async (code) => {
      if (code !== 0) {
        resolve({ ok: false, error: errorOutput.trim() || `yt-dlp exited with code ${code}` });
        return;
      }
      const directory = path.dirname(outputTemplate);
      const outputFiles = (await fs.promises.readdir(directory)).filter((file) => !file.endsWith('.part'));
      const filesWithStats = await Promise.all(outputFiles.map(async (file) => {
        const filePath = path.join(directory, file);
        return { filePath, stats: await fs.promises.stat(filePath) };
      }));
      const videoFile = filesWithStats.filter(({ stats }) => stats.isFile()).sort((left, right) => right.stats.size - left.stats.size)[0];
      if (!videoFile) {
        resolve({ ok: false, error: 'yt-dlp không tạo được file video.' });
        return;
      }
      if (videoFile.stats.size < 1024) {
        resolve({ ok: false, error: 'yt-dlp tạo file video rỗng.' });
        return;
      }
      resolve({ ok: true, filePath: videoFile.filePath, size: videoFile.stats.size });
    });
  });
}

server.listen(port, '127.0.0.1');
console.log(`Server is listening on http://127.0.0.1:${port}`);
