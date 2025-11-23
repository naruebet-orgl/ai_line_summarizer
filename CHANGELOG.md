# CHANGELOG

All notable changes to the LINE Chat Summarizer AI project will be documented in this file.

## [Unreleased] - 2025-11-24

### Investigation - MongoDB Write Failures After Storage Full

#### Root Cause Analysis

**Problem:** Data stopped saving on 2025-11-20 when MongoDB Atlas reached 514MB/512MB (100% full). Even after cleanup, writes are still failing silently.

**Investigation Path:**
1. LINE webhook verification shows "Success" but no new data since Nov 20
2. Webhook endpoint responds correctly (200 OK)
3. Database reads work fine (stats, sessions, rooms all accessible)
4. Test webhooks return success but don't save data
5. **Silent failure**: Errors caught but not re-thrown in `handle_message_event`

**Diagnosis:**
- Added `/api/debug/write-test` endpoint to explicitly test MongoDB write operations
- Will reveal actual error (disk full, permission, connection issue)

---

## [Previous] - 2025-11-12

### Fixed - Display All Groups with Search and Sort Features

#### Root Cause Analysis

**Problem:** Dashboard showing only 20 groups when 219 groups exist in the database.

**Investigation Path:**
1. **Initial Issue:** Groups page fetching sessions with `limit: 50`, then filtering for groups
2. **Bug #1:** Deduplicating by `room_name` instead of `line_room_id` - groups with same name were merged
3. **Bug #2:** tRPC query string parameter passing completely broken - limit/type parameters ignored
4. **Bug #3:** Most critical - **All rooms missing `owner_id` field** causing `get_ai_groups(ownerId)` to only find 6 rooms with valid owner_id

**Underlying Issues:**
1. Data integrity: 213 of 219 rooms have no `owner_id` set (legacy data)
2. tRPC batched query string parsing broken - parameters not being deserialized
3. Wrong deduplication key (`room_name` vs `line_room_id`)
4. Wrong endpoint (sessions.list vs dedicated rooms endpoint)

#### Solution

**Backend Changes:**

1. **Fixed Room Model** (`backend/src/models/room.js:99-115`):
   - Modified `get_ai_groups()` to remove `owner_id` filter for legacy data
   - Added logging to track filter usage
   - Returns ALL groups when owner_id not set (backward compatibility)

2. **Fixed Rooms Router** (`backend/src/trpc/routers/rooms.js`):
   - Added fallback logic when no groups found with owner_id
   - Returns all groups of `type: 'group'` regardless of owner
   - Added `is_active` to response for proper status tracking
   - Increased max limit from 100 to 10000

3. **Sessions Router** (`backend/src/trpc/routers/sessions.js`):
   - Increased max limit from 100 to 10000

**Frontend Changes** (`web/src/app/dashboard/groups/page.tsx`):

1. **Switched to Dedicated Endpoint:**
   - Changed from `rooms.list` to `rooms.getAiGroups`
   - No parameters needed (returns all groups)
   - Bypasses broken tRPC query string parsing

2. **Smart Status Detection:**
   - Status based on last activity (< 24h = active)
   - Fallback when `is_active` flag not reliable

3. **Added Search Functionality:**
   - Real-time search by group name
   - Case-insensitive matching
   - Shows "X of Y groups" counter

4. **Added Sorting Options:**
   - **Active First** (default) - Active groups first, then by last activity
   - **Name (A-Z)** - Alphabetical ascending
   - **Name (Z-A)** - Alphabetical descending
   - **Most Messages** - By message count

5. **Improved UI:**
   - Search input with icon
   - Sort dropdown with icon
   - Filter chips (All/Active/Closed)
   - Result count display
   - Better empty states

#### Files Modified
- `backend/src/models/room.js` - Removed owner_id filter for legacy data
- `backend/src/trpc/routers/rooms.js` - Added fallback, increased limits
- `backend/src/trpc/routers/sessions.js` - Increased limit to 10000
- `web/src/app/dashboard/groups/page.tsx` - Complete rewrite with search/sort

#### Benefits
1. ✅ All **219 groups** now visible (was 20)
2. ✅ Real-time search across all group names
3. ✅ Multiple sorting options for better organization
4. ✅ Handles legacy data without owner_id
5. ✅ More efficient queries (dedicated endpoint)
6. ✅ Better UX with filters and counters

#### Known Limitations
- Not filtering by owner_id (acceptable for single-owner setup)
- Should add data migration to set owner_id on all rooms in future

### Fixed - Group Sessions Page with Thai+English Character Support

**Problem:** When clicking on groups with Thai+English names (e.g., "RM_ORGL & บ้านกิจโชค"), the sessions page showed "not found" due to URL encoding mismatches.

**Solution:**
1. Changed routing from `[groupName]` to `[lineRoomId]`
2. Updated groups page to link using `line_room_id` instead of `room_name`
3. Modified sessions page to filter by `line_room_id` instead of string matching on `room_name`
4. Added fallback to fetch group name from rooms endpoint when no sessions exist

