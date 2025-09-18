# Improved Chat Architecture with Message Storage

## Overview

The updated architecture separates chat messages into a dedicated `messages` collection while maintaining session management for summarization. This provides unlimited message history and automatic session lifecycle management.

## New Architecture Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Owner    │ 1───N │    Room     │ 1───N │ ChatSession │ 1───1 │   Summary   │
├─────────────┤       ├─────────────┤       ├─────────────┤       ├─────────────┤
│ _id (PK)    │       │ _id (PK)    │       │ _id (PK)    │       │ _id (PK)    │
│ line_user_id│       │ name        │       │ session_id  │       │ session_id  │
│ display_name│       │ type        │       │ room_id (FK)│       │ room_id (FK)│
│ profile_pic │       │ line_room_id│       │ owner_id(FK)│       │ owner_id(FK)│
│ is_active   │       │ owner_id(FK)│       │ status      │       │ content     │
│ created_at  │       │ is_active   │       │ start_time  │       │ key_topics  │
│ settings    │       │ settings    │       │ end_time    │       │ analysis    │
└─────────────┘       │ statistics  │       │ created_at  │       │ gemini_meta │
                      │ created_at  │       └─────────────┘       │ language    │
                      └─────────────┘              │               │ status      │
                             │                     │               │ created_at  │
                             │ 1                   │ 1             └─────────────┘
                             │                     │
                             │ N                   │ N
                      ┌─────────────┐       ┌─────────────┐
                      │LineEventsRaw│       │   Message   │ ← NEW!
                      ├─────────────┤       ├─────────────┤
                      │ _id (PK)    │       │ _id (PK)    │
                      │ event_type  │       │ session_id  │
                      │ room_id (FK)│       │ room_id (FK)│
                      │ session_id  │       │ owner_id(FK)│
                      │ event_data  │       │ line_room_id│
                      │ proc_status │       │ timestamp   │
                      │ received_at │       │ direction   │
                      │ processed_at│       │ message_type│
                      └─────────────┘       │ message     │
                                            │ line_msg_id │
                                            │ user_id     │
                                            │ user_name   │
                                            │ created_at  │
                                            └─────────────┘
```

## Key Improvements

### 1. ✅ Separate Message Storage
- **New Collection**: `messages` - stores ALL chat messages permanently
- **No Limits**: Unlimited message history per room/session
- **Rich Metadata**: User info, timestamps, message types, media references

### 2. ✅ Automatic Session Management
- **Auto-Creation**: New sessions created automatically when previous session ends
- **Auto-Closure**: Sessions close after 100 messages OR 24 hours
- **Smart Triggers**: Summary generation on session closure

### 3. ✅ Enhanced Features
- **Message Search**: Full-text search across all messages
- **Statistics**: Detailed analytics per room/session/user
- **Export**: Message export in multiple formats (JSON, CSV, TXT)
- **Media Support**: Support for images, files, location data

## Session Lifecycle (Updated)

```
New Message Arrives
     ↓
SessionManager.getOrCreateActiveSession()
     ↓
Check Current Session:
  - Exists & Active? → Use existing
  - Expired (24h)? → Close & create new
  - Full (100 msgs)? → Close & create new
  - None? → Create new
     ↓
SessionManager.addMessage()
     ↓
Save to Messages Collection
     ↓
Update Session Metadata
     ↓
Check Auto-Close Triggers:
  - 100 messages reached?
  - 24 hours elapsed?
     ↓
Auto-Close Session & Generate Summary
     ↓
