/**
 * Chat Sessions tRPC Router
 * API endpoints for managing chat sessions
 */

const { z } = require('zod');
const { router, loggedProcedure, adminProcedure } = require('../index');
const { ChatSession, Room, Summary } = require('../../models');

const sessionsRouter = router({
  // Get all sessions with pagination
  list: loggedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      status: z.enum(['active', 'closed', 'summarizing']).optional(),
      roomId: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, status, roomId } = input;
      const skip = (page - 1) * limit;

      const filter = {};
      if (status) filter.status = status;
      if (roomId) filter.room_id = roomId;

      const sessions = await ChatSession.find(filter)
        .populate('room_id', 'name type line_room_id')
        .populate('summary_id', 'content key_topics analysis')
        .sort({ start_time: -1 })
        .limit(limit)
        .skip(skip);

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
      const session = await ChatSession.findById(input.sessionId)
        .populate('room_id', 'name type line_room_id owner_id')
        .populate('summary_id');

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
    })
});

module.exports = sessionsRouter;