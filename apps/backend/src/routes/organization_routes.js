/**
 * Organization Routes
 * @description API routes for organization management, invite codes, and join requests
 */

const express = require('express');
const router = express.Router();
const { Organization, OrganizationMember, JoinRequest, User, AuditLog } = require('../models');
const { require_auth, require_permission, require_org_admin, load_org_context } = require('../auth/middleware');
const { evaluate_policy } = require('../auth/abac');

// ════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════

/**
 * Log an audit event
 */
async function log_audit(req, action, data = {}) {
  try {
    await AuditLog.log({
      user_id: req.user?._id,
      organization_id: req.organization?._id || data.organization_id,
      action,
      resource_type: data.resource_type,
      resource_id: data.resource_id,
      description: data.description,
      metadata: data.metadata,
      ip_address: req.ip || req.headers?.['x-forwarded-for'],
      user_agent: req.headers?.['user-agent'],
      status: data.status || 'success',
      error_message: data.error_message
    });
  } catch (error) {
    console.error('❌ Audit log error:', error);
  }
}

// ════════════════════════════════════════════════════════════════
// Organization Info Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId
 * @description Get organization details
 * @access Private (org member)
 */
router.get('/:orgId', require_auth(), require_permission('org:settings:view'), async (req, res) => {
  console.log(`🏢 GET /api/organizations/${req.params.orgId}`);

  try {
    // Populate created_by to get owner details
    const organization = await Organization.findById(req.params.orgId)
      .populate('created_by', 'name email avatar_url');

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Get member count
    const member_count = await OrganizationMember.countDocuments({
      organization_id: req.params.orgId,
      status: 'active'
    });

    // Get room count (if Room model exists)
    let room_count = 0;
    try {
      const Room = require('../models/room');
      room_count = await Room.countDocuments({ organization_id: req.params.orgId });
    } catch (e) {
      console.log('Room model not available for counting');
    }

    const orgSummary = organization.get_summary();

    res.json({
      success: true,
      organization: {
        ...orgSummary,
        owner: organization.created_by ? {
          _id: organization.created_by._id,
          name: organization.created_by.name,
          email: organization.created_by.email
        } : null,
        member_count,
        room_count
      },
      membership: {
        role: req.org_role,
        joined_at: req.membership?.joined_at
      }
    });
  } catch (error) {
    console.error('❌ Get organization error:', error);
    res.status(500).json({ success: false, error: 'Failed to get organization' });
  }
});

// ════════════════════════════════════════════════════════════════
// Invite Code Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route POST /api/organizations/:orgId/invite-codes
 * @description Generate a new invite code
 * @access Private (org admin/owner)
 */
router.post('/:orgId/invite-codes', require_auth(), require_permission('org:invite_codes:create'), async (req, res) => {
  console.log(`🎟️ POST /api/organizations/${req.params.orgId}/invite-codes`);

  try {
    const { name, default_role, max_uses, expires_in_days, auto_approve } = req.body;

    // ABAC check for invite code creation
    const policy_result = await evaluate_policy('invite_code:create', req.user, req.organization, {
      organization: req.organization,
      org_role: req.org_role,
      is_super_admin: req.is_super_admin
    });

    if (!policy_result.allowed) {
      return res.status(403).json({ success: false, error: policy_result.reason });
    }

    const inviteCode = await InviteCode.create_invite_code(
      req.params.orgId,
      req.user._id,
      {
        name,
        default_role: default_role || 'org_member',
        max_uses: max_uses || null,
        expires_in_days: expires_in_days || null,
        auto_approve: auto_approve || false
      }
    );

    // Audit log
    await log_audit(req, 'invite_code:created', {
      resource_type: 'invite_code',
      resource_id: inviteCode._id,
      description: `Created invite code ${inviteCode.code}`,
      metadata: { code: inviteCode.code, default_role, auto_approve }
    });

    res.status(201).json({
      success: true,
      message: 'Invite code created',
      invite_code: inviteCode.get_summary()
    });
  } catch (error) {
    console.error('❌ Create invite code error:', error);
    await log_audit(req, 'invite_code:create_failed', {
      status: 'failure',
      error_message: error.message
    });
    res.status(500).json({ success: false, error: error.message || 'Failed to create invite code' });
  }
});