Next Message → Create New Session
```

## Data Storage Strategy

### ChatSession Collection (Metadata Only)
```javascript
{
  _id: "sess_20250918_abc123",
  session_id: "sess_20250918_abc123",
  room_id: ObjectId("..."),
  status: "active|closed|summarizing",
  start_time: ISODate("..."),
  end_time: ISODate("..."),
  message_logs: [], // ← EMPTY (deprecated)
  summary_id: ObjectId("...") // After summary generation
}
```

### Message Collection (All Messages)
```javascript
{
  _id: ObjectId("..."),
  session_id: "sess_20250918_abc123",
  room_id: ObjectId("..."),
  timestamp: ISODate("..."),
  direction: "user|bot|system",
  message_type: "text|image|sticker|audio|video|file|location",
  message: "Hello world!",
  user_id: "U1234567890",
  user_name: "John Doe",
  line_message_id: "line_msg_123"
}
```

## New API Endpoints

### Messages API (`/api/trpc/messages.*`)
- `messages.getSessionMessages` - Get messages for specific session
- `messages.getRoomMessages` - Get messages for room (across sessions)
- `messages.getRecentMessages` - Get recent activity
- `messages.searchMessages` - Full-text search
- `messages.getMessageStats` - Analytics and statistics
- `messages.getMessage` - Get single message details
- `messages.exportMessages` - Export in various formats

## Auto-Session Management

### SessionManager Service
- **Location**: `/backend/src/services/session_manager.js`
- **Features**:
  - Automatic session creation/closure
  - Message counting and time tracking
  - Session expiration handling
  - Summary generation triggers

### Usage Example
```javascript
const SessionManager = require('./services/session_manager');
const sessionManager = new SessionManager();

// Handle new message
const { session, message } = await sessionManager.addMessage(sessionId, {
  direction: 'user',
  message_type: 'text',
  message: 'Hello!',
  user_id: 'U123',
  user_name: 'John'
});

// Auto-creates new session if current one is full/expired
```

## Migration Strategy

### Phase 1: Add New Collections
1. ✅ Create `Message` model
2. ✅ Create `SessionManager` service
3. ✅ Add Messages tRPC router
4. ✅ Update model exports

### Phase 2: Migrate Existing Data (Optional)
```javascript
// Migration script to move message_logs to Message collection
const migrateSessions = async () => {
  const sessions = await ChatSession.find({});

  for (const session of sessions) {
    for (const msgLog of session.message_logs) {
      await Message.create_message({
        session_id: session._id,
        room_id: session.room_id,
        owner_id: session.owner_id,
        line_room_id: session.line_room_id,
        timestamp: msgLog.timestamp,
        direction: msgLog.direction,
        message_type: msgLog.message_type,
        message: msgLog.message,
        line_message_id: msgLog.line_message_id
      });
    }

    // Clear message_logs array
    session.message_logs = [];
    await session.save();
  }
};
```

### Phase 3: Update LINE Webhook Handler
```javascript
// Use SessionManager in webhook handler
const sessionManager = new SessionManager();

// On new LINE message
const { session, message } = await sessionManager.addMessage(
  await sessionManager.getOrCreateActiveSession(lineRoomId, roomId, ownerId),
  messageData
);
```

## Benefits

### 🚀 Performance
- No MongoDB document size limits (16MB limit removed)
- Efficient queries with proper indexing
- Separate collections for different access patterns

### 📊 Analytics
- Unlimited message history for analytics
- Cross-session message search
- Detailed statistics and reporting

### 🔄 Scalability
- Auto-session management reduces manual overhead
- Configurable session limits (100 messages, 24 hours)
- Clean session boundaries for summarization

### 🛠️ Maintainability
- Clear separation of concerns
- Dedicated service for session management
- Rich API for message operations

## Configuration

### Session Limits (Configurable)
```javascript
const sessionManager = new SessionManager();
sessionManager.maxMessagesPerSession = 100;  // Default: 100
sessionManager.sessionTimeoutHours = 24;     // Default: 24
```

### Database Indexes
```javascript
// Message collection indexes for performance
{ session_id: 1, timestamp: 1 }     // Session messages chronologically
{ room_id: 1, timestamp: -1 }       // Room messages by recency
{ line_room_id: 1, timestamp: -1 }  // LINE room lookup
{ owner_id: 1, timestamp: -1 }      // User's messages
{ direction: 1, message_type: 1 }   // Filter by type
```

## Backward Compatibility

- ✅ Existing ChatSession schema unchanged
- ✅ Existing tRPC endpoints still work
- ✅ `message_logs` field kept for compatibility (but empty)
- ✅ Summary generation unchanged
- ✅ Frontend interfaces unchanged

This architecture provides unlimited chat history, automatic session management, and enhanced analytics while maintaining full backward compatibility.