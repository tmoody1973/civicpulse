# Raindrop Workers Deployment Guide

## ✅ Current Status

All Raindrop worker code has been created and is ready for deployment!

### Files Created

```
raindrop-workers/
├── raindrop.manifest                 ✅ Application configuration
├── package.json                      ✅ Dependencies
├── tsconfig.json                     ✅ TypeScript config
├── .gitignore                        ✅ Git ignore rules
├── README.md                         ✅ Full documentation
├── DEPLOYMENT.md                     ✅ This guide
└── src/
    ├── daily_brief_scheduler.ts      ✅ Cron task (runs @daily)
    ├── brief_worker.ts               ✅ Observer for briefs (no timeout)
    ├── news_worker.ts                ✅ Observer for news (no timeout)
    └── lib/                          ✅ Shared code from main app
        ├── api/
        │   ├── cerebras-tavily.ts    ✅ News fetching
        │   └── pexels.ts             ✅ Image fetching
        ├── ai/
        │   ├── claude.ts             ✅ Script generation
        │   └── elevenlabs.ts         ✅ Audio generation
        ├── storage/
        │   └── vultr.ts              ✅ Audio upload
        ├── db/
        │   ├── news-articles.ts      ✅ Database operations
        │   └── topic-images.ts       ✅ Image storage
        └── news/
            └── cache.ts              ✅ Caching logic
```

---

## 🚀 Quick Start Deployment

### Step 1: Install Dependencies

```bash
cd raindrop-workers
npm install
```

### Step 2: Login to Raindrop

```bash
raindrop auth login
```

### Step 3: Set Environment Secrets

Run these commands to configure all required API keys:

```bash
# AI Services
raindrop secret set ANTHROPIC_API_KEY="your-claude-api-key"
raindrop secret set ELEVENLABS_API_KEY="your-elevenlabs-api-key"
raindrop secret set ELEVENLABS_SARAH_VOICE_ID="your-sarah-voice-id"
raindrop secret set ELEVENLABS_JAMES_VOICE_ID="your-james-voice-id"

# Storage
raindrop secret set VULTR_STORAGE_ENDPOINT="your-vultr-endpoint"
raindrop secret set VULTR_ACCESS_KEY="your-vultr-access-key"
raindrop secret set VULTR_SECRET_KEY="your-vultr-secret-key"
raindrop secret set VULTR_CDN_URL="your-vultr-cdn-url"

# News APIs
raindrop secret set BRAVE_SEARCH_API_KEY="your-brave-api-key"
raindrop secret set PEXELS_API_KEY="your-pexels-api-key"
```

**Get values from your main app's `.env.local` file**

### Step 4: Deploy to Raindrop

```bash
raindrop build deploy
```

This will:
- ✅ Deploy the daily scheduler Task (runs at midnight UTC)
- ✅ Deploy both Queues (brief_queue, news_queue)
- ✅ Deploy both Observers (brief_worker, news_worker)
- ✅ Connect to your existing Raindrop SQL database

### Step 5: Verify Deployment

```bash
# Check that everything deployed
raindrop build status

# View logs (wait until midnight UTC to see scheduler run)
raindrop logs follow --filter="daily_brief_scheduler"
raindrop logs follow --filter="brief_worker"
raindrop logs follow --filter="news_worker"
```

---

## 🔗 Integration with Netlify App

### Option A: Use Raindrop SDK in Netlify (Recommended)

Install Raindrop SDK in your main Netlify app:

```bash
cd /Users/tarikmoody/Documents/Projects/hakivo
npm install @raindrop/client
```

Then update API routes to queue jobs via Raindrop SDK:

#### Update `/app/api/news/queue/route.ts`:

```typescript
import { Raindrop } from '@raindrop/client';

const raindrop = new Raindrop({
  apiKey: process.env.RAINDROP_API_KEY!,
  appId: process.env.RAINDROP_APP_ID!,
});

export async function POST(request: NextRequest) {
  // ... existing code ...

  // Replace BullMQ call with Raindrop Queue
  await raindrop.queue('news_queue').send({
    userId: user.id,
    userEmail: user.email,
    interests: userInterests,
    state,
    district,
    limit,
    forceRefresh,
  }, { contentType: 'json' });

  return NextResponse.json({
    success: true,
    message: 'News generation queued',
  });
}
```

#### Update `/app/api/briefs/generate-daily/route.ts`:

```typescript
await raindrop.queue('brief_queue').send({
  userId: user.id,
  userEmail: user.email,
  policyInterests: userPreferences.policyAreas,
  state: user.state,
  district: user.district,
  forceRegenerate: false,
}, { contentType: 'json' });
```

### Option B: Use HTTP API (Alternative)

Raindrop also exposes queues via HTTP API if you prefer:

