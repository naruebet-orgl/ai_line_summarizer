/**
 * LINE Bot Service
 * Handles LINE messaging and webhook processing
 */

const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

class LineService {
  constructor() {
    this.channelSecret = config.line.channelSecret;
    this.channelAccessToken = config.line.channelAccessToken;
    this.lineApiUrl = 'https://api.line.me/v2/bot';
    
    console.log('🤖 LineService initialized');
  }

  /**
   * Validates LINE webhook signature
   * @param {string} body - Raw request body
   * @param {string} signature - X-Line-Signature header value
   * @returns {boolean} - True if signature is valid
   */
  validate_signature(body, signature) {
    try {
      if (!signature || !this.channelSecret) {
        console.error('❌ Missing signature or channel secret');
        return false;
      }

      const hash = crypto
        .createHmac('sha256', this.channelSecret)
        .update(body, 'utf8')
        .digest('base64');

      // LINE sends signature without "sha256=" prefix, just the base64 hash
      const expectedSignature = hash;
      
      // Ensure both signatures have the same length for timingSafeEqual
      if (signature.length !== expectedSignature.length) {
        console.error('❌ Signature length mismatch:', {
          received: signature.length,
          expected: expectedSignature.length,
          receivedSig: signature,
          expectedSig: expectedSignature
        });
        return false;
      }
      
      const result = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (result) {
        console.log('✅ LINE signature validation successful');
      } else {
        console.error('❌ LINE signature validation failed');
      }

      return result;
    } catch (error) {
      console.error('❌ LINE signature validation error:', error);
      return false;
    }
  }

  /**
   * Sends a reply message to LINE user
   * @param {string} replyToken - Reply token from webhook event
   * @param {Array|string} messages - Message(s) to send
   * @returns {Promise<Object>} - API response
   */
  async reply_message(replyToken, messages) {
    try {
      console.log(`📤 Sending reply message to LINE, replyToken: ${replyToken}`);
      
      // Normalize messages to array format
      const messageArray = Array.isArray(messages) ? messages : [
        { type: 'text', text: messages }
      ];

      const response = await axios.post(
        `${this.lineApiUrl}/message/reply`,
        {
          replyToken,
          messages: messageArray
        },
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ LINE reply message sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ LINE reply message error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sends a push message to LINE user
   * @param {string} userId - LINE user ID
   * @param {Array|string} messages - Message(s) to send
   * @returns {Promise<Object>} - API response
   */
  async push_message(userId, messages) {
    try {
      console.log(`📤 Sending push message to LINE user: ${userId}`);
      
      // Normalize messages to array format
      const messageArray = Array.isArray(messages) ? messages : [
        { type: 'text', text: messages }
      ];

      const response = await axios.post(
        `${this.lineApiUrl}/message/push`,
        {
          to: userId,
          messages: messageArray
        },
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ LINE push message sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ LINE push message error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gets LINE user profile information
   * @param {string} userId - LINE user ID
   * @returns {Promise<Object>} - User profile data
   */
  async get_user_profile(userId) {
    try {
      console.log(`👤 Getting LINE user profile: ${userId}`);

      const response = await axios.get(
        `${this.lineApiUrl}/profile/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`
          }
        }
      );

      console.log('✅ LINE user profile retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ LINE user profile error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gets LINE group summary information including group name
   * @param {string} groupId - LINE group ID
   * @returns {Promise<Object>} - Group summary data
   */
  async get_group_summary(groupId) {
    try {
      console.log(`🏷️ Getting LINE group summary: ${groupId}`);

      const response = await axios.get(
        `${this.lineApiUrl}/group/${groupId}/summary`,
        {
          headers: {
            'Authorization': `Bearer ${this.channelAccessToken}`
          }
        }
      );

      console.log('✅ LINE group summary retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ LINE group summary error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gets LINE room information
   * @param {string} roomId - LINE room ID
   * @returns {Promise<Object>} - Room information
   */
  async get_room_info(roomId) {
    try {
      console.log(`🏠 Getting LINE room info: ${roomId}`);

      // Note: LINE API doesn't provide room names for multi-user chats
      // This is a placeholder for future API updates
      return {
        roomId,
        name: 'Multi-User Chat'
      };
    } catch (error) {
      console.error('❌ LINE room info error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Creates a quick reply message structure
   * @param {string} text - Main message text
   * @param {Array} actions - Quick reply actions
   * @returns {Object} - LINE quick reply message object
   */
  create_quick_reply(text, actions) {
    return {
      type: 'text',
      text,
      quickReply: {
        items: actions.map(action => ({
          type: 'action',
          action
        }))
      }
    };
  }

  /**
   * Creates a flex message structure
   * @param {string} altText - Alternative text for notifications
   * @param {Object} contents - Flex message contents
   * @returns {Object} - LINE flex message object
   */
  create_flex_message(altText, contents) {
    return {
      type: 'flex',
      altText,
      contents
    };
  }

  /**
   * Creates a template message with buttons
   * @param {string} text - Template text
   * @param {Array} actions - Button actions
   * @returns {Object} - LINE template message object
   */
  create_button_template(text, actions) {
    return {
      type: 'template',
      altText: text,
      template: {
        type: 'buttons',
        text,
        actions
      }
    };
  }
}

module.exports = new LineService();