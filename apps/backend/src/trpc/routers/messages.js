/**
 * Messages tRPC Router
 * @description API endpoints for managing chat messages with organization-scoped permissions
 * @module trpc/routers/messages
 */

const { z } = require('zod');
const { TRPCError } = require('@trpc/server');
const { router, withPermission } = require('../index');
const { Message, ChatSession, Room, AuditLog } = require('../../models');

/**
 * Messages Router
 * All endpoints require organization context and appropriate permissions
 */
const messagesRouter = router({
  /**
   * Get messages for a specific session
   * @permission org:messages:list
   */
  getSessionMessages: withPermission('org:messages:list')
    .input(z.object({
      sessionId: z.string(),
      limit: z.number().max(1000).default(100),
      skip: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { sessionId, limit, skip } = input;

      console.log(`🔍 Messages.getSessionMessages called by ${ctx.user?.email} for session ${sessionId}`);

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

  /**
   * Get messages for a specific room (across all sessions)
   * @permission org:messages:list
   */
  getRoomMessages: withPermission('org:messages:list')
    .input(z.object({
      roomId: z.string(),
      limit: z.number().max(500).default(50),
      skip: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { roomId, limit, skip } = input;

      console.log(`🔍 Messages.getRoomMessages called by ${ctx.user?.email} for room ${roomId}`);

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

  /**
   * Get recent messages for a LINE room
   * @permission org:messages:list
   */
  getRecentMessages: withPermission('org:messages:list')
    .input(z.object({
      lineRoomId: z.string(),
      minutes: z.number().max(1440).default(60)
    }))
    .query(async ({ ctx, input }) => {
      const { lineRoomId, minutes } = input;

      console.log(`🔍 Messages.getRecentMessages called by ${ctx.user?.email} for ${lineRoomId}`);

      const messages = await Message.get_recent_messages(lineRoomId, minutes);

      return {
        messages: messages.map(msg => msg.get_message_data()),
        timespan: {
          minutes,
          since: new Date(Date.now() - minutes * 60 * 1000)
        }
      };
    }),

  /**
   * Get messages by LINE user ID
   * @permission org:messages:list
   */
  getUserMessages: withPermission('org:messages:list')
    .input(z.object({
      lineUserId: z.string(),
      limit: z.number().max(200).default(50),
      skip: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { lineUserId, limit, skip } = input;

      console.log(`🔍 Messages.getUserMessages called by ${ctx.user?.email} for user ${lineUserId}`);

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

  /**
   * Get messages by LINE group ID
   * @permission org:messages:list
   */
  getGroupMessages: withPermission('org:messages:list')
    .input(z.object({
      lineGroupId: z.string(),
      limit: z.number().max(300).default(100),
      skip: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { lineGroupId, limit, skip } = input;

      console.log(`🔍 Messages.getGroupMessages called by ${ctx.user?.email} for group ${lineGroupId}`);

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

  /**
   * Get messages by LINE OA owner ID
   * @permission org:messages:list
   */
  getOwnerMessages: withPermission('org:messages:list')
    .input(z.object({
      lineOaOwnerId: z.string(),
      limit: z.number().max(300).default(100),
      skip: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { lineOaOwnerId, limit, skip } = input;

      console.log(`🔍 Messages.getOwnerMessages called by ${ctx.user?.email} for owner ${lineOaOwnerId}`);

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

  /**
   * Get messages for specific user in specific group
   * @permission org:messages:list
   */
  getUserInGroupMessages: withPermission('org:messages:list')
    .input(z.object({
      lineUserId: z.string(),
      lineGroupId: z.string(),
      limit: z.number().max(200).default(50),
      skip: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { lineUserId, lineGroupId, limit, skip } = input;

      console.log(`🔍 Messages.getUserInGroupMessages called by ${ctx.user?.email}`);

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

  /**
   * Get messages by sender role
   * @permission org:messages:list
   */
  getMessagesByRole: withPermission('org:messages:list')
    .input(z.object({
      senderRole: z.enum(['user', 'group_member', 'owner', 'bot', 'system']),
      roomType: z.enum(['individual', 'group']).optional(),
      limit: z.number().max(200).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const { senderRole, roomType, limit } = input;

      console.log(`🔍 Messages.getMessagesByRole called by ${ctx.user?.email} for role ${senderRole}`);

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

  /**
   * Search messages by content
   * @permission org:messages:search
   */
  searchMessages: withPermission('org:messages:search')
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
    .query(async ({ ctx, input }) => {
      const { query, roomId, sessionId, messageType, direction, startDate, endDate, limit } = input;

      console.log(`🔍 Messages.searchMessages called by ${ctx.user?.email} with query "${query}"`);

      // Build search filter
      const filter = {
        message: { $regex: query, $options: 'i' }
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

  /**
   * Get message statistics
   * @permission org:analytics:view
   */
  getMessageStats: withPermission('org:analytics:view')
    .input(z.object({
      roomId: z.string().optional(),
      sessionId: z.string().optional(),
      days: z.number().max(365).default(30)
    }))
    .query(async ({ ctx, input }) => {
      const { roomId, sessionId, days } = input;

      console.log(`📊 Messages.getMessageStats called by ${ctx.user?.email}`);

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

  /**
   * Get single message by ID
   * @permission org:messages:view
   */
  getMessage: withPermission('org:messages:view')
    .input(z.object({
      messageId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Messages.getMessage called by ${ctx.user?.email} for message ${input.messageId}`);

      const message = await Message.findById(input.messageId)
        .populate('session_id', 'session_id status start_time end_time')
        .populate('room_id', 'name type line_room_id')
        .populate('owner_id', 'display_name line_user_id');

      if (!message) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Message not found'
        });
      }

      return {
        ...message.get_message_data(),
        session_info: message.session_id,
        room_info: message.room_id,
        owner_info: message.owner_id
      };
    }),

  /**
   * Export messages
   * @permission org:sessions:export
   */
  exportMessages: withPermission('org:sessions:export')
    .input(z.object({
      sessionId: z.string().optional(),
      roomId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(['json', 'csv', 'txt']).default('json'),
      includeMetadata: z.boolean().default(true)
    }))
    .query(async ({ ctx, input }) => {
      const { sessionId, roomId, startDate, endDate, format, includeMetadata } = input;

      console.log(`📤 Messages.exportMessages called by ${ctx.user?.email}`);

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

      // Audit log for export
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'messages:export',
        category: 'session',
        description: `Exported ${exportData.length} messages`,
        metadata: {
          format,
          count: exportData.length,
          filters: { sessionId, roomId, startDate, endDate }
        }
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
