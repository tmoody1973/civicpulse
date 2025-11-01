# Bill Auto-Sync System

**Status:** ✅ Implemented
**Date:** November 1, 2025

## Overview

Hybrid bill synchronization system that keeps data fresh without long-running nightly syncs.

## Problem Solved

**Before:**
- Nightly sync fetched ALL bills with full metadata (8+ hours)
- Data could be 24 hours stale
- Viewing a bill showed yesterday's information
- New bills without full text stayed incomplete

**After:**
- Nightly sync fetches only NEW bills, metadata only (5 minutes)
- Bills auto-refresh when viewed if stale (>24 hours old)
- Full text gets added automatically when available
- Users always see fresh data

## Architecture

### 1. **Nightly Sync (GitHub Actions)**
Discovers new bills, stores basic metadata only

```yaml
# Runs at 2 AM UTC daily
npm run fetch:bills -- --congress=119 --limit=50
# NO --full flag = metadata only
# Takes ~5 minutes for 20-50 new bills per day
```

**Fetches:**
- ✅ Bill title, number, type, congress
- ✅ Sponsor name, party, state
- ✅ Introduction date, latest action date
- ✅ Status (introduced, passed, etc.)
- ❌ NO full text (too slow)
- ❌ NO cosponsors (too slow)
- ❌ NO detailed actions (too slow)
- ❌ NO subjects (too slow)

### 2. **Auto-Sync on View**
When user views a bill detail page, automatically refreshes if stale

```typescript
// Bill detail page logic
const bill = await getBill(billId);

// Check if needs refresh
const isStale = Date.now() - bill.updated_at > 24 * 60 * 60 * 1000; // >24 hours
const needsFullText = !bill.full_text;

if (isStale || needsFullText) {
  // Refresh in background (non-blocking)
  fetch(`/api/bills/${billId}/refresh`, { method: 'POST' });
}

// Show current data immediately (don't wait for refresh)
return bill;
```

**Fetches:**
- ✅ Summary
- ✅ Full text
- ✅ All cosponsors
- ✅ Complete action history
- ✅ Policy area + legislative subjects
- ✅ Updated sponsor info

**Performance:**
- ~6 API calls to Congress.gov
- ~6-10 seconds total
- Non-blocking (runs in background)
- User sees cached data immediately

## API Endpoint

### `POST /api/bills/[billId]/refresh`

Refreshes a single bill with complete details from Congress.gov.

**Request:**
```bash
curl -X POST http://localhost:3000/api/bills/119-hr-1234/refresh
```

**Response:**
```json
{
  "success": true,
  "billId": "119-hr-1234",
  "updated": {
    "hasFullText": true,
    "cosponsorCount": 23,
    "actionCount": 12,
    "subjectCount": 8,
    "policyArea": "Healthcare"
  }
}
```

**Error Response:**
```json
{
  "error": "Failed to refresh bill",
  "details": "Congress API error: 404 Not Found"
}
```

## Database Schema

No changes required. Uses existing `bills` table with these key fields:

```sql
- updated_at TIMESTAMP       -- Auto-updated on INSERT OR REPLACE
- full_text TEXT             -- May be NULL initially
- summary TEXT               -- May be NULL initially
- cosponsors TEXT            -- JSON array, may be empty
- actions TEXT               -- JSON array, may be empty
- policy_area TEXT           -- May be NULL initially
```

## User Experience

### Scenario 1: User views popular bill
1. Page loads instantly with cached data
2. If bill is stale (>24h old), refresh starts in background
3. User reads current data
4. After 6-10 seconds, page updates with latest data (via client-side refresh or next visit)

### Scenario 2: User views new bill without full text
1. Page loads with metadata (title, sponsor, status)
2. Auto-sync detects missing full text
3. Fetches full text in background
4. Updates database
5. Next page load shows complete bill with full text

### Scenario 3: User tracks a bill
1. Bill gets auto-refreshed when they view it
2. If significant changes detected, show notification
3. User sees what changed (new actions, cosponsors, etc.)

## Implementation

### Step 1: API Route
File: `app/api/bills/[billId]/refresh/route.ts`

Fetches complete bill details and updates database.

### Step 2: Bill Detail Page Auto-Sync
File: `app/bills/[billId]/page.tsx`

```typescript
export default async function BillDetailPage({ params }: { params: { billId: string } }) {
  const billId = params.billId;

  // Get bill from database
  const bill = await getBillFromDatabase(billId);

  if (!bill) {
    notFound();
  }

  // Check if needs refresh (don't await, let it run in background)
  const updatedAt = new Date(bill.updated_at).getTime();
  const isStale = Date.now() - updatedAt > 24 * 60 * 60 * 1000; // 24 hours
  const needsFullText = !bill.full_text;

  if (isStale || needsFullText) {
    // Fire and forget - don't block page render
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bills/${billId}/refresh`, {
      method: 'POST'
    }).catch(err => console.error('Background refresh failed:', err));
  }

  return <BillDetailPageComponent bill={bill} />;
}
```

### Step 3: Update GitHub Actions
File: `.github/workflows/daily-bill-sync.yml`

```yaml
- name: Fetch new bills (metadata only, fast)
  run: |
    echo "📥 Fetching new bills from last 24 hours..."
    echo "⚡ Metadata only - full details fetched on demand"
    npm run fetch:bills -- --congress=119 --limit=50
    echo "✅ New bills discovered and indexed"
