/**
 * LINE Events Raw Model
 * MongoDB schema for raw LINE webhook payloads (audit/debug with TTL)
 */

const { Schema, model } = require('mongoose');

const LineEventsRawSchema = new Schema({
  _id: { 
    type: String, 
    required: true,
    description: 'Unique event identifier'
  },
  received_at: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: { expireAfterSeconds: 60 * 60 * 24 * 60 }, // 60 days TTL
    description: 'When the webhook was received'
  },
  user_id: { 
    type: String,
    description: 'LINE userId if available in event'
  },
  event_type: { 
    type: String, 
    required: true,
    description: 'Type of LINE event (message, follow, unfollow, etc.)'
  },
  payload: { 
    type: Schema.Types.Mixed, 
    required: true,
    description: 'Original webhook payload from LINE'
  }
}, {
  collection: 'line_events_raw',
  versionKey: false
});

// TTL index is handled by index property in field definition above

// Static methods
LineEventsRawSchema.statics.logEvent = async function(eventId, eventType, userId, payload) {
  console.log(`📝 Logging LINE event: ${eventType} from user ${userId}`);
  
  try {
    const rawEvent = new this({
      _id: eventId,
      received_at: new Date(),
      user_id: userId,
      event_type: eventType,
      payload: payload
    });
    
    return rawEvent.save();
  } catch (error) {
    console.error('❌ Error logging LINE event:', error);
    // Don't throw - raw event logging shouldn't break webhook processing
  }
};

LineEventsRawSchema.statics.getEventsByUser = function(userId, limit = 50) {
  return this.find({ user_id: userId })
    .select('received_at event_type payload')
    .sort({ received_at: -1 })
    .limit(limit);
};

LineEventsRawSchema.statics.getEventsByType = function(eventType, limit = 100) {
  return this.find({ event_type: eventType })
    .select('received_at user_id payload')
    .sort({ received_at: -1 })
    .limit(limit);
};

LineEventsRawSchema.statics.getRecentEvents = function(hours = 24, limit = 100) {
  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return this.find({ received_at: { $gte: since } })
    .select('received_at user_id event_type')
    .sort({ received_at: -1 })
    .limit(limit);
};

// Pre-save middleware for logging
LineEventsRawSchema.pre('save', function(next) {
  console.log(`📨 Saving LINE event: ${this.event_type} (${this._id})`);
  next();
});

module.exports = model('LineEventsRaw', LineEventsRawSchema);