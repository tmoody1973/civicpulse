# Legislation Search - 3-Week Implementation Plan

**Branch:** `feature/legislation-search`
**Start Date:** October 28, 2025
**Target Completion:** November 18, 2025 (3 weeks)
**Reference:** See `/docs/SEARCH.md` for full architecture

---

## 📋 Overview

**Goal:** Build a three-layer search system (Directed, Exploratory, Discovery) with one-tap bill tracking from results.

**Success Metrics:**
- Search response time <500ms (p95)
- Search-to-tracking conversion >30%
- Cache hit rate >60%
- Mobile search experience >4.2/5.0

**Tech Stack:**
- Raindrop SQL (canonical database)
- Algolia (fast search index)
- Raindrop SmartBuckets (semantic search)
- Raindrop KV Cache (query caching)
- Raindrop Task (index sync scheduler)

---

## Week 1: Foundation (Directed + Exploratory Search MVP)

### Day 1: Project Setup & Algolia Configuration

**Tasks:**

1. **Create feature branch**
   ```bash
   git checkout -b feature/legislation-search
   git push -u origin feature/legislation-search
   ```

2. **Install Algolia dependencies**
   ```bash
   npm install algoliasearch @algolia/client-search
   npm install -D @types/algoliasearch
   ```

3. **Set up Algolia account**
   - Go to https://www.algolia.com/users/sign_up
   - Create free account (10,000 searches/month)
   - Create new application: "civic-pulse-production"
   - Create index: "bills"
   - Copy API credentials

4. **Add environment variables**

   Add to `.env.local`:
   ```bash
   # Algolia Search
   ALGOLIA_APP_ID=your-app-id
   ALGOLIA_ADMIN_API_KEY=your-admin-key
   NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
   ```

   Add to Netlify (via UI or CLI):
   ```bash
   netlify env:set ALGOLIA_APP_ID "your-app-id"
   netlify env:set ALGOLIA_ADMIN_API_KEY "your-admin-key"
   netlify env:set NEXT_PUBLIC_ALGOLIA_SEARCH_KEY "your-search-key"
   ```

5. **Configure Algolia index**

   Create `scripts/configure-algolia.ts`:
   ```typescript
   import algoliasearch from 'algoliasearch';

   const client = algoliasearch(
     process.env.ALGOLIA_APP_ID!,
     process.env.ALGOLIA_ADMIN_API_KEY!
   );

   const billsIndex = client.initIndex('bills');

   async function configureIndex() {
     console.log('🔧 Configuring Algolia index...');

     await billsIndex.setSettings({
       searchableAttributes: [
         'billNumber',        // Highest priority
         'title',
         'shortTitle',
         'plainEnglishSummary',
         'summary',
         'sponsorName',
         'cosponsorNames',
         'topics'
       ],
       attributesForFaceting: [
         'searchable(issueCategories)',
         'congress',
         'sponsorParty',
         'sponsorState',
         'billStatus',
         'statesAffected',
         'bipartisanScore'
       ],
       customRanking: [
         'desc(trackingCount)',
         'desc(progressScore)',
         'desc(bipartisanScore)',
         'desc(introducedTimestamp)'
       ],
       ranking: [
         'typo',
         'geo',
         'words',
         'filters',
         'proximity',
         'attribute',
         'exact',
         'custom'
       ],
       typoTolerance: true,
       minWordSizefor1Typo: 4,
       minWordSizefor2Typos: 8,
       attributesToRetrieve: [
         'objectID',
         'billNumber',
         'title',
         'plainEnglishSummary',
         'summary',
         'sponsorName',
         'sponsorParty',
         'issueCategories',
         'billStatus',
         'trackingCount',
         'introducedTimestamp'
       ]
     });

     console.log('✅ Algolia index configured!');
   }

   configureIndex()
     .then(() => process.exit(0))
     .catch((err) => {
       console.error('❌ Configuration failed:', err);
       process.exit(1);
     });
   ```

   Run it:
   ```bash
   npx tsx scripts/configure-algolia.ts
   ```

**Deliverable:** Algolia account set up, index configured, environment variables in place

---

### Day 2: Database Schema & Directed Search

**Tasks:**

1. **Update bills table schema**

   Create `db/civic-db/0002_bills_search_columns.sql`:
   ```sql
   -- Add search-specific columns to bills table
   ALTER TABLE bills ADD COLUMN tracking_count INTEGER DEFAULT 0;
   ALTER TABLE bills ADD COLUMN progress_score REAL DEFAULT 0;
   ALTER TABLE bills ADD COLUMN bipartisan_score REAL DEFAULT 0;
   ALTER TABLE bills ADD COLUMN algolia_synced_at TIMESTAMP;

   -- Add indexes for search performance
   CREATE INDEX IF NOT EXISTS idx_bills_tracking ON bills(tracking_count DESC);
   CREATE INDEX IF NOT EXISTS idx_bills_chamber_number ON bills(chamber, bill_number);
   ```

