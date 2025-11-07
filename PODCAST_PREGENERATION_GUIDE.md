# Podcast Pre-generation Implementation Guide

**Feature:** Instant podcast delivery through pre-generation and caching

**Performance:** <1 second (vs 45 seconds for on-demand generation)

---

## How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      3AM DAILY CRON JOB                      │
│                                                               │
│  1. Get all active users from database                       │
│  2. For each user:                                           │
│     a. Fetch recent bills                                    │
│     b. Generate dialogue script (Claude)                     │
│     c. Generate audio (ElevenLabs)                           │
│     d. Upload to Vultr CDN                                   │
│     e. Cache in Raindrop KV                                  │
│         Key: podcast:{userId}:daily:{date}                   │
│         TTL: 24 hours (expires end of day)                   │
│                                                               │
│  Result: All users have podcasts ready instantly!           │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                      USER REQUESTS PODCAST                    │
│                                                               │
│  1. User clicks "Generate Daily Podcast"                     │
│  2. POST /api/generate-podcast { type: "daily" }             │
│  3. Check cache: podcast:{userId}:daily:2025-11-07           │
│     ├─ Cache hit? → Return podcast instantly (<1s) ✅        │
│     └─ Cache miss? → Submit to queue (fallback) ⏱️          │
│                                                               │
│  Cache Hit Response:                                         │
│  {                                                            │
│    "success": true,                                           │
│    "cached": true,                                            │
│    "audioUrl": "https://cdn.vultr.com/...",                  │
│    "transcript": "...",                                       │
│    "duration": 318,                                           │
│    "message": "Your podcast is ready! (Pre-generated)",      │
│    "source": "cache"                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Files

### 1. Cache Layer (`lib/podcast/cache.ts`)

**Key Functions:**

#### `getCachedPodcast(userId, type)`
Checks Raindrop KV Cache for pre-generated podcast.

```typescript
const cacheKey = `podcast:${userId}:${type}:${getTodayKey()}`;
// Example: podcast:user_123:daily:2025-11-07

const cached = await env.KV_CACHE.get(cacheKey);
return cached ? JSON.parse(cached) : null;
```

#### `cachePodcast(userId, type, podcast)`
Stores podcast in cache with 24-hour TTL.

```typescript
await env.KV_CACHE.put(cacheKey, JSON.stringify(podcast), {
  expirationTtl: ttlSeconds // Expires at end of day
});
```

#### `pregeneratePodcasts()`
Main pre-generation function (called by cron).

```typescript
// 1. Get active users
const activeUsers = await getActiveUsers();

// 2. Generate podcasts in batches (5 concurrent)
for (const user of activeUsers) {
  const podcast = await generatePodcastForUser(user, 'daily');
  await cachePodcast(user.id, 'daily', podcast);
}
```

### 2. Cron Endpoint (`app/api/cron/pregenerate-podcasts/route.ts`)

Triggered daily at 3am to pre-generate podcasts.

```typescript
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run pre-generation
  const results = await pregeneratePodcasts();

  return NextResponse.json({
    success: true,
    results: {
      total: results.success + results.failed,
      successful: results.success,
      failed: results.failed
    }
  });
}
```

### 3. Updated Generate Route (`app/api/generate-podcast/route.ts`)

Now checks cache first before submitting to queue.

```typescript
export async function POST(request: NextRequest) {
  const { type, forceRegenerate } = await request.json();
  const user = await getSession();

  // Check cache (unless force regenerate)
  if (!forceRegenerate) {
    const cached = await getCachedPodcast(user.id, type);

    if (cached) {
      // Cache hit - instant delivery!
      return NextResponse.json({
        success: true,
        cached: true,
        audioUrl: cached.audioUrl,
        transcript: cached.transcript,
        duration: cached.duration,
        message: 'Your podcast is ready! (Pre-generated)',
        source: 'cache'
      });
    }
  }

  // Cache miss - fallback to queue-based generation
  const jobId = generateJobId();
  triggerBackgroundWorker(jobId, params);

  return NextResponse.json({
    success: true,
    jobId,
    pollUrl: `/api/audio-status/${jobId}`,
    message: 'Generating podcast...'
  });
}
```

### 4. Worker Caching (`app/api/process-podcast-job/route.ts`)

Worker now caches generated podcasts after completion.

```typescript
// After generating podcast...
await cachePodcast(userId, type, {
  audioUrl,
  transcript,
  billsCovered,
  duration,
  generatedAt: new Date().toISOString(),
  expiresAt: endOfDay.toISOString()
});

console.log(`✅ Podcast cached - next request will be instant!`);
```

---

## Netlify Scheduled Functions Setup

### Option 1: Netlify Scheduled Functions (Recommended for Hackathon)

Create `netlify/functions/pregenerate-podcasts.ts`:

```typescript
import { schedule } from '@netlify/functions';

export const handler = schedule('0 3 * * *', async () => {
  // Call cron endpoint
  const response = await fetch(`${process.env.SITE_URL}/api/cron/pregenerate-podcasts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
});
```

**Cron Schedule Format:**
```
0 3 * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)

