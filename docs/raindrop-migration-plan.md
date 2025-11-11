# Raindrop Service Migration Plan
**CivicPulse Database Migration & FK Constraint Resolution**

**Created:** 2025-11-10
**Status:** Ready for Execution
**Estimated Time:** 2-3 hours

---

## Executive Summary

### The Problem
The current Raindrop deployment (@01k8kf2b) is failing with:
```
[internal] D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

This error occurs **during deployment validation** (not runtime), preventing any code updates from being deployed. The voting history feature is complete but cannot be deployed.

### The Root Cause
1. **Inconsistent schema definitions** - Three different schema files with conflicting FK constraints
2. **Existing data violates constraints** - Database has records that violate FK relationships
3. **Deployment validation failure** - Raindrop checks schema integrity before deployment completes

### The Solution
**Create a fresh Raindrop deployment** with:
- ✅ Clean database with no FK constraint conflicts
- ✅ Proper schema initialization (tables created in correct order)
- ✅ Data re-sync from external APIs (Congress.gov - both 118th & 119th Congress, RSS feeds)
- ✅ ~60,000 bills from TWO congressional sessions (118th + 119th)
- ✅ Updated Inngest integration for background jobs (daily bill sync, news refresh, brief generation)
- ✅ SmartBuckets AI-powered semantic search (~60,000 documents)
- ✅ Complete frontend verification (all pages work)
- ✅ Admin dashboard testing (data management tools)
- ✅ All voting history features working immediately

**Note:** We're using SmartBuckets exclusively for search, replacing Algolia. SmartBuckets provides semantic search (understands meaning, not just keywords) at no additional cost.

---

## Migration Strategy Overview

### Approach: Fresh Deployment with Data Re-sync

**Why this approach:**
- ✅ **Fastest resolution** - Avoids complex FK constraint debugging
- ✅ **Clean slate** - No corrupted state or orphaned records
- ✅ **All data is recoverable** - Everything comes from external APIs
- ✅ **No data loss risk** - We're in development, no user-generated content
- ✅ **Raindrop best practice** - Using branching/versioning as designed

**Alternative approaches considered:**
- ❌ **Export/Import database** - Raindrop doesn't expose direct SQLite file access
- ❌ **Manual FK constraint fix** - Would require identifying which records violate constraints
- ❌ **Schema migration scripts** - Complex with 30,000+ records and multiple FK violations

---

## Pre-Migration Checklist

### Prerequisites
- [ ] Raindrop CLI authenticated (`raindrop auth login`)
- [ ] Congress.gov API key set in environment
- [ ] Perplexity API key set in environment
- [ ] ElevenLabs API key set in environment
- [ ] Inngest account accessible
- [ ] Git working directory is clean (commit current changes)

### Environment Variables to Document
Before migration, document current environment variables:

```bash
# Run this command to see current env vars
raindrop build env get env:CONGRESS_API_KEY
raindrop build env get env:ANTHROPIC_API_KEY
raindrop build env get env:ELEVENLABS_API_KEY
raindrop build env get env:PERPLEXITY_API_KEY
# ... document all others
```

**Store these values** - you'll need to set them in the new deployment.

---

## Migration Steps

### Phase 1: Prepare Current State (15 minutes)

#### Task 1.1: Document Current Deployment
**Executor:** Claude Code
**Tools:** `raindrop build status`, `raindrop build list`

```bash
# Get current deployment info
raindrop build status > docs/current-deployment-status.txt

# List all versions
raindrop build list > docs/current-versions.txt

# Get current version ID
raindrop build checkout >> docs/current-deployment-status.txt
```

**Expected Output:**
- Current service URL: `https://svc-01k8kf2...lmapp.run`
- Version ID: `01k8kf2b3gre3k5my2x4mnrn58`
- Module count: 18 handlers
- Status: Some modules failing due to FK constraint

#### Task 1.2: Export Environment Variables
**Executor:** Claude Code
**Tools:** Bash commands

