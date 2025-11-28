/**
 * Summaries tRPC Router
 * @description API endpoints for managing AI-generated summaries with organization-scoped permissions
 * @module trpc/routers/summaries
 */

const { z } = require('zod');
const { TRPCError } = require('@trpc/server');
const { router, withPermission } = require('../index');
const { Summary, ChatSession, AuditLog } = require('../../models');

/**
 * Summaries Router
 * All endpoints require organization context and appropriate permissions
 */
const summariesRouter = router({
  /**
   * List all summaries with pagination
   * @permission org:summaries:list
   */
  list: withPermission('org:summaries:list')
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      roomId: z.string().optional(),
      status: z.enum(['processing', 'completed', 'failed']).optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, roomId, status } = input;
      const skip = (page - 1) * limit;

      console.log(`🔍 Summaries.list called by ${ctx.user?.email} for org ${ctx.organization?.name}`);

      // TODO: Phase 3 - filter by organization_id
      const filter = {};
      if (roomId) filter.room_id = roomId;
      if (status) filter.status = status;

      const summaries = await Summary.find(filter)
        .populate('session_id', 'session_id start_time end_time')
        .populate('room_id', 'name type')
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Summary.countDocuments(filter);

      return {
        summaries: summaries.map(summary => summary.get_summary_data()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  /**
   * Get single summary
   * @permission org:summaries:view
   */
  get: withPermission('org:summaries:view')
    .input(z.object({
      summaryId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Summaries.get called by ${ctx.user?.email} for summary ${input.summaryId}`);

      const summary = await Summary.findById(input.summaryId)
        .populate('session_id')
        .populate('room_id', 'name type line_room_id');

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found'
        });
      }

      return summary.get_summary_data();
    }),

  /**
   * Get summaries by room
   * @permission org:summaries:list
   */
  byRoom: withPermission('org:summaries:list')
    .input(z.object({
      roomId: z.string(),
      limit: z.number().max(50).default(10)
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Summaries.byRoom called by ${ctx.user?.email} for room ${input.roomId}`);

      const summaries = await Summary.get_summaries_by_room(
        input.roomId,
        input.limit
      );

      return summaries.map(summary => summary.get_summary_data());
    }),

  /**
   * Get summary statistics
   * @permission org:analytics:view
   */
  stats: withPermission('org:analytics:view')
    .query(async ({ ctx }) => {
      console.log(`📊 Summaries.stats called by ${ctx.user?.email}`);

      // TODO: Phase 3 - filter by organization_id
      const stats = await Summary.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalTokens: { $sum: '$gemini_metadata.tokens_used' },
            totalCost: { $sum: '$gemini_metadata.cost' },
            avgProcessingTime: { $avg: '$gemini_metadata.processing_time_ms' }
          }
        }
      ]);

      const topicStats = await Summary.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: '$key_topics' },
        {
          $group: {
            _id: '$key_topics',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const sentimentStats = await Summary.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$analysis.sentiment',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalTokens: stat.totalTokens || 0,
            totalCost: stat.totalCost || 0,
            avgProcessingTime: stat.avgProcessingTime || 0
          };
          return acc;
        }, {}),
        topTopics: topicStats,
        sentimentBreakdown: sentimentStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      };
    }),

  /**
   * Export summary data
   * @permission org:summaries:view
   */
  export: withPermission('org:summaries:view')
    .input(z.object({
      summaryId: z.string(),
      format: z.enum(['json', 'text']).default('json')
    }))
    .query(async ({ ctx, input }) => {
      console.log(`📤 Summaries.export called by ${ctx.user?.email} for summary ${input.summaryId}`);

      const summary = await Summary.findById(input.summaryId)
        .populate('session_id')
        .populate('room_id', 'name type');

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found'
        });
      }

      // Audit log for export
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'summary:export',
        category: 'summary',
        resource_type: 'summary',
        resource_id: summary._id,
        description: `Exported summary ${summary._id}`,
        metadata: { format: input.format }
      });

      if (input.format === 'text') {
        return {
          content: summary.content,
          metadata: {
            session: summary.session_id?.session_id,
            room: summary.room_id?.name,
            date: summary.created_at.toISOString(),
            topics: summary.key_topics.join(', '),
            sentiment: summary.analysis?.sentiment
          }
        };
      }

      return summary.get_summary_data();
    }),

  /**
   * Delete summary
   * @permission org:summaries:delete
   */
  delete: withPermission('org:summaries:delete')
    .input(z.object({
      summaryId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`🗑️ Summaries.delete called by ${ctx.user?.email} for summary ${input.summaryId}`);

      const summary = await Summary.findById(input.summaryId);

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found'
        });
      }

      // Remove summary reference from session
      if (summary.session_id) {
        await ChatSession.findByIdAndUpdate(summary.session_id, {
          $unset: { summary_id: 1 }
        });
      }

      await summary.deleteOne();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'summary:delete',
        category: 'summary',
        resource_type: 'summary',
        resource_id: input.summaryId,
        description: `Deleted summary ${input.summaryId}`
      });

      return {
        success: true,
        message: 'Summary deleted successfully'
      };
    }),

  /**
   * Update summary content (edit)
   * @permission org:summaries:edit
   */
  update: withPermission('org:summaries:edit')
    .input(z.object({
      summaryId: z.string(),
      content: z.string().optional(),
      key_topics: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`✏️ Summaries.update called by ${ctx.user?.email} for summary ${input.summaryId}`);

      const summary = await Summary.findById(input.summaryId);

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found'
        });
      }

      // Store old values for audit
      const old_values = {
        content: summary.content,
        key_topics: [...summary.key_topics]
      };

      // Update fields
      if (input.content !== undefined) {
        summary.content = input.content;
      }
      if (input.key_topics !== undefined) {
        summary.key_topics = input.key_topics;
      }

      await summary.save();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'summary:update',
        category: 'summary',
        resource_type: 'summary',
        resource_id: summary._id,
        description: `Updated summary ${summary._id}`,
        changes: {
          before: old_values,
          after: {
            content: summary.content,
            key_topics: summary.key_topics
          }
        }
      });

      return {
        success: true,
        message: 'Summary updated successfully',
        summary: summary.get_summary_data()
      };
    })
});

module.exports = summariesRouter;
