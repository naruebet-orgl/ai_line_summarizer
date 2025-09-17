# Simple Database Schema - LINE Chat Summarizer

## Lean Architecture - Multi-Room Support

### Core Collections (5 Total)

```typescript
// 1. LINE Owners (Root)
interface Owner {
  _id: ObjectId;
  email: string;                    // unique
  name: string;
  lineChannelId: string;            // LINE OA Channel ID
  lineChannelSecret: string;        // encrypted
  lineAccessToken: string;          // encrypted
  createdAt: Date;
}

// 2. Rooms (Chat Separation)
interface Room {
  _id: ObjectId;
  ownerId: ObjectId;                // ref to Owner
  lineRoomId: string;               // LINE's room/group ID
  name: string;                     // room display name
  type: 'individual' | 'group';
  isActive: boolean;
  createdAt: Date;
}

// 3. Sessions (Conversation Batches)
interface Session {
  _id: ObjectId;
  roomId: ObjectId;                 // ref to Room
  status: 'active' | 'closed';
  messageCount: number;
  startTime: Date;
  endTime?: Date;
  createdAt: Date;
}

// 4. Messages (Chat Data)
interface Message {
  _id: ObjectId;
  sessionId: ObjectId;              // ref to Session
  roomId: ObjectId;                 // ref to Room (denormalized for fast queries)
  lineUserId: string;               // LINE user ID
  lineMessageId: string;            // LINE message ID
  messageType: 'text' | 'image' | 'sticker';
  content?: string;
  imageGridFSId?: ObjectId;         // if image
  timestamp: Date;
  createdAt: Date;
}

// 5. Summaries (AI Results)
interface Summary {
  _id: ObjectId;
  sessionId: ObjectId;              // ref to Session
  roomId: ObjectId;                 // ref to Room (denormalized)
  content: string;                  // AI summary
  keyTopics: string[];
  geminiTokens: number;
  createdAt: Date;
}
```

## Simple File Structure

```
server/db/
├── models/
│   ├── Owner.ts
│   ├── Room.ts
│   ├── Session.ts
│   ├── Message.ts
│   ├── Summary.ts
│   └── index.ts
├── connection.ts
└── seed.ts
```

## Model Implementation

### Owner Model
```typescript
// server/db/models/Owner.ts
import mongoose, { Schema } from 'mongoose';

const OwnerSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lineChannelId: { type: String, required: true, unique: true },
  lineChannelSecret: { type: String, required: true },
  lineAccessToken: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Owner', OwnerSchema);
```

### Room Model
```typescript
// server/db/models/Room.ts
import mongoose, { Schema } from 'mongoose';

const RoomSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true },
  lineRoomId: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['individual', 'group'], required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound unique index
RoomSchema.index({ ownerId: 1, lineRoomId: 1 }, { unique: true });

export default mongoose.model('Room', RoomSchema);
```

### Session Model
```typescript
// server/db/models/Session.ts
import mongoose, { Schema } from 'mongoose';

const SessionSchema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  messageCount: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now },
  endTime: Date
}, { timestamps: true });

SessionSchema.index({ roomId: 1, status: 1 });

export default mongoose.model('Session', SessionSchema);
```

### Message Model
```typescript
// server/db/models/Message.ts
import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  lineUserId: { type: String, required: true },
  lineMessageId: { type: String, required: true, unique: true },
  messageType: { type: String, enum: ['text', 'image', 'sticker'], required: true },
  content: String,
  imageGridFSId: Schema.Types.ObjectId,
  timestamp: { type: Date, required: true }
}, { timestamps: true });

MessageSchema.index({ sessionId: 1 });
MessageSchema.index({ roomId: 1 });

export default mongoose.model('Message', MessageSchema);
```

### Summary Model
```typescript
// server/db/models/Summary.ts
import mongoose, { Schema } from 'mongoose';

const SummarySchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  content: { type: String, required: true },
  keyTopics: [String],
  geminiTokens: { type: Number, default: 0 }
}, { timestamps: true });

SummarySchema.index({ sessionId: 1 });
SummarySchema.index({ roomId: 1 });

export default mongoose.model('Summary', SummarySchema);
```

## Quick Setup

### Database Connection
```typescript
// server/db/connection.ts
import mongoose from 'mongoose';

export async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected');
}
```

### Model Exports
```typescript
// server/db/models/index.ts
export { default as Owner } from './Owner';
export { default as Room } from './Room';
export { default as Session } from './Session';
export { default as Message } from './Message';
export { default as Summary } from './Summary';
```

## Essential Queries

### Get or Create Room
```typescript
async function getOrCreateRoom(ownerId: string, lineRoomId: string, name: string) {
  let room = await Room.findOne({ ownerId, lineRoomId });

  if (!room) {
    room = await Room.create({
      ownerId,
      lineRoomId,
      name,
      type: lineRoomId.startsWith('C') ? 'group' : 'individual'
    });
  }

  return room;
}
```

### Get Active Session
```typescript
async function getActiveSession(roomId: string) {
  let session = await Session.findOne({ roomId, status: 'active' });

  if (!session) {
    session = await Session.create({ roomId });
  }

  return session;
}
```

### Close Session When Full
```typescript
async function checkSessionLimit(sessionId: string) {
  const session = await Session.findById(sessionId);

  if (session.messageCount >= 50) {
    session.status = 'closed';
    session.endTime = new Date();
    await session.save();

    // Create new session
    return await Session.create({ roomId: session.roomId });
  }

  return session;
}
```

## Webhook Handler Logic
```typescript
// Simple webhook processing
export async function processLineMessage(event: any, ownerId: string) {
  // 1. Get/Create Room
  const room = await getOrCreateRoom(
    ownerId,
    event.source.groupId || event.source.roomId || event.source.userId,
    event.source.groupId ? 'Group Chat' : 'Direct Message'
  );

  // 2. Get Active Session
  let session = await getActiveSession(room._id);

  // 3. Save Message
  await Message.create({
    sessionId: session._id,
    roomId: room._id,
    lineUserId: event.source.userId,
    lineMessageId: event.message.id,
    messageType: event.message.type,
    content: event.message.text,
    timestamp: new Date(event.timestamp)
  });

  // 4. Update Session Count
  session.messageCount++;
  await session.save();

  // 5. Check if Session Should Close
  session = await checkSessionLimit(session._id);

  return { room, session };
}
```

## Future Extension Points

```typescript
// Add later when needed:

// User profiles (optional)
interface User {
  lineUserId: string;
  displayName: string;
  rooms: ObjectId[];  // which rooms they're in
}

// Organization grouping (optional)
interface Organization {
  ownerId: ObjectId;
  name: string;
  rooms: ObjectId[];  // rooms in this org
}

// Advanced session settings (optional)
interface SessionSettings {
  roomId: ObjectId;
  maxMessages: number;    // override default 50
  maxHours: number;       // override default 24
  autoSummarize: boolean;
}
```

## Minimal Indexes

```typescript
// Essential indexes only
await Owner.collection.createIndex({ email: 1 });
await Owner.collection.createIndex({ lineChannelId: 1 });
await Room.collection.createIndex({ ownerId: 1, lineRoomId: 1 });
await Session.collection.createIndex({ roomId: 1, status: 1 });
await Message.collection.createIndex({ sessionId: 1 });
await Message.collection.createIndex({ lineMessageId: 1 });
await Summary.collection.createIndex({ sessionId: 1 });
```

---

**Benefits:**
- 5 collections only
- Simple relationships
- Fast to implement
- Room separation works
- Can extend later
- No complex permissions
- Direct LINE integration