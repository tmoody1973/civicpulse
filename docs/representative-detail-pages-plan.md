# Representative Detail Pages - Implementation Plan

## Overview

Build comprehensive detail pages for all 538 Congress members showing their legislative activity, voting records, committee assignments, and constituent engagement tools.

**Goal:** Create pages like `/representatives/[bioguideId]` that provide complete visibility into a representative's work in Congress.

---

## What We Already Have

### ✅ Database - Representatives Table

We successfully ingested **all 538 members** of the 119th Congress with complete enrichment:

```sql
representatives (
  bioguide_id TEXT PRIMARY KEY,
  name TEXT,
  party TEXT,
  chamber TEXT (senate | house),
  state TEXT,
  district TEXT,
  image_url TEXT,
  office_address TEXT,
  phone TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  instagram_handle TEXT,
  rss_url TEXT,
  contact_url TEXT,
  committees TEXT (JSON array),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Coverage:**
- 100% enrichment rate (all 538 members)
- Full contact information (phone, office, website)
- Complete social media profiles (Twitter, Facebook, YouTube, Instagram)
- RSS feeds and contact forms

### ✅ Database - Bills Table

We have **9,134+ bills** from 119th Congress:

```sql
bills (
  id TEXT PRIMARY KEY (e.g., "119-hr-1"),
  congress INTEGER,
  bill_type TEXT,
  bill_number INTEGER,
  title TEXT,
  summary TEXT,
  sponsor_bioguide_id TEXT, -- Links to representatives!
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,
  sponsor_district TEXT,
  introduced_date TEXT,
  latest_action_date TEXT,
  latest_action_text TEXT,
  status TEXT,
  policy_area TEXT,
  issue_categories TEXT (JSON array),
  cosponsor_count INTEGER,
  committees TEXT (JSON array),
  full_text TEXT,
  impact_score REAL
)
```

**Key Insight:** We can query bills by `sponsor_bioguide_id` to get all bills sponsored by a representative!

---

## Data Sources

### 1. **Local Database (Fast)**

- Representative basic info
- Bills sponsored by representative (via `sponsor_bioguide_id`)
- Cached committee assignments

### 2. **Congress.gov API (Real-time)**

Need to fetch:
- Bills cosponsored by representative
- Voting records
- Recent legislative activity
- Committee membership updates

**API Endpoints:**
```
GET /member/{bioguideId}/sponsored-legislation
GET /member/{bioguideId}/cosponsored-legislation
GET /member/{bioguideId}/votes (if available)
GET /committee/{systemCode}/members (for committee rosters)
```

---

## Page Structure

### Route: `/representatives/[bioguideId]`

**Example:** `/representatives/W000817` (Elizabeth Warren)

### Page Sections

```
┌─────────────────────────────────────────────────────────┐
│ HERO SECTION                                            │
│ - Photo, Name, Party, State, District                  │
│ - Office Phone, Website, Social Media Links            │
│ - "Contact Representative" CTA                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ QUICK STATS                                             │
│ - Bills Sponsored: 45                                   │
│ - Bills Cosponsored: 312                                │
│ - Committee Assignments: 3                              │
│ - Years in Office: 12                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TABS                                                    │
│ [ Sponsored Bills ] [ Cosponsored Bills ] [ Committees ]│
│ [ Voting Record ] [ Activity Timeline ]                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TAB CONTENT (Bills, Votes, Committees, etc.)            │
│ - Paginated lists                                       │
│ - Search and filter                                     │
│ - Sort by date, relevance, status                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ENGAGEMENT TOOLS                                        │
│ - Track this representative                             │
│ - Get email alerts on new bills                         │
│ - Share on social media                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Phase 1: Basic Page with Sponsored Bills (Week 1)

**Goal:** Show representative profile + bills they sponsored (using existing data)

**Steps:**

