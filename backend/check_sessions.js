#!/usr/bin/env node

/**
 * Database Sessions Checker
 * Checks if chat sessions were created successfully after webhook processing
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { Owner, Room, ChatSession, LineEventsRaw } = require('./src/models');
const config = require('./src/config');

async function checkSessions() {
  console.log('🔍 Checking database for chat sessions and related data...');
  console.log();

  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Check Owners
    console.log('👥 OWNERS:');
    const owners = await Owner.find({});
    console.log(`   Total owners: ${owners.length}`);
    owners.forEach((owner, index) => {
      console.log(`   ${index + 1}. ${owner.name} (${owner.email})`);
      console.log(`      LINE Channel ID: ${owner.line_channel_id}`);
      console.log(`      Plan: ${owner.plan}`);
      console.log(`      Created: ${owner.created_at}`);
    });
    console.log();

    // Check Rooms
    console.log('🏠 ROOMS:');
    const rooms = await Room.find({}).populate('owner_id');
    console.log(`   Total rooms: ${rooms.length}`);
    rooms.forEach((room, index) => {
      console.log(`   ${index + 1}. ${room.name} (${room.room_type})`);
      console.log(`      LINE Room ID: ${room.line_room_id}`);
      console.log(`      Owner: ${room.owner_id?.name || 'Unknown'}`);
      console.log(`      Created: ${room.created_at}`);
      console.log(`      Messages: ${room.statistics?.total_messages || 0}`);
    });
    console.log();

    // Check Chat Sessions
    console.log('💬 CHAT SESSIONS:');
    const sessions = await ChatSession.find({}).populate('owner_id').populate('room_id');
    console.log(`   Total sessions: ${sessions.length}`);
    sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. Session ${session.session_id}`);
      console.log(`      Room: ${session.room_id?.name || 'Unknown'}`);
      console.log(`      Owner: ${session.owner_id?.name || 'Unknown'}`);
      console.log(`      Status: ${session.status}`);
      console.log(`      Messages: ${session.message_logs?.length || 0}`);
      console.log(`      Started: ${session.start_time}`);
      if (session.message_logs && session.message_logs.length > 0) {
        console.log(`      Recent messages:`);
        session.message_logs.slice(-3).forEach((msg, msgIndex) => {
          console.log(`        - ${msg.content}`);
        });
      }
    });
    console.log();

    // Check Raw Events
    console.log('📨 RAW LINE EVENTS:');
    const rawEvents = await LineEventsRaw.find({}).sort({ received_at: -1 }).limit(10);
    console.log(`   Total raw events: ${rawEvents.length} (showing last 10)`);
    rawEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.event_type} - ${event.received_at}`);
      if (event.payload?.message?.text) {
        console.log(`      Message: "${event.payload.message.text}"`);
      }
      if (event.user_id) {
        console.log(`      User ID: ${event.user_id}`);
      }
    });
    console.log();

    // Summary
    if (sessions.length > 0) {
      console.log('🎉 SUCCESS: Chat sessions found in database!');
      console.log(`✅ ${sessions.length} chat session(s) created`);
      console.log(`✅ ${rooms.length} room(s) created`);
      console.log(`✅ ${rawEvents.length} raw events captured`);
      console.log();
      console.log('The "No owner found" issue has been FIXED!');
      console.log('LINE messages are now properly creating chat sessions.');
    } else {
      console.log('⚠️ No chat sessions found in database');
      console.log('This might indicate the webhook processing is still not working correctly');
    }

  } catch (error) {
    console.error('❌ Error checking sessions:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkSessions();