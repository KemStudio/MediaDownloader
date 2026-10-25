const tiktok = require('./tiktok');

// First match wins. A source exports { id, match, filename, contentType?, ytDlpArgs? }.
const sources = [tiktok];

function resolveSource(pageUrl) {
  return sources.find((source) => source.match(pageUrl)) || null;
}

module.exports = { resolveSource };