1. **Create page route:**
   ```typescript
   // app/representatives/[bioguideId]/page.tsx

   export default async function RepresentativePage({
     params
   }: {
     params: { bioguideId: string }
   }) {
     // Fetch representative from database
     const rep = await getRepresentative(params.bioguideId);

     // Fetch bills sponsored by this representative
     const sponsoredBills = await getBillsBySponsor(params.bioguideId);

     return (
       <div>
         <RepresentativeHeader rep={rep} />
         <QuickStats
           sponsored={sponsoredBills.length}
           committees={rep.committees?.length || 0}
         />
         <SponsoredBillsList bills={sponsoredBills} />
       </div>
     );
   }
   ```

2. **Create API routes:**
   ```typescript
   // app/api/representatives/[bioguideId]/route.ts
   export async function GET(
     req: Request,
     { params }: { params: { bioguideId: string } }
   ) {
     const rep = await db.prepare(
       'SELECT * FROM representatives WHERE bioguide_id = ?'
     ).bind(params.bioguideId).first();

     return NextResponse.json(rep);
   }

   // app/api/representatives/[bioguideId]/bills/route.ts
   export async function GET(
     req: Request,
     { params }: { params: { bioguideId: string } }
   ) {
     const bills = await db.prepare(
       'SELECT * FROM bills WHERE sponsor_bioguide_id = ? ORDER BY introduced_date DESC'
     ).bind(params.bioguideId).all();

     return NextResponse.json(bills);
   }
   ```

3. **Build UI components:**
   ```typescript
   // components/representative/representative-header.tsx
   - Photo (circular)
   - Name (large, bold)
   - Party badge (colored)
   - State + District
   - Contact info (phone, office)
   - Social media links (icons)
   - "Contact" button (opens contact form in modal)

   // components/representative/quick-stats.tsx
   - 4 stat cards in grid
   - Bills sponsored, cosponsored, committees, years

   // components/representative/sponsored-bills-list.tsx
   - Reuse existing BillCard component
   - Add pagination (20 per page)
   - Add search filter
   - Add status filter dropdown
   ```

**Deliverable:** Basic representative page showing profile + sponsored bills from existing database data.

**Time Estimate:** 2-3 days

---

### Phase 2: Cosponsored Bills (Week 1-2)

**Goal:** Add tab showing bills the representative cosponsored

**Challenge:** We don't store cosponsor data in our bills table (only sponsor).

**Solution:** Fetch from Congress.gov API

**Steps:**

