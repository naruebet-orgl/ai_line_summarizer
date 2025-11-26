/**
 * Session Manager Service
 * Handles automatic session creation, closure, and management
 */

const { ChatSession, Room, Owner, Message } = require('../models');
const { nanoid } = require('nanoid');
const config = require('../config');

class SessionManager {
  constructor() {
    // Use centralized configuration (Single Source of Truth)
    this.maxMessagesPerSession = config.session.maxMessagesPerSession;
    this.sessionTimeoutHours = config.session.sessionTimeoutHours;
    this.minMessagesForSummary = config.session.minMessagesForSummary;

    console.log(`📋 SessionManager initialized with config:`, {
      maxMessagesPerSession: this.maxMessagesPerSession,
      sessionTimeoutHours: this.sessionTimeoutHours,
      minMessagesForSummary: this.minMessagesForSummary
    });
  }

  /**
   * Get or create an active session for a room
   * @param {string} lineRoomId - LINE room identifier
   * @param {ObjectId} roomId - MongoDB room ID
   * @param {ObjectId} ownerId - MongoDB owner ID
   * @returns {Promise<ChatSession>} Active session
   */
  async getOrCreateActiveSession(lineRoomId, roomId, ownerId) {
    console.log(`🔍 Getting or creating active session for room: ${lineRoomId}`);

    // Check for existing active session
    let activeSession = await ChatSession.findOne({
      line_room_id: lineRoomId,
      status: 'active'
    });

    if (activeSession) {
      // Check if session has expired (24 hours)
      const sessionAge = Date.now() - new Date(activeSession.start_time).getTime();
      const maxAge = this.sessionTimeoutHours * 60 * 60 * 1000; // 24 hours in ms

      if (sessionAge > maxAge) {
        console.log(`⏰ Session ${activeSession._id} expired after ${this.sessionTimeoutHours} hours, closing`);
        await this.closeSession(activeSession._id, 'timeout');
        activeSession = null;
      } else {
        // Check message count
        const messageCount = await Message.countDocuments({ session_id: activeSession._id });
        if (messageCount >= this.maxMessagesPerSession) {
          console.log(`📊 Session ${activeSession._id} reached ${this.maxMessagesPerSession} messages, closing`);
          await this.closeSession(activeSession._id, 'message_limit');
          activeSession = null;
        }
      }
    }

    // Create new session if needed
    if (!activeSession) {
      activeSession = await this.createNewSession(lineRoomId, roomId, ownerId);
    }

    return activeSession;
  }

