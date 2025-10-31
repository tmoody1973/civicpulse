# 119th Congress Migration - Hackathon Edition

## Quick Overview

**Goal:** Fetch all bills from the 119th Congress (2025-2026) and get them into Raindrop + Algolia for the hackathon demo.

**Scope:**
- 119th Congress only (~8,000 bills)
- All bill types (HR, S, HJRES, SJRES)
- Full metadata (sponsor, committees, cosponsors)
- Full text where available

**Timeline:**
- Fetching: 2-3 hours
- Indexing: 30-45 minutes
- Sync: 10-15 minutes
- **Total:** ~3-4 hours (can run while working on other things)

**Cost:** Free tier friendly
- SmartBuckets: ~8K documents (check if within limits)
- Algolia: 8K records (within 10K free tier)

---

## Step-by-Step Execution

### Step 1: Verify Setup (5 minutes)

**Check environment variables:**
```bash
# Verify these exist in .env.local
CONGRESS_API_KEY=
RAINDROP_SERVICE_URL=
ALGOLIA_APP_ID=
ALGOLIA_ADMIN_API_KEY=
```

**Test connections:**
```bash
npx tsx scripts/test-connections.ts
```

Expected output:
```
✅ Congress.gov API working
✅ Raindrop SQL working - Current bills: X
✅ Algolia credentials present
🎉 All connections verified!
```

---

### Step 2: Backup Current Data (2 minutes)

```bash
# Create backups directory
mkdir -p backups

# Backup existing bills
npx tsx scripts/backup-database.ts
```

---

### Step 3: Fetch 119th Congress Bills (2-3 hours)

**Start the fetch:**
```bash
npx tsx scripts/fetch-congress-119.ts
```

**What it does:**
1. Fetches list of all HR bills from 119th Congress
2. For each bill:
   - Fetch bill details
   - Fetch sponsor info
   - Fetch cosponsor count
   - Fetch committee assignments
   - Fetch full text (if available)
   - Wait 1 second (rate limit)
3. Stores in Raindrop database
4. Tracks progress (can resume if interrupted)

**Expected output:**
```
🚀 Starting 119th Congress Bill Fetch
📊 Target: ~8,000 bills
⏱️  Estimated time: 2-3 hours

Fetching bill list...
✅ Found 8,234 bills to fetch

[1/8234] HR 1 - Fetching...
  ✅ Bill details
  ✅ Cosponsors (124)
  ✅ Committees (House Ways and Means)
  ✅ Full text (3,456 chars)
  💾 Stored in database

[2/8234] HR 2 - Fetching...
...

Progress: 500/8234 (6%) - ETA: 2h 15min
```

**Resume capability:**
If interrupted, just re-run the script. It will resume from where it left off.

---

### Step 4: Infer Policy Areas (30 minutes)

**Run AI inference for bills without official policy areas:**
```bash
npx tsx scripts/infer-policy-areas.ts
```

This uses Claude AI to classify bills into policy areas (Healthcare, Defense, etc.) for bills that don't have official Congress.gov classifications.

---

### Step 5: Index in SmartBuckets (30-45 minutes)

**Index for semantic search:**
```bash
npx tsx scripts/index-smartbuckets-119.ts
```

**What it does:**
1. Fetches all 119th Congress bills from database
2. Prepares text for indexing (title + summary + full text excerpt)
3. Uploads in batches of 100
4. Creates vector embeddings for AI semantic search

**Expected output:**
```
🚀 Starting SmartBuckets indexing for 119th Congress

📊 Total bills: 8,234

Batch 1/83 (100 bills)...
✅ Indexed 100/8,234 bills

Batch 2/83 (100 bills)...
✅ Indexed 200/8,234 bills

...

✅ All 8,234 bills indexed in SmartBuckets!
⏱️  Total time: 32 minutes
```

---

### Step 6: Sync to Algolia (10-15 minutes)

**Clear and re-sync:**
```bash
# Clear old data
npx tsx scripts/sync-algolia-simple.ts --clear

# Sync new data
npx tsx scripts/sync-algolia-simple.ts
```