1. **Create API endpoint:**
   ```typescript
   // app/api/representatives/[bioguideId]/cosponsored-bills/route.ts

   export async function GET(
     req: Request,
     { params }: { params: { bioguideId: string } }
   ) {
     // Cache key
     const cacheKey = `cosponsored:${params.bioguideId}`;

     // Check cache (24hr TTL)
     const cached = await cache.get(cacheKey);
     if (cached) return NextResponse.json(cached);

     // Fetch from Congress.gov API
     const response = await fetch(
       `https://api.congress.gov/v3/member/${params.bioguideId}/cosponsored-legislation/119?api_key=${API_KEY}&limit=250`
     );

     const data = await response.json();

     // Cache for 24 hours
     await cache.set(cacheKey, data, { ttl: 86400 });

     return NextResponse.json(data);
   }
   ```

2. **Add tab component:**
   ```typescript
   // components/representative/cosponsored-bills-tab.tsx
   - Fetches from /api/representatives/[id]/cosponsored-bills
   - Shows loading state
   - Renders bill list with BillCard
   - Adds "Date Cosponsored" field
   ```

**API Requests:** 1 per representative (cached 24hrs)

**Time Estimate:** 1 day

---

### Phase 3: Committee Assignments (Week 2)

**Goal:** Show which committees the representative serves on

**Data We Have:** `committees` field in representatives table (JSON array)

**Enhancement:** Fetch live committee membership from Congress.gov

**Steps:**

1. **Parse existing committees:**
   ```typescript
   const committees = JSON.parse(rep.committees || '[]');
   // Example: ["Senate Finance Committee", "Senate Banking Committee"]
   ```

2. **Enhance with API data (optional):**
   ```typescript
   // app/api/representatives/[bioguideId]/committees/route.ts

   // Fetch from Congress.gov committee endpoints
   // GET /committee/senate/ssfi00 (Finance Committee)
   // Parse members list to get role (Chair, Ranking Member, Member)
   ```

3. **Build committee card component:**
   ```typescript
   // components/representative/committee-card.tsx
   - Committee name
   - Chamber (Senate/House)
   - Member's role (if available)
   - Link to committee page (future)
   - Recent committee bills
   ```

**Time Estimate:** 1-2 days

---

### Phase 4: Voting Records (Week 2-3)

**Goal:** Show representative's recent votes

**Challenge:** Congress.gov API may or may not have comprehensive voting records easily accessible by member.

**Options:**

**Option A: Use Congress.gov API (if available)**
```
GET /member/{bioguideId}/votes?congress=119
```

**Option B: Use ProPublica Congress API (more comprehensive voting data)**
```
GET /members/{bioguideId}/votes.json
```

**Option C: Scrape from GovTrack.us**
- Has comprehensive voting records
- JSON API available

**Recommendation:** Start with Option B (ProPublica) - they have excellent voting record APIs.

**Implementation:**

1. **Sign up for ProPublica API key** (free for non-commercial use)

2. **Create API endpoint:**
   ```typescript
   // app/api/representatives/[bioguideId]/votes/route.ts

   export async function GET(
     req: Request,
     { params }: { params: { bioguideId: string } }
   ) {
     // ProPublica uses different ID format
     // May need to map bioguide_id to ProPublica member_id

     const response = await fetch(
       `https://api.propublica.org/congress/v1/members/${params.bioguideId}/votes.json`,
       {
         headers: {
           'X-API-Key': process.env.PROPUBLICA_API_KEY
         }
       }
     );

     const data = await response.json();

     return NextResponse.json(data.results.votes);
   }
   ```

3. **Build voting record UI:**
   ```typescript
   // components/representative/voting-record.tsx
   - List of recent votes
   - Bill title
   - Vote position (Yea/Nay/Present/Not Voting)
   - Date
   - Vote result (Passed/Failed)
   - Filter by vote position
   ```

**Time Estimate:** 2-3 days (includes API setup)

---

### Phase 5: Activity Timeline (Week 3)

**Goal:** Unified timeline of all representative activity

**Activities to show:**
- Bills sponsored (with date)
- Bills cosponsored (with date)
- Votes cast (with date)
- Committee assignments (with date)
- Statements/press releases (if available)

**Implementation:**

1. **Aggregate data from multiple sources:**
   ```typescript
   const activities = [
     ...sponsoredBills.map(b => ({
       type: 'sponsored',
       date: b.introduced_date,
       title: `Sponsored ${b.title}`,
       bill: b
     })),
     ...cosponsoredBills.map(b => ({
       type: 'cosponsored',
       date: b.sponsorship_date,
       title: `Cosponsored ${b.title}`,
       bill: b
     })),
     ...votes.map(v => ({
       type: 'vote',
       date: v.date,
       title: `Voted ${v.position} on ${v.bill_title}`,
       vote: v
     }))
   ].sort((a, b) => new Date(b.date) - new Date(a.date));
   ```

2. **Build timeline component:**
   ```typescript
   // components/representative/activity-timeline.tsx
   - Vertical timeline with dates
   - Activity cards with icons
   - Expandable details
   - "Load more" pagination
   ```

**Time Estimate:** 2 days

---

### Phase 6: Engagement Tools (Week 3-4)

**Goal:** Allow users to track representatives and get alerts

**Features:**

1. **Track Representative:**
   - Save to user's tracked representatives
   - Show badge "Tracking" on page
   - Add to dashboard

2. **Email Alerts:**
   - Alert when representative sponsors new bill
   - Alert when representative votes on tracked bill
   - Alert on committee actions

3. **Share:**
   - Share on Twitter, Facebook
   - Copy link
   - Generate shareable card image

**Implementation:**

1. **Track functionality:**
   ```typescript
   // app/api/user/tracked-representatives/route.ts

   export async function POST(req: Request) {
     const { bioguideId } = await req.json();
     const user = await getSession();

     await db.prepare(
       'INSERT INTO tracked_representatives (user_id, bioguide_id) VALUES (?, ?)'
     ).bind(user.id, bioguideId).run();

     return NextResponse.json({ success: true });
   }
   ```

2. **Email alerts:**
   - Use same system as bill tracking
   - Add representative_id field to alerts table
   - Trigger on new bills/votes

**Time Estimate:** 3-4 days

---

## Database Schema Updates

### New Tables Needed

```sql
-- Track which representatives users follow
CREATE TABLE tracked_representatives (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bioguide_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bioguide_id)
);