/**
 * @route GET /api/organizations/:orgId/invite-codes
 * @description List all invite codes for organization
 * @access Private (org admin/owner)
 */
router.get('/:orgId/invite-codes', require_auth(), require_permission('org:invite_codes:list'), async (req, res) => {
  console.log(`📋 GET /api/organizations/${req.params.orgId}/invite-codes`);

  try {
    const { active_only } = req.query;

    const inviteCodes = await InviteCode.get_by_organization(
      req.params.orgId,
      active_only === 'true'
    );

    res.json({
      success: true,
      invite_codes: inviteCodes.map(code => code.get_summary())
    });
  } catch (error) {
    console.error('❌ List invite codes error:', error);
    res.status(500).json({ success: false, error: 'Failed to list invite codes' });
  }
});

/**
 * @route DELETE /api/organizations/:orgId/invite-codes/:codeId
 * @description Disable an invite code
 * @access Private (org admin/owner)
 */
router.delete('/:orgId/invite-codes/:codeId', require_auth(), require_permission('org:invite_codes:disable'), async (req, res) => {
  console.log(`🚫 DELETE /api/organizations/${req.params.orgId}/invite-codes/${req.params.codeId}`);

  try {
    const inviteCode = await InviteCode.disable_code(req.params.codeId, req.params.orgId);

    // Audit log
    await log_audit(req, 'invite_code:disabled', {
      resource_type: 'invite_code',
      resource_id: inviteCode._id,
      description: `Disabled invite code ${inviteCode.code}`,
      metadata: { code: inviteCode.code }
    });

    res.json({
      success: true,
      message: 'Invite code disabled',
      invite_code: inviteCode.get_summary()
    });
  } catch (error) {
    console.error('❌ Disable invite code error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to disable invite code' });
  }
});

// ════════════════════════════════════════════════════════════════
// Join Request Routes (Admin)
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId/join-requests
 * @description List join requests for organization
 * @access Private (org admin/owner)
 */
