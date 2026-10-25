const http = require('http');
const { ip, port } = require('./src/config');
const { createRequestHandler } = require('./src/app');

const server = http.createServer(createRequestHandler());

server.listen(port, ip);
console.log(`Server is listening on http://${ip}:${port}`);

let isShuttingDown = false;
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}. Stopping server...`);
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', (code) => {
  console.log(`Server exited with code ${code}.`);
});
