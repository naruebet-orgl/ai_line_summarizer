# Deploy Separate MongoDB on Railway

## Option 1: Railway MongoDB Service (Recommended)

### Step 1: Create MongoDB Service in Railway

1. Go to your Railway project
2. Click "New Service" → "Empty Service"
3. Name it: `mongodb`
4. Add Variables:
   ```
   MONGO_INITDB_ROOT_USERNAME=admin
   MONGO_INITDB_ROOT_PASSWORD=your-secure-password-here
   ```

### Step 2: Add MongoDB Docker Image

In the mongodb service settings:
- Source: Docker Image
- Image: `mongo:7`
- Port: `27017`

### Step 3: Add Persistent Volume

In the mongodb service:
1. Go to "Volumes" tab
2. Click "Add Volume"
3. Mount Path: `/data/db`
4. Size: Start with 5GB (can increase later)

### Step 4: Update Backend Connection String

In your `backend` service, update environment variable:

```
MONGODB_URI=mongodb://admin:your-secure-password-here@mongodb.railway.internal:27017/line_chat_summarizer?authSource=admin
```

**Note:** `mongodb.railway.internal` is Railway's internal DNS for service-to-service communication (free, no egress charges)

### Step 5: Deploy

1. Deploy mongodb service
2. Wait for it to be healthy
3. Deploy backend service (will connect to new MongoDB)

---

## Option 2: External VPS MongoDB

### Step 1: Create VPS

Cheap options:
- **Hetzner**: €4.15/month (20GB storage)
- **DigitalOcean**: $6/month (25GB storage)
- **Linode**: $5/month (25GB storage)

### Step 2: Install Docker

```bash
# SSH into your VPS
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Step 3: Deploy MongoDB

```bash
# Create data directory
mkdir -p /data/mongodb

# Run MongoDB with authentication
docker run -d \
  --name mongodb \
  --restart=always \
  -p 27017:27017 \
  -v /data/mongodb:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your-secure-password \
  mongo:7
```

### Step 4: Configure Firewall

```bash
# Only allow your Railway backend IP
# Get Railway static IP first (requires paid plan) or use Cloudflare Tunnel

# Ubuntu/Debian
ufw allow from YOUR_RAILWAY_IP to any port 27017
ufw enable
```

### Step 5: Update Backend Connection

```
MONGODB_URI=mongodb://admin:your-password@YOUR_VPS_IP:27017/line_chat_summarizer?authSource=admin
```

---

## Option 3: Quick Fix (FREE - Do This NOW)

While you decide on long-term solution:

### Disable raw_events Saving

**File:** `backend/src/routes/line_routes.js`

Find this section and comment it out:

```javascript
// Comment out or remove this entire block
/*
try {
  await RawEvent.create({
    event_id: webhookEventId,
    type: event.type,
    timestamp: new Date(event.timestamp),
    source: event.source,
    data: event
  });
  console.log(`📨 Saving LINE event: ${event.type} (${webhookEventId})`);
} catch (error) {
  console.error(`❌ Failed to save raw event:`, error);
}
*/
```

### Clean Current Database

Use Railway CLI or MongoDB Compass:

```bash
# Connect to your current Atlas
mongo "your-atlas-connection-string"

# Check sizes
db.stats()
db.raw_events.stats()

# Drop raw_events (safe - only for debugging)
db.raw_events.drop()

# Optional: Clean old sessions
db.sessions.deleteMany({
  status: 'closed',
  end_time: { $lt: new Date('2024-01-01') }
})
```

This gives you ~450 MB back immediately!

---

## Cost Analysis

### Current (Atlas M0):
- Cost: FREE
- Storage: 512 MB
- **Problem: FULL**

### Railway MongoDB:
- Cost: ~$5-10/month
- Storage: 5-10 GB+
- **No more quota issues**

### VPS MongoDB:
- Cost: $5-12/month
- Storage: 20-50 GB
- **Most storage per dollar**
- **More setup required**

---

## My Recommendation

**RIGHT NOW (2 minutes):**
1. Drop `raw_events` collection
2. Disable raw_events saving in code
3. Deploy backend

**Result:** Your app works again, costs $0

**THEN evaluate:**
- If you keep hitting 512MB → Railway MongoDB or VPS
- If you want zero maintenance → Upgrade Atlas to M2 ($9/month)
- If you want to learn DevOps → VPS MongoDB ($5/month)

---

## Need Help?

I can:
1. ✅ Write the code to disable raw_events saving
2. ✅ Create Railway MongoDB service config
3. ✅ Write VPS setup scripts
4. ✅ Set up automatic old data cleanup cron jobs

Let me know which path you want to take!
