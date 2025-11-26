/**
 * Organization Routes
 * @description API routes for organization management, invite codes, and join requests
 */

const express = require('express');
const router = express.Router();
const { Organization, OrganizationMember, InviteCode, JoinRequest, User } = require('../models');
const jwt_service = require('../services/jwt_service');

// ════════════════════════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════════════════════════

/**
 * Authenticate user middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const decoded = jwt_service.verify_access_token(token);
    const user = await User.findById(decoded.user_id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

/**
 * Check if user is org admin or owner
 */
const requireOrgAdmin = async (req, res, next) => {
  try {
    const organizationId = req.params.orgId || req.body.organization_id;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const membership = await OrganizationMember.findOne({
      user_id: req.user._id,
      organization_id: organizationId,
      status: 'active'
    });

    if (!membership || !['org_owner', 'org_admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    req.membership = membership;
    req.organizationId = organizationId;
    next();
  } catch (error) {
    console.error('❌ Org admin check error:', error);
    return res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
};

// ════════════════════════════════════════════════════════════════
// Organization Info Routes
// ════════════════════════════════════════════════════════════════

/**
 * @route GET /api/organizations/:orgId
 * @description Get organization details
 * @access Private (org member)
 */
router.get('/:orgId', authenticate, async (req, res) => {
  console.log(`🏢 GET /api/organizations/${req.params.orgId}`);

  try {
    const { orgId } = req.params;

    // Check membership
    const membership = await OrganizationMember.findOne({
      user_id: req.user._id,
      organization_id: orgId,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this organization' });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    res.json({
      success: true,
      organization: organization.get_summary(),
      membership: {
        role: membership.role,
        joined_at: membership.joined_at
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
router.post('/:orgId/invite-codes', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`🎟️ POST /api/organizations/${req.params.orgId}/invite-codes`);

  try {
    const { name, default_role, max_uses, expires_in_days, auto_approve } = req.body;

    const inviteCode = await InviteCode.create_invite_code(
      req.organizationId,
      req.user._id,
      {
        name,
        default_role: default_role || 'org_member',
        max_uses: max_uses || null,
        expires_in_days: expires_in_days || null,
        auto_approve: auto_approve || false
      }
    );

    res.status(201).json({
      success: true,
      message: 'Invite code created',
      invite_code: inviteCode.get_summary()
    });
  } catch (error) {
    console.error('❌ Create invite code error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create invite code' });
  }
});

/**
 * @route GET /api/organizations/:orgId/invite-codes
 * @description List all invite codes for organization
 * @access Private (org admin/owner)
 */
router.get('/:orgId/invite-codes', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`📋 GET /api/organizations/${req.params.orgId}/invite-codes`);

  try {
    const { active_only } = req.query;

    const inviteCodes = await InviteCode.get_by_organization(
      req.organizationId,
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
router.delete('/:orgId/invite-codes/:codeId', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`🚫 DELETE /api/organizations/${req.params.orgId}/invite-codes/${req.params.codeId}`);

  try {
    const inviteCode = await InviteCode.disable_code(req.params.codeId, req.organizationId);

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
router.get('/:orgId/join-requests', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`📋 GET /api/organizations/${req.params.orgId}/join-requests`);

  try {
    const { status, page = 1, limit = 20 } = req.query;

    const result = await JoinRequest.get_requests_for_organization(
      req.organizationId,
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
router.get('/:orgId/join-requests/pending-count', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`🔢 GET /api/organizations/${req.params.orgId}/join-requests/pending-count`);

  try {
    const count = await JoinRequest.count_pending(req.organizationId);

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
router.post('/:orgId/join-requests/:requestId/approve', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`✅ POST /api/organizations/${req.params.orgId}/join-requests/${req.params.requestId}/approve`);

  try {
    const result = await JoinRequest.approve_request(req.params.requestId, req.user._id);

    res.json({
      success: true,
      message: 'Join request approved',
      request: result.request.get_summary()
    });
  } catch (error) {
    console.error('❌ Approve request error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to approve request' });
  }
});

/**
 * @route POST /api/organizations/:orgId/join-requests/:requestId/reject
 * @description Reject a join request
 * @access Private (org admin/owner)
 */
router.post('/:orgId/join-requests/:requestId/reject', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`❌ POST /api/organizations/${req.params.orgId}/join-requests/${req.params.requestId}/reject`);

  try {
    const { reason } = req.body;

    const request = await JoinRequest.reject_request(
      req.params.requestId,
      req.user._id,
      reason
    );

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
router.get('/:orgId/members', authenticate, async (req, res) => {
  console.log(`👥 GET /api/organizations/${req.params.orgId}/members`);

  try {
    const { orgId } = req.params;

    // Check membership
    const membership = await OrganizationMember.findOne({
      user_id: req.user._id,
      organization_id: orgId,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Not a member of this organization' });
    }

    const members = await OrganizationMember.get_organization_members(orgId);

    res.json({
      success: true,
      members: members.map(m => ({
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
      }))
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
router.put('/:orgId/members/:memberId/role', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`🔄 PUT /api/organizations/${req.params.orgId}/members/${req.params.memberId}/role`);

  try {
    const { role } = req.body;

    if (!['org_admin', 'org_member', 'org_viewer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // Only owner can change roles
    if (req.membership.role !== 'org_owner') {
      return res.status(403).json({ success: false, error: 'Only organization owner can change roles' });
    }

    const member = await OrganizationMember.findById(req.params.memberId);
    if (!member || member.organization_id.toString() !== req.organizationId.toString()) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Cannot change owner's role
    if (member.role === 'org_owner') {
      return res.status(403).json({ success: false, error: 'Cannot change owner role' });
    }

    await OrganizationMember.change_role(member.user_id, req.organizationId, role);

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
router.delete('/:orgId/members/:memberId', authenticate, requireOrgAdmin, async (req, res) => {
  console.log(`🚫 DELETE /api/organizations/${req.params.orgId}/members/${req.params.memberId}`);

  try {
    const member = await OrganizationMember.findById(req.params.memberId);

    if (!member || member.organization_id.toString() !== req.organizationId.toString()) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Cannot remove owner
    if (member.role === 'org_owner') {
      return res.status(403).json({ success: false, error: 'Cannot remove organization owner' });
    }

    // Admin can only remove members/viewers, not other admins
    if (req.membership.role === 'org_admin' && member.role === 'org_admin') {
      return res.status(403).json({ success: false, error: 'Admins cannot remove other admins' });
    }

    await OrganizationMember.remove_member(member.user_id, req.organizationId);

    // Also update user's organizations array
    await User.findByIdAndUpdate(member.user_id, {
      $pull: { organizations: { organization_id: req.organizationId } }
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
 * @description Validate an invite code (before joining)
 * @access Private (authenticated user)
 */
router.post('/validate-code', authenticate, async (req, res) => {
  console.log(`🔍 POST /api/organizations/validate-code`);

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code required' });
    }

    const result = await InviteCode.validate_code(code);

    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Check if user is already a member
    const existingMember = await OrganizationMember.findOne({
      user_id: req.user._id,
      organization_id: result.organization._id,
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
      organization_id: result.organization._id,
      status: 'pending'
    });

    res.json({
      success: true,
      valid: true,
      organization: {
        id: result.organization._id,
        name: result.organization.name,
        slug: result.organization.slug
      },
      default_role: result.invite_code.default_role,
      auto_approve: result.invite_code.auto_approve,
      has_pending_request: !!existingRequest
    });
  } catch (error) {
    console.error('❌ Validate code error:', error);
    res.status(500).json({ success: false, error: 'Failed to validate code' });
  }
});

/**
 * @route POST /api/organizations/join
 * @description Request to join an organization using invite code
 * @access Private (authenticated user)
 */
router.post('/join', authenticate, async (req, res) => {
  console.log(`🚀 POST /api/organizations/join`);

  try {
    const { code, message } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code required' });
    }

    // Validate code
    const result = await InviteCode.validate_code(code);

    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const inviteCode = result.invite_code;
    const organization = result.organization;

    // If auto-approve is enabled, add directly
    if (inviteCode.auto_approve) {
      // Add member directly
      const membership = await OrganizationMember.add_member(
        organization._id,
        req.user._id,
        inviteCode.default_role,
        null // No inviter for auto-approve
      );

      // Update user's organizations
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          organizations: {
            organization_id: organization._id,
            role: inviteCode.default_role,
            joined_at: new Date()
          }
        }
      });

      // Increment code usage
      await InviteCode.increment_usage(inviteCode._id);

      return res.status(201).json({
        success: true,
        message: 'Successfully joined organization',
        status: 'approved',
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug
        },
        role: inviteCode.default_role
      });
    }

    // Otherwise, create a join request for approval
    const joinRequest = await JoinRequest.create_request(
      req.user._id,
      organization._id,
      {
        invite_code_id: inviteCode._id,
        invite_code: inviteCode.code,
        requested_role: inviteCode.default_role,
        message
      }
    );

    res.status(201).json({
      success: true,
      message: 'Join request submitted. Waiting for approval.',
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
router.get('/my-requests', authenticate, async (req, res) => {
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
router.delete('/my-requests/:requestId', authenticate, async (req, res) => {
  console.log(`🚫 DELETE /api/organizations/my-requests/${req.params.requestId}`);

  try {
    const request = await JoinRequest.cancel_request(req.params.requestId, req.user._id);

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

module.exports = router;
