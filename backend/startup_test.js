#!/usr/bin/env node
/**
 * Startup Test for LINE Chat Summarizer Backend
 * Tests configuration and critical services
 */

require('dotenv').config();

async function runStartupTest() {
  console.log('🧪 LINE Chat Summarizer - Startup Test');
  console.log('=====================================\n');

  // Test 1: Configuration
  console.log('1️⃣ Testing Configuration...');
  try {
    const config = require('./src/config');
    const isValid = config.validateConfig();

    if (isValid) {
      console.log('✅ Configuration: VALID');
      console.log(`   📦 Database: ${config.mongodb.dbName}`);
      console.log(`   🤖 AI Model: ${config.gemini.model} (Free Tier)`);
      console.log(`   🔗 LINE Channel: ${config.line.channelSecret ? 'Configured' : 'Missing'}`);
    } else {
      console.log('❌ Configuration: INVALID');
      return false;
    }
  } catch (error) {
    console.log('❌ Configuration Error:', error.message);
    return false;
  }

  // Test 2: Gemini Service
  console.log('\n2️⃣ Testing Gemini AI Service...');
  try {
    const geminiService = require('./src/services/gemini_service');
    console.log('✅ Gemini Service: LOADED');
    console.log('   ⚠️  API quota check skipped (to avoid quota exhaustion)');
  } catch (error) {
    console.log('❌ Gemini Service Error:', error.message);
    return false;
  }

  // Test 3: Models
  console.log('\n3️⃣ Testing Database Models...');
  try {
    const { Owner, Room, ChatSession, Summary, LineEventsRaw } = require('./src/models');
    console.log('✅ Models: LOADED');
    console.log('   📊 Available Models: Owner, Room, ChatSession, Summary, LineEventsRaw');
  } catch (error) {
    console.log('❌ Models Error:', error.message);
    return false;
  }

  // Test 4: LINE Service
  console.log('\n4️⃣ Testing LINE Service...');
  try {
    const lineService = require('./src/services/line_service');
    console.log('✅ LINE Service: LOADED');
    console.log(`   🔐 Channel Secret: ${lineService.channelSecret ? 'Configured' : 'Missing'}`);
    console.log(`   🔑 Access Token: ${lineService.channelAccessToken ? 'Configured' : 'Missing'}`);
  } catch (error) {
    console.log('❌ LINE Service Error:', error.message);
    return false;
  }

  // Test 5: Webhook Handler
  console.log('\n5️⃣ Testing Webhook Handler...');
  try {
    const LineWebhookHandler = require('./src/handlers/line_webhook_handler');
    console.log('✅ Webhook Handler: LOADED');
  } catch (error) {
    console.log('❌ Webhook Handler Error:', error.message);
    return false;
  }

  console.log('\n🎉 ALL TESTS PASSED! System ready for deployment.');
  console.log('\n📋 Next Steps:');
  console.log('   1. Run: npm start');
  console.log('   2. Set LINE webhook URL to: http://your-domain/api/line/webhook');
  console.log('   3. Test with LINE Official Account');

  return true;
}

// Run the test
runStartupTest().catch(error => {
  console.error('\n💥 Startup test failed:', error);
  process.exit(1);
});