/**
 * Chat Sessions tRPC Router
 * @description API endpoints for managing chat sessions with organization-scoped permissions
 * @module trpc/routers/sessions
 */

const { z } = require('zod');
const { TRPCError } = require('@trpc/server');
const { router, withPermission, orgProcedure } = require('../index');
const { ChatSession, Room, Summary, Owner, Message, AuditLog } = require('../../models');
const { evaluate_policy } = require('../../auth/abac');

/**
 * Sessions Router
 * All endpoints require organization context and appropriate permissions
 */
const sessionsRouter = router({
  /**
   * List sessions with pagination
   * @permission org:sessions:list
   */
  list: withPermission('org:sessions:list')
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(10000).default(20),
      status: z.enum(['active', 'closed', 'summarizing']).optional(),
      roomId: z.string().optional(),
      line_room_id: z.string().optional(),
      room_type: z.enum(['individual', 'group']).optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, status, roomId, line_room_id, room_type } = input;
      const skip = (page - 1) * limit;

      console.log(`🔍 Sessions.list called by ${ctx.user?.email} for org ${ctx.organization?.name}`);
      console.log('🔍 Sessions.list input:', input);

      // Build base filter with organization scope
      let filter = {};
      if (status) filter.status = status;
      if (roomId) filter.room_id = roomId;
      if (line_room_id) filter.line_room_id = line_room_id;

      // Phase 3: Organization-scoped data filtering
      if (ctx.organization?._id) {
        filter.organization_id = ctx.organization._id;
      }

      console.log('🔍 MongoDB filter applied:', filter);

      // If room_type is specified, use aggregate pipeline
      if (room_type) {
        const orgFilter = ctx.organization?._id ? { organization_id: ctx.organization._id } : {};

        const sessions = await ChatSession.aggregate([
          { $match: orgFilter },
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
          { $match: orgFilter },
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
      const query = ChatSession.find(filter)
        .populate('room_id', 'name type line_room_id')
        .populate('summary_id', 'content key_topics analysis')
        .sort({ start_time: -1 });

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

  /**
   * Get single session with full details
   * @permission org:sessions:view
   */
  get: withPermission('org:sessions:view')
    .input(z.object({
      sessionId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`🔍 Sessions.get called by ${ctx.user?.email} for session ${input.sessionId}`);

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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      // ABAC check - verify session belongs to user's organization
      const policy_result = await evaluate_policy('session:access', ctx.user, session, {
        organization: ctx.organization,
        org_role: ctx.org_role,
        is_super_admin: ctx.is_super_admin
      });

      if (!policy_result.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: policy_result.reason || 'Access denied to this session'
        });
      }

      return {
        ...session.toObject(),
        summary: session.summary_id
      };
    }),

  /**
   * Close session manually
   * @permission org:sessions:delete (uses delete permission for session management)
   */
  close: withPermission('org:sessions:delete')
    .input(z.object({
      sessionId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`🔒 Sessions.close called by ${ctx.user?.email} for session ${input.sessionId}`);

      const session = await ChatSession.findById(input.sessionId);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      if (session.status !== 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session is not active'
        });
      }

      // ABAC check
      const policy_result = await evaluate_policy('session:delete', ctx.user, session, {
        organization: ctx.organization,
        org_role: ctx.org_role,
        is_super_admin: ctx.is_super_admin
      });

      if (!policy_result.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: policy_result.reason || 'Cannot close this session'
        });
      }

      await session.close_session();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'session:close',
        category: 'session',
        resource_type: 'session',
        resource_id: session._id,
        description: `Closed session ${session.session_id}`,
        metadata: { session_id: session.session_id }
      });

      return {
        success: true,
        message: 'Session closed successfully'
      };
    }),

  /**
   * Get session statistics
   * @permission org:analytics:view
   */
  stats: withPermission('org:analytics:view')
    .query(async ({ ctx }) => {
      console.log(`📊 Sessions.stats called by ${ctx.user?.email}`);

      // Phase 3: Organization-scoped statistics
      const orgFilter = ctx.organization?._id ? { organization_id: ctx.organization._id } : {};

      const stats = await ChatSession.aggregate([
        { $match: orgFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalMessages: { $sum: { $size: '$message_logs' } }
          }
        }
      ]);

      const totalSessions = await ChatSession.countDocuments(orgFilter);
      const avgMessagesPerSession = await ChatSession.aggregate([
        { $match: orgFilter },
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

  /**
   * Generate summary manually
   * @permission org:summaries:generate
   */
  generateSummary: withPermission('org:summaries:generate')
    .input(z.object({
      sessionId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`🎯 GenerateSummary called by ${ctx.user?.email} for session ${input.sessionId}`);

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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      console.log(`📋 Session details: _id=${session._id}, session_id=${session.session_id}, status=${session.status}`);

      // ABAC check - includes plan limits for summary generation
      const policy_result = await evaluate_policy('summary:generate', ctx.user, session, {
        organization: ctx.organization,
        org_role: ctx.org_role,
        is_super_admin: ctx.is_super_admin
      });

      if (!policy_result.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: policy_result.reason || 'Cannot generate summary'
        });
      }

      // Allow summary generation for active or closed sessions
      if (session.status !== 'active' && session.status !== 'closed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot generate summary for sessions with status: ${session.status}`
        });
      }

      // Check message count
      console.log(`🔍 Querying messages with session_id: ${session.session_id}`);

      let messageCount = await Message.countDocuments({ session_id: session.session_id });
      console.log(`📊 Message collection count: ${messageCount}`);

      const embeddedMessageCount = session.message_logs?.length || 0;
      console.log(`📊 Embedded message_logs count: ${embeddedMessageCount}`);

      const totalMessageCount = Math.max(messageCount, embeddedMessageCount);
      console.log(`📊 Total effective message count: ${totalMessageCount}`);

      if (totalMessageCount < 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session needs at least 1 message to generate a summary'
        });
      }

      messageCount = messageCount > 0 ? messageCount : embeddedMessageCount;
      console.log(`🔍 Found ${messageCount} messages for session ${session.session_id}`);

      // Create summary record
      const summary = await Summary.create_summary(
        session._id,
        session.room_id._id,
        session.owner_id?._id || session.room_id.owner_id
      );

      // Generate AI summary
      const geminiService = require('../../services/gemini_service');
      await geminiService.generate_chat_summary(session, summary);

      // Attach summary to session
      await session.attach_summary(summary._id);

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'summary:generate',
        category: 'summary',
        resource_type: 'summary',
        resource_id: summary._id,
        description: `Generated summary for session ${session.session_id}`,
        metadata: {
          session_id: session.session_id,
          summary_id: summary._id.toString()
        }
      });

      return {
        success: true,
        message: 'Summary generated successfully',
        summary_id: summary._id
      };
    }),

  /**
   * Delete session
   * @permission org:sessions:delete
   */
  delete: withPermission('org:sessions:delete')
    .input(z.object({
      sessionId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`🗑️ Sessions.delete called by ${ctx.user?.email} for session ${input.sessionId}`);

      let session = null;
      try {
        session = await ChatSession.findById(input.sessionId);
      } catch (error) {
        session = await ChatSession.findOne({ session_id: input.sessionId });
      }

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      // ABAC check
      const policy_result = await evaluate_policy('session:delete', ctx.user, session, {
        organization: ctx.organization,
        org_role: ctx.org_role,
        is_super_admin: ctx.is_super_admin
      });

      if (!policy_result.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: policy_result.reason || 'Cannot delete this session'
        });
      }

      const session_id = session.session_id;
      await session.deleteOne();

      // Audit log
      await AuditLog.log({
        organization_id: ctx.organization?._id,
        user_id: ctx.user._id,
        action: 'session:delete',
        category: 'session',
        resource_type: 'session',
        resource_id: input.sessionId,
        description: `Deleted session ${session_id}`,
        metadata: { session_id }
      });

      return {
        success: true,
        message: 'Session deleted successfully'
      };
    })
});

module.exports = sessionsRouter;
