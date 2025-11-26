/**
 * Express Application Setup
 * Main application file for the LINE Chat Summarizer backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
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

// Cookie parser middleware
app.use(cookieParser());

// Routes
const lineRoutes = require('./routes/line_routes');
const debugRoutes = require('./routes/debug_routes');
const authRoutes = require('./routes/auth_routes');
const organizationRoutes = require('./routes/organization_routes');

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
app.use('/api/debug', debugRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);

console.log('✅ Auth API routes enabled at /api/auth');
console.log('✅ Organization API routes enabled at /api/organizations');

// Image serving endpoint from GridFS
app.get('/api/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    console.log(`📸 Serving image: ${imageId}`);

    const mongoose = require('mongoose');
    const { ObjectId } = require('mongodb');

    // Check if MongoDB is connected
    if (!mongoose.connection.db) {
      console.error('❌ MongoDB not connected');
      return res.status(503).json({ error: 'Database not available' });
    }

    // Validate ObjectId
    if (!ObjectId.isValid(imageId)) {
      console.error(`❌ Invalid image ID: ${imageId}`);
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });

    // Find the file
    const files = await bucket.find({ _id: new ObjectId(imageId) }).toArray();

    if (files.length === 0) {
      console.error(`❌ Image not found in GridFS: ${imageId}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    const file = files[0];
    console.log(`✅ Found image: ${file.filename}, size: ${file.length} bytes`);

    // Set appropriate headers
    res.set({
      'Content-Type': file.metadata?.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'ETag': file._id.toString()
    });

    // Stream the file
    const downloadStream = bucket.openDownloadStream(new ObjectId(imageId));

    downloadStream.on('error', (error) => {
      console.error('❌ Error streaming image:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving image' });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('❌ Error serving image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify',
        refresh: 'POST /api/auth/refresh',
        forgot_password: 'POST /api/auth/forgot-password',
        reset_password: 'POST /api/auth/reset-password',
        change_password: 'PUT /api/auth/change-password',
        profile: 'PUT /api/auth/profile'
      },
      organizations: {
        get_org: 'GET /api/organizations/:orgId',
        members: 'GET /api/organizations/:orgId/members',
        invite_codes: {
          create: 'POST /api/organizations/:orgId/invite-codes',
          list: 'GET /api/organizations/:orgId/invite-codes',
          disable: 'DELETE /api/organizations/:orgId/invite-codes/:codeId'
        },
        join_requests: {
          list: 'GET /api/organizations/:orgId/join-requests',
          approve: 'POST /api/organizations/:orgId/join-requests/:requestId/approve',
          reject: 'POST /api/organizations/:orgId/join-requests/:requestId/reject'
        },
        join: {
          validate_code: 'POST /api/organizations/validate-code',
          join: 'POST /api/organizations/join',
          my_requests: 'GET /api/organizations/my-requests'
        }
      },
      line_webhook: '/api/line/webhook',
      line_push: '/api/line/push',
      line_profile: '/api/line/profile/:userId',
      line_health: '/api/line/health',
      images: '/api/images/:imageId',
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