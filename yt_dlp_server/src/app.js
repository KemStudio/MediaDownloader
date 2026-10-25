const { URL } = require('url');
const { setCorsHeaders, sendJson, readJson } = require('./http');
const { handleHealth } = require('./routes/health');
const { handleDownload, handleImageDownload } = require('./routes/download');

function createRequestHandler() {
  return async (request, response) => {
    setCorsHeaders(response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'GET' && requestUrl.pathname === '/health') {
      handleHealth(response);
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/download') {
      await handleDownload(response, requestUrl.searchParams.get('url'));
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/download') {
      try {
        await handleImageDownload(response, await readJson(request));
      } catch {
        sendJson(response, 400, { error: 'Ảnh gửi lên không đọc được.' });
      }
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  };
}

module.exports = { createRequestHandler };