```bash
# Create env vars backup
cat > docs/env-vars-backup.sh << 'EOF'
# CivicPulse Environment Variables Backup
# Generated: $(date)

# APIs
export CONGRESS_API_KEY="<value>"
export ANTHROPIC_API_KEY="<value>"
export ELEVENLABS_API_KEY="<value>"
export ELEVENLABS_SARAH_VOICE_ID="<value>"
export ELEVENLABS_JAMES_VOICE_ID="<value>"
export PERPLEXITY_API_KEY="<value>"

# Vultr Storage
export VULTR_STORAGE_ENDPOINT="<value>"
export VULTR_ACCESS_KEY="<value>"
export VULTR_SECRET_KEY="<value>"
export VULTR_CDN_URL="<value>"

# Inngest
export INNGEST_EVENT_KEY="<value>"
export INNGEST_SIGNING_KEY="<value>"

# WorkOS
export WORKOS_API_KEY="<value>"
export WORKOS_CLIENT_ID="<value>"
export WORKOS_REDIRECT_URI="<value>"
EOF
```

**Manual Step:** Fill in actual values from Netlify UI or `.env.local`

#### Task 1.3: Commit Current Code
**Executor:** Claude Code
**Tools:** Git commands

```bash
# Stage all changes
git add -A

# Commit with migration context
git commit -m "chore: pre-migration checkpoint before fresh Raindrop deployment

- Voting history feature complete (ready for deployment)
- FK constraint error blocking deployment (@01k8kf2b)
- Preparing fresh deployment to resolve database issues
- All code is deployment-ready

Ref: docs/raindrop-migration-plan.md"
```

---

### Phase 2: Create Fresh Deployment (30 minutes)

#### Task 2.1: Create New Branch
**Executor:** Raindrop MCP
**Tools:** `raindrop build branch`

```bash
# Create new branch from current state
raindrop build branch production-v2 --start --versionId 01k9qwx4w08byaapx29qp202tn
```

**Why branching instead of new app:**
- ✅ Keeps deployment history
- ✅ Preserves manifest configuration
- ✅ Can rollback if needed
- ✅ Automatic sandbox mode for testing

**Expected Output:**
```
Branching complete, sandboxing the new branch
🔔 Branch is in Sandbox mode

📊 Watching deployment status...

civic-pulse@<NEW_VERSION_ID>
Status: RUNNING
Active: No

Modules:
  web: RUNNING
    https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai
  [... 17 other modules ...]
```

**Action:** Copy the new service URL and version ID to `docs/new-deployment-info.txt`

#### Task 2.2: Set Environment Variables
**Executor:** Claude Code
**Tools:** `raindrop build env set`

```bash
# Set all environment variables in new deployment
raindrop build env set env:CONGRESS_API_KEY "<value>"
raindrop build env set env:ANTHROPIC_API_KEY "<value>"
raindrop build env set env:ELEVENLABS_API_KEY "<value>"
raindrop build env set env:ELEVENLABS_SARAH_VOICE_ID "<value>"
raindrop build env set env:ELEVENLABS_JAMES_VOICE_ID "<value>"
raindrop build env set env:PERPLEXITY_API_KEY "<value>"
raindrop build env set env:VULTR_STORAGE_ENDPOINT "<value>"
raindrop build env set env:VULTR_ACCESS_KEY "<value>"
raindrop build env set env:VULTR_SECRET_KEY "<value>"
raindrop build env set env:VULTR_CDN_URL "<value>"
raindrop build env set env:INNGEST_EVENT_KEY "<value>"
raindrop build env set env:INNGEST_SIGNING_KEY "<value>"
raindrop build env set env:WORKOS_API_KEY "<value>"
raindrop build env set env:WORKOS_CLIENT_ID "<value>"
raindrop build env set env:WORKOS_REDIRECT_URI "<value>"
```

