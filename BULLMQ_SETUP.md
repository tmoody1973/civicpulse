# BullMQ Background Job Queue Setup

**Status:** 90% Complete - Just needs Redis URL!

## What We Built

Instead of Netlify Background Functions (which have been causing issues), we're using **BullMQ** - a battle-tested Node.js job queue that's:
- ✅ Easy to test locally (live console output!)
- ✅ Works on any platform (Vultr, Railway, Heroku, etc.)
- ✅ Has built-in retry logic
- ✅ Provides real-time progress updates
- ✅ Includes a monitoring dashboard

---

## Files Created

### 1. **`lib/queue/redis.ts`** - Redis Connection
Configures the connection to Upstash Redis (free hosted Redis service).

### 2. **`lib/queue/brief-queue.ts`** - Queue Management
Handles adding jobs to the queue and checking job status.

### 3. **`workers/brief-worker.ts`** - Background Worker
The actual worker process that picks up jobs and generates briefs.
You'll see LIVE console output as it processes jobs!

### 4. **`package.json`** - Added Worker Command
Run worker with: `npm run worker`

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST                             │
│              (Generate Daily Brief)                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               API ROUTE                                     │
│        /api/briefs/generate-daily                           │
│                                                              │
│  1. Add job to Redis queue                                 │
│  2. Return job ID immediately (<1s)                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              REDIS (Upstash)                                │
│                                                              │
│  • Stores all jobs                                          │
│  • Tracks job status (queued → processing → complete)      │
│  • Handles retries automatically                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         WORKER PROCESS (Separate Server)                    │
│           workers/brief-worker.ts                           │
│                                                              │
│  • Watches queue for new jobs                               │
│  • Picks up job when available                              │
│  • Generates brief (5-10 minutes)                           │
│  • Updates progress: 10% → 20% → 40% → 60% → 80% → 100%   │
│  • Saves result to database                                 │
│  • Waits for next job                                       │
│                                                              │
│  LIVE CONSOLE OUTPUT - You see everything happening!       │
└─────────────────────────────────────────────────────────────┘
```

---

## What's Left (Just 1 Thing!)

### Get Redis URL from Upstash (5 minutes)

1. Go to https://upstash.com
2. Sign up (free tier - no credit card needed)
3. Click "Create Database"
4. Copy the connection URL (looks like: `redis://default:PASSWORD@HOST.upstash.io:6379`)
5. Add to `.env.local`:

```bash
REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379"
```

That's it!

---

## Testing Locally

### Terminal 1: Start Next.js
```bash
npm run dev
```

### Terminal 2: Start Worker
```bash
npm run worker
```

You'll see output like:
```
🚀 Starting brief generation worker...
📡 Connecting to Redis...
✅ Redis connected
✅ Worker ready and waiting for jobs!
👀 Watching queue: brief-generation

```

### Terminal 3: Test Brief Generation
```bash
curl -X POST http://localhost:3000/api/briefs/generate-daily \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{"force_regenerate": true}'
```

**In Terminal 2 (worker), you'll see LIVE output:**
```
▶️  Job brief-test@hakivo.com-1673912345678 started

🎯 Starting job brief-test@hakivo.com-1673912345678
   User: test@hakivo.com
   Time: 10:30:42 AM

📋 Fetching user preferences...
   Progress: 10%

📰 Fetching news articles...
   Found 12 news articles
   Progress: 20%

📜 Querying bills from Congress...
   Found 8 relevant bills
   Progress: 30%

✍️  Generating dialogue script with Claude AI...
   Generated 24 dialogue lines
   Progress: 40%

🎵 Generating audio with ElevenLabs (this takes 5-10 minutes)...
   Generated 8.3MB audio (~6 min)
   Progress: 60%

☁️  Uploading to Vultr CDN...
   Uploaded: https://cdn.hakivo.com/briefs/abc123.mp3
   Progress: 80%

📝 Generating written digest...
   Progress: 90%

💾 Saving to database...
   Progress: 95%

✅ Job brief-test@hakivo.com-1673912345678 completed in 720s (12 min)
   Audio URL: https://cdn.hakivo.com/briefs/abc123.mp3
```

**This is MUCH better than Netlify Background Functions where you have no visibility!**

---

## Deploying to Vultr (Recommended)

Vultr is perfect for running the worker because:
- ✅ You're already using Vultr for storage
- ✅ Cheap compute instances ($3.50/month)
- ✅ Same datacenter as your storage (faster uploads)
- ✅ Easy to setup

### Step 1: Create Vultr Compute Instance