router.get('/:orgId/join-requests', require_auth(), require_permission('org:join_requests:list'), async (req, res) => {
  console.log(`📋 GET /api/organizations/${req.params.orgId}/join-requests`);

  try {
    const { status, page = 1, limit = 20 } = req.query;

    const result = await JoinRequest.get_requests_for_organization(
      req.params.orgId,
      {
        status: status || null,
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      }
    );

    res.json({
      success: true,
      requests: result.requests.map(r => r.get_summary()),
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(result.total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ List join requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to list join requests' });
  }
});

/**
 * @route GET /api/organizations/:orgId/join-requests/pending-count
 * @description Get count of pending join requests
 * @access Private (org admin/owner)
 */
router.get('/:orgId/join-requests/pending-count', require_auth(), require_permission('org:join_requests:list'), async (req, res) => {
  console.log(`🔢 GET /api/organizations/${req.params.orgId}/join-requests/pending-count`);

  try {
    const count = await JoinRequest.count_pending(req.params.orgId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('❌ Count pending requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to count pending requests' });
  }
});

/**
 * @route POST /api/organizations/:orgId/join-requests/:requestId/approve
 * @description Approve a join request
 * @access Private (org admin/owner)
 */
router.post('/:orgId/join-requests/:requestId/approve', require_auth(), require_permission('org:join_requests:approve'), async (req, res) => {
  console.log(`✅ POST /api/organizations/${req.params.orgId}/join-requests/${req.params.requestId}/approve`);

  try {
    // Get the request first
    const joinRequest = await JoinRequest.findById(req.params.requestId).populate('user_id', 'name email');

    if (!joinRequest) {
      return res.status(404).json({ success: false, error: 'Join request not found' });
    }

    // ABAC check - verifies user limit
    const policy_result = await evaluate_policy('join_request:approve', req.user, joinRequest, {
      organization: req.organization,
      org_role: req.org_role,
      is_super_admin: req.is_super_admin
    });

    if (!policy_result.allowed) {
      return res.status(403).json({ success: false, error: policy_result.reason });
    }

    const result = await JoinRequest.approve_request(req.params.requestId, req.user._id);

    // Audit log
    await log_audit(req, 'join_request:approved', {
      resource_type: 'join_request',
      resource_id: joinRequest._id,
      description: `Approved join request from ${joinRequest.user_id?.name || 'user'}`,
      metadata: {
        user_id: joinRequest.user_id?._id,
        user_email: joinRequest.user_id?.email,
        role: joinRequest.requested_role
      }
    });

    res.json({
      success: true,
      message: 'Join request approved',
      request: result.request.get_summary()
    });
  } catch (error) {
    console.error('❌ Approve request error:', error);
    await log_audit(req, 'join_request:approve_failed', {
      resource_id: req.params.requestId,
      status: 'failure',
      error_message: error.message
    });
    res.status(500).json({ success: false, error: error.message || 'Failed to approve request' });
  }
});

/**
 * @route POST /api/organizations/:orgId/join-requests/:requestId/reject
 * @description Reject a join request
 * @access Private (org admin/owner)
 */
router.post('/:orgId/join-requests/:requestId/reject', require_auth(), require_permission('org:join_requests:reject'), async (req, res) => {
  console.log(`❌ POST /api/organizations/${req.params.orgId}/join-requests/${req.params.requestId}/reject`);

  try {
    const { reason } = req.body;

    // Get the request first for audit
    const joinRequest = await JoinRequest.findById(req.params.requestId).populate('user_id', 'name email');

    const request = await JoinRequest.reject_request(
      req.params.requestId,
      req.user._id,
      reason
    );

    // Audit log
    await log_audit(req, 'join_request:rejected', {
      resource_type: 'join_request',
      resource_id: request._id,
      description: `Rejected join request from ${joinRequest?.user_id?.name || 'user'}`,
      metadata: {
        user_id: joinRequest?.user_id?._id,
        user_email: joinRequest?.user_id?.email,
        reason
      }
    });

    res.json({
      success: true,
      message: 'Join request rejected',
      request: request.get_summary()
    });
  } catch (error) {
    console.error('❌ Reject request error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reject request' });
  }
});

// ════════════════════════════════════════════════════════════════
// Member Management Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId/members
 * @description List organization members
 * @access Private (org member)
 */
router.get('/:orgId/members', require_auth(), require_permission('org:members:list'), async (req, res) => {
  console.log(`👥 GET /api/organizations/${req.params.orgId}/members`);

  try {
    // Parse pagination options from query params
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      role: req.query.role || null,
      status: req.query.status || 'active'
    };

    // get_organization_members returns { members, total, pages, page, limit }
    const result = await OrganizationMember.get_organization_members(req.params.orgId, options);

    console.log(`✅ Found ${result.members.length} members (total: ${result.total})`);

    res.json({
      success: true,
      members: result.members.map(m => ({
        id: m._id,
        user: {
          id: m.user_id._id,
          name: m.user_id.name,
          email: m.user_id.email,
          avatar_url: m.user_id.avatar_url
        },
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        last_active_at: m.last_active_at
      })),
      pagination: {
        total: result.total,
        pages: result.pages,
        page: result.page,
        limit: result.limit
      }
    });
  } catch (error) {
    console.error('❌ List members error:', error);
    res.status(500).json({ success: false, error: 'Failed to list members' });
  }
});

/**
 * @route PUT /api/organizations/:orgId/members/:memberId/role
 * @description Change a member's role
 * @access Private (org owner only)
 */
router.put('/:orgId/members/:memberId/role', require_auth(), require_permission('org:members:roles'), async (req, res) => {
  console.log(`🔄 PUT /api/organizations/${req.params.orgId}/members/${req.params.memberId}/role`);

  try {
    const { role } = req.body;

    if (!['org_admin', 'org_member', 'org_viewer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // Only owner can change roles
    if (req.org_role !== 'org_owner' && !req.is_super_admin) {
      return res.status(403).json({ success: false, error: 'Only organization owner can change roles' });
    }

    const member = await OrganizationMember.findById(req.params.memberId).populate('user_id', 'name email');
    if (!member || member.organization_id.toString() !== req.params.orgId.toString()) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Cannot change owner's role
    if (member.role === 'org_owner') {
      return res.status(403).json({ success: false, error: 'Cannot change owner role' });
    }

    const old_role = member.role;
    await OrganizationMember.change_role(member.user_id._id, req.params.orgId, role);

    // Audit log
    await log_audit(req, 'member:role_changed', {
      resource_type: 'member',
      resource_id: member._id,
      description: `Changed ${member.user_id?.name}'s role from ${old_role} to ${role}`,
      metadata: {
        user_id: member.user_id._id,
        user_email: member.user_id?.email,
        old_role,
        new_role: role
      }
    });

    res.json({
      success: true,
      message: 'Member role updated'
    });
  } catch (error) {
    console.error('❌ Change role error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to change role' });
  }
});

/**
 * @route DELETE /api/organizations/:orgId/members/:memberId
 * @description Remove a member from organization
 * @access Private (org admin/owner)
 */
router.delete('/:orgId/members/:memberId', require_auth(), require_permission('org:members:remove'), async (req, res) => {
  console.log(`🚫 DELETE /api/organizations/${req.params.orgId}/members/${req.params.memberId}`);

  try {
    const member = await OrganizationMember.findById(req.params.memberId).populate('user_id', 'name email');

    if (!member || member.organization_id.toString() !== req.params.orgId.toString()) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Cannot remove owner
    if (member.role === 'org_owner') {
      return res.status(403).json({ success: false, error: 'Cannot remove organization owner' });
    }

    // Admin can only remove members/viewers, not other admins
    if (req.org_role === 'org_admin' && member.role === 'org_admin') {
      return res.status(403).json({ success: false, error: 'Admins cannot remove other admins' });
    }

    await OrganizationMember.remove_member(member.user_id._id, req.params.orgId);

    // Also update user's organizations array
    await User.findByIdAndUpdate(member.user_id._id, {
      $pull: { organizations: { organization_id: req.params.orgId } }
    });

    // Audit log
    await log_audit(req, 'member:removed', {
      resource_type: 'member',
      resource_id: member._id,
      description: `Removed ${member.user_id?.name} from organization`,
      metadata: {
        user_id: member.user_id._id,
        user_email: member.user_id?.email,
        role: member.role
      }
    });

    res.json({
      success: true,
      message: 'Member removed from organization'
    });
  } catch (error) {
    console.error('❌ Remove member error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to remove member' });
  }
});

// ════════════════════════════════════════════════════════════════
// User Join Routes (Public - for users to join orgs)
// ════════════════════════════════════════════════════════════════

/**
 * @route POST /api/organizations/validate-code
 * @description Validate a member invite code (before joining)
 * @access Private (authenticated user)
 */
router.post('/validate-code', require_auth(), async (req, res) => {
  console.log(`🔍 POST /api/organizations/validate-code`);

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code required' });
    }

    // Find organization by member invite code
    const organization = await Organization.find_by_member_invite_code(code);

    if (!organization) {
      return res.status(400).json({ success: false, error: 'Invalid invite code' });
    }

    if (organization.status !== 'active' && organization.status !== 'trial') {
      return res.status(400).json({ success: false, error: 'This organization is not active' });
    }

    // Check if user is already a member
    const existingMember = await OrganizationMember.findOne({
      user_id: req.user._id,
      organization_id: organization._id,
      status: 'active'
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this organization'
      });
    }

    // Check if user already has a pending request
    const existingRequest = await JoinRequest.findOne({
      user_id: req.user._id,
      organization_id: organization._id,
      status: 'pending'
    });

    res.json({
      success: true,
      valid: true,
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      },
      default_role: 'org_member',
      has_pending_request: !!existingRequest
    });
  } catch (error) {
    console.error('❌ Validate code error:', error);
    res.status(500).json({ success: false, error: 'Failed to validate code' });
  }
});

