/**
 * Auth Module Index
 * @description Exports all auth-related functionality
 * @module auth
 */

const permissions = require('./permissions');
const middleware = require('./middleware');
const abac = require('./abac');

module.exports = {
  // Permissions
  PLATFORM_PERMISSIONS: permissions.PLATFORM_PERMISSIONS,
  ORG_PERMISSIONS: permissions.ORG_PERMISSIONS,
  ROLE_PERMISSIONS: permissions.ROLE_PERMISSIONS,
  has_permission: permissions.has_permission,
  get_role_permissions: permissions.get_role_permissions,
  is_platform_permission: permissions.is_platform_permission,
  is_org_permission: permissions.is_org_permission,
  get_permission_description: permissions.get_permission_description,
  is_valid_role: permissions.is_valid_role,
  get_role_level: permissions.get_role_level,
  is_role_higher_or_equal: permissions.is_role_higher_or_equal,

  // Middleware
  get_org_context: middleware.get_org_context,
  extract_token: middleware.extract_token,
  extract_org_id: middleware.extract_org_id,
  require_auth: middleware.require_auth,
  require_permission: middleware.require_permission,
  load_org_context: middleware.load_org_context,
  require_role: middleware.require_role,
  require_org_admin: middleware.require_org_admin,
  require_org_owner: middleware.require_org_owner,

  // ABAC
  PLAN_LIMITS: abac.PLAN_LIMITS,
  get_plan_limit: abac.get_plan_limit,
  evaluate_policy: abac.evaluate_policy,
  evaluate_all_policies: abac.evaluate_all_policies,
  check_org_status: abac.check_org_status,
};
