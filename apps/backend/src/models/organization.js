/**
 * Organization Model
 * @description Multi-tenant organization for commercial SaaS
 * @module models/organization
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Organization Schema
 * @description Represents a tenant organization in the multi-tenant architecture
 */
const OrganizationSchema = new Schema({
  // Identity
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Organization slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },

  // Branding
  logo_url: {
    type: String,
    default: null
  },
  primary_color: {
    type: String,
    default: '#3B82F6',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color']
  },

  // Status
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended', 'trial', 'cancelled'],
      message: 'Status must be one of: active, suspended, trial, cancelled'
    },
    default: 'trial'
  },

  // Subscription/Billing
  plan: {
    type: String,
    enum: {
      values: ['free', 'starter', 'professional', 'enterprise'],
      message: 'Plan must be one of: free, starter, professional, enterprise'
    },
    default: 'free'
  },
  plan_expires_at: {
    type: Date,
    default: null
  },

  // Limits based on plan
  limits: {
    max_users: {
      type: Number,
      default: 5,
      min: [1, 'Maximum users must be at least 1']
    },
    max_line_accounts: {
      type: Number,
      default: 1,
      min: [1, 'Maximum LINE accounts must be at least 1']
    },
    max_groups: {
      type: Number,
      default: 10,
      min: [1, 'Maximum groups must be at least 1']
    },
    max_messages_per_month: {
      type: Number,
      default: 10000,
      min: [0, 'Maximum messages per month cannot be negative']
    },
    ai_summaries_enabled: {
      type: Boolean,
      default: true
    }
  },

  // Usage tracking
  usage: {
    current_users: {
      type: Number,
      default: 0,
      min: 0
    },
    current_line_accounts: {
      type: Number,
      default: 0,
      min: 0
    },
    current_groups: {
      type: Number,
      default: 0,
      min: 0
    },
    messages_this_month: {
      type: Number,
      default: 0,
      min: 0
    },
    summaries_this_month: {
      type: Number,
      default: 0,
      min: 0
    },
    last_usage_reset: {
      type: Date,
      default: Date.now
    }
  },

  // Settings
  settings: {
    default_language: {
      type: String,
      enum: ['th', 'en'],
      default: 'th'
    },
    timezone: {
      type: String,
      default: 'Asia/Bangkok'
    },
    session_auto_close_messages: {
      type: Number,
      default: 50,
      min: [1, 'Session auto close messages must be at least 1']
    },
    session_auto_close_hours: {
      type: Number,
      default: 24,
      min: [1, 'Session auto close hours must be at least 1']
    }
  },

  // Group Activation Code - used to link LINE groups to this organization
  activation_code: {
    type: String,
    unique: true,
    sparse: true,  // Allow null values while maintaining uniqueness for non-null
    index: true
  },
  activation_code_generated_at: {
    type: Date,
    default: null
  },

  // Member Invite Code - used to invite members to join organization (requires approval)
  member_invite_code: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  member_invite_code_generated_at: {
    type: Date,
    default: null
  },

  // Metadata
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ plan: 1, status: 1 });
OrganizationSchema.index({ created_at: -1 });

// Virtual for checking if plan is expired
OrganizationSchema.virtual('is_plan_expired').get(function() {
  if (!this.plan_expires_at) return false;
  return new Date() > this.plan_expires_at;
});

// Virtual for checking if org can accept more users
OrganizationSchema.virtual('can_add_users').get(function() {
  return this.usage.current_users < this.limits.max_users;
});

// Virtual for checking if org can add more LINE accounts
OrganizationSchema.virtual('can_add_line_accounts').get(function() {
  return this.usage.current_line_accounts < this.limits.max_line_accounts;
});

/**
 * Generate slug from name
 * @param {string} name - Organization name
 * @returns {string} Generated slug
 */
OrganizationSchema.statics.generate_slug = function(name) {
  console.log(`🏷️ Generating slug from name: ${name}`);
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
};

/**
 * Find organization by slug
 * @param {string} slug - Organization slug
 * @returns {Promise<Organization>} Organization document
 */
