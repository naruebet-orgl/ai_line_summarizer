/**
 * Organization Member Model
 * @description Many-to-many relationship between Users and Organizations
 * @module models/organization_member
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Organization Roles
 * @constant
 */
const ORG_ROLES = {
  ORG_OWNER: 'org_owner',     // Full org control, billing, cannot be removed
  ORG_ADMIN: 'org_admin',     // Manage org users & settings
  ORG_MEMBER: 'org_member',   // Standard access
  ORG_VIEWER: 'org_viewer'    // Read-only access
};

/**
 * Member Statuses
 * @constant
 */
const MEMBER_STATUSES = {
  PENDING: 'pending',     // Invited but not yet accepted
  ACTIVE: 'active',       // Active member
  SUSPENDED: 'suspended', // Temporarily suspended
  REMOVED: 'removed'      // Removed from organization
};

/**
 * Organization Member Schema
 * @description Links users to organizations with roles
 */
const OrganizationMemberSchema = new Schema({
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Organization-level role
  role: {
    type: String,
    enum: {
      values: Object.values(ORG_ROLES),
      message: 'Role must be one of: org_owner, org_admin, org_member, org_viewer'
    },
    default: ORG_ROLES.ORG_MEMBER
  },

  // Membership status
  status: {
    type: String,
    enum: {
      values: Object.values(MEMBER_STATUSES),
      message: 'Status must be one of: pending, active, suspended, removed'
    },
    default: MEMBER_STATUSES.ACTIVE
  },

  // Invitation tracking
  invited_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  invited_at: {
    type: Date
  },
  invitation_token: {
    type: String,
    select: false
  },
  invitation_expires_at: {
    type: Date
  },
  joined_at: {
    type: Date
  },

  // Activity tracking
  last_active_at: {
    type: Date
  },

  // Suspension info
  suspended_at: {
    type: Date
  },
  suspended_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  suspension_reason: {
    type: String
  },

  // Removal info
  removed_at: {
    type: Date
  },
  removed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  removal_reason: {
    type: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index - user can only be in org once
OrganizationMemberSchema.index(
  { organization_id: 1, user_id: 1 },
  { unique: true }
);

// Query indexes
OrganizationMemberSchema.index({ user_id: 1, status: 1 });
OrganizationMemberSchema.index({ organization_id: 1, role: 1 });
OrganizationMemberSchema.index({ organization_id: 1, status: 1 });
OrganizationMemberSchema.index({ invitation_token: 1 }, { sparse: true });

/**
 * Find active membership
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<OrganizationMember>} Membership document
 */
OrganizationMemberSchema.statics.find_active_membership = async function(organizationId, userId) {
  console.log(`🔍 Finding active membership for user ${userId} in org ${organizationId}`);
  return this.findOne({
    organization_id: organizationId,
    user_id: userId,
    status: MEMBER_STATUSES.ACTIVE
  }).populate('organization_id').populate('user_id');
};

/**
 * Get all active memberships for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of membership documents
 */
OrganizationMemberSchema.statics.get_user_memberships = async function(userId) {
  console.log(`🔍 Getting all memberships for user: ${userId}`);
  return this.find({
    user_id: userId,
    status: { $in: [MEMBER_STATUSES.ACTIVE, MEMBER_STATUSES.PENDING] }
  }).populate('organization_id').sort({ joined_at: -1 });
};

/**
 * Get all members of an organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {Object} options - Query options (page, limit, role, status)
 * @returns {Promise<Object>} { members, total, pages }
 */
OrganizationMemberSchema.statics.get_organization_members = async function(organizationId, options = {}) {
  console.log(`🔍 Getting members for org: ${organizationId}`);
  const {
    page = 1,
    limit = 20,
    role = null,
    status = MEMBER_STATUSES.ACTIVE
  } = options;

  const filter = {
    organization_id: organizationId,
    ...(status && { status }),
    ...(role && { role })
  };

  const [members, total] = await Promise.all([
    this.find(filter)
      .populate('user_id', 'name email avatar_url')
      .populate('invited_by', 'name email')
      .sort({ role: 1, joined_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(filter)
  ]);

  return {
    members,
    total,
    pages: Math.ceil(total / limit),
    page,
    limit
  };
};

/**
 * Add member to organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} userId - User ID
 * @param {string} role - Member role
 * @param {ObjectId} invitedBy - User who invited
 * @returns {Promise<OrganizationMember>} Created membership
 */
OrganizationMemberSchema.statics.add_member = async function(organizationId, userId, role, invitedBy = null) {
  console.log(`➕ Adding member ${userId} to org ${organizationId} with role ${role}`);

  // Check if membership already exists
  const existing = await this.findOne({
    organization_id: organizationId,
    user_id: userId
  });

  if (existing) {
    if (existing.status === MEMBER_STATUSES.REMOVED) {
      // Reactivate removed member
      console.log(`🔄 Reactivating removed member: ${userId}`);
      existing.status = MEMBER_STATUSES.ACTIVE;
      existing.role = role;
      existing.joined_at = new Date();
      existing.removed_at = null;
      existing.removed_by = null;
      existing.removal_reason = null;
      await existing.save();
      return existing;
    }
    throw new Error('User is already a member of this organization');
  }

  const membership = await this.create({
    organization_id: organizationId,
    user_id: userId,
    role,
    status: MEMBER_STATUSES.ACTIVE,
    invited_by: invitedBy,
    invited_at: invitedBy ? new Date() : null,
    joined_at: new Date()
  });

  // Update organization user count
  const Organization = mongoose.model('Organization');
  await Organization.findByIdAndUpdate(
    organizationId,
    { $inc: { 'usage.current_users': 1 } }
  );

  console.log(`✅ Member added successfully: ${membership._id}`);
  return membership;
};

/**
 * Remove member from organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} removedBy - User who removed
 * @param {string} reason - Removal reason
 * @returns {Promise<OrganizationMember>} Updated membership
 */
OrganizationMemberSchema.statics.remove_member = async function(organizationId, userId, removedBy, reason = null) {
  console.log(`➖ Removing member ${userId} from org ${organizationId}`);

  const membership = await this.findOne({
    organization_id: organizationId,
    user_id: userId,
    status: MEMBER_STATUSES.ACTIVE
  });

  if (!membership) {
    throw new Error('Membership not found');
  }

  // Prevent removing the last owner
  if (membership.role === ORG_ROLES.ORG_OWNER) {
    const ownerCount = await this.countDocuments({
      organization_id: organizationId,
      role: ORG_ROLES.ORG_OWNER,
      status: MEMBER_STATUSES.ACTIVE
    });

    if (ownerCount <= 1) {
      throw new Error('Cannot remove the last owner of an organization');
    }
  }

  membership.status = MEMBER_STATUSES.REMOVED;
  membership.removed_at = new Date();
  membership.removed_by = removedBy;
  membership.removal_reason = reason;
  await membership.save();

  // Update organization user count
  const Organization = mongoose.model('Organization');
  await Organization.findByIdAndUpdate(
    organizationId,
    { $inc: { 'usage.current_users': -1 } }
  );

  console.log(`✅ Member removed successfully`);
  return membership;
};

/**
 * Change member role
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} userId - User ID
 * @param {string} newRole - New role
 * @param {ObjectId} changedBy - User who changed the role
 * @returns {Promise<OrganizationMember>} Updated membership
 */
OrganizationMemberSchema.statics.change_role = async function(organizationId, userId, newRole, changedBy) {
  console.log(`🔄 Changing role for ${userId} in org ${organizationId} to ${newRole}`);

  const membership = await this.findOne({
    organization_id: organizationId,
    user_id: userId,
    status: MEMBER_STATUSES.ACTIVE
  });

  if (!membership) {
    throw new Error('Membership not found');
  }

  // Prevent demoting the last owner
  if (membership.role === ORG_ROLES.ORG_OWNER && newRole !== ORG_ROLES.ORG_OWNER) {
    const ownerCount = await this.countDocuments({
      organization_id: organizationId,
      role: ORG_ROLES.ORG_OWNER,
      status: MEMBER_STATUSES.ACTIVE
    });

    if (ownerCount <= 1) {
      throw new Error('Cannot demote the last owner of an organization');
    }
  }

  const oldRole = membership.role;
  membership.role = newRole;
  await membership.save();

  console.log(`✅ Role changed from ${oldRole} to ${newRole}`);
  return membership;
};

/**
 * Suspend member
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} suspendedBy - User who suspended
 * @param {string} reason - Suspension reason
 * @returns {Promise<OrganizationMember>} Updated membership
 */
OrganizationMemberSchema.statics.suspend_member = async function(organizationId, userId, suspendedBy, reason = null) {
  console.log(`⏸️ Suspending member ${userId} in org ${organizationId}`);

  const membership = await this.findOne({
    organization_id: organizationId,
    user_id: userId,
    status: MEMBER_STATUSES.ACTIVE
  });

  if (!membership) {
    throw new Error('Membership not found');
  }

  // Prevent suspending owners
  if (membership.role === ORG_ROLES.ORG_OWNER) {
    throw new Error('Cannot suspend organization owners');
  }

  membership.status = MEMBER_STATUSES.SUSPENDED;
  membership.suspended_at = new Date();
  membership.suspended_by = suspendedBy;
  membership.suspension_reason = reason;
  await membership.save();

  console.log(`✅ Member suspended`);
  return membership;
};

/**
 * Reactivate suspended member
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} userId - User ID
 * @returns {Promise<OrganizationMember>} Updated membership
 */
OrganizationMemberSchema.statics.reactivate_member = async function(organizationId, userId) {
  console.log(`▶️ Reactivating member ${userId} in org ${organizationId}`);

  const membership = await this.findOne({
    organization_id: organizationId,
    user_id: userId,
    status: MEMBER_STATUSES.SUSPENDED
  });

  if (!membership) {
    throw new Error('Suspended membership not found');
  }

  membership.status = MEMBER_STATUSES.ACTIVE;
  membership.suspended_at = null;
  membership.suspended_by = null;
  membership.suspension_reason = null;
  await membership.save();

  console.log(`✅ Member reactivated`);
  return membership;
};

/**
 * Update last active timestamp
 * @returns {Promise<OrganizationMember>} Updated membership
 */
OrganizationMemberSchema.methods.update_last_active = async function() {
  this.last_active_at = new Date();
  return this.save();
};

/**
 * Get membership summary for API response
 * @returns {Object} Membership summary
 */
OrganizationMemberSchema.methods.get_summary = function() {
  return {
    id: this._id,
    organization_id: this.organization_id,
    user_id: this.user_id,
    role: this.role,
    status: this.status,
    joined_at: this.joined_at,
    last_active_at: this.last_active_at,
    created_at: this.created_at
  };
};

// Export constants
OrganizationMemberSchema.statics.ORG_ROLES = ORG_ROLES;
OrganizationMemberSchema.statics.MEMBER_STATUSES = MEMBER_STATUSES;

const OrganizationMember = mongoose.model('OrganizationMember', OrganizationMemberSchema);

module.exports = OrganizationMember;
