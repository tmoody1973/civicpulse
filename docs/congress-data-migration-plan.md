# Congressional Bills Data Migration Plan

## Overview

**Goal:** Fetch bills from the 118th and 119th Congress, store them in Raindrop SmartSQL, index in SmartBuckets, and sync to Algolia for fast keyword search.

**Scope:**
- 118th Congress (2023-2024): ~15,000 bills
- 119th Congress (2025-2026): ~8,000 bills (ongoing)
- **Total:** ~23,000 bills

**Estimated Time:**
- Fetching: 6-8 hours (due to Congress.gov rate limits)
- Processing: 2-3 hours
- Indexing: 1-2 hours
- **Total:** 10-13 hours (mostly automated)

---

## Current State Analysis

### What We Have

1. **Database Schema** ✅
   - Tables: `bills`, `representatives`, `vote_records`, etc.
   - Columns: All necessary fields (sponsor info, full text, committees, etc.)

2. **SmartSQL Connection** ✅
   - Connected to Raindrop database
   - API endpoints working

3. **SmartBuckets** ✅
   - Bucket created for bill indexing
   - Semantic search working

4. **Algolia** ✅
   - Index configured
   - Sync script ready (`scripts/sync-algolia-simple.ts`)

5. **Existing Data**
   - Small test dataset (~200 bills)
   - Need to clear and repopulate

### What We Need to Build

1. **Congress.gov Fetching Script** (partially exists)
   - Need to handle bulk fetching
   - Need progress tracking
   - Need error recovery

2. **Data Pipeline**
   - Fetch → Transform → Store → Index → Sync

3. **Progress Monitoring**
   - Track which bills are fetched
   - Handle failures gracefully
   - Resume capability

---

## Step-by-Step Migration Plan

### Phase 1: Preparation (30 minutes)

#### 1.1 Verify Environment Variables

**Check that these are set in `.env.local`:**
```bash
CONGRESS_API_KEY=your-key-here
RAINDROP_SERVICE_URL=https://your-raindrop-url
ALGOLIA_APP_ID=your-app-id
ALGOLIA_ADMIN_API_KEY=your-key
```

**Verify:**
```bash
npx tsx scripts/test-connections.ts
```

Create this test script if needed:
```typescript
// scripts/test-connections.ts
import { config } from 'dotenv';

config({ path: '.env.local' });

async function testConnections() {
  console.log('🔍 Testing connections...\n');

  // Test Congress.gov API
  const congressKey = process.env.CONGRESS_API_KEY;
  if (!congressKey) {
    console.error('❌ CONGRESS_API_KEY not set');
    return;
  }

  try {
    const response = await fetch(
      `https://api.congress.gov/v3/bill/119?api_key=${congressKey}&limit=1`
    );
    if (response.ok) {
      console.log('✅ Congress.gov API working');
    }
  } catch (error) {
    console.error('❌ Congress.gov API failed:', error);
  }

  // Test Raindrop SQL
  const raindropUrl = process.env.RAINDROP_SERVICE_URL;
  if (!raindropUrl) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    return;
  }

  try {
    const response = await fetch(`${raindropUrl}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT COUNT(*) as count FROM bills'
      })
    });
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Raindrop SQL working - Current bills:', data.rows[0].count);
    }
  } catch (error) {
    console.error('❌ Raindrop SQL failed:', error);
  }

  // Test Algolia
  const algoliaAppId = process.env.ALGOLIA_APP_ID;
  const algoliaKey = process.env.ALGOLIA_ADMIN_API_KEY;
  if (!algoliaAppId || !algoliaKey) {
    console.error('❌ Algolia credentials not set');
    return;
  }

  console.log('✅ Algolia credentials present');

  console.log('\n🎉 All connections verified!');
}

testConnections();
```

#### 1.2 Backup Existing Data

**Create backup:**
```bash
npx tsx scripts/backup-database.ts
```

**Backup script:**
```typescript
// scripts/backup-database.ts
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config({ path: '.env.local' });

async function backupDatabase() {
  const response = await fetch(`${process.env.RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT * FROM bills'
    })
  });

  const data = await response.json();
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  writeFileSync(
    `./backups/bills-backup-${timestamp}.json`,
    JSON.stringify(data.rows, null, 2)
  );

  console.log(`✅ Backup saved: bills-backup-${timestamp}.json`);
}

