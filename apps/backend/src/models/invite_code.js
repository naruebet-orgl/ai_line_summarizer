/**
 * Invite Code Model
 * Organization invite codes for users to request joining
 */

const { Schema, model } = require('mongoose');
const crypto = require('crypto');

const InviteCodeSchema = new Schema({
  // Organization this code belongs to
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
    description: 'Organization this invite code belongs to'
  },

  // The actual invite code (e.g., "ACME-X7K9-2024")
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
    description: 'Unique invite code'
  },

  // Optional name/label for the code
  name: {
    type: String,
    trim: true,
    description: 'Optional label for this invite code (e.g., "Marketing Team Code")'
  },

  // Default role for users who join with this code
  default_role: {
    type: String,
    enum: ['org_admin', 'org_member', 'org_viewer'],
    default: 'org_member',
    description: 'Role assigned to users who join with this code'
  },

  // Code status
  status: {
    type: String,
    enum: ['active', 'disabled', 'expired'],
    default: 'active',
    index: true,
    description: 'Current status of the invite code'
  },

  // Usage tracking
  usage: {
    max_uses: {
      type: Number,
      default: null, // null = unlimited
      description: 'Maximum number of times this code can be used'
    },
    current_uses: {
      type: Number,
      default: 0,
      description: 'Number of times this code has been used'
    }
  },

  // Expiration
  expires_at: {
    type: Date,
    default: null, // null = never expires
    description: 'When this code expires'
  },

  // Auto-approve setting
  auto_approve: {
    type: Boolean,
    default: false,
    description: 'If true, users are automatically added without approval'
  },

  // Creator tracking
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    description: 'User who created this invite code'
  },

  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'invite_codes',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes
InviteCodeSchema.index({ organization_id: 1, status: 1 });
InviteCodeSchema.index({ code: 1 }, { unique: true });
InviteCodeSchema.index({ expires_at: 1 });

// ════════════════════════════════════════════════════════════════
// Static Methods
// ════════════════════════════════════════════════════════════════

/**
 * Generate a unique invite code
 * Format: XXXX-XXXX (8 characters, uppercase alphanumeric)
 * @returns {string} Generated code
 */
InviteCodeSchema.statics.generate_code = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Create a new invite code for an organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} createdBy - User ID who created the code
 * @param {Object} options - Optional settings
 * @returns {Promise<InviteCode>} Created invite code
 */
InviteCodeSchema.statics.create_invite_code = async function(organizationId, createdBy, options = {}) {
  console.log(`🎟️ Creating invite code for organization: ${organizationId}`);

  const {
    name = null,
    default_role = 'org_member',
    max_uses = null,
    expires_in_days = null,
    auto_approve = false
  } = options;

  // Generate unique code
  let code;
  let attempts = 0;
  while (attempts < 5) {
    code = this.generate_code();
    const existing = await this.findOne({ code });
    if (!existing) break;
    attempts++;
  }

  if (attempts >= 5) {
    throw new Error('Failed to generate unique invite code');
  }

  // Calculate expiration
  let expires_at = null;
  if (expires_in_days) {
    expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
  }

  const inviteCode = new this({
    organization_id: organizationId,
    code,
    name,
    default_role,
    status: 'active',
    usage: {
      max_uses,
      current_uses: 0
    },
    expires_at,
    auto_approve,
    created_by: createdBy
  });

  await inviteCode.save();
  console.log(`✅ Invite code created: ${code}`);

  return inviteCode;
};

/**
 * Find and validate an invite code
 * @param {string} code - The invite code to validate
 * @returns {Promise<Object>} { valid: boolean, invite_code?: InviteCode, error?: string }
 */
InviteCodeSchema.statics.validate_code = async function(code) {
  console.log(`🔍 Validating invite code: ${code}`);

  const inviteCode = await this.findOne({
    code: code.toUpperCase().trim()
  }).populate('organization_id', 'name slug status plan');

  if (!inviteCode) {
    return { valid: false, error: 'Invalid invite code' };
  }

  // Check status
  if (inviteCode.status !== 'active') {
    return { valid: false, error: 'This invite code is no longer active' };
  }

  // Check expiration
  if (inviteCode.expires_at && inviteCode.expires_at < new Date()) {
    // Mark as expired
    inviteCode.status = 'expired';
    await inviteCode.save();
    return { valid: false, error: 'This invite code has expired' };
  }

  // Check usage limit
  if (inviteCode.usage.max_uses !== null &&
      inviteCode.usage.current_uses >= inviteCode.usage.max_uses) {
    return { valid: false, error: 'This invite code has reached its usage limit' };
  }

  // Check organization status
  if (inviteCode.organization_id.status !== 'active') {
    return { valid: false, error: 'This organization is not accepting new members' };
  }

  console.log(`✅ Invite code valid for org: ${inviteCode.organization_id.name}`);

  return {
    valid: true,
    invite_code: inviteCode,
    organization: inviteCode.organization_id
  };
};

/**
 * Increment usage count for an invite code
 * @param {string} codeId - Invite code ID
 * @returns {Promise<InviteCode>} Updated invite code
 */
InviteCodeSchema.statics.increment_usage = async function(codeId) {
  return this.findByIdAndUpdate(
    codeId,
    {
      $inc: { 'usage.current_uses': 1 },
      updated_at: new Date()
    },
    { new: true }
  );
};

/**
 * Get all invite codes for an organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {boolean} activeOnly - Only return active codes
 * @returns {Promise<Array>} Array of invite codes
 */
InviteCodeSchema.statics.get_by_organization = function(organizationId, activeOnly = false) {
  const filter = { organization_id: organizationId };
  if (activeOnly) {
    filter.status = 'active';
    filter.$or = [
      { expires_at: null },
      { expires_at: { $gt: new Date() } }
    ];
  }

  return this.find(filter)
    .populate('created_by', 'name email')
    .sort({ created_at: -1 });
};

/**
 * Disable an invite code
 * @param {string} codeId - Invite code ID
 * @param {ObjectId} organizationId - Organization ID (for validation)
 * @returns {Promise<InviteCode>} Updated invite code
 */
InviteCodeSchema.statics.disable_code = async function(codeId, organizationId) {
  console.log(`🚫 Disabling invite code: ${codeId}`);

  const inviteCode = await this.findOneAndUpdate(
    { _id: codeId, organization_id: organizationId },
    { status: 'disabled', updated_at: new Date() },
    { new: true }
  );

  if (!inviteCode) {
    throw new Error('Invite code not found');
  }

  console.log(`✅ Invite code disabled: ${inviteCode.code}`);
  return inviteCode;
};

// ════════════════════════════════════════════════════════════════
// Instance Methods
// ════════════════════════════════════════════════════════════════

/**
 * Get invite code summary for API response
 * @returns {Object} Invite code summary
 */
InviteCodeSchema.methods.get_summary = function() {
  return {
    id: this._id,
    code: this.code,
    name: this.name,
    default_role: this.default_role,
    status: this.status,
    auto_approve: this.auto_approve,
    usage: {
      max_uses: this.usage.max_uses,
      current_uses: this.usage.current_uses,
      remaining: this.usage.max_uses ? this.usage.max_uses - this.usage.current_uses : null
    },
    expires_at: this.expires_at,
    is_expired: this.expires_at ? this.expires_at < new Date() : false,
    created_by: this.created_by,
    created_at: this.created_at
  };
};

// Pre-save middleware
InviteCodeSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new invite code: ${this.code}`);
  }
  next();
});

module.exports = model('InviteCode', InviteCodeSchema);