Examples:
0 3 * * *     # 3am daily
0 */6 * * *   # Every 6 hours
0 0 * * 1     # Mondays at midnight
```

### Option 2: Raindrop Cron Observer (Production)

Update `raindrop.manifest`:

```
observer "podcast-pregeneration-cron" {
  source {
    schedule = "0 3 * * *"  # 3am daily
  }

  handler = "workers/podcast-pregeneration.ts"
}
```

Create `workers/podcast-pregeneration.ts`:

```typescript
import { pregeneratePodcasts } from '@/lib/podcast/cache';

export async function handleCron() {
  console.log('🚀 Starting podcast pre-generation cron job...');

  const results = await pregeneratePodcasts();

  console.log(`✅ Complete: ${results.success} success, ${results.failed} failed`);

  return results;
}
```

---

## Environment Variables

Add to Netlify or `.env.local`:

```bash
# Cron secret (protect cron endpoint)
CRON_SECRET=your-secret-here

# Site URL (for scheduled function)
SITE_URL=https://hakivo.netlify.app

# Raindrop KV Cache (for production)
RAINDROP_KV_URL=your-kv-url
```

---

## Testing the Implementation

### Test 1: Manual Cron Trigger

```bash
# Trigger pre-generation manually
curl -X POST http://localhost:3000/api/cron/pregenerate-podcasts \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json"

# Response:
{
  "success": true,
  "results": {
    "total": 10,
    "successful": 9,
    "failed": 1,
    "errors": [
      { "userId": "user_456", "error": "No bills available" }
    ]
  },
  "duration": "4.2 minutes"
}
```

### Test 2: Cache Hit

```bash
# First request (after cron runs)
curl -X POST http://localhost:3000/api/generate-podcast \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'

# Response (instant):
{
  "success": true,
  "cached": true,
  "audioUrl": "https://cdn.vultr.com/podcasts/...",
  "duration": 318,
  "message": "Your podcast is ready! (Pre-generated)",
  "source": "cache"
}
```

### Test 3: Cache Miss (Fallback)

```bash
# Request with force regenerate
curl -X POST http://localhost:3000/api/generate-podcast \
  -H "Content-Type: application/json" \
  -d '{"type": "daily", "forceRegenerate": true}'

# Response (queue-based):
{
  "success": true,
  "jobId": "user_123-daily-1730932800000",
  "pollUrl": "/api/audio-status/user_123-daily-1730932800000",
  "message": "Generating podcast..."
}
```

### Test 4: Check Cache Status

```bash
# Check if podcast is cached (via logs)
# Look for: "✅ Cache hit! Returning pre-generated podcast instantly"
# Or: "❌ Cache miss - generating new podcast via queue"
```

---

## Performance Comparison

### Without Pre-generation (Current)

```
User Request → Queue Job → Wait 45s → Podcast Ready

Timeline:
0s:  User submits
1s:  Job queued
45s: Podcast complete ⏱️
45s: User gets audio
```

**User Experience:**
- Initial wait: 45 seconds
- Progress bar: 0% → 100%
- Frustration: Moderate

### With Pre-generation (Optimized)

```
User Request → Check Cache → Instant Delivery!

Timeline:
0s:  User submits
0.5s: Cache checked
0.5s: Podcast returned ✅

(Cron ran at 3am - podcast already generated)
```

**User Experience:**
- Initial wait: <1 second (97% faster!)
- No progress bar needed
- Frustration: None

---

## Cost Analysis

### Pre-generation Strategy

**Assumptions:**
- 1,000 active users
- Daily podcast generation
- Each generation costs $0.05 (ElevenLabs + Claude)

**Scenarios:**

#### Scenario 1: Pre-generate All (Current Plan)
```
Cost per day: 1,000 users × $0.05 = $50/day
Cost per month: $50 × 30 = $1,500/month

Delivery time: <1s for all users ✅
Waste: Podcasts generated but not listened to
```

#### Scenario 2: On-Demand Only
```
Cost per day: 300 users × $0.05 = $15/day
(Assuming 30% daily active rate)
Cost per month: $15 × 30 = $450/month

Delivery time: 45s for all users ⏱️
Waste: None (only generate when requested)
```

#### Scenario 3: Hybrid (Smart Pre-generation)
```
Cost per day:
- Pre-generate: 500 high-engagement users × $0.05 = $25
- On-demand: 100 low-engagement users × $0.05 = $5
Total: $30/day
Cost per month: $30 × 30 = $900/month

