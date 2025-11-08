# Daily Audio Brief - Production Implementation Plan

**Created:** November 8, 2025
**Status:** Planning
**Priority:** High

---

## 🎯 What We're Building (Plain English)

We're creating an automated daily audio briefing system that:

1. **Generates briefs automatically** - Every night at midnight, the system creates personalized audio briefs for all users
2. **Delivers fresh content at 6am** - Users wake up to a ready-to-listen brief covering news and bills relevant to their interests
3. **Welcomes new users** - When someone completes signup, they immediately get their first brief generated
4. **Displays prominently** - The today's brief appears as a featured card on the dashboard, right under the representatives section
5. **Provides full access** - Users can read the full written version and browse all their previous briefs
6. **Works on Netlify** - Everything runs reliably in production using Netlify's infrastructure

---

## 📊 Current State

### ✅ What's Already Working

- **Brief Generation Logic** (`app/api/briefs/generate-daily/route.ts`)
  - Fetches personalized news via Brave Search API
  - Queries relevant bills from Congress.gov
  - Generates natural dialogue with Claude AI
  - Creates audio with ElevenLabs text-to-dialogue
  - Uploads to Vultr CDN
  - Saves to SQLite database

- **BullMQ Queue System** (`lib/queue/brief-queue.ts`)
  - Redis connection via Railway (Upstash alternative)
  - Job queue for background processing
  - Retry logic for failed jobs
  - Progress tracking (0% → 100%)

- **Background Worker** (`workers/brief-worker.ts`)
  - Picks up jobs from queue
  - Processes brief generation
  - Updates database with results
  - Handles errors and retries

- **UI Components**
  - `BriefCard` component (displays individual brief)
  - Audio player context (global playback control)
  - Previous briefs viewing (planned in `/briefs` page)

- **Database**
  - `briefs` table with all necessary columns
  - `users` table with onboarding tracking
  - User preferences stored in `interests` column

### ❌ What's Missing

1. **Scheduled Generation** - No nightly job to auto-generate briefs at midnight
2. **Onboarding Trigger** - First brief not auto-created after signup
3. **Dashboard Integration** - Brief card not shown under representatives
4. **Netlify Deployment** - Workers not configured for Netlify environment
5. **6am Delivery Logic** - No timezone-aware scheduling
6. **Previous Briefs Page** - No `/briefs` route to view history

---

## 📋 Requirements (From User)

