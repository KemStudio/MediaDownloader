const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const port = Number(process.env.PORT || 8787);
const ip = process.env.IP || '127.0.0.1';
const wingetYtDlp = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe', 'yt-dlp.exe')
  : null;
const ytDlpCommand = process.env.YT_DLP_COMMAND
  || (wingetYtDlp && fs.existsSync(wingetYtDlp) ? wingetYtDlp : 'yt-dlp');

module.exports = { port, ip, ytDlpCommand };
