/**
 * Rollback: Remove Organization Model Changes
 * @description Removes organization_id from documents and deletes organizations
 *
 * ⚠️ WARNING: This is a destructive operation!
 *
 * Run: node scripts/migrations/001_rollback.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const readline = require('readline');

// Import models
const Organization = require('../../src/models/organization');
const OrganizationMember = require('../../src/models/organization_member');
const Owner = require('../../src/models/owner');
const Room = require('../../src/models/room');
const ChatSession = require('../../src/models/chat_session');
const Message = require('../../src/models/message');
const User = require('../../src/models/user');

/**
 * Prompt for confirmation
 */
async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main rollback function
 */
async function rollback() {
  console.log('⚠️  ROLLBACK: Remove Organization Model Changes');
  console.log('📅 Date:', new Date().toISOString());
  console.log('');
  console.log('⚠️  WARNING: This will:');
  console.log('   - Remove organization_id from all owners, rooms, sessions, messages');
  console.log('   - Delete all organization membership records');
  console.log('   - Delete all organization records');
  console.log('   - Clear organization fields from users');
  console.log('');

  // Confirm rollback
  const confirmed = await confirm('Are you sure you want to proceed? (yes/no): ');

  if (!confirmed) {
    console.log('');
    console.log('❌ Rollback cancelled');
    process.exit(0);
  }

  console.log('');
  console.log('🚀 Starting rollback...');
  console.log('');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Step 1: Remove organization_id from owners
    console.log('📋 Step 1: Removing organization_id from owners...');
    const ownerResult = await Owner.updateMany(
      {},
      { $unset: { organization_id: '', status: '', connected_by: '', connected_at: '' } }
    );
    console.log(`✅ Updated ${ownerResult.modifiedCount} owners`);

    // Step 2: Remove organization_id from rooms
    console.log('📋 Step 2: Removing organization_id from rooms...');
    const roomResult = await Room.updateMany(
      {},
      { $unset: { organization_id: '' } }
    );
    console.log(`✅ Updated ${roomResult.modifiedCount} rooms`);

    // Step 3: Remove organization_id from sessions
    console.log('📋 Step 3: Removing organization_id from sessions...');
    const sessionResult = await ChatSession.updateMany(
      {},
      { $unset: { organization_id: '' } }
    );
    console.log(`✅ Updated ${sessionResult.modifiedCount} sessions`);

    // Step 4: Remove organization_id from messages
    console.log('📋 Step 4: Removing organization_id from messages...');
    const messageResult = await Message.updateMany(
      {},
      { $unset: { organization_id: '' } }
    );
    console.log(`✅ Updated ${messageResult.modifiedCount} messages`);

    // Step 5: Clear organization fields from users
    console.log('📋 Step 5: Clearing organization fields from users...');
    const userResult = await User.updateMany(
      {},
      {
        $unset: {
          current_organization_id: '',
          platform_role: ''
        },
        $set: {
          organizations: []
        }
      }
    );
    console.log(`✅ Updated ${userResult.modifiedCount} users`);

    // Step 6: Delete all organization memberships
    console.log('📋 Step 6: Deleting organization memberships...');
    const memberResult = await OrganizationMember.deleteMany({});
    console.log(`✅ Deleted ${memberResult.deletedCount} memberships`);

    // Step 7: Delete all organizations
    console.log('📋 Step 7: Deleting organizations...');
    const orgResult = await Organization.deleteMany({});
    console.log(`✅ Deleted ${orgResult.deletedCount} organizations`);

    // Step 8: Drop indexes
    console.log('📋 Step 8: Dropping indexes...');
    try {
      await Room.collection.dropIndex('organization_id_1');
      await ChatSession.collection.dropIndex('organization_id_1');
      await Message.collection.dropIndex('organization_id_1');
      await Owner.collection.dropIndex('organization_id_1');
      console.log('✅ Indexes dropped');
    } catch (indexError) {
      console.log('ℹ️ Some indexes may not exist:', indexError.message);
    }

    console.log('');
    console.log('═'.repeat(50));
    console.log('🎉 Rollback completed successfully!');
    console.log('═'.repeat(50));
    console.log('');
    console.log('Summary:');
    console.log(`  - Owners updated: ${ownerResult.modifiedCount}`);
    console.log(`  - Rooms updated: ${roomResult.modifiedCount}`);
    console.log(`  - Sessions updated: ${sessionResult.modifiedCount}`);
    console.log(`  - Messages updated: ${messageResult.modifiedCount}`);
    console.log(`  - Users updated: ${userResult.modifiedCount}`);
    console.log(`  - Memberships deleted: ${memberResult.deletedCount}`);
    console.log(`  - Organizations deleted: ${orgResult.deletedCount}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('═'.repeat(50));
    console.error('❌ Rollback failed!');
    console.error('═'.repeat(50));
    console.error('');
    console.error('Error:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('');
    process.exit(1);
  }
}

// Run rollback
rollback();