```

## Benefits

### Performance
- ✅ Nightly sync: 8+ hours → **5 minutes**
- ✅ GitHub Actions stays under 120min timeout
- ✅ Page loads remain fast (cached data)
- ✅ Only popular bills get full details (saves API quota)

### Data Freshness
- ✅ Viewed bills always fresh (<24h old)
- ✅ Full text appears automatically when published
- ✅ Cosponsors, actions stay current
- ✅ User always sees latest info

### Cost Efficiency
- ✅ Fewer Congress.gov API calls overall
- ✅ Only fetch details for bills people view
- ✅ Don't fetch cosponsors/actions for bills nobody reads
- ✅ Rate limits stay under control

### User Experience
- ✅ Instant page loads
- ✅ Always up-to-date data
- ✅ No stale information
- ✅ Background updates don't block UI

## Future Enhancements

### 1. Manual Refresh Button
Add UI button for user-triggered refresh:
```tsx
<Button onClick={() => refreshBill(billId)}>
  🔄 Refresh from Congress.gov
</Button>
```

### 2. Change Notifications
Track changes and notify users:
```typescript
if (billWasUpdated && userIsTracking(billId)) {
  showNotification({
    title: 'Bill Updated',
    message: `${bill.title} has ${changes.length} new actions`,
    changes: [
      'Added 3 new cosponsors',
      'Passed House vote (230-195)',
      'Sent to Senate'
    ]
  });
}
```

### 3. Real-time Updates
Use webhooks or polling for critical bills:
- Watch tracked bills every hour
- Show live updates for votes in progress
- Alert when bill status changes

### 4. Smart Caching Strategy
```typescript
// Cache bills by importance
const cacheTTL = {
  tracked: 1 * 60 * 60 * 1000,      // 1 hour
  popular: 6 * 60 * 60 * 1000,      // 6 hours
  default: 24 * 60 * 60 * 1000      // 24 hours
};
```

## Monitoring

### Metrics to Track
- Refresh requests per day
- Average refresh time
- Cache hit rate
- Stale bill percentage
- Full text backfill rate

### Logs to Watch
```bash
# Check refresh activity
grep "🔄 Refreshing bill" logs/app.log

# Check success rate
grep "✅ Successfully refreshed" logs/app.log

# Check failures
grep "❌ Error refreshing bill" logs/app.log
```

## Troubleshooting

### Bill not refreshing
**Symptom:** Bill shows old data even after viewing

**Check:**
1. Is `updated_at` being set correctly?
2. Is background fetch completing?
3. Check browser console for errors
4. Verify Congress.gov API is responding

**Fix:**
```bash
# Manually trigger refresh
curl -X POST http://localhost:3000/api/bills/119-hr-1234/refresh
```

### Congress.gov rate limiting
**Symptom:** 429 errors in logs

**Fix:**
- Reduce simultaneous refreshes
- Add backoff/retry logic
- Cache more aggressively

### Full text not appearing
**Symptom:** `needsFullText` triggers but text stays null

**Check:**
1. Does bill have published text on Congress.gov?
2. Is API returning 404?
3. Check bill age (new bills may not have text yet)

**Solution:** Bill text gets published days/weeks after introduction. Auto-sync will keep trying on each view.

## Testing

### Manual Test
```bash
# 1. View a bill
curl http://localhost:3000/api/bills/119-hr-1234

# 2. Trigger refresh
curl -X POST http://localhost:3000/api/bills/119-hr-1234/refresh

# 3. Verify updated
curl http://localhost:3000/api/bills/119-hr-1234
# Check updated_at timestamp

# 4. Check logs
tail -f logs/app.log | grep "119-hr-1234"
```

### Automated Test
```typescript
describe('Bill Auto-Sync', () => {
  it('refreshes stale bills automatically', async () => {
    // Set bill updated_at to 25 hours ago
    await setBillUpdatedAt('119-hr-1', Date.now() - 25 * 60 * 60 * 1000);

    // View bill page
    await page.goto('/bills/119-hr-1');

    // Wait for background refresh
    await page.waitForTimeout(10000);

    // Check bill was updated
    const bill = await getBill('119-hr-1');
    expect(bill.updated_at).toBeRecent();
  });
});
```

## Related Files

- `app/api/bills/[billId]/refresh/route.ts` - Refresh API endpoint
- `app/bills/[billId]/page.tsx` - Bill detail page with auto-sync
- `.github/workflows/daily-bill-sync.yml` - Nightly new bill discovery
- `scripts/fetch-bills.ts` - Bill fetching script
- `lib/api/congress.ts` - Congress.gov API client

## References

- [Congress.gov API Documentation](https://api.congress.gov/)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/using-workflows)