backupDatabase();
```

---

### Phase 2: Build Bulk Fetching Script (2 hours)

#### 2.1 Create Enhanced Fetching Script

**File:** `scripts/fetch-congress-bulk.ts`

**Features:**
- Fetch bills from multiple Congresses
- Handle rate limits (1 request/second)
- Progress tracking
- Error recovery
- Resume from failures
- Fetch additional data (cosponsors, committees, actions)

**High-Level Structure:**
```typescript
// scripts/fetch-congress-bulk.ts

interface FetchConfig {
  congresses: number[];      // [118, 119]
  billTypes: string[];       // ['hr', 's', 'hjres', 'sjres']
  startFrom?: string;        // Resume point (e.g., "119-hr-1000")
  fetchFullText: boolean;    // Fetch full text (slower)
  fetchCosponsors: boolean;  // Fetch cosponsor details
  fetchCommittees: boolean;  // Fetch committee details
  fetchActions: boolean;     // Fetch all actions
}

async function fetchCongressBulk(config: FetchConfig) {
  // 1. Get list of all bills from Congress.gov
  const billsList = await fetchBillsList(congress, billType);

  // 2. For each bill, fetch details
  for (const bill of billsList) {
    // Rate limit: 1 request/second
    await sleep(1000);

    // Fetch bill details
    const billData = await fetchBillDetails(congress, billType, billNumber);

    // Optional: Fetch additional data
    if (config.fetchCosponsors) {
      billData.cosponsors = await fetchCosponsors(bill);
    }
    if (config.fetchCommittees) {
      billData.committees = await fetchCommittees(bill);
    }

    // 3. Store in database
    await storeBillInDatabase(billData);

    // 4. Track progress
    console.log(`✅ Fetched: ${bill.id}`);
    saveProgress(bill.id);
  }
}
```

**Key Functions:**

1. **fetchBillsList()** - Get list of all bills for a Congress
```typescript
async function fetchBillsList(congress: number, billType: string): Promise<string[]> {
  const response = await fetch(
    `https://api.congress.gov/v3/bill/${congress}/${billType}?api_key=${API_KEY}&limit=250`
  );
  const data = await response.json();
  return data.bills.map(b => b.number);
}
```

2. **fetchBillDetails()** - Get full bill details
```typescript
async function fetchBillDetails(congress: number, type: string, number: number) {
  // Base bill info
  const billResponse = await fetch(
    `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${API_KEY}`
  );
  const bill = await billResponse.json();

  // Full text (if available)
  if (bill.textVersions?.length > 0) {
    const textUrl = bill.textVersions[0].formats[0].url;
    const textResponse = await fetch(textUrl);
    bill.fullText = await textResponse.text();
  }

  return bill;
}
```

3. **fetchCosponsors()** - Get cosponsor details
```typescript
async function fetchCosponsors(bill: any) {
  const response = await fetch(
    `https://api.congress.gov/v3/bill/${bill.congress}/${bill.type}/${bill.number}/cosponsors?api_key=${API_KEY}`
  );
  const data = await response.json();
  return data.cosponsors || [];
}
```

4. **fetchCommittees()** - Get committee details
```typescript
async function fetchCommittees(bill: any) {
  const response = await fetch(
    `https://api.congress.gov/v3/bill/${bill.congress}/${bill.type}/${bill.number}/committees?api_key=${API_KEY}`
  );
  const data = await response.json();
  return data.committees || [];
}
```

5. **storeBillInDatabase()** - Save to Raindrop SQL
```typescript
async function storeBillInDatabase(bill: any) {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        INSERT INTO bills (
          id, congress, bill_type, bill_number, title, summary,
          sponsor_name, sponsor_party, sponsor_state, sponsor_district,
          introduced_date, latest_action_date, latest_action_text,
          status, policy_area, issue_categories, full_text,
          cosponsor_count, committees, impact_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          latest_action_date = excluded.latest_action_date,
          latest_action_text = excluded.latest_action_text,
          status = excluded.status
      `,
      params: [
        bill.id,
        bill.congress,
        bill.type,
        bill.number,
        bill.title,
        bill.summary,
        bill.sponsor?.name,
        bill.sponsor?.party,
        bill.sponsor?.state,
        bill.sponsor?.district,
        bill.introducedDate,
        bill.latestAction?.actionDate,
        bill.latestAction?.text,
        bill.status,
        bill.policyArea?.name,
        JSON.stringify(bill.subjects?.legislativeSubjects || []),
        bill.fullText,
        bill.cosponsors?.length || 0,
        JSON.stringify(bill.committees?.map(c => c.name) || []),
        calculateImpactScore(bill)
      ]
    })
  });
}
```

**Progress Tracking:**
```typescript
// Save progress to resume from failures
function saveProgress(billId: string) {
  const progress = {
    lastProcessed: billId,
    timestamp: new Date().toISOString()
  };
  writeFileSync('./progress/fetch-progress.json', JSON.stringify(progress));
}

function loadProgress(): string | null {
  try {
    const data = readFileSync('./progress/fetch-progress.json', 'utf-8');
    return JSON.parse(data).lastProcessed;
  } catch {
    return null;
  }
}
```

---

### Phase 3: Execute Data Fetching (6-8 hours)

#### 3.1 Fetch 119th Congress (Current, ~8,000 bills)

**Run:**
```bash
npx tsx scripts/fetch-congress-bulk.ts --congress=119 --all-types
```

**Expected Output:**
```
🚀 Starting bulk fetch for 119th Congress
📊 Estimated bills: ~8,000
⏱️  Estimated time: 2-3 hours (rate limit: 1 req/sec)

Fetching HR bills...
✅ HR 1 - Fetched and stored
✅ HR 2 - Fetched and stored
...
✅ HR 8000 - Fetched and stored

Fetching S bills...
✅ S 1 - Fetched and stored
...

📦 Total fetched: 8,234 bills
✅ All bills stored in database
```

**Time:** ~2.5 hours (1 req/sec × 8,000 bills = 8,000 seconds = 2.2 hours + overhead)

#### 3.2 Fetch 118th Congress (Previous, ~15,000 bills)

**Run:**
```bash
npx tsx scripts/fetch-congress-bulk.ts --congress=118 --all-types
```

**Expected Output:**
```
🚀 Starting bulk fetch for 118th Congress
📊 Estimated bills: ~15,000
⏱️  Estimated time: 4-5 hours

...

📦 Total fetched: 14,892 bills
✅ All bills stored in database
```

**Time:** ~4.5 hours

#### 3.3 Verify Database

**Check counts:**
```bash
npx tsx scripts/check-database-counts.ts
```

**Expected:**
```
📊 Database Statistics:

Total bills: 23,126
  - 119th Congress: 8,234
  - 118th Congress: 14,892

By type:
  - HR: 15,234
  - S: 6,892
  - HJRES: 456
  - SJRES: 544

With full text: 18,234 (79%)
With cosponsors: 21,456 (93%)
With committees: 22,890 (99%)
```

---

### Phase 4: Index in SmartBuckets (1-2 hours)

#### 4.1 Prepare Bills for Indexing

**Create indexing script:**

**File:** `scripts/index-smartbuckets.ts`

```typescript
// scripts/index-smartbuckets.ts

async function indexBillsInSmartBuckets() {
  console.log('🚀 Starting SmartBuckets indexing...\n');

  // 1. Fetch all bills from database
  const bills = await fetchAllBills();
  console.log(`📊 Total bills to index: ${bills.length}\n`);

  // 2. Batch indexing (100 bills at a time)
  const BATCH_SIZE = 100;

  for (let i = 0; i < bills.length; i += BATCH_SIZE) {
    const batch = bills.slice(i, i + BATCH_SIZE);

    // Prepare documents for SmartBuckets
    const documents = batch.map(bill => ({
      id: bill.id,
      text: `${bill.title}\n\n${bill.summary}\n\n${bill.full_text?.substring(0, 4000)}`,
      metadata: {
        congress: bill.congress,
        billType: bill.bill_type,
        billNumber: bill.bill_number,
        sponsor: bill.sponsor_name,
        policyArea: bill.policy_area
      }
    }));

    // Upload batch to SmartBuckets
    await uploadBatchToSmartBuckets(documents);

    console.log(`✅ Indexed ${i + batch.length}/${bills.length} bills`);
  }

  console.log('\n✅ All bills indexed in SmartBuckets!');
}

async function uploadBatchToSmartBuckets(documents: any[]) {
  const response = await fetch(`${SMARTBUCKET_URL}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents })
  });

  if (!response.ok) {
    throw new Error(`SmartBuckets upload failed: ${response.status}`);
  }
}
```

**Run:**
```bash
npx tsx scripts/index-smartbuckets.ts
```

**Expected Output:**
```
🚀 Starting SmartBuckets indexing...