1. ✅ **User-friendly for all users** - Simple, clean interface
2. ✅ **Works on Netlify** - Must deploy and run on Netlify infrastructure
3. ⚠️ **BullMQ workers confirmed** - Need to verify workers run reliably on Netlify
4. ❌ **Overnight generation** - Generate briefs at midnight (or user's local midnight)
5. ❌ **Fresh at 6am** - Users have content ready when they wake up
6. ✅ **Image and headline** - Like existing brief cards (already implemented)
7. ❌ **First brief after onboarding** - Auto-generated when user completes signup
8. ❌ **Daily delivery at 6am** - Consistent daily schedule for all users
9. ❌ **Appears under representatives** - Full width layout on dashboard
10. ✅ **Links to full digest** - Read expanded written version (already implemented)
11. ❌ **View previous briefs** - Button to see history (need `/briefs` page)

---

## 🏗️ Architecture Overview

### How It Works (End to End)

```
┌──────────────────────────────────────────────────────────────────┐
│                    MIDNIGHT (Cron Job)                           │
│  Netlify Scheduled Function runs every night at 12:00am UTC      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│               Fetch All Active Users                              │
│  Query SQLite: SELECT id, email FROM users WHERE active = 1      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│        Queue Brief Generation Jobs (BullMQ)                      │
│  For each user: briefQueue.add({ userId, userEmail })            │
│  Jobs added to Redis queue hosted on Railway                     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│           Background Worker Processes Jobs                        │
│  Worker running on Railway/Render picks up jobs                  │
│  Generates brief (5-10 minutes per user)                         │
│  Saves audio URL and transcript to database                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                6am - Users Wake Up                                │
│  User opens dashboard                                             │
│  Featured brief card displays (generated hours ago)               │
│  Click "Listen Now" → Audio plays immediately                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 BullMQ Workers on Netlify

### Problem: Netlify Doesn't Support Long-Running Workers

**Netlify Functions have limits:**
- Maximum execution time: 10 seconds (free tier)
- Maximum execution time: 26 seconds (Pro tier)
- Not designed for long-running background jobs
- Brief generation takes 5-10 minutes per user

### Solution: Hybrid Architecture

We'll use **Netlify for the frontend and API** but **Railway/Render for workers**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETLIFY (Frontend + API)                     │
│  - Next.js application                                          │
│  - API routes (add jobs to queue)                              │
│  - Scheduled function (trigger nightly generation)              │
│  - Static pages and assets                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (Redis Queue on Railway)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               RAILWAY/RENDER (Background Workers)                │
│  - BullMQ worker process                                        │
│  - Long-running job processor                                   │
│  - No timeout limits                                            │
│  - Auto-restart on crash                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Netlify** handles all user-facing features (fast, cached, globally distributed)
2. **Railway/Render** handles heavy background processing (no timeouts, persistent)
3. **Redis Queue** connects them (shared job queue, both can access)
4. **SQLite Database** stores results (both read/write to same database)

### Confirming BullMQ Workers Are Working

**Test Plan:**

1. **Local Testing** (Already Works)
   ```bash
   # Terminal 1: Start worker
   npm run worker

   # Terminal 2: Queue a job
   curl -X POST http://localhost:3000/api/briefs/generate-daily \
     -H "Content-Type: application/json"

   # Watch Terminal 1 for processing output
   ```

2. **Railway/Render Testing** (Need to Setup)
   ```bash
   # Deploy worker to Railway
   railway up

   # Test from Netlify production
   curl -X POST https://hakivo.netlify.app/api/briefs/generate-daily

   # Check Railway logs
   railway logs
   ```

3. **Monitoring Dashboard**
   - Access BullBoard at `/admin/bull-board`
   - See all jobs: waiting, active, completed, failed
   - Monitor progress in real-time

---

## ⏰ Scheduling: Overnight Generation for 6am Delivery

### Strategy: Generate at Midnight, Ready by 6am

**Why Midnight?**
- Gives 5-6 hours buffer for processing
- Off-peak time (lower API costs)
- Handles failures gracefully (retry before morning)
- Supports multiple timezones

**Implementation Options:**

### Option 1: Netlify Scheduled Functions (RECOMMENDED)

Netlify supports cron jobs via Scheduled Functions:

```typescript
// netlify/functions/scheduled-brief-generation.ts
import { schedule } from '@netlify/functions';
import { briefQueue } from '../../lib/queue/brief-queue';
import { executeQuery } from '../../lib/db/client';

export const handler = schedule('0 0 * * *', async () => {
  console.log('🌙 Starting nightly brief generation...');

  // Get all active users
  const result = await executeQuery(
    `SELECT id, email FROM users WHERE active = 1`,
    'users'
  );

  const users = result.rows;
  console.log(`📋 Found ${users.length} active users`);

  // Queue a job for each user
  for (const user of users) {
    try {
      await briefQueue.add('generate-brief', {
        userId: user.id,
        userEmail: user.email,
        forceRegenerate: false,
      });
      console.log(`✅ Queued brief for ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to queue for ${user.email}:`, error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      queued: users.length,
    }),
  };
});
```

**Cron Schedule:**
- `'0 0 * * *'` = Every day at midnight UTC
- `'0 6 * * *'` = Every day at 6am UTC
- `'0 */6 * * *'` = Every 6 hours

**Netlify Configuration:**

Add to `netlify.toml`:
```toml
[functions."scheduled-brief-generation"]
  schedule = "@daily"
```

### Option 2: Railway Cron Jobs

If using Railway for workers, we can also schedule there:

```typescript
// workers/scheduler.ts
import cron from 'node-cron';
import { briefQueue } from '../lib/queue/brief-queue';
import { executeQuery } from '../lib/db/client';

// Run every day at midnight UTC
cron.schedule('0 0 * * *', async () => {
  console.log('🌙 Running nightly brief generation...');

  // Same logic as Netlify function
  const result = await executeQuery(
    `SELECT id, email FROM users WHERE active = 1`,
    'users'
  );

  for (const user of result.rows) {
    await briefQueue.add('generate-brief', {
      userId: user.id,
      userEmail: user.email,
    });
  }
});

console.log('⏰ Scheduler started - running at midnight daily');
```

**Railway Configuration:**
```
# Procfile
worker: npm run worker
scheduler: npm run scheduler
```

### Timezone Considerations

**Problem:** Users in California want 6am PST, not 6am UTC

**Solution 1: Generate for Everyone at Midnight UTC**
- Simple, no timezone logic
- Some users get brief at 4pm (PST), some at 7pm (EST)
- Still usable next morning

**Solution 2: Store User Timezone, Generate Per-User**
- Add `timezone` column to users table
- Schedule jobs based on user's local midnight
- More complex, better UX

**Recommendation:** Start with Solution 1 (simpler), add Solution 2 later

---

## 🎉 Onboarding Integration: First Brief After Signup

### Current Onboarding Flow

```typescript
// app/api/auth/callback/route.ts (OAuth callback)
User signs up → WorkOS auth → Create user in database → Redirect to onboarding
```

### Enhanced Flow with Brief Generation

```typescript
// app/api/onboarding/complete/route.ts

export async function POST(request: Request) {
  const { userId, interests, state, district } = await request.json();

  // 1. Save user preferences
  await executeQuery(
    `UPDATE users SET
      interests = '${JSON.stringify(interests)}',
      state = '${state}',
      district = ${district},
      onboarding_completed = 1,
      onboarding_completed_at = CURRENT_TIMESTAMP
    WHERE id = '${userId}'`,
    'users'
  );

  // 2. Queue first brief generation
  console.log('🎉 Onboarding complete! Generating first brief...');

  const jobId = await briefQueue.add('generate-brief', {
    userId,
    userEmail: user.email,
    forceRegenerate: false,
  });

  // 3. Return job ID so frontend can show progress
  return Response.json({
    success: true,
    message: 'Preferences saved! Generating your first brief...',
    briefJobId: jobId,
  });
}
```

### Onboarding UI Flow

```typescript
// app/onboarding/complete/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingCompletePage() {
  const [status, setStatus] = useState<'generating' | 'complete'>('generating');
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Poll for job status
    const pollInterval = setInterval(async () => {
      const res = await fetch('/api/briefs/status?jobId=' + jobId);
      const data = await res.json();

      setProgress(data.progress);

      if (data.status === 'completed') {
        setStatus('complete');
        clearInterval(pollInterval);

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {status === 'generating' ? (
        <>
          <h1 className="text-3xl font-bold mb-4">
            Welcome to Civic Pulse! 🎉
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            We're generating your first daily brief...
          </p>

          <div className="w-full max-w-md">
            <div className="bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-center mt-2">{progress}%</p>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            This usually takes 5-10 minutes. We'll redirect you when it's ready.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4">
            Your brief is ready! ✨
          </h1>
          <p className="text-lg text-muted-foreground">
            Redirecting to your dashboard...
          </p>
        </>
      )}
    </div>
  );
}
```

---

## 🎨 Dashboard UI: Full Width Brief Card Under Representatives

### Current Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (navigation)                                            │
├─────────────────────────────────────────────────────────────────┤
│  Welcome back, [User Name]                                      │
├─────────────────────────────────────────────────────────────────┤
│  Representatives Section                                         │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ Senator  │  │ Senator  │                                    │
│  │   Card   │  │   Card   │                                    │
│  └──────────┘  └──────────┘                                    │
│  ┌──────────┐                                                   │
│  │   Rep    │                                                   │
│  │  Card    │                                                   │
│  └──────────┘                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [OTHER WIDGETS...]                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Enhanced Layout with Featured Brief

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (navigation)                                            │
├─────────────────────────────────────────────────────────────────┤
│  Welcome back, [User Name]                                      │
├─────────────────────────────────────────────────────────────────┤
│  Representatives Section                                         │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ Senator  │  │ Senator  │                                    │
│  │   Card   │  │   Card   │                                    │
│  └──────────┘  └──────────┘                                    │
│  ┌──────────┐                                                   │
│  │   Rep    │                                                   │
│  │  Card    │                                                   │
│  └──────────┘                                                   │
├─────────────────────────────────────────────────────────────────┤
│  🎙️ Today's Daily Brief                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ┌────────────┐                                            │ │
│  │ │            │  Like so many other aspects of this        │ │
│  │ │   Image    │  economy, consumer sentiment is now        │ │
│  │ │  (featured)│  K-shaped                                  │ │
│  │ │            │                                            │ │
│  │ │            │  Economy | by Carla Javier                 │ │
│  │ └────────────┘                                            │ │
│  │                The top third of stock owners are more     │ │
│  │                optimistic. Everyone else is a lot more    │ │
│  │                pessimistic.                                │ │
│  │                                                            │ │
│  │  [▶ Listen 2:50]  [🔖 Save]  [⬇ Download]               │ │
│  │                                                            │ │
│  │  Read Full Digest →    View Previous Briefs →            │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Personalized News Section                                      │
│  [News cards...]                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Component Implementation

**File:** `components/dashboard/featured-brief-card.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Bookmark, Download, ChevronRight } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/audio-player-context';
import Link from 'next/link';

interface FeaturedBriefCardProps {
  brief: {
    id: string;
    title: string;
    audio_url: string;
    featured_image_url: string | null;
    duration: number;
    headline: string;
    excerpt: string;
    category: string;
    author: string;
    generated_at: string;
  };
}

export function FeaturedBriefCard({ brief }: FeaturedBriefCardProps) {
  const { loadBrief } = useAudioPlayer();

  const handleListen = () => {
    loadBrief({
      id: brief.id,
      title: brief.title,
      audio_url: brief.audio_url,
      featured_image_url: brief.featured_image_url,
      duration: brief.duration,
      type: 'daily',
      generated_at: brief.generated_at,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🎙️ Today's Daily Brief
        </h2>
        <Link href="/briefs">
          <Button variant="ghost" size="sm" className="gap-1">
            View Previous Briefs
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Featured Card - Full Width */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Left: Featured Image */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {brief.featured_image_url ? (
                <img
                  src={brief.featured_image_url}
                  alt={brief.headline}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800">
                  <span className="text-white text-sm opacity-50">No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 flex flex-col">
            {/* Headline */}
            <h3 className="text-2xl font-bold mb-2 line-clamp-2">
              {brief.headline}
            </h3>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <span className="font-medium text-primary">{brief.category}</span>
              <span>•</span>
              <span>by {brief.author}</span>
            </div>

            {/* Excerpt */}
            <p className="text-muted-foreground mb-6 line-clamp-3">
              {brief.excerpt}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <Button
                onClick={handleListen}
                size="lg"
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Listen {formatDuration(brief.duration)}
              </Button>

              <Button variant="outline" size="lg" className="gap-2">
                <Bookmark className="w-4 h-4" />
                Save
              </Button>

              <Button variant="outline" size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>

            {/* Links */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <Link
                href={`/briefs/${brief.id}`}
                className="text-primary hover:underline font-medium"
              >
                Read Full Digest →
              </Link>
              <Link
                href="/briefs"
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                View Previous Briefs →
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

### Integration into Dashboard

**File:** `app/dashboard/page.tsx`

```typescript
import { FeaturedBriefCard } from '@/components/dashboard/featured-brief-card';
import { executeQuery } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getSession();

  // Fetch today's brief
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const briefResult = await executeQuery(
    `SELECT * FROM briefs
     WHERE user_id = '${user.id}'
     AND date(generated_at) = date('now')
     ORDER BY generated_at DESC
     LIMIT 1`,
    'users'
  );

  const todayBrief = briefResult.rows[0];

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">
        Welcome back, {user.name}!
      </h1>

      {/* Representatives Section */}
      <RepresentativesSection state={user.state} district={user.district} />

      {/* Featured Daily Brief - FULL WIDTH */}
      {todayBrief && (
        <FeaturedBriefCard brief={todayBrief} />
      )}

      {/* No Brief Yet - Show Generate Button */}
      {!todayBrief && (
        <div className="w-full mb-8">
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">
              Your daily brief hasn't been generated yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Daily briefs are automatically generated at midnight.
              You can also generate one now.
            </p>
            <Button onClick={() => generateBriefNow()}>
              Generate Today's Brief
            </Button>
          </Card>
        </div>
      )}

      {/* Other Dashboard Widgets */}
      <PersonalizedNewsSection />
    </div>
  );
}
```

---

## 💾 Database Schema Updates

### Existing Tables

**`users` table:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  state TEXT,
  district INTEGER,
  interests TEXT, -- JSON array of policy areas
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`briefs` table:**
```sql
CREATE TABLE briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'daily' or 'weekly'
  audio_url TEXT NOT NULL,
  duration INTEGER, -- seconds
  transcript TEXT,
  bills_covered TEXT, -- JSON array
  written_digest TEXT,
  policy_areas TEXT, -- JSON array
  featured_image_url TEXT,
  headline TEXT,
  excerpt TEXT,
  category TEXT,
  author TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### New Columns Needed

**Add to `briefs` table:**
```sql
ALTER TABLE briefs ADD COLUMN headline TEXT;
ALTER TABLE briefs ADD COLUMN excerpt TEXT;
ALTER TABLE briefs ADD COLUMN category TEXT;
ALTER TABLE briefs ADD COLUMN author TEXT DEFAULT 'Civic Pulse AI';
```

**Migration Script:**

```typescript
// scripts/migrate-briefs-add-metadata.ts

import { executeQuery } from '../lib/db/client';

async function migrateBriefsTable() {
  console.log('📝 Adding metadata columns to briefs table...');

  try {
    // Add new columns
    await executeQuery(
      `ALTER TABLE briefs ADD COLUMN IF NOT EXISTS headline TEXT`,
      'users'
    );

    await executeQuery(
      `ALTER TABLE briefs ADD COLUMN IF NOT EXISTS excerpt TEXT`,
      'users'
    );

    await executeQuery(
      `ALTER TABLE briefs ADD COLUMN IF NOT EXISTS category TEXT`,
      'users'
    );

    await executeQuery(
      `ALTER TABLE briefs ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Civic Pulse AI'`,
      'users'
    );

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateBriefsTable();
```

---

## 📝 Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] **1.1 Database Migration**
  - [ ] Add metadata columns to briefs table
  - [ ] Test migration locally
  - [ ] Run migration in production

- [ ] **1.2 BullMQ Worker Deployment**
  - [ ] Deploy worker to Railway
  - [ ] Configure Redis connection string
  - [ ] Test job processing end-to-end
  - [ ] Set up monitoring and logging

- [ ] **1.3 Scheduled Function Setup**
  - [ ] Create `netlify/functions/scheduled-brief-generation.ts`
  - [ ] Configure cron schedule in netlify.toml
  - [ ] Test with one user first
  - [ ] Monitor execution in Netlify logs

### Phase 2: Onboarding Integration (Week 1)

- [ ] **2.1 Onboarding API Enhancement**
  - [ ] Update `/api/onboarding/complete` to queue first brief
  - [ ] Return job ID to frontend
  - [ ] Test with test user account

- [ ] **2.2 Onboarding UI**
  - [ ] Create "generating your first brief" page
  - [ ] Add progress bar and status polling
  - [ ] Implement auto-redirect to dashboard
  - [ ] Test full signup flow

### Phase 3: Dashboard UI (Week 1-2)

- [ ] **3.1 Featured Brief Card Component**
  - [ ] Create `FeaturedBriefCard` component
  - [ ] Implement responsive layout (mobile/desktop)
  - [ ] Add Listen, Save, Download actions
  - [ ] Test with real brief data

- [ ] **3.2 Dashboard Integration**
  - [ ] Update dashboard page to fetch today's brief
  - [ ] Position card below representatives section
  - [ ] Handle no brief state (show generate button)
  - [ ] Test with multiple users

### Phase 4: Previous Briefs Page (Week 2)

- [ ] **4.1 Briefs List Page**
  - [ ] Create `/app/briefs/page.tsx`
  - [ ] Fetch all user briefs from database
  - [ ] Display in grid layout (3 columns)
  - [ ] Add pagination or infinite scroll

- [ ] **4.2 Individual Brief Page**
  - [ ] Create `/app/briefs/[id]/page.tsx`
  - [ ] Display full brief with audio player
  - [ ] Show written digest
  - [ ] Add share and download options

- [ ] **4.3 Navigation**
  - [ ] Add "Briefs" link to main navigation
  - [ ] Add "View Previous Briefs" button on dashboard
  - [ ] Test navigation flow

### Phase 5: Testing & Polish (Week 2-3)

- [ ] **5.1 End-to-End Testing**
  - [ ] Test nightly generation with 5 test users
  - [ ] Verify briefs appear on dashboard at 6am
  - [ ] Test onboarding → first brief → dashboard flow
  - [ ] Test worker failure and retry logic

- [ ] **5.2 Performance Optimization**
  - [ ] Optimize database queries (add indexes)
  - [ ] Add caching for brief listings
  - [ ] Compress images
  - [ ] Test with 100+ users

- [ ] **5.3 Error Handling**
  - [ ] Handle missing briefs gracefully
  - [ ] Show retry options for failed generations
  - [ ] Add error notifications
  - [ ] Log errors to monitoring service

### Phase 6: Deployment (Week 3)

- [ ] **6.1 Netlify Deployment**
  - [ ] Deploy frontend and API to Netlify
  - [ ] Configure environment variables
  - [ ] Enable scheduled function
  - [ ] Test in production

- [ ] **6.2 Railway Worker Deployment**
  - [ ] Deploy worker to Railway
  - [ ] Configure auto-restart and health checks
  - [ ] Set up log monitoring
  - [ ] Test job processing

- [ ] **6.3 Monitoring Setup**
  - [ ] Set up Sentry for error tracking
  - [ ] Configure alerts for failed briefs
  - [ ] Monitor Redis queue depth
  - [ ] Track generation success rate

---

## 🧪 Testing Plan

### 1. Local Development Testing

**Setup:**
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start BullMQ worker
npm run worker

# Terminal 3: Start Redis (Railway tunnel)
railway connect
```

**Tests:**
- [ ] Generate brief manually via API
- [ ] Watch worker process job
- [ ] Verify brief appears on dashboard
- [ ] Test audio playback
- [ ] Test responsive layouts

### 2. Onboarding Flow Testing

**Test Account:**
- [ ] Create new test user: test+brief@hakivo.com
- [ ] Complete onboarding with different interests
- [ ] Verify first brief queued
- [ ] Watch generation progress
- [ ] Confirm redirect to dashboard
- [ ] Verify brief playable

### 3. Scheduled Generation Testing

**Cron Testing:**
```bash
# Trigger scheduled function manually
netlify functions:invoke scheduled-brief-generation

# Check Netlify logs
netlify functions:logs scheduled-brief-generation

# Check Railway worker logs
railway logs -t worker
```

**Verification:**
- [ ] All active users get jobs queued
- [ ] Worker processes jobs sequentially
- [ ] Briefs saved to database
- [ ] Dashboard shows new briefs

### 4. Production Testing

**Gradual Rollout:**
1. Week 1: Enable for 5 test users
2. Week 2: Enable for 50 beta users
3. Week 3: Enable for all users

**Monitoring:**
- [ ] Track generation success rate (target: >95%)
- [ ] Monitor worker uptime (target: >99%)
- [ ] Track average generation time (target: <10 min)
- [ ] Monitor Redis queue depth (target: <100)
- [ ] Track user engagement (listens per brief)

---

## 🚀 Deployment Guide

### 1. Railway Worker Setup

**Step 1: Create Railway Project**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link hakivo-workers

# Deploy
railway up
```

**Step 2: Configure Environment Variables**

On Railway dashboard, add:
```
REDIS_URL=redis://default:xxx@interchange.proxy.rlwy.net:59812
DATABASE_URL=libsql://hakivo-tarikmoody.turso.io
DATABASE_AUTH_TOKEN=xxx
ANTHROPIC_API_KEY=xxx
ELEVENLABS_API_KEY=xxx
ELEVENLABS_SARAH_VOICE_ID=xxx
ELEVENLABS_JAMES_VOICE_ID=xxx
VULTR_ACCESS_KEY=xxx
VULTR_SECRET_KEY=xxx
VULTR_STORAGE_ENDPOINT=xxx
```

**Step 3: Configure Procfile**
```
worker: npm run worker
```

**Step 4: Enable Auto-Restart**
- Railway → Settings → Restarts: Enabled
- Health Check: /health (optional)

### 2. Netlify Scheduled Function Setup

**Step 1: Create Function**

Create `netlify/functions/scheduled-brief-generation.ts`:
```typescript
import { schedule } from '@netlify/functions';
// ... (code from earlier section)
```

**Step 2: Configure Cron**

Add to `netlify.toml`:
```toml
[functions."scheduled-brief-generation"]
  schedule = "0 0 * * *"  # Midnight UTC daily
```

**Step 3: Deploy**
```bash
# Deploy to Netlify
netlify deploy --prod
```

**Step 4: Verify**
- Netlify → Functions → Scheduled Functions
- Check execution logs
- Trigger manually for testing

### 3. Environment Variables (Netlify)

**Set via CLI:**
```bash
netlify env:set REDIS_URL "redis://..."
netlify env:set DATABASE_URL "libsql://..."
netlify env:set DATABASE_AUTH_TOKEN "xxx"
# ... (all other env vars)
```

**Or via Netlify UI:**
- Site Settings → Environment Variables
- Add all required variables
- Set context: Production

### 4. Database Migration

**Run migration in production:**
```bash
# SSH into Railway worker OR run locally against prod DB
npm run tsx scripts/migrate-briefs-add-metadata.ts
```

---

## 📊 Success Metrics

### KPIs to Track

1. **Generation Success Rate**
   - Target: >95%
   - Alert if <90%

2. **Average Generation Time**
   - Target: <10 minutes per brief
   - Alert if >15 minutes

3. **Worker Uptime**
   - Target: >99%
   - Alert if offline >5 minutes

4. **User Engagement**
   - Listens per brief: Target >60%
   - Completion rate: Target >80%
   - Save rate: Target >20%

5. **Error Rate**
   - Failed jobs: Target <5%
   - API errors: Target <1%

### Monitoring Dashboard

**BullBoard:**
- URL: `/admin/bull-board`
- Shows: Queue status, job progress, failed jobs
- Access: Admin only

**Sentry:**
- Error tracking
- Performance monitoring
- User impact analysis

**Railway Logs:**
- Worker execution logs
- Redis connection status
- Job processing times

---

## 🔮 Future Enhancements

### Phase 2 (After Launch)

1. **Timezone-Aware Scheduling**
   - Store user timezone
   - Generate at user's local midnight
   - Better 6am delivery accuracy

2. **Email Notifications**
   - "Your daily brief is ready" email at 6am
   - Click-through to dashboard
   - Weekly digest summary email

3. **Customizable Duration**
   - User chooses: 5min, 10min, or 15min briefs
   - Dynamic content selection
   - Adjust speaking pace

4. **Download for Offline**
   - Save audio to device
   - Listen without internet
   - Sync across devices

5. **Share Briefs**
   - Share via link
   - Embed player on websites
   - Social media sharing

6. **Analytics Dashboard**
   - Listening habits
   - Most engaging topics
   - Completion rates
   - Personalized insights

---

## ❓ FAQ

**Q: What if brief generation fails?**
A: The worker will retry up to 3 times with exponential backoff. If all attempts fail, the user will see a "generate now" button on their dashboard.

**Q: Can users skip a day?**
A: Yes. The system only generates if the user doesn't already have a brief for that day. Users can disable daily generation in settings (future feature).

**Q: What happens if the worker crashes?**
A: Railway will automatically restart the worker. Any in-progress jobs will be requeued and retried.

**Q: How much does this cost?**
A: Approximately $0.15 per brief (Claude API + ElevenLabs + Vultr storage). For 100 users, that's $15/day or $450/month.

**Q: Can we handle 1000+ users?**
A: Yes. With current setup, the worker can process ~6 briefs per hour. For 1000 users, we'd need 167 hours (7 days). We can add more workers or upgrade to faster generation.

**Q: What if a user signs up at 2am?**
A: They'll get their first brief generated immediately (5-10 min). Then they'll join the nightly generation schedule starting the next day.

---

## 📚 Resources

### Documentation
- [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Railway Deployment Guide](https://docs.railway.app/guides/deployments)
- [Next.js 16 App Router](https://nextjs.org/docs/app)

### Code References
- [Existing Brief Worker](../workers/brief-worker.ts)
- [Brief Queue Setup](../lib/queue/brief-queue.ts)
- [Brief Generation API](../app/api/briefs/generate-daily/route.ts)
- [Brief Card Component](../components/dashboard/brief-card.tsx)

### Environment Setup
- [.env.example](../.env.example)
- [netlify.toml](../netlify.toml)
- [package.json](../package.json)

---

## ✅ Summary

**What We're Building:**
An automated system that generates personalized daily audio briefs for users every night, so they have fresh, relevant civic content ready to listen to each morning.

**Key Requirements:**
1. ✅ Works on Netlify (frontend + scheduled jobs)
2. ✅ BullMQ workers on Railway (long-running background tasks)
3. ✅ Overnight generation (midnight cron job)
4. ✅ 6am ready (5-6 hour buffer for processing)
5. ✅ First brief after onboarding (automatic queue on signup)
6. ✅ Featured on dashboard (full width under representatives)
7. ✅ Previous briefs access (dedicated `/briefs` page)

**Timeline:**
- Week 1: Foundation + Onboarding
- Week 2: Dashboard UI + Previous Briefs
- Week 3: Testing + Deployment

**Next Steps:**
1. Start with Phase 1.2: Deploy worker to Railway
2. Test end-to-end with one user
3. Enable scheduled generation for test users
4. Monitor and iterate

---

**Ready to start building! 🚀**
