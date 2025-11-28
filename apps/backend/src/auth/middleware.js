/**
 * Permission Middleware
 * @description Express and tRPC middleware for permission checking
 * @module auth/middleware
 */

const jwt_service = require('../services/jwt_service');
const { OrganizationMember, User, Organization } = require('../models');
const { has_permission, is_platform_permission } = require('./permissions');

/**
 * Get user's organization context
 * @param {string} user_id - User ID
 * @param {string} org_id - Organization ID
 * @returns {Promise<Object|null>} Organization context or null
 */
async function get_org_context(user_id, org_id) {
  console.log(`🔍 Getting org context: user=${user_id}, org=${org_id}`);

  try {
    const membership = await OrganizationMember.findOne({
      user_id: user_id,
      organization_id: org_id,
      status: 'active'
    }).populate('organization_id');

    if (!membership) {
      console.log(`❌ No active membership found`);
      return null;
    }

    console.log(`✅ Found membership: role=${membership.role}`);

    return {
      organization: membership.organization_id,
      role: membership.role,
      membership: membership
    };
  } catch (error) {
    console.error(`❌ Error getting org context:`, error);
    return null;
  }
}

/**
 * Extract JWT token from request
 * @param {Object} req - Express request
 * @returns {string|null} Token or null
 */
function extract_token(req) {
  // Check Authorization header
  const auth_header = req.headers.authorization;
  if (auth_header && auth_header.startsWith('Bearer ')) {
    return auth_header.substring(7);
  }

  // Check cookies
  if (req.cookies && req.cookies.access_token) {
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
  if (req.headers['x-organization-id']) {
    return req.headers['x-organization-id'];
  }

  // Check query parameter
  if (req.query.organization_id) {
    return req.query.organization_id;
  }

  // Check route parameter
  if (req.params.orgId) {
    return req.params.orgId;
  }

  // Check body
  if (req.body && req.body.organization_id) {
    return req.body.organization_id;
  }

  return null;
}

/**
 * Authentication middleware - verifies JWT and attaches user to request
 * @returns {Function} Express middleware
 */
function require_auth() {
  return async (req, res, next) => {
    console.log(`🔐 Auth middleware: ${req.method} ${req.path}`);

    try {
      const token = extract_token(req);

      if (!token) {
        console.log(`❌ No token provided`);
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify token
      const payload = jwt_service.verify_token(token);

      if (!payload || payload.type !== 'access') {
        console.log(`❌ Invalid or expired token`);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Get user
      const user = await User.findById(payload.user_id);

      if (!user || user.status !== 'active') {
        console.log(`❌ User not found or inactive`);
        return res.status(401).json({
          success: false,
          error: 'User not found or account is not active'
        });
      }

      // Attach user to request
      req.user = user;
      req.user_id = user._id;

      console.log(`✅ Authenticated: ${user.email}`);
      next();
    } catch (error) {
      console.error(`❌ Auth middleware error:`, error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  };
}

/**
 * Permission middleware - checks if user has required permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
function require_permission(permission) {
  return async (req, res, next) => {
    console.log(`🔐 Permission middleware: checking ${permission}`);

    try {
      // Must be authenticated
      if (!req.user) {
        console.log(`❌ Not authenticated`);
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Super admin bypass
      if (req.user.platform_role === 'super_admin') {
        console.log(`✅ Super admin bypass`);
        req.is_super_admin = true;
        return next();
      }

      // Platform permission check
      if (is_platform_permission(permission)) {
        if (!has_permission(req.user.platform_role, permission)) {
          console.log(`❌ Missing platform permission: ${permission}`);
          return res.status(403).json({
            success: false,
            error: `Missing platform permission: ${permission}`
          });
        }
        return next();
      }

      // Organization permission check - requires org context
      const org_id = extract_org_id(req) || req.user.current_organization_id;

      if (!org_id) {
        console.log(`❌ Organization context required`);
        return res.status(400).json({
          success: false,
          error: 'Organization context required'
        });
      }

      // Get org context
      const org_context = await get_org_context(req.user._id, org_id);

      if (!org_context) {
        console.log(`❌ Not a member of organization`);
        return res.status(403).json({
          success: false,
          error: 'Not a member of this organization'
        });
      }

      // Check permission
      if (!has_permission(org_context.role, permission)) {
        console.log(`❌ Missing permission: ${permission}`);
        return res.status(403).json({
          success: false,
          error: `Missing permission: ${permission}`
        });
      }

      // Attach org context to request
      req.organization = org_context.organization;
      req.org_role = org_context.role;
      req.membership = org_context.membership;

      console.log(`✅ Permission granted: ${permission}`);
      next();
    } catch (error) {
      console.error(`❌ Permission middleware error:`, error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

/**
 * Organization context middleware - loads org without permission check
 * @returns {Function} Express middleware
 */
function load_org_context() {
  return async (req, res, next) => {
    console.log(`🏢 Loading org context`);

    try {
      if (!req.user) {
        return next();
      }

      const org_id = extract_org_id(req) || req.user.current_organization_id;

      if (!org_id) {
        return next();
      }

      const org_context = await get_org_context(req.user._id, org_id);

      if (org_context) {
        req.organization = org_context.organization;
        req.org_role = org_context.role;
        req.membership = org_context.membership;
        console.log(`✅ Org context loaded: ${org_context.organization.name}`);
      }

      next();
    } catch (error) {
      console.error(`❌ Load org context error:`, error);
      next();
    }
  };
}

/**
 * Role check middleware - checks if user has one of the specified roles
 * @param {string[]} allowed_roles - Array of allowed roles
 * @returns {Function} Express middleware
 */
function require_role(allowed_roles) {
  return async (req, res, next) => {
    console.log(`🔐 Role check: allowed=${allowed_roles.join(', ')}`);

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Super admin bypass
      if (req.user.platform_role === 'super_admin') {
        req.is_super_admin = true;
        return next();
      }

      // Check platform role
      if (allowed_roles.includes(req.user.platform_role)) {
        return next();
      }

      // Check org role
      if (req.org_role && allowed_roles.includes(req.org_role)) {
        return next();
      }

      // Need to load org context if not already loaded
      const org_id = extract_org_id(req) || req.user.current_organization_id;

      if (org_id && !req.org_role) {
        const org_context = await get_org_context(req.user._id, org_id);

        if (org_context && allowed_roles.includes(org_context.role)) {
          req.organization = org_context.organization;
          req.org_role = org_context.role;
          req.membership = org_context.membership;
          return next();
        }
      }

      console.log(`❌ Role not allowed. User role: ${req.org_role || req.user.platform_role}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient role permissions'
      });
    } catch (error) {
      console.error(`❌ Role check error:`, error);
      return res.status(500).json({
        success: false,
        error: 'Role check failed'
      });
    }
  };
}

/**
 * Owner or admin check - shortcut for common permission pattern
 * @returns {Function} Express middleware
 */
function require_org_admin() {
  return require_role(['super_admin', 'org_owner', 'org_admin']);
}

/**
 * Owner only check
 * @returns {Function} Express middleware
 */
function require_org_owner() {
  return require_role(['super_admin', 'org_owner']);
}

module.exports = {
  get_org_context,
  extract_token,
  extract_org_id,
  require_auth,
  require_permission,
  load_org_context,
  require_role,
  require_org_admin,
  require_org_owner,
};