📊 Total bills to index: 23,126

✅ Indexed 100/23,126 bills
✅ Indexed 200/23,126 bills
...
✅ Indexed 23,126/23,126 bills

⏱️  Total time: 1h 15min
✅ All bills indexed in SmartBuckets!
```

---

### Phase 5: Sync to Algolia (30 minutes)

#### 5.1 Clear Existing Algolia Index

**Run:**
```bash
npx tsx scripts/sync-algolia-simple.ts --clear
```

#### 5.2 Sync All Bills to Algolia

**Run:**
```bash
npx tsx scripts/sync-algolia-simple.ts
```

**Expected Output:**
```
🚀 Starting Algolia Sync

App ID: YOUR_APP_ID
Index: bills

⚙️  Configuring index...
✅ Index configured

📥 Fetching bills from Raindrop database...
✅ Fetched 23,126 bills

🔄 Transforming records...
✅ Transformed 23,126 records

📊 Records with policy areas: 18,234/23,126

📤 Uploading to Algolia...
✅ Uploaded 23,126 records

============================================================
✨ Algolia sync complete!
============================================================
📊 Total synced: 23,126 bills
🔗 Dashboard: https://www.algolia.com/apps/[APP_ID]/explorer/browse/bills
============================================================
```

---

### Phase 6: Testing & Verification (1 hour)

#### 6.1 Test Database Queries

**Run tests:**
```bash
npx tsx scripts/test-database.ts
```

**Test cases:**
```typescript
// 1. Count by congress
SELECT congress, COUNT(*) as count
FROM bills
GROUP BY congress;

