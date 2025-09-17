#!/usr/bin/env node

/**
 * Database Seeding Script - Test Owner
 * Creates a test owner for LINE Channel ID 2008126969
 * Run this script to fix the "No owner found for this LINE channel" issue
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { Owner } = require('./src/models');
const config = require('./src/config');

async function seedTestOwner() {
  console.log('🌱 Starting database seeding for test owner...');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Check if owner already exists
    const existingOwner = await Owner.find_by_channel_id(process.env.LINE_CHANNEL_ID);
    if (existingOwner) {
      console.log(`✅ Owner already exists for LINE Channel ID ${process.env.LINE_CHANNEL_ID}`);
      console.log(`   Owner: ${existingOwner.name} (${existingOwner.email})`);
      process.exit(0);
    }

    // Create test owner
    console.log(`🆕 Creating test owner for LINE Channel ID: ${process.env.LINE_CHANNEL_ID}`);

    const testOwnerData = {
      email: 'test@example.com',
      name: 'Test Owner',
      line_channel_id: process.env.LINE_CHANNEL_ID,
      line_channel_secret: process.env.LINE_CHANNEL_SECRET,
      line_access_token: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      plan: 'free'
    };

    const owner = await Owner.create_owner(testOwnerData);

    console.log('🎉 Test owner created successfully!');
    console.log(`   Owner ID: ${owner._id}`);
    console.log(`   Email: ${owner.email}`);
    console.log(`   Name: ${owner.name}`);
    console.log(`   LINE Channel ID: ${owner.line_channel_id}`);
    console.log(`   Plan: ${owner.plan}`);
    console.log();
    console.log('✅ The LINE webhook should now work properly!');
    console.log('✅ Messages from LINE Channel ID 2008126969 will now create chat sessions');

  } catch (error) {
    console.error('❌ Error seeding test owner:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

async function checkOwnerExists() {
  console.log('🔍 Checking existing owners...');

  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    const allOwners = await Owner.find({});
    console.log(`📊 Total owners in database: ${allOwners.length}`);

    if (allOwners.length > 0) {
      console.log('👥 Existing owners:');
      allOwners.forEach((owner, index) => {
        console.log(`   ${index + 1}. ${owner.name} (${owner.email})`);
        console.log(`      LINE Channel ID: ${owner.line_channel_id}`);
        console.log(`      Plan: ${owner.plan}`);
        console.log('');
      });
    } else {
      console.log('📭 No owners found in database');
    }

    // Check specifically for the channel we need
    const targetOwner = await Owner.find_by_channel_id(process.env.LINE_CHANNEL_ID);
    if (targetOwner) {
      console.log(`✅ Owner found for target LINE Channel ID ${process.env.LINE_CHANNEL_ID}`);
      console.log(`   Owner: ${targetOwner.name} (${targetOwner.email})`);
    } else {
      console.log(`❌ No owner found for target LINE Channel ID ${process.env.LINE_CHANNEL_ID}`);
    }

  } catch (error) {
    console.error('❌ Error checking owners:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Parse command line arguments
const command = process.argv[2];

if (command === 'check') {
  checkOwnerExists();
} else if (command === 'seed' || !command) {
  seedTestOwner();
} else {
  console.log('Usage:');
  console.log('  node seed_test_owner.js         # Create test owner (default)');
  console.log('  node seed_test_owner.js seed    # Create test owner');
  console.log('  node seed_test_owner.js check   # Check existing owners');
}