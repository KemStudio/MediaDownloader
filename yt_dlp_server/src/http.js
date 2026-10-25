function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJson(request, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Request body is too large.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, body) {
  if (response.headersSent) return;
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

module.exports = { setCorsHeaders, sendJson, readJson };
