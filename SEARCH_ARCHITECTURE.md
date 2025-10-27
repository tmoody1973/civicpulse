# Civic Pulse Search Architecture

Complete implementation guide for the dual-database search system.

---

## Overview

Civic Pulse uses a **two-tier data architecture** that combines:
- **Raindrop SmartSQL** (SQLite) - Source of truth for complete bill data
- **Algolia** - Fast search index with truncated data

This architecture provides:
- ✅ Instant search (< 20ms via Algolia)
- ✅ Complete bill data (via SmartSQL, no size limits)
- ✅ Automatic fallback (Congress.gov API for brand new bills)
- ✅ Progressive enhancement (bills cached after first search)

---

## Data Flow

```
Congress.gov API
      ↓
   Enhance Bill (add metadata, categorize, score)
      ↓
   ┌─────────────────┐
   │   SmartSQL DB   │ ← Source of truth (complete data)
   │  (Raindrop)     │
   └─────────────────┘
      ↓
   ┌─────────────────┐
   │   Algolia       │ ← Search index (truncated data)
   │  (Search Index) │
   └─────────────────┘
```

### Search Flow

```
User searches "climate bill"
      ↓
   Try Algolia (< 20ms)
      ↓
   Found? → Return results from Algolia
      ↓
   Not found? → Fallback to Congress.gov API
      ↓
   Fetch from Congress.gov (~800ms)
      ↓
   Enhance bill
      ↓
   Store in SmartSQL (source of truth)
      ↓
   Sync to Algolia (search index)
      ↓
   Return results
      ↓
   Next search is instant (Algolia)
```

---

## Database Schema (SmartSQL)

### Bills Table

**Purpose**: Complete bill records with full metadata

```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,                    -- "hr1-119"
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,                -- hr, s, hjres, etc.
  bill_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,                           -- FULL summary (no size limit)
  full_text TEXT,                         -- Optional: complete bill text

  -- Sponsor info
  sponsor_bioguide_id TEXT,
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,

  -- Status and dates
  introduced_date TEXT NOT NULL,
  latest_action_date TEXT NOT NULL,
  latest_action_text TEXT,
  status TEXT NOT NULL,                   -- introduced, passed_house, etc.

  -- Enhanced metadata
  issue_categories TEXT,                  -- JSON: ["Healthcare", "Economy"]
  impact_score INTEGER DEFAULT 0,         -- 0-100
  cosponsor_count INTEGER DEFAULT 0,
  cosponsors TEXT,                        -- JSON: {"count": 45, "names": [...]}

  -- URLs
  congress_url TEXT,

  -- Sync tracking
  synced_to_algolia_at DATETIME,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(congress, bill_type, bill_number)
);
```

**Indexes**:
- `idx_bills_congress_date` - Fast congress + date lookups
- `idx_bills_sponsor` - Sponsor-based queries
- `idx_bills_status` - Status filtering
- `idx_bills_impact` - Trending/high-impact bills
- `idx_bills_sync` - Find bills needing Algolia sync

---

## Algolia Index Configuration

### Index Settings

```typescript
{
  // Searchable attributes (ranked by importance)
  searchableAttributes: [
    'title',
    'billNumber',
    'summary',
    'sponsor.name',
    'cosponsor.names',
    'issueCategories'
  ],

  // Faceted filtering
  attributesForFaceting: [
    'searchable(issueCategories)',
    'billType',
    'status',
    'sponsor.party',
    'sponsor.state',
    'congress',
    'introducedDate'
  ],

  // Custom ranking (relevance tiebreakers)
  customRanking: [
    'desc(impactScore)',
    'desc(introducedDate)',
    'desc(cosponsorCount)'
  ],

  // Search quality
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  hitsPerPage: 20,
}
```

### Bill Record Format (Algolia)

**IMPORTANT**: Truncated to stay under 10KB limit