Delivery time: <1s for 83% of users ✅
Waste: Minimal (target high-engagement only)
```

**Recommendation:** Start with Scenario 1 (pre-generate all) for hackathon demo, then optimize to Scenario 3 for production.

---

## Optimization Strategies

### 1. Smart User Targeting

Only pre-generate for users likely to listen:

```typescript
async function getActiveUsers(): Promise<User[]> {
  // Target users who:
  // - Generated podcast in last 7 days
  // - Opened app in last 3 days
  // - Have >3 podcast listens total
  // - Opted into daily notifications

  return db.users.findMany({
    where: {
      OR: [
        { lastPodcastGeneratedAt: { gte: sevenDaysAgo } },
        { lastAppOpenAt: { gte: threeDaysAgo } },
        { podcastListenCount: { gte: 3 } },
        { dailyPodcastEnabled: true }
      ]
    }
  });
}
```

### 2. Tiered Pre-generation

```typescript
// Tier 1: Daily active users (pre-generate daily)
// Tier 2: Weekly active users (pre-generate weekly)
// Tier 3: Inactive users (on-demand only)

if (user.tier === 'daily') {
  await pregenerateDailyPodcast(user);
} else if (user.tier === 'weekly') {
  await pregenerateWeeklyPodcast(user);
}
// Tier 3 users get queue-based generation
```

### 3. Predictive Pre-generation

```typescript
// Analyze user patterns to predict when they'll request
const userHabits = analyzeUserHabits(user.id);

if (userHabits.typicalRequestTime === '8am') {
  // Pre-generate at 7:30am (30min before expected request)
  schedulePregeneration(user.id, '7:30am');
}
```

### 4. Partial Pre-generation

```typescript
// Pre-generate script + bills (cheap, fast)
// Generate audio on-demand (expensive, slow)

// At 3am:
const prepared = await prepareDialogueScript(bills);
await cache.put(`script:${userId}:${date}`, prepared);

// On request:
const script = await cache.get(`script:${userId}:${date}`);
const audio = await generateDialogue(script); // Only this step
```

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Cache Hit Rate**
   ```typescript
   const cacheHitRate = cacheHits / totalRequests;
   // Target: >80%
   ```

2. **Pre-generation Success Rate**
   ```typescript
   const successRate = successful / total;
   // Target: >95%
   ```

3. **Cost per User**
   ```typescript
   const costPerUser = totalCost / activeUsers;
   // Target: <$0.10/user/day
   ```

4. **Time to First Audio**
   ```typescript
   const avgDeliveryTime = sum(deliveryTimes) / requests;
   // Target: <2s
   ```

### Logging

```typescript
console.log({
  event: 'podcast_delivery',
  userId: user.id,
  cached: true,
  deliveryTime: '0.5s',
  generatedAt: '2025-11-07T03:00:00Z',
  requestedAt: '2025-11-07T09:15:30Z'
});
```

---

## Rollout Plan

### Phase 1: Testing (Week 1)

- [ ] Implement cache layer
- [ ] Add cron endpoint
- [ ] Test with 10 test users
- [ ] Monitor cache hit rates
- [ ] Verify cost estimates

### Phase 2: Beta (Week 2)

- [ ] Enable for 100 users (highest engagement)
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] A/B test (pre-gen vs on-demand)
- [ ] Optimize targeting criteria

### Phase 3: Full Rollout (Week 3)

- [ ] Enable for all active users
- [ ] Deploy Netlify scheduled function
- [ ] Set up monitoring dashboards
- [ ] Configure alerts (failures, high costs)
- [ ] Document operational procedures

### Phase 4: Optimization (Ongoing)

- [ ] Implement tiered pre-generation
- [ ] Add predictive scheduling
- [ ] Reduce cost per user
- [ ] Improve cache hit rate to >90%

---

## Troubleshooting

### Problem: Cron job failing

**Check:**
```bash
# View Netlify function logs
netlify functions:list
netlify functions:invoke pregenerate-podcasts

# Check authorization
curl -X POST https://hakivo.netlify.app/api/cron/pregenerate-podcasts \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Common Issues:**
- Missing CRON_SECRET environment variable
- Wrong cron schedule format
- Timeout (increase maxDuration)
- Rate limiting (ElevenLabs, Claude, Congress.gov)

### Problem: Cache not working

**Check:**
```typescript
// Verify cache key format
console.log(`Cache key: podcast:${userId}:${type}:${getTodayKey()}`);
// Should be: podcast:user_123:daily:2025-11-07

// Check expiration
const expiresAt = getEndOfDay();
console.log(`Expires at: ${expiresAt.toISOString()}`);
```

### Problem: High costs

**Solutions:**
- Implement smart user targeting (only active users)
- Use tiered pre-generation
- Add partial pre-generation (script only)
- Increase cache TTL (if appropriate)
- Monitor and remove inactive users

---

## Production Checklist

- [ ] Environment variables set in Netlify
- [ ] CRON_SECRET configured
- [ ] Raindrop KV Cache credentials
- [ ] Netlify scheduled function deployed
- [ ] Cron schedule verified (3am daily)
- [ ] Cache TTL set correctly (24 hours)
- [ ] User targeting logic implemented
- [ ] Monitoring dashboards configured
- [ ] Cost alerts set up
- [ ] Error logging enabled
- [ ] Backup queue-based generation working
- [ ] User communication (explain instant delivery)

---

**Result:** Users get podcasts instantly (<1s) instead of waiting 45 seconds. Perfect for hackathon demo!
