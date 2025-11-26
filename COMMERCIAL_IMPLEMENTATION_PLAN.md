# Commercial Production Implementation Plan

## LINE Chat Summarizer AI - Enterprise Features

**Document Version**: 1.0
**Created**: 2025-11-26
**Branch**: `dev_commercial`

---

## Executive Summary

This document outlines the implementation plan to transform the LINE Chat Summarizer AI into a **production-ready commercial SaaS platform** with:

- **Multi-tenancy**: Organization-level management
- **Access Control**: RBAC + ABAC authorization
- **Administration**: Super Admin / Admin back-office
- **LINE Integration**: Group-to-Organization mapping
- **Authentication**: Enhanced security (partially exists)
- **Internationalization**: Thai (th) and English (en) support

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Implementation Phases](#3-implementation-phases)
4. [Phase 1: Organization Model](#phase-1-organization-model)
5. [Phase 2: Enhanced RBAC + ABAC](#phase-2-enhanced-rbac--abac)
6. [Phase 3: LINE Group Mapping](#phase-3-line-group-mapping)
7. [Phase 4: Admin Back-Office](#phase-4-admin-back-office)
8. [Phase 5: Authentication Enhancements](#phase-5-authentication-enhancements)
9. [Phase 6: Internationalization (i18n)](#phase-6-internationalization-i18n)
10. [Database Migration Strategy](#database-migration-strategy)
11. [API Changes Summary](#api-changes-summary)
12. [Testing Strategy](#testing-strategy)
13. [Deployment Checklist](#deployment-checklist)

---

## 1. Current State Analysis

### What Already Exists ✅

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| User Model | ✅ Complete | `apps/backend/src/models/user.js` | Has `role` field (user/admin/super_admin) |
| JWT Auth | ✅ Complete | `apps/backend/src/services/jwt_service.js` | 24h access, 7d refresh tokens |
| Password Hashing | ✅ Complete | User model | bcrypt with 12 salt rounds |
| Account Lockout | ✅ Complete | User model | 5 failed attempts = 2h lock |
| Email Verification | ✅ Partial | User model | Fields exist, flow not implemented |
| Password Reset | ✅ Partial | User model + routes | Basic flow exists |
| Owner Model | ✅ Complete | `apps/backend/src/models/owner.js` | LINE OA owner (single tenant) |
| Room Model | ✅ Complete | `apps/backend/src/models/room.js` | LINE groups/individual chats |
| Session Model | ✅ Complete | `apps/backend/src/models/chat_session.js` | Chat session with auto-close |
| Protected Routes | ✅ Partial | tRPC `loggedProcedure` | JWT validation, not role-based |
| Login/Register UI | ✅ Complete | `apps/web/src/app/login/page.tsx` | Basic forms |
| Dashboard | ✅ Complete | `apps/web/src/app/dashboard/` | Groups, Sessions, Summaries |

### What Needs to Be Built 🔨

| Feature | Priority | Complexity | Dependencies |
|---------|----------|------------|--------------|
| Organization Model | P0 (Critical) | Medium | None |
| Organization-User Membership | P0 | Medium | Organization Model |
| RBAC System | P0 | High | Organization Model |
| ABAC Policies | P1 | High | RBAC System |
| Permission Middleware | P0 | Medium | RBAC System |
| LINE Group → Org Mapping | P0 | Medium | Organization Model |
| Super Admin Dashboard | P1 | High | Permission Middleware |
| Org Admin Dashboard | P1 | High | Permission Middleware |
| i18n Framework | P2 | Medium | None |
| Thai/English Translations | P2 | Low | i18n Framework |
| Audit Logging | P1 | Medium | Permission Middleware |
| Invitation System | P2 | Medium | Organization Model |
| Multi-tenant Data Isolation | P0 | High | Organization Model |

### Gap Analysis Summary

```
Current Architecture:
┌─────────────────────────────────────────────┐
│                   User                       │
│  (role: user/admin/super_admin)             │
│                    │                         │
│                    ▼                         │
│               Owner (1:1)                    │
│          (LINE Official Account)             │
│                    │                         │
│                    ▼                         │
│               Rooms []                       │
│          (LINE groups/chats)                 │
└─────────────────────────────────────────────┘

Target Architecture:
┌─────────────────────────────────────────────┐
│              Super Admin                     │
│                    │                         │
│         ┌─────────┴─────────┐               │
│         ▼                   ▼               │
│   Organization A      Organization B         │
│         │                   │               │
│    ┌────┴────┐         ┌───┴────┐          │
│    ▼         ▼         ▼        ▼          │
│  Admin    Members    Admin   Members        │
│    │                   │                    │
│    ▼                   ▼                    │
│  LINE OA             LINE OA                │
│    │                   │                    │
│    ▼                   ▼                    │
│  Groups []           Groups []              │
│ (mapped)             (mapped)               │
└─────────────────────────────────────────────┘
```

---

## 2. Architecture Overview

### 2.1 Multi-Tenancy Model

```
┌─────────────────────────────────────────────────────────────┐
│                     MULTI-TENANT HIERARCHY                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Platform Level (Super Admin)                               │
│  ├── Organization 1 (Tenant)                                │
│  │   ├── Owner (LINE Official Account)                      │
│  │   ├── Users (org_admin, org_member, viewer)              │
│  │   ├── LINE Groups (mapped to org)                        │
│  │   ├── Chat Sessions                                      │
│  │   ├── Messages                                           │
│  │   └── Summaries                                          │
│  │                                                          │
│  ├── Organization 2 (Tenant)                                │
│  │   ├── Owner (LINE Official Account)                      │
│  │   ├── Users                                              │
│  │   └── ...                                                │
│  │                                                          │
│  └── Organization N...                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Permission Model (RBAC + ABAC)

#### Role-Based Access Control (RBAC)

```javascript
// Platform-Level Roles
const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',    // Full platform access
  PLATFORM_SUPPORT: 'support',  // Read-only platform access
};

// Organization-Level Roles
const ORG_ROLES = {
  ORG_OWNER: 'org_owner',       // Full org control, billing
  ORG_ADMIN: 'org_admin',       // Manage org users & settings
  ORG_MEMBER: 'org_member',     // Standard access
  ORG_VIEWER: 'org_viewer',     // Read-only access
};
```

#### Attribute-Based Access Control (ABAC)

```javascript
// ABAC Policy Examples
const POLICIES = {
  // Resource ownership
  'session:read': (user, session) => {
    return user.org_id === session.org_id;
  },

  // Time-based access
  'summary:generate': (user, session) => {
    return user.org_id === session.org_id
        && session.status === 'closed';
  },

  // Feature flags
  'ai:advanced_analytics': (user, org) => {
    return org.plan === 'enterprise'
        && user.role !== 'org_viewer';
  }
};
```

### 2.3 Data Isolation Strategy

```sql
-- Every query MUST include organization filter
SELECT * FROM sessions
WHERE org_id = :current_user_org_id
AND status = 'active';

-- No cross-organization data access except super_admin
```

---

## 3. Implementation Phases

### Phase Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                      IMPLEMENTATION TIMELINE                          │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Phase 1: Organization Model                                          │
│  ├── [1.1] Organization schema & model                                │
│  ├── [1.2] Organization-User membership                               │
│  ├── [1.3] Organization-Owner relationship                            │
│  └── [1.4] Database migrations                                        │
│                                                                       │
│  Phase 2: RBAC + ABAC                                                 │
│  ├── [2.1] Permission constants & types                               │
│  ├── [2.2] Role definitions                                           │
│  ├── [2.3] Permission middleware                                      │
│  ├── [2.4] ABAC policy engine                                         │
│  └── [2.5] Update all tRPC procedures                                 │
│                                                                       │
│  Phase 3: LINE Group Mapping                                          │
│  ├── [3.1] Room-Organization relationship                             │
│  ├── [3.2] Group assignment UI                                        │
│  └── [3.3] Auto-mapping webhook updates                               │
│                                                                       │
│  Phase 4: Admin Back-Office                                           │
│  ├── [4.1] Super Admin dashboard                                      │
│  ├── [4.2] Organization admin panel                                   │
│  ├── [4.3] User management UI                                         │
│  ├── [4.4] Audit logs viewer                                          │
│  └── [4.5] Settings management                                        │
│                                                                       │
│  Phase 5: Auth Enhancements                                           │
│  ├── [5.1] Organization selection on login                            │
│  ├── [5.2] Invitation system                                          │
│  ├── [5.3] SSO preparation                                            │
│  └── [5.4] 2FA support                                                │
│                                                                       │
│  Phase 6: Internationalization                                        │
│  ├── [6.1] i18n framework setup                                       │
│  ├── [6.2] Thai translations                                          │
│  ├── [6.3] English translations                                       │
│  └── [6.4] Language switcher UI                                       │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Organization Model

### 1.1 Organization Schema

**File**: `apps/backend/src/models/organization.js`

```javascript
const organizationSchema = new mongoose.Schema({
  // Identity
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/
  },

  // Branding
  logo_url: String,
  primary_color: { type: String, default: '#3B82F6' },

  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'cancelled'],
    default: 'trial'
  },

  // Subscription/Billing
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free'
  },
  plan_expires_at: Date,

  // Limits based on plan
  limits: {
    max_users: { type: Number, default: 5 },
    max_line_accounts: { type: Number, default: 1 },
    max_groups: { type: Number, default: 10 },
    max_messages_per_month: { type: Number, default: 10000 },
    ai_summaries_enabled: { type: Boolean, default: true }
  },

  // Usage tracking
  usage: {
    current_users: { type: Number, default: 0 },
    current_line_accounts: { type: Number, default: 0 },
    current_groups: { type: Number, default: 0 },
    messages_this_month: { type: Number, default: 0 },
    summaries_this_month: { type: Number, default: 0 }
  },

  // Settings
  settings: {
    default_language: { type: String, enum: ['th', 'en'], default: 'th' },
    timezone: { type: String, default: 'Asia/Bangkok' },
    session_auto_close_messages: { type: Number, default: 50 },
    session_auto_close_hours: { type: Number, default: 24 }
  },

  // Metadata
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ status: 1 });
organizationSchema.index({ plan: 1, status: 1 });
organizationSchema.index({ created_at: -1 });
```

### 1.2 Organization Membership Schema

**File**: `apps/backend/src/models/organization_member.js`

```javascript
const organizationMemberSchema = new mongoose.Schema({
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Organization-level role
  role: {
    type: String,
    enum: ['org_owner', 'org_admin', 'org_member', 'org_viewer'],
    default: 'org_member'
  },

  // Invitation status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'removed'],
    default: 'active'
  },

  // Invitation tracking
  invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invited_at: Date,
  joined_at: Date,

  // Last activity
  last_active_at: Date,

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound unique index - user can only be in org once
organizationMemberSchema.index(
  { organization_id: 1, user_id: 1 },
  { unique: true }
);

// Query indexes
organizationMemberSchema.index({ user_id: 1, status: 1 });
organizationMemberSchema.index({ organization_id: 1, role: 1 });
organizationMemberSchema.index({ organization_id: 1, status: 1 });
```

### 1.3 Update User Model

**File**: `apps/backend/src/models/user.js` (modifications)

```javascript
// ADD to existing user schema:

// Platform-level role (for super admins)
platform_role: {
  type: String,
  enum: ['user', 'support', 'super_admin'],
  default: 'user'
},

// Current active organization context
current_organization_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization'
},

// Quick lookup - organizations user belongs to
organizations: [{
  organization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  role: { type: String, enum: ['org_owner', 'org_admin', 'org_member', 'org_viewer'] },
  joined_at: Date
}],

// DEPRECATE (keep for migration):
// role: { ... }  // Will be replaced by platform_role + org membership roles
```

### 1.4 Update Owner Model

**File**: `apps/backend/src/models/owner.js` (modifications)

```javascript
// ADD to existing owner schema:

// Link to organization
organization_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization',
  required: true,
  index: true
},

// Status within organization
status: {
  type: String,
  enum: ['active', 'inactive', 'revoked'],
  default: 'active'
},

// Connected by which user
connected_by: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
connected_at: Date,
```

### Implementation Checklist - Phase 1

- [ ] **1.1.1** Create `organization.js` model file
- [ ] **1.1.2** Add validation methods (slug uniqueness, plan limits)
- [ ] **1.1.3** Add static methods (find_by_slug, get_usage_stats)
- [ ] **1.2.1** Create `organization_member.js` model file
- [ ] **1.2.2** Add membership helper methods (add_member, remove_member, change_role)
- [ ] **1.2.3** Add membership validation (prevent removing last owner)
- [ ] **1.3.1** Update User model with organization fields
- [ ] **1.3.2** Add User helper methods (get_organizations, switch_organization)
- [ ] **1.4.1** Update Owner model with organization_id
- [ ] **1.4.2** Update Owner queries to filter by organization
- [ ] **1.5.1** Update Room model with organization_id
- [ ] **1.5.2** Update ChatSession model with organization_id
- [ ] **1.5.3** Update Message model with organization_id
- [ ] **1.5.4** Update Summary model with organization_id
- [ ] **1.6.1** Create database migration script
- [ ] **1.6.2** Test migration on staging data
- [ ] **1.6.3** Add rollback script

---

## Phase 2: Enhanced RBAC + ABAC

### 2.1 Permission Constants

**File**: `apps/backend/src/auth/permissions.js`

```javascript
/**
 * Permission system constants and types
 * Follows principle of least privilege
 */

// Platform-level permissions (super_admin only)
export const PLATFORM_PERMISSIONS = {
  // Organization management
  'platform:orgs:list': 'List all organizations',
  'platform:orgs:create': 'Create new organization',
  'platform:orgs:update': 'Update any organization',
  'platform:orgs:delete': 'Delete organization',
  'platform:orgs:suspend': 'Suspend/activate organization',

  // User management (platform-wide)
  'platform:users:list': 'List all users across platform',
  'platform:users:impersonate': 'Login as any user',
  'platform:users:ban': 'Ban user from platform',

  // System
  'platform:settings:manage': 'Manage platform settings',
  'platform:audit:view': 'View platform audit logs',
  'platform:billing:manage': 'Manage billing/subscriptions',
};

// Organization-level permissions
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

// Role to permission mapping
export const ROLE_PERMISSIONS = {
  // Platform roles
  super_admin: [
    ...Object.keys(PLATFORM_PERMISSIONS),
    ...Object.keys(ORG_PERMISSIONS), // Super admin has all org permissions too
  ],

  support: [
    'platform:orgs:list',
    'platform:users:list',
    'platform:audit:view',
    ...Object.keys(ORG_PERMISSIONS).filter(p => p.includes(':view') || p.includes(':list')),
  ],

  // Organization roles
  org_owner: Object.keys(ORG_PERMISSIONS), // All org permissions

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
 * Check if role has permission
 */
export function hasPermission(role, permission) {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}
```

### 2.2 Permission Middleware

**File**: `apps/backend/src/auth/middleware.js`

```javascript
const { hasPermission } = require('./permissions');
const { OrganizationMember } = require('../models');
const { TRPCError } = require('@trpc/server');

/**
 * Get user's organization context from request
 */
async function getOrgContext(userId, orgId) {
  // Find membership
  const membership = await OrganizationMember.findOne({
    user_id: userId,
    organization_id: orgId,
    status: 'active'
  }).populate('organization_id');

  if (!membership) {
    return null;
  }

  return {
    organization: membership.organization_id,
    role: membership.role,
    membership
  };
}

/**
 * Create permission-checking middleware for tRPC
 */
function requirePermission(permission) {
  return async ({ ctx, next }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Super admin bypass
    if (user.platform_role === 'super_admin') {
      return next({ ctx: { ...ctx, isSuperAdmin: true } });
    }

    // Platform permission check
    if (permission.startsWith('platform:')) {
      if (!hasPermission(user.platform_role, permission)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Missing platform permission: ${permission}`
        });
      }
      return next({ ctx });
    }

    // Organization permission check
    if (!organizationId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context required'
      });
    }

    const orgContext = await getOrgContext(user._id, organizationId);

    if (!orgContext) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not a member of this organization'
      });
    }

    if (!hasPermission(orgContext.role, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing permission: ${permission}`
      });
    }

    // Add org context to request
    return next({
      ctx: {
        ...ctx,
        organization: orgContext.organization,
        orgRole: orgContext.role,
        membership: orgContext.membership
      }
    });
  };
}

/**
 * Create procedure with permission requirement
 */
function createProtectedProcedure(baseProcedure, permission) {
  return baseProcedure.use(requirePermission(permission));
}

module.exports = {
  getOrgContext,
  requirePermission,
  createProtectedProcedure
};
```

### 2.3 ABAC Policy Engine

**File**: `apps/backend/src/auth/abac.js`

```javascript
/**
 * Attribute-Based Access Control (ABAC) Policy Engine
 * For fine-grained resource-level access control
 */

const policies = {
  /**
   * Session access policy
   * Users can only access sessions from their organization
   */
  'session:access': async (user, session, ctx) => {
    // Super admin can access all
    if (ctx.isSuperAdmin) return true;

    // Must be in same organization
    if (!user.current_organization_id?.equals(session.organization_id)) {
      return false;
    }

    return true;
  },

  /**
   * Session delete policy
   * Only org_owner and org_admin can delete
   */
  'session:delete': async (user, session, ctx) => {
    if (ctx.isSuperAdmin) return true;

    // Must have org context
    if (!ctx.organization) return false;

    // Must be same org
    if (!ctx.organization._id.equals(session.organization_id)) {
      return false;
    }

    // Must be owner or admin
    return ['org_owner', 'org_admin'].includes(ctx.orgRole);
  },

  /**
   * Summary generation policy
   * Check if org has AI summaries enabled and hasn't exceeded limits
   */
  'summary:generate': async (user, session, ctx) => {
    if (ctx.isSuperAdmin) return true;

    const org = ctx.organization;

    // Check if AI summaries are enabled for this plan
    if (!org.limits.ai_summaries_enabled) {
      return { allowed: false, reason: 'AI summaries not enabled for your plan' };
    }

    // Check monthly limit
    const monthlyLimit = getPlanLimit(org.plan, 'summaries_per_month');
    if (org.usage.summaries_this_month >= monthlyLimit) {
      return { allowed: false, reason: 'Monthly summary limit reached' };
    }

    // Session must be closed
    if (session.status !== 'closed') {
      return { allowed: false, reason: 'Session must be closed to generate summary' };
    }

    return { allowed: true };
  },

  /**
   * Member invite policy
   * Check if org hasn't exceeded user limit
   */
  'member:invite': async (user, organization, ctx) => {
    if (ctx.isSuperAdmin) return true;

    // Check user limit
    if (organization.usage.current_users >= organization.limits.max_users) {
      return {
        allowed: false,
        reason: `User limit reached (${organization.limits.max_users} users)`
      };
    }

    return { allowed: true };
  },

  /**
   * LINE account connect policy
   * Check if org hasn't exceeded LINE account limit
   */
  'line_account:connect': async (user, organization, ctx) => {
    if (ctx.isSuperAdmin) return true;

    if (organization.usage.current_line_accounts >= organization.limits.max_line_accounts) {
      return {
        allowed: false,
        reason: `LINE account limit reached (${organization.limits.max_line_accounts} accounts)`
      };
    }

    return { allowed: true };
  },
};

/**
 * Evaluate ABAC policy
 */
async function evaluatePolicy(policyName, user, resource, ctx) {
  const policy = policies[policyName];

  if (!policy) {
    console.warn(`⚠️ Unknown ABAC policy: ${policyName}`);
    return false;
  }

  try {
    const result = await policy(user, resource, ctx);

    // Handle boolean or object result
    if (typeof result === 'boolean') {
      return { allowed: result };
    }

    return result;
  } catch (error) {
    console.error(`❌ ABAC policy error (${policyName}):`, error);
    return { allowed: false, reason: 'Policy evaluation error' };
  }
}

/**
 * Plan limits lookup
 */
function getPlanLimit(plan, limitName) {
  const limits = {
    free: {
      summaries_per_month: 50,
      messages_per_month: 1000,
    },
    starter: {
      summaries_per_month: 500,
      messages_per_month: 10000,
    },
    professional: {
      summaries_per_month: 5000,
      messages_per_month: 100000,
    },
    enterprise: {
      summaries_per_month: Infinity,
      messages_per_month: Infinity,
    },
  };

  return limits[plan]?.[limitName] ?? 0;
}

module.exports = {
  evaluatePolicy,
  getPlanLimit
};
```

### 2.4 Updated tRPC Procedures Example

**File**: `apps/backend/src/trpc/routers/sessions.js` (updated)

```javascript
const { z } = require('zod');
const { router } = require('../index');
const { createProtectedProcedure } = require('../../auth/middleware');
const { evaluatePolicy } = require('../../auth/abac');
const { TRPCError } = require('@trpc/server');

// Create permission-protected procedures
const listSessionsProcedure = createProtectedProcedure(
  loggedProcedure,
  'org:sessions:list'
);

const viewSessionProcedure = createProtectedProcedure(
  loggedProcedure,
  'org:sessions:view'
);

const deleteSessionProcedure = createProtectedProcedure(
  loggedProcedure,
  'org:sessions:delete'
);

const generateSummaryProcedure = createProtectedProcedure(
  loggedProcedure,
  'org:summaries:generate'
);

const sessionsRouter = router({
  list: listSessionsProcedure
    .input(z.object({
      page: z.number().optional().default(1),
      limit: z.number().max(100).optional().default(20),
      status: z.enum(['active', 'closed', 'summarizing']).optional(),
      line_room_id: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organization, isSuperAdmin } = ctx;

      // Build query with organization filter
      const filter = {
        // CRITICAL: Always filter by organization
        ...(isSuperAdmin ? {} : { organization_id: organization._id }),
        ...(input.status && { status: input.status }),
        ...(input.line_room_id && { line_room_id: input.line_room_id }),
      };

      const sessions = await ChatSession.find(filter)
        .sort({ start_time: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit);

      const total = await ChatSession.countDocuments(filter);

      return {
        sessions: sessions.map(s => s.get_conversation_summary()),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit)
        }
      };
    }),

  delete: deleteSessionProcedure
    .input(z.object({
      session_id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ChatSession.findOne({ session_id: input.session_id });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      // ABAC check
      const policyResult = await evaluatePolicy(
        'session:delete',
        ctx.user,
        session,
        ctx
      );

      if (!policyResult.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: policyResult.reason || 'Cannot delete this session'
        });
      }

      await session.deleteOne();

      // Log audit event
      await ctx.utils.logActivity({
        type: 'session:deleted',
        user_id: ctx.user._id,
        organization_id: ctx.organization._id,
        resource_id: session._id,
        metadata: { session_id: input.session_id }
      });

      return { success: true };
    }),

  generateSummary: generateSummaryProcedure
    .input(z.object({
      session_id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ChatSession.findOne({ session_id: input.session_id });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        });
      }

      // ABAC check - includes plan limits
      const policyResult = await evaluatePolicy(
        'summary:generate',
        ctx.user,
        session,
        ctx
      );

      if (!policyResult.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: policyResult.reason || 'Cannot generate summary'
        });
      }

      // Generate summary...
      const summary = await GeminiService.generateSummary(session);

      // Increment usage counter
      await Organization.findByIdAndUpdate(
        ctx.organization._id,
        { $inc: { 'usage.summaries_this_month': 1 } }
      );

      return summary;
    }),
});