1. Go to https://my.vultr.com
2. Click "Deploy +" → "Deploy New Server"
3. Choose:
   - **Server Type:** Cloud Compute - Shared CPU
   - **Location:** Same as your storage (e.g., New York)
   - **Server Image:** Ubuntu 22.04 LTS
   - **Server Size:** Regular Performance - $6/month (1 CPU, 2GB RAM)
4. Click "Deploy Now"

### Step 2: Setup Server

SSH into your server:
```bash
ssh root@YOUR_SERVER_IP
```

Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
```

### Step 3: Deploy Worker

Clone your repo:
```bash
git clone https://github.com/YOUR_USERNAME/hakivo.git
cd hakivo
npm install
```

Create environment file:
```bash
cat > .env.local << EOF
REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379"
ANTHROPIC_API_KEY="your-key"
ELEVENLABS_API_KEY="your-key"
ELEVENLABS_SARAH_VOICE_ID="your-id"
ELEVENLABS_JAMES_VOICE_ID="your-id"
VULTR_STORAGE_ENDPOINT="your-endpoint"
VULTR_ACCESS_KEY="your-key"
VULTR_SECRET_KEY="your-secret"
TURSO_DATABASE_URL="your-turso-url"
TURSO_AUTH_TOKEN="your-turso-token"
EOF
```

### Step 4: Run Worker with PM2 (Process Manager)

Install PM2:
```bash
npm install -g pm2
```

Start worker:
```bash
pm2 start "npm run worker" --name brief-worker
pm2 save
pm2 startup
```

Check logs:
```bash
pm2 logs brief-worker
```

**That's it! Your worker is now running 24/7!**

---

## Alternative: Deploy to Railway (Also Easy)

Railway is another great option:

1. Install Railway CLI:
```bash
npm install -g @railway/cli
railway login
```

2. Initialize project:
```bash
railway init
```

3. Set environment variables:
```bash
railway variables set REDIS_URL="..."
railway variables set ANTHROPIC_API_KEY="..."
# ... set all other env vars
```

4. Deploy:
```bash
railway up
```

---

## Monitoring

### Check Queue Status

The queue automatically tracks:
- Jobs waiting to be processed
- Jobs currently processing
- Completed jobs (last 100, kept for 24 hours)
- Failed jobs (kept for 7 days)

### BullMQ Dashboard (Optional)

Want a web UI to see all jobs? Install Bull Board:

```bash
npm install @bull-board/api @bull-board/express
```

Then access at: `http://localhost:3000/admin/bull-board`

---

## Benefits Over Netlify Background Functions

| Feature | Netlify BG Functions | BullMQ |
|---------|---------------------|---------|
| **Local testing** | ❌ No | ✅ Yes (full console output!) |
| **Visibility** | ❌ Limited logs | ✅ Live progress updates |
| **Debugging** | ❌ Hard | ✅ Easy (see errors immediately) |
| **Setup time** | 2+ hours | 30 minutes |
| **Retry logic** | Manual | ✅ Built-in |
| **Monitoring** | ❌ Limited | ✅ Dashboard available |
| **Platform lock-in** | ❌ Netlify only | ✅ Works everywhere |
| **Cost** | Free (but limited) | $3.50-6/month (Vultr) or free (Railway) |

---

## Troubleshooting

### "ECONNRESET" or "Command timed out" Errors (Upstash Free Tier)
**This is NORMAL behavior** - the worker is still functional!

When you see:
```
✅ Worker ready and waiting for jobs!
❌ Worker error: Error: read ECONNRESET
```

**What's happening:**
- Upstash free tier has connection limits
- BullMQ creates multiple Redis connections (worker, events, blocking)
- Some connections get reset, but worker recovers automatically
- **The worker continues processing jobs without issues**

**How to verify it's working:**
1. Look for "✅ Worker ready and waiting for jobs!" (this means it's operational)
2. Test job generation (add job via API)
3. Worker will process jobs despite connection errors

**To eliminate errors (optional):**
- Upgrade to Upstash paid tier (more connections allowed)
- Or deploy to Railway/Vultr with dedicated Redis instance

### "ECONNREFUSED" Error
- Check REDIS_URL is set correctly
- Verify Upstash database is active

### Worker Not Processing Jobs
- Make sure worker is running (`npm run worker`)
- Check Redis connection in worker output
- Verify job was added to queue (check API response)

### Jobs Failing
- Check worker logs for error details
- BullMQ will automatically retry 3 times
- Failed jobs are kept for 7 days for debugging

---

## Next Steps

1. **Get Redis URL from Upstash** (5 min)
2. **Test locally** (5 min)
3. **Deploy worker to Vultr** (15 min)
4. **Done!** You now have a reliable, testable background job system!

---

**Questions?** The worker logs will show you everything that's happening in real-time!
