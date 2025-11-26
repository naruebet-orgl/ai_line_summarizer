/**
 * Summary Model
 * MongoDB schema for AI-generated chat summaries
 */

const { Schema, model } = require('mongoose');

const SummarySchema = new Schema({
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
    description: 'Reference to the room (denormalized)'
  },
  owner_id: {
    type: Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    description: 'Reference to the owner (denormalized)'
  },
  content: {
    type: String,
    required: false,
    description: 'AI-generated summary content'
  },
  key_topics: [{
    type: String,
    description: 'Key topics extracted from conversation'
  }],
  analysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      description: 'Overall sentiment of the conversation'
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      description: 'Urgency level of the conversation'
    },
    category: {
      type: String,
      description: 'Category/topic of the conversation'
    },
    action_items: [{
      type: String,
      description: 'Action items extracted from conversation'
    }],
    image_insights: [{
      type: String,
      description: 'Insights from image analysis'
    }]
  },
  gemini_metadata: {
    model: {
      type: String,
      default: 'gemini-1.5-pro',
      description: 'Gemini model used for generation'
    },
    tokens_used: {
      type: Number,
      default: 0,
      description: 'Number of tokens used for generation'
    },
    processing_time_ms: {
      type: Number,
      default: 0,
      description: 'Processing time in milliseconds'
    },
    cost: {
      type: Number,
      default: 0,
      description: 'Cost of the API call'
    }
  },
  language: {
    type: String,
    default: 'en',
    description: 'Language of the summary'
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    description: 'Status of summary generation'
  },
  error_message: {
    type: String,
    description: 'Error message if generation failed'
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
  collection: 'summaries',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes
SummarySchema.index({ session_id: 1 });
SummarySchema.index({ room_id: 1 });
SummarySchema.index({ owner_id: 1 });
SummarySchema.index({ status: 1 });
SummarySchema.index({ created_at: -1 });

// Instance methods
SummarySchema.methods.mark_completed = function(content, keyTopics, analysis, geminiMetadata) {
  console.log(`✅ Marking summary as completed: ${this._id}`);

  this.content = content;
  this.key_topics = keyTopics || [];
  this.analysis = analysis || {};
  this.gemini_metadata = { ...this.gemini_metadata, ...geminiMetadata };
  this.status = 'completed';
  this.updated_at = new Date();

  return this.save();
};

SummarySchema.methods.mark_failed = function(errorMessage) {
  console.log(`❌ Marking summary as failed: ${this._id} - ${errorMessage}`);

  this.status = 'failed';
  this.error_message = errorMessage;
  this.updated_at = new Date();

  return this.save();
};

SummarySchema.methods.get_summary_data = function() {
  return {
    summary_id: this._id,
    session_id: this.session_id,
    room_id: this.room_id,
    content: this.content,
    key_topics: this.key_topics,
    analysis: this.analysis,
    gemini_metadata: this.gemini_metadata,
    language: this.language,
    status: this.status,
    created_at: this.created_at
  };
};

// Static methods
SummarySchema.statics.create_summary = async function(sessionId, roomId, ownerId, language = 'en') {
  console.log(`🤖 Creating new summary for session: ${sessionId}`);

  const summary = new this({
    session_id: sessionId,
    room_id: roomId,
    owner_id: ownerId,
    language,
    status: 'processing'
  });

  return summary.save();
};

SummarySchema.statics.get_summaries_by_room = function(roomId, limit = 20, skip = 0) {
  return this.find({ room_id: roomId, status: 'completed' })
    .populate('session_id', 'session_id start_time end_time')
    .sort({ created_at: -1 })
    .limit(limit)
    .skip(skip);
};

SummarySchema.statics.get_summaries_by_owner = function(ownerId, limit = 50, skip = 0) {
  return this.find({ owner_id: ownerId, status: 'completed' })
    .populate('session_id', 'session_id start_time end_time')
    .populate('room_id', 'name type')
    .sort({ created_at: -1 })
    .limit(limit)
    .skip(skip);
};

SummarySchema.statics.get_summary_statistics = function(ownerId) {
  return this.aggregate([
    { $match: { owner_id: ownerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_tokens: { $sum: '$gemini_metadata.tokens_used' },
        total_cost: { $sum: '$gemini_metadata.cost' }
      }
    }
  ]);
};

// Pre-save middleware
SummarySchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new summary: ${this._id} for session ${this.session_id}`);
  } else {
    console.log(`📝 Updating summary: ${this._id} (${this.status})`);
  }
  next();
});

module.exports = model('Summary', SummarySchema);