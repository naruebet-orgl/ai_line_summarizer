/**
 * Check for Duplicate Data Script
 * Analyzes database for duplicates and data integrity issues
 *
 * Usage: node check-duplicates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ChatSession, Message, Room, LineEventsRaw } = require('./src/models');

console.log('🔍 Checking for Duplicate Data\n');
console.log('═══════════════════════════════════════════════════\n');

async function checkDuplicateMessages() {
  console.log('1️⃣  Checking for Duplicate Messages...');

  // Find duplicate messages by line_message_id
  const duplicatesByLineId = await Message.aggregate([
    {
      $match: {
        line_message_id: { $ne: null, $exists: true }
      }
    },
    {
      $group: {
        _id: '$line_message_id',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        sessions: { $push: '$session_id' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  // Find duplicate messages by session + timestamp + message content
  const duplicatesByContent = await Message.aggregate([
    {
      $group: {
        _id: {
          session_id: '$session_id',
          timestamp: '$timestamp',
          message: '$message'
        },
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  console.log(`   📊 Duplicates by LINE Message ID: ${duplicatesByLineId.length}`);
  console.log(`   📊 Duplicates by Content/Time: ${duplicatesByContent.length}`);

  if (duplicatesByLineId.length > 0) {
    console.log('   ⚠️  Found duplicate LINE message IDs:');
    duplicatesByLineId.slice(0, 5).forEach(dup => {
      console.log(`      - Message ID: ${dup._id} (${dup.count} copies)`);
    });
  }

  if (duplicatesByContent.length > 0) {
    console.log('   ⚠️  Found duplicate content:');
    duplicatesByContent.slice(0, 5).forEach(dup => {
      console.log(`      - Session: ${dup._id.session_id} (${dup.count} copies)`);
    });
  }

  if (duplicatesByLineId.length === 0 && duplicatesByContent.length === 0) {
    console.log('   ✅ No duplicate messages found!');
  }

  console.log();
  return {
    byLineId: duplicatesByLineId,
    byContent: duplicatesByContent
  };
}

async function checkDuplicateSessions() {
  console.log('2️⃣  Checking for Duplicate Sessions...');

  // Find duplicate active sessions per room
  const duplicateActiveSessions = await ChatSession.aggregate([
    {
      $match: {
        status: 'active'
      }
    },
    {
      $group: {
        _id: '$room_id',
        count: { $sum: 1 },
        session_ids: { $push: '$session_id' },
        room_names: { $push: '$room_name' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  // Find duplicate session_id strings
  const duplicateSessionIds = await ChatSession.aggregate([
    {
      $group: {
        _id: '$session_id',
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  console.log(`   📊 Rooms with multiple active sessions: ${duplicateActiveSessions.length}`);
  console.log(`   📊 Duplicate session_id values: ${duplicateSessionIds.length}`);

  if (duplicateActiveSessions.length > 0) {
    console.log('   ⚠️  Rooms with multiple active sessions:');
    duplicateActiveSessions.slice(0, 5).forEach(dup => {
      console.log(`      - Room: ${dup.room_names[0]} (${dup.count} active sessions)`);
    });
  }

  if (duplicateSessionIds.length > 0) {
    console.log('   ⚠️  Duplicate session IDs found:');
    duplicateSessionIds.slice(0, 5).forEach(dup => {
      console.log(`      - Session ID: ${dup._id} (${dup.count} copies)`);
    });
  }

  if (duplicateActiveSessions.length === 0 && duplicateSessionIds.length === 0) {
    console.log('   ✅ No duplicate sessions found!');
  }

  console.log();
  return {
    activePerRoom: duplicateActiveSessions,
    sessionIds: duplicateSessionIds
  };
}

async function checkDuplicateRooms() {
  console.log('3️⃣  Checking for Duplicate Rooms...');

  // Find duplicate rooms by line_room_id
  const duplicateRooms = await Room.aggregate([
    {
      $group: {
        _id: '$line_room_id',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        names: { $push: '$name' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  console.log(`   📊 Duplicate LINE Room IDs: ${duplicateRooms.length}`);

  if (duplicateRooms.length > 0) {
    console.log('   ⚠️  Duplicate rooms found:');
    duplicateRooms.slice(0, 5).forEach(dup => {
      console.log(`      - LINE Room ID: ${dup._id.substring(0, 20)}... (${dup.count} copies)`);
      console.log(`        Names: ${dup.names.join(', ')}`);
    });
  } else {
    console.log('   ✅ No duplicate rooms found!');
  }

  console.log();
  return duplicateRooms;
}

async function checkOrphanedMessages() {
  console.log('4️⃣  Checking for Orphaned Messages...');

  // Sample check - get first 1000 messages and verify their sessions exist
  const messages = await Message.find().limit(1000).select('session_id').lean();
  const sessionIds = [...new Set(messages.map(m => m.session_id))];

  const existingSessions = await ChatSession.find({
    session_id: { $in: sessionIds }
  }).select('session_id').lean();

  const existingSessionIdSet = new Set(existingSessions.map(s => s.session_id));

  const orphanedCount = messages.filter(m => !existingSessionIdSet.has(m.session_id)).length;

  console.log(`   📊 Checked: ${messages.length} messages`);
  console.log(`   📊 Orphaned messages (no session): ${orphanedCount}`);

  if (orphanedCount > 0) {
    console.log('   ⚠️  Some messages have no corresponding session');
  } else {
    console.log('   ✅ All sampled messages have valid sessions!');
  }

  console.log();
  return orphanedCount;
}

async function checkDataIntegrity() {
  console.log('5️⃣  Checking Data Integrity...');

  // Check sessions without rooms
  const sessionsWithoutRoom = await ChatSession.countDocuments({
    room_id: { $exists: false }
  });

  // Check messages without required fields
  const messagesWithoutSessionId = await Message.countDocuments({
    session_id: { $exists: false }
  });

  const messagesWithoutRoomId = await Message.countDocuments({
    room_id: { $exists: false }
  });

  console.log(`   📊 Sessions without room_id: ${sessionsWithoutRoom}`);
  console.log(`   📊 Messages without session_id: ${messagesWithoutSessionId}`);
  console.log(`   📊 Messages without room_id: ${messagesWithoutRoomId}`);

  if (sessionsWithoutRoom === 0 && messagesWithoutSessionId === 0 && messagesWithoutRoomId === 0) {
    console.log('   ✅ All data has required fields!');
  } else {
    console.log('   ⚠️  Some data integrity issues found');
  }

  console.log();

  return {
    sessionsWithoutRoom,
    messagesWithoutSessionId,
    messagesWithoutRoomId
  };
}

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'line_chat_summarizer'
    });
    console.log('✅ Connected to MongoDB\n');

    // Run all checks
    const duplicateMessages = await checkDuplicateMessages();
    const duplicateSessions = await checkDuplicateSessions();
    const duplicateRooms = await checkDuplicateRooms();
    const orphanedMessages = await checkOrphanedMessages();
    const integrityIssues = await checkDataIntegrity();

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 Summary\n');

    const totalIssues =
      duplicateMessages.byLineId.length +
      duplicateMessages.byContent.length +
      duplicateSessions.activePerRoom.length +
      duplicateSessions.sessionIds.length +
      duplicateRooms.length +
      (orphanedMessages > 0 ? 1 : 0) +
      integrityIssues.sessionsWithoutRoom +
      integrityIssues.messagesWithoutSessionId +
      integrityIssues.messagesWithoutRoomId;

    if (totalIssues === 0) {
      console.log('✅ No issues found! Database is clean.');
    } else {
      console.log(`⚠️  Found ${totalIssues} potential issues`);
      console.log('\nRecommendations:');

      if (duplicateMessages.byLineId.length > 0) {
        console.log('  - Remove duplicate messages with same LINE message ID');
      }
      if (duplicateSessions.activePerRoom.length > 0) {
        console.log('  - Merge or close duplicate active sessions per room');
      }
      if (duplicateRooms.length > 0) {
        console.log('  - Merge duplicate rooms with same LINE room ID');
      }
      if (orphanedMessages > 0) {
        console.log('  - Remove or reassign orphaned messages');
      }
    }

    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();
