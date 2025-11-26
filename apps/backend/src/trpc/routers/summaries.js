/**
 * Summaries tRPC Router
 * API endpoints for managing AI-generated summaries
 */

const { z } = require('zod');
const { router, loggedProcedure, adminProcedure } = require('../index');
const { Summary, ChatSession } = require('../../models');

const summariesRouter = router({
  // Get all summaries with pagination
  list: loggedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      roomId: z.string().optional(),
      status: z.enum(['processing', 'completed', 'failed']).optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, roomId, status } = input;
      const skip = (page - 1) * limit;

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

  // Get single summary
  get: loggedProcedure
    .input(z.object({
      summaryId: z.string()
    }))
    .query(async ({ input }) => {
      const summary = await Summary.findById(input.summaryId)
        .populate('session_id')
        .populate('room_id', 'name type line_room_id');

      if (!summary) {
        throw new Error('Summary not found');
      }

      return summary.get_summary_data();
    }),

  // Get summaries by room
  byRoom: loggedProcedure
    .input(z.object({
      roomId: z.string(),
      limit: z.number().max(50).default(10)
    }))
    .query(async ({ input }) => {
      const summaries = await Summary.get_summaries_by_room(
        input.roomId,
        input.limit
      );

      return summaries.map(summary => summary.get_summary_data());
    }),

  // Get summary statistics
  stats: loggedProcedure
    .query(async () => {
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

  // Export summary data
  export: loggedProcedure
    .input(z.object({
      summaryId: z.string(),
      format: z.enum(['json', 'text']).default('json')
    }))
    .query(async ({ input }) => {
      const summary = await Summary.findById(input.summaryId)
        .populate('session_id')
        .populate('room_id', 'name type');

      if (!summary) {
        throw new Error('Summary not found');
      }

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
    })
});

module.exports = summariesRouter;