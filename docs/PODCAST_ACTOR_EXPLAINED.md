# Podcast Actor System - Complete Explanation & Testing Guide

## How the Actor System Works

### **The Big Picture**

Think of the Actor system as having **three main players**:

1. **Actor (PodcastGenerator)** = Personal assistant per user
2. **Queue** = Waiting line for jobs
3. **Observer (PodcastQueueHandler)** = Worker that processes jobs

```
User Request → Actor (queues it) → Queue → Observer (processes it) → Actor (updates status) → User Notified
```

---

## What Happens Step-by-Step

### **Step 1: User Clicks "Generate Podcast"**

**What the user sees:**
```
[Generate Podcast Button]
  ↓ (User clicks)
```

**What happens behind the scenes:**
```typescript
// API route receives request
POST /api/podcasts/queue
{
  type: "daily",
  bills: ["119-hr-1234", "119-s-567"]
}
```

---

### **Step 2: Actor Receives the Request**

**The Actor's job:** Act as the user's personal queue manager

```typescript
// Actor creates a unique podcast ID
podcastId = "podcast-1730736000000-abc123"

// Actor adds it to the user's personal queue
queue = [
  { id: podcastId, type: "daily", bills: [...], timestamp: ... }
]

// Actor creates a status entry
status = {
  podcastId: "podcast-...",
  status: "queued",
  queuePosition: 1  // First in line!
}

// Actor sends job to the processing queue
PODCAST_GENERATION_QUEUE.send(job)
```

**What the user sees:**
```
✅ Queued! Position #1
⏱️  Estimated time: ~1 minute

[Continue browsing the app - non-blocking!]
```

---

### **Step 3: Observer Picks Up the Job**

**The Observer's job:** Actually do the heavy lifting

```typescript
// Observer monitors the queue 24/7
while (true) {
  job = QUEUE.getNext()

  // Step 3a: Update actor "I'm working on it!"
  actor.updateStatus(jobId, { status: "processing" })

  // Step 3b: Fetch bill data
  bills = fetchBills(job.bills)

  // Step 3c: Generate dialogue with Claude
  dialogue = await claudeAPI.generate(bills)

  // Step 3d: Generate audio with ElevenLabs
  audioBuffer = await elevenLabsAPI.generate(dialogue)

  // Step 3e: Upload to Vultr CDN
  audioUrl = await vultr.upload(audioBuffer)

  // Step 3f: Tell actor "Done! Here's the URL!"
  actor.updateStatus(jobId, {
    status: "completed",
    audioUrl: "https://cdn.vultr.com/..."
  })

  // Step 3g: Send notification
  NOTIFICATIONS_QUEUE.send({
    userId: job.userId,
    title: "Your podcast is ready!"
  })
}
```

**What the user sees (polling every 5 seconds):**
```
⏳ Generating your podcast...

[After ~45 seconds]

🎉 Your podcast is ready!
[Listen Now Button]
```

---

### **Step 4: User Gets Their Podcast**

**What happens:**
- Browser polls `/api/podcasts/status/[podcastId]` every 5 seconds
- When status changes to "completed", UI updates automatically
- Optional: Push notification if user granted permission

**What the user sees:**
```
🔔 Notification: "Your daily brief is ready!"

[Click notification OR see UI update]

✅ Your podcast is ready!
Duration: 5:23
[▶️  Listen Now] [Generate Another]
```

---

## Actor Benefits - Why This is Better

### **Before (Blocking):**
```
User clicks → 60s loading spinner → Podcast or Error
❌ Can't do anything else
❌ No queue visibility
❌ Server handles peak load
```

### **After (Actor/Queue):**
```
User clicks → Instant feedback → Continue browsing → Notification when ready
✅ Non-blocking UX
✅ Queue visibility
✅ Smooth resource usage
✅ Retry logic built-in
```

---

## Actor State Storage

Each user's actor stores this data persistently (10GB max):

