/**
 * Room Model
 * MongoDB schema for LINE chat rooms (groups/individual chats)
 */

const { Schema, model } = require('mongoose');

const RoomSchema = new Schema({
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

// Compound unique index
RoomSchema.index({ owner_id: 1, line_room_id: 1 }, { unique: true });
RoomSchema.index({ owner_id: 1, is_active: 1 });
RoomSchema.index({ 'statistics.last_activity_at': -1 });

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
    owner_id: this.owner_id,
    line_room_id: this.line_room_id,
    name: this.name,
    type: this.type,
    is_active: this.is_active,
    statistics: this.statistics
  };
};

// Static methods
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