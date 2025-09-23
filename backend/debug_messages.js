/**
 * Debug script to understand message storage structure
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ChatSession, Message } = require('./src/models');

async function debugMessages() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n📋 Checking ChatSessions...');
    const sessions = await ChatSession.find({}).limit(5).sort({ start_time: -1 });
    console.log(`Found ${sessions.length} sessions`);

    if (sessions.length > 0) {
      const session = sessions[0];
      console.log('\n🔍 Latest session:');
      console.log(`  _id: ${session._id}`);
      console.log(`  session_id: ${session.session_id}`);
      console.log(`  status: ${session.status}`);
      console.log(`  room_name: ${session.room_name}`);
      console.log(`  message_logs length: ${session.message_logs?.length || 0}`);

      console.log('\n📊 Checking Message collection...');

      // Try both ways to query messages
      const messageCount1 = await Message.countDocuments({ session_id: session._id });
      const messageCount2 = await Message.countDocuments({ session_id: session.session_id });

      console.log(`  Messages by _id (${session._id}): ${messageCount1}`);
      console.log(`  Messages by session_id (${session.session_id}): ${messageCount2}`);

      if (messageCount2 > 0) {
        console.log('\n💬 Sample messages:');
        const sampleMessages = await Message.find({ session_id: session.session_id }).limit(3);
        sampleMessages.forEach((msg, i) => {
          console.log(`  Message ${i+1}:`);
          console.log(`    session_id: ${msg.session_id}`);
          console.log(`    direction: ${msg.direction}`);
          console.log(`    message: ${msg.message.substring(0, 50)}...`);
          console.log(`    timestamp: ${msg.timestamp}`);
        });
      }

      // Check for specific session that might be failing
      console.log('\n🎯 Looking for session: sess_20250918_FbY23k2M');
      const specificSession = await ChatSession.findOne({ session_id: 'sess_20250918_FbY23k2M' });
      if (specificSession) {
        console.log('  Found specific session!');
        const specificMessageCount = await Message.countDocuments({ session_id: specificSession.session_id });
        console.log(`  Messages for this session: ${specificMessageCount}`);
      } else {
        console.log('  Specific session not found');
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }

  process.exit(0);
}

debugMessages();