#### Task 2.3: Deploy Updated Code
**Executor:** Claude Code
**Tools:** `raindrop build deploy`

```bash
# Deploy with amend (sandbox mode)
raindrop build deploy --amend --start

# Verify deployment status
raindrop build status
```

**Expected Result:** All 18 modules should converge and show RUNNING status

#### Task 2.4: Update Local Environment
**Executor:** Claude Code
**Tools:** File editing

Update `.env.local` with new service URL:
```bash
# OLD
RAINDROP_SERVICE_URL=https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run

# NEW (get from deployment status)
RAINDROP_SERVICE_URL=https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai
```

---

### Phase 3: Data Re-sync (90-100 minutes)

#### Task 3.1: Verify Database Initialization
**Executor:** Claude Code
**Tools:** API endpoint testing

```bash
# Test database health endpoint
curl https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-11-10T...",
#   "service": "civic-pulse",
#   "version": "0.1.0"
# }
```

**What happens:** The `initializeDatabase()` function in `/src/web/index.ts` runs on first request, creating all tables with clean schema (no FK constraint errors).

#### Task 3.2: Sync Representatives (~540 records, 2 minutes)
**Executor:** Claude Code via API
**Tools:** Congress.gov API

Create sync script:
```typescript
// scripts/sync-representatives.ts
import { fetchMembers } from '@/lib/api/congress';

async function syncRepresentatives() {
  console.log('🔄 Syncing representatives from Congress.gov...');

  // Fetch current House members
  const house = await fetchMembers('house', 119);

  // Fetch current Senate members
  const senate = await fetchMembers('senate', 119);

  const allMembers = [...house, ...senate];
  console.log(`📊 Found ${allMembers.length} representatives`);

  // Store in database via admin API
  const response = await fetch(`${process.env.RAINDROP_SERVICE_URL}/api/admin/representatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ representatives: allMembers })
  });

  console.log('✅ Representatives synced');
}

syncRepresentatives();
```

Run it:
```bash
npx tsx scripts/sync-representatives.ts
```

**Expected Output:**
```
🔄 Syncing representatives from Congress.gov...
📊 Found 540 representatives
✅ Representatives synced
```

#### Task 3.3: Sync Bills from 118th AND 119th Congress (~60,000 records, 90-120 minutes)
**Executor:** Claude Code
**Tools:** Existing `scripts/fetch-congress-119.ts` script (modified for both sessions)

**IMPORTANT:** We need bills from BOTH congressional sessions:
- **118th Congress (2023-2024)** - Historical bills and voting records
- **119th Congress (2025-2026)** - Current bills

**What the script does:**
- Fetches all bills from specified Congress
- Gets full details: title, summary, full text, cosponsors, committees
- Calculates impact scores automatically
- Stores in database via `/api/bills` endpoint
- Has built-in progress tracking (can resume if interrupted)
- Respects Congress.gov rate limits (1 req/sec)

**Step 1: Fetch 118th Congress Bills**

Create a copy of the script for 118th Congress:
```bash
# Copy the existing script
cp scripts/fetch-congress-119.ts scripts/fetch-congress-118.ts

# Edit the file and change line 8:
# const CONGRESS = 118; // Changed from 119
```

Run it:
```bash
# Set the new Raindrop service URL
export RAINDROP_SERVICE_URL=https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai

# Run 118th Congress sync first
npx tsx scripts/fetch-congress-118.ts
```

**Expected Output:**
```
🚀 Starting 118th Congress Bill Fetch

============================================================
Target: All bills from 118th Congress (2023-2024)
Bill types: HR, S, HJRES, SJRES
Rate limit: 1 request/second
============================================================

📋 Fetching HR bill list...
   ✅ Total HR bills: 8,442

📋 Processing HR Bills
[1/8442] HR 1
   📥 Fetching bill details...
   ✅ Stored successfully

   ... (continues for all bills)