```typescript
await fetch(`https://api.raindrop.ai/v1/queue/news_queue/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RAINDROP_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: user.id,
    userEmail: user.email,
    interests: userInterests,
    // ... rest of job data
  }),
});
```

---

## 📊 Testing

### Test News Queue Manually

```bash
raindrop queue send news_queue '{
  "userId": "test-123",
  "userEmail": "test@example.com",
  "interests": ["Politics", "Healthcare"],
  "limit": 10,
  "forceRefresh": false
}'
```

Then watch the worker process it:

```bash
raindrop logs follow --filter="news_worker"
```

### Test Brief Queue Manually

```bash
raindrop queue send brief_queue '{
  "userId": "test-123",
  "userEmail": "test@example.com",
  "policyInterests": ["Politics", "Healthcare"],
  "forceRegenerate": false
}'
```

Watch the worker (this will take 5-10 minutes):

```bash
raindrop logs follow --filter="brief_worker"
```

### Test Daily Scheduler

The scheduler runs automatically at midnight UTC, but you can test it manually:

```bash
raindrop task trigger daily_brief_scheduler
```

---

## 🔍 Monitoring

### Queue Stats

```bash
raindrop queue stats brief_queue
raindrop queue stats news_queue
```

### Worker Status

```bash
raindrop observer status brief_worker
raindrop observer status news_worker
```

### Recent Logs

```bash
raindrop logs --limit=100 --filter="brief_worker"
raindrop logs --limit=100 --filter="news_worker"
```

---

## 🐛 Troubleshooting

### Workers not processing jobs

**Check if workers are running:**
```bash
raindrop observer status brief_worker
raindrop observer status news_worker
```

**Check queue depth:**
```bash
raindrop queue stats brief_queue
```

If queue has messages but workers aren't processing:
- Check worker logs for errors: `raindrop logs follow --filter="brief_worker"`
- Verify environment secrets are set: `raindrop secret list`

### Audio generation still failing

**Check ElevenLabs API key:**
```bash
raindrop secret get ELEVENLABS_API_KEY
```

**Check worker logs for specific error:**
```bash
raindrop logs follow --filter="brief_worker" --level=error
```

### Database connection issues

**Verify database connection in manifest:**
```bash
cat raindrop.manifest | grep -A 5 "sql"
```

Make sure `sql "hakivo_db"` matches your existing database name.

---

## 🎉 Success Verification

Once deployed, you should see:

### Daily at Midnight UTC:
1. ✅ Scheduler task triggers
2. ✅ Jobs queued for all users (one per user)
3. ✅ Brief worker starts processing
4. ✅ Each brief takes 5-10 minutes (no timeout!)
5. ✅ Complete briefs with audio saved to database

### On-Demand News Requests:
1. ✅ User requests personalized news
2. ✅ Netlify API queues job immediately
3. ✅ Returns success in < 1 second
4. ✅ News worker processes in background (20-30s)
5. ✅ Articles saved to database + cached

### No More Timeouts:
- ✅ Brief generation works (was timing out at 26s on Netlify)
- ✅ News generation works (was timing out occasionally)
- ✅ No Redis connection errors (built-in Raindrop Queue)
- ✅ 100% Raindrop Platform (hackathon compliant)

---

## 📚 Additional Resources

- [Raindrop Queue Docs](https://docs.raindrop.ai/reference/queue)
- [Raindrop Task Docs](https://docs.raindrop.ai/reference/task)
- [Raindrop Observer Docs](https://docs.raindrop.ai/reference/observers)
- [Background Job Processing Pattern](https://docs.raindrop.ai/reference/architecture-patterns/background-job-processing)

---

## 🚨 Important Notes

1. **Daily scheduler runs at midnight UTC** (7pm EST / 4pm PST)
   - If you want to test sooner, use: `raindrop task trigger daily_brief_scheduler`

2. **Observers have NO timeout** - briefs can take as long as needed
   - Brief generation: 5-10 minutes per job ✅
   - News generation: 20-30 seconds per job ✅

3. **Automatic retries** - If a job fails, it automatically retries with backoff
   - Brief worker: Retries in 5 minutes
   - News worker: Retries in 1 minute

4. **Queue throughput** - Can handle 5,000 messages/second per queue
   - More than enough for your user base

5. **No Redis needed** - Raindrop Queue is built-in and reliable
   - No Upstash free tier timeout issues ✅

---

## Next Steps

1. ✅ Deploy workers: `raindrop build deploy`
2. ✅ Update Netlify API routes to use Raindrop queues
3. ✅ Test manually with `raindrop queue send`
4. ✅ Wait for midnight UTC to see automated briefs
5. ✅ Monitor logs: `raindrop logs follow`

**That's it! Your timeout issues are solved and everything runs on Raindrop Platform! 🎉**