```typescript
// Stored in actor's personal storage
{
  queue: [
    { id: "podcast-1", type: "daily", bills: [...] },
    { id: "podcast-2", type: "weekly", bills: [...] }
  ],

  status: {
    "podcast-1": { status: "processing", startedAt: 1730... },
    "podcast-2": { status: "queued", queuePosition: 2 }
  },

  history: [
    { podcastId: "podcast-0", status: "completed", audioUrl: "...", completedAt: 1730... },
    // ... last 10 podcasts
  ]
}
```

**Key Point:** This data **persists** even if the server restarts. The actor "remembers" everything.

---

## How to Test the Actor

### **Test 1: Local Testing (Without Raindrop Deployed)**

The API routes I created have **mock responses** built in:

```bash
# Start dev server
npm run dev

# Test queueing a podcast
curl -X POST http://localhost:3000/api/podcasts/queue \
  -H "Content-Type: application/json" \
  -d '{"type":"daily","bills":["119-hr-1234"]}'

# Expected response:
{
  "success": true,
  "queued": true,
  "podcastId": "podcast-mock-1730...",
  "queuePosition": 1,
  "estimatedTime": {
    "seconds": 45,
    "humanReadable": "~1 minute"
  },
  "message": "Generating your podcast now..."
}
```

**Or use the demo component:**

```bash
# Visit in browser
http://localhost:3000/test-podcast-queue

# (Need to create this test page - see below)
```

---

### **Test 2: Visual Test with Demo Component**

Create a test page:

```typescript
// app/test-podcast-queue/page.tsx
import { PodcastQueueDemo } from '@/components/podcast-queue-demo';

export default function TestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Podcast Actor Test</h1>
      <PodcastQueueDemo bills={['119-hr-1234', '119-s-567']} />
    </div>
  );
}
```

**Then visit:** `http://localhost:3000/test-podcast-queue`

**What you'll see:**
1. "Generate Podcast" button
2. Click it → Instant feedback "Queued! Position #1"
3. Status updates every 5 seconds (mock data)
4. "Your podcast is ready!" after simulation

---

### **Test 3: Full Integration Test (After Raindrop Deployment)**

Once you deploy to Raindrop, uncomment the actual actor code in the API routes.

**Test the full flow:**

```bash
# 1. Queue a podcast
curl -X POST https://your-app.raindrop.app/api/podcasts/queue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"daily","bills":["119-hr-1234","119-s-567"]}'

# Response:
{
  "podcastId": "podcast-1730736000000-abc123",
  "queuePosition": 1,
  "estimatedTime": { "seconds": 45, "humanReadable": "~1 minute" }
}

# 2. Check status (poll this every 5 seconds)
curl https://your-app.raindrop.app/api/podcasts/status/podcast-1730736000000-abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response (queued):
{
  "podcastId": "podcast-...",
  "status": "queued",
  "queuePosition": 1
}

# Response (processing):
{
  "status": "processing",
  "startedAt": 1730736005000
}

# Response (completed):
{
  "status": "completed",
  "audioUrl": "https://cdn.vultr.com/podcasts/user-123/podcast-....mp3",
  "duration": 323,
  "completedAt": 1730736050000
}

# 3. Get your queue
curl https://your-app.raindrop.app/api/podcasts/queue \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "queue": [
    { "id": "podcast-2", "status": "queued", "queuePosition": 1 }
  ],
  "stats": {
    "queueLength": 1,
    "totalGenerated": 5,
    "successRate": 100
  }
}

# 4. Get your history
curl https://your-app.raindrop.app/api/podcasts/history \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "history": [
    {
      "podcastId": "podcast-1",
      "status": "completed",
      "audioUrl": "...",
      "duration": 323,
      "completedAt": 1730736050000
    },
    // ... last 10
  ],
  "latest": { /* most recent completed podcast */ }
}

# 5. Cancel a queued podcast
curl -X DELETE https://your-app.raindrop.app/api/podcasts/status/podcast-2 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "cancelled": true,
  "message": "Podcast cancelled successfully"
}
```

---

## Testing Scenarios

### **Scenario 1: Happy Path**
1. User queues podcast → Position #1
2. Observer processes it → Status updates to "processing"
3. Generation succeeds → Status updates to "completed"
4. User gets notification → Clicks "Listen Now"