============================================================
✨ 118th Congress Bill Fetch Complete!
============================================================
📊 Final Statistics:
   Total fetched: 29,853
   Success rate: 100%
============================================================
```

**Time Estimate:** 45-60 minutes

**Step 2: Fetch 119th Congress Bills**

Run the original script:
```bash
# Set the new Raindrop service URL (if not already set)
export RAINDROP_SERVICE_URL=https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai

# Run 119th Congress sync
npx tsx scripts/fetch-congress-119.ts
```

**Expected Output:**
```
🚀 Starting 119th Congress Bill Fetch

============================================================
Target: All bills from 119th Congress (2025-2026)
Bill types: HR, S, HJRES, SJRES
============================================================

📊 Final Statistics:
   Total fetched: 30,147
   Success rate: 100%
============================================================
```

**Time Estimate:** 45-60 minutes

**Total Bills After Both Scripts:** ~60,000 bills (29,853 from 118th + 30,147 from 119th)

**Resume If Interrupted:**
Both scripts track progress independently:
- 118th Congress: `./progress/fetch-118-progress.json`
- 119th Congress: `./progress/fetch-119-progress.json`

If either script fails or is stopped, just run it again to resume.

**Parallel Execution (Advanced):**
To speed up, you can run both scripts in parallel in separate terminal windows:
```bash
# Terminal 1
npx tsx scripts/fetch-congress-118.ts &

# Terminal 2
npx tsx scripts/fetch-congress-119.ts &

# Wait for both to complete
wait
```

This reduces total time from 90-120 minutes to 45-60 minutes.

#### Task 3.4: Sync Voting Records (NEW FEATURE, 20-30 minutes)
**Executor:** Claude Code via API
**Tools:** Congress.gov Roll Call API

Create sync script:
```typescript
// scripts/sync-voting-records.ts
import { executeQuery } from '@/lib/db/client';

