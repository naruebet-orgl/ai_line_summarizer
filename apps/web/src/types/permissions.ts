/**
 * Permission System Types
 * @description TypeScript types for RBAC permission system
 * @module types/permissions
 */

// ════════════════════════════════════════════════════════════════
// Platform Roles
// ════════════════════════════════════════════════════════════════

export type PlatformRole = 'user' | 'support' | 'super_admin';

// ════════════════════════════════════════════════════════════════
// Organization Roles
// ════════════════════════════════════════════════════════════════

export type OrgRole = 'org_owner' | 'org_admin' | 'org_member' | 'org_viewer';

// ════════════════════════════════════════════════════════════════
// Permission Constants
// ════════════════════════════════════════════════════════════════

/**
 * Platform-level permissions (super_admin and support roles)
 */
export const PLATFORM_PERMISSIONS = {
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
} as const;

/**
 * Organization-level permissions
 */
export const ORG_PERMISSIONS = {
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
} as const;

export type PlatformPermission = keyof typeof PLATFORM_PERMISSIONS;
export type OrgPermission = keyof typeof ORG_PERMISSIONS;
export type Permission = PlatformPermission | OrgPermission;

// ════════════════════════════════════════════════════════════════
// Role to Permission Mapping
// ════════════════════════════════════════════════════════════════

/**
 * Role to permission mapping
 */
export const ROLE_PERMISSIONS: Record<PlatformRole | OrgRole, Permission[]> = {
  // Platform roles
  super_admin: [
    ...Object.keys(PLATFORM_PERMISSIONS) as PlatformPermission[],
    ...Object.keys(ORG_PERMISSIONS) as OrgPermission[],
  ],

  support: [
    'platform:orgs:list',
    'platform:users:list',
    'platform:users:view',
    'platform:audit:view',
    // Read-only org permissions
    'org:settings:view',
    'org:members:list',
    'org:invite_codes:list',
    'org:join_requests:list',
    'org:line_accounts:list',
    'org:groups:list',
    'org:groups:view',
    'org:sessions:list',
    'org:sessions:view',
    'org:messages:list',
    'org:messages:view',
    'org:summaries:list',
    'org:summaries:view',
    'org:analytics:view',
    'org:audit:view',
  ],

  // Organization roles
  org_owner: Object.keys(ORG_PERMISSIONS) as OrgPermission[],

  org_admin: (Object.keys(ORG_PERMISSIONS) as OrgPermission[]).filter(p =>
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

  // Regular user (no special permissions)
  user: [],
};

// ════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: PlatformRole | OrgRole | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: PlatformRole | OrgRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if permission is platform-level
 */
export function isPlatformPermission(permission: Permission): permission is PlatformPermission {
  return permission.startsWith('platform:');
}

/**
 * Check if permission is organization-level
 */
export function isOrgPermission(permission: Permission): permission is OrgPermission {
  return permission.startsWith('org:');
}

/**
 * Get permission description
 */
export function getPermissionDescription(permission: Permission): string {
  return PLATFORM_PERMISSIONS[permission as PlatformPermission] ||
         ORG_PERMISSIONS[permission as OrgPermission] ||
         'Unknown permission';
}

/**
 * Check if role is valid
 */
export function isValidRole(role: string): role is PlatformRole | OrgRole {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: PlatformRole | OrgRole): number {
  const levels: Record<PlatformRole | OrgRole, number> = {
    super_admin: 100,
    support: 90,
    org_owner: 50,
    org_admin: 40,
    org_member: 30,
    org_viewer: 20,
    user: 10,
  };
  return levels[role] || 0;
}

/**
 * Check if role A is higher or equal to role B
 */
export function isRoleHigherOrEqual(roleA: PlatformRole | OrgRole, roleB: PlatformRole | OrgRole): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

// ════════════════════════════════════════════════════════════════
// Plan Types
// ════════════════════════════════════════════════════════════════

export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise';

export interface PlanLimits {
  max_users: number;
  max_line_accounts: number;
  max_groups: number;
  max_messages_per_month: number;
  summaries_per_month: number;
  ai_summaries_enabled: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    max_users: 5,
    max_line_accounts: 1,
    max_groups: 10,
    max_messages_per_month: 1000,
    summaries_per_month: 50,
    ai_summaries_enabled: false,
  },
  starter: {
    max_users: 10,
    max_line_accounts: 2,
    max_groups: 50,
    max_messages_per_month: 10000,
    summaries_per_month: 500,
    ai_summaries_enabled: true,
  },
  professional: {
    max_users: 50,
    max_line_accounts: 10,
    max_groups: 500,
    max_messages_per_month: 100000,
    summaries_per_month: 5000,
    ai_summaries_enabled: true,
  },
  enterprise: {
    max_users: 1000,
    max_line_accounts: 100,
    max_groups: 10000,
    max_messages_per_month: Infinity,
    summaries_per_month: Infinity,
    ai_summaries_enabled: true,
  },
};

// ════════════════════════════════════════════════════════════════
// User Context Types
// ════════════════════════════════════════════════════════════════

export interface UserContext {
  user_id: string;
  email: string;
  name: string;
  platform_role: PlatformRole;
  is_super_admin: boolean;
}

export interface OrgContext {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  org_role: OrgRole;
  plan: PlanType;
  limits: PlanLimits;
}

export interface AuthContext extends UserContext {
  organization?: OrgContext;
}

// ════════════════════════════════════════════════════════════════
// Permission Check Hook Types
// ════════════════════════════════════════════════════════════════

export interface UsePermissionResult {
  hasPermission: (permission: Permission) => boolean;
  canAccess: (permissions: Permission[]) => boolean;
  canAccessAny: (permissions: Permission[]) => boolean;
  role: OrgRole | null;
  platformRole: PlatformRole;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
}
