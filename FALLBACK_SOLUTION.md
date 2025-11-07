# Netlify Functions + Database Queue Fallback Solution

**Status:** Implementation guide for fallback after Raindrop Service binding bug
**Date:** November 7, 2025

## Architecture Overview

```
User → Next.js → Netlify Function → SmartSQL (podcast_jobs table)
                                        ↓
                            Netlify Background Function (polling)
                                        ↓
                            Process job & update status
                                        ↓
User ← Poll status endpoint ← Read from SmartSQL
```

---

## Changes Required

### 1. Database Schema (✅ DONE)

File: `db/civic-db/0001_podcast_jobs_queue.sql`

```sql
CREATE TABLE IF NOT EXISTS podcast_jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  bill_count INTEGER,
  topics TEXT, -- JSON
  audio_url TEXT,
  duration INTEGER,
  bills_covered TEXT, -- JSON
  transcript TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);
```

### 2. Generate Podcast Route (TO UPDATE)

File: `app/api/generate-podcast/route.ts`

**Replace lines 119-155** (Raindrop queue submission) with:

```typescript
// Insert job into database queue
const db = await getDatabase(); // Helper function to connect

const stmt = db.prepare(`
  INSERT INTO podcast_jobs (
    job_id, user_id, type, status, progress, message,
    bill_count, topics, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

stmt.run(
  jobId,
  user.id,
  type,
  'queued',
  0,
  'Job queued for processing...',
  type === 'daily' ? 3 : 8,
  JSON.stringify(profile.topics || [])
);

db.close();

console.log(`✅ Job ${jobId} inserted into database queue`);

// Trigger background processor (fire-and-forget)
fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process-podcast-queue`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-internal-key': process.env.INTERNAL_API_KEY || 'dev-key'
  },
}).catch(err => console.error('Processor trigger failed:', err));
```

### 3. Audio Status Route (TO UPDATE)

File: `app/api/audio-status/[jobId]/route.ts`

**Replace lines 66-122** (Raindrop actor query) with:

```typescript
console.log(`📊 Checking status for job: ${jobId}`);

// Verify job belongs to user
const jobUserId = jobId.split('-')[0];
if (jobUserId !== user.id) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 403 }
  );
}

// Query job status from database
const db = await getDatabase();

const job = db.prepare(`
  SELECT * FROM podcast_jobs WHERE job_id = ?
`).get(jobId);

db.close();

if (!job) {
  return NextResponse.json(
    { error: 'Job not found' },
    { status: 404 }
  );
}

return NextResponse.json({
  success: true,
  jobId: job.job_id,
  status: job.status,
  progress: job.progress,
  message: job.message,
  audioUrl: job.audio_url,
  duration: job.duration,
  billsCovered: job.bills_covered ? JSON.parse(job.bills_covered) : null,
  error: job.error_message,
  createdAt: job.created_at,
  completedAt: job.completed_at,
});
```

### 4. Background Job Processor (NEW FILE)

File: `app/api/process-podcast-queue/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';

export async function POST(request: Request) {
  // Verify internal call
  const internalKey = request.headers.get('x-internal-key');
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDatabase();

  try {
    // Get next queued job (FIFO with retry logic)
    const job = db.prepare(`
      SELECT * FROM podcast_jobs
      WHERE status = 'queued'
        AND (retry_count < max_retries OR retry_count IS NULL)
      ORDER BY created_at ASC
      LIMIT 1
    `).get();

    if (!job) {
      return NextResponse.json({ message: 'No jobs to process' });
    }

    console.log(`[Processor] Starting job ${job.job_id}`);

    // Update status to processing
    db.prepare(`
      UPDATE podcast_jobs
      SET status = 'processing',
          started_at = CURRENT_TIMESTAMP,
          progress = 0,
          message = 'Starting podcast generation...'
      WHERE job_id = ?
    `).run(job.job_id);

    try {
      // 1. Fetch bills (20%)
      updateProgress(db, job.job_id, 20, 'Fetching bills...');
      const bills = await fetchBills(job.type, job.bill_count);

      // 2. Generate script (40%)
      updateProgress(db, job.job_id, 40, 'Generating script...');
      const dialogue = await generateDialogueScript(bills, job.type);

      // 3. Generate audio (60%)
      updateProgress(db, job.job_id, 60, 'Creating audio (1-2 minutes)...');
      const audioBuffer = await generateDialogue(dialogue);

      // 4. Upload (80%)
      updateProgress(db, job.job_id, 80, 'Uploading...');
      const audioUrl = await uploadPodcast(audioBuffer, job.user_id, job.type);

      // 5. Save metadata (90%)
      updateProgress(db, job.job_id, 90, 'Saving metadata...');
      const transcript = dialogue.map(d => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');

      // 6. Complete (100%)
      db.prepare(`
        UPDATE podcast_jobs
        SET status = 'complete',
            progress = 100,
            message = 'Podcast ready!',
            audio_url = ?,
            duration = ?,
            bills_covered = ?,
            transcript = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE job_id = ?
      `).run(
        audioUrl,
        calculateDuration(audioBuffer),
        JSON.stringify(bills.map(b => b.id)),
        transcript,
        job.job_id
      );

      console.log(`[Processor] Job ${job.job_id} completed successfully`);

      return NextResponse.json({
        success: true,
        jobId: job.job_id,
        audioUrl,
      });

    } catch (error: any) {
      console.error(`[Processor] Job ${job.job_id} failed:`, error);

      // Update job as failed
      db.prepare(`
        UPDATE podcast_jobs
        SET status = 'failed',
            error_message = ?,
            retry_count = retry_count + 1,
            last_retry_at = CURRENT_TIMESTAMP
        WHERE job_id = ?
      `).run(error.message, job.job_id);

      // If retries left, requeue
      if (job.retry_count + 1 < job.max_retries) {
        db.prepare(`
          UPDATE podcast_jobs
          SET status = 'queued',
              message = 'Retrying...'
          WHERE job_id = ?
        `).run(job.job_id);
      }

      return NextResponse.json({
        error: 'Job processing failed',
        details: error.message
      }, { status: 500 });
    }

  } finally {
    db.close();
  }
}

// Helper function
function updateProgress(db: any, jobId: string, progress: number, message: string) {
  db.prepare(`
    UPDATE podcast_jobs
    SET progress = ?, message = ?
    WHERE job_id = ?
  `).run(progress, message, jobId);
}
```

### 5. Database Helper (NEW FILE)

File: `lib/db/sqlite.ts`

```typescript
import Database from 'better-sqlite3';

export async function getDatabase() {
  const dbPath = process.env.RAINDROP_SQL_URL || './civic-db.sqlite';
  return new Database(dbPath);
}
```

### 6. Netlify Background Function (OPTIONAL - For scheduled processing)

File: `netlify/functions/scheduled-podcast-processor.ts`

```typescript
import { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  // Trigger processor every 30 seconds
  const response = await fetch(`${process.env.URL}/api/process-podcast-queue`, {
    method: 'POST',
    headers: {
      'x-internal-key': process.env.INTERNAL_API_KEY!,
    },
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Processor triggered' }),
  };
};
```

---

## Environment Variables

Add to `.env.local` and Netlify:

```bash
# Internal API security
INTERNAL_API_KEY=your-secure-random-key-here

# Database (already exists)
RAINDROP_SQL_URL=path-to-database.sqlite
```

---

## Deployment Steps

1. **Apply database migration:**
   ```bash
   sqlite3 civic-db.sqlite < db/civic-db/0001_podcast_jobs_queue.sql
   ```

2. **Update API routes:**
   - `app/api/generate-podcast/route.ts` (database insertion)
   - `app/api/audio-status/[jobId]/route.ts` (database query)

3. **Create new files:**
   - `app/api/process-podcast-queue/route.ts` (processor)
   - `lib/db/sqlite.ts` (helper)

4. **Install dependencies:**
   ```bash
   npm install better-sqlite3
   npm install -D @types/better-sqlite3
   ```

5. **Set environment variables on Netlify:**
   ```bash
   netlify env:set INTERNAL_API_KEY "your-secure-key"
   ```

6. **Deploy:**
   ```bash
   git add .
   git commit -m "Implement database queue fallback"
   netlify deploy --prod
   ```

---

## Testing

```bash
# 1. Submit job
curl -X POST http://localhost:3000/api/generate-podcast \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-token" \
  -d '{"type": "daily"}'

# Response: { "success": true, "jobId": "user-daily-timestamp" }

# 2. Check status
curl http://localhost:3000/api/audio-status/user-daily-timestamp \
  -H "Cookie: session=your-session-token"

# Response: { "status": "processing", "progress": 60, "message": "Creating audio..." }

# 3. Trigger processor manually (for testing)
curl -X POST http://localhost:3000/api/process-podcast-queue \
  -H "x-internal-key: your-key"
```

---

## Advantages vs Raindrop Queue

✅ **Works reliably** - No binding bugs
✅ **Full control** - Direct database access
✅ **Transparent** - Can query job state directly
✅ **Simple** - Standard SQL patterns

## Disadvantages

❌ **Manual retry logic** - No automatic retries (we implement them)
❌ **Polling overhead** - Requires background function
❌ **No automatic scaling** - Single processor at a time
❌ **More code** - More boilerplate than queue abstraction

---

## Future: Report Bug to Raindrop

Once this fallback is working, create a GitHub issue:

**Title:** Service class breaks `this` binding for Actor and Queue APIs

**Body:**
```markdown
## Bug Report

**Raindrop Version:** [latest]
**Environment:** Cloudflare Workers (via Raindrop Service)

**Description:**
When accessing Cloudflare Workers bindings (Queues, Actors) from a Raindrop `Service` class via `this.env`, all method calls fail with "Illegal invocation: function called with incorrect `this` reference".

**Reproduction:**
[Link to RAINDROP_IMPLEMENTATION_SUMMARY.md section]

**Expected:**
Bindings should maintain correct `this` context.

**Actual:**
All binding methods throw "Illegal invocation".

**Workaround:**
Using database queue instead of Raindrop Queue API.
```

---

**This fallback gets us functional while Raindrop team fixes the binding issue.**
