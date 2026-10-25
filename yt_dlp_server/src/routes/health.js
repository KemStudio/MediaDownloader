const { sendJson } = require('../http');

function handleHealth(response) {
  sendJson(response, 200, { ok: true });
}

module.exports = { handleHealth };
