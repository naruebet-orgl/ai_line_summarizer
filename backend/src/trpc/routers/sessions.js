/**
 * Chat Sessions tRPC Router
 * API endpoints for managing chat sessions
 */

const { z } = require('zod');
const { router, loggedProcedure, adminProcedure } = require('../index');
const { ChatSession, Room, Summary, Owner } = require('../../models');

const sessionsRouter = router({
  // Get all sessions with pagination
  list: loggedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(10000).default(20),
      status: z.enum(['active', 'closed', 'summarizing']).optional(),
      roomId: z.string().optional(),
      room_type: z.enum(['individual', 'group']).optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, status, roomId, room_type } = input;
      const skip = (page - 1) * limit;

      console.log('🔍 Sessions.list called with input:', input);

      let filter = {};
      if (status) filter.status = status;
      if (roomId) filter.room_id = roomId;

      console.log('🔍 MongoDB filter applied:', filter);

      // Get all sessions first with populated room data
      let query = ChatSession.find(filter)
        .populate('room_id', 'name type line_room_id')
        .populate('summary_id', 'content key_topics analysis')
        .sort({ start_time: -1 });

      // If room_type is specified, filter using aggregate pipeline
      if (room_type) {
        const sessions = await ChatSession.aggregate([
          {
            $lookup: {
              from: 'rooms',
              localField: 'room_id',
              foreignField: '_id',
              as: 'room_data'
            }
          },
          {
            $match: {
              'room_data.type': room_type,
              ...(status && { status })
            }
          },
          {
            $lookup: {
              from: 'summaries',
              localField: 'summary_id',
              foreignField: '_id',
              as: 'summary_data'
            }
          },
          { $sort: { start_time: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]);

        const total = await ChatSession.aggregate([
          {
            $lookup: {
              from: 'rooms',
              localField: 'room_id',
              foreignField: '_id',
              as: 'room_data'
            }
          },
          {
            $match: {
              'room_data.type': room_type,
              ...(status && { status })
            }
          },
          { $count: "total" }
        ]);

        return {
          sessions: sessions.map(session => {
            const room = session.room_data[0];
            const summary = session.summary_data[0];
            return {
              ...session,
              session_id: session.session_id || session._id.toString(),
              room_name: room?.name,
              room_type: room?.type,
              line_room_id: room?.line_room_id,
              message_count: session.message_logs?.length || 0,
              has_summary: !!summary,
              room_id: room,
              start_time: session.start_time,
              end_time: session.end_time
            };
          }),
          pagination: {
            page,
            limit,
            total: total[0]?.total || 0,
            pages: Math.ceil((total[0]?.total || 0) / limit)
          }
        };
      }

      // Regular query without room_type filter
      const sessions = await query.limit(limit).skip(skip);
      const total = await ChatSession.countDocuments(filter);

      return {
        sessions: sessions.map(session => session.get_conversation_summary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  // Get single session with full details
  get: loggedProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .query(async ({ input }) => {
      // Try to find by MongoDB ObjectId first, then by session_id field
      let session = null;
      try {
        session = await ChatSession.findById(input.sessionId)
          .populate('room_id', 'name type line_room_id owner_id')
          .populate('summary_id');
      } catch (error) {
        // If not a valid ObjectId, try finding by session_id field
        session = await ChatSession.findOne({ session_id: input.sessionId })
          .populate('room_id', 'name type line_room_id owner_id')
          .populate('summary_id');
      }

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        ...session.toObject(),
        summary: session.summary_id
      };
    }),

  // Close session manually (admin only)
  close: adminProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .mutation(async ({ input }) => {
      const session = await ChatSession.findById(input.sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      await session.close_session();

      return {
        success: true,
        message: 'Session closed successfully'
      };
    }),

  // Get session statistics
  stats: loggedProcedure
    .query(async () => {
      const stats = await ChatSession.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalMessages: { $sum: { $size: '$message_logs' } }
          }
        }
      ]);

      const totalSessions = await ChatSession.countDocuments();
      const avgMessagesPerSession = await ChatSession.aggregate([
        {
          $group: {
            _id: null,
            avgMessages: { $avg: { $size: '$message_logs' } }
          }
        }
      ]);

      return {
        totalSessions,
        avgMessagesPerSession: avgMessagesPerSession[0]?.avgMessages || 0,
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalMessages: stat.totalMessages
          };
          return acc;
        }, {})
      };
    }),

  // Generate summary manually (admin only)
  generateSummary: adminProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .mutation(async ({ input }) => {
      console.log(`🎯 GenerateSummary called with sessionId: ${input.sessionId}`);

      let session = null;
      try {
        session = await ChatSession.findById(input.sessionId)
          .populate('room_id', 'name type line_room_id owner_id')
          .populate('owner_id');
        console.log(`🔍 Session found by _id:`, session ? 'YES' : 'NO');
      } catch (error) {
        console.log(`⚠️ findById failed, trying findOne with session_id`);
        session = await ChatSession.findOne({ session_id: input.sessionId })
          .populate('room_id', 'name type line_room_id owner_id')
          .populate('owner_id');
        console.log(`🔍 Session found by session_id:`, session ? 'YES' : 'NO');
      }

      if (!session) {
        throw new Error('Session not found');
      }

      console.log(`📋 Session details: _id=${session._id}, session_id=${session.session_id}, status=${session.status}`);

      // Allow summary generation for active or closed sessions (admin can regenerate summaries)
      if (session.status !== 'active' && session.status !== 'closed') {
        throw new Error(`Cannot generate summary for sessions with status: ${session.status}`);
      }

      // Check message count from Message collection first, fallback to embedded message_logs
      const { Message } = require('../../models');
      console.log(`🔍 Querying messages with session_id: ${session.session_id}`);

      let messageCount = await Message.countDocuments({ session_id: session.session_id });
      console.log(`📊 Message collection count: ${messageCount}`);

      // Always check embedded message_logs as well for complete picture
      const embeddedMessageCount = session.message_logs?.length || 0;
      console.log(`📊 Embedded message_logs count: ${embeddedMessageCount}`);

      // Use the higher of the two counts to determine if we have messages
      const totalMessageCount = Math.max(messageCount, embeddedMessageCount);
      console.log(`📊 Total effective message count: ${totalMessageCount} (Message collection: ${messageCount}, Embedded: ${embeddedMessageCount})`);

      if (totalMessageCount < 1) {
        throw new Error('Session needs at least 1 message to generate a summary');
      }

      // For AI processing, prefer Message collection but fallback to embedded if needed
      messageCount = messageCount > 0 ? messageCount : embeddedMessageCount;

      console.log(`🔍 Found ${messageCount} messages for session ${session.session_id}`);

      // Create summary record - use actual MongoDB ObjectId
      const summary = await Summary.create_summary(
        session._id, // This is already the correct MongoDB ObjectId from findById/findOne
        session.room_id._id,
        session.owner_id._id || session.room_id.owner_id
      );

      // Generate AI summary using singleton instance
      const geminiService = require('../../services/gemini_service');
      await geminiService.generate_chat_summary(session, summary);

      // Attach summary to session
      await session.attach_summary(summary._id);

      return {
        success: true,
        message: 'Summary generated successfully',
        summary_id: summary._id
      };
    })
});

module.exports = sessionsRouter;