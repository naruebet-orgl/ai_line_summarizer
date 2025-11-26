/**
 * Join Request Model
 * Tracks user requests to join organizations (pending approval)
 */

const { Schema, model } = require('mongoose');

const JoinRequestSchema = new Schema({
  // User requesting to join
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    description: 'User who is requesting to join'
  },

  // Organization to join
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
    description: 'Organization the user wants to join'
  },

  // Invite code used (if any)
  invite_code_id: {
    type: Schema.Types.ObjectId,
    ref: 'InviteCode',
    description: 'Invite code used to submit this request'
  },

  // The actual code string (for reference)
  invite_code: {
    type: String,
    description: 'The invite code string used'
  },

  // Requested role (from invite code default or specified)
  requested_role: {
    type: String,
    enum: ['org_admin', 'org_member', 'org_viewer'],
    default: 'org_member',
    description: 'Role the user will get upon approval'
  },

  // Request status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
    description: 'Current status of the join request'
  },

  // Optional message from user
  message: {
    type: String,
    maxlength: 500,
    description: 'Optional message from the user explaining why they want to join'
  },

  // Approval/Rejection tracking
  reviewed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    description: 'User who approved or rejected this request'
  },
  reviewed_at: {
    type: Date,
    description: 'When the request was reviewed'
  },
  rejection_reason: {
    type: String,
    maxlength: 500,
    description: 'Reason for rejection (if rejected)'
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'join_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes
JoinRequestSchema.index({ organization_id: 1, status: 1 });
JoinRequestSchema.index({ user_id: 1, organization_id: 1 }, { unique: true });
JoinRequestSchema.index({ status: 1, created_at: -1 });

// ════════════════════════════════════════════════════════════════
// Static Methods
// ════════════════════════════════════════════════════════════════

/**
 * Create a join request
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} organizationId - Organization ID
 * @param {Object} options - Options (invite_code_id, invite_code, role, message)
 * @returns {Promise<JoinRequest>} Created join request
 */
JoinRequestSchema.statics.create_request = async function(userId, organizationId, options = {}) {
  console.log(`📝 Creating join request: user ${userId} -> org ${organizationId}`);

  const {
    invite_code_id = null,
    invite_code = null,
    requested_role = 'org_member',
    message = null
  } = options;

  // Check if user already has a pending request
  const existingRequest = await this.findOne({
    user_id: userId,
    organization_id: organizationId,
    status: 'pending'
  });

  if (existingRequest) {
    console.log(`⚠️ User already has a pending request`);
    return existingRequest;
  }

  // Check if user is already a member
  const OrganizationMember = require('./organization_member');
  const existingMember = await OrganizationMember.findOne({
    user_id: userId,
    organization_id: organizationId,
    status: 'active'
  });

  if (existingMember) {
    throw new Error('You are already a member of this organization');
  }

  const joinRequest = new this({
    user_id: userId,
    organization_id: organizationId,
    invite_code_id,
    invite_code,
    requested_role,
    message,
    status: 'pending'
  });

  await joinRequest.save();
  console.log(`✅ Join request created: ${joinRequest._id}`);

  return joinRequest;
};

/**
 * Approve a join request
 * @param {string} requestId - Join request ID
 * @param {ObjectId} reviewedBy - User ID who approved
 * @returns {Promise<Object>} { request, membership }
 */
JoinRequestSchema.statics.approve_request = async function(requestId, reviewedBy) {
  console.log(`✅ Approving join request: ${requestId}`);

  const request = await this.findById(requestId)
    .populate('user_id', 'name email')
    .populate('organization_id', 'name slug');

  if (!request) {
    throw new Error('Join request not found');
  }

  if (request.status !== 'pending') {
    throw new Error(`Request is already ${request.status}`);
  }

  // Update request status
  request.status = 'approved';
  request.reviewed_by = reviewedBy;
  request.reviewed_at = new Date();
  await request.save();

  // Add user as organization member
  const OrganizationMember = require('./organization_member');
  const membership = await OrganizationMember.add_member(
    request.organization_id._id,
    request.user_id._id,
    request.requested_role,
    reviewedBy
  );

  // Update user's organizations array
  const User = require('./user');
  await User.findByIdAndUpdate(request.user_id._id, {
    $push: {
      organizations: {
        organization_id: request.organization_id._id,
        role: request.requested_role,
        joined_at: new Date()
      }
    }
  });

  // Increment invite code usage if applicable
  if (request.invite_code_id) {
    const InviteCode = require('./invite_code');
    await InviteCode.increment_usage(request.invite_code_id);
  }

  console.log(`✅ User ${request.user_id.email} added to ${request.organization_id.name}`);

  return { request, membership };
};

/**
 * Reject a join request
 * @param {string} requestId - Join request ID
 * @param {ObjectId} reviewedBy - User ID who rejected
 * @param {string} reason - Optional rejection reason
 * @returns {Promise<JoinRequest>} Updated request
 */
JoinRequestSchema.statics.reject_request = async function(requestId, reviewedBy, reason = null) {
  console.log(`❌ Rejecting join request: ${requestId}`);

  const request = await this.findById(requestId);

  if (!request) {
    throw new Error('Join request not found');
  }

  if (request.status !== 'pending') {
    throw new Error(`Request is already ${request.status}`);
  }

  request.status = 'rejected';
  request.reviewed_by = reviewedBy;
  request.reviewed_at = new Date();
  request.rejection_reason = reason;
  await request.save();

  console.log(`✅ Join request rejected`);

  return request;
};

/**
 * Cancel a join request (by the user)
 * @param {string} requestId - Join request ID
 * @param {ObjectId} userId - User ID (must match request user)
 * @returns {Promise<JoinRequest>} Updated request
 */
JoinRequestSchema.statics.cancel_request = async function(requestId, userId) {
  console.log(`🚫 Cancelling join request: ${requestId}`);

  const request = await this.findOne({
    _id: requestId,
    user_id: userId,
    status: 'pending'
  });

  if (!request) {
    throw new Error('Join request not found or cannot be cancelled');
  }

  request.status = 'cancelled';
  await request.save();

  console.log(`✅ Join request cancelled`);

  return request;
};

/**
 * Get pending requests for an organization
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Array>} Array of pending requests
 */
JoinRequestSchema.statics.get_pending_for_organization = function(organizationId) {
  return this.find({
    organization_id: organizationId,
    status: 'pending'
  })
    .populate('user_id', 'name email avatar_url')
    .populate('invite_code_id', 'code name')
    .sort({ created_at: -1 });
};

/**
 * Get all requests for an organization (with pagination)
 * @param {ObjectId} organizationId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { requests, total }
 */
JoinRequestSchema.statics.get_requests_for_organization = async function(organizationId, options = {}) {
  const {
    status = null,
    limit = 20,
    skip = 0
  } = options;

  const filter = { organization_id: organizationId };
  if (status) filter.status = status;

  const [requests, total] = await Promise.all([
    this.find(filter)
      .populate('user_id', 'name email avatar_url')
      .populate('reviewed_by', 'name email')
      .populate('invite_code_id', 'code name')
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(skip),
    this.countDocuments(filter)
  ]);

  return { requests, total };
};

/**
 * Get requests by user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of user's requests
 */
JoinRequestSchema.statics.get_requests_by_user = function(userId) {
  return this.find({ user_id: userId })
    .populate('organization_id', 'name slug logo_url')
    .sort({ created_at: -1 });
};

/**
 * Count pending requests for an organization
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<number>} Count of pending requests
 */
JoinRequestSchema.statics.count_pending = function(organizationId) {
  return this.countDocuments({
    organization_id: organizationId,
    status: 'pending'
  });
};

// ════════════════════════════════════════════════════════════════
// Instance Methods
// ════════════════════════════════════════════════════════════════

/**
 * Get request summary for API response
 * @returns {Object} Request summary
 */
JoinRequestSchema.methods.get_summary = function() {
  return {
    id: this._id,
    user: this.user_id,
    organization: this.organization_id,
    invite_code: this.invite_code,
    requested_role: this.requested_role,
    status: this.status,
    message: this.message,
    reviewed_by: this.reviewed_by,
    reviewed_at: this.reviewed_at,
    rejection_reason: this.rejection_reason,
    created_at: this.created_at
  };
};

// Pre-save middleware
JoinRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new join request for org: ${this.organization_id}`);
  }
  next();
});

module.exports = model('JoinRequest', JoinRequestSchema);
