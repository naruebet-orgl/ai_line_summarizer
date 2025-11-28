/**
 * Main tRPC App Router
 * @description Combines all feature routers for LINE Chat Summarizer AI
 * @module trpc/app
 */

const { router } = require('./index');
const sessionsRouter = require('./routers/sessions');
const summariesRouter = require('./routers/summaries');
const roomsRouter = require('./routers/rooms');
const messagesRouter = require('./routers/messages');
const platformRouter = require('./routers/platform');
const groupsRouter = require('./routers/groups');

/**
 * App Router
 * All routers are combined here for a unified API
 */
const appRouter = router({
  sessions: sessionsRouter,
  summaries: summariesRouter,
  rooms: roomsRouter,
  messages: messagesRouter,
  groups: groupsRouter,     // Group assignment and categorization
  platform: platformRouter  // Super admin only endpoints
});

// Export the router type for client-side type inference
// In a TypeScript project, this would be: export type AppRouter = typeof appRouter;
module.exports = {
  appRouter,
  // For future TypeScript client integration
  AppRouter: appRouter
};