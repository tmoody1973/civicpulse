# State Legislation Integration - Implementation Plan

**Feature:** Integrate OpenStates API to provide state-level legislation alongside federal bills

**Goal:** Make Civic Pulse more valuable by showing users legislation that affects them locally (schools, housing, transportation, healthcare) while maintaining the same clean UX.

---

## Executive Summary

Most issues that affect daily life are decided at the state level, not federal. By adding state legislation:
- **Personalized to user's state** (based on zip code from onboarding)
- **Richer daily audio briefings** ("In Congress today..." + "In California...")
- **More relevant** to users' actual lives
- **Competitive advantage** over federal-only civic tech tools

---

## UX Design Philosophy

### Core Principle: "One Dashboard, Two Levels of Government"

Users shouldn't have to think about "federal vs state" - they should just see "bills that affect me."

### Dashboard Layout (Mobile-First)

```
┌─────────────────────────────────┐
│  📍 Your Legislation Feed       │
│                                 │
│  🏛️ Federal  |  🏛️ California   │
│  ─────────────────────────────  │
│                                 │
│  🔥 Trending Now                │
│  • CA AB 123: Housing Reform   │
│    State • Housing • Passed     │
│                                 │
│  • HR 456: Healthcare Act       │
│    Federal • Healthcare • Vote  │
│                                 │
│  📋 Recent Activity             │
│  Filter: [All] [Federal] [State]│
│                                 │
│  [Bill Card]                    │
│  [Bill Card]                    │
│  [Bill Card]                    │
│                                 │
└─────────────────────────────────┘
```

### Visual Distinction

**Federal Bills:**
- 🏛️ Capitol icon
- Blue accent color
- "US Congress" badge

