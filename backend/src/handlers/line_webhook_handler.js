/**
 * Chat Webhook Handler
 * Processes incoming LINE webhook events for chat summarization
 * LINE Webhook Handler for chat summarizer system
 */

const lineService = require('../services/line_service');
const geminiService = require('../services/gemini_service');
const { Owner, Room, ChatSession, Summary, LineEventsRaw, Message } = require('../models');

class LineWebhookHandler {
  constructor() {
    this.activeSessionTimeouts = new Map(); // sessionId -> timeout
    console.log('🎯 LineWebhookHandler initialized for chat summarization');
  }

  /**
   * Processes LINE webhook events
   * @param {Array} events - Array of LINE webhook events
   * @returns {Promise<void>}
   */
  async handle_webhook_events(events) {
    console.log(`📨 Processing ${events.length} LINE webhook event(s) for chat summarization`);

    try {
      const promises = events.map(event => this.handle_single_event(event));
      await Promise.all(promises);
      console.log('✅ All LINE webhook events processed successfully');
    } catch (error) {
      console.error('❌ Error processing LINE webhook events:', error);
      throw error;
    }
  }

  /**
   * Handles a single LINE webhook event
   * @param {Object} event - LINE webhook event
   * @returns {Promise<void>}
   */
  async handle_single_event(event) {
    console.log(`🔄 Processing event type: ${event.type}`);

    try {
      // Save raw event to database for audit
      await this.save_raw_event(event);
    } catch (rawEventError) {
      console.error(`❌ RAW EVENT SAVE FAILED:`, rawEventError);
    }

    try {
      switch (event.type) {
        case 'message':
          await this.handle_message_event(event);
          break;

        case 'follow':
          await this.handle_follow_event(event);
          break;

        case 'unfollow':
          await this.handle_unfollow_event(event);
          break;

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handles incoming message events for chat capture
   * @param {Object} event - LINE message event
   * @returns {Promise<void>}
   */
  async handle_message_event(event) {
    const { source, message, timestamp } = event;
    const lineRoomId = source.groupId || source.roomId || source.userId;
    const userId = source.userId;

    console.log(`💬 Message from room ${lineRoomId}, user ${userId}: ${message.text || 'Non-text message'}`);

    try {
      // Get or create default owner (bypass owner requirement)
      const owner = await this.get_or_create_default_owner();
      console.log(`✅ Using owner: ${owner.name} (${owner.email})`);

      // Determine room name and type with actual group chat name
      let roomName, roomType;
      if (source.groupId) {
        roomName = await this.get_group_chat_name(source.groupId) || `Group Chat (${source.groupId.substring(0, 8)})`;
        roomType = 'group';
      } else if (source.roomId) {
        roomName = await this.get_room_chat_name(source.roomId) || `Multi-User Chat (${source.roomId.substring(0, 8)})`;
        roomType = 'group';
      } else {
        roomName = await this.get_user_display_name(userId) || `Direct Message (${userId.substring(0, 8)})`;
        roomType = 'individual';
      }

      // Get or create room
      const room = await Room.find_or_create_room(
        owner._id,
        lineRoomId,
        roomName,
        roomType
      );

      // Get or create active session
      let session = await ChatSession.find_active_session(room._id);

      if (!session) {
        session = await ChatSession.create_new_session(
          room._id,
          owner._id,
          lineRoomId,
          roomName,
          roomType
        );
      }

      // Process different message types
      if (message.type === 'text') {
        await this.process_text_message(session, userId, message.text, message.id, timestamp);
      } else if (message.type === 'image') {
        await this.process_image_message(session, userId, message, timestamp);
      } else {
        await this.process_other_message(session, userId, message, timestamp);
      }

      // Check if session should be closed (50 messages or 24 hours)
      const shouldClose = await this.should_close_session(session);
      if (shouldClose) {
        await this.close_and_summarize_session(session, owner);
      }

      // Update room statistics
      await room.increment_statistics('total_messages');

    } catch (error) {
      console.error('❌ Error handling message event:', error);
    }
  }

  /**
   * Process text message and add to session
   */
  async process_text_message(session, userId, text, lineMessageId, timestamp) {
    console.log(`📝 Processing text message: "${text.substring(0, 50)}..."`);

    // Add to embedded message_logs for backward compatibility
    await session.add_message_log(
      'user',
      'text',
      text,
      lineMessageId
    );

    // Also create separate Message document for AI processing
    await Message.create_message({
      session_id: session.session_id, // Use session_id field, not _id
      room_id: session.room_id,
      owner_id: session.owner_id,
      line_room_id: session.line_room_id,
      timestamp: new Date(timestamp),
      direction: 'user',
      message_type: 'text',
      message: text,
      line_message_id: lineMessageId,
      line_user_id: userId,
      room_type: session.room_type,
      sender_role: session.room_type === 'group' ? 'group_member' : 'user'
    });

    console.log(`✅ Text message added to session ${session._id} and Message collection`);
  }

  /**
   * Process image message and add to session
   */
  async process_image_message(session, userId, message, timestamp) {
    console.log(`🖼️ Processing image message`);

    // Download and save image to GridFS
    const LineService = require('../services/line_service');
    let imageGridFSId = null;

    try {
      imageGridFSId = await LineService.download_and_save_image(message.id);
      if (imageGridFSId) {
        console.log(`✅ Image downloaded and saved with GridFS ID: ${imageGridFSId}`);
      }
    } catch (error) {
      console.error('❌ Failed to download image:', error);
    }

    // Create message text based on whether image was saved
    const messageText = imageGridFSId ?
      `Image uploaded (saved: ${imageGridFSId.substring(0, 8)}...)` :
      'Image uploaded (download failed)';

    // Add to embedded message_logs for backward compatibility
    await session.add_message_log(
      'user',
      'image',
      messageText,
      message.id,
      imageGridFSId
    );

    // Also create separate Message document for AI processing
    await Message.create_message({
      session_id: session.session_id,
      room_id: session.room_id,
      owner_id: session.owner_id,
      line_room_id: session.line_room_id,
      timestamp: new Date(timestamp),
      direction: 'user',
      message_type: 'image',
      message: messageText,
      line_message_id: message.id,
      line_user_id: userId,
      room_type: session.room_type,
      sender_role: session.room_type === 'group' ? 'group_member' : 'user',
      image_grid_fs_id: imageGridFSId
    });

    console.log(`✅ Image message added to session ${session._id} and Message collection`);
  }

  /**
   * Process other message types
   */
  async process_other_message(session, userId, message, timestamp) {
    console.log(`📎 Processing ${message.type} message`);

    // Add to embedded message_logs for backward compatibility
    await session.add_message_log(
      'user',
      message.type,
      `${message.type} message`,
      message.id
    );

    // Also create separate Message document for AI processing
    await Message.create_message({
      session_id: session.session_id,
      room_id: session.room_id,
      owner_id: session.owner_id,
      line_room_id: session.line_room_id,
      timestamp: new Date(timestamp),
      direction: 'user',
      message_type: message.type,
      message: `${message.type} message`,
      line_message_id: message.id,
      line_user_id: userId,
      room_type: session.room_type,
      sender_role: session.room_type === 'group' ? 'group_member' : 'user'
    });

    console.log(`✅ ${message.type} message added to session ${session._id} and Message collection`);
  }

  /**
   * Check if session should be closed
   */
  async should_close_session(session) {
    const messageCount = session.message_logs.length;
    const sessionAge = Date.now() - session.start_time.getTime();
    const hourLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (messageCount >= 50) {
      console.log(`📊 Session ${session._id} reached message limit (${messageCount}/50)`);
      return true;
    }

    if (sessionAge >= hourLimit) {
      console.log(`⏰ Session ${session._id} reached time limit (${Math.round(sessionAge / (60 * 60 * 1000))} hours)`);
      return true;
    }

    return false;
  }

  /**
   * Close session and generate AI summary
   */
  async close_and_summarize_session(session, owner) {
    console.log(`🔒 Closing session ${session._id} and generating summary`);

    try {
      // Mark session as summarizing
      await session.set_summarizing();

      // Create summary record
      const summary = await Summary.create_summary(
        session._id,
        session.room_id,
        owner._id
      );

      // Generate AI summary
      await geminiService.generate_chat_summary(session, summary);

      // Update owner usage statistics
      await owner.increment_usage('total_sessions');
      await owner.increment_usage('total_summaries');

      console.log(`✅ Session ${session._id} closed and summarized`);

    } catch (error) {
      console.error(`❌ Error closing/summarizing session ${session._id}:`, error);

      // Still close the session even if summarization fails
      await session.close_session();
    }
  }

  /**
   * Handle follow events (user follows the LINE OA)
   */
  async handle_follow_event(event) {
    const userId = event.source.userId;
    console.log(`👋 User ${userId} followed the LINE OA`);

    // Could send welcome message here
    // await lineService.reply_message(event.replyToken, 'Welcome! Your chats will be summarized automatically.');
  }

  /**
   * Handle unfollow events (user unfollows the LINE OA)
   */
  async handle_unfollow_event(event) {
    const userId = event.source.userId;
    console.log(`👋 User ${userId} unfollowed the LINE OA`);

    // Could clean up user data or mark as inactive
  }

  /**
   * Get or create default owner to bypass owner requirement
   */
  async get_or_create_default_owner() {
    try {
      const channelId = process.env.LINE_CHANNEL_ID;
      let owner = await Owner.find_by_channel_id(channelId);

      if (!owner) {
        console.log(`🔧 Creating default owner for LINE Channel ID ${channelId}`);
        owner = await Owner.create({
          email: `auto-${channelId}@line-bot.local`,
          name: `Auto LINE Bot (${channelId})`,
          line_channel_id: channelId,
          line_channel_secret: process.env.LINE_CHANNEL_SECRET,
          line_access_token: process.env.LINE_CHANNEL_ACCESS_TOKEN,
          plan: 'free'
        });
        console.log(`✅ Created default owner: ${owner.name}`);
      }

      return owner;
    } catch (error) {
      console.error('❌ Error getting/creating default owner:', error);
      throw error;
    }
  }

  /**
   * Get real group chat name from LINE API
   */
  async get_group_chat_name(groupId) {
    try {
      console.log(`🏷️ Fetching group name for ${groupId}`);

      const response = await lineService.get_group_summary(groupId);
      const groupName = response?.groupName || null;

      if (groupName) {
        console.log(`✅ Found group name: "${groupName}"`);
        return groupName;
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Could not fetch group name for ${groupId}:`, error.message);
      return null;
    }
  }

  /**
   * Get room chat name from LINE API
   */
  async get_room_chat_name(roomId) {
    try {
      console.log(`🏷️ Fetching room info for ${roomId}`);
      // LINE API doesn't provide room names for multi-user chats
      return `Multi-User Chat`;
    } catch (error) {
      console.log(`⚠️ Could not fetch room name for ${roomId}:`, error.message);
      return null;
    }
  }

  /**
   * Get user display name from LINE API
   */
  async get_user_display_name(userId) {
    try {
      console.log(`👤 Fetching user profile for ${userId}`);

      const profile = await lineService.get_user_profile(userId);
      const displayName = profile?.displayName || null;

      if (displayName) {
        console.log(`✅ Found user name: "${displayName}"`);
        return `DM with ${displayName}`;
      }

      return null;
    } catch (error) {
      console.log(`⚠️ Could not fetch user profile for ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Save raw LINE event for audit purposes
   */
  async save_raw_event(event) {
    try {
      const eventId = event.webhookEventId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userId = event.source?.userId || null;

      await LineEventsRaw.create({
        _id: eventId,
        user_id: userId,
        event_type: event.type,
        payload: event,
        received_at: new Date()
      });
    } catch (error) {
      console.error('❌ Failed to save raw event:', error);
    }
  }
}

module.exports = LineWebhookHandler;