2. **Run migration**
   ```bash
   RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run npx tsx scripts/run-migration.ts
   ```

3. **Implement directed search (bill number lookup)**

   Create `lib/search/directed-search.ts`:
   ```typescript
   import { executeQuery } from '@/lib/db/client';

   export interface Bill {
     id: string;
     congress: number;
     chamber: string;
     bill_number: number;
     bill_type: string;
     title: string;
     plain_english_summary?: string;
     summary?: string;
     sponsor_name?: string;
     sponsor_party?: string;
     issue_categories?: string;
     bill_status?: string;
     tracking_count: number;
     introduced_date?: string;
     latest_action_date?: string;
   }

   /**
    * Parse bill number queries like "H.R. 1234", "S. 567", "HR1234"
    * Returns bill if found, null otherwise
    */
   export async function directBillLookup(
     query: string,
     env: Env
   ): Promise<Bill | null> {
     // Bill number patterns
     const patterns = [
       /^(H\.?R\.?|S\.?)\s*(\d+)$/i,  // H.R. 1234, HR 1234
       /^(H\.?R\.?|S\.?)(\d+)$/i       // HR1234, S567
     ];

     let match: RegExpMatchArray | null = null;

     for (const pattern of patterns) {
       match = query.trim().match(pattern);
       if (match) break;
     }

     if (!match) return null;

     // Parse chamber and number
     const chamberCode = match[1].toLowerCase().replace(/\./g, '');
     const chamber = chamberCode.includes('s') ? 'Senate' : 'House';
     const bill_type = chamberCode.includes('s') ? 's' : 'hr';
     const number = parseInt(match[2]);

     console.log(`🔍 Directed search: ${chamber} ${bill_type.toUpperCase()} ${number}`);

     // Direct SQL lookup (fastest path)
     const result = await executeQuery(
       `SELECT * FROM bills
        WHERE chamber = ? AND bill_number = ? AND bill_type = ?
        ORDER BY congress DESC
        LIMIT 1`,
       'bills',
       [chamber, number, bill_type]
     );

     if (result.rows.length > 0) {
       console.log(`✅ Found bill: ${result.rows[0].title}`);
       return result.rows[0] as Bill;
     }

     console.log('❌ Bill not found in database');
     return null;
   }

   /**
    * Detect if query is a bill number
    */
   export function isBillNumberQuery(query: string): boolean {
     const patterns = [
       /^(H\.?R\.?|S\.?)\s*\d+$/i,
       /^(H\.?R\.?|S\.?)\d+$/i
     ];

     return patterns.some(pattern => pattern.test(query.trim()));
   }
   ```

4. **Create search API route**

   Create `app/api/search/route.ts`:
   ```typescript
   import { NextResponse } from 'next/server';
   import { directBillLookup, isBillNumberQuery } from '@/lib/search/directed-search';

   export async function POST(req: Request) {
     try {
       const { query } = await req.json();

       if (!query || query.trim().length === 0) {
         return NextResponse.json({ error: 'Query required' }, { status: 400 });
       }

       // Step 1: Check if it's a bill number query
       if (isBillNumberQuery(query)) {
         const bill = await directBillLookup(query, process.env as any);

         if (bill) {
           return NextResponse.json({
             searchType: 'directed',
             results: [bill],
             total: 1
           });
         }
       }

       // Step 2: TODO - Exploratory search (Algolia)
       // Step 3: TODO - Discovery search (SmartBuckets)

       return NextResponse.json({
         searchType: 'none',
         results: [],
         total: 0
       });

     } catch (error) {
       console.error('Search error:', error);
       return NextResponse.json(
         { error: 'Search failed' },
         { status: 500 }
       );
     }
   }
   ```

5. **Test directed search**
   ```bash
   # Start dev server
   npm run dev

   # Test API
   curl -X POST http://localhost:3000/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "H.R. 1234"}'
   ```

**Deliverable:** Directed search working (bill number lookups return results in <10ms)

---

### Day 3: Basic Search Page UI

**Tasks:**