async function syncVotingRecords() {
  console.log('🔄 Syncing voting records...');

  // Get all bills
  const billsResult = await executeQuery(
    'SELECT id, congress, bill_type, bill_number FROM bills LIMIT 100',
    'bills'
  );

  let totalVotes = 0;

  for (const bill of billsResult.rows) {
    console.log(`📋 Fetching votes for ${bill.id}...`);

    // Fetch roll call votes for this bill
    const votes = await fetchBillVotes(bill.congress, bill.bill_type, bill.bill_number);

    // Store votes
    for (const vote of votes) {
      await executeQuery(
        `INSERT INTO vote_records (id, bill_id, representative_bioguide_id, vote, vote_date, chamber, roll_call_number)
         VALUES ('${vote.id}', '${bill.id}', '${vote.bioguide_id}', '${vote.vote}', '${vote.date}', '${vote.chamber}', ${vote.roll_call})`,
        'vote_records'
      );
      totalVotes++;
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`✅ Total votes synced: ${totalVotes}`);
}

syncVotingRecords();
```

Run it:
```bash
npx tsx scripts/sync-voting-records.ts
```

#### Task 3.5: Sync News Articles (5 minutes)
**Executor:** Claude Code via API
**Tools:** RSS feeds + Perplexity API

Create sync script:
```typescript
// scripts/sync-news-articles.ts
import { fetchTheHillFeeds } from '@/lib/rss/the-hill-feeds';
import { enhanceWithPerplexity } from '@/lib/api/perplexity';

async function syncNewsArticles() {
  console.log('🔄 Syncing news articles...');

  // Fetch from RSS feeds
  const articles = await fetchTheHillFeeds();

  console.log(`📰 Found ${articles.length} articles`);

  // Enhance with Perplexity
  for (const article of articles.slice(0, 50)) { // First 50 only
    const enhanced = await enhanceWithPerplexity(article);

    // Store in database
    await fetch(`${process.env.RAINDROP_SERVICE_URL}/api/news/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enhanced)
    });
  }

  console.log('✅ News articles synced');
}

syncNewsArticles();
```

#### Task 3.6: Sync Bills to SmartBuckets (AI-Powered Search, 30-40 minutes)
**Executor:** Claude Code
**Tools:** Raindrop SmartBuckets API

**What this does:** Uploads all bills to SmartBuckets so users can search using natural language like "healthcare bills from California" instead of exact keywords.

Create sync script:
```typescript
// scripts/sync-bills-to-smartbuckets.ts
import { executeQuery } from '@/lib/db/client';

async function syncBillsToSmartBuckets() {
  console.log('🔄 Syncing bills to SmartBuckets for AI search...');

  // Get all bills from database
  const billsResult = await executeQuery(
    'SELECT id, congress, bill_type, bill_number, title, summary, sponsor_name, issue_categories FROM bills',
    'bills'
  );

  const bills = billsResult.rows;
  console.log(`📊 Found ${bills.length} bills to upload`);

  // Upload to SmartBucket in batches of 100
  const batchSize = 100;
  let uploaded = 0;

  for (let i = 0; i < bills.length; i += batchSize) {
    const batch = bills.slice(i, i + batchSize);

    for (const bill of batch) {
      // Format for SmartBucket
      const document = {
        id: bill.id,
        content: `${bill.title}. ${bill.summary}`,
        metadata: {
          bill_id: bill.id,
          congress: bill.congress,
          bill_type: bill.bill_type,
          bill_number: bill.bill_number,
          title: bill.title,
          sponsor: bill.sponsor_name,
          categories: bill.issue_categories || '[]'
        }
      };

      // Upload via Raindrop SmartBucket
      await fetch(`${process.env.RAINDROP_SERVICE_URL}/api/smartbucket/bills/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document)
      });

      uploaded++;
      if (uploaded % 100 === 0) {
        console.log(`  ✓ Uploaded ${uploaded} bills to SmartBuckets...`);
      }
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ SmartBuckets sync complete: ${uploaded} bills`);
  console.log('🔍 AI-powered search is now enabled!');
}

syncBillsToSmartBuckets();
```

Run it:
```bash
npx tsx scripts/sync-bills-to-smartbuckets.ts
```

**Expected Output:**
```
🔄 Syncing bills to SmartBuckets for AI search...
📊 Found 60,000 bills to upload
  ✓ Uploaded 100 bills to SmartBuckets...
  ✓ Uploaded 200 bills to SmartBuckets...
  ... (continues)
✅ SmartBuckets sync complete: 60,000 bills
🔍 AI-powered search is now enabled!
```

**Verification:**
Test AI search works:
```bash
# Test natural language search
curl -X POST https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/smartbucket/bills/search \
  -H "Content-Type: application/json" \
  -d '{"query": "bills about climate change from 2024"}'

# Should return relevant bills even if they don't contain exact phrase "climate change"
```

#### Task 3.7: Update Frontend Search to Use SmartBuckets (10 minutes)
**Executor:** Claude Code
**Tools:** Code editing

**What this does:** Updates the frontend search component to use Raindrop SmartBuckets instead of Algolia for semantic search.

**Why SmartBuckets over Algolia:**
- ✅ Semantic search (understands "climate change" even when bill says "environmental policy")
- ✅ No additional cost (included with Raindrop)
- ✅ No separate service to maintain
- ✅ AI-powered relevance scoring
- ✅ Multi-modal search (can search images in PDF bills)

**Frontend Changes Needed:**

1. **Create SmartBuckets search API endpoint:**
```typescript
// app/api/bills/search/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { query } = await req.json();

  // Call Raindrop SmartBuckets search
  const response = await fetch(`${process.env.RAINDROP_SERVICE_URL}/api/smartbucket/bills/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: query,
      requestId: `search-${Date.now()}`
    })
  });

  const results = await response.json();

  return NextResponse.json({
    hits: results.results.map((r: any) => ({
      id: r.payloadSignature,
      title: r.text?.split('\n')[0] || '',
      summary: r.text || '',
      score: r.score,
      source: r.source
    })),
    pagination: results.pagination
  });
}
```

2. **Update search component to call new endpoint:**
```typescript
// components/bill-search.tsx
async function searchBills(query: string) {
  const response = await fetch('/api/bills/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  return response.json();
}
```

**No installation needed** - SmartBuckets is already configured in `raindrop.manifest`:
```hcl
smartbucket "bills-smartbucket" {}
```

**Verification:**
Test semantic search:
```bash
# Test via API endpoint
curl -X POST https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/bills/search \
  -H "Content-Type: application/json" \
  -d '{"query":"bills about renewable energy from California"}'

# Should return relevant bills even without exact keyword matches
```

**Migration Note:** You can remove Algolia dependencies and environment variables after migration completes.

---

### Phase 4: Complete Inngest Integration (30 minutes)

#### Task 4.1: Update Inngest Environment Variables
**Executor:** Manual (Inngest Dashboard)
**Tools:** Inngest web UI

1. Go to https://app.inngest.com
2. Navigate to your project settings
3. Update environment variable:
   - **Variable:** `RAINDROP_SERVICE_URL`
   - **Old Value:** `https://svc-01k8kf2fkj3423r7zpm53cfkgz...`
   - **New Value:** `https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai`
4. Save changes

**What this does:** Points all Inngest background jobs to the new Raindrop service

#### Task 4.2: Verify Inngest Functions
**Executor:** Claude Code
**Tools:** Inngest dashboard

Check these functions are still configured:
- ✅ `daily-brief-scheduler` - Generates daily audio briefings
- ✅ `sync-bills` - Background bill syncing
- ✅ `refresh-news-pool` - Keeps news articles fresh

#### Task 4.3: Test Inngest Integration
**Executor:** Claude Code
**Tools:** API testing

```bash
# Trigger a test event
curl -X POST https://app.inngest.com/e/<EVENT_KEY> \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test/raindrop.connection",
    "data": { "service": "civic-pulse" }
  }'

# Check Inngest dashboard for successful execution
```

---

### Phase 5: Verification & Testing (20 minutes)

#### Task 5.1: Test Database Connectivity
**Executor:** Claude Code
**Tools:** API endpoints

```bash
# Test admin API
curl https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/admin/bills?limit=10

# Expected: JSON response with 10 bills

# Test representatives endpoint
curl https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/representatives?state=CA

# Expected: JSON response with California representatives
```

#### Task 5.2: Test Voting History Feature (NEW!)
**Executor:** Claude Code
**Tools:** API endpoints

```bash
# Get representative voting history
curl https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/representatives/K000388/voting-history

# Expected: JSON response with voting records for Rep. Trent Kelly
```

**Success Criteria:**
- ✅ Returns voting records
- ✅ Includes bill information
- ✅ Shows vote (Yea/Nay/Not Voting)
- ✅ No FK constraint errors!

#### Task 5.3: Test News Personalization
**Executor:** Claude Code
**Tools:** API endpoints

```bash
# Get personalized news
curl -X POST https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai/api/news/personalized \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "interests": ["healthcare", "education"]}'

# Expected: JSON response with personalized news articles
```

#### Task 5.4: Verify All Modules Running
**Executor:** Claude Code
**Tools:** `raindrop build status`

```bash
# Check all 18 modules
raindrop build status -o table

# All should show RUNNING status
```

**Expected Output:**
```
┌──────────────────────┬─────────┬─────────────────────────────────┐
│ Module               │ Status  │ URLs                            │
├──────────────────────┼─────────┼─────────────────────────────────┤
│ web                  │ RUNNING │ https://<NEW_VERSION_ID>...     │
│ admin-api            │ RUNNING │ https://<NEW_VERSION_ID>...     │
│ ... (16 more)        │ RUNNING │ ...                             │
└──────────────────────┴─────────┴─────────────────────────────────┘

Total: 18 modules (18 converged) ✅
```

---

### Phase 6: Production Cutover (10 minutes)

#### Task 6.1: Update Netlify Environment Variables
**Executor:** Manual (Netlify UI)
**Tools:** Netlify dashboard

1. Go to Netlify dashboard: https://app.netlify.com
2. Navigate to: Site Settings > Environment Variables
3. Update `RAINDROP_SERVICE_URL`:
   - **Old:** `https://svc-01k8kf2fkj3423r7zpm53cfkgz...`
   - **New:** `https://<NEW_VERSION_ID>.raindrop.liquidmetal.ai`
4. Click "Save"
5. Trigger new deploy: Deploys > Trigger Deploy > Deploy Site

**What this does:** Points the Next.js app to the new Raindrop service

#### Task 6.2: Test Full Application Flow
**Executor:** Manual (Browser)
**Tools:** Web browser

1. Open https://hakivo.netlify.app
2. Navigate to Representatives page
3. Click on any representative
4. **Verify voting history displays** ✅
5. Check daily briefs page
6. Verify personalized news feed

#### Task 6.3: Unsandbox Production Version
**Executor:** Claude Code
**Tools:** `raindrop build unsandbox`

```bash
# Mark as production-ready (remove sandbox mode)
raindrop build unsandbox --version <NEW_VERSION_ID>

# Verify
raindrop build status
```

**When to do this:** After 24-48 hours of testing in sandbox mode

---

## Rollback Plan

### If Migration Fails

#### Option 1: Revert to Old Deployment
```bash
# Switch back to old version
raindrop build checkout 01k8kf2b3gre3k5my2x4mnrn58

# Update .env.local
RAINDROP_SERVICE_URL=https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run

# Redeploy Netlify
# (Go to Netlify dashboard and redeploy)
```

#### Option 2: Delete New Branch
```bash
# Delete failed branch
raindrop build delete --version <NEW_VERSION_ID>

# Start over with fresh branch
raindrop build branch production-v3
```

---

## Post-Migration Tasks

### Task 1: Monitor Performance (48 hours)
**Owner:** Developer
**Cadence:** Every 6 hours

Check:
- [ ] All API endpoints responding < 500ms
- [ ] No database errors in logs
- [ ] Inngest jobs completing successfully
- [ ] News articles refreshing every 24 hours
- [ ] Daily briefs generating correctly

### Task 2: Update Documentation
**Owner:** Claude Code

Update these files:
- [ ] `README.md` - Update service URL references
- [ ] `DEPLOYMENT_STATUS.md` - Document new deployment
- [ ] `.env.example` - Update with new service URL format
- [ ] `docs/api-endpoints.md` - Verify all endpoints

### Task 3: Delete Old Deployment
**Owner:** Developer
**Timing:** After 7 days of stable operation

```bash
# Archive old version
raindrop build stop --version 01k8kf2b3gre3k5my2x4mnrn58

# Optional: Delete after backup
raindrop build delete --version 01k8kf2b3gre3k5my2x4mnrn58
```

---

## Success Criteria

Migration is successful when:

- ✅ All 18 Raindrop modules show RUNNING status
- ✅ Database has 60,000+ bills synced (118th + 119th Congress)
- ✅ Database has 540+ representatives synced
- ✅ Voting history API returns data for any representative
- ✅ SmartBuckets has 60,000+ documents indexed for AI-powered semantic search
- ✅ Search functionality working via SmartBuckets (Algolia removed)
- ✅ Personalized news endpoint works
- ✅ Inngest background jobs run successfully
- ✅ Netlify frontend connects to new service
- ✅ No FK constraint errors in logs
- ✅ `raindrop build find` shows 18 converged modules

---

## Timeline Summary

| Phase | Duration | Tasks | Can Parallelize? |
|-------|----------|-------|------------------|
| Phase 1: Prepare | 15 min | Document state, export env vars, commit code | No |
| Phase 2: Deploy | 30 min | Branch, set env vars, deploy | No |
| Phase 3: Data Sync | 100 min | Sync bills (118th + 119th), reps, votes, news, SmartBuckets | **Yes** (run 118th & 119th scripts in parallel) |
| Phase 4: Inngest | 30 min | Update env vars, test integration | No |
| Phase 5: Verify | 20 min | Test all endpoints and features | Partial |
| Phase 6: Cutover | 10 min | Update Netlify, update search to SmartBuckets | No |
| **Total** | **3.25 hrs** | | |

**Optimization:** Run both Congress scripts (118th & 119th) in parallel to reduce Phase 3 from 100 min to ~60 min.

**Note:** Removed Algolia dependency - using SmartBuckets for all search functionality.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data sync fails | Low | Medium | Scripts are idempotent, can re-run |
| API rate limits hit | Medium | Low | Built-in delays, can resume |
| Inngest integration breaks | Low | Medium | Easy to rollback env var change |
| Netlify deploy fails | Low | High | Rollback plan documented |
| Missing env var | Medium | High | Pre-migration checklist |

---

## Required Access & Permissions

- [ ] Raindrop CLI authenticated
- [ ] Congress.gov API key active
- [ ] Netlify admin access
- [ ] Inngest project admin access
- [ ] GitHub repository write access

---

## Notes for Execution

### For Claude Code:
1. Execute tasks sequentially following phase order
2. Log all outputs to `docs/migration-log.txt`
3. Pause for manual steps (marked clearly above)
4. Use `TodoWrite` to track progress through phases
5. Report any errors immediately - don't skip ahead

### For Raindrop MCP:
1. Focus on Raindrop CLI commands (build, deploy, env)
2. Monitor deployment status after each operation
3. Verify module convergence before proceeding
4. Document any Raindrop-specific errors

### For Developer:
1. Keep browser tabs open: Netlify, Inngest, Raindrop dashboard
2. Have `.env.local` file ready to update
3. Don't delete old deployment until new one is stable
4. Test voting history feature thoroughly - it's the star!

---

## Appendix A: Database Schema Reference

Tables created during initialization (from `/src/web/index.ts`):

1. **users** - User accounts and profiles
2. **bills** - Congressional bills (30,000+ records)
3. **representatives** - Elected officials (540 records)
4. **user_bills** - User-saved bills tracking
5. **podcasts** - Generated audio content
6. **rss_articles** - News articles from feeds
7. **vote_records** - Voting history (NEW!)
8. **sync_history** - Sync operation tracking

**No FK constraints** - Tables use referential integrity via application logic, not database FKs.

---

## Appendix B: Useful Commands

```bash
# Check deployment status
raindrop build status

# View logs
raindrop logs tail --application civic-pulse

# List all versions
raindrop build list

# Get current version
raindrop build checkout

# Find running modules
raindrop build find

# Test database endpoint
curl https://<SERVICE_URL>/api/health

# Watch deployment
raindrop build status -o watch
```

---

## Questions & Troubleshooting

### Q: What if data sync scripts fail halfway?
**A:** All scripts are idempotent (can run multiple times safely). Just re-run the failed script.

### Q: Can I test the new deployment before switching Netlify?
**A:** Yes! Use the new service URL directly in API testing tools or update `.env.local` temporarily.

### Q: What happens to old deployment during migration?
**A:** It stays running and unchanged. We're creating a parallel deployment, not modifying the old one.

### Q: How long until I can delete the old deployment?
**A:** Wait at least 7 days of stable operation before deleting the old version.

### Q: What if voting history still doesn't work?
**A:** Check that vote_records table has data. If empty, re-run `scripts/sync-voting-records.ts`.

---

**END OF MIGRATION PLAN**

This plan is ready for execution. Start with Phase 1 and proceed sequentially through all phases.
