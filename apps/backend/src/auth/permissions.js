/**
 * Permission System Constants and Types
 * @description RBAC permission definitions for the platform
 * @module auth/permissions
 */

/**
 * Platform-level permissions (super_admin and support roles)
 */
const PLATFORM_PERMISSIONS = {
  // Organization management
  'platform:orgs:list': 'List all organizations',
  'platform:orgs:create': 'Create new organization',
  'platform:orgs:update': 'Update any organization',
  'platform:orgs:delete': 'Delete organization',
  'platform:orgs:suspend': 'Suspend/activate organization',

  // User management (platform-wide)
  'platform:users:list': 'List all users across platform',
  'platform:users:view': 'View any user details',
  'platform:users:impersonate': 'Login as any user',
  'platform:users:ban': 'Ban user from platform',

  // System
  'platform:settings:manage': 'Manage platform settings',
  'platform:audit:view': 'View platform audit logs',
  'platform:billing:manage': 'Manage billing/subscriptions',
};

/**
 * Organization-level permissions
 */
const ORG_PERMISSIONS = {
  // Organization settings
  'org:settings:view': 'View organization settings',
  'org:settings:update': 'Update organization settings',
  'org:billing:view': 'View billing information',
  'org:billing:manage': 'Manage billing/subscription',

  // Member management
  'org:members:list': 'List organization members',
  'org:members:invite': 'Invite new members',
  'org:members:remove': 'Remove members',
  'org:members:roles': 'Change member roles',

  // Invite codes
  'org:invite_codes:list': 'List invite codes',
  'org:invite_codes:create': 'Create invite codes',
  'org:invite_codes:disable': 'Disable invite codes',

  // Join requests
  'org:join_requests:list': 'List join requests',
  'org:join_requests:approve': 'Approve join requests',
  'org:join_requests:reject': 'Reject join requests',

  // LINE Account management
  'org:line_accounts:list': 'List connected LINE accounts',
  'org:line_accounts:connect': 'Connect new LINE account',
  'org:line_accounts:disconnect': 'Disconnect LINE account',
  'org:line_accounts:settings': 'Manage LINE account settings',

  // Groups/Rooms
  'org:groups:list': 'List LINE groups',
  'org:groups:view': 'View group details',
  'org:groups:settings': 'Manage group settings',
  'org:groups:assign': 'Assign groups to categories',

  // Sessions
  'org:sessions:list': 'List chat sessions',
  'org:sessions:view': 'View session details',
  'org:sessions:delete': 'Delete sessions',
  'org:sessions:export': 'Export session data',

  // Messages
  'org:messages:list': 'List messages',
  'org:messages:view': 'View message content',
  'org:messages:search': 'Search messages',

  // Summaries
  'org:summaries:list': 'List AI summaries',
  'org:summaries:view': 'View summary details',
  'org:summaries:generate': 'Generate new summaries',
  'org:summaries:edit': 'Edit summaries',
  'org:summaries:delete': 'Delete summaries',

  // Analytics
  'org:analytics:view': 'View analytics dashboard',
  'org:analytics:export': 'Export analytics data',

  // Audit
  'org:audit:view': 'View organization audit logs',
};

/**
 * Role to permission mapping
 */
const ROLE_PERMISSIONS = {
  // Platform roles
  super_admin: [
    ...Object.keys(PLATFORM_PERMISSIONS),
    ...Object.keys(ORG_PERMISSIONS),
  ],

  support: [
    'platform:orgs:list',
    'platform:users:list',
    'platform:users:view',
    'platform:audit:view',
    ...Object.keys(ORG_PERMISSIONS).filter(p =>
      p.includes(':view') || p.includes(':list')
    ),
  ],

  // Organization roles
  org_owner: Object.keys(ORG_PERMISSIONS),

  org_admin: Object.keys(ORG_PERMISSIONS).filter(p =>
    !p.includes('billing:manage') &&
    !p.includes(':delete') &&
    !p.includes(':disconnect')
  ),

  org_member: [
    'org:settings:view',
    'org:members:list',
    'org:groups:list',
    'org:groups:view',
    'org:sessions:list',
    'org:sessions:view',
    'org:messages:list',
    'org:messages:view',
    'org:messages:search',
    'org:summaries:list',
    'org:summaries:view',
    'org:summaries:generate',
    'org:analytics:view',
  ],

  org_viewer: [
    'org:settings:view',
    'org:members:list',
    'org:groups:list',
    'org:groups:view',
    'org:sessions:list',
    'org:sessions:view',
    'org:messages:list',
    'org:messages:view',
    'org:summaries:list',
    'org:summaries:view',
    'org:analytics:view',
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - The role to check
 * @param {string} permission - The permission to verify
 * @returns {boolean} True if role has the permission
 */
function has_permission(role, permission) {
  console.log(`🔐 Checking permission: role=${role}, permission=${permission}`);
  const role_permissions = ROLE_PERMISSIONS[role] || [];
  const has_perm = role_permissions.includes(permission);
  console.log(`🔐 Permission check result: ${has_perm}`);
  return has_perm;
}

/**
 * Get all permissions for a role
 * @param {string} role - The role
 * @returns {string[]} Array of permission strings
 */
function get_role_permissions(role) {
  console.log(`📋 Getting permissions for role: ${role}`);
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if permission is platform-level
 * @param {string} permission - The permission to check
 * @returns {boolean} True if platform permission
 */
function is_platform_permission(permission) {
  return permission.startsWith('platform:');
}

/**
 * Check if permission is organization-level
 * @param {string} permission - The permission to check
 * @returns {boolean} True if org permission
 */
function is_org_permission(permission) {
  return permission.startsWith('org:');
}

/**
 * Get permission description
 * @param {string} permission - The permission
 * @returns {string} Description of the permission
 */
function get_permission_description(permission) {
  return PLATFORM_PERMISSIONS[permission] || ORG_PERMISSIONS[permission] || 'Unknown permission';
}

/**
 * Validate that a role string is valid
 * @param {string} role - The role to validate
 * @returns {boolean} True if valid role
 */
function is_valid_role(role) {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
}

/**
 * Get role hierarchy level (higher = more permissions)
 * @param {string} role - The role
 * @returns {number} Hierarchy level
 */
function get_role_level(role) {
  const levels = {
    super_admin: 100,
    support: 90,
    org_owner: 50,
    org_admin: 40,
    org_member: 30,
    org_viewer: 20,
  };
  return levels[role] || 0;
}

/**
 * Check if role A is higher or equal to role B
 * @param {string} roleA - First role
 * @param {string} roleB - Second role
 * @returns {boolean} True if roleA >= roleB
 */
function is_role_higher_or_equal(roleA, roleB) {
  return get_role_level(roleA) >= get_role_level(roleB);
}

module.exports = {
  PLATFORM_PERMISSIONS,
  ORG_PERMISSIONS,
  ROLE_PERMISSIONS,
  has_permission,
  get_role_permissions,
  is_platform_permission,
  is_org_permission,
  get_permission_description,
  is_valid_role,
  get_role_level,
  is_role_higher_or_equal,
};
