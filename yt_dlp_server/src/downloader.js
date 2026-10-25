const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ytDlpCommand } = require('./config');

function defaultYtDlpArgs(videoPageUrl, outputTemplate) {
  return [
    '--no-playlist', '--format', 'bestvideo*+bestaudio/best', '--merge-output-format', 'mp4',
    '--output', outputTemplate, '--no-part', '--no-progress', '--quiet', videoPageUrl
  ];
}

function runDownloader(videoPageUrl, outputTemplate, source = {}) {
  const args = typeof source.ytDlpArgs === 'function'
    ? source.ytDlpArgs(videoPageUrl, outputTemplate)
    : defaultYtDlpArgs(videoPageUrl, outputTemplate);

  return new Promise((resolve, reject) => {
    const downloader = spawn(ytDlpCommand, args, { stdio: ['ignore', 'ignore', 'pipe'] });
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

module.exports = { defaultYtDlpArgs, runDownloader };