// Expected: 119: 8,234, 118: 14,892

// 2. Test full text availability
SELECT COUNT(*) as count
FROM bills
WHERE full_text IS NOT NULL;

// Expected: ~18,000+

// 3. Test sponsor data
SELECT COUNT(*) as count
FROM bills
WHERE sponsor_name IS NOT NULL;

// Expected: ~23,000

// 4. Test committees data
SELECT COUNT(*) as count
FROM bills
WHERE committees IS NOT NULL AND committees != '[]';

// Expected: ~22,000
```

#### 6.2 Test SmartBuckets Search

**Run:**
```bash
npx tsx scripts/test-smartbuckets-search.ts
```

**Test queries:**
```typescript
const testQueries = [
  "healthcare reform",
  "veteran benefits",
  "climate change legislation",
  "tax policy for small businesses",
  "education funding",
  "immigration reform"
];

for (const query of testQueries) {
  const results = await smartBucketsSearch(query);
  console.log(`Query: "${query}" - Found ${results.length} bills`);
}
```

**Expected:**
```
Query: "healthcare reform" - Found 15 bills
Query: "veteran benefits" - Found 15 bills
Query: "climate change legislation" - Found 15 bills
...
✅ All queries returning results
```

#### 6.3 Test Algolia Search

**Test in browser:**
```
http://localhost:3000/search?q=healthcare
http://localhost:3000/search?q=veteran
http://localhost:3000/search?q=climate
```

**Expected:**
- All searches return results in < 200ms
- Results include bills from both 118th and 119th Congress
- All bill cards display correctly with enhanced information

---

### Phase 7: Ongoing Maintenance

#### 7.1 Daily Updates

**Schedule:** Every 24 hours

**Script:** `scripts/update-bills-daily.ts`

```typescript
// Update existing bills + fetch new ones
async function dailyUpdate() {
  // 1. Fetch bills introduced in last 24 hours
  const newBills = await fetchRecentBills(119, 1); // Last 1 day

  // 2. Update existing bills (status changes, new actions)
  const updatedBills = await updateExistingBills();

  // 3. Re-index in SmartBuckets (only new/updated)
  await indexNewBills(newBills);

  // 4. Sync to Algolia (incremental)
  await syncToAlgolia(newBills.concat(updatedBills));

  console.log(`✅ Daily update complete: ${newBills.length} new, ${updatedBills.length} updated`);
}
```

**Cron job (via GitHub Actions or server cron):**
```yaml
# .github/workflows/daily-update.yml
name: Daily Bill Update
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Update bills
        run: npx tsx scripts/update-bills-daily.ts