```typescript
{
  objectID: 'hr1-119',
  billNumber: 'HR 1',
  billType: 'hr',
  congress: 119,
  title: 'Bill title... (max 500 chars)',
  summary: 'Truncated summary... (max 5000 chars)',   // TRUNCATED
  sponsor: {
    name: 'Rep. Smith',
    party: 'Democratic',
    state: 'California',
    bioguideId: 'S000001'
  },
  cosponsors: { count: 45, names: [...] },
  issueCategories: ['Healthcare', 'Economy'],
  status: 'passed_house',
  introducedDate: 1704067200000,           // Unix timestamp
  latestAction: 'Passed House (max 500 chars)',  // TRUNCATED
  latestActionDate: 1709251200000,
  impactScore: 85,
  url: '/bills/hr1-119',
  cosponsorCount: 45
}
```

---

## File Structure

```
lib/
├── api/
│   ├── congress.ts              # Congress.gov API client
│   └── congress-enhanced.ts     # Bill enhancement (categories, scoring)
├── db/
│   ├── schema.sql               # SmartSQL database schema
│   ├── index.ts                 # Generic DB utilities
│   └── bills.ts                 # Bill-specific DB operations ⭐ NEW
├── search/
│   ├── algolia-config.ts        # Algolia client + index settings
│   ├── algolia-sync.ts          # Dual sync (SmartSQL + Algolia) ⭐ UPDATED
│   └── smart-search.ts          # Smart search with fallback

app/api/
└── search-congress/
    └── route.ts                 # Fallback API endpoint

scripts/
├── sync-algolia.ts              # Full/incremental sync scripts
└── test-search.ts               # End-to-end test
```

---

## Key Functions

### SmartSQL Bill Storage (`lib/db/bills.ts`)

```typescript
// Store complete bill data
await storeBillInDatabase(bill: EnhancedBill)

// Batch storage
await storeBillsBatch(bills: EnhancedBill[])

// Retrieve complete bill (no truncation)
const bill = await getBillById(billId: string)

// Get bills by congress
const bills = await getBillsByCongress(119, {
  limit: 20,
  status: 'enacted',
  minImpactScore: 70
})

// Get trending bills
const trending = await getTrendingBills(10)

// Sync tracking
await markBillSyncedToAlgolia(billId)
const needsSync = await getBillsNeedingSync(100)

// Statistics
const stats = await getBillDatabaseStats()
```

### Dual Sync (`lib/search/algolia-sync.ts`)

```typescript
// Syncs to BOTH SmartSQL and Algolia
await syncBillsBatch(bills: EnhancedBill[])
await syncSingleBill(bill: EnhancedBill)

// Process:
// 1. Store complete data in SmartSQL
// 2. Transform + truncate for Algolia
// 3. Sync to Algolia
// 4. Mark as synced
```

### Smart Search (`lib/search/smart-search.ts`)

```typescript
// Two-tier search with automatic fallback
const result = await smartSearch('climate bill', {
  congress: 119,
  hitsPerPage: 20,
  facetFilters: [
    ['issueCategories:Climate'],
    ['status:enacted']
  ]
})

// Returns:
{
  results: AlgoliaBill[],
  source: 'algolia' | 'congress-api',
  searchTime: 18,  // milliseconds
  totalHits: 156,
  message: '✨ Found in Congress.gov! ...'
}
```

---

## Usage Examples

### 1. Full Sync (Initial Load)

```bash
# Sync all bills from Congress 119 to both SmartSQL and Algolia
npm run sync-algolia:full 119
```

This will:
1. Fetch bills from Congress.gov (batches of 250)
2. Enhance each bill (categorize + score)
3. Store in SmartSQL database
4. Sync to Algolia search index
5. Mark as synced

### 2. Incremental Sync (Daily Cron)

```bash
# Sync recent bills (last 24 hours)
npm run sync-algolia:incremental
```

This will:
1. Fetch recently updated bills (250 most recent)
2. Enhance bills
3. Update SmartSQL records
4. Update Algolia index
5. Much faster than full sync (~30 seconds vs 30 minutes)

### 3. Search with Fallback

```typescript
import { smartSearch } from '@/lib/search/smart-search';

// User searches for a bill
const result = await smartSearch('HR 1234', {
  congress: 119,
  hitsPerPage: 20
});

// If in Algolia: < 20ms
// If not in Algolia: ~800ms (fetches from Congress.gov + syncs)
// Next search: < 20ms (now in Algolia)
```

