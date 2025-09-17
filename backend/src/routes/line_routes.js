/**
 * LINE Bot Routes
 * Express routes for handling LINE webhook and bot operations
 */

const express = require('express');
const lineService = require('../services/line_service');
const LineWebhookHandler = require('../handlers/line_webhook_handler');

// Create webhook handler instance
const lineWebhookHandler = new LineWebhookHandler();

const router = express.Router();

/**
 * Middleware to validate LINE webhook signature
 */
const validate_line_signature = (req, res, next) => {
  const signature = req.get('X-Line-Signature');
  
  console.log('🔐 Validating LINE webhook signature');
  console.log('Raw body type:', typeof req.body);
  console.log('Raw body length:', req.body ? req.body.length : 'undefined');
  console.log('Signature header:', signature);
  
  // Convert buffer to string for signature validation
  const bodyString = req.body.toString('utf8');
  console.log('Body string:', bodyString);
  
  // Skip signature validation for LINE verification requests (empty body)
  if (!signature) {
    console.warn('⚠️ No X-Line-Signature header found, proceeding without validation');
  } else if (!lineService.validate_signature(bodyString, signature)) {
    console.error('❌ Invalid LINE webhook signature');
    // For debugging - let's see what's happening
    console.log('Expected signature would be calculated from body:', bodyString);
    return res.status(401).json({ 
      error: 'Invalid signature',
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('✅ LINE webhook signature validated');
  }
  
  // Parse the JSON for the handler
  try {
    req.body = JSON.parse(bodyString);
  } catch (error) {
    console.error('❌ Invalid JSON in webhook payload:', error);
    return res.status(400).json({ 
      error: 'Invalid JSON payload',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * LINE Webhook Endpoint
 * Receives and processes webhook events from LINE Platform
 * POST /api/line/webhook
 */
router.post('/webhook', validate_line_signature, async (req, res) => {
  console.log('📨 LINE webhook received');
  console.log('Request headers:', req.headers);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      console.warn('⚠️ Invalid webhook payload: missing events array');
      return res.status(400).json({ 
        error: 'Invalid payload format',
        expected: 'events array',
        timestamp: new Date().toISOString()
      });
    }
    
    if (events.length === 0) {
      console.log('📭 No events to process');
      return res.status(200).json({ 
        message: 'No events to process',
        timestamp: new Date().toISOString()
      });
    }
    
    // Process webhook events
    await lineWebhookHandler.handle_webhook_events(events);
    
    console.log('✅ LINE webhook processed successfully');
    res.status(200).json({ 
      message: 'Webhook processed successfully',
      events_count: events.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LINE webhook processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Send Push Message Endpoint
 * Allows sending push messages to LINE users
 * POST /api/line/push
 */
router.post('/push', async (req, res) => {
  console.log('📤 LINE push message request');
  
  try {
    const { userId, message } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'message'],
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await lineService.push_message(userId, message);
    
    console.log('✅ LINE push message sent');
    res.status(200).json({ 
      message: 'Push message sent successfully',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LINE push message error:', error);
    res.status(500).json({ 
      error: 'Failed to send push message',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get User Profile Endpoint
 * Retrieves LINE user profile information
 * GET /api/line/profile/:userId
 */
router.get('/profile/:userId', async (req, res) => {
  console.log('👤 LINE user profile request');
  
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId parameter',
        timestamp: new Date().toISOString()
      });
    }
    
    const profile = await lineService.get_user_profile(userId);
    
    console.log('✅ LINE user profile retrieved');
    res.status(200).json({ 
      profile,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LINE user profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get user profile',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health Check Endpoint
 * Verifies LINE bot configuration and connectivity
 * GET /api/line/health
 */
router.get('/health', async (req, res) => {
  console.log('🔍 LINE bot health check');
  
  try {
    const health = {
      status: 'ok',
      service: 'LINE Bot',
      timestamp: new Date().toISOString(),
      configuration: {
        channel_secret: !!lineService.channelSecret ? 'configured' : 'missing',
        access_token: !!lineService.channelAccessToken ? 'configured' : 'missing'
      }
    };
    
    // Check if all required configurations are present
    if (!lineService.channelSecret || !lineService.channelAccessToken) {
      health.status = 'degraded';
      health.message = 'Missing required LINE configuration';
    }
    
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('❌ LINE health check error:', error);
    res.status(500).json({ 
      status: 'error',
      service: 'LINE Bot',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test Message Endpoint
 * Sends a test message (for development/testing purposes)
 * POST /api/line/test
 */
router.post('/test', async (req, res) => {
  console.log('🧪 LINE test message request');
  
  try {
    const { userId, message = 'Test message from LINE bot' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await lineService.push_message(userId, message);
    
    console.log('✅ LINE test message sent');
    res.status(200).json({ 
      message: 'Test message sent successfully',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LINE test message error:', error);
    res.status(500).json({ 
      error: 'Failed to send test message',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Webhook Verification Endpoint
 * Used by LINE to verify webhook URL during setup
 * GET /api/line/webhook
 */
router.get('/webhook', (req, res) => {
  console.log('✅ LINE webhook verification (GET request)');
  res.status(200).json({ 
    message: 'LINE webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
});

/**
 * Test Webhook Endpoint (bypasses signature validation)
 * POST /api/line/webhook-test
 */
router.post('/webhook-test', async (req, res) => {
  console.log('🧪 LINE webhook test (no signature validation)');
  console.log('Test request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      console.warn('⚠️ Invalid webhook payload: missing events array');
      return res.status(400).json({ 
        error: 'Invalid payload format',
        expected: 'events array',
        timestamp: new Date().toISOString()
      });
    }
    
    if (events.length === 0) {
      console.log('📭 No events to process in test');
      return res.status(200).json({ 
        message: 'Test webhook - No events to process',
        timestamp: new Date().toISOString()
      });
    }
    
    // Process webhook events (same as main webhook)
    await lineWebhookHandler.handle_webhook_events(events);
    
    console.log('✅ LINE test webhook processed successfully');
    res.status(200).json({ 
      message: 'Test webhook processed successfully',
      events_count: events.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LINE test webhook processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;