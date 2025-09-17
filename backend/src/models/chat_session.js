/**
 * Chat Session Model (Adapted from ComplaintSession)
 * MongoDB schema for chat sessions with embedded message logs
 */

const { Schema, model } = require('mongoose');
const { nanoid } = require('nanoid');

// Message Log sub-schema (embedded)
const MessageLogSchema = new Schema({
  timestamp: {
    type: Date,
    required: true,
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
    enum: ['text', 'image', 'sticker', 'audio', 'video', 'file'],
    required: true,
    description: 'Type of message content'
  },
  message: {
    type: String,
    required: true,
    description: 'Message content'
  },
  line_message_id: {
    type: String,
    description: 'LINE original message ID'
  },
  image_grid_fs_id: {
    type: Schema.Types.ObjectId,
    description: 'GridFS ID for image content'
  }
}, {
  _id: false,
  versionKey: false
});

// Main Chat Session schema
const ChatSessionSchema = new Schema({
  _id: {
    type: String,
    required: true,
    description: 'Unique session identifier'
  },
  session_id: {
    type: String,
    required: true,
    unique: true,
    description: 'Human-friendly session ID (CHAT-YYYY-MM-DD-####)'
  },
  room_id: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    description: 'Reference to the room this session belongs to'
  },
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    description: 'LINE OA owner ID'
  },
  line_room_id: {
    type: String,
    required: true,
    index: true,
    description: 'LINE room/group/user ID'
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'summarizing'],
    default: 'active',
    index: true,
    description: 'Current status of the chat session'
  },
  start_time: {
    type: Date,
    required: true,
    description: 'When the chat session started'
  },
  end_time: {
    type: Date,
    description: 'When the chat session ended (closed)'
  },
  room_name: {
    type: String,
    description: 'Display name of the room'
  },
  room_type: {
    type: String,
    enum: ['individual', 'group'],
    description: 'Type of LINE room'
  },
  message_logs: {
    type: [MessageLogSchema],
    required: true,
    validate: {
      validator: function(logs) {
        return logs.length >= 0 && logs.length <= 100; // Allow empty logs for new sessions, max 100 messages
      },
      message: 'Message logs must contain 0-100 entries'
    },
    description: 'Embedded conversation history'
  },
  summary_id: {
    type: Schema.Types.ObjectId,
    ref: 'Summary',
    description: 'Reference to AI generated summary'
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
  collection: 'chat_sessions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes for performance
ChatSessionSchema.index({ status: 1, start_time: -1 });
ChatSessionSchema.index({ room_id: 1, start_time: -1 });
ChatSessionSchema.index({ owner_id: 1, start_time: -1 });
ChatSessionSchema.index({ line_room_id: 1, status: 1 });
ChatSessionSchema.index({ session_id: 1 }, { unique: true });

// Instance methods
ChatSessionSchema.methods.add_message_log = function(direction, messageType, message, lineMessageId = null, imageGridFSId = null) {
  console.log(`💬 Adding message log to session ${this._id}: ${direction} - ${messageType}`);

  // Guard against document size growth
  if (this.message_logs.length >= 100) {
    console.log(`📊 Session ${this._id} reached message limit, closing session`);
    return this.close_session();
  }

  this.message_logs.push({
    timestamp: new Date(),
    direction,
    message_type: messageType,
    message,
    line_message_id: lineMessageId,
    image_grid_fs_id: imageGridFSId
  });

  this.updated_at = new Date();
  return this.save();
};

ChatSessionSchema.methods.close_session = function() {
  console.log(`📋 Closing chat session: ${this._id}`);

  this.status = 'closed';
  this.end_time = new Date();
  this.updated_at = new Date();

  return this.save();
};

ChatSessionSchema.methods.set_summarizing = function() {
  console.log(`🤖 Setting session to summarizing: ${this._id}`);

  this.status = 'summarizing';
  this.updated_at = new Date();

  return this.save();
};

ChatSessionSchema.methods.attach_summary = function(summaryId) {
  console.log(`📝 Attaching summary to session: ${this._id}`);

  this.summary_id = summaryId;
  this.status = 'closed';
  this.updated_at = new Date();

  return this.save();
};

ChatSessionSchema.methods.get_conversation_summary = function() {
  return {
    session_id: this._id,
    chat_session_id: this.session_id,
    room_id: this.room_id,
    line_room_id: this.line_room_id,
    status: this.status,
    duration_minutes: this.end_time ?
      Math.round((this.end_time - this.start_time) / (1000 * 60)) : null,
    message_count: this.message_logs.length,
    room_name: this.room_name,
    room_type: this.room_type
  };
};

// Static methods
ChatSessionSchema.statics.generate_session_id = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');

  return `CHAT-${year}-${month}-${day}-${sequence}`;
};

ChatSessionSchema.statics.generate_internal_session_id = function() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomId = nanoid(8);
  return `sess_${dateStr}_${randomId}`;
};

ChatSessionSchema.statics.create_new_session = async function(roomId, ownerId, lineRoomId, roomName, roomType) {
  console.log(`🆕 Creating new chat session for room: ${roomId}`);

  // Check for existing active session
  const existingSession = await this.findOne({
    room_id: roomId,
    status: 'active'
  });

  if (existingSession) {
    console.log(`⚠️ Room ${roomId} already has an active session: ${existingSession._id}`);
    return existingSession;
  }

  const internalSessionId = this.generate_internal_session_id();
  const sessionId = this.generate_session_id();

  // Ensure session_id uniqueness
  let attempts = 0;
  let uniqueSessionId = sessionId;

  while (attempts < 5) {
    const existing = await this.findOne({ session_id: uniqueSessionId });
    if (!existing) break;

    attempts++;
    uniqueSessionId = this.generate_session_id();
  }

  const newSession = new this({
    _id: internalSessionId,
    session_id: uniqueSessionId,
    room_id: roomId,
    owner_id: ownerId,
    line_room_id: lineRoomId,
    status: 'active',
    start_time: new Date(),
    room_name: roomName,
    room_type: roomType,
    message_logs: []
  });

  return newSession.save();
};

ChatSessionSchema.statics.find_active_session = function(roomId) {
  return this.findOne({ room_id: roomId, status: 'active' });
};

ChatSessionSchema.statics.find_active_session_by_line_room = function(lineRoomId) {
  return this.findOne({ line_room_id: lineRoomId, status: 'active' });
};

ChatSessionSchema.statics.get_sessions_by_status = function(status, limit = 50, skip = 0) {
  return this.find({ status })
    .populate('room_id', 'name line_room_id type')
    .populate('owner_id', 'name email')
    .populate('summary_id', 'content key_topics')
    .select('session_id room_id owner_id line_room_id status start_time end_time room_name room_type')
    .sort({ start_time: -1 })
    .limit(limit)
    .skip(skip);
};

ChatSessionSchema.statics.get_sessions_by_room = function(roomId, limit = 20, skip = 0) {
  return this.find({ room_id: roomId })
    .populate('summary_id', 'content key_topics')
    .sort({ start_time: -1 })
    .limit(limit)
    .skip(skip);
};

ChatSessionSchema.statics.get_sessions_by_date_range = function(startDate, endDate) {
  return this.find({
    start_time: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ start_time: -1 });
};

// Pre-save middleware for logging
ChatSessionSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new chat session: ${this._id} (${this.session_id})`);
  } else {
    console.log(`📝 Updating chat session: ${this._id} (${this.session_id})`);
  }
  next();
});

module.exports = model('ChatSession', ChatSessionSchema);