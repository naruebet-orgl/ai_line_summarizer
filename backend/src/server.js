/**
 * Server Entry Point
 * Starts the HTTP server for the LINE Chat Summarizer AI backend
 */

const app = require('./app');
const config = require('./config');

const PORT = config.app.port;
const NODE_ENV = config.app.nodeEnv;

/**
 * Start the HTTP server
 */
const startServer = () => {
  console.log('🔧 Starting LINE Chat Summarizer AI Backend Server');
  console.log(`📋 Environment: ${NODE_ENV}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🌐 Backend URL: ${config.app.backendUrl}`);
  console.log(`🎯 Frontend URL: ${config.app.frontendUrl}`);
  console.log(`🤖 LINE Bot: ${config.line.channelAccessToken ? 'Configured' : 'Not configured'}`);
  
  const server = app.listen(PORT, () => {
    console.log('✅ Server is running successfully!');
    console.log(`📡 Server listening on port ${PORT}`);
    console.log(`🔗 Server URL: ${config.app.backendUrl}`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  🏠 Root: ${config.app.backendUrl}/`);
    console.log(`  ❤️  Health: ${config.app.backendUrl}/health`);
    console.log(`  📨 LINE Webhook: ${config.app.backendUrl}/api/line/webhook`);
    console.log(`  📤 LINE Push: ${config.app.backendUrl}/api/line/push`);
    console.log(`  👤 LINE Profile: ${config.app.backendUrl}/api/line/profile/:userId`);
    console.log(`  🔍 LINE Health: ${config.app.backendUrl}/api/line/health`);
    console.log('');
    
    if (NODE_ENV === 'development') {
      console.log('🛠️  Development mode active');
      console.log('   - Detailed error messages enabled');
      console.log('   - CORS configured for local development');
    }
    
    console.log('🚀 Ready to receive LINE webhooks and generate AI summaries!');
  });

  // Handle server shutdown gracefully
  const gracefulShutdown = (signal) => {
    console.log(`📴 ${signal} received. Starting graceful shutdown...`);
    
    server.close((error) => {
      if (error) {
        console.error('❌ Error during server shutdown:', error);
        process.exit(1);
      }
      
      console.log('✅ HTTP server closed successfully');
      console.log('👋 Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force close after timeout
    setTimeout(() => {
      console.error('❌ Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  return server;
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };