#!/usr/bin/env node

/**
 * Test LINE Webhook Message
 * Simulates the exact LINE webhook message mentioned in the issue
 * to verify the "No owner found" issue is fixed
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const TEST_WEBHOOK_URL = `${BACKEND_URL}/api/line/webhook-test`;

// Simulate the real LINE webhook message
const testWebhookPayload = {
  "destination": "U6181948b704a07c2f83a35c93c4c2e6d",
  "events": [
    {
      "type": "message",
      "mode": "active",
      "timestamp": Date.now(),
      "source": {
        "type": "room",
        "roomId": "Ce8ba855dba973b9767d12571955098f5",
        "userId": "U6181948b704a07c2f83a35c93c4c2e6d"
      },
      "webhookEventId": "test-webhook-event-123",
      "deliveryContext": {
        "isRedelivery": false
      },
      "message": {
        "id": "test-message-123",
        "type": "text",
        "quoteToken": "test-quote-token",
        "text": "ขอเทส bot แบบนะคับ"
      },
      "replyToken": "test-reply-token-123"
    }
  ]
};

async function testWebhook() {
  console.log('🧪 Testing LINE webhook with simulated message...');
  console.log(`📍 Testing against: ${TEST_WEBHOOK_URL}`);
  console.log(`📨 Test message: "${testWebhookPayload.events[0].message.text}"`);
  console.log(`🏠 Room ID: ${testWebhookPayload.events[0].source.roomId}`);
  console.log(`👤 User ID: ${testWebhookPayload.events[0].source.userId}`);
  console.log();

  try {
    const response = await axios.post(TEST_WEBHOOK_URL, testWebhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LineBotWebhook/2.0'
      },
      timeout: 10000
    });

    console.log('✅ Test webhook successful!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response:`, response.data);

    if (response.status === 200) {
      console.log();
      console.log('🎉 SUCCESS: The "No owner found" issue is FIXED!');
      console.log('✅ LINE messages should now create chat sessions in the database');
      console.log('✅ Visit http://localhost:3002/dashboard to see the chat sessions');
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to backend server');
      console.error('💡 Make sure the backend is running on port 3001');
      console.error('💡 Run: cd backend && npm run dev');
    } else if (error.response) {
      console.error(`❌ Test failed with status: ${error.response.status}`);
      console.error(`📋 Error response:`, error.response.data);
    } else {
      console.error('❌ Test error:', error.message);
    }
  }
}

async function testMultipleMessages() {
  console.log('🔄 Testing multiple messages to trigger session creation...');

  const messages = [
    "ขอเทส bot แบบนะคับ",
    "ai multi agent",
    "kbank",
    "test message 4",
    "test message 5"
  ];

  for (let i = 0; i < messages.length; i++) {
    const payload = {
      ...testWebhookPayload,
      events: [{
        ...testWebhookPayload.events[0],
        message: {
          ...testWebhookPayload.events[0].message,
          id: `test-message-${i + 1}`,
          text: messages[i]
        },
        webhookEventId: `test-webhook-event-${i + 1}`,
        timestamp: Date.now() + i * 1000
      }]
    };

    try {
      console.log(`📨 Sending message ${i + 1}: "${messages[i]}"`);
      const response = await axios.post(TEST_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LineBotWebhook/2.0'
        },
        timeout: 5000
      });

      console.log(`✅ Message ${i + 1} processed successfully`);

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Message ${i + 1} failed:`, error.message);
    }
  }

  console.log();
  console.log('🎉 Multiple message test completed!');
  console.log('✅ Check the dashboard for the new chat session');
}

// Parse command line arguments
const command = process.argv[2];

if (command === 'multiple') {
  testMultipleMessages();
} else {
  testWebhook();
}