  /**
   * Create a new chat session
   * @param {string} lineRoomId - LINE room identifier
   * @param {ObjectId} roomId - MongoDB room ID
   * @param {ObjectId} ownerId - MongoDB owner ID
   * @returns {Promise<ChatSession>} New session
   */
  async createNewSession(lineRoomId, roomId, ownerId) {
    console.log(`✨ Creating new session for room: ${lineRoomId}`);

    // Get room details
    const room = await Room.findById(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    // Generate session ID
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sessionId = `sess_${today}_${nanoid(8)}`;

    // Create session
    const session = new ChatSession({
      _id: sessionId,
      session_id: sessionId,
      room_id: roomId,
      owner_id: ownerId,
      line_room_id: lineRoomId,
      room_name: room.name,
      room_type: room.type,
      status: 'active',
      start_time: new Date(),
      message_logs: [] // Keep empty array, messages stored separately
    });

    await session.save();
    console.log(`✅ Created new session: ${sessionId}`);

    return session;
  }

  /**
   * Add message to session and separate message collection
   * @param {string} sessionId - Session identifier
   * @param {Object} messageData - Message data
   * @returns {Promise<{session: ChatSession, message: Message}>}
   */
  async addMessage(sessionId, messageData) {
    console.log(`💬 Adding message to session: ${sessionId}`);

    // Get session
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot add message to ${session.status} session: ${sessionId}`);
    }

    // Create message in separate collection with enhanced mapping
    const message = await Message.create_message({
      session_id: sessionId,
      room_id: session.room_id,
      owner_id: session.owner_id,
      line_room_id: session.line_room_id,

      // Enhanced user/group/owner mapping
      line_user_id: messageData.line_user_id,
      user_name: messageData.user_name,
      user_profile_url: messageData.user_profile_url,
      line_group_id: session.room_type === 'group' ? session.line_room_id : null,
      group_name: session.room_type === 'group' ? session.room_name : null,
      line_oa_owner_id: session.owner_id,
      room_type: session.room_type,
      sender_role: this.determineSenderRole(messageData.direction, session.room_type),

      // Message content
      timestamp: messageData.timestamp || new Date(),
      direction: messageData.direction,
      message_type: messageData.message_type,
      message: messageData.message,
      line_message_id: messageData.line_message_id,
      image_grid_fs_id: messageData.image_grid_fs_id,
      file_url: messageData.file_url,
      file_name: messageData.file_name,
      latitude: messageData.latitude,
      longitude: messageData.longitude
    });

    // Update session metadata (NO message_logs array)
    const messageCount = await Message.countDocuments({ session_id: sessionId });
    session.updated_at = new Date();

    // Update room statistics
    await this.updateRoomStatistics(session.room_id, 'total_messages');

    await session.save();

    // Check if session should be closed due to message count or time
    if (messageCount >= this.maxMessagesPerSession) {
      console.log(`📊 Session ${sessionId} reached ${this.maxMessagesPerSession} messages, auto-closing`);
      await this.closeSession(sessionId, 'message_limit');
    } else {
      // Check session age
      const sessionAge = Date.now() - new Date(session.start_time).getTime();
      const maxAge = this.sessionTimeoutHours * 60 * 60 * 1000;

      if (sessionAge > maxAge) {
        console.log(`⏰ Session ${sessionId} expired after ${this.sessionTimeoutHours} hours, auto-closing`);
        await this.closeSession(sessionId, 'timeout');
      }
    }

    return { session, message, messageCount };
  }

  /**
   * Determine sender role based on message direction and room type
   */
  determineSenderRole(direction, roomType) {
    if (direction === 'bot') return 'bot';
    if (direction === 'system') return 'system';
    if (direction === 'user') {
      return roomType === 'group' ? 'group_member' : 'user';
    }
    return 'user';
  }

  /**
   * Update room statistics
   */
  async updateRoomStatistics(roomId, field, amount = 1) {
    const { Room } = require('../models');
    const room = await Room.findById(roomId);
    if (room) {
      await room.increment_statistics(field, amount);
    }
  }

  /**
   * Close a session and optionally generate summary
   * @param {string} sessionId - Session identifier
   * @param {string} reason - Reason for closure
   * @param {boolean} generateSummary - Whether to generate AI summary
   * @returns {Promise<ChatSession>}
   */
  async closeSession(sessionId, reason = 'manual', generateSummary = true) {
    console.log(`📋 Closing session ${sessionId} - Reason: ${reason}`);

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update session status
    session.status = generateSummary ? 'summarizing' : 'closed';
    session.end_time = new Date();
    session.updated_at = new Date();

    await session.save();

    // Generate summary if requested and session has enough messages
    if (generateSummary) {
      const messageCount = await Message.countDocuments({ session_id: session.session_id });
      if (messageCount >= this.minMessagesForSummary) {
        console.log(`🤖 Triggering summary generation for session: ${sessionId}`);

        try {
          // Create summary record
          const { Summary } = require('../models');
          const summary = await Summary.create_summary(
            sessionId,
            session.room_id,
            session.owner_id
          );

          // Generate AI summary using GeminiService
          const geminiService = require('./gemini_service');
          await geminiService.generate_chat_summary(session, summary);

          // Session is closed in the summary generation process
          console.log(`✅ Summary generated and session closed: ${sessionId}`);
        } catch (error) {
          console.error(`❌ Failed to generate summary for session ${sessionId}:`, error);
          // Still close the session even if summary fails
          session.status = 'closed';
          await session.save();
        }
      } else {
        // Not enough messages, just close
        session.status = 'closed';
        await session.save();
      }
    }

    return session;
  }

  /**
   * Get session messages from Message collection
   * @param {string} sessionId - Session identifier
   * @param {number} limit - Message limit
   * @param {number} skip - Messages to skip
   * @returns {Promise<Message[]>}
   */
  async getSessionMessages(sessionId, limit = 100, skip = 0) {
    return await Message.get_session_messages(sessionId, limit, skip);
  }

  /**
   * Get room message history across all sessions
   * @param {ObjectId} roomId - Room identifier
   * @param {number} limit - Message limit
   * @param {number} skip - Messages to skip
   * @returns {Promise<Message[]>}
   */
  async getRoomMessages(roomId, limit = 50, skip = 0) {
    return await Message.get_room_messages(roomId, limit, skip);
  }

  /**
   * Get recent activity for a LINE room
   * @param {string} lineRoomId - LINE room identifier
   * @param {number} minutes - Minutes of recent activity
   * @returns {Promise<Message[]>}
   */
  async getRecentActivity(lineRoomId, minutes = 60) {
    return await Message.get_recent_messages(lineRoomId, minutes);
  }

  /**
   * Get active sessions that should be automatically closed
   * @returns {Promise<ChatSession[]>}
   */
  async getExpiredSessions() {
    const cutoffTime = new Date(Date.now() - this.sessionTimeoutHours * 60 * 60 * 1000);

    return await ChatSession.find({
      status: 'active',
      start_time: { $lt: cutoffTime }
    });
  }

  /**
   * Auto-close expired sessions (run as scheduled job)
   * @returns {Promise<number>} Number of sessions closed
   */
  async autoCloseExpiredSessions() {
    console.log(`🔍 Checking for expired sessions...`);

    const expiredSessions = await this.getExpiredSessions();
    let closedCount = 0;

    for (const session of expiredSessions) {
      try {
        await this.closeSession(session._id, 'auto_timeout');
        closedCount++;
      } catch (error) {
        console.error(`❌ Failed to auto-close session ${session._id}:`, error);
      }
    }

    if (closedCount > 0) {
      console.log(`✅ Auto-closed ${closedCount} expired sessions`);
    }

    return closedCount;
  }

  /**
   * Get session statistics
   * @param {ObjectId} roomId - Optional room filter
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStatistics(roomId = null) {
    const matchFilter = roomId ? { room_id: roomId } : {};

    const stats = await ChatSession.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: {
            $avg: {
              $cond: {
                if: { $ne: ['$end_time', null] },
                then: { $subtract: ['$end_time', '$start_time'] },
                else: null
              }
            }
          }
        }
      }
    ]);

    // Get message statistics
    const messageStats = await Message.aggregate([
      ...(roomId ? [{ $match: { room_id: roomId } }] : []),
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          avgMessagesPerSession: { $avg: '$session_message_count' }
        }
      }
    ]);

    return {
      sessions: stats,
      messages: messageStats[0] || { totalMessages: 0, avgMessagesPerSession: 0 }
    };
  }
}

module.exports = SessionManager;