```

#### 7.2 Weekly Full Refresh

**Schedule:** Every Sunday at 3 AM

**Purpose:** Catch any missed updates, fix data inconsistencies

```bash
npx tsx scripts/weekly-refresh.ts
```

---

## Resource Requirements

### Storage

**Database (SmartSQL):**
- ~23,000 bills × ~50 KB average = ~1.15 GB
- With full text: ~23,000 bills × ~200 KB = ~4.6 GB
- **Total:** ~5-6 GB

**SmartBuckets:**
- Vector embeddings: ~23,000 bills × ~1 KB = ~23 MB
- Text storage: ~4.6 GB (same as database)
- **Total:** ~4.7 GB

**Algolia:**
- ~23,000 records × ~2 KB = ~46 MB
- **Total:** ~50 MB (well within free tier: 10 GB)

### Compute Time

**Initial Fetch:**
- 118th Congress: ~4.5 hours
- 119th Congress: ~2.5 hours
- **Total:** ~7 hours

**Indexing:**
- SmartBuckets: ~1.5 hours
- Algolia: ~30 minutes
- **Total:** ~2 hours

**Grand Total:** ~9 hours (mostly automated, can run overnight)

### API Costs

**Congress.gov API:**
- Free (public API)
- Rate limit: 1 request/second
- 23,000 bills × 3 requests each (bill + cosponsors + committees) = ~69,000 requests
- Time: ~19 hours if sequential, ~7 hours with optimization

**Raindrop Platform:**
- SmartSQL: Included in plan
- SmartBuckets: Check usage limits (likely need Pro plan for 23K documents)

**Algolia:**
- Free tier: 10,000 records/month
- Need paid plan for 23,000 records (~$1/month for Search tier)

---

## Risk Mitigation

### 1. API Rate Limits

**Risk:** Congress.gov allows 1 request/second

**Mitigation:**
- Built-in rate limiting in fetching script
- Progress tracking to resume from failures
- Batch requests where possible

### 2. Incomplete Data

**Risk:** Some bills may not have full text or all metadata

**Mitigation:**
- Store what's available
- Mark incomplete records
- Retry failed fetches later

### 3. Database Errors

**Risk:** Database insert failures

**Mitigation:**
- Use transactions
- Implement retry logic
- Keep backup of source data

### 4. SmartBuckets Indexing Failures

**Risk:** Large batch uploads may timeout

**Mitigation:**
- Use smaller batches (100 bills)
- Retry failed batches
- Track indexing progress

### 5. Algolia Sync Failures

**Risk:** Network issues during sync

**Mitigation:**
- Use Algolia's batch API
- Implement chunked uploads
- Verify record counts after sync

---

## Success Criteria

### ✅ Data Completeness
- [ ] 23,000+ bills stored in database
- [ ] 90%+ have full text
- [ ] 95%+ have sponsor information
- [ ] 90%+ have committee information
- [ ] 85%+ have cosponsor counts

### ✅ Search Performance
- [ ] Keyword search (Algolia): < 200ms
- [ ] Semantic search (SmartBuckets): < 5 seconds
- [ ] All searches return relevant results

### ✅ Data Quality
- [ ] No duplicate bills
- [ ] All required fields populated
- [ ] Dates formatted correctly
- [ ] Arrays (committees, categories) parsed properly

### ✅ User Experience
- [ ] Search page loads quickly
- [ ] Bill cards display all information
- [ ] No errors in console
- [ ] Progress tracker shows correct status

---

## Rollback Plan

If something goes wrong:

1. **Stop all running scripts**
```bash
# Kill any running processes
pkill -f "fetch-congress"
pkill -f "index-smartbuckets"
```

2. **Restore from backup**
```bash
npx tsx scripts/restore-backup.ts --file=bills-backup-[timestamp].json
```

3. **Clear Algolia index**
```bash
npx tsx scripts/sync-algolia-simple.ts --clear
```

4. **Clear SmartBuckets**
```bash
npx tsx scripts/clear-smartbuckets.ts
```

5. **Start over from Phase 1**

---

## Execution Checklist

### Pre-Migration
- [ ] Verify all API keys are set
- [ ] Run connection tests
- [ ] Create database backup
- [ ] Estimate storage requirements
- [ ] Plan execution time (overnight recommended)

### Migration Day
- [ ] Phase 1: Preparation (30 min)
- [ ] Phase 2: Build scripts (2 hours) - can be done ahead
- [ ] Phase 3: Fetch data (7 hours) - run overnight
- [ ] Phase 4: Index SmartBuckets (2 hours)
- [ ] Phase 5: Sync Algolia (30 min)
- [ ] Phase 6: Testing (1 hour)

### Post-Migration
- [ ] Verify data completeness
- [ ] Test all search types
- [ ] Check performance metrics
- [ ] Set up daily updates
- [ ] Monitor for errors

---

## Next Steps

1. **Review this plan** - Make sure it aligns with goals
2. **Get approval** - Confirm budget and timeline
3. **Build scripts** - Phase 2 (can be done in advance)
4. **Schedule execution** - Pick a date/time
5. **Execute migration** - Follow phases 3-6
6. **Monitor and maintain** - Set up daily updates

---

## Questions to Answer Before Starting

1. **Do we have Raindrop Pro plan?** (Need for 23K SmartBuckets documents)
2. **Do we have Algolia paid plan?** (Need for 23K records)
3. **What's our Congress.gov API key rate limit?** (Affects timing)
4. **Do we want ALL bills or just active/introduced ones?**
5. **Should we fetch 117th Congress too?** (2021-2022, another ~15K bills)
6. **How often should we run full refreshes?** (Weekly? Monthly?)

---

**Last Updated:** October 29, 2025
**Author:** Claude + Tarik Moody
**Status:** Planning Phase
**Estimated Cost:** ~$50-100/month (Raindrop Pro + Algolia)
**Estimated Time:** 10-13 hours (mostly automated)