1. **Create search page**

   Create `app/search/page.tsx`:
   ```typescript
   'use client';

   import { useState } from 'react';
   import { Search, Loader2 } from 'lucide-react';
   import { Input } from '@/components/ui/input';
   import { Button } from '@/components/ui/button';

   export default function SearchPage() {
     const [query, setQuery] = useState('');
     const [results, setResults] = useState<any[]>([]);
     const [loading, setLoading] = useState(false);
     const [searchType, setSearchType] = useState<string>('');

     const handleSearch = async (e: React.FormEvent) => {
       e.preventDefault();

       if (!query.trim()) return;

       setLoading(true);

       try {
         const response = await fetch('/api/search', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ query })
         });

         const data = await response.json();
         setResults(data.results || []);
         setSearchType(data.searchType || 'none');
       } catch (error) {
         console.error('Search failed:', error);
       } finally {
         setLoading(false);
       }
     };

     return (
       <div className="max-w-4xl mx-auto px-4 py-8">
         {/* Hero section */}
         <div className="text-center mb-8">
           <h1 className="text-4xl font-bold mb-4">Find Legislation</h1>
           <p className="text-muted-foreground">
             Search by bill number, topic, or describe what you're looking for
           </p>
         </div>

         {/* Search bar */}
         <form onSubmit={handleSearch} className="mb-8">
           <div className="flex gap-2">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 type="text"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Try 'H.R. 1234' or 'healthcare bills'"
                 className="pl-10 text-lg h-12"
               />
             </div>
             <Button type="submit" size="lg" disabled={loading}>
               {loading ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Searching...
                 </>
               ) : (
                 'Search'
               )}
             </Button>
           </div>
         </form>

         {/* Results */}
         {searchType && (
           <div className="mb-4 text-sm text-muted-foreground">
             Search type: <span className="font-medium">{searchType}</span>
             {' • '}
             {results.length} result{results.length !== 1 ? 's' : ''}
           </div>
         )}

         {results.length > 0 && (
           <div className="space-y-4">
             {results.map((bill) => (
               <div
                 key={bill.id}
                 className="border rounded-lg p-4 hover:shadow-md transition"
               >
                 <div className="flex justify-between items-start mb-2">
                   <h3 className="font-semibold text-lg">{bill.title}</h3>
                   <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                     {bill.bill_type?.toUpperCase()} {bill.bill_number}
                   </span>
                 </div>

                 {bill.plain_english_summary && (
                   <p className="text-sm text-muted-foreground mb-3">
                     {bill.plain_english_summary}
                   </p>
                 )}

                 <div className="flex gap-2 text-sm">
                   {bill.sponsor_name && (
                     <span className="text-muted-foreground">
                       Sponsor: {bill.sponsor_name}
                     </span>
                   )}
                   {bill.bill_status && (
                     <span className="text-muted-foreground">
                       • Status: {bill.bill_status}
                     </span>
                   )}
                 </div>
               </div>
             ))}
           </div>
         )}

         {searchType === 'none' && query && !loading && (
           <div className="text-center text-muted-foreground">
             No results found for "{query}"
           </div>
         )}
       </div>
     );
   }
   ```

2. **Add navigation link**

   Update `components/shared/app-header.tsx`:
   ```typescript
   <Link href="/search" className="hover:text-primary">
     Search Bills
   </Link>
   ```

3. **Test search page**
   - Visit http://localhost:3000/search
   - Search for "H.R. 1234"
   - Verify bill card displays

**Deliverable:** Basic search page with directed search working

---

### Day 4-5: Exploratory Search (Algolia Integration)

**Tasks:**

1. **Create Algolia sync utility**

   Create `lib/search/algolia-sync.ts`:
   ```typescript
   import algoliasearch from 'algoliasearch';
   import { executeQuery } from '@/lib/db/client';

   const client = algoliasearch(
     process.env.ALGOLIA_APP_ID!,
     process.env.ALGOLIA_ADMIN_API_KEY!
   );

   const billsIndex = client.initIndex('bills');

   export interface AlgoliaBillRecord {
     objectID: string;
     billNumber: string;
     congress: number;
     title: string;
     plainEnglishSummary?: string;
     summary?: string;
     sponsorName?: string;
     sponsorParty?: string;
     sponsorState?: string;
     issueCategories: string[];
     statesAffected: string[];
     billStatus?: string;
     trackingCount: number;
     progressScore: number;
     bipartisanScore: number;
     introducedTimestamp: number;
   }

   /**
    * Sync bills from SQL database to Algolia index
    */
   export async function syncBillsToAlgolia(env: Env): Promise<number> {
     console.log('🔄 Starting Algolia sync...');

     // Get bills that need syncing
     const result = await executeQuery(
       `SELECT * FROM bills
        WHERE algolia_synced_at IS NULL
           OR updated_at > algolia_synced_at
        ORDER BY updated_at DESC
        LIMIT 1000`,
       'bills'
     );

     if (result.rows.length === 0) {
       console.log('✅ No bills to sync');
       return 0;
     }

     console.log(`📊 Found ${result.rows.length} bills to sync`);

     // Transform for Algolia
     const algoliaRecords: AlgoliaBillRecord[] = result.rows.map((bill: any) => ({
       objectID: bill.id,
       billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
       congress: bill.congress,
       title: bill.title,
       plainEnglishSummary: bill.plain_english_summary,
       summary: bill.summary,
       sponsorName: bill.sponsor_name,
       sponsorParty: bill.sponsor_party,
       sponsorState: bill.sponsor_state,
       issueCategories: bill.issue_categories ? JSON.parse(bill.issue_categories) : [],
       statesAffected: bill.states_affected ? JSON.parse(bill.states_affected) : [],
       billStatus: bill.bill_status,
       trackingCount: bill.tracking_count || 0,
       progressScore: bill.progress_score || 0,
       bipartisanScore: bill.bipartisan_score || 0,
       introducedTimestamp: bill.introduced_date
         ? new Date(bill.introduced_date).getTime()
         : Date.now()
     }));

     // Batch save to Algolia
     await billsIndex.saveObjects(algoliaRecords);

     // Update sync timestamp
     const billIds = result.rows.map((b: any) => b.id);
     await executeQuery(
       `UPDATE bills
        SET algolia_synced_at = CURRENT_TIMESTAMP
        WHERE id IN (${billIds.map(() => '?').join(',')})`,
       'bills',
       billIds
     );

     console.log(`✅ Synced ${result.rows.length} bills to Algolia`);
     return result.rows.length;
   }
   ```

