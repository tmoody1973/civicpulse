# Post-Fetch Instructions

Once the 119th Congress fetch completes, follow these steps to complete the data processing pipeline.

## Quick Start (Recommended)

Run the automated pipeline:
```bash
npx tsx scripts/post-fetch-pipeline.ts
```

This will automatically run all 4 steps in sequence (~25 minutes total).

---

## Manual Steps (If Needed)

If you need to run steps individually:

### Step 1: AI Policy Area Inference (~10 mins)
```bash
npx tsx scripts/infer-policy-areas.ts
```

**What it does:** Uses Claude AI to infer policy areas for bills that don't have official categorization from Congress.gov

**Output:** Updated database with `ai_policy_area` field populated

### Step 2: SmartBuckets Indexing (~10 mins)
```bash
npx tsx scripts/index-smartbuckets-119.ts
```

**What it does:** Indexes all bills with full text into SmartBuckets for semantic search

**Output:** 
- Bills indexed in SmartBuckets
- Database updated with `synced_to_smartbucket_at` timestamps
- Progress saved to `./progress/smartbucket-index-progress.json`

### Step 3: Algolia Sync (~2 mins)
```bash
npx tsx scripts/sync-algolia-simple.ts
```

**What it does:** Syncs all bills to Algolia for fast keyword search

**Output:**
- All bills uploaded to Algolia index
- Search configured with facets and ranking

**Optional:** Clear and rebuild index:
```bash
npx tsx scripts/sync-algolia-simple.ts --clear
```

### Step 4: Test Search (~1 min)
```bash
npx tsx scripts/test-smartbucket-search.ts
```

**What it does:** Tests semantic search with 5 sample queries

**Output:** Verification that search is working correctly

---

## Monitoring Progress

### Check Fetch Progress
```bash
# View progress file
cat ./progress/fetch-119-progress.json

# Or use real-time monitor (refreshes every 30s)
npx tsx scripts/monitor-fetch-progress.ts
```

### Check Database Stats
```bash
# Count total bills
npx tsx -e "
const response = await fetch('${RAINDROP_SERVICE_URL}/api/admin/query', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    table: 'bills',
    query: 'SELECT COUNT(*) as count FROM bills WHERE congress = 119'
  })
});
const data = await response.json();
console.log('Total bills:', data.rows[0].count);
"
```

---

## Expected Results

After running all steps, you should have:

- **~8,000 bills** in database (all 119th Congress)
- **~2,000+ bills** with full text
- **~6,000+ bills** with policy areas (official + AI-inferred)
- **All bills** indexed in Algolia (fast keyword search)
- **Bills with full text** indexed in SmartBuckets (semantic search)

---

## Troubleshooting

### Fetch Failed Mid-Process
The fetch has resume capability. Just run it again:
```bash
npx tsx scripts/fetch-congress-119.ts
```

It will automatically resume from where it left off using `./progress/fetch-119-progress.json`

### SmartBuckets Indexing Failed
Check the Raindrop service is running:
```bash
raindrop status
```

If needed, restart and try again:
```bash
raindrop stop
raindrop start
npx tsx scripts/index-smartbuckets-119.ts
```

### Algolia Sync Failed
Verify credentials in `.env.local`:
- `ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY`

Check dashboard: https://www.algolia.com/apps/YOUR_APP_ID/explorer/browse/bills

---

## Next Steps After Processing

Once all processing is complete, you're ready to:

1. **Update Frontend Search**
   - Connect to Algolia for keyword search
   - Add SmartBucket semantic search
   - Implement faceted filtering (status, policy area, party, etc.)

2. **Build Laws Feature**
   - Show bills that became law
   - "Recently Enacted Laws" dashboard widget
   - Enhanced bill cards with law numbers

3. **Create Personalized Briefings**
   - Use policy areas to match user interests
   - Generate daily/weekly summaries
   - Recommend bills based on user location

4. **Generate Podcasts**
   - Use semantic search to find trending bills
   - Create AI-powered podcast scripts
   - Integrate with ElevenLabs text-to-dialogue

---

## Files Reference

**Main Scripts:**
- `scripts/fetch-congress-119.ts` - Fetch bills from Congress.gov
- `scripts/infer-policy-areas.ts` - AI policy categorization
- `scripts/index-smartbuckets-119.ts` - Semantic search indexing
- `scripts/sync-algolia-simple.ts` - Keyword search indexing
- `scripts/post-fetch-pipeline.ts` - Automated pipeline

**Utilities:**
- `scripts/monitor-fetch-progress.ts` - Real-time dashboard
- `scripts/test-smartbucket-search.ts` - Search validation
- `scripts/test-connections.ts` - API verification
- `scripts/backup-database.ts` - Database backup

**Progress Tracking:**
- `./progress/fetch-119-progress.json` - Fetch progress
- `./progress/smartbucket-index-progress.json` - Indexing progress

**Backups:**
- `./backups/bills-backup-*.json` - Database snapshots
