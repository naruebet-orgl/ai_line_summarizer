# Railway Environment Variables Setup Guide

## New LINE Bot Configuration - November 11, 2025

You switched to a new LINE chatbot and need to update Railway production environment variables.

## Step-by-Step Instructions

### 1. Go to Railway Dashboard
- Visit: https://railway.app/
- Select your project: `line_chat_summarizer_ai`
- Click on the `backend` service

### 2. Update Environment Variables
Click on the "Variables" tab and update these values:

```bash
LINE_CHANNEL_ID=1655370523
LINE_CHANNEL_SECRET=707d654dd7db6d037e639f1b02a96659
LINE_CHANNEL_ACCESS_TOKEN=70MIYGkt80NNo/WqAERrOvwdWuf9eL06hSyXVrIf3nChuwXHLjhomph4QlMUfpF++jd45cOC/CzkWhzs/koLK31be5gJ+c8QrJGsndKFsGizP273P22RdO4/dN3lf2hNq9mZwUgSsPl6eE2E21jINAdB04t89/1O/w1cDnyilFU=
```

### 3. Redeploy Backend
After updating the variables:
- Railway will automatically redeploy your backend
- Wait 1-2 minutes for deployment to complete

---

## LINE Developers Console Setup

### 1. Go to LINE Developers Console
- Visit: https://developers.line.biz/console/
- Login with your LINE account
- Select Provider (ORGL or your company name)
- Select Channel: **Channel ID 1655370523** (your new bot)

### 2. Configure Webhook URL
In the "Messaging API" tab:

**Webhook URL:**
```
https://backend-production-8d6f.up.railway.app/api/line/webhook
```

**Important Settings:**
- ✅ Enable "Use webhook"
- ✅ Click "Verify" button to test connection (should return 200 OK)
- ✅ Enable "Webhook redelivery" (optional but recommended)

### 3. Configure Basic Settings
In the "Messaging API" tab:

**Response Settings:**
- Allow bot to join group chats: ✅ Enabled
- Use webhooks: ✅ Enabled
- Auto-reply messages: ❌ Disabled (let your bot handle replies)
- Greeting messages: ❌ Disabled (optional)

**Channel Access Token:**
- Should already be generated
- This is the token in your environment variables

---

## Verification Steps

### 1. Test Webhook Connection
In LINE Developers Console:
```
Click "Verify" button next to webhook URL
Expected: "Success" with 200 OK status
```

### 2. Send Test Message
- Send a message to your LINE bot from your phone or LINE app
- Message can be anything: "Hello", "Test", etc.

### 3. Check Backend Logs (Railway)
In Railway dashboard:
- Go to your backend service
- Click "Deployments" → Latest deployment
- Click "View Logs"
- You should see logs like:
  ```
  📨 LINE webhook received
  💬 Message from room...
  ✅ LINE webhook processed successfully
  ```

### 4. Verify Database
Check if message was saved:
```bash
curl -s "https://backend-production-8d6f.up.railway.app/api/debug/stats"
```

Look for:
- `recent_sessions` should have today's date (2025-11-11)
- `collections.sessions` count should increase
- `collections.messages` count should increase

### 5. Check Dashboard
- Go to: https://summarizer.orglai.com/dashboard/groups
- Click refresh button
- You should see your new group chat with the test message

---

## Common Issues & Solutions

### Issue 1: Webhook verification fails
**Error:** "Webhook verification failed"
**Solution:**
1. Check Railway backend is deployed and running
2. Verify URL is exactly: `https://backend-production-8d6f.up.railway.app/api/line/webhook`
3. Make sure backend has correct LINE_CHANNEL_SECRET

### Issue 2: Messages not saving
**Symptoms:** Webhook receives messages but nothing in database
**Solution:**
1. Check Railway logs for errors
2. Verify MongoDB connection in Railway
3. Check MONGODB_URI environment variable is set correctly
4. Ensure GEMINI_API_KEY is configured (needed for summaries)

### Issue 3: Wrong credentials
**Symptoms:** "Invalid signature" errors in logs
**Solution:**
1. Double-check LINE_CHANNEL_SECRET matches LINE console
2. Regenerate Channel Access Token if needed
3. Update Railway environment variables
4. Redeploy backend

### Issue 4: Dashboard still empty
**Symptoms:** Messages saving to DB but dashboard is empty
**Solution:**
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check browser console for errors (F12)
4. Verify frontend is fetching from correct backend URL

---

## Quick Reference

### URLs
- **Backend API:** https://backend-production-8d6f.up.railway.app
- **Frontend Dashboard:** https://summarizer.orglai.com
- **LINE Webhook:** https://backend-production-8d6f.up.railway.app/api/line/webhook
- **Health Check:** https://backend-production-8d6f.up.railway.app/health
- **Debug Stats:** https://backend-production-8d6f.up.railway.app/api/debug/stats

### LINE Console
- **Developers Console:** https://developers.line.biz/console/
- **Channel ID:** 1655370523
- **Bot Name:** Bot-Dr.Jel
- **Basic ID:** @540bofoe

### Railway Dashboard
- **Project:** line_chat_summarizer_ai
- **Backend Service:** backend-production-8d6f.up.railway.app
- **Environment Variables:** Click service → Variables tab

---

## Testing Checklist

After completing all configurations:

- [ ] Railway environment variables updated
- [ ] Backend redeployed successfully
- [ ] LINE webhook URL configured and verified
- [ ] Test message sent to LINE bot
- [ ] Backend logs show message received
- [ ] Database shows new session/messages
- [ ] Dashboard displays new messages
- [ ] Google Apps Script webhook triggered (optional)

---

## Need Help?

If messages still aren't appearing after following all steps:

1. **Check Backend Logs:**
   ```bash
   # In Railway dashboard, view deployment logs
   ```

2. **Check Debug Stats:**
   ```bash
   curl https://backend-production-8d6f.up.railway.app/api/debug/stats
   ```

3. **Test Webhook Manually:**
   ```bash
   curl -X POST https://backend-production-8d6f.up.railway.app/api/line/webhook-test \
     -H "Content-Type: application/json" \
     -d '{
       "events": [{
         "type": "message",
         "message": {"type": "text", "text": "test"},
         "source": {"type": "user", "userId": "test123"},
         "timestamp": 1234567890123
       }]
     }'
   ```

4. **Contact Support:**
   - Check CHANGELOG.md for known issues
   - Review Railway logs for specific error messages
   - Verify all environment variables are set correctly