**State Bills:**
- 🏛️ State capitol icon (or state flag emoji)
- Green accent color
- "California Legislature" badge (dynamic per user's state)

**Combined View (Default):**
- Show both interleaved by relevance/date
- Clear visual badges
- Filter toggle at top

---

## Technical Architecture

### 1. Database Schema Extension

**Option A: Unified bills table (RECOMMENDED)**

Extend existing `bills` table with new columns:

```sql
ALTER TABLE bills ADD COLUMN jurisdiction TEXT; -- 'federal' or 'CA', 'NY', etc.
ALTER TABLE bills ADD COLUMN openstates_id TEXT; -- OpenStates UUID
ALTER TABLE bills ADD COLUMN chamber TEXT; -- 'upper' (senate) or 'lower' (house)
ALTER TABLE bills ADD COLUMN session TEXT; -- '2023-2024 Regular'

-- Update existing bills to be federal
UPDATE bills SET jurisdiction = 'federal' WHERE jurisdiction IS NULL;

-- Add index for state bill lookups
CREATE INDEX idx_bills_jurisdiction ON bills(jurisdiction, latest_action_date DESC);
```

**Why unified table?**
- ✅ Simpler queries ("show me all bills")
- ✅ Easier to rank federal + state together
- ✅ SmartBuckets can search across both
- ✅ Audio briefings can pull from one source

**ID format:**
- Federal: `119-hr-1234` (existing)
- State: `ca-2024-ab-123` (new format: `{state}-{session}-{bill_type}-{number}`)

### 2. OpenStates API Integration

**File:** `lib/api/openstates.ts`

**Reference Implementation:** We're adapting proven patterns from [state-pulse project](https://github.com/lightningbolts/state-pulse/blob/main/src/scripts/fetchOpenStatesData.ts) which already solves these challenges.

#### Key Patterns from Reference Code

**1. Pagination with Checkpoint Resume**
```typescript
// From state-pulse: Save progress so we can resume if interrupted
interface Checkpoint {
  state: string;
  session: string;
  page: number;
  updatedSince: string;
}

// Example pagination pattern
const url = `${OPENSTATES_API_BASE_URL}/bills?` +
  `jurisdiction=${ocdId}&` +
  `session=${sessionId}&` +
  `page=${page}&` +
  `per_page=20&` +
  `apikey=${API_KEY}&` +
  `include=abstracts,sponsors,actions,versions,sources&` +
  `sort=updated_desc&` +
  `updated_since=${updatedSince}`;
```

**2. Session Filtering (Only Current Sessions)**
```typescript
// From state-pulse: Only process active legislative sessions
function isCurrentSession(session: any): boolean {
  const today = new Date();
  const startDate = new Date(session.start_date);
  const endDate = session.end_date ? new Date(session.end_date) : null;

  // Session must have started
  if (startDate > today) return false;

  // Session either ongoing (no end date) or ended within 90 days
  if (!endDate) return true;

  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  return endDate >= ninetyDaysAgo;
}
```

**3. Rate Limiting & Delays**
```typescript
// From state-pulse: Proven delay strategy
const DELAYS = {
  BETWEEN_PAGES: 1500,        // 1.5 seconds between pages
  BETWEEN_STATES: 3000,       // 3 seconds between states
  BETWEEN_BATCHES: 10000,     // 10 seconds between state batches
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**4. Updated_Since for Efficiency**
```typescript
// From state-pulse: Only fetch bills updated in last 24 hours
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const updatedSince = twentyFourHoursAgo.toISOString();

// On subsequent runs, use last sync timestamp
// This dramatically reduces API calls!
```

#### Our Implementation

```typescript
/**
 * OpenStates API client
 * Docs: https://docs.openstates.org/api-v3/
 * Rate limiting: 1.5s between requests (from state-pulse)
 * Based on proven patterns from state-pulse project
 */

interface OpenStatesBill {
  id: string;              // "ocd-bill/abc123..."
  identifier: string;      // "AB 123"
  title: string;
  classification: string[];
  subject: string[];
  abstracts: Array<{
    abstract: string;
    note: string;
  }>;
  sponsors: Array<{
    name: string;
    primary: boolean;
    entity_type: 'person' | 'organization';
  }>;
  actions: Array<{
    description: string;
    date: string;
    classification: string[];
  }>;
  versions: Array<{
    note: string;      // "Introduced", "Amended", "Enrolled"
    links: Array<{
      url: string;
      media_type: string; // "application/pdf", "text/html"
    }>;
  }>;
  sources: Array<{
    url: string;
  }>;
  legislative_session: {
    identifier: string;   // "2023-2024"
    jurisdiction: {
      name: string;       // "California"
      classification: string; // "state"
      id: string;        // "ocd-jurisdiction/country:us/state:ca"
    };
  };
  first_action_date: string;
  latest_action_date: string;
  latest_action_description: string;
}

// Fetch recent bills for a specific state with pagination
export async function fetchStateBills(
  state: string,          // "ca", "ny", "tx", etc.
  options: {
    session?: string;     // "2023-2024"
    page?: number;        // For pagination
    perPage?: number;     // Default 20
    updatedSince?: string; // ISO date - CRITICAL for efficiency!
    includeFields?: string[]; // abstracts, sponsors, actions, versions, sources
  }
): Promise<{
  bills: OpenStatesBill[];
  pagination: {
    page: number;
    perPage: number;
    maxPage: number;
    totalItems: number;
  };
}>

// Fetch full text for a bill (from versions)
export async function fetchStateBillText(
  bill: OpenStatesBill
): Promise<string | null> {
  // Strategy from state-pulse:
  // 1. Check versions array for full text
  // 2. Prefer HTML over PDF for easier parsing
  // 3. Fall back to abstracts if no full text available
}

// Get current sessions for a state
export async function getCurrentSessions(
  stateCode: string
): Promise<Array<{
  identifier: string;
  name: string;
  startDate: string;
  endDate: string | null;
}>>

// Map state code to OpenStates jurisdiction ID
export const STATE_JURISDICTIONS = {
  'AL': 'ocd-jurisdiction/country:us/state:al/government',
  'CA': 'ocd-jurisdiction/country:us/state:ca/government',
  'NY': 'ocd-jurisdiction/country:us/state:ny/government',
  // ... all 50 states
}

// Transform OpenStates bill to our unified schema
export function transformStateBill(
  osBill: OpenStatesBill
): UnifiedBill {
  // Adapted from state-pulse's transformOpenStatesBillToMongoDB

  return {
    id: `${osBill.legislative_session.jurisdiction.id.split(':')[2]}-` +
        `${osBill.legislative_session.identifier}-` +
        `${osBill.identifier.toLowerCase().replace(/\s+/g, '-')}`,
    jurisdiction: osBill.legislative_session.jurisdiction.id.split(':')[2], // 'ca', 'ny'
    openstates_id: osBill.id,
    congress: null, // State bills don't have Congress number
    billType: osBill.identifier.split(' ')[0].toLowerCase(), // 'ab', 'sb'
    billNumber: parseInt(osBill.identifier.split(' ')[1]),
    identifier: osBill.identifier, // "AB 123" - display format
    title: osBill.title,
    summary: osBill.abstracts?.[0]?.abstract || null,
    fullText: null, // Fetched separately
    chamber: osBill.legislative_session.jurisdiction.classification === 'upper' ? 'senate' : 'house',
    session: osBill.legislative_session.identifier,
    sponsorName: osBill.sponsors.find(s => s.primary)?.name || null,
    introducedDate: osBill.first_action_date,
    latestActionDate: osBill.latest_action_date,
    latestActionText: osBill.latest_action_description,
    status: detectBillStatus(osBill.actions), // From state-pulse pattern
    issueCategories: osBill.subject || [],
    congressGovUrl: osBill.sources?.[0]?.url || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Detect bill status from action history (from state-pulse)
function detectBillStatus(actions: Array<{ description: string; classification: string[] }>): string {
  // Check for enacted/signed
  const enacted = actions.find(a =>
    a.classification.includes('executive-signature') ||
    a.description.toLowerCase().includes('signed by governor')
  );
  if (enacted) return 'signed';

  // Check for passed both chambers
  const passedUpper = actions.some(a => a.classification.includes('passage') && a.description.includes('Senate'));
  const passedLower = actions.some(a => a.classification.includes('passage') && a.description.includes('Assembly'));
  if (passedUpper && passedLower) return 'passed';

  // Check for passed one chamber
  if (passedUpper || passedLower) return 'passed-chamber';

  // Default to introduced
  return 'introduced';
}
```

### 3. Fetching Strategy (Demand-Driven Approach)

**Key Principle: Only fetch state bills for states where you have users!**

This dramatically reduces API calls, storage, and processing time. Don't waste resources on Wyoming bills if you have zero Wyoming users.

#### On User Signup (One-Time State Bill Fetch)

```
User signs up with zip code 90210
  ↓
Detect state: California
  ↓
Check: Do we have CA bills in database?
  ↓
  NO → Trigger background job: Fetch CA bills (~2-3 min)
       - Fetch current session bills
       - Get full text for each
       - Index in SmartBuckets
       - Sync to Algolia
  ↓
  YES → Skip (already have CA bills)
  ↓
Save user with state: 'CA'
```

This ensures users see relevant state bills immediately without waiting for next daily sync.

#### Daily Sync Workflow (Optimized with state-pulse patterns)

```
GitHub Actions: Daily Bill Sync (2 AM UTC)
├─ Step 1: Fetch Federal Bills (existing, 50-60 min)
│
├─ Step 2: Fetch State Bills (NEW, ~2-5 min for typical deployment!)
│  ├─ Query unique states from users table
│  │  └─ SELECT DISTINCT state FROM users WHERE state IS NOT NULL
│  │  └─ Example result: ['CA', 'NY', 'TX'] (only 3 states!)
│  │
│  ├─ Load last sync timestamp from database
│  │
│  ├─ For each state WITH USERS:
│  │  ├─ Get current sessions (using isCurrentSession filter)
│  │  ├─ Fetch bills with updated_since parameter (CRITICAL!)
│  │  │  └─ Example: ?updated_since=2024-10-31T02:00:00Z
│  │  ├─ Use pagination with checkpoint resume
│  │  │  └─ Saves state/session/page if interrupted
│  │  ├─ Delay 1.5s between pages
│  │  ├─ Delay 3s between states
│  │  └─ Fetch full text only for NEW bills
│  │
│  └─ Update last sync timestamp
│
├─ Step 3: Run Post-Fetch Pipeline (existing)
│  ├─ AI policy area inference (federal + state)
│  ├─ SmartBuckets indexing (federal + state)
│  └─ Algolia sync (federal + state)
│
└─ Step 4: Save sync status
```

**Key Optimizations (from state-pulse):**

1. **Updated_Since Parameter (HUGE WIN!)**
   ```typescript
   // First sync: Get all bills from last 90 days
   const firstSync = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

   // Daily syncs: Only get bills updated since last run (24 hours ago)
   const lastSync = await getLastSyncTimestamp('state-bills');
   const updatedSince = lastSync || firstSync;

   // This reduces API calls by 90%+ after first sync!
   ```

2. **Session Filtering (Only Active Sessions)**
   ```typescript
   // Don't fetch from 2019-2020 sessions - they're done!
   // Only fetch current sessions:
   // - Started before today
   // - Not ended, OR ended within last 90 days
   ```

3. **Checkpoint Resume (Fault Tolerance)**
   ```typescript
   // Save progress after each page
   // If GitHub Action times out or fails, resume where we left off
   await saveCheckpoint({
     state: 'CA',
     session: '2023-2024',
     page: 5,
     updatedSince: '2024-10-31T02:00:00Z'
   });
   ```

4. **Smart Rate Limiting**
   ```typescript
   // Proven delays from state-pulse production use:
   await sleep(1500);  // Between pages (1.5s)
   await sleep(3000);  // Between states (3s)
   await sleep(10000); // Between state batches (10s)
   ```

**Estimated Performance (Demand-Driven Approach):**

| Scenario | States | Time | Bills Fetched |
|----------|--------|------|---------------|
| **First user (CA)** - Initial fetch | 1 state | ~2-3 min | ~500-1K bills |
| **Daily sync** (you only, CA) | 1 state | ~30-60 sec | ~10-20 bills |
| **100 users in 5 states** - Initial | 5 states | ~10-15 min | ~2.5-5K bills |
| **Daily sync** (5 states) | 5 states | ~2-3 min | ~50-100 bills |
| **1000 users in 20 states** - Initial | 20 states | ~40-60 min | ~10-20K bills |
| **Daily sync** (20 states) | 20 states | ~8-12 min | ~200-400 bills |

**Why This Approach Is Better:**

1. **Scales With Your Users**
   - 1 user in CA = fetch CA only
   - 10 users in CA = still fetch CA only (already have it!)
   - Users in 5 states = fetch 5 states, not 50

2. **Faster Initial Experience**
   - First sync: 2-3 min (your state only)
   - Not: 45-60 min (all 50 states)
   - User sees state bills immediately after signup

3. **Lower Ongoing Costs**
   - Daily sync: 2-3 min (5 typical states)
   - Not: 10-15 min (all 50 states)
   - `updated_since` means only changed bills

4. **Pay-As-You-Grow**
   - Start small (your state)
   - Add states as users join
   - Never waste resources on empty states

**Real-World Example:**

If Civic Pulse has users in California, New York, and Texas only:
- **Initial Setup:** Fetch 3 states (~6-9 min) instead of 50 (~45-60 min)
- **Daily Updates:** Update 3 states (~2-3 min) instead of 50 (~10-15 min)
- **Storage:** ~1.5-3K bills instead of ~5-10K bills
- **API Calls:** 85% reduction!

### 4. SmartBuckets Integration

**Unified Semantic Search:**

```typescript
// User searches: "housing policy"
// Returns BOTH federal and state bills about housing

const results = await env.BILLS_BUCKET.search({
  query: "housing policy",
  metadata: {
    user_state: "CA" // Boost state bills from user's state
  },
  limit: 20
});

// Results ranked by:
// 1. Semantic relevance to "housing policy"
// 2. Boost for user's state (CA bills ranked higher)
// 3. Recency (latest action date)
```

**Metadata for filtering:**
```typescript
{
  jurisdiction: "ca" | "federal",
  congress: 119,  // for federal
  session: "2023-2024", // for state
  bill_type: "ab" | "hr" | "s",
  status: "introduced" | "passed" | "signed",
  policy_area: "Housing",
  // ... existing metadata
}
```

---

## UX Implementation Details

### Dashboard Components

**1. Legislation Feed (New Component)**

```typescript
// components/legislation/legislation-feed.tsx

interface LegislationFeedProps {
  userState: string; // "CA", "NY", etc.
  view: 'all' | 'federal' | 'state';
}

export function LegislationFeed({ userState, view }: LegislationFeedProps) {
  // Fetch both federal and state bills
  // Interleave by relevance + date
  // Show clear badges for jurisdiction

  return (
    <div>
      <FeedHeader userState={userState} />
      <ViewToggle value={view} onChange={setView} />
      <BillList bills={bills} />
    </div>
  );
}
```

**2. Bill Card Updates**

```typescript
// components/bills/bill-card.tsx

// Add jurisdiction badge
<Badge variant={bill.jurisdiction === 'federal' ? 'blue' : 'green'}>
  {bill.jurisdiction === 'federal'
    ? '🏛️ US Congress'
    : `🏛️ ${getStateName(bill.jurisdiction)} Legislature`
  }
</Badge>

// Update bill number display
<div className="bill-number">
  {bill.jurisdiction === 'federal'
    ? `${bill.billType.toUpperCase()} ${bill.billNumber}`
    : bill.identifier // "AB 123", "SB 456"
  }
</div>
```

**3. Filter/Toggle Component**

```tsx
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">
      All ({federalCount + stateCount})
    </TabsTrigger>
    <TabsTrigger value="federal">
      🏛️ Federal ({federalCount})
    </TabsTrigger>
    <TabsTrigger value="state">
      🏛️ {userStateName} ({stateCount})
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Mobile Experience

**Key Principles:**
1. **Default to "All"** - Show both federal and state together
2. **Easy filtering** - Swipe or tap to filter
3. **Clear badges** - Instantly recognize federal vs state
4. **Personalized** - State name shown (not generic "State")

### First-Time User Experience

**Onboarding Flow Enhancement (with Demand-Driven State Bill Fetch):**

```
Step 1: Location
  "Enter your zip code: 90210"
  → Determines state (California) + congressional district (30)
  → Background: Check if we have CA bills in database
      ├─ YES → Skip fetch
      └─ NO  → Trigger background job to fetch CA bills

Step 2: Show What You'll Get
  "We'll show you legislation from:"
  ✓ US Congress (federal laws)
  ✓ California Legislature (state laws)

  [If first CA user]
  "⏳ Loading California bills... This takes 2-3 minutes"
  "You can browse federal bills while we fetch state bills"

  [If CA bills exist]
  "✅ California bills ready!"

Step 3: Interests
  (existing flow)
```

**Implementation Details:**

```typescript
// On zip code submit
async function handleZipCodeSubmit(zipCode: string) {
  // Lookup location
  const location = await lookupZipCode(zipCode);
  // { state: 'CA', district: 30 }

  // Check if we have state bills
  const hasStateBills = await db.bills
    .where('jurisdiction', '==', location.state.toLowerCase())
    .limit(1)
    .first();

  if (!hasStateBills) {
    // First user from this state!
    // Trigger background job to fetch state bills
    await queueStateBillFetch({
      state: location.state,
      priority: 'high', // User is waiting
      notifyUser: true  // Show progress
    });

    // Show loading message
    setLoadingState({
      message: `Fetching ${getStateName(location.state)} bills...`,
      showFederalBillsWhileWaiting: true
    });
  }

  // Save user
  await saveUser({
    ...userData,
    state: location.state,
    district: location.district
  });
}
```

This ensures:
- ✅ Users see state bills immediately (or federal bills while loading)
- ✅ No wasted fetching for states with no users
- ✅ Background job doesn't block onboarding flow
- ✅ Subsequent users from same state see bills instantly

---

## Audio Briefing Integration

### Current Format (Federal Only)
```
SARAH: Good morning! Today is Wednesday, November 1st.
       Here's your personalized civic update.

JAMES: Let's start with HR 1234, the Affordable Housing Act...

SARAH: Next up, we have Senate Bill 567...
```

### NEW Format (Federal + State)
```
SARAH: Good morning! Today is Wednesday, November 1st.
       Here's your personalized civic update covering both
       Congress and the California Legislature.

JAMES: Let's start at the federal level. HR 1234,
       the Affordable Housing Act, just passed the House...

SARAH: Now, closer to home in California, Assembly Bill 123
       would require new housing developments to include
       affordable units. The bill passed committee yesterday...

JAMES: Back to Congress, Senate Bill 567...

SARAH: And in Sacramento, Senate Bill 89...
```

### Audio Script Generation Updates

**File:** `lib/ai/generate-dialogue.ts`

```typescript
interface PodcastRequest {
  userId: string;
  type: 'daily' | 'weekly';
  bills: Array<Bill>; // Now includes both federal + state
}

// Script generation prompt changes:
const prompt = `
Generate a conversational podcast script about these bills.

Bills to cover:
${federalBills.map(b => `- [FEDERAL] ${b.title}`).join('\n')}
${stateBills.map(b => `- [${userState}] ${b.title}`).join('\n')}

Format:
- Start with overview mentioning both Congress and ${userState}
- Alternate between federal and state bills
- Use phrases like:
  - "In Congress..." / "At the federal level..."
  - "In California..." / "Back in Sacramento..."
  - "Closer to home..."

Keep it conversational and explain why each bill matters locally.
`;
```

**Smart Bill Selection for Audio:**
- Daily (5-7 min): 2-3 federal + 2-3 state bills
- Weekly (15-18 min): 5-7 federal + 5-7 state bills
- Prioritize bills with most impact on user's daily life
- Mix "big" federal bills with relevant state bills

---

## Implementation Tasks

### Phase 1: Foundation (Week 1)
**Priority: HIGH - Core infrastructure**

- [ ] **Task 1.1:** Create OpenStates API client (`lib/api/openstates.ts`)
  - Implement `fetchStateBills()` function
  - Implement `fetchStateBillText()` function
  - Add proper TypeScript interfaces
  - Handle rate limiting (TBD after testing)
  - Add error handling

- [ ] **Task 1.2:** Extend database schema
  - Add jurisdiction, openstates_id, chamber, session columns to bills table
  - Create migration script
  - Update existing federal bills with jurisdiction='federal'
  - Add new indexes for state bill queries
  - Deploy schema changes to Raindrop

- [ ] **Task 1.3:** Create state bill fetching script (`scripts/fetch-state-bills.ts`)
  - Query unique states from users table
  - Fetch bills for each state
  - Transform OpenStates format to unified schema
  - Store in database with proper IDs
  - Test with California first

- [ ] **Task 1.4:** Update SmartBuckets indexing
  - Modify `scripts/index-smartbuckets.ts` to handle state bills
  - Add jurisdiction metadata
  - Test semantic search across federal + state

### Phase 2: Backend Integration (Week 1-2)
**Priority: HIGH - API and data flow**

- [ ] **Task 2.1:** Create GitHub Action workflow for state bills
  - Add new step to existing `daily-bill-sync.yml`
  - OR create separate `daily-state-sync.yml`
  - Run after federal sync completes
  - Add sync_history logging for state bills

- [ ] **Task 2.2:** Update post-fetch pipeline
  - Extend AI policy inference to handle state bills
  - Ensure Algolia sync includes state bills
  - Test search with combined dataset

- [ ] **Task 2.3:** Update API endpoints
  - Modify `/api/bills` to accept jurisdiction filter
  - Add `/api/bills/state/:state` endpoint
  - Update `/api/search` to search both federal + state
  - Add state bills to dashboard data endpoint

### Phase 3: Frontend UX (Week 2)
**Priority: HIGH - User-facing changes**

- [ ] **Task 3.1:** Create LegislationFeed component
  - Implement view toggle (All/Federal/State)
  - Fetch and display both federal + state bills
  - Handle loading states
  - Add error boundaries

- [ ] **Task 3.2:** Update BillCard component
  - Add jurisdiction badge
  - Update bill number display format
  - Add state-specific styling
  - Test with both federal and state bills

- [ ] **Task 3.3:** Update Dashboard page
  - Replace existing bill list with LegislationFeed
  - Add filter controls
  - Update stats to show federal + state counts
  - Mobile-responsive design

- [ ] **Task 3.4:** Update search experience
  - Show jurisdiction in search results
  - Add filter chips for federal/state
  - Update search placeholder text
  - Test search ranking

### Phase 4: Audio Briefing Enhancement (Week 2-3)
**Priority: MEDIUM - Audio generation**

- [ ] **Task 4.1:** Update bill selection logic
  - Modify algorithm to select mix of federal + state bills
  - Weight state bills higher for user relevance
  - Ensure good balance for audio pacing

- [ ] **Task 4.2:** Enhance Claude prompt for dialogue generation
  - Add instructions for federal vs state bill language
  - Include state name in context
  - Add transition phrases
  - Test with sample bills

- [ ] **Task 4.3:** Update podcast generation endpoint
  - Pass both federal + state bills to dialogue generator
  - Test audio output quality
  - Verify natural transitions
  - A/B test user engagement

- [ ] **Task 4.4:** Update podcast UI
  - Show which bills are covered (with jurisdiction)
  - Update transcript display
  - Add visual indicators in audio player

### Phase 5: Onboarding & Education (Week 3)
**Priority: MEDIUM - User communication**

- [ ] **Task 5.1:** Update onboarding flow (with demand-driven state bill fetch)
  - Trigger background job to fetch state bills on first user signup
  - Add loading state: "Fetching California bills..."
  - Allow browsing federal bills while state bills load
  - Show success message when state bills ready
  - Skip fetch if state bills already exist
  - Add explanation of federal + state coverage

- [ ] **Task 5.2:** Create help/education content
  - "What's the difference between federal and state bills?"
  - "Why state bills matter more for daily life"
  - Add to dashboard help section

- [ ] **Task 5.3:** Add email notification for new feature
  - Draft announcement email
  - Explain what's new
  - Encourage users to check their state bills
  - Link to help docs

### Phase 6: Testing & Optimization (Week 3-4)
**Priority: MEDIUM - Quality assurance**

- [ ] **Task 6.1:** Test with multiple states
  - Verify fetching works for all 50 states
  - Test states with different legislative calendars
  - Handle edge cases (no active session, etc.)

- [ ] **Task 6.2:** Performance testing
  - Measure state bill fetching time
  - Optimize database queries
  - Test dashboard load time with more bills
  - Optimize SmartBuckets search

- [ ] **Task 6.3:** User testing
  - Get feedback on UX clarity
  - Test with non-technical users
  - Verify mobile experience
  - Iterate on design

- [ ] **Task 6.4:** Analytics implementation
  - Track state bill views vs federal
  - Measure filter usage
  - Track audio briefing completion rates
  - A/B test different layouts

### Phase 7: Documentation & Launch (Week 4)
**Priority: LOW - Final polish**

- [ ] **Task 7.1:** Update documentation
  - Add OpenStates integration to README
  - Document new API endpoints
  - Update architecture diagrams
  - Write migration guide

- [ ] **Task 7.2:** Create launch announcement
  - Blog post about new feature
  - Social media posts
  - Update landing page
  - Press release (if applicable)

- [ ] **Task 7.3:** Monitor & iterate
  - Watch error logs
  - Monitor API rate limits
  - Collect user feedback
  - Plan iteration roadmap

---

## Technical Considerations

### Rate Limiting
- **OpenStates:** Unknown - need to test and implement backoff
- **Strategy:** Similar to Congress.gov (1 req/sec with retries)

### Data Volume
- **50 states × 2 chambers × ~1000 bills/session = ~100K bills**
- Most states only have a few hundred active bills at a time
- Only fetch states where users exist
- Estimated: ~5-10K state bills total across active states

### Cost Implications
- **OpenStates API:** Free for non-commercial use (verify license)
- **Storage:** Minimal increase (state bills smaller than federal)
- **GitHub Actions:** +20-30 min runtime per day (still within free tier)
- **ElevenLabs:** More bills = longer audio (may hit limits faster)

### Error Handling
- **State not in session:** Gracefully skip, retry later
- **Full text unavailable:** Store without full text, flag for retry
- **API downtime:** Log error, continue with federal bills

---

## Success Metrics

### User Engagement
- [ ] % of users viewing state bills
- [ ] Time spent on state bill pages
- [ ] State bill tracking rate
- [ ] Audio briefing completion rate (should increase)

### Technical Health
- [ ] State bill sync success rate > 95%
- [ ] Dashboard load time < 2s with state bills
- [ ] Search latency < 500ms with combined dataset
- [ ] Zero duplicate bills in database

### Business Impact
- [ ] User retention rate (should increase)
- [ ] User feedback score (should improve)
- [ ] Social shares (more local relevance)
- [ ] Press coverage (unique differentiator)

---

## Future Enhancements

### V2 Features (Post-Launch)
1. **City/County Legislation** (OpenStates covers some)
2. **Bill Comparison** (federal vs state on same issue)
3. **Impact Analysis** ("How does this state bill relate to federal law?")
4. **Legislator Profiles** (state + federal representatives)
5. **Hearing Alerts** (notify when state bill has public hearing)
6. **Committee Tracking** (follow state committees)

### Advanced UX
1. **Map View** (visualize bills by state)
2. **Cross-State Comparison** (see how other states handle same issue)
3. **Bill Relationships** (state bills inspired by federal, vice versa)

---

## Questions to Resolve

### Before Implementation
1. ✅ **OpenStates API Key:** Do we have one? Need to register
2. ⚠️ **Rate Limits:** What are they? Need to test
3. ⚠️ **Commercial Use:** Civic Pulse will have paid tiers - license OK?
4. ⚠️ **Full Text Format:** PDF, HTML, plain text? Need to test
5. ⚠️ **Session Handling:** How to determine "current session" per state?

### During Development
1. **Unified vs Separate Table:** Confirm unified approach is best
2. **Search Ranking:** How to balance federal vs state in search results?
3. **Audio Balance:** What's the ideal federal/state ratio for briefings?
4. **Filter Defaults:** Should we default to "All" or "Federal"?

---

## Example User Flow

### New User (California)
1. **Onboarding:** Enters ZIP 90210
   - System determines: California, District 30
   - Shows: "You'll get federal + California bills"

2. **First Dashboard Visit:**
   - Sees mixed feed:
     - 🏛️ Federal: HR 1234 - Infrastructure
     - 🏛️ California: AB 123 - Housing Reform
     - 🏛️ Federal: S 567 - Climate Action
     - 🏛️ California: SB 89 - Education Funding

3. **Filters to California Only:**
   - Sees only state bills
   - Learns about local housing crisis bill
   - Tracks AB 123

4. **Requests Daily Audio:**
   - Hears: "In Congress, the infrastructure bill..."
   - Hears: "Closer to home in California, housing reform..."
   - Feels more connected to local issues

---

## Timeline

**Total Estimated Time: 3-4 weeks**

- **Week 1:** Foundation + Backend (Phases 1-2)
- **Week 2:** Frontend UX + Audio (Phases 3-4)
- **Week 3:** Onboarding + Testing (Phases 5-6)
- **Week 4:** Polish + Launch (Phase 7)

**Parallel Work:**
- Backend and frontend can be developed concurrently
- Audio enhancement can happen while testing UX

**Critical Path:**
- Database schema → API client → Fetching script → Dashboard UX

---

## Conclusion

Adding state legislation transforms Civic Pulse from "another congressional tracker" to **"the only civic engagement platform that shows you what matters locally."**

### Why This Matters

**User Value:**
- 🏠 Housing policy → State level
- 🚗 Transportation → State level
- 🏫 Education funding → State level
- 🏥 Healthcare access → State + Federal
- 💰 Taxes → State + Federal

**Competitive Advantage:**
- Most civic tech tools are federal-only
- Local relevance = higher engagement
- Audio briefings become truly personalized

**Technical Feasibility:**
- ✅ Similar to existing federal bill flow
- ✅ OpenStates has good API
- ✅ Unified database schema is clean
- ✅ SmartBuckets handles combined search naturally

**Risk Level: LOW**
- Incremental addition to existing system
- Can launch state-by-state (start with CA, NY, TX)
- Falls back gracefully if state API unavailable

---

## Key Learnings from Reference Implementation

**Finding the state-pulse project was a HUGE WIN!** It solved several challenges we would have discovered the hard way:

### What We Learned

1. **Updated_Since is Critical**
   - Without it: Fetch ALL bills every day (~5-10K bills, 45-60 min)
   - With it: Fetch only changed bills (~50-200 bills, 10-15 min)
   - **This alone makes the feature viable!**

2. **Session Filtering Matters**
   - States have old sessions (2019-2020) that are done
   - Only fetch "current" sessions (ongoing or ended <90 days ago)
   - Reduces unnecessary API calls by 50%+

3. **Checkpoint System for Reliability**
   - Long-running jobs can fail/timeout
   - Save progress after each page
   - Resume from checkpoint on next run
   - GitHub Actions 2-hour timeout becomes manageable

4. **Rate Limiting is Essential**
   - OpenStates doesn't publish rate limits
   - state-pulse found the sweet spot through trial/error:
     - 1.5s between pages
     - 3s between states
     - 10s between state batches
   - We can use their proven delays!

5. **Bill Status Detection**
   - Can't rely on a single "status" field
   - Must parse action history for:
     - "signed by governor" → signed
     - Passed both chambers → passed
     - Passed one chamber → passed-chamber
   - state-pulse has regex patterns that work!

6. **Full Text Strategy**
   - Check `versions` array for bill text
   - Prefer HTML over PDF (easier parsing)
   - Fall back to abstracts if no full text
   - Don't re-fetch what you already have

### How This Changes Our Approach

**Before finding reference code:**
- Estimated 20-30 min for daily state sync
- Worried about rate limits
- No checkpoint system planned
- Would have fetched all bills every time

**After incorporating reference patterns:**
- ✅ 10-15 min for daily state sync (with updated_since)
- ✅ Proven rate limiting delays (no guessing)
- ✅ Checkpoint resume for reliability
- ✅ Only fetch what changed (90% reduction in API calls)
- ✅ Battle-tested data transformation code
- ✅ Session filtering (only current sessions)

**Confidence Level:**
- Before: 70% (lots of unknowns)
- After: 95% (proven patterns, production-tested)

---

## Next Steps

1. **Get OpenStates API Key** → Register at openstates.org
2. **Adapt state-pulse code** → Use their patterns as starting point
3. **Test with California** → Verify updated_since works as expected
4. **Start Phase 1** → Build API client with checkpoint system
5. **Update this doc** → Add findings from testing

**With the state-pulse reference code, we're basically starting at the 50-yard line instead of our own end zone. Let's ship this! 🚀**
