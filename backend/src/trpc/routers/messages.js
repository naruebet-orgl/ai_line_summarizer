/**
 * Messages tRPC Router
 * API endpoints for managing chat messages
 */

const { z } = require('zod');
const { router, loggedProcedure, adminProcedure } = require('../index');
const { Message, ChatSession, Room } = require('../../models');

const messagesRouter = router({
  // Get messages for a specific session
  getSessionMessages: loggedProcedure
    .input(z.object({
      sessionId: z.string(),
      limit: z.number().max(1000).default(100),
      skip: z.number().default(0)
    }))
    .query(async ({ input }) => {
      const { sessionId, limit, skip } = input;

      const messages = await Message.get_session_messages(sessionId, limit, skip);
      const total = await Message.countDocuments({ session_id: sessionId });

      return {
        messages: messages.map(msg => msg.get_message_data()),
        pagination: {
          limit,
          skip,
          total,
          hasMore: skip + messages.length < total
        }
      };
    }),

  // Get messages for a specific room (across all sessions)
  getRoomMessages: loggedProcedure
    .input(z.object({
      roomId: z.string(),
      limit: z.number().max(500).default(50),
      skip: z.number().default(0)
    }))
    .query(async ({ input }) => {
      const { roomId, limit, skip } = input;

      const messages = await Message.get_room_messages(roomId, limit, skip);
      const total = await Message.countDocuments({ room_id: roomId });

      return {
        messages: messages.map(msg => msg.get_message_data()),
        pagination: {
          limit,
          skip,
          total,
          hasMore: skip + messages.length < total
        }
      };
    }),

  // Get recent messages for a LINE room
  getRecentMessages: loggedProcedure
    .input(z.object({
      lineRoomId: z.string(),
      minutes: z.number().max(1440).default(60) // Max 24 hours
    }))
    .query(async ({ input }) => {
      const { lineRoomId, minutes } = input;

      const messages = await Message.get_recent_messages(lineRoomId, minutes);

      return {
        messages: messages.map(msg => msg.get_message_data()),
        timespan: {
          minutes,
          since: new Date(Date.now() - minutes * 60 * 1000)
        }
      };
    }),

  // Get messages by LINE user ID (1. User mapping)
  getUserMessages: loggedProcedure
    .input(z.object({
      lineUserId: z.string(),
      limit: z.number().max(200).default(50),
      skip: z.number().default(0)
    }))
    .query(async ({ input }) => {
      const { lineUserId, limit, skip } = input;

      const messages = await Message.get_user_messages(lineUserId, limit, skip);
      const total = await Message.countDocuments({ line_user_id: lineUserId });

      return {
        messages: messages.map(msg => ({
          ...msg.get_message_data(),
          session_info: msg.session_id,
          room_info: msg.room_id
        })),
        user_id: lineUserId,
        pagination: {
          limit,
          skip,
          total,
          hasMore: skip + messages.length < total
        }
      };
    }),

  // Get messages by LINE group ID (2. Group mapping)
  getGroupMessages: loggedProcedure
    .input(z.object({
      lineGroupId: z.string(),
      limit: z.number().max(300).default(100),
      skip: z.number().default(0)
    }))
    .query(async ({ input }) => {
      const { lineGroupId, limit, skip } = input;

      const messages = await Message.get_group_messages(lineGroupId, limit, skip);
      const total = await Message.countDocuments({ line_group_id: lineGroupId });

      return {
        messages: messages.map(msg => ({
          ...msg.get_message_data(),
          session_info: msg.session_id,
          room_info: msg.room_id
        })),
        group_id: lineGroupId,
        pagination: {
          limit,
          skip,
          total,
          hasMore: skip + messages.length < total
        }
      };
    }),

  // Get messages by LINE OA owner ID (3. Owner mapping)
  getOwnerMessages: loggedProcedure
    .input(z.object({
      lineOaOwnerId: z.string(),
      limit: z.number().max(300).default(100),
      skip: z.number().default(0)
    }))
    .query(async ({ input }) => {
      const { lineOaOwnerId, limit, skip } = input;

      const messages = await Message.get_owner_messages(lineOaOwnerId, limit, skip);
      const total = await Message.countDocuments({ line_oa_owner_id: lineOaOwnerId });

      return {
        messages: messages.map(msg => ({
          ...msg.get_message_data(),
          session_info: msg.session_id,
          room_info: msg.room_id
        })),
        owner_id: lineOaOwnerId,
        pagination: {
          limit,
          skip,
          total,
          hasMore: skip + messages.length < total
        }
      };
    }),

  // Get messages for specific user in specific group
  getUserInGroupMessages: loggedProcedure
    .input(z.object({
      lineUserId: z.string(),
      lineGroupId: z.string(),
      limit: z.number().max(200).default(50),
      skip: z.number().default(0)
    }))
    .query(async ({ input }) => {
      const { lineUserId, lineGroupId, limit, skip } = input;

      const messages = await Message.get_user_in_group_messages(lineUserId, lineGroupId, limit, skip);
      const total = await Message.countDocuments({
        line_user_id: lineUserId,
        line_group_id: lineGroupId
      });

      return {
        messages: messages.map(msg => msg.get_message_data()),
        user_id: lineUserId,
        group_id: lineGroupId,
        pagination: {
          limit,
          skip,
          total,
          hasMore: skip + messages.length < total
        }
      };
    }),

  // Get messages by sender role
  getMessagesByRole: loggedProcedure
    .input(z.object({
      senderRole: z.enum(['user', 'group_member', 'owner', 'bot', 'system']),
      roomType: z.enum(['individual', 'group']).optional(),
      limit: z.number().max(200).default(50)
    }))
    .query(async ({ input }) => {
      const { senderRole, roomType, limit } = input;

      const messages = await Message.get_messages_by_role(senderRole, roomType, limit);

      return {
        messages: messages.map(msg => ({
          ...msg.get_message_data(),
          session_info: msg.session_id,
          room_info: msg.room_id
        })),
        filter: {
          sender_role: senderRole,
          room_type: roomType
        }
      };
    }),

  // Search messages by content
  searchMessages: loggedProcedure
    .input(z.object({
      query: z.string().min(2),
      roomId: z.string().optional(),
      sessionId: z.string().optional(),
      messageType: z.enum(['text', 'image', 'sticker', 'audio', 'video', 'file', 'location']).optional(),
      direction: z.enum(['user', 'bot', 'system']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().max(100).default(20)
    }))
    .query(async ({ input }) => {
      const { query, roomId, sessionId, messageType, direction, startDate, endDate, limit } = input;

      // Build search filter
      const filter = {
        message: { $regex: query, $options: 'i' } // Case-insensitive search
      };

      if (roomId) filter.room_id = roomId;
      if (sessionId) filter.session_id = sessionId;
      if (messageType) filter.message_type = messageType;
      if (direction) filter.direction = direction;

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const messages = await Message.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('session_id', 'session_id status')
        .populate('room_id', 'name type');

      const total = await Message.countDocuments(filter);

      return {
        messages: messages.map(msg => ({
          ...msg.get_message_data(),
          session_info: msg.session_id,
          room_info: msg.room_id
        })),
        searchQuery: query,
        totalMatches: total,
        hasMore: messages.length >= limit
      };
    }),

  // Get message statistics
  getMessageStats: loggedProcedure
    .input(z.object({
      roomId: z.string().optional(),
      sessionId: z.string().optional(),
      days: z.number().max(365).default(30)
    }))
    .query(async ({ input }) => {
      const { roomId, sessionId, days } = input;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const filter = {
        timestamp: { $gte: startDate }
      };

      if (roomId) filter.room_id = roomId;
      if (sessionId) filter.session_id = sessionId;

      const stats = await Message.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            userMessages: { $sum: { $cond: [{ $eq: ['$direction', 'user'] }, 1, 0] } },
            botMessages: { $sum: { $cond: [{ $eq: ['$direction', 'bot'] }, 1, 0] } },
            systemMessages: { $sum: { $cond: [{ $eq: ['$direction', 'system'] }, 1, 0] } },
            avgMessageLength: { $avg: '$message_size' },
            firstMessage: { $min: '$timestamp' },
            lastMessage: { $max: '$timestamp' }
          }
        }
      ]);

      const messageTypes = await Message.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$message_type',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const dailyActivity = await Message.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            messageCount: { $sum: 1 },
            userCount: { $sum: { $cond: [{ $eq: ['$direction', 'user'] }, 1, 0] } },
            botCount: { $sum: { $cond: [{ $eq: ['$direction', 'bot'] }, 1, 0] } }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      return {
        summary: stats[0] || {
          totalMessages: 0,
          userMessages: 0,
          botMessages: 0,
          systemMessages: 0,
          avgMessageLength: 0,
          firstMessage: null,
          lastMessage: null
        },
        messageTypes: messageTypes.reduce((acc, type) => {
          acc[type._id] = type.count;
          return acc;
        }, {}),
        dailyActivity: dailyActivity.map(day => ({
          date: day._id.date,
          total: day.messageCount,
          user: day.userCount,
          bot: day.botCount
        })),
        timespan: {
          days,
          startDate
        }
      };
    }),

  // Get single message by ID
  getMessage: loggedProcedure
    .input(z.object({
      messageId: z.string()
    }))
    .query(async ({ input }) => {
      const message = await Message.findById(input.messageId)
        .populate('session_id', 'session_id status start_time end_time')
        .populate('room_id', 'name type line_room_id')
        .populate('owner_id', 'display_name line_user_id');

      if (!message) {
        throw new Error('Message not found');
      }

      return {
        ...message.get_message_data(),
        session_info: message.session_id,
        room_info: message.room_id,
        owner_info: message.owner_id
      };
    }),

  // Export messages (admin only)
  exportMessages: adminProcedure
    .input(z.object({
      sessionId: z.string().optional(),
      roomId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(['json', 'csv', 'txt']).default('json'),
      includeMetadata: z.boolean().default(true)
    }))
    .query(async ({ input }) => {
      const { sessionId, roomId, startDate, endDate, format, includeMetadata } = input;

      // Build filter
      const filter = {};
      if (sessionId) filter.session_id = sessionId;
      if (roomId) filter.room_id = roomId;

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const messages = await Message.find(filter)
        .sort({ timestamp: 1 })
        .populate('session_id', 'session_id')
        .populate('room_id', 'name type');

      const exportData = messages.map(msg => {
        const data = {
          timestamp: msg.timestamp.toISOString(),
          direction: msg.direction,
          message_type: msg.message_type,
          message: msg.message,
          user_name: msg.user_name
        };

        if (includeMetadata) {
          data.session_id = msg.session_id?.session_id;
          data.room_name = msg.room_id?.name;
          data.line_message_id = msg.line_message_id;
        }

        return data;
      });

      return {
        data: exportData,
        format,
        count: exportData.length,
        exported_at: new Date().toISOString(),
        filters: { sessionId, roomId, startDate, endDate }
      };
    })
});

module.exports = messagesRouter;