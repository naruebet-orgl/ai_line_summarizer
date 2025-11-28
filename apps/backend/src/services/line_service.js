/**
 * LINE Bot Service
 * Handles LINE messaging and webhook processing
 */

const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');
const mongoose = require('mongoose');
const ImageOptimizer = require('./image_optimizer');

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

  /**
   * Download image content from LINE servers, optimize it, and save to MongoDB GridFS.
   *
   * Image optimization includes:
   * - Automatic compression (reduces file size by 40-80% typically)
   * - Conversion to WebP format for better compression
   * - Resizing if larger than 1920x1920 pixels
   * - EXIF metadata stripping for privacy and size
   *
   * @param {string} messageId - LINE message ID
   * @param {Object} options - Optional optimization configuration
   * @param {boolean} options.skip_optimization - Skip optimization and save original
   * @param {number} options.max_width - Maximum width (default: 1920)
   * @param {number} options.max_height - Maximum height (default: 1920)
   * @param {number} options.quality - Compression quality 1-100 (default: 80)
   * @returns {Promise<string|null>} - GridFS file ID or null if failed
   */
  async download_and_save_image(messageId, options = {}) {
    try {
      console.log(`📥 Downloading image for message ID: ${messageId}`);

      // LINE content API endpoint
      const contentUrl = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
      console.log(`🔗 Content URL: ${contentUrl}`);

      // Download image from LINE API as buffer (not stream) for optimization
      const response = await axios.get(contentUrl, {
        headers: {
          'Authorization': `Bearer ${this.channelAccessToken}`,
          'User-Agent': 'LINE-Chat-Summarizer/1.0'
        },
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 5
      });

      // Check if we have a valid response
      if (!response.data || response.data.length === 0) {
        console.error('❌ No image data received from LINE API');
        return null;
      }

      // Get content type and size
      const originalContentType = response.headers['content-type'] || 'image/jpeg';
      const originalSize = response.data.length;

      console.log(`📊 Original image: ${originalContentType}, ${ImageOptimizer.format_bytes(originalSize)}`);

      // Validate content type
      if (!originalContentType.startsWith('image/')) {
        console.error(`❌ Invalid content type: ${originalContentType}`);
        return null;
      }

      // Prepare image buffer and metadata
      let imageBuffer = Buffer.from(response.data);
      let finalContentType = originalContentType;
      let optimizationResult = null;

      // Optimize image unless explicitly skipped
      if (!options.skip_optimization) {
        const optimizerOptions = {};
        if (options.max_width) optimizerOptions.max_width = options.max_width;
        if (options.max_height) optimizerOptions.max_height = options.max_height;
        if (options.quality) {
          optimizerOptions.jpeg_quality = options.quality;
          optimizerOptions.webp_quality = options.quality;
        }

        optimizationResult = await ImageOptimizer.optimize(
          imageBuffer,
          originalContentType,
          optimizerOptions
        );

        imageBuffer = optimizationResult.buffer;
        finalContentType = optimizationResult.content_type;
      }

      // Create GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'images'
      });

      // Build metadata with optimization info
      const metadata = {
        messageId: messageId,
        contentType: finalContentType,
        source: 'line_webhook',
        uploadedAt: new Date(),
        originalUrl: contentUrl,
        // Optimization metadata
        original_size: originalSize,
        original_content_type: originalContentType,
        optimized: !options.skip_optimization,
        ...(optimizationResult && !optimizationResult.fallback && {
          size_reduction: optimizationResult.size_reduction,
          reduction_percent: optimizationResult.reduction_percent,
          original_dimensions: optimizationResult.original_dimensions,
          optimized_dimensions: optimizationResult.optimized_dimensions,
          processing_time_ms: optimizationResult.processing_time_ms
        })
      };

      // Create upload stream with metadata
      const uploadStream = bucket.openUploadStream(`line_image_${messageId}`, {
        metadata: metadata
      });

      // Return a promise that resolves with the file ID
      return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          const savedSize = imageBuffer.length;
          const savings = originalSize - savedSize;
          const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

          console.log(`✅ Image saved to GridFS with ID: ${uploadStream.id}`);
          console.log(`   Final size: ${ImageOptimizer.format_bytes(savedSize)}`);
          if (savings > 0) {
            console.log(`   Space saved: ${ImageOptimizer.format_bytes(savings)} (${savingsPercent}%)`);
          }
          resolve(uploadStream.id.toString());
        });

        uploadStream.on('error', (error) => {
          console.error('❌ Error uploading image to GridFS:', error);
          reject(error);
        });

        // Write the optimized buffer to GridFS
        uploadStream.end(imageBuffer);
      });

    } catch (error) {
      console.error('❌ Error downloading/optimizing image from LINE:', error);

      // Check for specific LINE API errors
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        console.error(`📱 LINE API Error: ${status} - ${statusText}`);

        if (status === 404) {
          console.error('📱 Image not found - this could be due to:');
          console.error('   - Image content expired (LINE images expire after 24 hours)');
          console.error('   - Invalid message ID');
          console.error('   - Message is not an image type');
        } else if (status === 401) {
          console.error('📱 Unauthorized - check LINE channel access token');
        } else if (status === 403) {
          console.error('📱 Forbidden - insufficient permissions');
        }

        if (error.response.data) {
          console.error('📱 Error details:', error.response.data);
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error('📱 Request timeout - LINE API took too long to respond');
      } else if (error.code === 'ENOTFOUND') {
        console.error('📱 Network error - could not reach LINE API');
      }

      return null;
    }
  }
}

module.exports = new LineService();