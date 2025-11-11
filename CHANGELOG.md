# CHANGELOG

All notable changes to the LINE Chat Summarizer AI project will be documented in this file.

## [Unreleased] - 2025-11-11

### Added - Google Apps Script Integration

#### Overview
Integrated automatic webhook trigger to Google Apps Script whenever LINE webhook receives events. This enables external processing and automation of LINE chat events through Google Apps Script.

#### Implementation Details

**Files Created:**
- `backend/src/services/google_apps_script_service.js` - Service for triggering Google Apps Script webhooks

**Files Modified:**
- `backend/src/routes/line_routes.js` - Added Google Apps Script trigger on LINE webhook
- `backend/src/config/index.js` - Added Google Apps Script configuration
- `backend/.env` - Cleaned up (removed Google Apps Script URL from env vars)

#### Technical Architecture

**Service Layer** (`google_apps_script_service.js`):
- Singleton service that handles HTTP POST requests to Google Apps Script webhook
- Non-blocking async execution to prevent delays in LINE webhook response
- Comprehensive error handling with detailed logging
- 10-second timeout to prevent hanging requests
- Graceful failure - errors don't break main LINE webhook processing

**Key Features:**
1. **Auto-trigger on LINE Webhook**: Automatically forwards all LINE events to Google Apps Script
2. **Non-blocking**: Uses promise-based fire-and-forget pattern to avoid blocking LINE response
3. **Error Resilience**: Logs errors but continues processing even if Google Apps Script fails
4. **Health Check**: Provides health check endpoint for monitoring
5. **Custom Events**: Supports sending custom events beyond LINE webhooks

**Configuration:**
- Google Apps Script URL is hardcoded in `backend/src/config/index.js`
- URL: `https://script.google.com/macros/s/AKfycbw2KuDcXK8UkUjuxRrmLcoxLrJwNxcYn8onXoK0oBNddPljjmQ-rGp6M9gwWxuPpu8A/exec`
- Can be easily updated in config file without environment variable changes

#### Request Flow

```
LINE Platform
    ↓ (webhook event)
LINE Webhook Handler (line_routes.js:64)
    ↓ (validates signature)
Process Events (line_webhook_handler.js)
    ↓ (stores to DB, handles messages)
    ├─→ [NON-BLOCKING] Google Apps Script Service
    │       ↓ (forwards event payload)
    │   Google Apps Script URL
    │       ↓ (external processing)
    │   Custom automation/integrations
    │
    └─→ Response to LINE (200 OK)
```

#### Payload Format

The Google Apps Script receives the same payload as the LINE webhook:

```json
{
  "destination": "LINE_BOT_ID",
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "id": "MESSAGE_ID",
        "text": "message content"
      },
      "timestamp": 1234567890123,
      "source": {
        "type": "user",
        "userId": "USER_ID"
      },
      "replyToken": "REPLY_TOKEN",
      "mode": "active"
    }
  ]
}
```

#### Logging

**Success Logs:**
- `🔗 GoogleAppsScriptService initialized` - Service initialization
- `✅ Google Apps Script webhook URL configured` - URL loaded from config
- `🚀 Triggering Google Apps Script webhook` - Starting webhook call
- `✅ Google Apps Script webhook triggered successfully (Xms)` - Successful call with duration

**Warning Logs:**
- `⏭️ Skipping Google Apps Script trigger - URL not configured` - URL missing in config
- `⚠️ Google Apps Script webhook failed, but continuing` - Non-blocking failure

**Error Logs:**
- `❌ Google Apps Script webhook error response: {status, data}` - HTTP error (4xx/5xx)
- `❌ Google Apps Script webhook no response: {message}` - Timeout/no response
- `❌ Google Apps Script webhook setup error: {message}` - Request setup error

#### Testing

To test the integration:

1. Send a message to your LINE bot
2. Check backend logs for Google Apps Script trigger messages
3. Verify Google Apps Script receives the payload
4. Confirm LINE webhook still responds quickly (< 3 seconds)

#### Future Enhancements

Potential improvements:
- Add retry logic for failed webhook calls
- Implement request queuing for rate limiting
- Add webhook signature validation for Google Apps Script
- Support multiple Google Apps Script endpoints
- Add metrics/analytics for webhook success rate

#### Root Cause & Approach

**Problem:** User wanted Google Apps Script to be triggered automatically whenever LINE webhook receives events for additional automation/processing.

**Solution:** Created a dedicated service that forwards LINE webhook payloads to Google Apps Script in a non-blocking manner, ensuring the main LINE webhook processing is not affected by external service delays or failures.

**Design Decisions:**
1. **Non-blocking**: Used promise-based fire-and-forget to prevent LINE timeout (LINE expects response within 3 seconds)
2. **Config-based**: Hardcoded URL in config for simplicity (no need for env var)
3. **Error resilient**: Catches all errors and logs them without breaking main flow
4. **Singleton pattern**: Single service instance for all requests
5. **Comprehensive logging**: Detailed logs at every stage for debugging

---

## Previous Changes

(Add previous changelog entries here as needed)
