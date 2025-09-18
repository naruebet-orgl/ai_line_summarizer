/**
 * Message Model
 * Dedicated collection for all chat messages with references to sessions
 */

const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
    auto: true
  },
  session_id: {
    type: String,
    ref: 'ChatSession',
    required: true,
    description: 'Reference to the chat session'
  },
  room_id: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    description: 'Reference to the room'
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
    description: 'LINE room/group/user ID for quick lookup'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    description: 'When the message was sent/received'
  },
  direction: {
    type: String,
    enum: ['user', 'bot', 'system'],
    required: true,
    description: 'Message direction: user, bot, or system'
  },
  message_type: {
    type: String,
    enum: ['text', 'image', 'sticker', 'audio', 'video', 'file', 'location'],
    required: true,
    description: 'Type of message content'
  },
  message: {
    type: String,
    required: true,
    description: 'Message content or description'
  },
  line_message_id: {
    type: String,
    description: 'LINE original message ID'
  },
  // Direct mapping fields as requested
  // 1. User mapping
  line_user_id: {
    type: String,
    description: 'LINE user ID who sent the message'
  },
  user_name: {
    type: String,
    description: 'Display name of the user who sent the message'
  },
  user_profile_url: {
    type: String,
    description: 'Profile picture URL of the user'
  },

  // 2. Group mapping (if message is from a group)
  line_group_id: {
    type: String,
    description: 'LINE group ID if message is from a group'
  },
  group_name: {
    type: String,
    description: 'Group name if message is from a group'
  },

  // 3. Owner mapping (the LINE OA owner)
  line_oa_owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'Owner',
    description: 'Reference to the LINE OA owner'
  },

  // Context information
  room_type: {
    type: String,
    enum: ['individual', 'group'],
    description: 'Type of room where message was sent'
  },
  sender_role: {
    type: String,
    enum: ['user', 'group_member', 'owner', 'bot', 'system'],
    default: 'user',
    description: 'Role of the message sender'
  },
  // Media and attachments
  image_grid_fs_id: {
    type: Schema.Types.ObjectId,
    description: 'GridFS ID for image content'
  },
  file_url: {
    type: String,
    description: 'URL for file attachments'
  },
  file_name: {
    type: String,
    description: 'Original filename for file attachments'
  },
  // Location data
  latitude: {
    type: Number,
    description: 'Latitude for location messages'
  },
  longitude: {
    type: Number,
    description: 'Longitude for location messages'
  },
  // Metadata
  message_size: {
    type: Number,
    description: 'Size of message content in bytes'
  },
  is_processed: {
    type: Boolean,
    default: true,
    description: 'Whether message has been processed for session'
  },
  created_at: {
    type: Date,
    default: Date.now,
    description: 'Record creation timestamp'
  }
}, {
  collection: 'messages',
  timestamps: { createdAt: 'created_at', updatedAt: false },
  versionKey: false
});

// Compound indexes for efficient queries
MessageSchema.index({ room_id: 1, timestamp: -1 }); // All messages in room by time
MessageSchema.index({ session_id: 1, timestamp: 1 }); // Session messages chronologically
MessageSchema.index({ line_room_id: 1, timestamp: -1 }); // LINE room messages by time
MessageSchema.index({ owner_id: 1, timestamp: -1 }); // Owner's messages by time
MessageSchema.index({ direction: 1, message_type: 1 }); // Filter by type
MessageSchema.index({ line_message_id: 1 }); // Lookup by LINE message ID

// New indexes for user/group/owner mapping
MessageSchema.index({ line_user_id: 1, timestamp: -1 }); // User's messages by time
MessageSchema.index({ line_group_id: 1, timestamp: -1 }); // Group messages by time
MessageSchema.index({ line_oa_owner_id: 1, timestamp: -1 }); // Owner's OA messages
MessageSchema.index({ room_type: 1, sender_role: 1 }); // Filter by room type and sender role
MessageSchema.index({ line_user_id: 1, line_group_id: 1 }); // User in specific group
MessageSchema.index({ line_group_id: 1, sender_role: 1 }); // Group members by role