/**
 * @route POST /api/organizations/join
 * @description Request to join an organization using member invite code (always requires approval)
 * @access Private (authenticated user)
 */
router.post('/join', require_auth(), async (req, res) => {
  console.log(`🚀 POST /api/organizations/join`);

  try {
    const { code, message } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code required' });
    }

    // Find organization by member invite code
    const organization = await Organization.find_by_member_invite_code(code);

    if (!organization) {
      return res.status(400).json({ success: false, error: 'Invalid invite code' });
    }

    if (organization.status !== 'active' && organization.status !== 'trial') {
      return res.status(400).json({ success: false, error: 'This organization is not active' });
    }

    // Check if user is already a member
    const existingMember = await OrganizationMember.findOne({
      user_id: req.user._id,
      organization_id: organization._id,
      status: 'active'
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this organization'
      });
    }

    // Check if user already has a pending request
    const existingRequest = await JoinRequest.findOne({
      user_id: req.user._id,
      organization_id: organization._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending request for this organization'
      });
    }

    // Always create a join request for owner approval (no auto-approve)
    const joinRequest = await JoinRequest.create_request(
      req.user._id,
      organization._id,
      {
        invite_code: code.toUpperCase(),
        requested_role: 'org_member',
        message
      }
    );

    // Audit log
    await log_audit(req, 'join_request:created', {
      organization_id: organization._id,
      resource_type: 'join_request',
      resource_id: joinRequest._id,
      description: `Requested to join organization ${organization.name}`,
      metadata: {
        invite_code: code.toUpperCase(),
        requested_role: 'org_member'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Join request submitted. Waiting for owner approval.',
      status: 'pending',
      request: joinRequest.get_summary(),
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      }
    });
  } catch (error) {
    console.error('❌ Join organization error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to join organization' });
  }
});

