/**
 * Audit Log Model
 * @description Tracks all significant actions in the platform for security and compliance
 * @module models/audit_log
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Audit Log Schema
 * @description Records user actions for security auditing and compliance
 */
const AuditLogSchema = new Schema({
  // Context
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Event identification
  action: {
    type: String,
    required: true,
    index: true
    // Examples: 'user:login', 'session:delete', 'member:invite', 'settings:update'
  },
  category: {
    type: String,
    enum: ['auth', 'user', 'organization', 'member', 'session', 'summary', 'room', 'settings', 'billing', 'system'],
    default: 'system',
    index: true
  },

  // Resource being acted upon
  resource_type: {
    type: String,
    enum: ['user', 'organization', 'session', 'summary', 'room', 'member', 'invite_code', 'join_request', 'settings', 'owner'],
  },
  resource_id: {
    type: Schema.Types.ObjectId,
    index: true
  },

  // Action details
  description: {
    type: String,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Before/After state (for update operations)
  changes: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed
  },

  // Request context
  ip_address: {
    type: String,
    maxlength: 45 // IPv6 max length
  },
  user_agent: {
    type: String,
    maxlength: 500
  },
  request_id: String,

  // Result
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success',
    index: true
  },
  error_message: String,
  error_code: String,

  // Timestamp
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Auto-expire logs after 90 days (configurable via env)
  expireAfterSeconds: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90') * 24 * 60 * 60
});

// Compound indexes for common queries
AuditLogSchema.index({ organization_id: 1, created_at: -1 });
AuditLogSchema.index({ user_id: 1, created_at: -1 });
AuditLogSchema.index({ action: 1, created_at: -1 });
AuditLogSchema.index({ organization_id: 1, action: 1, created_at: -1 });
AuditLogSchema.index({ organization_id: 1, category: 1, created_at: -1 });
AuditLogSchema.index({ resource_type: 1, resource_id: 1, created_at: -1 });

/**
 * Create an audit log entry
 * @param {Object} data - Audit log data
 * @returns {Promise<AuditLog>} Created audit log
 */
AuditLogSchema.statics.log = async function(data) {
  console.log(`📝 Audit: ${data.action} by user ${data.user_id}`);

  try {
    const log = await this.create({
      organization_id: data.organization_id,
      user_id: data.user_id,
      action: data.action,
      category: data.category || extract_category(data.action),
      resource_type: data.resource_type,
      resource_id: data.resource_id,
      description: data.description,
      metadata: data.metadata || {},
      changes: data.changes,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      request_id: data.request_id,
      status: data.status || 'success',
      error_message: data.error_message,
      error_code: data.error_code,
    });

    return log;
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error('❌ Audit log error:', error);
    return null;
  }
};

/**
 * Log a successful action
 * @param {Object} data - Audit data
 * @returns {Promise<AuditLog>}
 */
AuditLogSchema.statics.log_success = async function(data) {
  return this.log({ ...data, status: 'success' });
};

/**
 * Log a failed action
 * @param {Object} data - Audit data
 * @returns {Promise<AuditLog>}
 */
AuditLogSchema.statics.log_failure = async function(data) {
  return this.log({ ...data, status: 'failure' });
};

/**
 * Log an error
 * @param {Object} data - Audit data
 * @returns {Promise<AuditLog>}
 */
AuditLogSchema.statics.log_error = async function(data) {
  return this.log({ ...data, status: 'error' });
};

/**
 * Get logs for an organization
 * @param {ObjectId} org_id - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<AuditLog[]>}
 */
AuditLogSchema.statics.get_org_logs = async function(org_id, options = {}) {
  console.log(`📋 Getting audit logs for org: ${org_id}`);

  const {
    page = 1,
    limit = 50,
    category,
    action,
    user_id,
    status,
    start_date,
    end_date,
  } = options;

  const filter = { organization_id: org_id };

  if (category) filter.category = category;
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (user_id) filter.user_id = user_id;
  if (status) filter.status = status;

  if (start_date || end_date) {
    filter.created_at = {};
    if (start_date) filter.created_at.$gte = new Date(start_date);
    if (end_date) filter.created_at.$lte = new Date(end_date);
  }

  const logs = await this.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user_id', 'name email')
    .lean();

  const total = await this.countDocuments(filter);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get logs for a user
 * @param {ObjectId} user_id - User ID
 * @param {Object} options - Query options
 * @returns {Promise<AuditLog[]>}
 */
AuditLogSchema.statics.get_user_logs = async function(user_id, options = {}) {
  console.log(`📋 Getting audit logs for user: ${user_id}`);

  const { page = 1, limit = 50 } = options;

  const logs = await this.find({ user_id })
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('organization_id', 'name slug')
    .lean();

  const total = await this.countDocuments({ user_id });

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get recent activity for dashboard
 * @param {ObjectId} org_id - Organization ID
 * @param {number} limit - Number of entries
 * @returns {Promise<AuditLog[]>}
 */
AuditLogSchema.statics.get_recent_activity = async function(org_id, limit = 10) {
  console.log(`📋 Getting recent activity for org: ${org_id}`);

  return this.find({ organization_id: org_id })
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('user_id', 'name email')
    .lean();
};

/**
 * Get action counts by category for analytics
 * @param {ObjectId} org_id - Organization ID
 * @param {Date} since - Start date
 * @returns {Promise<Object>}
 */
AuditLogSchema.statics.get_action_stats = async function(org_id, since = null) {
  console.log(`📊 Getting action stats for org: ${org_id}`);

  const match = { organization_id: org_id };
  if (since) {
    match.created_at = { $gte: since };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failure: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
        error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
      }
    },
    { $sort: { count: -1 } }
  ]);

  return stats;
};

/**
 * Extract category from action string
 * @param {string} action - Action string (e.g., 'user:login')
 * @returns {string} Category
 */
function extract_category(action) {
  if (!action) return 'system';

  const parts = action.split(':');
  const category_map = {
    'user': 'user',
    'auth': 'auth',
    'login': 'auth',
    'logout': 'auth',
    'organization': 'organization',
    'org': 'organization',
    'member': 'member',
    'session': 'session',
    'summary': 'summary',
    'room': 'room',
    'group': 'room',
    'settings': 'settings',
    'billing': 'billing',
    'invite': 'member',
    'join': 'member',
  };

  return category_map[parts[0]] || 'system';
}

/**
 * Format log entry for API response
 */
AuditLogSchema.methods.to_summary = function() {
  return {
    id: this._id,
    action: this.action,
    category: this.category,
    description: this.description,
    resource_type: this.resource_type,
    status: this.status,
    user: this.user_id ? {
      id: this.user_id._id || this.user_id,
      name: this.user_id.name,
      email: this.user_id.email
    } : null,
    created_at: this.created_at,
    metadata: this.metadata
  };
};

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