module.exports = sessionsRouter;
```

### Implementation Checklist - Phase 2

- [ ] **2.1.1** Create `permissions.js` with all constants
- [ ] **2.1.2** Create permission TypeScript types for frontend
- [ ] **2.2.1** Create `middleware.js` with requirePermission
- [ ] **2.2.2** Create `getOrgContext` helper
- [ ] **2.2.3** Add organization header parsing to tRPC context
- [ ] **2.3.1** Create `abac.js` policy engine
- [ ] **2.3.2** Implement session access policies
- [ ] **2.3.3** Implement summary generation policies
- [ ] **2.3.4** Implement member invite policies
- [ ] **2.4.1** Update sessions router with permissions
- [ ] **2.4.2** Update rooms router with permissions
- [ ] **2.4.3** Update messages router with permissions
- [ ] **2.4.4** Update summaries router with permissions
- [ ] **2.5.1** Create organization router with admin procedures
- [ ] **2.5.2** Create platform admin router (super_admin only)
- [ ] **2.6.1** Add audit logging to all mutations
- [ ] **2.6.2** Create audit log model and storage

---

## Phase 3: LINE Group Mapping

### 3.1 Room-Organization Relationship

**Update**: `apps/backend/src/models/room.js`

```javascript
// ADD to room schema:

