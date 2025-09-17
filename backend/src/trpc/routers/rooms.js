/**
 * Rooms tRPC Router
 * API endpoints for managing chat rooms
 */

const { z } = require('zod');
const { router, loggedProcedure, adminProcedure } = require('../index');
const { Room, ChatSession, Summary } = require('../../models');

const roomsRouter = router({
  // Get all rooms with statistics
  list: loggedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      isActive: z.boolean().optional(),
      type: z.enum(['individual', 'group']).optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, isActive, type } = input;
      const skip = (page - 1) * limit;

      const filter = {};
      if (isActive !== undefined) filter.is_active = isActive;
      if (type) filter.type = type;

      const rooms = await Room.find(filter)
        .sort({ 'statistics.last_activity_at': -1 })
        .limit(limit)
        .skip(skip);

      const total = await Room.countDocuments(filter);

      return {
        rooms: rooms.map(room => room.get_room_summary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  // Get single room with detailed statistics
  get: loggedProcedure
    .input(z.object({
      roomId: z.string()
    }))
    .query(async ({ input }) => {
      const room = await Room.findById(input.roomId);

      if (!room) {
        throw new Error('Room not found');
      }

      // Get recent sessions
      const recentSessions = await ChatSession.find({ room_id: input.roomId })
        .sort({ start_time: -1 })
        .limit(5)
        .populate('summary_id', 'content key_topics');

      // Get active session
      const activeSession = await ChatSession.findOne({
        room_id: input.roomId,
        status: 'active'
      });

      return {
        ...room.get_room_summary(),
        recentSessions: recentSessions.map(session => session.get_conversation_summary()),
        activeSession: activeSession ? activeSession.get_conversation_summary() : null
      };
    }),

  // Get rooms with active sessions
  withActiveSessions: loggedProcedure
    .query(async () => {
      // Get first owner for now (in production, filter by owner)
      const { Owner } = require('../../models');
      const owner = await Owner.findOne();

      if (!owner) {
        return [];
      }

      const roomsWithSessions = await Room.get_active_rooms_with_sessions(owner._id);

      return roomsWithSessions;
    }),

  // Update room settings (admin only)
  updateSettings: adminProcedure
    .input(z.object({
      roomId: z.string(),
      settings: z.object({
        auto_summarize: z.boolean().optional(),
        session_trigger: z.object({
          message_count: z.number().min(1).max(200).optional(),
          time_limit_hours: z.number().min(1).max(168).optional()
        }).optional()
      })
    }))
    .mutation(async ({ input }) => {
      const room = await Room.findById(input.roomId);

      if (!room) {
        throw new Error('Room not found');
      }

      if (input.settings.auto_summarize !== undefined) {
        room.settings.auto_summarize = input.settings.auto_summarize;
      }

      if (input.settings.session_trigger) {
        if (input.settings.session_trigger.message_count !== undefined) {
          room.settings.session_trigger.message_count = input.settings.session_trigger.message_count;
        }
        if (input.settings.session_trigger.time_limit_hours !== undefined) {
          room.settings.session_trigger.time_limit_hours = input.settings.session_trigger.time_limit_hours;
        }
      }

      await room.save();

      return {
        success: true,
        message: 'Room settings updated successfully',
        room: room.get_room_summary()
      };
    }),

  // Archive room (admin only)
  archive: adminProcedure
    .input(z.object({
      roomId: z.string()
    }))
    .mutation(async ({ input }) => {
      const room = await Room.findById(input.roomId);

      if (!room) {
        throw new Error('Room not found');
      }

      // Close any active sessions
      await ChatSession.updateMany(
        { room_id: input.roomId, status: 'active' },
        { status: 'closed', end_time: new Date() }
      );

      room.is_active = false;
      await room.save();

      return {
        success: true,
        message: 'Room archived successfully'
      };
    }),

  // Get room statistics
  stats: loggedProcedure
    .query(async () => {
      const stats = await Room.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalSessions: { $sum: '$statistics.total_sessions' },
            totalMessages: { $sum: '$statistics.total_messages' },
            avgSessions: { $avg: '$statistics.total_sessions' },
            avgMessages: { $avg: '$statistics.total_messages' }
          }
        }
      ]);

      const activeRooms = await Room.countDocuments({ is_active: true });
      const totalRooms = await Room.countDocuments();

      const mostActiveRooms = await Room.find({ is_active: true })
        .sort({ 'statistics.total_messages': -1 })
        .limit(5)
        .select('name type statistics');

      return {
        totalRooms,
        activeRooms,
        typeBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalSessions: stat.totalSessions,
            totalMessages: stat.totalMessages,
            avgSessions: Math.round(stat.avgSessions),
            avgMessages: Math.round(stat.avgMessages)
          };
          return acc;
        }, {}),
        mostActiveRooms: mostActiveRooms.map(room => room.get_room_summary())
      };
    })
});

module.exports = roomsRouter;