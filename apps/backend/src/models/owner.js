/**
 * Owner Model
 * MongoDB schema for LINE Official Account owners
 */

const { Schema, model } = require('mongoose');
const crypto = require('crypto');

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_32_chars_long_12345';
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const OwnerSchema = new Schema({
  // Organization link (required for multi-tenant)
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: false, // Will be required after migration
    index: true,
    description: 'Organization this LINE account belongs to'
  },
  // Status within organization
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked'],
    default: 'active',
    description: 'Status of LINE account within organization'
  },
  // Connected by which user
  connected_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    description: 'User who connected this LINE account'
  },
  connected_at: {
    type: Date,
    description: 'When LINE account was connected'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    description: 'Owner email address'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Owner full name'
  },
  line_channel_id: {
    type: String,
    required: true,
    unique: true,
    description: 'LINE Official Account Channel ID'
  },
  line_channel_secret: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt,
    description: 'LINE Official Account Channel Secret (encrypted)'
  },
  line_access_token: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt,
    description: 'LINE Official Account Access Token (encrypted)'
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free',
    description: 'Subscription plan'
  },
  usage: {
    total_messages: { type: Number, default: 0 },
    total_sessions: { type: Number, default: 0 },
    total_summaries: { type: Number, default: 0 },
    gemini_tokens_used: { type: Number, default: 0 },
    storage_used_mb: { type: Number, default: 0 }
  },
  settings: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    notifications: { type: Boolean, default: true },
    auto_summarize: { type: Boolean, default: true },
    session_trigger: {
      message_count: { type: Number, default: 50 },
      time_limit_hours: { type: Number, default: 24 }
    }
  },
  created_at: {
    type: Date,
    default: Date.now,
    description: 'Record creation timestamp'
  },
  updated_at: {
    type: Date,
    default: Date.now,
    description: 'Last update timestamp'
  }
}, {
  collection: 'owners',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes are handled by unique: true constraints above

// Instance methods
OwnerSchema.methods.increment_usage = function(field, amount = 1) {
  this.usage[field] = (this.usage[field] || 0) + amount;
  this.updated_at = new Date();
  return this.save();
};

OwnerSchema.methods.get_usage_summary = function() {
  return {
    owner_id: this._id,
    total_messages: this.usage.total_messages,
    total_sessions: this.usage.total_sessions,
    total_summaries: this.usage.total_summaries,
    gemini_tokens_used: this.usage.gemini_tokens_used,
    storage_used_mb: this.usage.storage_used_mb,
    plan: this.plan
  };
};

// Static methods
OwnerSchema.statics.find_by_channel_id = function(channelId) {
  return this.findOne({ line_channel_id: channelId });
};

/**
 * Find all LINE accounts for an organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of owners
 */
OwnerSchema.statics.find_by_organization = function(organizationId, status = 'active') {
  console.log(`🔍 Finding owners for organization: ${organizationId}`);
  const filter = { organization_id: organizationId };
  if (status) {
    filter.status = status;
  }
  return this.find(filter).sort({ created_at: -1 });
};

/**
 * Find LINE account by channel ID and organization
 * @param {string} channelId - LINE Channel ID
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Owner>} Owner document
 */
OwnerSchema.statics.find_by_channel_and_organization = function(channelId, organizationId) {
  console.log(`🔍 Finding owner by channel ${channelId} in org ${organizationId}`);
  return this.findOne({
    line_channel_id: channelId,
    organization_id: organizationId,
    status: 'active'
  });
};

OwnerSchema.statics.create_owner = async function(data) {
  console.log(`🆕 Creating new owner: ${data.email}`);

  const owner = new this({
    organization_id: data.organization_id,
    connected_by: data.connected_by,
    connected_at: data.connected_by ? new Date() : null,
    email: data.email,
    name: data.name,
    line_channel_id: data.line_channel_id,
    line_channel_secret: data.line_channel_secret,
    line_access_token: data.line_access_token,
    plan: data.plan || 'free',
    status: 'active'
  });

  // Increment organization LINE account count if org provided
  if (data.organization_id) {
    const Organization = require('./organization');
    await Organization.findByIdAndUpdate(
      data.organization_id,
      { $inc: { 'usage.current_line_accounts': 1 } }
    );
  }

  return owner.save();
};

// Pre-save middleware
OwnerSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new owner: ${this.email}`);
  } else {
    console.log(`📝 Updating owner: ${this.email}`);
  }
  next();
});

module.exports = model('Owner', OwnerSchema);