**Why This Works:**
- `line_room_id` is ASCII-only (no encoding issues)
- Unique identifier from LINE platform
- Works perfectly with Thai, English, and mixed character names
- No URL encoding/decoding mismatches

**Files Modified:**
- `web/src/app/dashboard/groups/page.tsx` - Link using line_room_id
- `web/src/app/dashboard/groups/[lineRoomId]/sessions/page.tsx` - Filter by line_room_id

### Fixed - Group Sessions Page Showing "No Sessions Found"

**Problem:** When clicking on any group, the sessions page showed "No sessions found for this group" with all stats at 0 (Total Sessions: 0, Active Sessions: 0, Total Messages: 0, AI Summaries: 0).

**Root Cause:**
The tRPC parameter passing bug meant that even when fetching with empty input `{}`, the backend was defaulting to `limit: 20`. Since we were filtering client-side by `line_room_id` from only 20 random sessions, most groups wouldn't have their sessions in that small sample.

**Investigation:**
```
Backend logs showed:
🔍 Sessions.list called with input: { page: 1, limit: 20 }
🔍 MongoDB filter applied: {}

Only 20 sessions returned out of potentially thousands in database.
When filtered by specific line_room_id, most groups had 0 matches.
```

**Solution:**
Modified `web/src/app/dashboard/groups/[lineRoomId]/sessions/page.tsx:41` to explicitly pass `limit: 10000` in the fetch call:

```typescript
// Before: Empty input defaults to limit: 20
const response = await fetch(`/api/trpc/sessions.list?batch=1&input={"0":{"json":{}}}`);

// After: Explicitly pass limit: 10000 to get all sessions
const response = await fetch(`/api/trpc/sessions.list?batch=1&input={"0":{"json":{"limit":10000}}}`);
```

**Why This Works:**
1. Fetches up to 10,000 sessions (all sessions in database)
2. Client-side filtering by `line_room_id` now has complete dataset
3. Works around broken tRPC parameter parsing for `room_type` filter
4. Ensures all groups show their correct sessions and statistics

**Files Modified:**
- `web/src/app/dashboard/groups/[lineRoomId]/sessions/page.tsx` - Added explicit limit: 10000

**Benefits:**
- ✅ All group sessions now display correctly
- ✅ Accurate session counts and statistics
- ✅ Works with Thai+English mixed character names
- ✅ Client-side filtering ensures correct group matching

---

## [Previous Updates] - 2025-11-11

### Added - Debug Routes for Production Troubleshooting

#### Overview
Added diagnostic endpoints to help troubleshoot production issues where messages aren't appearing in the dashboard after deployment.

#### Debug Endpoints

**1. Database Statistics** (`GET /api/debug/stats`)
- Returns counts for all collections (owners, rooms, sessions, messages)
- Session breakdown by status (active, closed, summarizing)
- Room breakdown by type (individual, group)
- Last 10 recent sessions with message counts
- Owner information

**2. Session Details** (`GET /api/debug/session/:sessionId`)
- Full session data with populated relationships
- Message counts from both Message collection and embedded logs
- Recent messages preview

**3. Rooms List** (`GET /api/debug/rooms`)
- All rooms with their configuration
- Owner relationships
- Creation timestamps

**4. Database Connection** (`GET /api/debug/connection`)
- MongoDB connection state
- Database name and host info
- Test query to verify read access

#### Troubleshooting Steps

When messages don't appear in dashboard after deployment:

1. **Check Database Connection**
   ```bash
   curl https://backend-production-8d6f.up.railway.app/api/debug/connection
   ```
   - Verify state is "connected"
   - Confirm test query succeeds

2. **Check Database Statistics**
   ```bash
   curl https://backend-production-8d6f.up.railway.app/api/debug/stats
   ```
   - Verify sessions are being created (check `collections.sessions`)
   - Check if rooms exist (check `collections.rooms`)
   - Verify owner is created (check `owners` array)
   - Review `recent_sessions` to see if new messages are being saved

3. **Check Specific Session**
   ```bash
   curl https://backend-production-8d6f.up.railway.app/api/debug/session/CHAT-2025-11-11-XXXX
   ```
   - Verify session exists with correct data
   - Check message counts match
   - Review message content

4. **Check Rooms**
   ```bash
   curl https://backend-production-8d6f.up.railway.app/api/debug/rooms
   ```
   - Verify rooms are being created for groups
   - Check room types are set correctly
   - Verify owner relationships

#### Common Issues & Solutions

**Issue 1: No sessions in database**
- Cause: Webhook handler not saving sessions
- Solution: Check LINE webhook is configured correctly, verify MongoDB connection

**Issue 2: Sessions exist but no messages**
- Cause: Message saving logic failing silently
- Solution: Check logs for errors in `process_text_message`, verify Message model

**Issue 3: Wrong owner or no owner**
- Cause: `get_or_create_default_owner` failing in production
- Solution: Verify LINE_CHANNEL_ID environment variable is set correctly

**Issue 4: Dashboard shows empty**
- Cause: Frontend querying wrong database or tRPC proxy failing
- Solution: Check tRPC proxy logs, verify backend URL in production

---

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
