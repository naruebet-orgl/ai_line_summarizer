/**
 * Attribute-Based Access Control (ABAC) Policy Engine
 * @description Fine-grained resource-level access control
 * @module auth/abac
 */

/**
 * Plan limits configuration
 */
const PLAN_LIMITS = {
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

/**
 * Get plan limit value
 * @param {string} plan - Plan name
 * @param {string} limit_name - Limit key
 * @returns {number} Limit value
 */
function get_plan_limit(plan, limit_name) {
  const plan_config = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return plan_config[limit_name] ?? 0;
}

/**
 * ABAC Policies
 * Each policy returns { allowed: boolean, reason?: string }
 */
const policies = {
  /**
   * Session access policy
   * Users can only access sessions from their organization
   */
  'session:access': async (user, session, ctx) => {
    console.log(`📋 ABAC: session:access`);

    // Super admin can access all
    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    // Must have organization context
    if (!ctx.organization) {
      return { allowed: false, reason: 'Organization context required' };
    }

    // Must be in same organization
    const session_org_id = session.organization_id?.toString() || session.organization_id;
    const ctx_org_id = ctx.organization._id?.toString() || ctx.organization._id;

    if (session_org_id !== ctx_org_id) {
      return { allowed: false, reason: 'Session belongs to different organization' };
    }

    return { allowed: true };
  },

  /**
   * Session delete policy
   * Only org_owner and org_admin can delete
   */
  'session:delete': async (user, session, ctx) => {
    console.log(`📋 ABAC: session:delete`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    if (!ctx.organization) {
      return { allowed: false, reason: 'Organization context required' };
    }

    // Must be same org
    const session_org_id = session.organization_id?.toString() || session.organization_id;
    const ctx_org_id = ctx.organization._id?.toString() || ctx.organization._id;

    if (session_org_id !== ctx_org_id) {
      return { allowed: false, reason: 'Cannot delete session from different organization' };
    }

    // Must be owner or admin
    if (!['org_owner', 'org_admin'].includes(ctx.org_role)) {
      return { allowed: false, reason: 'Only organization owners and admins can delete sessions' };
    }

    return { allowed: true };
  },

  /**
   * Summary generation policy
   * Check if org has AI summaries enabled and hasn't exceeded limits
   */
  'summary:generate': async (user, session, ctx) => {
    console.log(`📋 ABAC: summary:generate`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    if (!ctx.organization) {
      return { allowed: false, reason: 'Organization context required' };
    }

    const org = ctx.organization;

    // Check if AI summaries are enabled for this plan
    if (!org.limits?.ai_summaries_enabled) {
      return {
        allowed: false,
        reason: 'AI summaries not enabled for your plan. Please upgrade to Starter or higher.'
      };
    }

    // Check monthly limit
    const monthly_limit = get_plan_limit(org.plan, 'summaries_per_month');
    const current_usage = org.usage?.summaries_this_month || 0;

    if (current_usage >= monthly_limit) {
      return {
        allowed: false,
        reason: `Monthly summary limit reached (${monthly_limit} summaries). Resets next month.`
      };
    }

    // Session must be closed
    if (session.status !== 'closed') {
      return {
        allowed: false,
        reason: 'Session must be closed before generating summary'
      };
    }

    return { allowed: true };
  },

  /**
   * Member invite policy
   * Check if org hasn't exceeded user limit
   */
  'member:invite': async (user, organization, ctx) => {
    console.log(`📋 ABAC: member:invite`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    const org = organization || ctx.organization;

    if (!org) {
      return { allowed: false, reason: 'Organization context required' };
    }

    // Check user limit
    const max_users = org.limits?.max_users || get_plan_limit(org.plan, 'max_users');
    const current_users = org.usage?.current_users || 0;

    if (current_users >= max_users) {
      return {
        allowed: false,
        reason: `User limit reached (${max_users} users). Please upgrade your plan.`
      };
    }

    return { allowed: true };
  },

  /**
   * LINE account connect policy
   * Check if org hasn't exceeded LINE account limit
   */
  'line_account:connect': async (user, organization, ctx) => {
    console.log(`📋 ABAC: line_account:connect`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    const org = organization || ctx.organization;

    if (!org) {
      return { allowed: false, reason: 'Organization context required' };
    }

    const max_accounts = org.limits?.max_line_accounts || get_plan_limit(org.plan, 'max_line_accounts');
    const current_accounts = org.usage?.current_line_accounts || 0;

    if (current_accounts >= max_accounts) {
      return {
        allowed: false,
        reason: `LINE account limit reached (${max_accounts} accounts). Please upgrade your plan.`
      };
    }

    return { allowed: true };
  },

  /**
   * Group create/add policy
   * Check if org hasn't exceeded group limit
   */
  'group:create': async (user, organization, ctx) => {
    console.log(`📋 ABAC: group:create`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    const org = organization || ctx.organization;

    if (!org) {
      return { allowed: false, reason: 'Organization context required' };
    }

    const max_groups = org.limits?.max_groups || get_plan_limit(org.plan, 'max_groups');
    const current_groups = org.usage?.current_groups || 0;

    if (current_groups >= max_groups) {
      return {
        allowed: false,
        reason: `Group limit reached (${max_groups} groups). Please upgrade your plan.`
      };
    }

    return { allowed: true };
  },

  /**
   * Message send policy
   * Check monthly message limit
   */
  'message:send': async (user, organization, ctx) => {
    console.log(`📋 ABAC: message:send`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    const org = organization || ctx.organization;

    if (!org) {
      return { allowed: false, reason: 'Organization context required' };
    }

    const max_messages = org.limits?.max_messages_per_month || get_plan_limit(org.plan, 'max_messages_per_month');
    const current_messages = org.usage?.messages_this_month || 0;

    if (current_messages >= max_messages) {
      return {
        allowed: false,
        reason: `Monthly message limit reached (${max_messages} messages). Resets next month.`
      };
    }

    return { allowed: true };
  },

  /**
   * Resource ownership check
   * Generic policy for checking if user owns/has access to a resource
   */
  'resource:access': async (user, resource, ctx) => {
    console.log(`📋 ABAC: resource:access`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    if (!ctx.organization) {
      return { allowed: false, reason: 'Organization context required' };
    }

    // Check if resource belongs to same organization
    const resource_org_id = resource.organization_id?.toString() || resource.organization_id;
    const ctx_org_id = ctx.organization._id?.toString() || ctx.organization._id;

    if (resource_org_id && resource_org_id !== ctx_org_id) {
      return { allowed: false, reason: 'Resource belongs to different organization' };
    }

    return { allowed: true };
  },

  /**
   * Invite code create policy
   * Only admins and owners can create invite codes
   */
  'invite_code:create': async (user, organization, ctx) => {
    console.log(`📋 ABAC: invite_code:create`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    if (!['org_owner', 'org_admin'].includes(ctx.org_role)) {
      return {
        allowed: false,
        reason: 'Only organization owners and admins can create invite codes'
      };
    }

    return { allowed: true };
  },

  /**
   * Join request approve policy
   * Check if can approve (role check + user limit)
   */
  'join_request:approve': async (user, request, ctx) => {
    console.log(`📋 ABAC: join_request:approve`);

    if (ctx.is_super_admin) {
      return { allowed: true };
    }

    if (!['org_owner', 'org_admin'].includes(ctx.org_role)) {
      return {
        allowed: false,
        reason: 'Only organization owners and admins can approve requests'
      };
    }

    // Check user limit before approving
    const org = ctx.organization;
    const max_users = org.limits?.max_users || get_plan_limit(org.plan, 'max_users');
    const current_users = org.usage?.current_users || 0;

    if (current_users >= max_users) {
      return {
        allowed: false,
        reason: `Cannot approve: User limit reached (${max_users} users). Please upgrade your plan.`
      };
    }

    return { allowed: true };
  },
};

/**
 * Evaluate an ABAC policy
 * @param {string} policy_name - Name of the policy to evaluate
 * @param {Object} user - Current user
 * @param {Object} resource - Resource being accessed
 * @param {Object} ctx - Request context (organization, role, etc.)
 * @returns {Promise<{allowed: boolean, reason?: string}>} Policy result
 */
async function evaluate_policy(policy_name, user, resource, ctx) {
  console.log(`📋 Evaluating ABAC policy: ${policy_name}`);

  const policy = policies[policy_name];

  if (!policy) {
    console.warn(`⚠️ Unknown ABAC policy: ${policy_name}`);
    return { allowed: false, reason: 'Unknown policy' };
  }

  try {
    const result = await policy(user, resource, ctx);

    // Handle boolean or object result
    if (typeof result === 'boolean') {
      console.log(`📋 Policy result: ${result}`);
      return { allowed: result };
    }

    console.log(`📋 Policy result: allowed=${result.allowed}, reason=${result.reason || 'none'}`);
    return result;
  } catch (error) {
    console.error(`❌ ABAC policy error (${policy_name}):`, error);
    return { allowed: false, reason: 'Policy evaluation error' };
  }
}

/**
 * Check multiple policies - all must pass
 * @param {Array<{policy: string, user: Object, resource: Object, ctx: Object}>} checks
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function evaluate_all_policies(checks) {
  console.log(`📋 Evaluating ${checks.length} ABAC policies`);

  for (const check of checks) {
    const result = await evaluate_policy(check.policy, check.user, check.resource, check.ctx);

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Check if organization is active and not suspended
 * @param {Object} organization - Organization object
 * @returns {{allowed: boolean, reason?: string}}
 */
function check_org_status(organization) {
  if (!organization) {
    return { allowed: false, reason: 'Organization not found' };
  }

  if (organization.status === 'suspended') {
    return { allowed: false, reason: 'Organization is suspended' };
  }

  if (organization.status === 'cancelled') {
    return { allowed: false, reason: 'Organization subscription is cancelled' };
  }

  // Check plan expiration
  if (organization.plan_expires_at && new Date() > new Date(organization.plan_expires_at)) {
    return { allowed: false, reason: 'Organization plan has expired' };
  }

  return { allowed: true };
}

module.exports = {
  PLAN_LIMITS,
  get_plan_limit,
  evaluate_policy,
  evaluate_all_policies,
  check_org_status,
  policies,
};