organization_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization',
  required: true,
  index: true
},

// Group assignment (for internal organization)
assignment: {
  category: {
    type: String,
    enum: ['sales', 'support', 'operations', 'marketing', 'other', 'unassigned'],
    default: 'unassigned'
  },
  tags: [String],
  custom_name: String, // Override LINE group name
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  assigned_to: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notes: String
},

// Add compound index for org + room queries
roomSchema.index({ organization_id: 1, line_room_id: 1 }, { unique: true });
roomSchema.index({ organization_id: 1, 'assignment.category': 1 });
```

### 3.2 Group Assignment API

**File**: `apps/backend/src/trpc/routers/groups.js`

```javascript
const groupsRouter = router({
  // List groups for organization
  list: createProtectedProcedure(loggedProcedure, 'org:groups:list')
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const filter = {
        organization_id: ctx.organization._id,
        type: 'group',
        ...(input.category && { 'assignment.category': input.category }),
        ...(input.search && {
          $or: [
            { name: { $regex: input.search, $options: 'i' } },
            { 'assignment.custom_name': { $regex: input.search, $options: 'i' } }
          ]
        })
      };

      const groups = await Room.find(filter)
        .sort({ 'statistics.last_activity_at': -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit);

      return {
        groups: groups.map(g => ({
          ...g.toJSON(),
          display_name: g.assignment.custom_name || g.name
        })),
        total: await Room.countDocuments(filter)
      };
    }),

  // Assign group to category
  assign: createProtectedProcedure(loggedProcedure, 'org:groups:assign')
    .input(z.object({
      room_id: z.string(),
      category: z.enum(['sales', 'support', 'operations', 'marketing', 'other']),
      tags: z.array(z.string()).optional(),
      custom_name: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
      assigned_to: z.array(z.string()).optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await Room.findOne({
        _id: input.room_id,
        organization_id: ctx.organization._id
      });

      if (!room) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      room.assignment = {
        ...room.assignment,
        category: input.category,
        ...(input.tags && { tags: input.tags }),
        ...(input.custom_name && { custom_name: input.custom_name }),
        ...(input.priority && { priority: input.priority }),
        ...(input.assigned_to && { assigned_to: input.assigned_to }),
        ...(input.notes !== undefined && { notes: input.notes }),
      };

      await room.save();

      await ctx.utils.logActivity({
        type: 'group:assigned',
        organization_id: ctx.organization._id,
        user_id: ctx.user._id,
        resource_id: room._id,
        metadata: { category: input.category }
      });

      return room;
    }),

  // Bulk assign groups
  bulkAssign: createProtectedProcedure(loggedProcedure, 'org:groups:assign')
    .input(z.object({
      room_ids: z.array(z.string()),
      category: z.enum(['sales', 'support', 'operations', 'marketing', 'other']),
      tags: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await Room.updateMany(
        {
          _id: { $in: input.room_ids },
          organization_id: ctx.organization._id
        },
        {
          $set: {
            'assignment.category': input.category,
            ...(input.tags && { 'assignment.tags': input.tags })
          }
        }
      );

      return {
        updated: result.modifiedCount,
        message: `${result.modifiedCount} groups assigned to ${input.category}`
      };
    })
});
```

### 3.3 Webhook Auto-Mapping

**Update**: `apps/backend/src/handlers/line_webhook_handler.js`

```javascript
// When new group message arrives, auto-map to organization

async handle_message_event(event, owner) {
  const { source } = event;

  // Get or create room with organization context
  let room = await Room.findOne({
    line_room_id: source.groupId || source.roomId || source.userId,
    organization_id: owner.organization_id // CRITICAL: org filter
  });

  if (!room) {
    // Create new room mapped to organization
    room = await Room.create({
      owner_id: owner._id,
      organization_id: owner.organization_id, // Auto-map to org
      line_room_id: source.groupId || source.roomId || source.userId,
      name: await this.get_room_name(source),
      type: source.type === 'group' ? 'group' : 'individual',
      // Default assignment
      assignment: {
        category: 'unassigned',
        tags: [],
        priority: 'normal'
      }
    });

    console.log(`🏢 Auto-mapped new group to org: ${owner.organization_id}`);
  }

  // Continue with message processing...
}
```

### Implementation Checklist - Phase 3

- [ ] **3.1.1** Update Room model with organization_id
- [ ] **3.1.2** Update Room model with assignment fields
- [ ] **3.1.3** Add migration to set organization_id on existing rooms
- [ ] **3.2.1** Create groups router with list/assign endpoints
- [ ] **3.2.2** Create bulk assignment endpoint
- [ ] **3.2.3** Add category statistics endpoint
- [ ] **3.3.1** Update webhook handler for auto-mapping
- [ ] **3.3.2** Update room creation to include organization_id
- [ ] **3.4.1** Create Group Assignment UI component
- [ ] **3.4.2** Add category filter to groups page
- [ ] **3.4.3** Add bulk selection and assignment UI
- [ ] **3.4.4** Add group settings modal

---

## Phase 4: Admin Back-Office

### 4.1 Super Admin Dashboard

**Routes**: `/admin/*` (super_admin only)

```
/admin
├── /dashboard              # Platform overview & stats
├── /organizations          # List all organizations
│   ├── /[orgId]           # Organization details
│   ├── /[orgId]/users     # Organization users
│   └── /[orgId]/settings  # Organization settings
├── /users                  # All platform users
│   └── /[userId]          # User details
├── /billing               # Subscription management
├── /audit                 # Platform audit logs
└── /settings              # Platform settings
```

**Features**:
- Organization CRUD (create, suspend, delete)
- User management (ban, impersonate)
- Billing/subscription management
- Platform-wide audit logs
- System health monitoring
- Usage analytics across all orgs

### 4.2 Organization Admin Panel

**Routes**: `/settings/*` (org_admin + org_owner)

```
/settings
├── /organization          # Org profile & branding
├── /members               # Team member management
│   ├── /invite           # Invite new member
│   └── /[memberId]       # Member details/role
├── /line-accounts         # Connected LINE OAs
│   └── /connect          # Connect new LINE OA
├── /groups                # Group assignment settings
├── /billing               # Subscription & usage
├── /api-keys              # API access (future)
└── /audit                 # Organization audit logs
```

### 4.3 Component Structure

**File**: `apps/web/src/app/settings/members/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { InviteMemberDialog } from '@/components/settings/invite-member-dialog';
import { EditRoleDialog } from '@/components/settings/edit-role-dialog';

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  role: 'org_owner' | 'org_admin' | 'org_member' | 'org_viewer';
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
  last_active_at?: string;
}

export default function MembersPage() {
  const { user, organization, hasPermission } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const canInvite = hasPermission('org:members:invite');
  const canManageRoles = hasPermission('org:members:roles');
  const canRemove = hasPermission('org:members:remove');

  useEffect(() => {
    fetchMembers();
  }, [organization?.id]);

  const fetchMembers = async () => {
    const response = await fetch('/api/trpc/organization.members.list');
    const data = await response.json();
    setMembers(data.members);
    setLoading(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    await fetch('/api/trpc/organization.members.remove', {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId })
    });

    fetchMembers();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'org_owner': return 'destructive';
      case 'org_admin': return 'default';
      case 'org_member': return 'secondary';
      case 'org_viewer': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-gray-500">
            Manage your organization members and their roles
          </p>
        </div>

        {canInvite && (
          <Button onClick={() => setShowInviteDialog(true)}>
            Invite Member
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Last Active</TableCell>
                {(canManageRoles || canRemove) && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user.avatar_url || '/default-avatar.png'}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{member.user.name}</div>
                        <div className="text-sm text-gray-500">{member.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role.replace('org_', '').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {member.last_active_at
                      ? new Date(member.last_active_at).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  {(canManageRoles || canRemove) && (
                    <TableCell>
                      <div className="flex gap-2">
                        {canManageRoles && member.role !== 'org_owner' && (
                          <EditRoleDialog
                            member={member}
                            onUpdate={fetchMembers}
                          />
                        )}
                        {canRemove && member.role !== 'org_owner' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvited={fetchMembers}
      />
    </div>
  );
}
```

### 4.4 Audit Log Model

**File**: `apps/backend/src/models/audit_log.js`

```javascript
const auditLogSchema = new mongoose.Schema({
  // Context
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Event
  action: {
    type: String,
    required: true,
    index: true
    // Examples: 'user:login', 'session:delete', 'member:invite', 'settings:update'
  },

  // Resource
  resource_type: {
    type: String,
    enum: ['user', 'organization', 'session', 'summary', 'room', 'member', 'settings'],
  },
  resource_id: mongoose.Schema.Types.ObjectId,

  // Details
  metadata: mongoose.Schema.Types.Mixed, // Flexible JSON for action-specific data

  // Request context
  ip_address: String,
  user_agent: String,

  // Result
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success'
  },
  error_message: String,

  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Auto-expire after 90 days (configurable)
  expireAfterSeconds: 90 * 24 * 60 * 60
});

// Compound indexes for common queries
auditLogSchema.index({ organization_id: 1, created_at: -1 });
auditLogSchema.index({ user_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1, created_at: -1 });
auditLogSchema.index({ organization_id: 1, action: 1, created_at: -1 });
```

### Implementation Checklist - Phase 4

- [ ] **4.1.1** Create `/admin` layout with super_admin guard
- [ ] **4.1.2** Create platform dashboard with stats
- [ ] **4.1.3** Create organizations list page
- [ ] **4.1.4** Create organization detail/edit pages
- [ ] **4.1.5** Create platform users page
- [ ] **4.1.6** Create platform audit logs page
- [ ] **4.2.1** Create `/settings` layout with org context
- [ ] **4.2.2** Create organization profile page
- [ ] **4.2.3** Create members management page
- [ ] **4.2.4** Create member invite dialog
- [ ] **4.2.5** Create role edit dialog
- [ ] **4.2.6** Create LINE accounts management page
- [ ] **4.2.7** Create group assignment page
- [ ] **4.2.8** Create billing/usage page
- [ ] **4.2.9** Create org audit logs page
- [ ] **4.3.1** Create AuditLog model
- [ ] **4.3.2** Add logActivity utility function
- [ ] **4.3.3** Integrate audit logging in all mutations
- [ ] **4.3.4** Create audit log viewer component
- [ ] **4.3.5** Add export functionality

---

## Phase 5: Authentication Enhancements

### 5.1 Organization Selection on Login

**Flow**:
1. User logs in with email/password
2. If user belongs to multiple organizations:
   - Show organization selector
   - User chooses which org to access
   - Set `current_organization_id` in session
3. If user belongs to one org:
   - Auto-select that organization
4. If user belongs to no orgs:
   - Show "No organizations" message with join/create options

**File**: `apps/web/src/app/login/page.tsx` (updated)

```tsx
// After successful login, check organizations
const handleLogin = async (email: string, password: string) => {
  const result = await login(email, password);

  if (result.success) {
    const orgs = result.user.organizations || [];

    if (orgs.length === 0) {
      // No organizations - show join/create options
      router.push('/onboarding');
    } else if (orgs.length === 1) {
      // Single org - auto-select
      await selectOrganization(orgs[0].organization_id);
      router.push('/dashboard');
    } else {
      // Multiple orgs - show selector
      setShowOrgSelector(true);
      setAvailableOrgs(orgs);
    }
  }
};
```

### 5.2 Invitation System

**Email Invite Flow**:
1. Org admin creates invitation (email + role)
2. System sends email with invite link
3. New user: Clicks link → Register → Auto-join org
4. Existing user: Clicks link → Login → Auto-join org
5. Invitation expires after 7 days

**File**: `apps/backend/src/models/invitation.js`

```javascript
const invitationSchema = new mongoose.Schema({
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true
  },

  role: {
    type: String,
    enum: ['org_admin', 'org_member', 'org_viewer'],
    default: 'org_member'
  },

  token: {
    type: String,
    required: true,
    unique: true
  },

  invited_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending'
  },

  expires_at: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },

  accepted_at: Date,
  accepted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  created_at: { type: Date, default: Date.now }
});

// Index for lookups
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ organization_id: 1, email: 1 });
invitationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // Auto-delete
```

### 5.3 SSO Preparation

**Supported Providers** (future):
- Google Workspace
- Microsoft Entra ID (Azure AD)
- SAML 2.0 (custom enterprise)

**Database Fields** (add to User model):

```javascript
// SSO fields
sso_provider: {
  type: String,
  enum: ['local', 'google', 'microsoft', 'saml'],
  default: 'local'
},
sso_provider_id: String, // External provider user ID
sso_metadata: mongoose.Schema.Types.Mixed,
```

### 5.4 Two-Factor Authentication (2FA)

**Implementation**:
- TOTP (Time-based One-Time Password)
- Backup codes (10 single-use codes)
- SMS fallback (optional)

**Database Fields** (add to User model):

```javascript
// 2FA fields
two_factor_enabled: { type: Boolean, default: false },
two_factor_secret: { type: String, select: false }, // Encrypted TOTP secret
two_factor_backup_codes: [{
  code: String, // Hashed
  used: Boolean,
  used_at: Date
}],
two_factor_verified_at: Date,
```

### Implementation Checklist - Phase 5

- [ ] **5.1.1** Create organization selector component
- [ ] **5.1.2** Update login flow for multi-org users
- [ ] **5.1.3** Add organization switch functionality
- [ ] **5.1.4** Update auth context with current org
- [ ] **5.2.1** Create Invitation model
- [ ] **5.2.2** Create invitation API endpoints
- [ ] **5.2.3** Create email templates for invitations
- [ ] **5.2.4** Create invite acceptance page
- [ ] **5.2.5** Handle existing vs new user invitation flow
- [ ] **5.3.1** Add SSO fields to User model
- [ ] **5.3.2** Create SSO configuration model
- [ ] **5.3.3** Prepare OAuth2 callback routes (for future)
- [ ] **5.4.1** Add 2FA fields to User model
- [ ] **5.4.2** Create TOTP setup API
- [ ] **5.4.3** Create 2FA verification middleware
- [ ] **5.4.4** Create 2FA setup UI
- [ ] **5.4.5** Create backup codes management

---

## Phase 6: Internationalization (i18n)

### 6.1 Framework Setup

**Package**: `next-intl` (recommended for Next.js 15)

**Installation**:
```bash
cd apps/web
pnpm add next-intl
```

**Configuration**: `apps/web/next.config.js`

```javascript
const withNextIntl = require('next-intl/plugin')();

module.exports = withNextIntl({
  // existing config...
});
```

### 6.2 File Structure

```
apps/web/
├── messages/
│   ├── th.json          # Thai translations
│   └── en.json          # English translations
├── src/
│   ├── i18n.ts          # i18n configuration
│   └── middleware.ts    # Locale detection middleware
```

### 6.3 Translation Files

**File**: `apps/web/messages/th.json`

```json
{
  "common": {
    "loading": "กำลังโหลด...",
    "error": "เกิดข้อผิดพลาด",
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "delete": "ลบ",
    "edit": "แก้ไข",
    "search": "ค้นหา",
    "filter": "กรอง",
    "sort": "เรียงลำดับ",
    "actions": "การดำเนินการ",
    "status": "สถานะ",
    "active": "ใช้งาน",
    "inactive": "ไม่ใช้งาน",
    "pending": "รอดำเนินการ"
  },
  "auth": {
    "login": "เข้าสู่ระบบ",
    "logout": "ออกจากระบบ",
    "register": "ลงทะเบียน",
    "email": "อีเมล",
    "password": "รหัสผ่าน",
    "confirmPassword": "ยืนยันรหัสผ่าน",
    "forgotPassword": "ลืมรหัสผ่าน?",
    "resetPassword": "รีเซ็ตรหัสผ่าน",
    "loginSuccess": "เข้าสู่ระบบสำเร็จ",
    "loginError": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "selectOrganization": "เลือกองค์กร"
  },
  "dashboard": {
    "title": "แดชบอร์ด",
    "groups": "กลุ่ม",
    "sessions": "เซสชัน",
    "messages": "ข้อความ",
    "summaries": "สรุป",
    "totalGroups": "กลุ่มทั้งหมด",
    "activeGroups": "กลุ่มที่ใช้งาน",
    "totalSessions": "เซสชันทั้งหมด",
    "activeSessions": "เซสชันที่ใช้งาน",
    "totalMessages": "ข้อความทั้งหมด",
    "aiSummaries": "สรุป AI"
  },
  "groups": {
    "title": "กลุ่ม LINE",
    "searchPlaceholder": "ค้นหาชื่อกลุ่ม...",
    "sortByActivity": "เรียงตามกิจกรรม",
    "sortByName": "เรียงตามชื่อ",
    "sortByMessages": "เรียงตามจำนวนข้อความ",
    "noGroups": "ไม่พบกลุ่ม",
    "category": "หมวดหมู่",
    "unassigned": "ยังไม่กำหนด",
    "sales": "ฝ่ายขาย",
    "support": "ฝ่ายสนับสนุน",
    "operations": "ฝ่ายปฏิบัติการ",
    "marketing": "ฝ่ายการตลาด",
    "other": "อื่นๆ"
  },
  "sessions": {
    "title": "เซสชันสนทนา",
    "status": {
      "active": "กำลังใช้งาน",
      "closed": "ปิดแล้ว",
      "summarizing": "กำลังสรุป"
    },
    "messageCount": "{count} ข้อความ",
    "generateSummary": "สร้างสรุป",
    "viewMessages": "ดูข้อความ",
    "noSessions": "ไม่พบเซสชัน"
  },
  "summaries": {
    "title": "สรุปโดย AI",
    "generating": "กำลังสร้างสรุป...",
    "generated": "สร้างสรุปเมื่อ",
    "keyTopics": "หัวข้อสำคัญ",
    "analysis": "การวิเคราะห์",
    "regenerate": "สร้างใหม่"
  },
  "settings": {
    "title": "ตั้งค่า",
    "organization": "องค์กร",
    "members": "สมาชิก",
    "lineAccounts": "บัญชี LINE",
    "billing": "การเรียกเก็บเงิน",
    "audit": "บันทึกการใช้งาน",
    "profile": "โปรไฟล์",
    "language": "ภาษา",
    "timezone": "เขตเวลา"
  },
  "members": {
    "title": "สมาชิกทีม",
    "invite": "เชิญสมาชิก",
    "inviteTitle": "เชิญสมาชิกใหม่",
    "inviteDescription": "ส่งคำเชิญทางอีเมลเพื่อเข้าร่วมองค์กร",
    "role": "บทบาท",
    "roles": {
      "org_owner": "เจ้าของ",
      "org_admin": "ผู้ดูแล",
      "org_member": "สมาชิก",
      "org_viewer": "ผู้ชม"
    },
    "joinedAt": "เข้าร่วมเมื่อ",
    "lastActive": "ใช้งานล่าสุด",
    "remove": "นำออก",
    "changeRole": "เปลี่ยนบทบาท"
  },
  "errors": {
    "unauthorized": "คุณไม่มีสิทธิ์เข้าถึง",
    "notFound": "ไม่พบข้อมูล",
    "serverError": "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
    "networkError": "ไม่สามารถเชื่อมต่อได้",
    "validationError": "ข้อมูลไม่ถูกต้อง",
    "limitExceeded": "เกินขีดจำกัดของแผน"
  }
}
```

**File**: `apps/web/messages/en.json`

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "actions": "Actions",
    "status": "Status",
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "register": "Register",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "loginSuccess": "Login successful",
    "loginError": "Invalid email or password",
    "selectOrganization": "Select Organization"
  },
  "dashboard": {
    "title": "Dashboard",
    "groups": "Groups",
    "sessions": "Sessions",
    "messages": "Messages",
    "summaries": "Summaries",
    "totalGroups": "Total Groups",
    "activeGroups": "Active Groups",
    "totalSessions": "Total Sessions",
    "activeSessions": "Active Sessions",
    "totalMessages": "Total Messages",
    "aiSummaries": "AI Summaries"
  },
  "groups": {
    "title": "LINE Groups",
    "searchPlaceholder": "Search group name...",
    "sortByActivity": "Sort by Activity",
    "sortByName": "Sort by Name",
    "sortByMessages": "Sort by Messages",
    "noGroups": "No groups found",
    "category": "Category",
    "unassigned": "Unassigned",
    "sales": "Sales",
    "support": "Support",
    "operations": "Operations",
    "marketing": "Marketing",
    "other": "Other"
  },
  "sessions": {
    "title": "Chat Sessions",
    "status": {
      "active": "Active",
      "closed": "Closed",
      "summarizing": "Summarizing"
    },
    "messageCount": "{count} messages",
    "generateSummary": "Generate Summary",
    "viewMessages": "View Messages",
    "noSessions": "No sessions found"
  },
  "summaries": {
    "title": "AI Summaries",
    "generating": "Generating summary...",
    "generated": "Generated on",
    "keyTopics": "Key Topics",
    "analysis": "Analysis",
    "regenerate": "Regenerate"
  },
  "settings": {
    "title": "Settings",
    "organization": "Organization",
    "members": "Members",
    "lineAccounts": "LINE Accounts",
    "billing": "Billing",
    "audit": "Audit Logs",
    "profile": "Profile",
    "language": "Language",
    "timezone": "Timezone"
  },
  "members": {
    "title": "Team Members",
    "invite": "Invite Member",
    "inviteTitle": "Invite New Member",
    "inviteDescription": "Send an email invitation to join the organization",
    "role": "Role",
    "roles": {
      "org_owner": "Owner",
      "org_admin": "Admin",
      "org_member": "Member",
      "org_viewer": "Viewer"
    },
    "joinedAt": "Joined",
    "lastActive": "Last Active",
    "remove": "Remove",
    "changeRole": "Change Role"
  },
  "errors": {
    "unauthorized": "You don't have permission to access this",
    "notFound": "Not found",
    "serverError": "Server error occurred",
    "networkError": "Unable to connect",
    "validationError": "Invalid data",
    "limitExceeded": "Plan limit exceeded"
  }
}
```

### 6.4 Usage in Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function GroupsPage() {
  const t = useTranslations('groups');

  return (
    <div>
      <h1>{t('title')}</h1>
      <input placeholder={t('searchPlaceholder')} />

      <select>
        <option value="sales">{t('sales')}</option>
        <option value="support">{t('support')}</option>
      </select>
    </div>
  );
}
```

### 6.5 Language Switcher

```tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    router.push(pathname, { locale: newLocale });
  };

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value)}
    >
      <option value="th">🇹🇭 ไทย</option>
      <option value="en">🇺🇸 English</option>
    </select>
  );
}
```

### Implementation Checklist - Phase 6

- [ ] **6.1.1** Install next-intl package
- [ ] **6.1.2** Configure next.config.js for i18n
- [ ] **6.1.3** Create i18n.ts configuration
- [ ] **6.1.4** Create middleware for locale detection
- [ ] **6.2.1** Create th.json translation file
- [ ] **6.2.2** Create en.json translation file
- [ ] **6.3.1** Update all page components with useTranslations
- [ ] **6.3.2** Update all form labels and buttons
- [ ] **6.3.3** Update all error messages
- [ ] **6.3.4** Update email templates (backend)
- [ ] **6.4.1** Create LanguageSwitcher component
- [ ] **6.4.2** Add language switcher to header/settings
- [ ] **6.4.3** Persist language preference in user profile
- [ ] **6.4.4** Sync language with organization default

---

## Database Migration Strategy

### Migration Scripts

**Location**: `apps/backend/scripts/migrations/`

```
scripts/migrations/
├── 001_add_organization_model.js
├── 002_add_organization_to_users.js
├── 003_add_organization_to_rooms.js
├── 004_add_organization_to_sessions.js
├── 005_create_default_organization.js
├── 006_migrate_existing_data.js
└── rollback/
    ├── 001_rollback.js
    └── ...
```

### Migration Order

1. **Create Organization collection** (empty)
2. **Add organization_id to existing models** (nullable initially)
3. **Create default organization** for existing data
4. **Migrate existing data** to default organization
5. **Make organization_id required** (update schema)
6. **Add indexes** for new queries

### Sample Migration Script

**File**: `apps/backend/scripts/migrations/005_create_default_organization.js`

```javascript
/**
 * Migration: Create default organization for existing data
 *
 * Run: node scripts/migrations/005_create_default_organization.js
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const { Organization, Owner, User, Room, ChatSession, Message } = require('../../src/models');

async function migrate() {
  console.log('🚀 Starting migration: Create default organization');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Check if default org exists
  let defaultOrg = await Organization.findOne({ slug: 'default' });

  if (!defaultOrg) {
    // Find first owner (LINE OA)
    const firstOwner = await Owner.findOne();

    if (!firstOwner) {
      console.log('⚠️ No owners found, skipping migration');
      return;
    }

    // Create default organization
    defaultOrg = await Organization.create({
      name: 'Default Organization',
      slug: 'default',
      status: 'active',
      plan: 'professional', // Grant professional for existing users
      limits: {
        max_users: 100,
        max_line_accounts: 10,
        max_groups: 1000,
        max_messages_per_month: 1000000,
        ai_summaries_enabled: true
      },
      settings: {
        default_language: 'th',
        timezone: 'Asia/Bangkok'
      }
    });

    console.log(`✅ Created default organization: ${defaultOrg._id}`);
  } else {
    console.log(`ℹ️ Default organization already exists: ${defaultOrg._id}`);
  }

  // Update all owners without organization_id
  const ownerResult = await Owner.updateMany(
    { organization_id: { $exists: false } },
    { $set: { organization_id: defaultOrg._id } }
  );
  console.log(`✅ Updated ${ownerResult.modifiedCount} owners`);

  // Update all rooms without organization_id
  const roomResult = await Room.updateMany(
    { organization_id: { $exists: false } },
    { $set: { organization_id: defaultOrg._id } }
  );
  console.log(`✅ Updated ${roomResult.modifiedCount} rooms`);

  // Update all sessions without organization_id
  const sessionResult = await ChatSession.updateMany(
    { organization_id: { $exists: false } },
    { $set: { organization_id: defaultOrg._id } }
  );
  console.log(`✅ Updated ${sessionResult.modifiedCount} sessions`);

  // Update all messages without organization_id
  const messageResult = await Message.updateMany(
    { organization_id: { $exists: false } },
    { $set: { organization_id: defaultOrg._id } }
  );
  console.log(`✅ Updated ${messageResult.modifiedCount} messages`);

  // Create org membership for existing users
  const users = await User.find({ organizations: { $size: 0 } });

  for (const user of users) {
    // First user becomes org_owner, rest become org_member
    const isFirstUser = users.indexOf(user) === 0;
    const role = isFirstUser ? 'org_owner' : 'org_member';

    await OrganizationMember.create({
      organization_id: defaultOrg._id,
      user_id: user._id,
      role,
      status: 'active',
      joined_at: new Date()
    });

    // Update user's organizations array
    await User.findByIdAndUpdate(user._id, {
      $push: {
        organizations: {
          organization_id: defaultOrg._id,
          role,
          joined_at: new Date()
        }
      },
      current_organization_id: defaultOrg._id
    });

    console.log(`✅ Added user ${user.email} to default org as ${role}`);
  }

  // Update organization usage stats
  const stats = {
    current_users: await OrganizationMember.countDocuments({ organization_id: defaultOrg._id }),
    current_line_accounts: await Owner.countDocuments({ organization_id: defaultOrg._id }),
    current_groups: await Room.countDocuments({ organization_id: defaultOrg._id, type: 'group' })
  };

  await Organization.findByIdAndUpdate(defaultOrg._id, {
    $set: { usage: stats }
  });

  console.log(`✅ Updated organization usage stats:`, stats);

  console.log('🎉 Migration completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
```

---

## API Changes Summary

### New Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/organizations` | platform:orgs:create | Create organization |
| GET | `/api/organizations` | platform:orgs:list | List all organizations |
| GET | `/api/organizations/:id` | org:settings:view | Get organization details |
| PUT | `/api/organizations/:id` | org:settings:update | Update organization |
| DELETE | `/api/organizations/:id` | platform:orgs:delete | Delete organization |
| POST | `/api/organizations/:id/members` | org:members:invite | Invite member |
| GET | `/api/organizations/:id/members` | org:members:list | List members |
| PUT | `/api/organizations/:id/members/:memberId` | org:members:roles | Update member role |
| DELETE | `/api/organizations/:id/members/:memberId` | org:members:remove | Remove member |
| GET | `/api/organizations/:id/audit` | org:audit:view | Get audit logs |
| POST | `/api/invitations/:token/accept` | public | Accept invitation |
| GET | `/api/groups` | org:groups:list | List groups |
| PUT | `/api/groups/:id/assign` | org:groups:assign | Assign group category |
| POST | `/api/groups/bulk-assign` | org:groups:assign | Bulk assign groups |

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| All tRPC procedures | Add organization_id filter |
| `/api/auth/login` | Return organizations list |
| `/api/auth/register` | Handle invitation flow |
| Session/Room/Message queries | Require organization context |

### Request Headers

```
X-Organization-Id: <organization_id>  // Required for all org-level requests
Authorization: Bearer <jwt_token>      // Required for authenticated requests
Accept-Language: th | en               // Preferred language
```

---

## Testing Strategy

### Unit Tests

```
tests/
├── unit/
│   ├── models/
│   │   ├── organization.test.js
│   │   ├── organization_member.test.js
│   │   └── user.test.js
│   ├── auth/
│   │   ├── permissions.test.js
│   │   ├── middleware.test.js
│   │   └── abac.test.js
│   └── services/
│       └── invitation.test.js
```

### Integration Tests

```
tests/
├── integration/
│   ├── auth/
│   │   ├── login.test.js
│   │   ├── register.test.js
│   │   └── invitation.test.js
│   ├── organizations/
│   │   ├── crud.test.js
│   │   ├── members.test.js
│   │   └── permissions.test.js
│   └── sessions/
│       ├── access-control.test.js
│       └── multi-tenant.test.js
```

### E2E Tests

```
tests/
├── e2e/
│   ├── login-flow.spec.ts
│   ├── org-selection.spec.ts
│   ├── member-invite.spec.ts
│   ├── group-assignment.spec.ts
│   └── language-switch.spec.ts
```

### Test Data Fixtures

```javascript
// tests/fixtures/organizations.js
module.exports = {
  acmeCorp: {
    name: 'ACME Corporation',
    slug: 'acme-corp',
    plan: 'professional',
    limits: { max_users: 50 }
  },
  startupInc: {
    name: 'Startup Inc',
    slug: 'startup-inc',
    plan: 'starter',
    limits: { max_users: 10 }
  }
};
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All migrations tested on staging
- [ ] Rollback scripts verified
- [ ] Environment variables updated in DigitalOcean
- [ ] Database backup created
- [ ] Feature flags configured (if using)

### Deployment Steps

1. **Deploy Backend**
   ```bash
   # Run migrations first
   pnpm --filter @line-chat-summarizer/backend run migrate

   # Deploy
   doctl apps create-deployment <app-id>
   ```

2. **Verify Backend**
   - [ ] Health check passing
   - [ ] New endpoints responding
   - [ ] Existing endpoints still working
   - [ ] Database queries including org filter

3. **Deploy Frontend**
   ```bash
   doctl apps create-deployment <app-id>
   ```

4. **Verify Frontend**
   - [ ] Login flow working
   - [ ] Organization selection (if applicable)
   - [ ] Dashboard loading
   - [ ] i18n translations rendering

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check database query performance
- [ ] Verify audit logs being created
- [ ] Test invitation flow end-to-end
- [ ] Validate permission checks

### Rollback Plan

If issues arise:

1. **Immediate**: Revert to previous deployment
   ```bash
   doctl apps create-deployment <app-id> --commit <previous-commit>
   ```

2. **Database**: Run rollback migrations
   ```bash
   pnpm --filter @line-chat-summarizer/backend run migrate:rollback
   ```

3. **Communication**: Notify users of temporary downtime

---

## Summary & Priority Matrix

### High Priority (Must Have)

| Feature | Phase | Effort | Impact |
|---------|-------|--------|--------|
| Organization Model | 1 | Medium | Critical |
| User-Org Membership | 1 | Medium | Critical |
| Permission Middleware | 2 | High | Critical |
| Data Isolation | 2 | High | Critical |
| LINE Group Mapping | 3 | Medium | High |

### Medium Priority (Should Have)

| Feature | Phase | Effort | Impact |
|---------|-------|--------|--------|
| ABAC Policies | 2 | High | High |
| Admin Dashboard | 4 | High | Medium |
| Audit Logging | 4 | Medium | High |
| Invitation System | 5 | Medium | Medium |

### Lower Priority (Nice to Have)

| Feature | Phase | Effort | Impact |
|---------|-------|--------|--------|
| i18n (Thai/English) | 6 | Medium | Medium |
| 2FA | 5 | Medium | Medium |
| SSO Preparation | 5 | Low | Low |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-26 | Claude | Initial document |

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize** based on business requirements
3. **Estimate** effort for each phase
4. **Create** GitHub issues/tasks for tracking
5. **Begin Phase 1** implementation

---

*This document should be treated as a living document and updated as implementation progresses.*