2. **Create manual sync script**

   Create `scripts/sync-algolia.ts`:
   ```typescript
   import { syncBillsToAlgolia } from '../lib/search/algolia-sync';

   async function main() {
     const count = await syncBillsToAlgolia(process.env as any);
     console.log(`\n✨ Sync complete! ${count} bills indexed.`);
   }

   main()
     .then(() => process.exit(0))
     .catch((err) => {
       console.error('❌ Sync failed:', err);
       process.exit(1);
     });
   ```

   Run it:
   ```bash
   RAINDROP_SERVICE_URL=https://svc-xxx.lmapp.run npx tsx scripts/sync-algolia.ts
   ```

3. **Implement exploratory search**

   Create `lib/search/exploratory-search.ts`:
   ```typescript
   import algoliasearch from 'algoliasearch';

   const client = algoliasearch(
     process.env.ALGOLIA_APP_ID!,
     process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
   );

   const billsIndex = client.initIndex('bills');

   export interface SearchFilters {
     issueCategories?: string[];
     billStatus?: string[];
     sponsorParty?: string;
     statesAffected?: string[];
     congress?: number;
   }

   export interface SearchResults {
     hits: any[];
     facets?: Record<string, Record<string, number>>;
     total: number;
     page: number;
     totalPages: number;
   }

   /**
    * Exploratory search with faceted filtering
    */
   export async function exploratorySearch(
     query: string,
     filters: SearchFilters = {},
     page: number = 0,
     hitsPerPage: number = 20
   ): Promise<SearchResults> {
     console.log(`🔍 Exploratory search: "${query}"`);

     // Build filter string
     const filterParts: string[] = [];

     if (filters.issueCategories?.length) {
       const categories = filters.issueCategories
         .map(cat => `issueCategories:"${cat}"`)
         .join(' OR ');
       filterParts.push(`(${categories})`);
     }

     if (filters.billStatus?.length) {
       const statuses = filters.billStatus
         .map(status => `billStatus:"${status}"`)
         .join(' OR ');
       filterParts.push(`(${statuses})`);
     }

     if (filters.sponsorParty) {
       filterParts.push(`sponsorParty:"${filters.sponsorParty}"`);
     }

     if (filters.statesAffected?.length) {
       const states = filters.statesAffected
         .map(state => `statesAffected:"${state}"`)
         .join(' OR ');
       filterParts.push(`(${states})`);
     }

     if (filters.congress) {
       filterParts.push(`congress:${filters.congress}`);
     }

     const filterString = filterParts.join(' AND ');

     // Search Algolia
     const results = await billsIndex.search(query, {
       filters: filterString,
       facets: [
         'issueCategories',
         'billStatus',
         'sponsorParty',
         'statesAffected',
         'congress'
       ],
       page,
       hitsPerPage
     });

     console.log(`✅ Found ${results.nbHits} results`);

     return {
       hits: results.hits,
       facets: results.facets,
       total: results.nbHits,
       page: results.page,
       totalPages: results.nbPages
     };
   }
   ```

4. **Update search API route**

   Update `app/api/search/route.ts`:
   ```typescript
   import { NextResponse } from 'next/server';
   import { directBillLookup, isBillNumberQuery } from '@/lib/search/directed-search';
   import { exploratorySearch } from '@/lib/search/exploratory-search';

   export async function POST(req: Request) {
     try {
       const { query, filters, page } = await req.json();

       if (!query || query.trim().length === 0) {
         return NextResponse.json({ error: 'Query required' }, { status: 400 });
       }

       // Step 1: Check if it's a bill number query
       if (isBillNumberQuery(query)) {
         const bill = await directBillLookup(query, process.env as any);

         if (bill) {
           return NextResponse.json({
             searchType: 'directed',
             results: [bill],
             total: 1,
             page: 0,
             totalPages: 1
           });
         }
       }

       // Step 2: Exploratory search (Algolia)
       const algoliaResults = await exploratorySearch(
         query,
         filters || {},
         page || 0
       );

       return NextResponse.json({
         searchType: 'exploratory',
         results: algoliaResults.hits,
         facets: algoliaResults.facets,
         total: algoliaResults.total,
         page: algoliaResults.page,
         totalPages: algoliaResults.totalPages
       });

     } catch (error) {
       console.error('Search error:', error);
       return NextResponse.json(
         { error: 'Search failed' },
         { status: 500 }
       );
     }
   }
   ```