OrganizationSchema.statics.find_by_slug = async function(slug) {
  console.log(`🔍 Finding organization by slug: ${slug}`);
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Generate a unique activation code
 * @returns {string} Unique activation code (format: ORG-XXXX-XXXX)
 */
OrganizationSchema.statics.generate_activation_code = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters: 0, O, I, 1
  let code = 'ORG-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Find organization by activation code
 * @param {string} code - Activation code
 * @returns {Promise<Organization>} Organization document or null
 */
OrganizationSchema.statics.find_by_activation_code = async function(code) {
  console.log(`🔍 Finding organization by activation code: ${code}`);
  if (!code) return null;
  return this.findOne({ activation_code: code.toUpperCase().trim() });
};

/**
 * Generate or regenerate activation code for this organization
 * @returns {Promise<Organization>} Updated organization with new activation code
 */
OrganizationSchema.methods.generate_new_activation_code = async function() {
  console.log(`🔑 Generating new activation code for org: ${this._id}`);

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const newCode = this.model('Organization').generate_activation_code();

    // Check if code is unique
    const existing = await this.model('Organization').findOne({
      activation_code: newCode,
      _id: { $ne: this._id }
    });

    if (!existing) {
      this.activation_code = newCode;
      this.activation_code_generated_at = new Date();
      await this.save();
      console.log(`✅ Generated activation code: ${newCode}`);
      return this;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique activation code after multiple attempts');
};

/**
 * Generate a unique member invite code
 * @returns {string} Unique member invite code (format: XXXX-XXXX)
 */
OrganizationSchema.statics.generate_member_invite_code = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters: 0, O, I, 1
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Find organization by member invite code
 * @param {string} code - Member invite code
 * @returns {Promise<Organization>} Organization document or null
 */
OrganizationSchema.statics.find_by_member_invite_code = async function(code) {
  console.log(`🔍 Finding organization by member invite code: ${code}`);
  if (!code) return null;
  return this.findOne({ member_invite_code: code.toUpperCase().trim() });
};

/**
 * Generate or regenerate member invite code for this organization
 * @returns {Promise<Organization>} Updated organization with new member invite code
 */
OrganizationSchema.methods.generate_new_member_invite_code = async function() {
  console.log(`🔑 Generating new member invite code for org: ${this._id}`);

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const newCode = this.model('Organization').generate_member_invite_code();

    // Check if code is unique
    const existing = await this.model('Organization').findOne({
      member_invite_code: newCode,
      _id: { $ne: this._id }
    });

    if (!existing) {
      this.member_invite_code = newCode;
      this.member_invite_code_generated_at = new Date();
      await this.save();
      console.log(`✅ Generated member invite code: ${newCode}`);
      return this;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique member invite code after multiple attempts');
};

/**
 * Check if slug is available
 * @param {string} slug - Slug to check
 * @param {ObjectId} excludeId - Optional ID to exclude from check
 * @returns {Promise<boolean>} True if slug is available
 */
OrganizationSchema.statics.is_slug_available = async function(slug, excludeId = null) {
  console.log(`🔍 Checking slug availability: ${slug}`);
  const query = { slug: slug.toLowerCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await this.findOne(query);
  return !existing;
};

/**
 * Get plan limits for a specific plan
 * @param {string} plan - Plan name
 * @returns {Object} Plan limits
 */
OrganizationSchema.statics.get_plan_limits = function(plan) {
  console.log(`📊 Getting limits for plan: ${plan}`);
  const limits = {
    free: {
      max_users: 5,
      max_line_accounts: 1,
      max_groups: 10,
      max_messages_per_month: 1000,
      ai_summaries_enabled: false
    },
    starter: {
      max_users: 10,
      max_line_accounts: 2,
      max_groups: 50,
      max_messages_per_month: 10000,
      ai_summaries_enabled: true
    },
    professional: {
      max_users: 50,
      max_line_accounts: 10,
      max_groups: 500,
      max_messages_per_month: 100000,
      ai_summaries_enabled: true
    },
    enterprise: {
      max_users: 1000,
      max_line_accounts: 100,
      max_groups: 10000,
      max_messages_per_month: Infinity,
      ai_summaries_enabled: true
    }
  };

  return limits[plan] || limits.free;
};

/**
 * Increment usage counter
 * @param {string} field - Usage field to increment
 * @param {number} amount - Amount to increment (default: 1)
 * @returns {Promise<Organization>} Updated organization
 */
OrganizationSchema.methods.increment_usage = async function(field, amount = 1) {
  console.log(`📈 Incrementing usage.${field} by ${amount} for org: ${this._id}`);
  const update = {};
  update[`usage.${field}`] = amount;
  return this.model('Organization').findByIdAndUpdate(
    this._id,
    { $inc: update },
    { new: true }
  );
};

/**
 * Decrement usage counter
 * @param {string} field - Usage field to decrement
 * @param {number} amount - Amount to decrement (default: 1)
 * @returns {Promise<Organization>} Updated organization
 */
OrganizationSchema.methods.decrement_usage = async function(field, amount = 1) {
  console.log(`📉 Decrementing usage.${field} by ${amount} for org: ${this._id}`);
  const update = {};
  update[`usage.${field}`] = -amount;
  return this.model('Organization').findByIdAndUpdate(
    this._id,
    { $inc: update },
    { new: true }
  );
};

/**
 * Reset monthly usage counters
 * @returns {Promise<Organization>} Updated organization
 */
OrganizationSchema.methods.reset_monthly_usage = async function() {
  console.log(`🔄 Resetting monthly usage for org: ${this._id}`);
  return this.model('Organization').findByIdAndUpdate(
    this._id,
    {
      $set: {
        'usage.messages_this_month': 0,
        'usage.summaries_this_month': 0,
        'usage.last_usage_reset': new Date()
      }
    },
    { new: true }
  );
};

/**
 * Update plan with new limits
 * @param {string} newPlan - New plan name
 * @param {Date} expiresAt - Optional plan expiration date
 * @returns {Promise<Organization>} Updated organization
 */
OrganizationSchema.methods.update_plan = async function(newPlan, expiresAt = null) {
  console.log(`💳 Updating plan to ${newPlan} for org: ${this._id}`);
  const newLimits = this.model('Organization').get_plan_limits(newPlan);

  return this.model('Organization').findByIdAndUpdate(
    this._id,
    {
      $set: {
        plan: newPlan,
        limits: newLimits,
        plan_expires_at: expiresAt
      }
    },
    { new: true }
  );
};

/**
 * Check if organization can perform action based on limits
 * @param {string} action - Action to check ('add_user', 'add_line_account', 'send_message', 'generate_summary')
 * @returns {Object} { allowed: boolean, reason?: string }
 */
OrganizationSchema.methods.can_perform_action = function(action) {
  console.log(`🔐 Checking if org ${this._id} can perform: ${action}`);

  // Check if org is active
  if (this.status !== 'active' && this.status !== 'trial') {
    return { allowed: false, reason: `Organization is ${this.status}` };
  }

  // Check if plan is expired
  if (this.is_plan_expired) {
    return { allowed: false, reason: 'Plan has expired' };
  }

  switch (action) {
    case 'add_user':
      if (this.usage.current_users >= this.limits.max_users) {
        return {
          allowed: false,
          reason: `User limit reached (${this.limits.max_users} users)`
        };
      }
      break;

    case 'add_line_account':
      if (this.usage.current_line_accounts >= this.limits.max_line_accounts) {
        return {
          allowed: false,
          reason: `LINE account limit reached (${this.limits.max_line_accounts} accounts)`
        };
      }
      break;

    case 'send_message':
      if (this.usage.messages_this_month >= this.limits.max_messages_per_month) {
        return {
          allowed: false,
          reason: `Monthly message limit reached (${this.limits.max_messages_per_month} messages)`
        };
      }
      break;

    case 'generate_summary':
      if (!this.limits.ai_summaries_enabled) {
        return {
          allowed: false,
          reason: 'AI summaries not enabled for your plan'
        };
      }
      break;

    default:
      console.warn(`⚠️ Unknown action: ${action}`);
  }

  return { allowed: true };
};

/**
 * Get organization summary for API response
 * @returns {Object} Organization summary
 */
OrganizationSchema.methods.get_summary = function() {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    logo_url: this.logo_url,
    primary_color: this.primary_color,
    status: this.status,
    plan: this.plan,
    plan_expires_at: this.plan_expires_at,
    is_plan_expired: this.is_plan_expired,
    limits: this.limits,
    usage: this.usage,
    settings: this.settings,
    activation_code: this.activation_code,
    activation_code_generated_at: this.activation_code_generated_at,
    member_invite_code: this.member_invite_code,
    member_invite_code_generated_at: this.member_invite_code_generated_at,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
};

// Pre-validate middleware to generate slug if not provided
// Note: Using pre-validate instead of pre-save so slug is set before required validation runs
OrganizationSchema.pre('validate', async function(next) {
  if (this.isNew && !this.slug) {
    let baseSlug = this.model('Organization').generate_slug(this.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (!(await this.model('Organization').is_slug_available(slug))) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
    console.log(`✅ Generated unique slug: ${this.slug}`);
  }
  next();
});

const Organization = mongoose.model('Organization', OrganizationSchema);

module.exports = Organization;
