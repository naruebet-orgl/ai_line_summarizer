/**
 * Migration: Add Organization Model and Link Existing Data
 * @description Creates default organization and links existing users, owners, rooms to it
 *
 * Run: node scripts/migrations/001_add_organization_model.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Import models
const User = require('../../src/models/user');
const Organization = require('../../src/models/organization');
const OrganizationMember = require('../../src/models/organization_member');
const Owner = require('../../src/models/owner');
const Room = require('../../src/models/room');
const ChatSession = require('../../src/models/chat_session');
const Message = require('../../src/models/message');

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting migration: Add Organization Model');
  console.log('📅 Date:', new Date().toISOString());
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

    // Step 1: Check if default organization exists
    console.log('📋 Step 1: Checking for existing default organization...');
    let defaultOrg = await Organization.findOne({ slug: 'default' });

    if (defaultOrg) {
      console.log(`ℹ️ Default organization already exists: ${defaultOrg._id}`);
    } else {
      // Find first owner (LINE OA) for org name
      const firstOwner = await Owner.findOne();
      const orgName = firstOwner
        ? `${firstOwner.name}'s Organization`
        : 'Default Organization';

      defaultOrg = await Organization.create({
        name: orgName,
        slug: 'default',
        status: 'active',
        plan: 'professional', // Grant professional for existing users
        limits: {
          max_users: 100,
          max_line_accounts: 10,
          max_groups: 1000,
          max_messages_per_month: 1000000,
          ai_summaries_enabled: true
        },
        settings: {
          default_language: 'th',
          timezone: 'Asia/Bangkok'
        }
      });

      console.log(`✅ Created default organization: ${defaultOrg._id}`);
    }
    console.log('');

    // Step 2: Update owners without organization_id
    console.log('📋 Step 2: Updating owners...');
    const ownerResult = await Owner.updateMany(
      { organization_id: { $exists: false } },
      { $set: { organization_id: defaultOrg._id, status: 'active' } }
    );
    console.log(`✅ Updated ${ownerResult.modifiedCount} owners`);

    // Update usage counter
    const ownerCount = await Owner.countDocuments({ organization_id: defaultOrg._id });
    await Organization.findByIdAndUpdate(defaultOrg._id, {
      $set: { 'usage.current_line_accounts': ownerCount }
    });
    console.log('');

    // Step 3: Update rooms without organization_id
    console.log('📋 Step 3: Updating rooms...');
    const roomResult = await Room.updateMany(
      { organization_id: { $exists: false } },
      { $set: { organization_id: defaultOrg._id } }
    );
    console.log(`✅ Updated ${roomResult.modifiedCount} rooms`);

    // Update usage counter
    const groupCount = await Room.countDocuments({
      organization_id: defaultOrg._id,
      type: 'group'
    });
    await Organization.findByIdAndUpdate(defaultOrg._id, {
      $set: { 'usage.current_groups': groupCount }
    });
    console.log('');

    // Step 4: Update sessions without organization_id
    console.log('📋 Step 4: Updating sessions...');
    const sessionResult = await ChatSession.updateMany(
      { organization_id: { $exists: false } },
      { $set: { organization_id: defaultOrg._id } }
    );
    console.log(`✅ Updated ${sessionResult.modifiedCount} sessions`);
    console.log('');

    // Step 5: Update messages without organization_id
    console.log('📋 Step 5: Updating messages...');
    const messageResult = await Message.updateMany(
      { organization_id: { $exists: false } },
      { $set: { organization_id: defaultOrg._id } }
    );
    console.log(`✅ Updated ${messageResult.modifiedCount} messages`);
    console.log('');

    // Step 6: Create org memberships for existing users
    console.log('📋 Step 6: Creating organization memberships for users...');
    const users = await User.find({
      $or: [
        { organizations: { $size: 0 } },
        { organizations: { $exists: false } }
      ]
    });

    let memberCount = 0;
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      // First user becomes org_owner, rest become org_admin
      const role = i === 0 ? 'org_owner' : 'org_admin';

      // Check if membership already exists
      const existingMembership = await OrganizationMember.findOne({
        organization_id: defaultOrg._id,
        user_id: user._id
      });

      if (!existingMembership) {
        // Create membership
        await OrganizationMember.create({
          organization_id: defaultOrg._id,
          user_id: user._id,
          role: role,
          status: 'active',
          joined_at: new Date()
        });

        // Update user's organizations array
        user.organizations = [{
          organization_id: defaultOrg._id,
          role: role,
          joined_at: new Date()
        }];
        user.current_organization_id = defaultOrg._id;
        user.platform_role = user.role === 'super_admin' ? 'super_admin' : 'user';
        await user.save();

        console.log(`   ✅ Added ${user.email} as ${role}`);
        memberCount++;
      }
    }
    console.log(`✅ Created ${memberCount} organization memberships`);
    console.log('');

    // Step 7: Update organization usage stats
    console.log('📋 Step 7: Updating organization usage stats...');
    const finalStats = {
      current_users: await OrganizationMember.countDocuments({
        organization_id: defaultOrg._id,
        status: 'active'
      }),
      current_line_accounts: await Owner.countDocuments({
        organization_id: defaultOrg._id,
        status: 'active'
      }),
      current_groups: await Room.countDocuments({
        organization_id: defaultOrg._id,
        type: 'group'
      })
    };

    await Organization.findByIdAndUpdate(defaultOrg._id, {
      $set: {
        'usage.current_users': finalStats.current_users,
        'usage.current_line_accounts': finalStats.current_line_accounts,
        'usage.current_groups': finalStats.current_groups
      }
    });

    console.log('✅ Organization stats:', finalStats);
    console.log('');

    // Step 8: Add indexes for organization_id fields
    console.log('📋 Step 8: Ensuring indexes...');
    await Room.collection.createIndex({ organization_id: 1 });
    await ChatSession.collection.createIndex({ organization_id: 1 });
    await Message.collection.createIndex({ organization_id: 1 });
    await Owner.collection.createIndex({ organization_id: 1 });
    console.log('✅ Indexes created');
    console.log('');

    // Summary
    console.log('═'.repeat(50));
    console.log('🎉 Migration completed successfully!');
    console.log('═'.repeat(50));
    console.log('');
    console.log('Summary:');
    console.log(`  - Organization: ${defaultOrg.name} (${defaultOrg.slug})`);
    console.log(`  - Owners migrated: ${ownerResult.modifiedCount}`);
    console.log(`  - Rooms migrated: ${roomResult.modifiedCount}`);
    console.log(`  - Sessions migrated: ${sessionResult.modifiedCount}`);
    console.log(`  - Messages migrated: ${messageResult.modifiedCount}`);
    console.log(`  - User memberships created: ${memberCount}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify data in MongoDB');
    console.log('  2. Test login flow with organization context');
    console.log('  3. Deploy and monitor');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('═'.repeat(50));
    console.error('❌ Migration failed!');
    console.error('═'.repeat(50));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    console.error('');
    console.error('To rollback, run: node scripts/migrations/001_rollback.js');
    console.error('');
    process.exit(1);
  }
}

// Run migration
migrate();
