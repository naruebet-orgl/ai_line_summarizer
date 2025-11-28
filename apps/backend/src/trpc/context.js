/**
 * tRPC Context Setup
 * @description Creates context for tRPC procedures with database access,
 * authentication, organization context, and utilities
 */

const { ChatSession, Room, Summary, Owner, Message, User, Organization, OrganizationMember, AuditLog } = require('../models');
const jwt_service = require('../services/jwt_service');
const { get_org_context } = require('../auth/middleware');
const { has_permission } = require('../auth/permissions');
const { evaluate_policy } = require('../auth/abac');

/**
 * Extract JWT token from request
 * @param {Object} req - Express request
 * @returns {string|null} Token or null
 */
function extract_token(req) {
  // Check Authorization header
  const auth_header = req?.headers?.authorization;
  if (auth_header && auth_header.startsWith('Bearer ')) {
    return auth_header.substring(7);
  }

  // Check cookies
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }

  return null;
}

/**
 * Extract organization ID from request
 * @param {Object} req - Express request
 * @returns {string|null} Organization ID or null
 */
function extract_org_id(req) {
  // Check header
  if (req?.headers?.['x-organization-id']) {
    return req.headers['x-organization-id'];
  }

  // Check query parameter
  if (req?.query?.organization_id) {
    return req.query.organization_id;
  }

  return null;
}

/**
 * Creates tRPC context with database models, auth, and utilities
 * @param {Object} opts - Context options from tRPC
 * @returns {Promise<Object>} - Context object
 */
const createContext = async (opts) => {
  console.log('🔧 Creating tRPC context');

  const { req, res } = opts || {};

  // Base context
  const context = {
    // Database models
    models: {
      ChatSession,
      Room,
      Summary,
      Owner,
      Message,
      User,
      Organization,
      OrganizationMember,
      AuditLog
    },

    // Request context
    req,
    res,

    // Auth state (will be populated below)
    user: null,
    user_id: null,
    organization: null,
    org_role: null,
    is_super_admin: false,
    is_authenticated: false,

    // Utilities
    utils: {
      /**
       * Generate a random ID
       */
      generate_id: () => {
        return Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
      },

      /**
       * Get current timestamp
       */
      get_current_timestamp: () => new Date(),

      /**
       * Log activity (console)
       */
      log_activity: (action, details) => {
        console.log(`📊 tRPC Activity - ${action}:`, details);
      },

      /**
       * Log to audit log
       */
      log_audit: async (data) => {
        try {
          return await AuditLog.log({
            ...data,
            user_id: context.user?._id || data.user_id,
            organization_id: context.organization?._id || data.organization_id,
            ip_address: req?.ip || req?.headers?.['x-forwarded-for'],
            user_agent: req?.headers?.['user-agent'],
          });
        } catch (error) {
          console.error('❌ Audit log error:', error);
          return null;
        }
      },

      /**
       * Check if user has permission
       */
      check_permission: (permission) => {
        if (context.is_super_admin) return true;
        if (!context.org_role) return false;
        return has_permission(context.org_role, permission);
      },

      /**
       * Evaluate ABAC policy
       */
      evaluate_policy: async (policy_name, resource) => {
        return evaluate_policy(policy_name, context.user, resource, {
          organization: context.organization,
          org_role: context.org_role,
          is_super_admin: context.is_super_admin,
        });
      },

      /**
       * Get client IP
       */
      get_client_ip: () => {
        return req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown';
      }
    }
  };

  // Try to authenticate
  try {
    const token = extract_token(req);

    if (token) {
      const payload = jwt_service.verify_token(token);

      if (payload && payload.type === 'access') {
        const user = await User.findById(payload.user_id);

        if (user && user.status === 'active') {
          context.user = user;
          context.user_id = user._id;
          context.is_authenticated = true;
          context.is_super_admin = user.platform_role === 'super_admin';

          console.log(`✅ tRPC authenticated: ${user.email}`);

          // Try to load organization context
          const org_id = extract_org_id(req) || user.current_organization_id;

          if (org_id) {
            const org_context = await get_org_context(user._id, org_id);

            if (org_context) {
              context.organization = org_context.organization;
              context.org_role = org_context.role;
              console.log(`✅ tRPC org context: ${org_context.organization.name} (${org_context.role})`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('⚠️ tRPC context auth error:', error.message);
    // Continue without auth - some procedures might be public
  }

  return context;
};

module.exports = { createContext };
