#!/usr/bin/env node

/**
 * Minimal test server for Railway deployment debugging
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🔍 MINIMAL TEST SERVER STARTING...');
console.log('📋 Node version:', process.version);
console.log('📋 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', PORT);
console.log('🏠 Host:', HOST);

const server = http.createServer((req, res) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      port: PORT,
      host: HOST,
      node_version: process.version,
      message: 'Railway minimal test server is running!'
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Railway minimal test server is running!
Time: ${new Date().toISOString()}
Node: ${process.version}
Port: ${PORT}
Host: ${HOST}
Environment: ${process.env.NODE_ENV || 'development'}
`);
  }
});

server.listen(PORT, HOST, () => {
  console.log('✅ MINIMAL TEST SERVER STARTED SUCCESSFULLY!');
  console.log(`📡 Listening on http://${HOST}:${PORT}`);
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
  console.log('🎯 Railway should now be able to connect to this minimal service');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});