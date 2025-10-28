# Legislation Search Implementation Plan

**Status:** Ready for Implementation
**Platform:** Raindrop + Algolia + Congress.gov API
**Target:** Simple for casual users, powerful for advanced users
**Date:** October 28, 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Analysis](#architecture-analysis)
3. [Three-Layer Search Strategy](#three-layer-search-strategy)
4. [Raindrop Platform Integration](#raindrop-platform-integration)
5. [Search UX Design](#search-ux-design)
6. [Bill Tracking Workflow](#bill-tracking-workflow)
7. [Implementation Phases](#implementation-phases)
8. [Performance & Cost Optimization](#performance--cost-optimization)
9. [API Reference](#api-reference)

---

## Executive Summary

### The Vision
Users should be able to find bills **as easily as Googling**—whether they know the bill number or just have a vague idea ("something about student loans"). From search results, tracking a bill should be **one tap away**.

### Three Search Paths
Based on user research from the existing strategy document:

1. **Directed Search (20%)**: "Find H.R. 1234" → Instant bill card
2. **Exploratory Search (60%)**: "Show me healthcare bills" → Faceted filtering
3. **Discovery Search (20%)**: "How does this affect me?" → AI-powered relevance

### Technology Stack
- **Algolia**: Lightning-fast full-text search (<50ms)
- **Raindrop SQL**: Canonical bill database (Congress.gov sync)
- **Raindrop KV Cache**: Query result caching (1hr TTL)
- **Raindrop SmartBuckets**: Semantic search for plain-English queries
- **Congress.gov API**: Authoritative bill data source

---

## Architecture Analysis

### Current Strategy Strengths (Algolia-Based)

From `/docs/civic-pulse-legislation-search-strategy.md`:

**What Works:**
- ✅ Sub-50ms search response times
- ✅ Typo tolerance (1-2 character mistakes)
- ✅ Faceted search with real-time filter updates
- ✅ Location-based personalization
- ✅ Autocomplete with instant suggestions
- ✅ Mobile-optimized search overlay
- ✅ Teacher-specific features (curriculum alignment)

**Index Configuration:**
```javascript
// Searchable attributes (priority order)
[
  'billNumber',           // Highest priority
  'title',
  'shortTitle',
  'plainEnglishSummary',
  'summary',
  'sponsorName',
  'cosponsorNames',
  'topics'
]

// Custom ranking (relevance tiebreakers)
[
  'desc(trackingCount)',    // Popular bills first
  'desc(progressScore)',    // Active bills first
  'desc(bipartisanScore)',  // Bipartisan bills boosted
  'desc(introducedTimestamp)' // Recent bills preferred
]
```

**Facets:**
- Issue categories (healthcare, education, environment)
- Bill status (introduced, passed House, passed Senate, enacted)
- Congressional session (118th, 117th, etc.)
- Sponsor party (Democrat, Republican, Independent)
- States affected (location-based)
- Bipartisan support level

### Integration Opportunities with Raindrop

**Why Not Just Algolia?**
- Algolia is **read-only search**—we still need a canonical database
- Congress.gov API requires sync logic and rate limiting
- Search results need user context (tracked bills, location, interests)
- Bill tracking requires persistent storage

**Raindrop Platform Roles:**

1. **Raindrop SQL (Primary Database)**
   - Canonical source of truth for bills
   - Stores full bill text, metadata, relationships
   - User tracking preferences (bills, reps, topics)
   - SQL queries for complex filters

2. **Algolia (Search Index)**
   - Synced from Raindrop SQL (one-way)
   - Fast full-text search
   - Autocomplete and suggestions
   - Faceted filtering UI

3. **Raindrop KV Cache (Performance Layer)**
   - Cache popular search queries (1hr TTL)
   - Cache Congress.gov API responses (24hr TTL)
   - Cache Algolia results for repeated queries

4. **Raindrop SmartBuckets (Semantic Layer)**
   - Plain-English queries ("bills about climate")
   - Semantic search on bill summaries
   - AI-powered relevance for discovery mode

**Data Flow:**
```
Congress.gov API → Raindrop SQL (canonical) → Algolia (indexed)
                                           ↓
                                    User Search Query
                                           ↓
                    ┌──────────────────────┴──────────────────────┐
                    ↓                      ↓                       ↓
            Directed Search        Exploratory Search      Discovery Search
         (Bill number lookup)    (Faceted filtering)    (Semantic matching)
                    ↓                      ↓                       ↓
             Raindrop SQL              Algolia              SmartBuckets
                    ↓                      ↓                       ↓
                    └──────────────────────┴──────────────────────┘
                                           ↓
                                   Merged Results
                                           ↓
                                   Personalization
                              (Location, Interests, Tracked Bills)
                                           ↓
                                    Ranked Results
```

---

## Three-Layer Search Strategy

### Layer 1: Directed Search (Bill Number Lookup)

**User Intent:** "I know the bill number, just show me the bill."

**Examples:**
- "H.R. 1234"
- "S. 567"
- "HR1234" (no spaces)

**Implementation:**
```typescript
// lib/search/directed-search.ts
import { executeQuery } from '@/lib/db/client';

export async function directBillLookup(
  query: string,
  env: Env
): Promise<Bill | null> {
  // Parse bill number (H.R. 1234, S. 567, etc.)
  const billPattern = /^(H\.?R\.?|S\.?)\s*(\d+)$/i;
  const match = query.trim().match(billPattern);

  if (!match) return null;

  const chamber = match[1].toLowerCase().includes('s') ? 'Senate' : 'House';
  const number = parseInt(match[2]);

  // Direct SQL lookup (fastest path)
  const result = await executeQuery(
    `SELECT * FROM bills
     WHERE chamber = ? AND bill_number = ?
     ORDER BY congress DESC
     LIMIT 1`,
    'bills',
    [chamber, number]
  );

  return result.rows[0] || null;
}
```

**Performance:**
- SQL query: <10ms
- No Algolia call needed
- Cache in KV Cache for 1hr

**UX:**
- Instant result card
- "Is this what you're looking for?" confirmation
- Option to see older versions (previous congresses)

---

### Layer 2: Exploratory Search (Faceted Filtering)

**User Intent:** "I want to browse bills by topic/status/party."

**Examples:**
- "healthcare bills"
- "bills passed by the House"
- "education bills sponsored by Republicans"

**Implementation:**
```typescript
// lib/search/exploratory-search.ts
import algoliasearch from 'algoliasearch';

export async function exploratorySearch(
  query: string,
  filters: SearchFilters,
  userId: string,
  env: Env
): Promise<SearchResults> {
  const algolia = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_SEARCH_KEY!
  );

  const index = algolia.initIndex('bills');

  // Build Algolia filters
  const filterString = buildAlgoliaFilters(filters);

  // Apply personalization
  const userProfile = await getUserProfile(userId, env);
  const optionalFilters = buildPersonalizationFilters(userProfile);

  // Search Algolia
  const results = await index.search(query, {
    filters: filterString,
    optionalFilters,
    facets: [
      'issueCategories',
      'billStatus',
      'sponsorParty',
      'statesAffected',
      'bipartisanScore'
    ],
    hitsPerPage: 20,
    page: filters.page || 0
  });

  return {
    hits: results.hits,
    facets: results.facets,
    pagination: {
      total: results.nbHits,
      page: results.page,
      totalPages: results.nbPages
    }
  };
}

function buildAlgoliaFilters(filters: SearchFilters): string {
  const parts: string[] = [];

  if (filters.issueCategories?.length) {
    const categories = filters.issueCategories
      .map(cat => `issueCategories:"${cat}"`)
      .join(' OR ');
    parts.push(`(${categories})`);
  }

  if (filters.billStatus?.length) {
    const statuses = filters.billStatus
      .map(status => `billStatus:"${status}"`)
      .join(' OR ');
    parts.push(`(${statuses})`);
  }

  if (filters.sponsorParty) {
    parts.push(`sponsorParty:"${filters.sponsorParty}"`);
  }

  return parts.join(' AND ');
}

function buildPersonalizationFilters(
  profile: UserProfile
): string[] {
  const filters: string[] = [];

  // Boost bills affecting user's state
  if (profile.state) {
    filters.push(`statesAffected:${profile.state}<score=3>`);
  }

  // Boost bills matching user interests
  profile.interests?.forEach(interest => {
    filters.push(`issueCategories:${interest}<score=2>`);
  });

  // Boost bills from user's representatives
  profile.representatives?.forEach(rep => {
    filters.push(`sponsorBioguideId:${rep.bioguide_id}<score=2>`);
  });

  return filters;
}
```

**Performance:**
- Algolia query: <50ms
- Facet counts: Real-time
- Cache popular query/filter combos in KV Cache

**UX:**
- Real-time facet updates (no page reload)
- Visual filter pills (easy to remove)
- "Show more filters" progressive disclosure
- Mobile: Slide-up filter drawer

---

### Layer 3: Discovery Search (Semantic Matching)

**User Intent:** "I don't know what I'm looking for, help me find it."

**Examples:**
- "bills that help college students with debt"
- "how will this affect small businesses in Wisconsin"
- "what are they doing about climate change"

**Implementation:**
```typescript
// lib/search/discovery-search.ts
import { SmartBucket } from '@raindrop/sdk';

export async function discoverySearch(
  naturalLanguageQuery: string,
  userId: string,
  env: Env
): Promise<DiscoveryResults> {
  // Step 1: SmartBuckets semantic search
  const semanticResults = await env.BILL_SUMMARIES.chunkSearch({
    input: naturalLanguageQuery,
    requestId: `discovery-${userId}-${Date.now()}`
  });

  // Step 2: Extract bill IDs from semantic matches
  const billIds = semanticResults.results
    .filter(result => result.score && result.score > 0.7)
    .map(result => extractBillId(result.source))
    .slice(0, 20);

  // Step 3: Fetch full bill data from SQL
  const bills = await executeQuery(
    `SELECT * FROM bills
     WHERE id IN (${billIds.map(() => '?').join(',')})`,
    'bills',
    billIds
  );

  // Step 4: Re-rank with user context
  const userProfile = await getUserProfile(userId, env);
  const rankedBills = rankByRelevance(
    bills.rows,
    userProfile,
    semanticResults.results
  );

  // Step 5: Generate AI explanation
  const explanation = await generateSearchExplanation(
    naturalLanguageQuery,
    rankedBills.slice(0, 3),
    env
  );

  return {
    bills: rankedBills,
    explanation,
    semanticScores: semanticResults.results
  };
}

function rankByRelevance(
  bills: Bill[],
  profile: UserProfile,
  semanticScores: SearchResult[]
): RankedBill[] {
  return bills.map(bill => {
    let score = 0;

    // 50% semantic relevance
    const semanticMatch = semanticScores.find(
      s => extractBillId(s.source) === bill.id
    );
    score += (semanticMatch?.score || 0) * 0.5;

    // 20% location relevance
    if (bill.states_affected?.includes(profile.state)) {
      score += 0.2;
    }

    // 20% interest alignment
    const interestOverlap = bill.issue_categories.filter(
      cat => profile.interests?.includes(cat)
    ).length;
    score += (interestOverlap / Math.max(bill.issue_categories.length, 1)) * 0.2;

    // 10% tracking popularity
    score += Math.min(bill.tracking_count / 1000, 1) * 0.1;

    return { ...bill, relevanceScore: score };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

async function generateSearchExplanation(
  query: string,
  topBills: Bill[],
  env: Env
): Promise<string> {
  const prompt = `User searched for: "${query}"

Top results:
${topBills.map((b, i) => `${i + 1}. ${b.bill_number}: ${b.title}`).join('\n')}

Explain in 1-2 sentences why these bills match the search.`;

  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    prompt,
    max_tokens: 100
  });

  return response.response;
}
```

**Performance:**
- SmartBuckets query: <200ms
- SQL fetch: <50ms
- AI explanation: <500ms
- Total: <800ms

**UX:**
- AI-generated explanation: "I found 12 bills about student loan forgiveness..."
- Top 3 results highlighted with relevance scores
- "Show me more like this" quick action
- Option to switch to faceted search

---

## Raindrop Platform Integration

### Database Schema (Raindrop SQL)

```sql
-- db/civic-db/bills-search.sql

-- Bills table (canonical source)
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL, -- hr, s, hjres, sjres
  bill_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  short_title TEXT,
  plain_english_summary TEXT,
  summary TEXT,
  introduced_date DATE,
  bill_status TEXT, -- introduced, passed_house, passed_senate, enacted
  sponsor_bioguide_id TEXT,
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,
  issue_categories TEXT, -- JSON array
  states_affected TEXT, -- JSON array
  tracking_count INTEGER DEFAULT 0,
  progress_score REAL DEFAULT 0, -- 0-1 scale
  bipartisan_score REAL DEFAULT 0, -- 0-1 scale
  algolia_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(congress, bill_type, bill_number)
);

-- Full-text search index for SQL fallback
CREATE INDEX IF NOT EXISTS idx_bills_title_fts ON bills(title);
CREATE INDEX IF NOT EXISTS idx_bills_summary_fts ON bills(summary);

-- User tracked bills
CREATE TABLE IF NOT EXISTS user_tracked_bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  tracking_type TEXT DEFAULT 'watching', -- watching, supporting, opposing
  notification_preferences TEXT, -- JSON
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (bill_id) REFERENCES bills(id),
  UNIQUE(user_id, bill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tracked_bills_user ON user_tracked_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracked_bills_bill ON user_tracked_bills(bill_id);

-- Search query cache metadata
CREATE TABLE IF NOT EXISTS search_cache_metadata (
  query_hash TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  result_count INTEGER,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hit_count INTEGER DEFAULT 0
);
```

### Algolia Index Sync (Raindrop Task)

```typescript
// raindrop.manifest
application "civic-pulse" {
  sql_database "civic-db" {}
  kv_cache "search-cache" {}
  smartbucket "bill-summaries" {}

  task "algolia-sync" {
    schedule = "0 */6 * * *"  # Every 6 hours
  }
}
```

```typescript
// lib/tasks/algolia-sync.ts
import algoliasearch from 'algoliasearch';
import { executeQuery } from '@/lib/db/client';

export async function syncBillsToAlgolia(env: Env): Promise<void> {
  const algolia = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY!
  );

  const index = algolia.initIndex('bills');

  // Get bills updated since last sync
  const lastSync = await getLastSyncTimestamp(env);
  const bills = await executeQuery(
    `SELECT * FROM bills
     WHERE updated_at > ? OR algolia_synced_at IS NULL
     ORDER BY updated_at DESC`,
    'bills',
    [lastSync]
  );

  if (bills.rows.length === 0) {
    console.log('No bills to sync');
    return;
  }

  // Transform for Algolia
  const algoliaObjects = bills.rows.map(bill => ({
    objectID: bill.id,
    billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
    congress: bill.congress,
    title: bill.title,
    shortTitle: bill.short_title,
    plainEnglishSummary: bill.plain_english_summary,
    summary: bill.summary,
    sponsorName: bill.sponsor_name,
    sponsorParty: bill.sponsor_party,
    sponsorState: bill.sponsor_state,
    issueCategories: JSON.parse(bill.issue_categories || '[]'),
    statesAffected: JSON.parse(bill.states_affected || '[]'),
    billStatus: bill.bill_status,
    trackingCount: bill.tracking_count,
    progressScore: bill.progress_score,
    bipartisanScore: bill.bipartisan_score,
    introducedTimestamp: new Date(bill.introduced_date).getTime()
  }));

  // Batch save to Algolia
  await index.saveObjects(algoliaObjects);

  // Update sync timestamp
  await executeQuery(
    `UPDATE bills
     SET algolia_synced_at = CURRENT_TIMESTAMP
     WHERE id IN (${bills.rows.map(() => '?').join(',')})`,
    'bills',
    bills.rows.map(b => b.id)
  );

  console.log(`Synced ${bills.rows.length} bills to Algolia`);
}
```

### Search Result Caching (Raindrop KV Cache)

```typescript
// lib/search/cache.ts
import { createHash } from 'crypto';

export async function getCachedSearchResults(
  query: string,
  filters: SearchFilters,
  env: Env
): Promise<SearchResults | null> {
  const cacheKey = generateSearchCacheKey(query, filters);

  // Try KV Cache first
  const cached = await env.SEARCH_CACHE.get<SearchResults>(
    cacheKey,
    'json'
  );

  if (cached) {
    console.log(`Cache hit: ${cacheKey}`);

    // Update hit count
    await executeQuery(
      `UPDATE search_cache_metadata
       SET hit_count = hit_count + 1
       WHERE query_hash = ?`,
      'search_cache_metadata',
      [cacheKey]
    );

    return cached;
  }

  return null;
}

export async function cacheSearchResults(
  query: string,
  filters: SearchFilters,
  results: SearchResults,
  env: Env
): Promise<void> {
  const cacheKey = generateSearchCacheKey(query, filters);

  // Store in KV Cache with 1hr TTL
  await env.SEARCH_CACHE.put(cacheKey, JSON.stringify(results), {
    expirationTtl: 3600
  });

  // Save metadata
  await executeQuery(
    `INSERT INTO search_cache_metadata (query_hash, query_text, result_count)
     VALUES (?, ?, ?)
     ON CONFLICT(query_hash) DO UPDATE SET
       cached_at = CURRENT_TIMESTAMP,
       result_count = excluded.result_count`,
    'search_cache_metadata',
    [cacheKey, query, results.hits.length]
  );
}

function generateSearchCacheKey(
  query: string,
  filters: SearchFilters
): string {
  const payload = JSON.stringify({ query, filters });
  return `search:${createHash('md5').update(payload).digest('hex')}`;
}
```

---

## Search UX Design

### Simple Mode (Default)

**For casual users who just want to find bills**

```tsx
// components/search/simple-search.tsx
export function SimpleSearch() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero search bar */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-center">
          Find Legislation
        </h1>
        <p className="text-center text-muted-foreground">
          Search by bill number, topic, or describe what you're looking for
        </p>

        {/* Search input with autocomplete */}
        <SearchInput
          placeholder="Try 'H.R. 1234' or 'student loan bills'"
          onSearch={handleSearch}
          autocomplete={true}
        />

        {/* Quick filters (hidden until search) */}
        {hasSearched && (
          <QuickFilters
            selectedCategories={filters.categories}
            onToggleCategory={toggleCategory}
          />
        )}
      </div>

      {/* Results */}
      <SearchResults
        results={results}
        onTrackBill={handleTrackBill}
        onViewBill={handleViewBill}
      />

      {/* Switch to advanced */}
      <button
        onClick={() => setMode('advanced')}
        className="text-sm text-muted-foreground hover:text-primary"
      >
        Advanced search →
      </button>
    </div>
  );
}
```

**Features:**
- Large search bar (prominent, inviting)
- Autocomplete dropdown (instant suggestions)
- Quick filter pills (top 3 categories only)
- "Track this bill" button on every result
- Switch to advanced mode (bottom of page)

---

### Advanced Mode (Power Users)

**For researchers, educators, advocates who need precise filtering**

```tsx
// components/search/advanced-search.tsx
export function AdvancedSearch() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* Left sidebar: Filters */}
      <aside className="lg:col-span-1 space-y-6">
        <h2 className="font-semibold">Filters</h2>

        {/* Issue categories */}
        <FilterGroup title="Issue Category">
          <CheckboxGroup
            options={issueCategories}
            selected={filters.categories}
            onChange={updateCategories}
          />
        </FilterGroup>

        {/* Bill status */}
        <FilterGroup title="Bill Status">
          <RadioGroup
            options={billStatuses}
            selected={filters.status}
            onChange={updateStatus}
          />
        </FilterGroup>

        {/* Sponsor party */}
        <FilterGroup title="Sponsor Party">
          <RadioGroup
            options={['Democrat', 'Republican', 'Independent']}
            selected={filters.party}
            onChange={updateParty}
          />
        </FilterGroup>

        {/* Bipartisan support */}
        <FilterGroup title="Bipartisan Support">
          <Slider
            min={0}
            max={100}
            value={filters.bipartisanScore}
            onChange={updateBipartisanScore}
            label="Minimum support %"
          />
        </FilterGroup>

        {/* States affected */}
        <FilterGroup title="States Affected">
          <Combobox
            options={US_STATES}
            selected={filters.states}
            onChange={updateStates}
            multiple
          />
        </FilterGroup>

        {/* Clear all */}
        <button
          onClick={clearAllFilters}
          className="text-sm text-destructive"
        >
          Clear all filters
        </button>
      </aside>

      {/* Main content: Search & Results */}
      <main className="lg:col-span-3 space-y-6">
        {/* Search bar with natural language toggle */}
        <div className="space-y-2">
          <SearchInput
            placeholder="Search bills..."
            onSearch={handleSearch}
            mode={searchMode}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="searchMode"
                  value="keyword"
                  checked={searchMode === 'keyword'}
                  onChange={() => setSearchMode('keyword')}
                />
                <span className="text-sm">Keyword search</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="searchMode"
                  value="semantic"
                  checked={searchMode === 'semantic'}
                  onChange={() => setSearchMode('semantic')}
                />
                <span className="text-sm">Natural language</span>
              </label>
            </div>

            <span className="text-sm text-muted-foreground">
              {results.total} results
            </span>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(filter => (
              <FilterPill
                key={filter.id}
                label={filter.label}
                onRemove={() => removeFilter(filter.id)}
              />
            ))}
          </div>
        )}

        {/* Sort options */}
        <div className="flex justify-between items-center">
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'relevance', label: 'Most Relevant' },
              { value: 'recent', label: 'Most Recent' },
              { value: 'popular', label: 'Most Tracked' },
              { value: 'bipartisan', label: 'Most Bipartisan' }
            ]}
          />

          <button
            onClick={() => setMode('simple')}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Simple search
          </button>
        </div>

        {/* Results grid */}
        <SearchResults
          results={results}
          onTrackBill={handleTrackBill}
          onViewBill={handleViewBill}
          layout="compact"
        />

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </main>
    </div>
  );
}
```

**Features:**
- Full faceted filtering sidebar
- Keyword vs semantic search toggle
- Active filter pills (easy removal)
- Sort options (relevance, date, popularity)
- Compact result cards (more per page)
- Pagination controls

---

### Mobile Search Overlay

```tsx
// components/search/mobile-search-overlay.tsx
export function MobileSearchOverlay({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-screen max-w-full p-0">
        {/* Search header */}
        <div className="sticky top-0 bg-background border-b p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <SearchInput
              placeholder="Search bills..."
              autoFocus
              onSearch={handleSearch}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="mt-2 text-sm text-muted-foreground"
          >
            <Filter className="inline h-4 w-4 mr-1" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {/* Filter drawer (slide up) */}
        {showFilters && (
          <div className="absolute inset-0 bg-background z-50">
            <MobileFilterPanel
              filters={filters}
              onUpdateFilters={updateFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}

        {/* Results (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          <SearchResults
            results={results}
            onTrackBill={handleTrackBill}
            onViewBill={handleViewBill}
            layout="mobile"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Mobile-specific features:**
- Full-screen overlay (no distraction)
- Slide-up filter drawer
- Touch-optimized controls
- Infinite scroll (vs pagination)
- Swipe to dismiss filter drawer

---

## Bill Tracking Workflow

### One-Tap Tracking from Search Results

**Goal:** Make bill tracking **effortless** from search results.

```tsx
// components/search/search-result-card.tsx
export function SearchResultCard({ bill, onTrack }) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [showTrackingOptions, setShowTrackingOptions] = useState(false);

  const handleQuickTrack = async () => {
    setIsTracking(true);

    try {
      // Default: Add to "Watching" list
      await trackBill({
        billId: bill.id,
        trackingType: 'watching',
        notificationPreferences: {
          statusChanges: true,
          voteScheduled: true,
          amendments: false
        }
      });

      toast.success(`Now tracking ${bill.billNumber}`);
    } catch (error) {
      toast.error('Failed to track bill');
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <Card className="p-4 hover:shadow-lg transition">
      {/* Bill header */}
      <div className="flex justify-between items-start">
        <div>
          <Badge variant="secondary">{bill.billNumber}</Badge>
          <h3 className="font-semibold mt-2">{bill.title}</h3>
        </div>

        {/* Track button (prominent) */}
        <DropdownMenu
          open={showTrackingOptions}
          onOpenChange={setShowTrackingOptions}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant={bill.isTracked ? 'default' : 'outline'}
              size="sm"
              disabled={isTracking}
            >
              {bill.isTracked ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Tracking
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Track
                </>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => trackAs('watching')}>
              <Eye className="h-4 w-4 mr-2" />
              Watch (get updates)
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => trackAs('supporting')}>
              <ThumbsUp className="h-4 w-4 mr-2" />
              Support (public)
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => trackAs('opposing')}>
              <ThumbsDown className="h-4 w-4 mr-2" />
              Oppose (public)
            </DropdownMenuItem>

            {bill.isTracked && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={untrackBill}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Stop tracking
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bill summary */}
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
        {bill.plainEnglishSummary}
      </p>

      {/* Bill metadata */}
      <div className="flex flex-wrap gap-2 mt-4">
        <Badge variant="outline">{bill.billStatus}</Badge>
        {bill.issueCategories.slice(0, 3).map(cat => (
          <Badge key={cat} variant="secondary">{cat}</Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/bills/${bill.id}`)}
        >
          View details
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={shareDialog.open}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </div>
    </Card>
  );
}
```

### Tracking API Endpoint

```typescript
// app/api/bills/track/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { billId, trackingType, notificationPreferences } = await req.json();

  // Validate
  if (!billId || !['watching', 'supporting', 'opposing'].includes(trackingType)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    // Insert or update tracking
    await executeQuery(
      `INSERT INTO user_tracked_bills (
        id, user_id, bill_id, tracking_type, notification_preferences
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, bill_id) DO UPDATE SET
        tracking_type = excluded.tracking_type,
        notification_preferences = excluded.notification_preferences,
        added_at = CURRENT_TIMESTAMP`,
      'user_tracked_bills',
      [
        `${user.id}-${billId}`,
        user.id,
        billId,
        trackingType,
        JSON.stringify(notificationPreferences)
      ]
    );

    // Increment tracking count on bill
    await executeQuery(
      `UPDATE bills
       SET tracking_count = tracking_count + 1
       WHERE id = ?`,
      'bills',
      [billId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track bill:', error);
    return NextResponse.json(
      { error: 'Failed to track bill' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const billId = searchParams.get('billId');

  if (!billId) {
    return NextResponse.json({ error: 'Bill ID required' }, { status: 400 });
  }

  try {
    // Remove tracking
    await executeQuery(
      `DELETE FROM user_tracked_bills
       WHERE user_id = ? AND bill_id = ?`,
      'user_tracked_bills',
      [user.id, billId]
    );

    // Decrement tracking count
    await executeQuery(
      `UPDATE bills
       SET tracking_count = MAX(0, tracking_count - 1)
       WHERE id = ?`,
      'bills',
      [billId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to untrack bill:', error);
    return NextResponse.json(
      { error: 'Failed to untrack bill' },
      { status: 500 }
    );
  }
}
```

### Tracking Dashboard Integration

```typescript
// app/dashboard/tracked-bills/page.tsx
export default async function TrackedBillsPage() {
  const user = await getCurrentUser();

  const trackedBills = await executeQuery(
    `SELECT
       b.*,
       t.tracking_type,
       t.notification_preferences,
       t.added_at as tracked_since
     FROM user_tracked_bills t
     JOIN bills b ON t.bill_id = b.id
     WHERE t.user_id = ?
     ORDER BY t.added_at DESC`,
    'user_tracked_bills',
    [user.id]
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tracked Bills</h1>

      {/* Tabs: All / Watching / Supporting / Opposing */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="watching">Watching</TabsTrigger>
          <TabsTrigger value="supporting">Supporting</TabsTrigger>
          <TabsTrigger value="opposing">Opposing</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TrackedBillsList bills={trackedBills.rows} />
        </TabsContent>

        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

**Tracking features:**
- One-click tracking from search results
- Three tracking modes: Watch, Support, Oppose
- Custom notification preferences
- Tracked bills appear in dashboard
- "Tracking count" shows bill popularity

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic search infrastructure

**Tasks:**
- ✅ Set up Raindrop SQL database schema
- ✅ Create Congress.gov API sync service
- ✅ Set up Algolia account and index
- ✅ Implement basic Algolia sync task
- ✅ Build simple search page (keyword only)
- ✅ Implement directed search (bill number lookup)

**Deliverables:**
- Users can search by bill number
- Users can search by keyword
- Results display basic bill info

---

### Phase 2: Faceted Search (Week 2)
**Goal:** Exploratory search with filters

**Tasks:**
- Implement faceted filtering (Algolia)
- Build advanced search page UI
- Add filter sidebar (desktop)
- Add filter drawer (mobile)
- Implement personalization (location, interests)
- Add result sorting options

**Deliverables:**
- Users can filter by category, status, party
- Filters update in real-time
- Results are personalized by location

---

### Phase 3: Bill Tracking (Week 3)
**Goal:** One-tap bill tracking from search

**Tasks:**
- Create bill tracking database schema
- Build tracking API endpoints (POST, DELETE)
- Add "Track" button to search result cards
- Implement tracking dropdown (Watch/Support/Oppose)
- Build tracked bills dashboard page
- Add notification preference settings

**Deliverables:**
- Users can track bills from search results
- Tracked bills appear in dashboard
- Users can manage tracking preferences

---

### Phase 4: Semantic Search (Week 4)
**Goal:** Natural language discovery

**Tasks:**
- Set up Raindrop SmartBuckets
- Sync bill summaries to SmartBuckets
- Implement discovery search endpoint
- Build semantic search UI toggle
- Add AI-generated explanations
- Implement relevance ranking algorithm

**Deliverables:**
- Users can search in plain English
- AI explains why bills match the query
- Results ranked by semantic relevance

---

### Phase 5: Performance Optimization (Week 5)
**Goal:** Sub-500ms search response times

**Tasks:**
- Implement KV Cache for popular queries
- Add cache warming for common searches
- Optimize Algolia index settings
- Add search analytics tracking
- Implement cache hit rate monitoring
- Set up Algolia usage alerts

**Deliverables:**
- Search response time <500ms (p95)
- Cache hit rate >60%
- Algolia cost <$100/month

---

### Phase 6: Polish & Testing (Week 6)
**Goal:** Production-ready search experience

**Tasks:**
- Mobile UX testing on real devices
- Accessibility audit (WCAG 2.1 AA)
- Error handling and edge cases
- Search analytics dashboard
- User testing with 10+ participants
- Documentation and training materials

**Deliverables:**
- Mobile-optimized search overlay
- Accessible to screen readers
- Comprehensive error messages
- Search analytics dashboard

---

## Performance & Cost Optimization

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search response time | <500ms | p95 |
| Autocomplete latency | <100ms | p95 |
| Cache hit rate | >60% | Daily average |
| Algolia query time | <50ms | p95 |
| SQL query time | <100ms | p95 |
| SmartBuckets semantic search | <200ms | p95 |
| Page load time | <2s | Lighthouse |

### Cost Optimization

**Algolia Pricing:**
- Free tier: 10,000 searches/month
- Growth: $1 per 1,000 searches
- Estimated usage: 50,000 searches/month = $40/month

**Cost reduction strategies:**
1. **KV Cache popular queries** (60% hit rate = $24/month savings)
2. **Cache autocomplete suggestions** (aggressive TTL)
3. **Batch Algolia index updates** (reduce write operations)
4. **Limit facet calculations** (only for visible filters)

**Raindrop Platform Costs:**
- SQL database: Included in base plan
- KV Cache: $0.50 per million reads
- SmartBuckets: $10/month (1GB indexed)
- Tasks: Included in base plan

**Total estimated cost:** $50-75/month

### Cache Strategy

```typescript
// lib/search/cache-strategy.ts
export const CACHE_POLICIES = {
  // Directed search (bill numbers) - 24hr TTL
  directed: {
    ttl: 86400, // 24 hours
    reason: 'Bills rarely change daily'
  },

  // Exploratory search - 1hr TTL
  exploratory: {
    ttl: 3600, // 1 hour
    reason: 'Balance freshness with cache hits'
  },

  // Discovery search - 30min TTL
  discovery: {
    ttl: 1800, // 30 minutes
    reason: 'Semantic results may vary'
  },

  // Autocomplete - 6hr TTL
  autocomplete: {
    ttl: 21600, // 6 hours
    reason: 'Popular suggestions rarely change'
  }
};

export async function getCachedOrSearch(
  query: string,
  searchType: 'directed' | 'exploratory' | 'discovery',
  searchFn: () => Promise<SearchResults>,
  env: Env
): Promise<SearchResults> {
  // Try cache first
  const cacheKey = `search:${searchType}:${createHash('md5').update(query).digest('hex')}`;
  const cached = await env.SEARCH_CACHE.get<SearchResults>(cacheKey, 'json');

  if (cached) {
    console.log(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  // Cache miss - execute search
  console.log(`Cache MISS: ${cacheKey}`);
  const results = await searchFn();

  // Store in cache
  const policy = CACHE_POLICIES[searchType];
  await env.SEARCH_CACHE.put(cacheKey, JSON.stringify(results), {
    expirationTtl: policy.ttl
  });

  return results;
}
```

---

## API Reference

### Search Endpoints

#### POST /api/search
**Description:** Universal search endpoint (auto-detects search type)

**Request:**
```typescript
{
  query: string;
  filters?: {
    issueCategories?: string[];
    billStatus?: string[];
    sponsorParty?: string;
    statesAffected?: string[];
    bipartisanScore?: { min: number; max: number };
  };
  mode?: 'auto' | 'keyword' | 'semantic';
  page?: number;
  pageSize?: number;
}
```

**Response:**
```typescript
{
  results: Bill[];
  searchType: 'directed' | 'exploratory' | 'discovery';
  facets?: Record<string, FacetCount[]>;
  explanation?: string;
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}
```

---

#### GET /api/search/autocomplete
**Description:** Autocomplete suggestions for search input

**Request:**
```
GET /api/search/autocomplete?q=health
```

**Response:**
```typescript
{
  suggestions: [
    { type: 'bill', value: 'H.R. 1234', label: 'Health Care Reform Act' },
    { type: 'topic', value: 'healthcare', label: 'Healthcare' },
    { type: 'sponsor', value: 'Bernie Sanders', label: 'Sen. Bernie Sanders' }
  ]
}
```

---

#### POST /api/bills/track
**Description:** Track a bill (watch, support, oppose)

**Request:**
```typescript
{
  billId: string;
  trackingType: 'watching' | 'supporting' | 'opposing';
  notificationPreferences: {
    statusChanges: boolean;
    voteScheduled: boolean;
    amendments: boolean;
  };
}
```

**Response:**
```typescript
{
  success: true;
  trackingId: string;
}
```

---

#### DELETE /api/bills/track?billId=xxx
**Description:** Stop tracking a bill

**Response:**
```typescript
{
  success: true;
}
```

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Create search database schema in Raindrop SQL
2. Set up Algolia account and index
3. Implement Congress.gov sync service
4. Build basic search page UI

### Short-term Goals (Next 2 Weeks)
1. Complete Phase 1: Foundation
2. Complete Phase 2: Faceted Search
3. Begin Phase 3: Bill Tracking

### Long-term Vision (Next 6 Weeks)
1. Complete all 6 implementation phases
2. Launch search feature to beta users
3. Collect user feedback and iterate
4. Optimize performance and costs

---

## Success Metrics

**User Engagement:**
- Search usage: >70% of active users
- Average searches per session: >3
- Bill tracking rate from search: >30%
- Search-to-bill-page conversion: >50%

**Technical Performance:**
- Search response time: <500ms (p95)
- Cache hit rate: >60%
- Algolia cost: <$100/month
- Zero downtime during peak hours

**User Satisfaction:**
- Search relevance rating: >4.0/5.0
- "Found what I was looking for": >80%
- Mobile search experience: >4.2/5.0

---

**Questions? Reach out to the development team.**
