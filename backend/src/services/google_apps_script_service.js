/**
 * Google Apps Script Service
 * Handles webhook triggers to Google Apps Script endpoints
 *
 * This service forwards LINE webhook events to external Google Apps Script
 * for additional processing or integrations.
 */

const axios = require('axios');
const config = require('../config');

class GoogleAppsScriptService {
  constructor() {
    this.webhookUrl = config.googleAppsScript?.webhookUrl;
    console.log('🔗 GoogleAppsScriptService initialized');

    if (!this.webhookUrl) {
      console.warn('⚠️ Google Apps Script webhook URL not configured');
    } else {
      console.log(`✅ Google Apps Script webhook URL configured: ${this.webhookUrl.substring(0, 50)}...`);
    }
  }

  /**
   * Triggers the Google Apps Script webhook with LINE event data
   *
   * @param {Object} payload - The LINE webhook event payload
   * @param {Array} payload.events - Array of LINE events
   * @returns {Promise<Object>} - Response from Google Apps Script
   */
  async trigger_webhook(payload) {
    const startTime = Date.now();
    console.log('🚀 Triggering Google Apps Script webhook');

    // Skip if webhook URL is not configured
    if (!this.webhookUrl) {
      console.log('⏭️ Skipping Google Apps Script trigger - URL not configured');
      return { skipped: true, reason: 'URL not configured' };
    }

    try {
      // Forward the entire LINE webhook payload to Google Apps Script
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LINE-Chat-Summarizer-Bot/1.0'
        },
        timeout: 10000 // 10 second timeout
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Google Apps Script webhook triggered successfully (${duration}ms)`);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        status: response.status,
        data: response.data,
        duration_ms: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error details but don't throw - we don't want to break the main webhook
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('❌ Google Apps Script webhook error response:', {
          status: error.response.status,
          data: error.response.data,
          duration_ms: duration
        });

        return {
          success: false,
          error: 'HTTP error',
          status: error.response.status,
          data: error.response.data,
          duration_ms: duration
        };

      } else if (error.request) {
        // The request was made but no response was received
        console.error('❌ Google Apps Script webhook no response:', {
          message: error.message,
          duration_ms: duration
        });

        return {
          success: false,
          error: 'No response',
          message: error.message,
          duration_ms: duration
        };

      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('❌ Google Apps Script webhook setup error:', {
          message: error.message,
          duration_ms: duration
        });

        return {
          success: false,
          error: 'Request setup error',
          message: error.message,
          duration_ms: duration
        };
      }
    }
  }

  /**
   * Sends a custom event to Google Apps Script
   *
   * @param {string} eventType - Type of custom event
   * @param {Object} eventData - Custom event data
   * @returns {Promise<Object>} - Response from Google Apps Script
   */
  async send_custom_event(eventType, eventData) {
    console.log(`📤 Sending custom event to Google Apps Script: ${eventType}`);

    const customPayload = {
      type: 'custom',
      eventType: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      source: 'line-chat-summarizer'
    };

    return await this.trigger_webhook({ events: [customPayload] });
  }

  /**
   * Health check for Google Apps Script webhook
   *
   * @returns {Promise<Object>} - Health check result
   */
  async health_check() {
    console.log('🏥 Performing Google Apps Script webhook health check');

    if (!this.webhookUrl) {
      return {
        configured: false,
        message: 'Webhook URL not configured'
      };
    }

    try {
      const testPayload = {
        type: 'health_check',
        timestamp: new Date().toISOString(),
        source: 'line-chat-summarizer'
      };

      const response = await axios.post(this.webhookUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return {
        configured: true,
        healthy: true,
        status: response.status,
        message: 'Webhook is reachable'
      };

    } catch (error) {
      return {
        configured: true,
        healthy: false,
        error: error.message,
        message: 'Webhook is not reachable'
      };
    }
  }
}

// Export singleton instance
module.exports = new GoogleAppsScriptService();