-- Cache API responses
CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  value TEXT, -- JSON
  expires_at TIMESTAMP
);
```

### Updates to Existing Tables

```sql
-- Add cosponsor tracking to bills table (optional)
ALTER TABLE bills ADD COLUMN cosponsors TEXT; -- JSON array of bioguide_ids
```

---

## API Rate Limits & Caching

### Congress.gov API
- **Rate Limit:** 1 req/sec, 5,000 req/hour
- **Caching Strategy:** 24 hours for cosponsored bills, committees
- **Justification:** Legislative data doesn't change frequently

### ProPublica API
- **Rate Limit:** 5,000 req/day
- **Caching Strategy:** 12 hours for voting records
- **Justification:** Votes happen periodically

### Caching Implementation

```typescript
// lib/cache/api-cache.ts

export async function cachedFetch(
  key: string,
  fetcher: () => Promise<any>,
  ttl: number = 86400 // 24 hours default
) {
  // Check cache
  const cached = await db.prepare(
    'SELECT value, expires_at FROM api_cache WHERE key = ?'
  ).bind(key).first();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return JSON.parse(cached.value);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await db.prepare(
    'INSERT OR REPLACE INTO api_cache (key, value, expires_at) VALUES (?, ?, ?)'
  ).bind(
    key,
    JSON.stringify(data),
    new Date(Date.now() + ttl * 1000).toISOString()
  ).run();

  return data;
}
```

---

## UI/UX Design

### Design System

**Colors:**
- Democrat: Blue (#1E40AF)
- Republican: Red (#DC2626)
- Independent: Purple (#7C3AED)
- Neutral: Gray (#6B7280)

**Components:**
- Use existing shadcn/ui components
- BillCard component (already built)
- New: RepresentativeCard, CommitteeCard, VoteCard

**Mobile-First:**
- Tabs become accordion on mobile
- Cards stack vertically
- Sticky header with contact CTA

### Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast (WCAG AA)

---

## Performance Optimization

### 1. **Server-Side Rendering (SSR)**
```typescript
// Generate static pages for all 538 representatives
export async function generateStaticParams() {
  const reps = await db.prepare(
    'SELECT bioguide_id FROM representatives'
  ).all();

  return reps.map(rep => ({
    bioguideId: rep.bioguide_id
  }));
}
```

### 2. **Incremental Static Regeneration (ISR)**
```typescript
export const revalidate = 3600; // Revalidate every hour
```

### 3. **Client-Side Caching**
- Use React Query for API calls
- Cache tabs that haven't been viewed
- Prefetch next page of results

### 4. **Image Optimization**
- Use Next.js Image component
- Lazy load representative photos
- Serve WebP format

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/api/representatives.test.ts
- Test API endpoints return correct data
- Test caching behavior
- Test error handling

// __tests__/components/representative-header.test.ts
- Test component renders correctly
- Test social media links work
- Test contact button opens modal
```

