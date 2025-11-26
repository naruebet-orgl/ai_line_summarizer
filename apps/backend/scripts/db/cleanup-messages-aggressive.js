/**
 * Aggressive Message Cleanup Script
 * Removes messages from ALL closed sessions to free up space
 *
 * Usage:
 *   node cleanup-messages-aggressive.js --dry-run    # See what would be deleted
 *   node cleanup-messages-aggressive.js --execute    # Actually delete data
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const { ChatSession, Message } = require('../../src/models');

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

console.log('🧹 Aggressive Message Cleanup Script');
console.log('═══════════════════════════════════════════════════');
console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  EXECUTE (will delete data)'}`);
console.log('Strategy: Remove ALL messages from closed sessions');
console.log('═══════════════════════════════════════════════════\n');

async function main() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'ai_summary'
    });
    console.log('✅ Connected to MongoDB\n');

    // Get current stats
    console.log('📊 Current Database State:');
    const totalMessages = await Message.countDocuments();
    const totalSessions = await ChatSession.countDocuments();
    const closedSessions = await ChatSession.countDocuments({ status: 'closed' });
    const activeSessions = await ChatSession.countDocuments({ status: 'active' });

    console.log(`  💬 Total Messages: ${totalMessages}`);
    console.log(`  📦 Total Sessions: ${totalSessions} (${activeSessions} active, ${closedSessions} closed)\n`);

    // Find all closed sessions
    console.log('🔍 Finding all closed sessions...');
    const closedSessionDocs = await ChatSession.find({ status: 'closed' })
      .select('session_id')
      .lean();

    const closedSessionIds = closedSessionDocs.map(s => s.session_id);
    console.log(`✅ Found ${closedSessionIds.length} closed sessions\n`);

    // Count messages in closed sessions
    console.log('🔍 Counting messages in closed sessions...');
    const messagesToDelete = await Message.countDocuments({
      session_id: { $in: closedSessionIds }
    });
    console.log(`✅ Found ${messagesToDelete} messages in closed sessions\n`);

    // Estimate space savings
    const avgMessageSize = 500; // bytes
    const estimatedSpace = (messagesToDelete * avgMessageSize) / 1024 / 1024;
    console.log('💾 Estimated Space to Free:');
    console.log(`  Messages: ~${estimatedSpace.toFixed(2)} MB\n`);

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted');
      console.log('Run with --execute to actually delete data\n');
    } else {
      console.log('⚠️  Starting deletion...\n');

      // Delete messages
      console.log(`🗑️  Deleting ${messagesToDelete} messages from closed sessions...`);
      const result = await Message.deleteMany({
        session_id: { $in: closedSessionIds }
      });
      console.log(`✅ Deleted ${result.deletedCount} messages\n`);

      // Show final state
      const remainingMessages = await Message.countDocuments();
      console.log('📊 Database State After Cleanup:');
      console.log(`  💬 Remaining Messages: ${remainingMessages}`);
      console.log(`  💬 Messages Deleted: ${totalMessages - remainingMessages}\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Script completed successfully');

    if (dryRun) {
      console.log('\n💡 To actually delete messages, run:');
      console.log('   node cleanup-messages-aggressive.js --execute');
    } else {
      console.log('\n💡 MongoDB may need a few minutes to reclaim space.');
      console.log('   Check your MongoDB Atlas dashboard for updated storage metrics.');
      console.log('   You may also need to run db.runCommand({compact: "messages"}) in MongoDB.');
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
