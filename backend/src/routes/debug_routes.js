/**
 * Debug Routes
 * Diagnostic endpoints for troubleshooting production issues
 */

const express = require('express');
const { ChatSession, Room, Owner, Message } = require('../models');

const router = express.Router();

/**
 * Debug: Get database statistics
 * GET /api/debug/stats
 */
router.get('/stats', async (req, res) => {
  console.log('🔍 Debug: Getting database statistics');

  try {
    const stats = {
      timestamp: new Date().toISOString(),
      collections: {}
    };

    // Count documents in each collection
    stats.collections.owners = await Owner.countDocuments();
    stats.collections.rooms = await Room.countDocuments();
    stats.collections.sessions = await ChatSession.countDocuments();
    stats.collections.messages = await Message.countDocuments();

    // Get session breakdown by status
    const sessionsByStatus = await ChatSession.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    stats.sessions_by_status = sessionsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get room breakdown by type
    const roomsByType = await Room.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    stats.rooms_by_type = roomsByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get recent sessions (last 10)
    const recentSessions = await ChatSession.find()
      .sort({ start_time: -1 })
      .limit(10)
      .select('session_id room_name room_type status start_time message_logs')
      .lean();

    stats.recent_sessions = recentSessions.map(session => ({
      session_id: session.session_id,
      room_name: session.room_name,
      room_type: session.room_type,
      status: session.status,
      start_time: session.start_time,
      message_count: session.message_logs?.length || 0
    }));

    // Get owner info
    const owners = await Owner.find().select('name email line_channel_id').lean();
    stats.owners = owners;

    console.log('✅ Debug stats retrieved successfully');
    res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Debug stats error:', error);
    res.status(500).json({
      error: 'Failed to get debug stats',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Get specific session details
 * GET /api/debug/session/:sessionId
 */
router.get('/session/:sessionId', async (req, res) => {
  console.log(`🔍 Debug: Getting session ${req.params.sessionId}`);

  try {
    const session = await ChatSession.findOne({ session_id: req.params.sessionId })
      .populate('room_id')
      .populate('owner_id')
      .populate('summary_id')
      .lean();

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        session_id: req.params.sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // Get messages from Message collection
    const messages = await Message.find({ session_id: session.session_id })
      .sort({ timestamp: 1 })
      .limit(20)
      .lean();

    res.status(200).json({
      session,
      message_collection_count: messages.length,
      embedded_message_count: session.message_logs?.length || 0,
      recent_messages: messages.slice(0, 5)
    });

  } catch (error) {
    console.error('❌ Debug session error:', error);
    res.status(500).json({
      error: 'Failed to get session details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Get all rooms
 * GET /api/debug/rooms
 */
router.get('/rooms', async (req, res) => {
  console.log('🔍 Debug: Getting all rooms');

  try {
    const rooms = await Room.find()
      .populate('owner_id', 'name email')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      count: rooms.length,
      rooms: rooms.map(room => ({
        _id: room._id,
        name: room.name,
        type: room.type,
        line_room_id: room.line_room_id,
        owner: room.owner_id,
        created_at: room.created_at
      }))
    });

  } catch (error) {
    console.error('❌ Debug rooms error:', error);
    res.status(500).json({
      error: 'Failed to get rooms',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Test database connection
 * GET /api/debug/connection
 */
router.get('/connection', async (req, res) => {
  console.log('🔍 Debug: Testing database connection');

  try {
    const mongoose = require('mongoose');

    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const dbInfo = {
      state: stateMap[connectionState],
      state_code: connectionState,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      timestamp: new Date().toISOString()
    };

    if (connectionState === 1) {
      // Try a simple query
      const testCount = await Owner.countDocuments();
      dbInfo.test_query_success = true;
      dbInfo.owner_count = testCount;
    } else {
      dbInfo.test_query_success = false;
    }

    res.status(200).json(dbInfo);

  } catch (error) {
    console.error('❌ Debug connection error:', error);
    res.status(500).json({
      error: 'Failed to check connection',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Get raw LINE events
 * GET /api/debug/raw-events
 */
router.get('/raw-events', async (req, res) => {
  console.log('🔍 Debug: Getting raw LINE events');

  try {
    const { LineEventsRaw } = require('../models');
    const limit = parseInt(req.query.limit) || 10;

    const rawEvents = await LineEventsRaw.find()
      .sort({ received_at: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      count: rawEvents.length,
      events: rawEvents.map(event => ({
        _id: event._id,
        event_type: event.event_type,
        user_id: event.user_id,
        received_at: event.received_at,
        payload: event.payload
      }))
    });

  } catch (error) {
    console.error('❌ Debug raw events error:', error);
    res.status(500).json({
      error: 'Failed to get raw events',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Check environment configuration
 * GET /api/debug/config
 */
router.get('/config', async (req, res) => {
  console.log('🔍 Debug: Checking environment configuration');

  try {
    const config = require('../config');

    res.status(200).json({
      environment: config.app.nodeEnv,
      line: {
        channel_id_configured: !!process.env.LINE_CHANNEL_ID,
        channel_id_value: process.env.LINE_CHANNEL_ID,
        channel_secret_configured: !!process.env.LINE_CHANNEL_SECRET,
        access_token_configured: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
      },
      mongodb: {
        uri_configured: !!config.mongodb.uri,
        db_name: config.mongodb.dbName
      },
      gemini: {
        api_key_configured: !!config.gemini.apiKey
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debug config error:', error);
    res.status(500).json({
      error: 'Failed to get config',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Clean up raw_events collection to free space
 * DELETE /api/debug/cleanup-raw-events
 */
router.delete('/cleanup-raw-events', async (req, res) => {
  console.log('🧹 Debug: Cleaning up raw_events collection');

  try {
    const { LineEventsRaw } = require('../models');

    // Count before deletion
    const countBefore = await LineEventsRaw.countDocuments();
    console.log(`📊 Raw events count before cleanup: ${countBefore}`);

    // Delete all raw events
    const result = await LineEventsRaw.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} raw events`);

    res.status(200).json({
      success: true,
      message: 'Raw events collection cleaned up',
      deleted_count: result.deletedCount,
      count_before: countBefore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Test database write operation
 * POST /api/debug/write-test
 */
router.post('/write-test', async (req, res) => {
  console.log('🔧 Debug: Testing database write operation');

  try {
    const mongoose = require('mongoose');
    const { LineEventsRaw } = require('../models');

    // Try to write a test document
    const testDoc = {
      _id: `test-write-${Date.now()}`,
      user_id: 'debug-test-user',
      event_type: 'debug_write_test',
      payload: {
        test: true,
        timestamp: new Date().toISOString(),
        purpose: 'MongoDB write test'
      },
      received_at: new Date()
    };

    console.log('📝 Attempting to write test document:', testDoc._id);

    const result = await LineEventsRaw.create(testDoc);

    console.log('✅ Write test successful:', result._id);

    // Clean up - delete the test document
    await LineEventsRaw.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');

    res.status(200).json({
      success: true,
      message: 'Database write test PASSED',
      test_id: testDoc._id,
      write_successful: true,
      cleanup_successful: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debug write test FAILED:', error);
    res.status(500).json({
      success: false,
      message: 'Database write test FAILED',
      error: error.message,
      error_code: error.code,
      error_name: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Debug: Fix legacy owner index
 * POST /api/debug/fix-owner-index
 */
router.post('/fix-owner-index', async (req, res) => {
  console.log('🔧 Debug: Fixing legacy owner index');

  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ownersCollection = db.collection('owners');

    // List current indexes
    const indexes = await ownersCollection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    const results = {
      before: indexes.map(i => ({ name: i.name, key: i.key })),
      dropped: [],
      errors: []
    };

    // Drop legacy indexes
    const legacyIndexes = ['line_official_account_id_1', 'is_active_1'];

    for (const indexName of legacyIndexes) {
      if (indexes.some(idx => idx.name === indexName)) {
        try {
          await ownersCollection.dropIndex(indexName);
          results.dropped.push(indexName);
          console.log(`✅ Dropped index: ${indexName}`);
        } catch (error) {
          results.errors.push({ index: indexName, error: error.message });
          console.error(`❌ Failed to drop ${indexName}:`, error.message);
        }
      }
    }

    // List remaining indexes
    const remainingIndexes = await ownersCollection.indexes();
    results.after = remainingIndexes.map(i => ({ name: i.name, key: i.key }));

    res.status(200).json({
      success: true,
      message: 'Legacy indexes processed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debug fix-owner-index error:', error);
    res.status(500).json({
      error: 'Failed to fix owner index',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