**Expected output:**
```
🚀 Starting Algolia Sync

⚙️  Configuring index...
✅ Index configured

📥 Fetching bills from Raindrop database...
✅ Fetched 8,234 bills

🔄 Transforming records...
✅ Transformed 8,234 records

📊 Records with policy areas: 6,842/8,234 (83%)

📤 Uploading to Algolia...
✅ Uploaded 8,234 records

============================================================
✨ Algolia sync complete!
============================================================
📊 Total synced: 8,234 bills
🔗 Dashboard: https://www.algolia.com/apps/[ID]/explorer/browse/bills
============================================================
```

---

### Step 7: Test Everything (10 minutes)

**Test database:**
```bash
npx tsx scripts/test-database.ts
```

**Test in browser:**
```
http://localhost:3000/search?q=healthcare
http://localhost:3000/search?q=veteran
http://localhost:3000/search?q=climate change
```

**Verify:**
- ✅ All searches return results
- ✅ Bill cards display correctly
- ✅ Congress session shows "119th Congress (2025-2026)"
- ✅ Sponsor information displays
- ✅ Progress tracker works
- ✅ Fast keyword search (< 200ms)
- ✅ AI semantic search works (< 5 seconds)

---

## Progress Tracking

Create a checklist to track your progress:

- [ ] Step 1: Connections verified
- [ ] Step 2: Backup created
- [ ] Step 3: Bills fetched (8,234/8,234)
- [ ] Step 4: Policy areas inferred
- [ ] Step 5: SmartBuckets indexed
- [ ] Step 6: Algolia synced
- [ ] Step 7: Testing complete

---

## What to Expect

### Database Stats (After Step 3)
```
Total bills: 8,234
  - HR: 5,234
  - S: 2,456
  - HJRES: 234
  - SJRES: 310

With full text: 6,542 (79%)
With cosponsors: 7,892 (96%)
With committees: 8,123 (99%)
With policy areas: 6,842 (83%)
```

### Search Performance (After Step 6)
```
Keyword search: 50-150ms
Semantic search: 3-5 seconds
Bill card load: < 100ms
```

---

## Troubleshooting

### Issue: "Rate limit exceeded"
**Solution:** Script already handles this (1 req/sec). Just let it run.

### Issue: "Connection timeout"
**Solution:** Script will retry. If it keeps failing, check internet connection.

### Issue: "Script interrupted"
**Solution:** Just re-run it. Progress is saved, it will resume.

### Issue: "Missing full text for some bills"
**Solution:** Normal. Not all bills have published text yet. Script will fetch what's available.

### Issue: "SmartBuckets upload failed"
**Solution:** Check if you're within SmartBuckets document limits. May need to upgrade plan.

### Issue: "Algolia sync failed"
**Solution:** Verify API keys. Check if you're within record limits (10K free tier).

---

## Scripts We'll Create

1. **`scripts/test-connections.ts`** - Verify all APIs work
2. **`scripts/backup-database.ts`** - Backup existing data
3. **`scripts/fetch-congress-119.ts`** - Fetch all 119th Congress bills
4. **`scripts/infer-policy-areas.ts`** - Already exists
5. **`scripts/index-smartbuckets-119.ts`** - Index bills for semantic search
6. **`scripts/sync-algolia-simple.ts`** - Already exists
7. **`scripts/test-database.ts`** - Verify data quality

---

## After Hackathon: Add 118th Congress

When ready, just run:
```bash
npx tsx scripts/fetch-congress-118.ts
npx tsx scripts/index-smartbuckets-118.ts
npx tsx scripts/sync-algolia-simple.ts
```

This will add the 118th Congress bills (~15K more) without affecting the 119th Congress data.

---

## Time Budget

**Can do while working on other things:**
- Steps 1-2: Do now (7 minutes)
- Step 3: Start and let run (2-3 hours background)
- Step 4: Run during lunch (30 min background)
- Steps 5-6: Run before end of day (45 min background)
- Step 7: Quick test (10 minutes)

**Total hands-on time:** ~30 minutes
**Total elapsed time:** ~3-4 hours (mostly background)

---

**Let's get started! Ready to build the scripts?**
