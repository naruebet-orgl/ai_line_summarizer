/**
 * Room Model
 * MongoDB schema for LINE chat rooms (groups/individual chats)
 */

const { Schema, model } = require('mongoose');

const RoomSchema = new Schema({
  // Organization link (for multi-tenant data isolation)
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: false, // Will be required after migration
    index: true,
    description: 'Organization this room belongs to'
  },
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    description: 'Reference to the owner'
  },
  line_room_id: {
    type: String,
    required: true,
    description: 'LINE room/group/user ID'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Display name of the room'
  },
  type: {
    type: String,
    enum: ['individual', 'group'],
    required: true,
    description: 'Type of LINE room'
  },
  is_active: {
    type: Boolean,
    default: true,
    description: 'Whether the room is active'
  },
  statistics: {
    total_sessions: { type: Number, default: 0 },
    total_messages: { type: Number, default: 0 },
    total_summaries: { type: Number, default: 0 },
    last_activity_at: { type: Date, default: Date.now }
  },
  settings: {
    auto_summarize: { type: Boolean, default: true },
    session_trigger: {
      message_count: { type: Number, default: 50 },
      time_limit_hours: { type: Number, default: 24 }
    }
  },

  // Group assignment (for internal organization categorization)
  assignment: {
    category: {
      type: String,
      enum: ['sales', 'support', 'operations', 'marketing', 'other', 'unassigned'],
      default: 'unassigned',
      description: 'Business category for this group'
    },
    tags: {
      type: [String],
      default: [],
      description: 'Custom tags for filtering/grouping'
    },
    custom_name: {
      type: String,
      trim: true,
      description: 'Override LINE group name with custom display name'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
      description: 'Priority level for this group'
    },
    assigned_to: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      description: 'Users assigned to monitor this group'
    }],
    notes: {
      type: String,
      maxlength: 1000,
      description: 'Internal notes about this group'
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
  collection: 'rooms',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Compound indexes
RoomSchema.index({ owner_id: 1, line_room_id: 1 }, { unique: true });
RoomSchema.index({ owner_id: 1, is_active: 1 });
RoomSchema.index({ organization_id: 1, is_active: 1 });
RoomSchema.index({ organization_id: 1, type: 1 });
RoomSchema.index({ 'statistics.last_activity_at': -1 });

// Phase 3: Organization + line_room_id unique index (for multi-tenant isolation)
RoomSchema.index({ organization_id: 1, line_room_id: 1 }, {
  unique: true,
  partialFilterExpression: { organization_id: { $exists: true } }
});

// Phase 3: Category-based queries
RoomSchema.index({ organization_id: 1, 'assignment.category': 1 });
RoomSchema.index({ organization_id: 1, 'assignment.priority': 1 });
RoomSchema.index({ organization_id: 1, 'assignment.tags': 1 });

// Instance methods
RoomSchema.methods.update_activity = function() {
  this.statistics.last_activity_at = new Date();
  this.updated_at = new Date();
  return this.save();
};

RoomSchema.methods.increment_statistics = function(field, amount = 1) {
  this.statistics[field] = (this.statistics[field] || 0) + amount;
  this.statistics.last_activity_at = new Date();
  this.updated_at = new Date();
  return this.save();
};

RoomSchema.methods.get_room_summary = function() {
  return {
    room_id: this._id,
    organization_id: this.organization_id,
    owner_id: this.owner_id,
    line_room_id: this.line_room_id,
    name: this.name,
    display_name: this.assignment?.custom_name || this.name,
    type: this.type,
    is_active: this.is_active,
    statistics: this.statistics,
    assignment: this.assignment || {
      category: 'unassigned',
      tags: [],
      priority: 'normal'
    },
    settings: this.settings
  };
};

// Static methods
// Get all groups the AI bot is in
RoomSchema.statics.get_ai_groups = function(ownerId, isActive = null) {
  const filter = {
    type: 'group'
    // NOTE: Not filtering by owner_id to handle legacy data without owner_id
    // In production with multiple owners, this should be re-enabled
  };

  // Only filter by is_active if explicitly specified
  if (isActive !== null) {
    filter.is_active = isActive;
  }

  return this.find(filter)
    .select('line_room_id name statistics created_at updated_at is_active owner_id')
    .sort({ 'statistics.last_activity_at': -1 });
};

// Get active groups with recent activity
RoomSchema.statics.get_active_groups = function(ownerId, minutesAgo = 60) {
  const since = new Date(Date.now() - minutesAgo * 60 * 1000);
  return this.find({
    owner_id: ownerId,
    type: 'group',
    is_active: true,
    'statistics.last_activity_at': { $gte: since }
  }).select('line_room_id name statistics').sort({ 'statistics.last_activity_at': -1 });
};

// Get group by LINE group ID
RoomSchema.statics.get_group_by_line_id = function(lineGroupId, ownerId) {
  return this.findOne({
    line_room_id: lineGroupId,
    owner_id: ownerId,
    type: 'group'
  });
};

// Get group statistics
RoomSchema.statics.get_group_stats = function(ownerId) {
  return this.aggregate([
    { $match: { owner_id: ownerId, type: 'group', is_active: true } },
    {
      $group: {
        _id: null,
        totalGroups: { $sum: 1 },
        totalSessions: { $sum: '$statistics.total_sessions' },
        totalMessages: { $sum: '$statistics.total_messages' },
        totalSummaries: { $sum: '$statistics.total_summaries' },
        avgMessagesPerGroup: { $avg: '$statistics.total_messages' },
        mostActiveGroup: { $max: '$statistics.total_messages' }
      }
    }
  ]);
};

RoomSchema.statics.find_or_create_room = async function(ownerId, lineRoomId, name, type) {
  console.log(`🏠 Finding or creating room: ${name} (${lineRoomId})`);

  let room = await this.findOne({ owner_id: ownerId, line_room_id: lineRoomId });

  if (!room) {
    room = new this({
      owner_id: ownerId,
      line_room_id: lineRoomId,
      name,
      type,
      is_active: true
    });
    await room.save();
    console.log(`✅ New room created: ${room.name} (${room._id})`);
  } else {
    // Update activity
    await room.update_activity();
  }

  return room;
};

RoomSchema.statics.get_rooms_by_owner = function(ownerId, isActive = true, limit = 50, skip = 0) {
  return this.find({ owner_id: ownerId, is_active: isActive })
    .sort({ 'statistics.last_activity_at': -1 })
    .limit(limit)
    .skip(skip);
};

RoomSchema.statics.get_active_rooms_with_sessions = function(ownerId) {
  return this.aggregate([
    { $match: { owner_id: ownerId, is_active: true } },
    {
      $lookup: {
        from: 'chat_sessions',
        localField: '_id',
        foreignField: 'room_id',
        as: 'active_sessions',
        pipeline: [
          { $match: { status: 'active' } },
          { $project: { _id: 1, session_id: 1, start_time: 1, message_count: { $size: '$message_logs' } } }
        ]
      }
    },
    {
      $project: {
        name: 1,
        type: 1,
        line_room_id: 1,
        statistics: 1,
        active_sessions: 1,
        has_active_session: { $gt: [{ $size: '$active_sessions' }, 0] }
      }
    },
    { $sort: { 'statistics.last_activity_at': -1 } }
  ]);
};

// ════════════════════════════════════════════════════════════════
// Organization-scoped static methods
// ════════════════════════════════════════════════════════════════

/**
 * Get rooms by organization ID
 * @param {ObjectId} organizationId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of rooms
 */
RoomSchema.statics.get_rooms_by_organization = function(organizationId, options = {}) {
  console.log(`🏢 Getting rooms for organization: ${organizationId}`);
  const {
    type = null,
    isActive = true,
    limit = 50,
    skip = 0,
    sortBy = 'statistics.last_activity_at'
  } = options;

  const filter = { organization_id: organizationId };
  if (type) filter.type = type;
  if (isActive !== null) filter.is_active = isActive;

  return this.find(filter)
    .sort({ [sortBy]: -1 })
    .limit(limit)
    .skip(skip)
    .populate('owner_id', 'name email');
};

/**
 * Get groups by organization ID
 * @param {ObjectId} organizationId - Organization ID
 * @param {boolean} isActive - Filter by active status
 * @returns {Promise<Array>} Array of group rooms
 */
RoomSchema.statics.get_groups_by_organization = function(organizationId, isActive = true) {
  console.log(`🏢 Getting groups for organization: ${organizationId}`);
  const filter = {
    organization_id: organizationId,
    type: 'group'
  };
  if (isActive !== null) filter.is_active = isActive;

  return this.find(filter)
    .select('line_room_id name statistics created_at updated_at is_active owner_id')
    .sort({ 'statistics.last_activity_at': -1 });
};

/**
 * Get organization group statistics
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Object>} Aggregated statistics
 */
RoomSchema.statics.get_organization_group_stats = function(organizationId) {
  console.log(`📊 Getting organization group stats: ${organizationId}`);
  return this.aggregate([
    { $match: { organization_id: organizationId, type: 'group', is_active: true } },
    {
      $group: {
        _id: null,
        totalGroups: { $sum: 1 },
        totalSessions: { $sum: '$statistics.total_sessions' },
        totalMessages: { $sum: '$statistics.total_messages' },
        totalSummaries: { $sum: '$statistics.total_summaries' },
        avgMessagesPerGroup: { $avg: '$statistics.total_messages' },
        mostActiveGroup: { $max: '$statistics.total_messages' }
      }
    }
  ]);
};

/**
 * Find or create room with organization context
 * @param {ObjectId} organizationId - Organization ID
 * @param {ObjectId} ownerId - Owner ID
 * @param {string} lineRoomId - LINE room ID
 * @param {string} name - Room name
 * @param {string} type - Room type (individual/group)
 * @returns {Promise<Room>} Room document
 */
RoomSchema.statics.find_or_create_room_with_org = async function(organizationId, ownerId, lineRoomId, name, type) {
  console.log(`🏠 Finding or creating room with org: ${name} (${lineRoomId})`);

  let room = await this.findOne({ owner_id: ownerId, line_room_id: lineRoomId });

  if (!room) {
    room = new this({
      organization_id: organizationId,
      owner_id: ownerId,
      line_room_id: lineRoomId,
      name,
      type,
      is_active: true
    });
    await room.save();
    console.log(`✅ New room created with org: ${room.name} (${room._id})`);

    // Update organization group count if this is a group
    if (type === 'group') {
      const Organization = require('./organization');
      await Organization.findByIdAndUpdate(
        organizationId,
        { $inc: { 'usage.current_groups': 1 } }
      );
    }
  } else {
    // Update organization_id if not set (migration)
    if (!room.organization_id && organizationId) {
      room.organization_id = organizationId;
    }
    await room.update_activity();
  }

  return room;
};

/**
 * Count rooms by organization
 * @param {ObjectId} organizationId - Organization ID
 * @param {string} type - Optional room type filter
 * @returns {Promise<number>} Room count
 */
RoomSchema.statics.count_by_organization = function(organizationId, type = null) {
  const filter = { organization_id: organizationId, is_active: true };
  if (type) filter.type = type;
  return this.countDocuments(filter);
};

// Pre-save middleware
RoomSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new room: ${this.name} (${this.line_room_id})`);
  } else {
    console.log(`📝 Updating room: ${this.name} (${this.line_room_id})`);
  }
  next();
});

module.exports = model('Room', RoomSchema);