### Integration Tests
```typescript
// Test full page load
- Representative data fetches correctly
- Bills display properly
- Tabs switch correctly
- Pagination works
```

### E2E Tests (Playwright)
```typescript
// Test user flows
- Navigate to representative page
- View different tabs
- Track representative
- Share representative
```

---

## Success Metrics

### Performance
- Page load: < 2s (SSR)
- Time to Interactive: < 3s
- API response: < 500ms (cached)
- Lighthouse score: 90+

### User Engagement
- Track feature usage: 30% of users
- Email alert signup: 15% of users
- Share rate: 10% of page views
- Return visits: 40%

---

## Implementation Timeline

### Week 1: Foundation (7 days)
- [x] Phase 1: Basic page with sponsored bills (2-3 days)
- [ ] Phase 2: Cosponsored bills tab (1 day)
- [ ] Phase 3: Committee assignments (1-2 days)

### Week 2: Voting & Activity (7 days)
- [ ] Phase 4: Voting records (2-3 days)
- [ ] Phase 5: Activity timeline (2 days)
- [ ] Testing & bug fixes (2 days)

### Week 3: Engagement & Polish (7 days)
- [ ] Phase 6: Engagement tools (3-4 days)
- [ ] Mobile optimization (1 day)
- [ ] Accessibility audit (1 day)
- [ ] Performance optimization (1 day)

**Total: 3 weeks (21 days)**

---

## Future Enhancements (Post-Launch)

### V2 Features
- **Compare representatives:** Side-by-side voting comparison
- **Constituent services:** Contact form integration
- **Town halls:** Upcoming events calendar
- **Financial disclosures:** Link to FEC data
- **Legislative effectiveness:** Scorecard metrics
- **Staff directory:** Contact staffers directly

### V3 Features
- **AI-powered insights:** "This representative votes with party X% of the time"
- **Personalized recommendations:** "Based on your interests, contact Rep X about Y"
- **Legislative alerts:** "Your rep is about to vote on a bill you tracked"
- **Constituent feedback:** Anonymous surveys sent to representatives

---

## Risk Mitigation

### Risks

1. **API rate limits:** Congress.gov + ProPublica limits could throttle requests
   - **Mitigation:** Aggressive caching (24hr), background jobs for updates

2. **Data staleness:** Cached data may be outdated
   - **Mitigation:** TTL of 12-24hrs, manual refresh button

3. **API availability:** External APIs may go down
   - **Mitigation:** Graceful degradation, show cached data with warning

4. **Data accuracy:** API data may have errors
   - **Mitigation:** Show data sources, add "Report Error" button

---

## Dependencies

### External Services
- Congress.gov API (already have key)
- ProPublica Congress API (need to sign up)
- Existing Raindrop database
- Existing representative enrichment data

### Libraries
- Next.js 16 (already installed)
- shadcn/ui (already installed)
- React Query (need to install)
- date-fns (for date formatting)

---

## Success Definition

**Minimum Viable Product (MVP):**
- ✅ Representative profile page loads in < 2s
- ✅ Shows all sponsored bills from database
- ✅ Shows committee assignments
- ✅ Contact information clickable
- ✅ Mobile responsive
- ✅ Accessible (WCAG AA)

**Launch Ready:**
- ✅ All 6 phases completed
- ✅ 100 representative pages tested
- ✅ Performance metrics met
- ✅ Accessibility audit passed
- ✅ Error handling graceful

---

## Next Steps

1. **Immediate:** Start Phase 1 - build basic page with sponsored bills
2. **This week:** Complete Phases 1-3 (foundation)
3. **Next week:** Implement voting records and activity timeline
4. **Week 3:** Add engagement tools and polish

**Ready to start building!** 🚀
