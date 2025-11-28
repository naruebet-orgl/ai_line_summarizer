/**
 * Groups tRPC Router
 * @description API endpoints for LINE group assignment and categorization
 * @module trpc/routers/groups
 */

const { z } = require('zod');
const { TRPCError } = require('@trpc/server');
const { router, withPermission } = require('../index');
const { Room, ChatSession, AuditLog } = require('../../models');

/**
 * Groups Router
 * Handles group assignment, categorization, and management
 */
const groupsRouter = router({
  /**
   * List groups for organization with filters
   * @permission org:groups:list
   */
  list: withPermission('org:groups:list')
    .input(z.object({
      category: z.enum(['sales', 'support', 'operations', 'marketing', 'other', 'unassigned']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
      tags: z.array(z.string()).optional(),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
      page: z.number().default(1),
      limit: z.number().max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { category, priority, tags, search, isActive, page, limit } = input;
      const skip = (page - 1) * limit;

      console.log(`🔍 Groups.list called by ${ctx.user?.email} for org ${ctx.organization?.name}`);

      // Build filter with organization scope
      const filter = {
        organization_id: ctx.organization._id,
        type: 'group'
      };

      if (category) filter['assignment.category'] = category;
      if (priority) filter['assignment.priority'] = priority;
      if (tags && tags.length > 0) filter['assignment.tags'] = { $in: tags };
      if (isActive !== undefined) filter.is_active = isActive;

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { 'assignment.custom_name': { $regex: search, $options: 'i' } },
          { 'assignment.notes': { $regex: search, $options: 'i' } }
        ];
      }

      const groups = await Room.find(filter)
        .populate('assignment.assigned_to', 'name email')
        .sort({ 'statistics.last_activity_at': -1 })
        .skip(skip)
        .limit(limit);

      const total = await Room.countDocuments(filter);

      return {
        groups: groups.map(g => ({
          ...g.get_room_summary(),
          assigned_users: g.assignment?.assigned_to || []
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  /**
   * Get single group details
   * @permission org:groups:view
   */
  get: withPermission('org:groups:view')
    .input(z.object({
      roomId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Groups.get called by ${ctx.user?.email} for room ${input.roomId}`);

      const group = await Room.findOne({
        _id: input.roomId,
        organization_id: ctx.organization._id,
        type: 'group'
      }).populate('assignment.assigned_to', 'name email');

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found'
        });
      }

      // Get recent sessions
      const recentSessions = await ChatSession.find({
        room_id: input.roomId,
        organization_id: ctx.organization._id
      })
        .sort({ start_time: -1 })
        .limit(10)
        .populate('summary_id', 'content key_topics');

      // Get active session
      const activeSession = await ChatSession.findOne({
        room_id: input.roomId,
        organization_id: ctx.organization._id,
        status: 'active'
      });

      return {
        ...group.get_room_summary(),
        assigned_users: group.assignment?.assigned_to || [],
        recent_sessions: recentSessions.map(s => s.get_conversation_summary()),
        active_session: activeSession ? activeSession.get_conversation_summary() : null
      };
    }),

  /**
   * Assign group to category
   * @permission org:groups:assign
   */
  assign: withPermission('org:groups:assign')
    .input(z.object({
      roomId: z.string(),
      category: z.enum(['sales', 'support', 'operations', 'marketing', 'other', 'unassigned']),
      tags: z.array(z.string()).optional(),
      custom_name: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
      assigned_to: z.array(z.string()).optional(),
      notes: z.string().max(1000).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`📁 Groups.assign called by ${ctx.user?.email} for room ${input.roomId}`);

      const group = await Room.findOne({
        _id: input.roomId,
        organization_id: ctx.organization._id,
        type: 'group'
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found'
        });
      }

      // Store old assignment for audit
      const old_assignment = group.assignment ? { ...group.assignment.toObject() } : null;

      // Update assignment fields
      if (!group.assignment) {
        group.assignment = {};
      }

      group.assignment.category = input.category;

      if (input.tags !== undefined) {
        group.assignment.tags = input.tags;
      }
      if (input.custom_name !== undefined) {
        group.assignment.custom_name = input.custom_name;
      }
      if (input.priority !== undefined) {
        group.assignment.priority = input.priority;
      }
      if (input.assigned_to !== undefined) {
        group.assignment.assigned_to = input.assigned_to;
      }
      if (input.notes !== undefined) {
        group.assignment.notes = input.notes;
      }

      await group.save();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization._id,
        user_id: ctx.user._id,
        action: 'group:assign',
        category: 'room',
        resource_type: 'room',
        resource_id: group._id,
        description: `Assigned group "${group.name}" to category: ${input.category}`,
        changes: {
          before: old_assignment,
          after: group.assignment.toObject()
        }
      });

      return {
        success: true,
        message: `Group assigned to ${input.category}`,
        group: group.get_room_summary()
      };
    }),

  /**
   * Bulk assign groups to category
   * @permission org:groups:assign
   */
  bulkAssign: withPermission('org:groups:assign')
    .input(z.object({
      roomIds: z.array(z.string()),
      category: z.enum(['sales', 'support', 'operations', 'marketing', 'other', 'unassigned']),
      tags: z.array(z.string()).optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`📁 Groups.bulkAssign called by ${ctx.user?.email} for ${input.roomIds.length} rooms`);

      const updateFields = {
        'assignment.category': input.category
      };

      if (input.tags) {
        updateFields['assignment.tags'] = input.tags;
      }
      if (input.priority) {
        updateFields['assignment.priority'] = input.priority;
      }

      const result = await Room.updateMany(
        {
          _id: { $in: input.roomIds },
          organization_id: ctx.organization._id,
          type: 'group'
        },
        { $set: updateFields }
      );

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization._id,
        user_id: ctx.user._id,
        action: 'group:bulk_assign',
        category: 'room',
        description: `Bulk assigned ${result.modifiedCount} groups to category: ${input.category}`,
        metadata: {
          room_ids: input.roomIds,
          category: input.category,
          modified_count: result.modifiedCount
        }
      });

      return {
        success: true,
        updated: result.modifiedCount,
        message: `${result.modifiedCount} groups assigned to ${input.category}`
      };
    }),

  /**
   * Update group settings
   * @permission org:groups:settings
   */
  updateSettings: withPermission('org:groups:settings')
    .input(z.object({
      roomId: z.string(),
      settings: z.object({
        auto_summarize: z.boolean().optional(),
        session_trigger: z.object({
          message_count: z.number().min(10).max(200).optional(),
          time_limit_hours: z.number().min(1).max(168).optional()
        }).optional()
      })
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`⚙️ Groups.updateSettings called by ${ctx.user?.email} for room ${input.roomId}`);

      const group = await Room.findOne({
        _id: input.roomId,
        organization_id: ctx.organization._id,
        type: 'group'
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found'
        });
      }

      const old_settings = { ...group.settings.toObject() };

      if (input.settings.auto_summarize !== undefined) {
        group.settings.auto_summarize = input.settings.auto_summarize;
      }

      if (input.settings.session_trigger) {
        if (input.settings.session_trigger.message_count !== undefined) {
          group.settings.session_trigger.message_count = input.settings.session_trigger.message_count;
        }
        if (input.settings.session_trigger.time_limit_hours !== undefined) {
          group.settings.session_trigger.time_limit_hours = input.settings.session_trigger.time_limit_hours;
        }
      }

      await group.save();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization._id,
        user_id: ctx.user._id,
        action: 'group:settings:update',
        category: 'room',
        resource_type: 'room',
        resource_id: group._id,
        description: `Updated settings for group "${group.name}"`,
        changes: {
          before: old_settings,
          after: group.settings.toObject()
        }
      });

      return {
        success: true,
        message: 'Group settings updated',
        group: group.get_room_summary()
      };
    }),

  /**
   * Get category statistics
   * @permission org:analytics:view
   */
  categoryStats: withPermission('org:analytics:view')
    .query(async ({ ctx }) => {
      console.log(`📊 Groups.categoryStats called by ${ctx.user?.email}`);

      const stats = await Room.aggregate([
        {
          $match: {
            organization_id: ctx.organization._id,
            type: 'group',
            is_active: true
          }
        },
        {
          $group: {
            _id: '$assignment.category',
            count: { $sum: 1 },
            totalSessions: { $sum: '$statistics.total_sessions' },
            totalMessages: { $sum: '$statistics.total_messages' },
            totalSummaries: { $sum: '$statistics.total_summaries' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const priorityStats = await Room.aggregate([
        {
          $match: {
            organization_id: ctx.organization._id,
            type: 'group',
            is_active: true
          }
        },
        {
          $group: {
            _id: '$assignment.priority',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalGroups = await Room.countDocuments({
        organization_id: ctx.organization._id,
        type: 'group',
        is_active: true
      });

      return {
        totalGroups,
        byCategory: stats.reduce((acc, cat) => {
          acc[cat._id || 'unassigned'] = {
            count: cat.count,
            totalSessions: cat.totalSessions,
            totalMessages: cat.totalMessages,
            totalSummaries: cat.totalSummaries
          };
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, p) => {
          acc[p._id || 'normal'] = p.count;
          return acc;
        }, {})
      };
    }),

  /**
   * Get all unique tags used in organization
   * @permission org:groups:list
   */
  getTags: withPermission('org:groups:list')
    .query(async ({ ctx }) => {
      console.log(`🏷️ Groups.getTags called by ${ctx.user?.email}`);

      const tags = await Room.aggregate([
        {
          $match: {
            organization_id: ctx.organization._id,
            type: 'group',
            'assignment.tags': { $exists: true, $ne: [] }
          }
        },
        { $unwind: '$assignment.tags' },
        {
          $group: {
            _id: '$assignment.tags',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        tags: tags.map(t => ({
          name: t._id,
          count: t.count
        }))
      };
    }),

  /**
   * Archive/unarchive group
   * @permission org:groups:settings
   */
  toggleArchive: withPermission('org:groups:settings')
    .input(z.object({
      roomId: z.string(),
      archive: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`📦 Groups.toggleArchive called by ${ctx.user?.email} for room ${input.roomId}`);

      const group = await Room.findOne({
        _id: input.roomId,
        organization_id: ctx.organization._id,
        type: 'group'
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found'
        });
      }

      // Close any active sessions if archiving
      if (input.archive) {
        await ChatSession.updateMany(
          {
            room_id: input.roomId,
            organization_id: ctx.organization._id,
            status: 'active'
          },
          {
            status: 'closed',
            end_time: new Date()
          }
        );
      }

      group.is_active = !input.archive;
      await group.save();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization._id,
        user_id: ctx.user._id,
        action: input.archive ? 'group:archive' : 'group:unarchive',
        category: 'room',
        resource_type: 'room',
        resource_id: group._id,
        description: `${input.archive ? 'Archived' : 'Unarchived'} group "${group.name}"`
      });

      return {
        success: true,
        message: input.archive ? 'Group archived' : 'Group unarchived',
        group: group.get_room_summary()
      };
    })
});

module.exports = groupsRouter;