5. **Add faceted filters to search page**

   Update `app/search/page.tsx` to include:
   - Filter sidebar/drawer
   - Active filter pills
   - Facet counts
   - (Implementation in next step)

**Deliverable:** Exploratory search working with Algolia

---

### Day 6-7: Search Page Polish & Mobile UX

**Tasks:**

1. **Create search components**
   - `components/search/search-input.tsx` (with autocomplete)
   - `components/search/search-filters.tsx` (filter sidebar)
   - `components/search/search-result-card.tsx` (bill card)
   - `components/search/active-filters.tsx` (filter pills)

2. **Implement mobile search overlay**
   - Full-screen search on mobile
   - Slide-up filter drawer
   - Touch-optimized controls

3. **Add search performance monitoring**
   - Log search queries to analytics
   - Track response times
   - Monitor cache hit rates

4. **Test and polish**
   - Cross-browser testing
   - Mobile testing on real devices
   - Performance optimization

**Deliverable:** Polished search page with mobile UX

**Week 1 Milestone:** ✅ Directed and Exploratory search working!

---

## Week 2: Bill Tracking & Advanced Features

### Day 8-9: Bill Tracking Database & API

**Tasks:**

1. **Create tracking table schema**

   Create `db/civic-db/0003_bill_tracking.sql`:
   ```sql
   -- User tracked bills
   CREATE TABLE IF NOT EXISTS user_tracked_bills (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     bill_id TEXT NOT NULL,
     tracking_type TEXT DEFAULT 'watching' CHECK(tracking_type IN ('watching', 'supporting', 'opposing')),
     notification_preferences TEXT, -- JSON
     added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

     FOREIGN KEY (bill_id) REFERENCES bills(id),
     UNIQUE(user_id, bill_id)
   );

   CREATE INDEX IF NOT EXISTS idx_tracked_bills_user ON user_tracked_bills(user_id);
   CREATE INDEX IF NOT EXISTS idx_tracked_bills_bill ON user_tracked_bills(bill_id);
   CREATE INDEX IF NOT EXISTS idx_tracked_bills_type ON user_tracked_bills(tracking_type);
   ```

