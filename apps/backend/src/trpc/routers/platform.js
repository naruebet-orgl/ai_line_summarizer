/**
 * Platform Admin tRPC Router
 * @description Super admin endpoints for platform-wide management
 * @module trpc/routers/platform
 */

const { z } = require('zod');
const { TRPCError } = require('@trpc/server');
const { router, superAdminProcedure } = require('../index');
const { User, Organization, OrganizationMember, AuditLog } = require('../../models');

/**
 * Platform Admin Router
 * All endpoints require super_admin platform role
 */
const platformRouter = router({
  /**
   * List all organizations
   * @permission platform:orgs:list
   */
  listOrganizations: superAdminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      status: z.enum(['active', 'suspended', 'cancelled']).optional(),
      plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
      search: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, status, plan, search } = input;
      const skip = (page - 1) * limit;

      console.log(`👑 Platform.listOrganizations called by ${ctx.user?.email}`);

      const filter = {};
      if (status) filter.status = status;
      if (plan) filter.plan = plan;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } }
        ];
      }

      const organizations = await Organization.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Organization.countDocuments(filter);

      // Get member counts for each org
      const orgsWithCounts = await Promise.all(
        organizations.map(async (org) => {
          const memberCount = await OrganizationMember.countDocuments({
            organization_id: org._id,
            status: 'active'
          });
          return {
            ...org.toObject(),
            member_count: memberCount
          };
        })
      );

      return {
        organizations: orgsWithCounts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  /**
   * Get organization details
   * @permission platform:orgs:list
   */
  getOrganization: superAdminProcedure
    .input(z.object({
      organizationId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`👑 Platform.getOrganization called by ${ctx.user?.email}`);

      const organization = await Organization.findById(input.organizationId);

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      // Get members
      const members = await OrganizationMember.find({
        organization_id: organization._id
      }).populate('user_id', 'name email platform_role status');

      // Get recent audit logs
      const auditLogs = await AuditLog.find({
        organization_id: organization._id
      })
        .sort({ created_at: -1 })
        .limit(20)
        .populate('user_id', 'name email');

      return {
        organization: organization.toObject(),
        members: members.map(m => ({
          ...m.toObject(),
          user: m.user_id
        })),
        recent_activity: auditLogs
      };
    }),

  /**
   * Suspend organization
   * @permission platform:orgs:suspend
   */
  suspendOrganization: superAdminProcedure
    .input(z.object({
      organizationId: z.string(),
      reason: z.string().min(10)
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`👑 Platform.suspendOrganization called by ${ctx.user?.email}`);

      const organization = await Organization.findById(input.organizationId);

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      if (organization.status === 'suspended') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization is already suspended'
        });
      }

      organization.status = 'suspended';
      await organization.save();

      // Audit log
      await AuditLog.log({
        organization_id: organization._id,
        user_id: ctx.user._id,
        action: 'platform:org:suspend',
        category: 'organization',
        resource_type: 'organization',
        resource_id: organization._id,
        description: `Suspended organization: ${organization.name}`,
        metadata: { reason: input.reason }
      });

      return {
        success: true,
        message: 'Organization suspended successfully'
      };
    }),

  /**
   * Activate organization
   * @permission platform:orgs:suspend
   */
  activateOrganization: superAdminProcedure
    .input(z.object({
      organizationId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`👑 Platform.activateOrganization called by ${ctx.user?.email}`);

      const organization = await Organization.findById(input.organizationId);

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      if (organization.status === 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization is already active'
        });
      }

      organization.status = 'active';
      await organization.save();

      // Audit log
      await AuditLog.log({
        organization_id: organization._id,
        user_id: ctx.user._id,
        action: 'platform:org:activate',
        category: 'organization',
        resource_type: 'organization',
        resource_id: organization._id,
        description: `Activated organization: ${organization.name}`
      });

      return {
        success: true,
        message: 'Organization activated successfully'
      };
    }),

  /**
   * Update organization plan
   * @permission platform:billing:manage
   */
  updateOrganizationPlan: superAdminProcedure
    .input(z.object({
      organizationId: z.string(),
      plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
      expiresAt: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`👑 Platform.updateOrganizationPlan called by ${ctx.user?.email}`);

      const organization = await Organization.findById(input.organizationId);

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      const old_plan = organization.plan;
      organization.plan = input.plan;

      if (input.expiresAt) {
        organization.plan_expires_at = new Date(input.expiresAt);
      }

      // Update limits based on plan
      const { PLAN_LIMITS } = require('../../auth/abac');
      const plan_limits = PLAN_LIMITS[input.plan];
      organization.limits = {
        ...organization.limits,
        ...plan_limits
      };

      await organization.save();

      // Audit log
      await AuditLog.log({
        organization_id: organization._id,
        user_id: ctx.user._id,
        action: 'platform:org:plan:update',
        category: 'billing',
        resource_type: 'organization',
        resource_id: organization._id,
        description: `Updated plan: ${old_plan} -> ${input.plan}`,
        changes: {
          before: { plan: old_plan },
          after: { plan: input.plan, expires_at: input.expiresAt }
        }
      });

      return {
        success: true,
        message: 'Organization plan updated successfully',
        organization: organization.toObject()
      };
    }),

  /**
   * List all users across platform
   * @permission platform:users:list
   */
  listUsers: superAdminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
      platform_role: z.enum(['user', 'support', 'super_admin']).optional(),
      search: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, status, platform_role, search } = input;
      const skip = (page - 1) * limit;

      console.log(`👑 Platform.listUsers called by ${ctx.user?.email}`);

      const filter = {};
      if (status) filter.status = status;
      if (platform_role) filter.platform_role = platform_role;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .select('-password_hash -refresh_tokens')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(filter);

      // Get org memberships for each user
      const usersWithOrgs = await Promise.all(
        users.map(async (user) => {
          const memberships = await OrganizationMember.find({
            user_id: user._id,
            status: 'active'
          }).populate('organization_id', 'name slug');

          return {
            ...user.toObject(),
            organizations: memberships.map(m => ({
              id: m.organization_id._id,
              name: m.organization_id.name,
              slug: m.organization_id.slug,
              role: m.role
            }))
          };
        })
      );

      return {
        users: usersWithOrgs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  /**
   * Get user details
   * @permission platform:users:view
   */
  getUser: superAdminProcedure
    .input(z.object({
      userId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      console.log(`👑 Platform.getUser called by ${ctx.user?.email}`);

      const user = await User.findById(input.userId)
        .select('-password_hash -refresh_tokens');

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      // Get memberships
      const memberships = await OrganizationMember.find({
        user_id: user._id
      }).populate('organization_id', 'name slug status plan');

      // Get recent activity
      const activity = await AuditLog.find({
        user_id: user._id
      })
        .sort({ created_at: -1 })
        .limit(20)
        .populate('organization_id', 'name');

      return {
        user: user.toObject(),
        memberships: memberships.map(m => ({
          organization: m.organization_id,
          role: m.role,
          status: m.status,
          joined_at: m.joined_at
        })),
        recent_activity: activity
      };
    }),

  /**
   * Update user platform role
   * @permission platform:users:ban (same permission level)
   */
  updateUserRole: superAdminProcedure
    .input(z.object({
      userId: z.string(),
      platform_role: z.enum(['user', 'support', 'super_admin'])
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`👑 Platform.updateUserRole called by ${ctx.user?.email}`);

      // Cannot modify own role
      if (input.userId === ctx.user._id.toString()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot modify your own platform role'
        });
      }

      const user = await User.findById(input.userId);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      const old_role = user.platform_role;
      user.platform_role = input.platform_role;
      await user.save();

      // Audit log
      await AuditLog.log({
        user_id: ctx.user._id,
        action: 'platform:user:role:update',
        category: 'user',
        resource_type: 'user',
        resource_id: user._id,
        description: `Updated platform role for ${user.email}: ${old_role} -> ${input.platform_role}`,
        changes: {
          before: { platform_role: old_role },
          after: { platform_role: input.platform_role }
        }
      });

      return {
        success: true,
        message: 'User role updated successfully'
      };
    }),

  /**
   * Ban user from platform
   * @permission platform:users:ban
   */
  banUser: superAdminProcedure
    .input(z.object({
      userId: z.string(),
      reason: z.string().min(10)
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`👑 Platform.banUser called by ${ctx.user?.email}`);

      // Cannot ban self
      if (input.userId === ctx.user._id.toString()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot ban yourself'
        });
      }

      const user = await User.findById(input.userId);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      // Cannot ban other super admins
      if (user.platform_role === 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot ban another super admin'
        });
      }

      user.status = 'suspended';
      user.refresh_tokens = []; // Invalidate all sessions
      await user.save();

      // Audit log
      await AuditLog.log({
        user_id: ctx.user._id,
        action: 'platform:user:ban',
        category: 'user',
        resource_type: 'user',
        resource_id: user._id,
        description: `Banned user: ${user.email}`,
        metadata: { reason: input.reason }
      });

      return {
        success: true,
        message: 'User banned successfully'
      };
    }),

  /**
   * Unban user
   * @permission platform:users:ban
   */
  unbanUser: superAdminProcedure
    .input(z.object({
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`👑 Platform.unbanUser called by ${ctx.user?.email}`);

      const user = await User.findById(input.userId);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      if (user.status !== 'suspended') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is not banned'
        });
      }

      user.status = 'active';
      await user.save();

      // Audit log
      await AuditLog.log({
        user_id: ctx.user._id,
        action: 'platform:user:unban',
        category: 'user',
        resource_type: 'user',
        resource_id: user._id,
        description: `Unbanned user: ${user.email}`
      });

      return {
        success: true,
        message: 'User unbanned successfully'
      };
    }),

  /**
   * Get platform-wide audit logs
   * @permission platform:audit:view
   */
  getAuditLogs: superAdminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(50),
      category: z.enum(['auth', 'user', 'organization', 'member', 'session', 'summary', 'room', 'settings', 'billing', 'system']).optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { page, limit, category, action, startDate, endDate } = input;
      const skip = (page - 1) * limit;

      console.log(`👑 Platform.getAuditLogs called by ${ctx.user?.email}`);

      const filter = {};
      if (category) filter.category = category;
      if (action) filter.action = { $regex: action, $options: 'i' };

      if (startDate || endDate) {
        filter.created_at = {};
        if (startDate) filter.created_at.$gte = new Date(startDate);
        if (endDate) filter.created_at.$lte = new Date(endDate);
      }

      const logs = await AuditLog.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user_id', 'name email')
        .populate('organization_id', 'name slug');

      const total = await AuditLog.countDocuments(filter);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }),

  /**
   * Get platform statistics
   * @permission platform:orgs:list
   */
  getStats: superAdminProcedure
    .query(async ({ ctx }) => {
      console.log(`👑 Platform.getStats called by ${ctx.user?.email}`);

      const [
        totalUsers,
        activeUsers,
        totalOrgs,
        activeOrgs,
        orgsByPlan,
        usersByRole
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        Organization.countDocuments(),
        Organization.countDocuments({ status: 'active' }),
        Organization.aggregate([
          { $group: { _id: '$plan', count: { $sum: 1 } } }
        ]),
        User.aggregate([
          { $group: { _id: '$platform_role', count: { $sum: 1 } } }
        ])
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole.reduce((acc, r) => {
            acc[r._id] = r.count;
            return acc;
          }, {})
        },
        organizations: {
          total: totalOrgs,
          active: activeOrgs,
          byPlan: orgsByPlan.reduce((acc, p) => {
            acc[p._id] = p.count;
            return acc;
          }, {})
        }
      };
    })
});

module.exports = platformRouter;
