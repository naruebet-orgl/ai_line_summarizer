/**
 * tRPC Setup
 * @description Initializes tRPC with context, authentication, and procedures
 */

const { initTRPC, TRPCError } = require('@trpc/server');
const { z } = require('zod');
const { createContext } = require('./context');
const { has_permission } = require('../auth/permissions');

// Initialize tRPC
const t = initTRPC.context().create({
  errorFormatter: ({ shape, error }) => {
    console.error('❌ tRPC Error:', error);
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === 'BAD_REQUEST' && error.cause?.code === 'ZOD_ERROR'
          ? error.cause.zodError.flatten()
          : null,
      },
    };
  },
});

// Export router and procedure helpers
const router = t.router;
const publicProcedure = t.procedure;

// ════════════════════════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════════════════════════

/**
 * Logging middleware - logs all tRPC calls
 */
const loggingMiddleware = t.middleware(({ path, type, next }) => {
  const start = Date.now();
  console.log(`🔄 tRPC ${type} call: ${path}`);

  return next({
    ctx: (ctx) => ({
      ...ctx,
      startTime: start
    })
  });
});

/**
 * Authentication middleware - requires user to be logged in
 */
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.is_authenticated || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  console.log(`🔐 tRPC authenticated: ${ctx.user.email}`);
  return next({ ctx });
});

/**
 * Organization context middleware - requires org context
 */
const orgContextMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.organization) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Organization context required. Include X-Organization-Id header.'
    });
  }

  console.log(`🏢 tRPC org context: ${ctx.organization.name}`);
  return next({ ctx });
});

/**
 * Super admin middleware - requires super_admin role
 */
const superAdminMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.is_super_admin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super admin access required'
    });
  }

  console.log(`👑 tRPC super admin access`);
  return next({ ctx });
});

/**
 * Organization admin middleware - requires org_owner or org_admin role
 */
const orgAdminMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.is_super_admin && !['org_owner', 'org_admin'].includes(ctx.org_role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization admin access required'
    });
  }

  console.log(`🔐 tRPC org admin access`);
  return next({ ctx });
});

/**
 * Create permission middleware factory
 * @param {string} permission - Required permission
 */
const createPermissionMiddleware = (permission) => {
  return t.middleware(async ({ ctx, next }) => {
    // Super admin bypass
    if (ctx.is_super_admin) {
      return next({ ctx });
    }

    // Check org role permission
    if (!ctx.org_role) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization membership required'
      });
    }

    if (!has_permission(ctx.org_role, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing permission: ${permission}`
      });
    }

    console.log(`🔐 tRPC permission granted: ${permission}`);
    return next({ ctx });
  });
};

// ════════════════════════════════════════════════════════════════
// Procedures
// ════════════════════════════════════════════════════════════════

/**
 * Public procedure - no auth required
 */
const loggedProcedure = publicProcedure.use(loggingMiddleware);

/**
 * Authenticated procedure - requires login
 */
const authedProcedure = loggedProcedure.use(authMiddleware);

/**
 * Organization procedure - requires auth + org context
 */
const orgProcedure = authedProcedure.use(orgContextMiddleware);

/**
 * Admin procedure - requires auth + org admin role
 * Legacy: kept for backward compatibility, now checks org admin
 */
const adminProcedure = authedProcedure.use(orgAdminMiddleware);

/**
 * Super admin procedure - requires super_admin platform role
 */
const superAdminProcedure = authedProcedure.use(superAdminMiddleware);

/**
 * Create a procedure with specific permission requirement
 * @param {string} permission - Required permission
 */
const withPermission = (permission) => {
  return orgProcedure.use(createPermissionMiddleware(permission));
};

module.exports = {
  router,
  publicProcedure,
  loggedProcedure,
  authedProcedure,
  orgProcedure,
  adminProcedure,
  superAdminProcedure,
  withPermission,
  createPermissionMiddleware,
  createContext
};
