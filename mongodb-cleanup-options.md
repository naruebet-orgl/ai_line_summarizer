# MongoDB Storage Solutions

## Current Situation
- **Used:** 514 MB / 512 MB (100% FULL)
- **Problem:** Cannot save new rooms, sessions, or events
- **Impact:** App appears broken - groups show as "closed", sessions not found

---

## Option 1: Clean Up MongoDB Atlas (RECOMMENDED - FREE)

### What's eating your storage:
Most likely the `raw_events` collection - it saves every LINE webhook for debugging.

### Quick cleanup commands:

```bash
# Connect to your MongoDB
mongo "mongodb+srv://your-connection-string"

# Check collection sizes
db.stats()
db.raw_events.stats()
db.messages.stats()
db.sessions.stats()

# Delete raw_events (safe - only for debugging)
db.raw_events.drop()

# OR delete old raw_events (keep last 7 days)
db.raw_events.deleteMany({
  timestamp: { $lt: new Date(Date.now() - 7*24*60*60*1000) }
})

# Delete old closed sessions (>30 days)
db.sessions.deleteMany({
  status: 'closed',
  end_time: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
})
```

**After cleanup:** Your app will work normally again

---

## Option 2: Disable raw_events Saving (PREVENT FUTURE ISSUES)

Stop saving raw LINE events to conserve space:

**File:** `backend/src/routes/line_routes.js`

Comment out or remove the raw event saving code.

---

## Option 3: Upgrade MongoDB Atlas

- **M0 (FREE):** 512 MB
- **M2 (SHARED):** 2 GB - $9/month
- **M5 (DEDICATED):** 5 GB - $25/month

---

## Option 4: Use Railway PostgreSQL (Alternative)

Railway offers PostgreSQL addon with more free storage.

**Pros:**
- More free storage
- Integrated with Railway
- Automatic backups

**Cons:**
- Need to migrate schema from MongoDB to PostgreSQL
- Rewrite all Mongoose models
- Time-consuming migration

---

## ❌ Option 5: Local MongoDB (NOT RECOMMENDED for Production)

**Why it won't work on Railway:**
- Railway uses ephemeral storage (resets on restart)
- All data would be lost on deploy/restart
- No persistence guarantee

**Only good for:**
- Local development
- Testing

---

## RECOMMENDATION

**Do this NOW (5 minutes):**

1. Drop `raw_events` collection (frees ~400MB+ likely)
2. Disable raw_events saving in code
3. Your app will work again immediately

**Then decide later:**
- If still having space issues → Upgrade to M2 ($9/month)
- If want to avoid MongoDB costs → Migrate to Railway PostgreSQL (but takes time)

---

## Need Help?

I can write scripts to:
1. Check which collections are using the most space
2. Safely clean up old data
3. Disable raw_events saving
4. Set up automatic cleanup cron jobs