**Expected:** Smooth, non-blocking experience

---

### **Scenario 2: Multiple Users Queuing**
1. User A queues → Position #1
2. User B queues → Position #1 (their own actor!)
3. User C queues → Position #1 (their own actor!)

**Expected:** Each user has their own isolated queue

---

### **Scenario 3: Error Handling**
1. User queues podcast
2. ElevenLabs API fails (network error)
3. Observer retries with exponential backoff (1min, 2min, 4min)
4. After 3 retries, marks as "failed"
5. User sees "Generation failed - Please try again"

**Expected:** Graceful error handling, no infinite loops

---

### **Scenario 4: User Cancels**
1. User queues podcast → Position #3
2. User changes mind → Clicks "Cancel"
3. Actor removes from queue
4. Status updates to "failed" with error: "Cancelled by user"

**Expected:** Clean cancellation

---

### **Scenario 5: Queue Build-up**
1. Multiple users queue podcasts during peak hour
2. Queue grows: User D is position #10
3. Each podcast takes ~45 seconds
4. User D's estimated time: ~7.5 minutes

**Expected:** Accurate queue position and time estimates

---

## Monitoring the Actor in Production

### **Actor Logs**
```bash
# Watch actor logs
raindrop logs --follow --actor podcast-generator

# Output:
[PodcastGenerator] Queued podcast podcast-123 at position 1 for user user-456
[PodcastGenerator] Updated podcast podcast-123 to status: processing
[PodcastGenerator] Updated podcast podcast-123 to status: completed
```

### **Observer Logs**
```bash
# Watch observer logs
raindrop logs --follow --observer podcast-queue-handler

# Output:
[PodcastQueueHandler] Processing job podcast-123 for user user-456
[PodcastQueueHandler] Fetching 2 bills
[PodcastQueueHandler] Generating dialogue for podcast-123
[PodcastQueueHandler] Generating audio for podcast-123
[PodcastQueueHandler] Uploading audio for podcast-123
[PodcastQueueHandler] ✅ Completed podcast podcast-123 in 45234ms
```

---

## Actor Performance Metrics

### **Key Metrics to Track:**
```
- Queue depth per user
- Average processing time
- Success rate
- Error rate
- Retry rate
- Time in queue (p50, p95, p99)
```

### **Dashboard Queries:**
```typescript
// Get all actors' stats
const userIds = ['user-1', 'user-2', ...];
const stats = await Promise.all(
  userIds.map(async (userId) => {
    const actor = env.PODCAST_GENERATOR.idFromName(userId);
    return await actor.getStats();
  })
);

// Aggregate
const totalQueued = stats.reduce((sum, s) => sum + s.queueLength, 0);
const avgSuccessRate = stats.reduce((sum, s) => sum + s.successRate, 0) / stats.length;
```

---

## Troubleshooting

### **Issue:** Status not updating
**Check:** Is the observer running?
```bash
raindrop logs --observer podcast-queue-handler --tail 100
```

### **Issue:** Queue position not decreasing
**Check:** Are jobs being processed?
```bash
# Check queue depth
raindrop queue list podcast-generation-queue
```

### **Issue:** Audio not uploaded
**Check:** Vultr credentials
```bash
# Test Vultr connection
curl https://your-endpoint.vultr.com/ \
  -H "Authorization: Bearer YOUR_KEY"
```

---

## Next Steps After Testing

1. **Deploy to Raindrop:**
   ```bash
   raindrop build deploy
   ```

2. **Uncomment actual actor code** in API routes

3. **Add monitoring dashboards**

4. **Set up alerts** for queue depth, error rates

5. **Optimize** based on real user data

---

## Summary: What Makes This Powerful

✅ **Non-blocking UX** - Users don't wait
✅ **Persistent state** - Survives restarts
✅ **Isolated per user** - Each user has their own actor
✅ **Automatic retries** - Built-in error handling
✅ **Queue visibility** - Users know their position
✅ **Scalable** - Raindrop handles infrastructure
✅ **Type-safe** - Full TypeScript support

**The actor pattern transforms HakiVo from a request-response app into a proactive, intelligent platform! 🚀**