/**
 * @route GET /api/organizations/my-requests
 * @description Get user's join requests
 * @access Private (authenticated user)
 */
router.get('/my-requests', require_auth(), async (req, res) => {
  console.log(`📋 GET /api/organizations/my-requests`);

  try {
    const requests = await JoinRequest.get_requests_by_user(req.user._id);

    res.json({
      success: true,
      requests: requests.map(r => r.get_summary())
    });
  } catch (error) {
    console.error('❌ Get my requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to get requests' });
  }
});

/**
 * @route DELETE /api/organizations/my-requests/:requestId
 * @description Cancel a pending join request
 * @access Private (authenticated user)
 */
router.delete('/my-requests/:requestId', require_auth(), async (req, res) => {
  console.log(`🚫 DELETE /api/organizations/my-requests/${req.params.requestId}`);

  try {
    const request = await JoinRequest.cancel_request(req.params.requestId, req.user._id);

    // Audit log
    await log_audit(req, 'join_request:cancelled', {
      organization_id: request.organization_id,
      resource_type: 'join_request',
      resource_id: request._id,
      description: 'Cancelled join request'
    });

    res.json({
      success: true,
      message: 'Join request cancelled',
      request: request.get_summary()
    });
  } catch (error) {
    console.error('❌ Cancel request error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel request' });
  }
});

// ════════════════════════════════════════════════════════════════
// Audit Log Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId/audit-logs
 * @description Get organization audit logs
 * @access Private (org admin/owner)
 */
router.get('/:orgId/audit-logs', require_auth(), require_permission('org:audit:view'), async (req, res) => {
  console.log(`📋 GET /api/organizations/${req.params.orgId}/audit-logs`);

  try {
    const { page = 1, limit = 50, category, action, user_id, status, start_date, end_date } = req.query;

    const result = await AuditLog.get_org_logs(req.params.orgId, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      action,
      user_id,
      status,
      start_date,
      end_date
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

/**
 * @route GET /api/organizations/:orgId/audit-logs/recent
 * @description Get recent activity for dashboard
 * @access Private (org admin/owner)
 */
router.get('/:orgId/audit-logs/recent', require_auth(), require_permission('org:audit:view'), async (req, res) => {
  console.log(`📋 GET /api/organizations/${req.params.orgId}/audit-logs/recent`);

  try {
    const { limit = 10 } = req.query;

    const logs = await AuditLog.get_recent_activity(req.params.orgId, parseInt(limit));

    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log._id,
        action: log.action,
        category: log.category,
        description: log.description,
        user: log.user_id ? {
          id: log.user_id._id,
          name: log.user_id.name,
          email: log.user_id.email
        } : null,
        status: log.status,
        created_at: log.created_at
      }))
    });
  } catch (error) {
    console.error('❌ Get recent activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recent activity' });
  }
});

// ════════════════════════════════════════════════════════════════
// Group Activation Code Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId/activation-code
 * @description Get the organization's LINE group activation code
 * @access Private (org admin/owner)
 */
