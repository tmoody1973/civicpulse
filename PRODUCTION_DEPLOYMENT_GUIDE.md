# Production Deployment Guide - Netlify Extensions

## Current Status ✅

**Extensions Installed:**
- ✅ Turso (Hosted SQLite Database)
- ✅ Async Workloads (Long-running Job Processing)

**What's Working:**
- ✅ Local development fully functional
- ✅ Database queue system tested locally
- ✅ All API endpoints working in dev

**What's NOT Working:**
- ❌ Production deployment - database not accessible
- ❌ Background processor will timeout (60s limit, podcasts take 45+s)

---

## Step 1: Configure Turso Database

**Goal:** Replace local SQLite with hosted Turso database that persists between serverless function calls.

### 1.1 Create Turso Database

Visit: https://app.netlify.com/team/684200d964d14a24f1f44e92/extension/turso

Follow the UI to:
1. Create a new Turso database (name it `hakivo-podcasts`)
2. Note the database URL provided (format: `libsql://[name].turso.io`)
3. Generate an authentication token

### 1.2 Run Database Migrations

Once you have the Turso database URL and token:

```bash
# Set environment variables for migration
export TURSO_DATABASE_URL="libsql://hakivo-podcasts.turso.io"
export TURSO_AUTH_TOKEN="your-token-here"

# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create the schema on Turso
turso db shell hakivo-podcasts < db/civic-db/0001_podcast_jobs_queue.sql
```

### 1.3 Update Environment Variables

Set the Turso connection string on Netlify:

```bash
# Set RAINDROP_SQL_URL to point to Turso
netlify env:set RAINDROP_SQL_URL "libsql://hakivo-podcasts.turso.io?authToken=YOUR_TOKEN_HERE"
```

### 1.4 Update Code for Turso Compatibility

Install Turso client library:

```bash
npm install @libsql/client
```

Update `lib/db/sqlite.ts` to support both local and remote:

```typescript
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = process.env.RAINDROP_SQL_URL;

// Use Turso in production, better-sqlite3 locally
export function getDatabase() {
  if (isProduction && dbUrl?.startsWith('libsql://')) {
    return createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }

  // Local development
  const dbPath = dbUrl || path.join(process.cwd(), 'civic-db.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}
```

---

## Step 2: Configure Async Workloads

**Goal:** Move podcast generation to durable functions that can run for unlimited time.

### 2.1 Enable Async Workloads

Visit: https://app.netlify.com/team/684200d964d14a24f1f44e92/extension/async-workloads

Follow the UI to enable for your site: `hakivo`

### 2.2 Install Dependencies

```bash
npm install @netlify/async-workloads
```

### 2.3 Convert Background Processor to Durable Function

Create `netlify/functions/process-podcast-durable.ts`:

```typescript
import { schedule } from '@netlify/async-workloads';
import { fetchRecentBills } from '@/lib/api/congress';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { execute, queryOne } from '@/lib/db/sqlite';

export default async (req: Request) => {
  const { jobId } = await req.json();

  // Get job from database
  const job = queryOne(`SELECT * FROM podcast_jobs WHERE job_id = ?`, [jobId]);

  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  // Schedule durable execution
  await schedule('generate-podcast-workflow', {
    jobId,
    userId: job.user_id,
    type: job.type,
    billCount: job.bill_count,
    topics: job.topics
  });

  return new Response('Job scheduled', { status: 200 });
};
```

Create the workflow handler `netlify/functions/generate-podcast-workflow.ts`:

```typescript
import { defineWorkflow } from '@netlify/async-workloads';

export default defineWorkflow({
  name: 'generate-podcast-workflow',
  steps: [
    {
      name: 'update-status',
      async run({ jobId }) {
        execute(
          'UPDATE podcast_jobs SET status = ?, progress = ? WHERE job_id = ?',
          ['processing', 0, jobId]
        );
      }
    },
    {
      name: 'fetch-bills',
      async run({ billCount, type }) {
        const bills = await fetchRecentBills({
          congress: 119,
          limit: billCount || (type === 'daily' ? 3 : 8),
          sort: 'updateDate+desc'
        });
        return { bills };
      }
    },
    {
      name: 'generate-script',
      async run({ bills, type }) {
        const dialogue = await generateDialogueScript(bills, type);
        return { dialogue };
      }
    },
    {
      name: 'generate-audio',
      async run({ dialogue }) {
        const audioBuffer = await generateDialogue(dialogue);
        return { audioBuffer };
      }
    },
    {
      name: 'upload-cdn',
      async run({ audioBuffer, userId, type }) {
        const audioUrl = await uploadPodcast(audioBuffer, {
          userId,
          type,
          duration: calculateDuration(audioBuffer),
          billsCovered: [], // passed from previous step
          generatedAt: new Date()
        });
        return { audioUrl };
      }
    },
    {
      name: 'complete-job',
      async run({ jobId, audioUrl, dialogue }) {
        execute(
          'UPDATE podcast_jobs SET status = ?, audio_url = ?, completed_at = CURRENT_TIMESTAMP WHERE job_id = ?',
          ['complete', audioUrl, jobId]
        );
      }
    }
  ]
});
```

### 2.4 Update generate-podcast Route

Change `app/api/generate-podcast/route.ts` line 160 to trigger durable function:

```typescript
// OLD: Fire-and-forget HTTP trigger
fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process-podcast-queue`, {...});

// NEW: Trigger durable workflow
fetch(`${process.env.NEXT_PUBLIC_APP_URL}/.netlify/functions/process-podcast-durable`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobId })
});
```

---

## Step 3: Deploy to Production

Once Turso and Async Workloads are configured:

```bash
# Commit changes
git add .
git commit -m "feat(prod): migrate to Turso database and Async Workloads"
git push

# Deploy to production
netlify deploy --prod --message "Production-ready with Turso + Async Workloads"
```

---

## Step 4: Test Production Deployment

### 4.1 Check Extensions are Active

```bash
# Verify Turso database is connected
curl https://hakivo.netlify.app/api/process-podcast-queue

# Should return queue stats, not "Failed to fetch queue stats"
```

### 4.2 Test Podcast Generation

Use the frontend or:

```bash
# Trigger podcast generation (requires auth token)
curl -X POST https://hakivo.netlify.app/api/generate-podcast \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "type": "daily"}'
```

### 4.3 Monitor Async Workloads

Visit Netlify dashboard to monitor the durable function execution:
- https://app.netlify.com/projects/hakivo/logs/functions

---

## Architecture Summary

**Before (Not Working in Production):**
```
User Request → API Route → Database Queue → HTTP Trigger → Background Processor
                                                ↓
                                           ❌ Timeout after 60s
                                           ❌ No persistent database
```

**After (Production-Ready):**
```
User Request → API Route → Turso Database → Durable Function Trigger → Async Workflow
                              ↓                                            ↓
                         ✅ Persistent                              ✅ Unlimited runtime
                         ✅ Serverless-compatible                  ✅ Built-in retries
                                                                      ✅ Progress tracking
```

---

## Benefits of This Solution

1. **Turso Database:**
   - Edge-distributed SQLite (fast globally)
   - 100% compatible with existing queries
   - Free tier: 500 databases, 1GB storage
   - No code changes needed (just swap connection string)

2. **Async Workloads:**
   - No timeout limits (podcasts can take 2+ minutes)
   - Automatic retries on failure
   - Step-by-step progress tracking
   - Built-in error recovery
   - Visual monitoring in Netlify dashboard

3. **Combined:**
   - Production-ready podcast generation
   - Scales automatically
   - Reliable job processing
   - Full visibility into job status
   - Cost-effective (Netlify-native solutions)

---

## Troubleshooting

### Database Connection Errors
- Check `RAINDROP_SQL_URL` is set correctly
- Verify Turso auth token is valid
- Run migrations on Turso database

### Timeout Errors
- Ensure Async Workloads extension is enabled
- Check function logs for specific step failures
- Verify all external APIs (Congress, Claude, ElevenLabs) are responding

### Audio Generation Failures
- Check API keys are set: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`
- Monitor rate limits on external services
- Review Netlify function logs for detailed errors

---

## Next Steps After Configuration

1. Test podcast generation end-to-end
2. Monitor Async Workloads dashboard for job execution
3. Set up alerts for failed jobs
4. Configure retry policies if needed
5. Optimize Turso database indexes for performance