// Instance methods
MessageSchema.methods.get_message_data = function() {
  return {
    message_id: this._id,
    session_id: this.session_id,
    room_id: this.room_id,
    timestamp: this.timestamp,
    direction: this.direction,
    message_type: this.message_type,
    message: this.message,
    user_name: this.user_name,
    line_message_id: this.line_message_id,
    has_media: !!(this.image_grid_fs_id || this.file_url),
    location: this.latitude && this.longitude ? {
      lat: this.latitude,
      lng: this.longitude
    } : null
  };
};

// Static methods
MessageSchema.statics.get_session_messages = function(sessionId, limit = 100, skip = 0) {
  return this.find({ session_id: sessionId })
    .sort({ timestamp: 1 })
    .limit(limit)
    .skip(skip);
};

MessageSchema.statics.get_room_messages = function(roomId, limit = 50, skip = 0) {
  return this.find({ room_id: roomId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('session_id', 'session_id status');
};

MessageSchema.statics.get_recent_messages = function(lineRoomId, minutes = 60) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return this.find({
    line_room_id: lineRoomId,
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 });
};

// New static methods for user/group/owner queries
MessageSchema.statics.get_user_messages = function(lineUserId, limit = 50, skip = 0) {
  return this.find({ line_user_id: lineUserId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('session_id', 'session_id status')
    .populate('room_id', 'name type');
};

MessageSchema.statics.get_group_messages = function(lineGroupId, limit = 100, skip = 0) {
  return this.find({ line_group_id: lineGroupId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('session_id', 'session_id status')
    .populate('room_id', 'name type');
};

MessageSchema.statics.get_owner_messages = function(lineOaOwnerId, limit = 100, skip = 0) {
  return this.find({ line_oa_owner_id: lineOaOwnerId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('session_id', 'session_id status')
    .populate('room_id', 'name type');
};

MessageSchema.statics.get_user_in_group_messages = function(lineUserId, lineGroupId, limit = 50, skip = 0) {
  return this.find({
    line_user_id: lineUserId,
    line_group_id: lineGroupId
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

MessageSchema.statics.get_messages_by_role = function(senderRole, roomType = null, limit = 50) {
  const filter = { sender_role: senderRole };
  if (roomType) filter.room_type = roomType;

  return this.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('session_id', 'session_id status')
    .populate('room_id', 'name type');
};

MessageSchema.statics.create_message = function(messageData) {
  console.log(`💬 Creating new message for session: ${messageData.session_id}`);

  const message = new this({
    session_id: messageData.session_id,
    room_id: messageData.room_id,
    owner_id: messageData.owner_id,
    line_room_id: messageData.line_room_id,
    timestamp: messageData.timestamp || new Date(),
    direction: messageData.direction,
    message_type: messageData.message_type,
    message: messageData.message,
    line_message_id: messageData.line_message_id,

    // Enhanced user/group/owner mapping
    line_user_id: messageData.line_user_id,
    user_name: messageData.user_name,
    user_profile_url: messageData.user_profile_url,
    line_group_id: messageData.line_group_id,
    group_name: messageData.group_name,
    line_oa_owner_id: messageData.line_oa_owner_id,
    room_type: messageData.room_type,
    sender_role: messageData.sender_role,

    // Media and attachments
    image_grid_fs_id: messageData.image_grid_fs_id,
    file_url: messageData.file_url,
    file_name: messageData.file_name,
    latitude: messageData.latitude,
    longitude: messageData.longitude,
    message_size: messageData.message ? messageData.message.length : 0
  });

  return message.save();
};

MessageSchema.statics.get_message_statistics = function(roomId) {
  return this.aggregate([
    { $match: { room_id: roomId } },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        userMessages: { $sum: { $cond: [{ $eq: ['$direction', 'user'] }, 1, 0] } },
        botMessages: { $sum: { $cond: [{ $eq: ['$direction', 'bot'] }, 1, 0] } },
        messageTypes: { $push: '$message_type' },
        firstMessage: { $min: '$timestamp' },
        lastMessage: { $max: '$timestamp' }
      }
    }
  ]);
};

// Pre-save middleware
MessageSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`📝 Saving new message: ${this.direction} ${this.message_type} in session ${this.session_id}`);
  }
  next();
});

module.exports = model('Message', MessageSchema);