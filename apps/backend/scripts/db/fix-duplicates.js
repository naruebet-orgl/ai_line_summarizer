/**
 * Fix Duplicate Data Script
 * Fixes duplicate sessions and orphaned messages
 *
 * Usage:
 *   node fix-duplicates.js --dry-run    # See what would be fixed
 *   node fix-duplicates.js --execute    # Actually fix issues
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const { ChatSession, Message } = require('../../src/models');

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

console.log('🔧 Fix Duplicate Data Script\n');
console.log('═══════════════════════════════════════════════════');
console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  EXECUTE (will fix issues)'}`);
console.log('═══════════════════════════════════════════════════\n');

async function fixDuplicateActiveSessions() {
  console.log('1️⃣  Fixing Duplicate Active Sessions...\n');

  // Find rooms with multiple active sessions
  const duplicateActiveSessions = await ChatSession.aggregate([
    {
      $match: {
        status: 'active'
      }
    },
    {
      $lookup: {
        from: 'rooms',
        localField: 'room_id',
        foreignField: '_id',
        as: 'room_data'
      }
    },
    {
      $group: {
        _id: '$room_id',
        count: { $sum: 1 },
        sessions: {
          $push: {
            _id: '$_id',
            session_id: '$session_id',
            start_time: '$start_time',
            message_count: { $size: { $ifNull: ['$message_logs', []] } }
          }
        },
        room_name: { $first: { $arrayElemAt: ['$room_data.name', 0] } },
        line_room_id: { $first: { $arrayElemAt: ['$room_data.line_room_id', 0] } }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  console.log(`   Found ${duplicateActiveSessions.length} rooms with multiple active sessions\n`);

  let fixedCount = 0;

  for (const room of duplicateActiveSessions) {
    console.log(`   Room: ${room.room_name || room.line_room_id}`);
    console.log(`   Active sessions: ${room.count}`);

    // Sort sessions by start_time (oldest first)
    room.sessions.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Keep the oldest session, close the rest
    const [keepSession, ...closeSessions] = room.sessions;

    console.log(`   ✅ Keep: ${keepSession.session_id} (${keepSession.message_count} msgs)`);

    for (const closeSession of closeSessions) {
      console.log(`   🔒 Close: ${closeSession.session_id} (${closeSession.message_count} msgs)`);

      if (!dryRun) {
        await ChatSession.findByIdAndUpdate(closeSession._id, {
          status: 'closed',
          end_time: new Date()
        });
        fixedCount++;
      }
    }

    console.log();
  }

  console.log(`   ${dryRun ? 'Would fix' : 'Fixed'}: ${dryRun ? duplicateActiveSessions.reduce((sum, r) => sum + (r.count - 1), 0) : fixedCount} duplicate sessions\n`);

  return fixedCount;
}

async function fixOrphanedMessages() {
  console.log('2️⃣  Fixing Orphaned Messages...\n');

  // Get all messages
  const allMessages = await Message.find().select('_id session_id').lean();
  const sessionIds = [...new Set(allMessages.map(m => m.session_id))];

  // Get existing sessions
  const existingSessions = await ChatSession.find({
    session_id: { $in: sessionIds }
  }).select('session_id').lean();

  const existingSessionIdSet = new Set(existingSessions.map(s => s.session_id));

  // Find orphaned messages
  const orphanedMessages = allMessages.filter(m => !existingSessionIdSet.has(m.session_id));

  console.log(`   Total messages checked: ${allMessages.length}`);
  console.log(`   Orphaned messages found: ${orphanedMessages.length}\n`);

  if (orphanedMessages.length > 0) {
    console.log(`   Sample orphaned message session_ids:`);
    const uniqueOrphanedSessionIds = [...new Set(orphanedMessages.map(m => m.session_id))];
    uniqueOrphanedSessionIds.slice(0, 5).forEach(sid => {
      const count = orphanedMessages.filter(m => m.session_id === sid).length;
      console.log(`      - ${sid} (${count} messages)`);
    });
    console.log();

    if (!dryRun) {
      console.log('   🗑️  Deleting orphaned messages...');
      const orphanedIds = orphanedMessages.map(m => m._id);
      const result = await Message.deleteMany({
        _id: { $in: orphanedIds }
      });
      console.log(`   ✅ Deleted ${result.deletedCount} orphaned messages\n`);
      return result.deletedCount;
    } else {
      console.log(`   Would delete ${orphanedMessages.length} orphaned messages\n`);
    }
  } else {
    console.log('   ✅ No orphaned messages found!\n');
  }

  return orphanedMessages.length;
}

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'ai_summary'
    });
    console.log('✅ Connected to MongoDB\n');

    // Fix issues
    const fixedSessions = await fixDuplicateActiveSessions();
    const fixedMessages = await fixOrphanedMessages();

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 Summary\n');

    if (dryRun) {
      console.log('🔍 DRY RUN - No changes made');
      console.log(`   Would fix ${fixedSessions} duplicate sessions`);
      console.log(`   Would delete ${fixedMessages} orphaned messages`);
      console.log('\n💡 To actually fix issues, run:');
      console.log('   node fix-duplicates.js --execute');
    } else {
      console.log('✅ Issues fixed successfully!');
      console.log(`   Fixed ${fixedSessions} duplicate sessions`);
      console.log(`   Deleted ${fixedMessages} orphaned messages`);
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
