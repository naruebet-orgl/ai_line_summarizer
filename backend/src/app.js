/**
 * Express Application Setup
 * Main application file for the LINE Chat Summarizer backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const dbConnection = require('./database/connection');

// Initialize Express app
const app = express();

console.log('🚀 Initializing LINE Chat Summarizer Backend');

// Validate configuration on startup
if (!config.validateConfig()) {
  console.error('❌ Configuration validation failed. Exiting...');
  process.exit(1);
}

// Connect to database
dbConnection.connect().then((connected) => {
  // Create indexes only if successfully connected
  if (connected) {
    dbConnection.createIndexes();
  }
});

// Security middleware
app.use(helmet());

// CORS middleware with robust error handling
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigin = config.cors.origin;
    console.log('🔍 CORS check - Origin:', origin, 'Allowed:', allowedOrigin);
    
    // Always allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Allow the configured origin
    if (origin === allowedOrigin) {
      return callback(null, true);
    }
    
    // For development, allow localhost
    if (config.app.nodeEnv === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Log and allow all origins in production to prevent blocking (temporary fix)
    console.log('⚠️ CORS: Unknown origin allowed temporarily:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Line-Signature']
}));

// Logging middleware
app.use(morgan('combined'));

// Raw body middleware for LINE webhook signature validation (must be before express.json)
app.use('/api/line/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const lineRoutes = require('./routes/line_routes');

// tRPC setup (will be enabled after installing dependencies)
try {
  const { createExpressMiddleware } = require('@trpc/server/adapters/express');
  const { appRouter } = require('./trpc/app');
  const { createContext } = require('./trpc/context');

  // Add tRPC middleware
  app.use('/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => createContext({ req, res })
    })
  );
  
  console.log('✅ tRPC API routes enabled at /api/trpc');
} catch (error) {
  console.log('⏳ tRPC routes disabled - error:', error.message);
  console.log('❌ Full error:', error);
}

// API Routes
app.use('/api/line', lineRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'LINE Chat Summarizer Backend',
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'LINE Chat Summarizer Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      line_webhook: '/api/line/webhook',
      line_push: '/api/line/push',
      line_profile: '/api/line/profile/:userId',
      line_health: '/api/line/health',
      trpc_api: '/api/trpc'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: config.app.nodeEnv === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;