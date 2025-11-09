# HakiVo Raindrop Workers

**Background workers for automated brief generation and personalized news using Raindrop Platform.**

## 🎯 Purpose

This Raindrop application solves the timeout issues with Netlify Functions by moving long-running tasks (5-10 minute brief generation) to Raindrop's Queue + Observer pattern which has **NO timeout constraints**.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Daily at Midnight UTC                  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Task: daily_brief_scheduler                      │   │
│  │  - Queries all users from database                │   │
│  │  - Queues brief jobs for each user                │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                   │
│                       ▼                                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Queue: brief_queue                               │   │
│  │  - Durable message storage                        │   │
│  │  - Automatic retry on failures                    │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                   │
│                       ▼                                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Observer: brief_worker                           │   │
│  │  - NO TIMEOUT CONSTRAINTS ✅                      │   │
│  │  - Fetches news (20-30s)                          │   │
│  │  - Queries bills                                   │   │
│  │  - Generates script with Claude (1-2 min)         │   │
│  │  - Generates audio with ElevenLabs (5-10 min) 🎙️  │   │
│  │  - Uploads to Vultr CDN                           │   │
│  │  - Saves complete brief to database               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              On-Demand (API Trigger)                     │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Netlify API: POST /api/news/queue               │   │
│  │  - Validates user                                 │   │
│  │  - Queues news job                                │   │
│  │  - Returns job ID immediately                     │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                   │
│                       ▼                                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Queue: news_queue                                │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                   │
│                       ▼                                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Observer: news_worker                            │   │
│  │  - Fetches news from Brave Search (20-30s)       │   │
│  │  - Fetches topic images from Pexels              │   │
│  │  - Saves to database + cache                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
raindrop-workers/
├── raindrop.manifest          # Raindrop application configuration
├── package.json               # Dependencies
├── README.md                  # This file
└── src/
    ├── daily_brief_scheduler.ts   # Task: runs @daily
    ├── brief_worker.ts            # Observer: processes briefs (no timeout)
    └── news_worker.ts             # Observer: processes news (no timeout)
```

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
cd raindrop-workers
npm install
```

### 2. Set Environment Variables

The workers need access to the same environment variables as the main app:

```bash
# Set Raindrop secrets
raindrop secret set ANTHROPIC_API_KEY="your-key"
raindrop secret set ELEVENLABS_API_KEY="your-key"
raindrop secret set ELEVENLABS_SARAH_VOICE_ID="your-id"
raindrop secret set ELEVENLABS_JAMES_VOICE_ID="your-id"
raindrop secret set VULTR_STORAGE_ENDPOINT="your-endpoint"
raindrop secret set VULTR_ACCESS_KEY="your-key"
raindrop secret set VULTR_SECRET_KEY="your-secret"
raindrop secret set VULTR_CDN_URL="your-cdn-url"
raindrop secret set BRAVE_SEARCH_API_KEY="your-key"
raindrop secret set PEXELS_API_KEY="your-key"
```

### 3. Link to Existing Database

Update `raindrop.manifest` to connect to your existing Raindrop SQL database:

```hcl
sql "hakivo_db" {
  # Connection details for existing database
}
```

### 4. Complete Implementation

The worker files currently have placeholder functions. You need to:

1. **Copy shared code** from main app to workers:
   - `lib/api/cerebras-tavily.ts` → News fetching
   - `lib/api/pexels.ts` → Image fetching
   - `lib/ai/claude.ts` → Script generation
   - `lib/ai/elevenlabs.ts` → Audio generation
   - `lib/storage/vultr.ts` → Audio upload
   - `lib/db/*` → Database operations

2. **Update import paths** in worker files to use shared code

3. **Test locally**:
   ```bash
   raindrop build run
   ```

### 5. Deploy to Production

```bash
raindrop build deploy
```

This will:
- Deploy the Task (scheduler runs daily at midnight UTC)
- Deploy both Queues (brief_queue, news_queue)
- Deploy both Observers (brief_worker, news_worker)
- Connect to your existing database

## 🔗 Integration with Netlify

### Update Netlify API Routes

Modify the Netlify API routes to send jobs to Raindrop queues instead of BullMQ/Redis:

#### `/app/api/news/queue/route.ts`

Replace BullMQ calls with Raindrop Queue calls:

```typescript
// OLD (BullMQ + Redis):
await addNewsJob({ userId, interests, ... });

// NEW (Raindrop Queue):
await env.NEWS_QUEUE.send({
  userId,
  userEmail: user.email,
  interests,
  state,
  district,
  limit,
  forceRefresh,
}, { contentType: 'json' });
```

#### `/app/api/briefs/generate-daily/route.ts`

Similar update for brief generation requests.

### Environment Access

The Netlify app needs access to the Raindrop queues. Add to `.env.local`:

```bash
RAINDROP_NEWS_QUEUE_URL="your-raindrop-queue-url"
RAINDROP_BRIEF_QUEUE_URL="your-raindrop-queue-url"
```

## ✅ Benefits vs BullMQ + Railway

| Feature | BullMQ + Railway | Raindrop Queues |
|---------|-----------------|-----------------|
| **Timeout** | None (good) | None (good) |
| **Setup** | 2 platforms | 1 platform |
| **Redis** | Upstash free tier (timeouts) | Built-in (reliable) |
| **Monitoring** | External | Built-in Observer |
| **Retry** | Manual config | Automatic |
| **Cost** | Railway free tier | Raindrop free tier |
| **Hackathon** | ❌ Uses non-sponsor platforms | ✅ 100% Raindrop Platform |

## 📊 Monitoring

View worker logs:

```bash
raindrop logs follow --filter="brief_worker"
raindrop logs follow --filter="news_worker"
raindrop logs follow --filter="daily_brief_scheduler"
```

Check queue status:

```bash
raindrop queue stats brief_queue
raindrop queue stats news_queue
```

## 🐛 Troubleshooting

### Workers not processing jobs

1. Check logs: `raindrop logs follow`
2. Verify queues exist: `raindrop queue list`
3. Check Task schedule: Task runs @daily (midnight UTC)

### Audio generation still timing out

- This should NOT happen with Raindrop Observers (no timeout)
- Check logs for actual errors beyond timeouts

### Cache not working

- Verify database connection in manifest
- Check Netlify Blobs integration for topic images

## 🎉 Success Criteria

When deployed correctly, you should see:

1. **Daily at midnight UTC**: Scheduler triggers and queues jobs for all users
2. **Brief workers start**: Process jobs one by one (5-10 min each)
3. **Briefs saved**: Complete briefs with audio appear in database
4. **No timeout errors**: Workers complete successfully regardless of duration

## 📚 Documentation

- [Raindrop Queue](https://docs.raindrop.ai/reference/queue)
- [Raindrop Task](https://docs.raindrop.ai/reference/task)
- [Raindrop Observer](https://docs.raindrop.ai/reference/observers)
- [Background Job Processing Pattern](https://docs.raindrop.ai/reference/architecture-patterns/background-job-processing)