router.get('/:orgId/activation-code', require_auth(), require_permission('org:settings:view'), async (req, res) => {
  console.log(`🔑 GET /api/organizations/${req.params.orgId}/activation-code`);

  try {
    const org = await Organization.findById(req.params.orgId);

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Generate code if it doesn't exist
    if (!org.activation_code) {
      console.log(`📝 Generating initial activation code for org: ${org.name}`);
      await org.generate_new_activation_code();
    }

    res.json({
      success: true,
      activation_code: org.activation_code,
      generated_at: org.activation_code_generated_at
    });
  } catch (error) {
    console.error('❌ Get activation code error:', error);
    res.status(500).json({ success: false, error: 'Failed to get activation code' });
  }
});

/**
 * @route POST /api/organizations/:orgId/activation-code/regenerate
 * @description Regenerate the organization's LINE group activation code
 * @access Private (org admin/owner)
 */
router.post('/:orgId/activation-code/regenerate', require_auth(), require_permission('org:settings:edit'), async (req, res) => {
  console.log(`🔄 POST /api/organizations/${req.params.orgId}/activation-code/regenerate`);

  try {
    const org = await Organization.findById(req.params.orgId);

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const oldCode = org.activation_code;
    await org.generate_new_activation_code();

    // Audit log
    await log_audit(req, 'org:activation_code:regenerate', {
      organization_id: org._id,
      resource_type: 'organization',
      resource_id: org._id,
      description: `Regenerated activation code for ${org.name}`,
      metadata: {
        old_code: oldCode ? `${oldCode.substring(0, 4)}****` : null,
        new_code: `${org.activation_code.substring(0, 4)}****`
      }
    });

    res.json({
      success: true,
      activation_code: org.activation_code,
      generated_at: org.activation_code_generated_at,
      message: 'Activation code regenerated successfully'
    });
  } catch (error) {
    console.error('❌ Regenerate activation code error:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate activation code' });
  }
});

// ════════════════════════════════════════════════════════════════
// Member Invite Code Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId/member-invite-code
 * @description Get the organization's member invite code
 * @access Private (org admin/owner)
 */
router.get('/:orgId/member-invite-code', require_auth(), require_permission('org:settings:view'), async (req, res) => {
  console.log(`🎟️ GET /api/organizations/${req.params.orgId}/member-invite-code`);

  try {
    const org = await Organization.findById(req.params.orgId);

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Generate code if it doesn't exist
    if (!org.member_invite_code) {
      console.log(`📝 Generating initial member invite code for org: ${org.name}`);
      try {
        await org.generate_new_member_invite_code();
      } catch (genError) {
        console.error('❌ Failed to generate member invite code:', genError.message);
        // Check if it's a quota error
        if (genError.code === 8000 || genError.message?.includes('space quota')) {
          return res.status(503).json({
            success: false,
            error: 'Database storage full. Cannot generate invite code.',
            error_code: 'DATABASE_QUOTA_EXCEEDED'
          });
        }
        throw genError;
      }
    }

    res.json({
      success: true,
      member_invite_code: org.member_invite_code,
      generated_at: org.member_invite_code_generated_at
    });
  } catch (error) {
    console.error('❌ Get member invite code error:', error);
    res.status(500).json({ success: false, error: 'Failed to get member invite code' });
  }
});

/**
 * @route POST /api/organizations/:orgId/member-invite-code/regenerate
 * @description Regenerate the organization's member invite code
 * @access Private (org admin/owner)
 */
router.post('/:orgId/member-invite-code/regenerate', require_auth(), require_permission('org:settings:edit'), async (req, res) => {
  console.log(`🔄 POST /api/organizations/${req.params.orgId}/member-invite-code/regenerate`);

  try {
    const org = await Organization.findById(req.params.orgId);

    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const oldCode = org.member_invite_code;
    await org.generate_new_member_invite_code();

    // Audit log
    await log_audit(req, 'org:member_invite_code:regenerate', {
      organization_id: org._id,
      resource_type: 'organization',
      resource_id: org._id,
      description: `Regenerated member invite code for ${org.name}`,
      metadata: {
        old_code: oldCode ? `${oldCode.substring(0, 4)}****` : null,
        new_code: `${org.member_invite_code.substring(0, 4)}****`
      }
    });

    res.json({
      success: true,
      member_invite_code: org.member_invite_code,
      generated_at: org.member_invite_code_generated_at,
      message: 'Member invite code regenerated successfully'
    });
  } catch (error) {
    console.error('❌ Regenerate member invite code error:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate member invite code' });
  }
});

module.exports = router;
