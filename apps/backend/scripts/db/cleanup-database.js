/**
 * Database Cleanup Script
 * Frees up MongoDB space by removing old messages and sessions
 *
 * Usage:
 *   node cleanup-database.js --dry-run          # See what would be deleted
 *   node cleanup-database.js --execute          # Actually delete data
 *   node cleanup-database.js --execute --days=30  # Delete data older than 30 days
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const { ChatSession, Message, LineEventsRaw } = require('../../src/models');

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const daysArg = args.find(arg => arg.startsWith('--days='));
const daysToKeep = daysArg ? parseInt(daysArg.split('=')[1]) : 7; // Default: keep last 7 days

console.log('🧹 Database Cleanup Script');
console.log('═══════════════════════════════════════════════════');
console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  EXECUTE (will delete data)'}`);
console.log(`Keep data from last: ${daysToKeep} days`);
console.log('═══════════════════════════════════════════════════\n');

async function analyzeDatabase() {
  console.log('📊 Analyzing database...\n');

  // Count documents
  const totalSessions = await ChatSession.countDocuments();
  const totalMessages = await Message.countDocuments();
  const totalRawEvents = await LineEventsRaw.countDocuments();

  const closedSessions = await ChatSession.countDocuments({ status: 'closed' });
  const activeSessions = await ChatSession.countDocuments({ status: 'active' });

  console.log('Current Database State:');
  console.log(`  📦 Sessions: ${totalSessions} (${activeSessions} active, ${closedSessions} closed)`);
  console.log(`  💬 Messages: ${totalMessages}`);
  console.log(`  📨 Raw Events: ${totalRawEvents}\n`);

  return { totalSessions, totalMessages, totalRawEvents, closedSessions, activeSessions };
}

async function findOldData(daysToKeep) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  console.log(`🔍 Finding data older than ${cutoffDate.toISOString()}\n`);

  // Find old closed sessions
  const oldClosedSessions = await ChatSession.find({
    status: 'closed',
    end_time: { $lt: cutoffDate }
  }).select('session_id end_time').lean();

  const oldSessionIds = oldClosedSessions.map(s => s.session_id);

  // Find messages from old closed sessions
  const oldMessagesCount = await Message.countDocuments({
    session_id: { $in: oldSessionIds }
  });

  // Find old raw events
  const oldRawEventsCount = await LineEventsRaw.countDocuments({
    received_at: { $lt: cutoffDate }
  });

  console.log('Old Data Found:');
  console.log(`  🗑️  Old closed sessions: ${oldClosedSessions.length}`);
  console.log(`  🗑️  Messages in old sessions: ${oldMessagesCount}`);
  console.log(`  🗑️  Old raw events: ${oldRawEventsCount}\n`);

  return {
    oldSessionIds,
    oldClosedSessionsCount: oldClosedSessions.length,
    oldMessagesCount,
    oldRawEventsCount,
    cutoffDate
  };
}

async function estimateSpaceSavings(stats) {
  // Rough estimates based on typical document sizes
  const avgMessageSize = 500; // bytes
  const avgRawEventSize = 1000; // bytes
  const avgSessionSize = 2000; // bytes

  const messageSpace = stats.oldMessagesCount * avgMessageSize;
  const rawEventSpace = stats.oldRawEventsCount * avgRawEventSize;
  const sessionSpace = stats.oldClosedSessionsCount * avgSessionSize;

  const totalSpace = messageSpace + rawEventSpace + sessionSpace;

  console.log('💾 Estimated Space to Free:');
  console.log(`  Messages: ${(messageSpace / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Raw Events: ${(rawEventSpace / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Sessions: ${(sessionSpace / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Total: ~${(totalSpace / 1024 / 1024).toFixed(2)} MB\n`);
}

async function deleteOldData(stats, dryRun) {
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted');
    console.log('Run with --execute to actually delete data\n');
    return;
  }

  console.log('⚠️  Starting deletion...\n');

  // Delete messages from old sessions
  console.log(`🗑️  Deleting ${stats.oldMessagesCount} old messages...`);
  const messagesResult = await Message.deleteMany({
    session_id: { $in: stats.oldSessionIds }
  });
  console.log(`✅ Deleted ${messagesResult.deletedCount} messages\n`);

  // Delete old raw events
  console.log(`🗑️  Deleting ${stats.oldRawEventsCount} old raw events...`);
  const rawEventsResult = await LineEventsRaw.deleteMany({
    received_at: { $lt: stats.cutoffDate }
  });
  console.log(`✅ Deleted ${rawEventsResult.deletedCount} raw events\n`);

  // Delete old closed sessions
  console.log(`🗑️  Deleting ${stats.oldClosedSessionsCount} old closed sessions...`);
  const sessionsResult = await ChatSession.deleteMany({
    status: 'closed',
    end_time: { $lt: stats.cutoffDate }
  });
  console.log(`✅ Deleted ${sessionsResult.deletedCount} sessions\n`);

  console.log('✨ Cleanup completed successfully!\n');
}

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'ai_summary'
    });
    console.log('✅ Connected to MongoDB\n');

    // Analyze current state
    const currentStats = await analyzeDatabase();

    // Find old data
    const oldDataStats = await findOldData(daysToKeep);

    // Estimate space savings
    await estimateSpaceSavings(oldDataStats);

    // Delete or show what would be deleted
    await deleteOldData(oldDataStats, dryRun);

    // Show final state
    if (!dryRun) {
      console.log('📊 Database State After Cleanup:');
      await analyzeDatabase();
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Script completed successfully');

    if (dryRun) {
      console.log('\n💡 To actually delete data, run:');
      console.log(`   node cleanup-database.js --execute --days=${daysToKeep}`);
    } else {
      console.log('\n💡 MongoDB may need time to reclaim space.');
      console.log('   Check your MongoDB Atlas dashboard for updated storage metrics.');
    }

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