### 4. Get Bill Details (for detail page)

```typescript
import { getBillById } from '@/lib/db/bills';

// Get COMPLETE bill data from SmartSQL (no truncation)
const bill = await getBillById('hr1-119');

// Use this for bill detail pages:
// - Full summary (not truncated like Algolia)
// - Complete metadata
// - Offline-capable (if full_text is stored)
```

### 5. Trending Bills

```typescript
import { getTrendingBills } from '@/lib/db/bills';

// Get top 10 high-impact bills
const trending = await getTrendingBills(10);

// Returns bills sorted by:
// 1. Impact score (0-100)
// 2. Latest action date
```

---

## Performance Characteristics

### Search Performance

| Source | Speed | Data Completeness | When Used |
|--------|-------|-------------------|-----------|
| Algolia | < 20ms | Truncated (searchable) | Primary search |
| SmartSQL | ~50ms | Complete (full text) | Bill detail pages |
| Congress.gov | ~800ms | Complete (authoritative) | Fallback only |

### Sync Performance

| Operation | Time | Frequency |
|-----------|------|-----------|
| Full sync (10k bills) | ~30 min | Once (initial) |
| Incremental sync (250 bills) | ~30 sec | Daily |
| Single bill sync | ~2 sec | On-demand |

### Storage Comparison

| System | Record Size | Total for 10k bills |
|--------|-------------|---------------------|
| SmartSQL | Unlimited | ~50 MB |
| Algolia | < 10 KB | ~100 MB (indexed) |
| Congress.gov | N/A | Source of truth |

---

## Error Handling

### Graceful Degradation

```typescript
// If SmartSQL fails, sync still works (Algolia only)
try {
  await storeBillInDatabase(bill);
} catch (error) {
  console.error('SmartSQL storage failed, continuing with Algolia...');
}

await algoliaAdmin.saveObjects({ ... });  // Still syncs to Algolia
```

### Fallback Chain

```
User Search
  ↓
Try Algolia
  ↓ (if empty)
Try Congress.gov API
  ↓ (if fails)
Show cached results (if available)
  ↓ (if no cache)
Show error message
```

---

## Benefits of Dual-Database Approach

### ✅ Performance
- Algolia: < 20ms search (instant)
- SmartSQL: ~50ms queries (fast detail pages)
- No reliance on slow Congress.gov API (800ms)

### ✅ Data Completeness
- Algolia: Truncated for search (5KB summaries)
- SmartSQL: Complete data (unlimited size)
- Full bill text can be stored for offline access

### ✅ Reliability
- Algolia: 99.99% uptime
- SmartSQL: Local/controlled (Raindrop backend)
- Congress.gov: Fallback only (reduce dependency)

### ✅ Features
- SmartSQL: User interactions (bookmarks, views, shares)
- SmartSQL: Bill popularity tracking
- SmartSQL: Podcast generation (bills covered tracking)
- Algolia: Advanced search (facets, filters, typo tolerance)

### ✅ Cost Efficiency
- Algolia: Pay per search operation
- SmartSQL: Flat cost (Raindrop plan)
- Reduced Congress.gov API calls (rate limited)

---

## Next Steps

1. ✅ **Database Schema** - Complete
2. ✅ **SmartSQL Utilities** - Complete
3. ✅ **Dual Sync Logic** - Complete
4. ⏳ **Search UI** - Next task (React InstantSearch)
5. ⏳ **Bill Detail Pages** - Use `getBillById()`
6. ⏳ **Podcast Integration** - Query SmartSQL for bills
7. ⏳ **User Interactions** - Bookmarks, views, shares

---

## Testing

```bash
# Test end-to-end flow
npm run test:search

# This will:
# 1. Search Algolia (empty)
# 2. Fallback to Congress.gov
# 3. Store in SmartSQL
# 4. Sync to Algolia
# 5. Verify searchable
```

---

**Summary**: Civic Pulse now has a robust, performant, and scalable search system that combines the speed of Algolia with the completeness of SmartSQL. Users get instant search results, complete bill data, and automatic fallback to Congress.gov for brand new bills.
