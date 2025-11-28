/**
 * Rooms tRPC Router
 * @description API endpoints for managing chat rooms with organization-scoped permissions
 * @module trpc/routers/rooms
 */

const { z } = require('zod');
const { TRPCError } = require('@trpc/server');
const { router, withPermission } = require('../index');
const { Room, ChatSession, Summary, Owner, AuditLog } = require('../../models');

/**
 * Rooms Router
 * All endpoints require organization context and appropriate permissions
 */
const roomsRouter = router({
  /**
   * List all rooms with statistics
   * @permission org:groups:list
   */
  list: withPermission('org:groups:list')
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(10000).default(20),
      isActive: z.boolean().optional(),
      type: z.enum(['individual', 'group']).optional()
    }))
    .query(async ({ ctx, input }) => {
      let { page, limit, isActive, type } = input;

      console.log(`🔍 Rooms.list called by ${ctx.user?.email} for org ${ctx.organization?.name}`);

      // If querying for groups, return ALL groups by default (no pagination)
      if (type === 'group' && limit === 20) {
        limit = 10000;
      }

      const skip = (page - 1) * limit;

      // Phase 3: Organization-scoped filtering
      const filter = {};
      if (ctx.organization?._id) {
        filter.organization_id = ctx.organization._id;
      }
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

  /**
   * Get single room with detailed statistics
   * @permission org:groups:view
   */
  get: withPermission('org:groups:view')
    .input(z.object({
      roomId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Rooms.get called by ${ctx.user?.email} for room ${input.roomId}`);

      const room = await Room.findById(input.roomId);

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found'
        });
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

  /**
   * Get rooms with active sessions
   * @permission org:groups:list
   */
  withActiveSessions: withPermission('org:groups:list')
    .query(async ({ ctx }) => {
      console.log(`🔍 Rooms.withActiveSessions called by ${ctx.user?.email}`);

      // Get first owner for now (in production, filter by organization)
      const owner = await Owner.findOne();

      if (!owner) {
        return [];
      }

      const roomsWithSessions = await Room.get_active_rooms_with_sessions(owner._id);

      return roomsWithSessions;
    }),

  /**
   * Get all groups the AI bot is in
   * @permission org:groups:list
   */
  getAiGroups: withPermission('org:groups:list')
    .input(z.object({
      ownerId: z.string().optional(),
      isActive: z.boolean().optional()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Rooms.getAiGroups called by ${ctx.user?.email}`);

      // Get owner ID - use provided or get first owner
      let ownerId = input.ownerId;
      if (!ownerId) {
        const owner = await Owner.findOne();
        if (!owner) {
          return { groups: [], total: 0 };
        }
        ownerId = owner._id;
      }

      // Pass isActive param (null means return all groups)
      const isActiveFilter = input.isActive !== undefined ? input.isActive : null;
      let groups = await Room.get_ai_groups(ownerId, isActiveFilter);

      return {
        groups: groups.map(group => ({
          room_id: group._id,
          line_group_id: group.line_room_id,
          group_name: group.name,
          statistics: group.statistics,
          created_at: group.created_at,
          last_activity: group.statistics.last_activity_at,
          is_active: group.is_active
        })),
        total: groups.length,
        owner_id: ownerId
      };
    }),

  /**
   * Get groups with recent activity
   * @permission org:groups:list
   */
  getActiveGroups: withPermission('org:groups:list')
    .input(z.object({
      ownerId: z.string().optional(),
      minutesAgo: z.number().max(1440).default(60)
    }))
    .query(async ({ ctx, input }) => {
      const { minutesAgo } = input;

      console.log(`🔍 Rooms.getActiveGroups called by ${ctx.user?.email}`);

      // Get owner ID
      let ownerId = input.ownerId;
      if (!ownerId) {
        const owner = await Owner.findOne();
        if (!owner) {
          return { groups: [], total: 0, timespan: { minutes: minutesAgo } };
        }
        ownerId = owner._id;
      }

      const groups = await Room.get_active_groups(ownerId, minutesAgo);
      const since = new Date(Date.now() - minutesAgo * 60 * 1000);

      return {
        groups: groups.map(group => ({
          room_id: group._id,
          line_group_id: group.line_room_id,
          group_name: group.name,
          statistics: group.statistics,
          last_activity: group.statistics.last_activity_at
        })),
        total: groups.length,
        timespan: {
          minutes: minutesAgo,
          since: since
        },
        owner_id: ownerId
      };
    }),

  /**
   * Get specific group by LINE group ID
   * @permission org:groups:view
   */
  getGroupByLineId: withPermission('org:groups:view')
    .input(z.object({
      lineGroupId: z.string(),
      ownerId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { lineGroupId } = input;

      console.log(`🔍 Rooms.getGroupByLineId called by ${ctx.user?.email} for ${lineGroupId}`);

      // Get owner ID
      let ownerId = input.ownerId;
      if (!ownerId) {
        const owner = await Owner.findOne();
        if (!owner) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No owner found'
          });
        }
        ownerId = owner._id;
      }

      const group = await Room.get_group_by_line_id(lineGroupId, ownerId);

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found'
        });
      }

      return {
        room_id: group._id,
        line_group_id: group.line_room_id,
        group_name: group.name,
        type: group.type,
        is_active: group.is_active,
        statistics: group.statistics,
        settings: group.settings,
        created_at: group.created_at,
        updated_at: group.updated_at
      };
    }),

  /**
   * Get group statistics summary
   * @permission org:analytics:view
   */
  getGroupStats: withPermission('org:analytics:view')
    .input(z.object({
      ownerId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`📊 Rooms.getGroupStats called by ${ctx.user?.email}`);

      // Get owner ID
      let ownerId = input.ownerId;
      if (!ownerId) {
        const owner = await Owner.findOne();
        if (!owner) {
          return {
            totalGroups: 0,
            totalSessions: 0,
            totalMessages: 0,
            totalSummaries: 0,
            avgMessagesPerGroup: 0
          };
        }
        ownerId = owner._id;
      }

      const stats = await Room.get_group_stats(ownerId);

      return stats[0] || {
        totalGroups: 0,
        totalSessions: 0,
        totalMessages: 0,
        totalSummaries: 0,
        avgMessagesPerGroup: 0,
        mostActiveGroup: 0
      };
    }),

  /**
   * Update room settings
   * @permission org:groups:settings
   */
  updateSettings: withPermission('org:groups:settings')
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
    .mutation(async ({ ctx, input }) => {
      console.log(`⚙️ Rooms.updateSettings called by ${ctx.user?.email} for room ${input.roomId}`);

      const room = await Room.findById(input.roomId);

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found'
        });
      }

      // Store old settings for audit
      const old_settings = { ...room.settings.toObject() };

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

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'room:settings:update',
        category: 'room',
        resource_type: 'room',
        resource_id: room._id,
        description: `Updated settings for room ${room.name}`,
        changes: {
          before: old_settings,
          after: room.settings.toObject()
        }
      });

      return {
        success: true,
        message: 'Room settings updated successfully',
        room: room.get_room_summary()
      };
    }),

  /**
   * Archive room
   * @permission org:groups:settings (admin level)
   */
  archive: withPermission('org:groups:settings')
    .input(z.object({
      roomId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`📦 Rooms.archive called by ${ctx.user?.email} for room ${input.roomId}`);

      const room = await Room.findById(input.roomId);

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found'
        });
      }

      // Close any active sessions
      await ChatSession.updateMany(
        { room_id: input.roomId, status: 'active' },
        { status: 'closed', end_time: new Date() }
      );

      room.is_active = false;
      await room.save();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'room:archive',
        category: 'room',
        resource_type: 'room',
        resource_id: room._id,
        description: `Archived room ${room.name}`,
        metadata: { room_name: room.name, line_room_id: room.line_room_id }
      });

      return {
        success: true,
        message: 'Room archived successfully'
      };
    }),

  /**
   * Get room statistics
   * @permission org:analytics:view
   */
  stats: withPermission('org:analytics:view')
    .query(async ({ ctx }) => {
      console.log(`📊 Rooms.stats called by ${ctx.user?.email}`);

      // Phase 3: Organization-scoped statistics
      const orgFilter = ctx.organization?._id ? { organization_id: ctx.organization._id } : {};

      const stats = await Room.aggregate([
        { $match: orgFilter },
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

      const activeRooms = await Room.countDocuments({ ...orgFilter, is_active: true });
      const totalRooms = await Room.countDocuments(orgFilter);

      const mostActiveRooms = await Room.find({ ...orgFilter, is_active: true })
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
