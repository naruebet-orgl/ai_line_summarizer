/**
 * tRPC Context Setup
 * Creates context for tRPC procedures with database access
 */

const { ChatSession, Room, Summary, Owner, Message } = require('../models');

/**
 * Creates tRPC context with database models
 * @param {Object} opts - Context options from tRPC
 * @returns {Object} - Context object with models and utilities
 */
const createContext = (opts) => {
  console.log('🔧 Creating tRPC context');
  
  return {
    // Database models
    models: {
      ChatSession,
      Room,
      Summary,
      Owner,
      Message
    },
    
    // Request context (if available)
    req: opts?.req,
    res: opts?.res,
    
    // Utilities
    utils: {
      generateId: () => {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
      },
      
      getCurrentTimestamp: () => new Date(),
      
      logActivity: (action, details) => {
        console.log(`📊 tRPC Activity - ${action}:`, details);
      }
    }
  };
};

module.exports = { createContext };