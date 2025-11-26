/**
 * Main tRPC App Router
 * Combines all feature routers for LINE Chat Summarizer AI
 */

const { router } = require('./index');
const sessionsRouter = require('./routers/sessions');
const summariesRouter = require('./routers/summaries');
const roomsRouter = require('./routers/rooms');
const messagesRouter = require('./routers/messages');

const appRouter = router({
  sessions: sessionsRouter,
  summaries: summariesRouter,
  rooms: roomsRouter,
  messages: messagesRouter
});

// Export the router type for client-side type inference
// In a TypeScript project, this would be: export type AppRouter = typeof appRouter;
module.exports = {
  appRouter,
  // For future TypeScript client integration
  AppRouter: appRouter
};