2. **Implement tracking API**

   Create `app/api/bills/track/route.ts`:
   ```typescript
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
       const trackingId = `${user.id}-${billId}`;

       // Insert or update tracking
       await executeQuery(
         `INSERT INTO user_tracked_bills (
           id, user_id, bill_id, tracking_type, notification_preferences
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, bill_id) DO UPDATE SET
           tracking_type = excluded.tracking_type,
           notification_preferences = excluded.notification_preferences,
           updated_at = CURRENT_TIMESTAMP`,
         'user_tracked_bills',
         [
           trackingId,
           user.id,
           billId,
           trackingType,
           JSON.stringify(notificationPreferences || {})
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

       return NextResponse.json({ success: true, trackingId });
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

**Deliverable:** Bill tracking API working

---

### Day 10-11: Track Button Component

**Tasks:**

1. **Create track button component**

   Create `components/bills/track-button.tsx`:
   ```typescript
   'use client';

   import { useState } from 'react';
   import { Check, Plus, Eye, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
   import { Button } from '@/components/ui/button';
   import {
     DropdownMenu,
     DropdownMenuContent,
     DropdownMenuItem,
     DropdownMenuSeparator,
     DropdownMenuTrigger,
   } from '@/components/ui/dropdown-menu';
   import { useToast } from '@/hooks/use-toast';

   interface TrackButtonProps {
     billId: string;
     isTracked?: boolean;
     trackingType?: 'watching' | 'supporting' | 'opposing';
     onTrackChange?: (tracked: boolean, type?: string) => void;
   }

   export function TrackButton({
     billId,
     isTracked = false,
     trackingType,
     onTrackChange
   }: TrackButtonProps) {
     const [tracking, setTracking] = useState(isTracked);
     const [type, setType] = useState(trackingType);
     const [loading, setLoading] = useState(false);
     const { toast } = useToast();

     const trackAs = async (trackingType: 'watching' | 'supporting' | 'opposing') => {
       setLoading(true);

       try {
         const response = await fetch('/api/bills/track', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             billId,
             trackingType,
             notificationPreferences: {
               statusChanges: true,
               voteScheduled: true,
               amendments: false
             }
           })
         });

         if (!response.ok) throw new Error('Failed to track');

         setTracking(true);
         setType(trackingType);
         onTrackChange?.(true, trackingType);

         toast({
           title: 'Success',
           description: `Now ${trackingType} this bill`
         });
       } catch (error) {
         toast({
           title: 'Error',
           description: 'Failed to track bill',
           variant: 'destructive'
         });
       } finally {
         setLoading(false);
       }
     };

     const untrack = async () => {
       setLoading(true);

       try {
         const response = await fetch(`/api/bills/track?billId=${billId}`, {
           method: 'DELETE'
         });

         if (!response.ok) throw new Error('Failed to untrack');

         setTracking(false);
         setType(undefined);
         onTrackChange?.(false);

         toast({
           title: 'Success',
           description: 'Stopped tracking this bill'
         });
       } catch (error) {
         toast({
           title: 'Error',
           description: 'Failed to untrack bill',
           variant: 'destructive'
         });
       } finally {
         setLoading(false);
       }
     };

     return (
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button
             variant={tracking ? 'default' : 'outline'}
             size="sm"
             disabled={loading}
           >
             {tracking ? (
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

           {tracking && (
             <>
               <DropdownMenuSeparator />
               <DropdownMenuItem
                 onClick={untrack}
                 className="text-destructive"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Stop tracking
               </DropdownMenuItem>
             </>
           )}
         </DropdownMenuContent>
       </DropdownMenu>
     );
   }
   ```

2. **Add track button to search results**

   Update `components/search/search-result-card.tsx`:
   ```typescript
   import { TrackButton } from '@/components/bills/track-button';

   // Inside the card JSX:
   <div className="flex justify-between items-start">
     <h3 className="font-semibold">{bill.title}</h3>
     <TrackButton
       billId={bill.id}
       isTracked={bill.isTracked}
       trackingType={bill.trackingType}
     />
   </div>
   ```

3. **Test tracking workflow**
   - Click "Track" on search result
   - Select "Watch"
   - Verify API call succeeds
   - Check database entry created

**Deliverable:** One-tap tracking from search results

---

### Day 12-13: Tracked Bills Dashboard

**Tasks:**

1. **Create tracked bills page**

   Create `app/dashboard/tracked-bills/page.tsx`:
   ```typescript
   import { getCurrentUser } from '@/lib/auth/session';
   import { executeQuery } from '@/lib/db/client';
   import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
   import { TrackButton } from '@/components/bills/track-button';

   export default async function TrackedBillsPage() {
     const user = await getCurrentUser();

     if (!user) {
       redirect('/auth/signin');
     }

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

     const watching = trackedBills.rows.filter((b: any) => b.tracking_type === 'watching');
     const supporting = trackedBills.rows.filter((b: any) => b.tracking_type === 'supporting');
     const opposing = trackedBills.rows.filter((b: any) => b.tracking_type === 'opposing');

     return (
       <div className="max-w-4xl mx-auto p-6">
         <h1 className="text-3xl font-bold mb-6">Tracked Bills</h1>

         <Tabs defaultValue="all">
           <TabsList>
             <TabsTrigger value="all">
               All ({trackedBills.rows.length})
             </TabsTrigger>
             <TabsTrigger value="watching">
               Watching ({watching.length})
             </TabsTrigger>
             <TabsTrigger value="supporting">
               Supporting ({supporting.length})
             </TabsTrigger>
             <TabsTrigger value="opposing">
               Opposing ({opposing.length})
             </TabsTrigger>
           </TabsList>

           <TabsContent value="all">
             <BillsList bills={trackedBills.rows} />
           </TabsContent>

           <TabsContent value="watching">
             <BillsList bills={watching} />
           </TabsContent>

           <TabsContent value="supporting">
             <BillsList bills={supporting} />
           </TabsContent>

           <TabsContent value="opposing">
             <BillsList bills={opposing} />
           </TabsContent>
         </Tabs>
       </div>
     );
   }

   function BillsList({ bills }: { bills: any[] }) {
     if (bills.length === 0) {
       return (
         <div className="text-center text-muted-foreground py-8">
           No bills tracked yet
         </div>
       );
     }

     return (
       <div className="space-y-4 mt-4">
         {bills.map((bill) => (
           <div
             key={bill.id}
             className="border rounded-lg p-4"
           >
             <div className="flex justify-between items-start mb-2">
               <div>
                 <h3 className="font-semibold">{bill.title}</h3>
                 <p className="text-sm text-muted-foreground">
                   {bill.bill_type?.toUpperCase()} {bill.bill_number}
                 </p>
               </div>
               <TrackButton
                 billId={bill.id}
                 isTracked={true}
                 trackingType={bill.tracking_type}
               />
             </div>

             {bill.plain_english_summary && (
               <p className="text-sm text-muted-foreground mb-2">
                 {bill.plain_english_summary}
               </p>
             )}

             <div className="text-xs text-muted-foreground">
               Tracking since {new Date(bill.tracked_since).toLocaleDateString()}
             </div>
           </div>
         ))}
       </div>
     );
   }
   ```

2. **Add dashboard navigation**
   - Link from app header to tracked bills
   - Show count badge

**Deliverable:** Tracked bills dashboard working

**Week 2 Milestone:** ✅ Full bill tracking workflow complete!

---

## Week 3: Semantic Search & Polish

### Day 14-15: Raindrop SmartBuckets Setup

**Tasks:**

1. **Update raindrop.manifest**

   Add SmartBucket to `raindrop.manifest`:
   ```hcl
   application "civic-pulse" {
     sql_database "civic-db" {}
     kv_cache "search-cache" {}
     smartbucket "bill-summaries" {}

     task "algolia-sync" {
       schedule = "0 */6 * * *"  # Every 6 hours
     }

     service "search-api" {
       visibility = "public"
     }
   }
   ```

2. **Deploy updated manifest**
   ```bash
   raindrop build run
   ```

3. **Index bill summaries to SmartBucket**

   Create `scripts/index-smartbuckets.ts`:
   ```typescript
   import { executeQuery } from '../lib/db/client';

   async function indexBillSummaries(env: Env) {
     console.log('📚 Indexing bill summaries to SmartBuckets...');

     const bills = await executeQuery(
       `SELECT id, title, plain_english_summary, summary
        FROM bills
        WHERE plain_english_summary IS NOT NULL
           OR summary IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1000`,
       'bills'
     );

     console.log(`Found ${bills.rows.length} bills to index`);

     for (const bill of bills.rows) {
       const content = bill.plain_english_summary || bill.summary || bill.title;

       // Upload to SmartBucket
       await env.BILL_SUMMARIES.put(
         `${bill.id}.txt`,
         content,
         {
           httpMetadata: {
             contentType: 'text/plain'
           },
           customMetadata: {
             billId: bill.id,
             title: bill.title
           }
         }
       );

       console.log(`✅ Indexed: ${bill.id}`);
     }

     console.log('✨ Indexing complete!');
   }

   indexBillSummaries(process.env as any)
     .then(() => process.exit(0))
     .catch((err) => {
       console.error('❌ Indexing failed:', err);
       process.exit(1);
     });
   ```

**Deliverable:** SmartBuckets set up and bills indexed

---

### Day 16-17: Discovery Search Implementation

**Tasks:**

1. **Implement discovery search**

   Create `lib/search/discovery-search.ts`:
   ```typescript
   import { SmartBucket } from '@raindrop/sdk';

   export interface DiscoveryResults {
     bills: any[];
     explanation: string;
     semanticScores: any[];
   }

   export async function discoverySearch(
     naturalLanguageQuery: string,
     userId: string,
     env: Env
   ): Promise<DiscoveryResults> {
     console.log(`🤖 Discovery search: "${naturalLanguageQuery}"`);

     // Step 1: SmartBuckets semantic search
     const semanticResults = await env.BILL_SUMMARIES.chunkSearch({
       input: naturalLanguageQuery,
       requestId: `discovery-${userId}-${Date.now()}`
     });

     // Step 2: Extract bill IDs
     const billIds = semanticResults.results
       .filter(result => result.score && result.score > 0.7)
       .map(result => {
         // Extract bill ID from source (e.g., "bill-123.txt" -> "bill-123")
         const match = result.source?.match(/^(.+)\.txt$/);
         return match ? match[1] : null;
       })
       .filter(Boolean)
       .slice(0, 20);

     if (billIds.length === 0) {
       return {
         bills: [],
         explanation: 'No bills found matching your query.',
         semanticScores: []
       };
     }

     // Step 3: Fetch full bill data
     const bills = await executeQuery(
       `SELECT * FROM bills
        WHERE id IN (${billIds.map(() => '?').join(',')})`,
       'bills',
       billIds
     );

     // Step 4: Generate AI explanation
     const explanation = `I found ${bills.rows.length} bills related to your search. These bills were selected based on semantic similarity to your query.`;

     return {
       bills: bills.rows,
       explanation,
       semanticScores: semanticResults.results
     };
   }
   ```

2. **Update search API**

   Update `app/api/search/route.ts` to add discovery search:
   ```typescript
   // Step 3: Discovery search (SmartBuckets)
   if (query.split(' ').length >= 3) {
     // Natural language query (3+ words)
     const discoveryResults = await discoverySearch(
       query,
       'user-id', // TODO: Get from session
       process.env as any
     );

     return NextResponse.json({
       searchType: 'discovery',
       results: discoveryResults.bills,
       explanation: discoveryResults.explanation,
       total: discoveryResults.bills.length
     });
   }
   ```

3. **Add search mode toggle to UI**
   - Simple: Keyword search (default)
   - Semantic: Natural language search
   - Auto-detect based on query length

**Deliverable:** Discovery search working

---

### Day 18-19: KV Cache & Performance Optimization

**Tasks:**

1. **Implement search caching**

   Create `lib/search/cache.ts`:
   ```typescript
   import { createHash } from 'crypto';

   export async function getCachedSearchResults(
     query: string,
     filters: any,
     env: Env
   ): Promise<any | null> {
     const cacheKey = generateSearchCacheKey(query, filters);

     const cached = await env.SEARCH_CACHE.get(cacheKey, 'json');

     if (cached) {
       console.log(`💾 Cache HIT: ${cacheKey}`);
       return cached;
     }

     console.log(`❌ Cache MISS: ${cacheKey}`);
     return null;
   }

   export async function cacheSearchResults(
     query: string,
     filters: any,
     results: any,
     env: Env
   ): Promise<void> {
     const cacheKey = generateSearchCacheKey(query, filters);

     await env.SEARCH_CACHE.put(
       cacheKey,
       JSON.stringify(results),
       {
         expirationTtl: 3600 // 1 hour
       }
     );

     console.log(`💾 Cached: ${cacheKey}`);
   }

   function generateSearchCacheKey(query: string, filters: any): string {
     const payload = JSON.stringify({ query, filters });
     return `search:${createHash('md5').update(payload).digest('hex')}`;
   }
   ```

2. **Add caching to search API**

   Update `app/api/search/route.ts`:
   ```typescript
   // Check cache first
   const cached = await getCachedSearchResults(query, filters, process.env as any);
   if (cached) {
     return NextResponse.json(cached);
   }

   // ... perform search ...

   // Cache results
   await cacheSearchResults(query, filters, results, process.env as any);
   ```

3. **Monitor cache performance**
   - Log cache hit/miss rates
   - Track response times
   - Measure cost savings

**Deliverable:** Search caching implemented

---

### Day 20-21: Final Polish & Testing

**Tasks:**

1. **Performance testing**
   - Load testing with 100+ concurrent searches
   - Response time monitoring
   - Cache effectiveness analysis

2. **Mobile UX testing**
   - Test on iPhone SE, iPhone 15, iPad
   - Fix any layout issues
   - Optimize touch targets

3. **Accessibility audit**
   - Keyboard navigation
   - Screen reader compatibility
   - ARIA labels
   - Color contrast

4. **Documentation**
   - API documentation
   - User guide for search features
   - Developer setup guide

5. **Prepare for merge**
   ```bash
   # Commit all changes
   git add .
   git commit -m "feat(search): complete legislation search implementation

   - Directed search (bill number lookup) <10ms
   - Exploratory search (Algolia faceted filtering) <50ms
   - Discovery search (SmartBuckets semantic) <200ms
   - One-tap bill tracking from search results
   - Tracked bills dashboard
   - KV Cache for performance (60% hit rate)
   - Mobile-optimized search overlay
   - Accessibility improvements

   Closes #[issue-number]"

   # Push to feature branch
   git push origin feature/legislation-search
   ```

6. **Create pull request**
   ```bash
   # Via GitHub CLI
   gh pr create \
     --title "feat: Legislation Search Implementation" \
     --body "See docs/SEARCH_IMPLEMENTATION_PLAN.md for details"
   ```

**Deliverable:** Ready for production!

**Week 3 Milestone:** ✅ Complete search system with 3 layers + tracking!

---

## 🎯 Success Criteria Checklist

Before merging to main:

- [ ] Directed search works (<10ms response time)
- [ ] Exploratory search works (<50ms via Algolia)
- [ ] Discovery search works (<200ms via SmartBuckets)
- [ ] One-tap bill tracking from results
- [ ] Tracked bills dashboard functional
- [ ] KV Cache hit rate >60%
- [ ] Mobile search experience tested on 3+ devices
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Performance: Lighthouse score >90
- [ ] Search analytics tracking implemented
- [ ] All tests passing
- [ ] Documentation complete

---

## 📊 Monitoring & Analytics

**Metrics to track:**
- Search queries per day
- Search response time (p50, p95, p99)
- Cache hit rate
- Search-to-tracking conversion rate
- Popular search terms
- Search abandonment rate
- Facet usage (which filters are most used)

**Tools:**
- Algolia Analytics Dashboard
- Raindrop Logs (`raindrop logs stream`)
- Custom analytics (PostHog/Mixpanel)

---

## 🚀 Post-Launch Improvements

After Week 3, consider:

1. **Saved searches** (Week 4)
   - Save query + filters
   - Email alerts for new matches
   - RSS feed per search

2. **Autocomplete** (Week 4)
   - Bill number suggestions
   - Topic suggestions
   - Representative suggestions

3. **Search history** (Week 5)
   - Personal search history
   - Popular searches (community)
   - Search trends

4. **Advanced filters** (Week 5)
   - Date range picker
   - Cosponsor count
   - Committee assignments
   - Vote tallies

---

## 📞 Questions?

**During implementation:**
- Check `/docs/SEARCH.md` for architecture details
- Check Raindrop MCP documentation for platform patterns
- Check Algolia docs for index configuration

**Need help?**
- Claude Code is your pair programmer!
- Use Raindrop MCP for platform questions
- Use Next.js MCP for runtime debugging

---

**Good luck! 🚀**
