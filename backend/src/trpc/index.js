/**
 * tRPC Setup
 * Initializes tRPC with context and procedures
 */

const { initTRPC } = require('@trpc/server');
const { z } = require('zod');
const { createContext } = require('./context');

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

// Middleware for logging
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

// Middleware for admin authorization (for dashboard access)
const adminAuthMiddleware = t.middleware(({ ctx, next }) => {
  // TODO: Implement admin authorization logic with OIDC/SSO
  // For now, allow all requests during development
  console.log('🔐 Admin auth middleware (dev mode - allowing all)');

  return next({
    ctx: {
      ...ctx,
      isAdminAuthorized: true // TODO: Replace with actual auth check
    }
  });
});

// Base procedures
const loggedProcedure = publicProcedure.use(loggingMiddleware);
const adminProcedure = loggedProcedure.use(adminAuthMiddleware);

module.exports = {
  router,
  publicProcedure,
  loggedProcedure,
  adminProcedure,
  createContext
};