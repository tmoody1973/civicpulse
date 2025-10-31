# Laws Feature - Show Bills That Became Law

## Overview

The Congress.gov API provides `/law` endpoints that let us track which bills actually became law. This is a powerful feature for users who want to:

- ✅ See which bills passed and became law
- ✅ Track recent legislative accomplishments
- ✅ Filter search results to show only enacted laws
- ✅ Understand the full bill-to-law journey

---

## Congress.gov Law Endpoints

### 1. Get All Laws for a Congress

**Endpoint:**
```
GET /law/{congress}
```

**Example:**
```
https://api.congress.gov/v3/law/119?api_key=YOUR_KEY&limit=250
```

**Response:**
```json
{
  "laws": [
    {
      "congress": 119,
      "number": "1",
      "type": "pub",
      "originChamber": "House",
      "originChamberCode": "H",
      "title": "Making appropriations for Agriculture...",
      "bill": {
        "congress": 119,
        "type": "hr",
        "number": "1234",
        "url": "https://api.congress.gov/v3/bill/119/hr/1234"
      },
      "effectiveDate": "2025-12-20",
      "signedDate": "2025-12-15"
    }
  ]
}
```

**What we get:**
- Law number (e.g., "Public Law 119-1")
- Original bill (HR 1234)
- When it was signed
- When it became effective
- Link back to the bill

---

### 2. Get Laws by Type

**Endpoint:**
```
GET /law/{congress}/{lawType}
```

**Law Types:**
- `pub` - Public Laws (affect general public)
- `priv` - Private Laws (affect specific individuals/entities)

**Example:**
```
https://api.congress.gov/v3/law/119/pub?api_key=YOUR_KEY
```

**Use case:** Filter to show only public laws (most users care about these)

---

### 3. Get Specific Law

**Endpoint:**
```
GET /law/{congress}/{lawType}/{lawNumber}
```

**Example:**
```
https://api.congress.gov/v3/law/119/pub/1?api_key=YOUR_KEY
```

**Response:**
```json
{
  "law": {
    "congress": 119,
    "number": "1",
    "type": "pub",
    "title": "Making appropriations for Agriculture...",
    "bill": {
      "congress": 119,
      "type": "hr",
      "number": "1234",
      "url": "https://api.congress.gov/v3/bill/119/hr/1234"
    },
    "signedDate": "2025-12-15",
    "effectiveDate": "2025-12-20",
    "executiveOrderNumber": null,
    "statutes": [
      {
        "volume": 139,
        "page": "123"
      }
    ]
  }
}
```

**What we get:**
- Complete law details
- Statute citation (volume and page in Statutes at Large)
- When President signed it
- When it became effective
- Link to original bill

---

## How This Benefits Users

### Use Case 1: "Recently Enacted Laws" Section

**Where:** Dashboard homepage

**What:** Show bills that became law in the last 30 days

**User value:**
- "What's new?" - See latest legislative accomplishments
- Track campaign promises that became law
- Stay informed on recent changes

**Example UI:**
```
┌─────────────────────────────────────────────────┐
│ 🏛️  Recently Enacted Laws                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Public Law 119-1 (Signed Dec 15, 2025)        │
│ Agriculture Appropriations Act                  │
│ Originally: HR 1234                            │
│ [View Full Law] [See Original Bill]            │
│                                                 │
│ Public Law 119-2 (Signed Dec 18, 2025)        │
│ Veterans Health Care Expansion                  │
│ Originally: S 567                              │
│ [View Full Law] [See Original Bill]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Use Case 2: Enhanced Bill Card Status

**Where:** Bill detail page, search results

**What:** Show if a bill became law (with law number)

**Before:**
```
Status: Enacted ✓
```

**After:**
```
Status: Became Law ✓
Public Law 119-1
Signed: December 15, 2025
Effective: December 20, 2025
[View Official Law Text]
```

**User value:**
- Clear confirmation bill is now law
- Direct link to law text
- Understand timeline (signed → effective)

---

### Use Case 3: Filter Search by Status

**Where:** Search page filters

**What:** Add "Show only enacted laws" filter

**UI:**
```
┌──────────────────────┐
│ Filters             │
├──────────────────────┤
│ ☐ Introduced        │
│ ☐ Passed House      │
│ ☐ Passed Senate     │
│ ✓ Became Law        │  ← NEW
└──────────────────────┘
```

**User value:**
- Focus on what actually passed
- Ignore bills stuck in committee
- See tangible results

---

### Use Case 4: "Bill Journey" Timeline

**Where:** Bill detail page

**What:** Show complete journey from introduction to law

**Example:**
```
Bill HR 1234 → Public Law 119-1

Timeline:
━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━●
   Introduced  House     Senate   To Pres.  Became Law
   Jan 3       Mar 15    May 22   Dec 10   Dec 15
```

**User value:**
- Understand legislative process
- See how long it took
- Educational for civic engagement

---

### Use Case 5: "Laws Dashboard"

**Where:** New page `/laws`

**What:** Dedicated page showing all enacted laws

**Features:**
- Filter by Congress (119, 118, 117...)
- Filter by topic (Healthcare, Defense, etc.)
- Search within laws
- Sort by date signed
- Export list (for researchers)

**Example URL:**
```
/laws?congress=119&topic=healthcare
```

**User value:**
- Researchers studying legislative output
- Track specific policy areas
- Historical analysis

---

## Implementation Plan

### Phase 1: Database Schema (10 minutes)

**Add `laws` table:**
```sql
CREATE TABLE laws (
  id TEXT PRIMARY KEY,                    -- e.g., "119-pub-1"
  congress INTEGER NOT NULL,
  law_type TEXT NOT NULL,                 -- "pub" or "priv"
  law_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  bill_id TEXT,                           -- FK to bills table
  bill_congress INTEGER,
  bill_type TEXT,
  bill_number INTEGER,
  signed_date TEXT,
  effective_date TEXT,
  statute_volume INTEGER,
  statute_page TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_laws_congress ON laws(congress);
CREATE INDEX idx_laws_bill_id ON laws(bill_id);
CREATE INDEX idx_laws_signed_date ON laws(signed_date);
```

**Update `bills` table:**
```sql
ALTER TABLE bills ADD COLUMN law_id TEXT;
ALTER TABLE bills ADD COLUMN law_number TEXT;
ALTER TABLE bills ADD COLUMN signed_date TEXT;
ALTER TABLE bills ADD COLUMN effective_date TEXT;
```

---

### Phase 2: Fetch Laws Script (30 minutes)

**Create:** `scripts/fetch-laws-119.ts`

```typescript
#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY!;
const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function fetchLaws(congress: number) {
  console.log(`🚀 Fetching laws for ${congress}th Congress...\n`);

  let offset = 0;
  const limit = 250;
  let allLaws: any[] = [];

  // Fetch all pages
  while (true) {
    const response = await fetch(
      `https://api.congress.gov/v3/law/${congress}?api_key=${CONGRESS_API_KEY}&limit=${limit}&offset=${offset}`
    );

    const data = await response.json();
    const laws = data.laws || [];

    if (laws.length === 0) break;

    allLaws = allLaws.concat(laws);
    offset += limit;

    console.log(`📥 Fetched ${allLaws.length} laws...`);

    await sleep(1000); // Rate limit
  }

  console.log(`\n✅ Total laws: ${allLaws.length}\n`);

  // Store each law
  for (const law of allLaws) {
    await storeLaw(law);
    console.log(`💾 Stored: ${law.type.toUpperCase()} ${law.number}`);
  }

  // Update bills with law information
  console.log('\n🔗 Linking laws to bills...');
  for (const law of allLaws) {
    if (law.bill) {
      await linkLawToBill(law);
    }
  }

  console.log('\n✅ All laws fetched and stored!');
}

async function storeLaw(law: any) {
  const lawId = `${law.congress}-${law.type}-${law.number}`;

  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'laws',
      query: `
        INSERT INTO laws (
          id, congress, law_type, law_number, title,
          bill_congress, bill_type, bill_number,
          signed_date, effective_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          title = excluded.title,
          signed_date = excluded.signed_date,
          effective_date = excluded.effective_date
      `,
      params: [
        lawId,
        law.congress,
        law.type,
        law.number,
        law.title,
        law.bill?.congress,
        law.bill?.type,
        law.bill?.number,
        law.signedDate,
        law.effectiveDate
      ]
    })
  });
}

async function linkLawToBill(law: any) {
  if (!law.bill) return;

  const billId = `${law.bill.congress}-${law.bill.type}-${law.bill.number}`;
  const lawId = `${law.congress}-${law.type}-${law.number}`;
  const lawNumber = `${law.type.toUpperCase()} ${law.number}`;

  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        UPDATE bills
        SET law_id = ?,
            law_number = ?,
            signed_date = ?,
            effective_date = ?,
            status = 'enacted'
        WHERE id = ?
      `,
      params: [lawId, lawNumber, law.signedDate, law.effectiveDate, billId]
    })
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
fetchLaws(119).catch(console.error);
```

**Run it:**
```bash
npx tsx scripts/fetch-laws-119.ts
```

**Expected output:**
```
🚀 Fetching laws for 119th Congress...

📥 Fetched 85 laws...

✅ Total laws: 85

💾 Stored: PUB 1
💾 Stored: PUB 2
...
💾 Stored: PUB 85

🔗 Linking laws to bills...

✅ All laws fetched and stored!
```

---

### Phase 3: Update Bill Card Component (15 minutes)

**Update:** `components/dashboard/bill-card.tsx`

**Add to Bill interface:**
```typescript
export interface Bill {
  // ... existing fields
  lawNumber?: string;        // "PUB 119-1"
  signedDate?: string;       // "2025-12-15"
  effectiveDate?: string;    // "2025-12-20"
}
```

**Update display:**
```typescript
{/* If bill became law, show law info */}
{bill.lawNumber && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
    <div className="flex items-center gap-2 mb-1">
      <Badge className="bg-green-600 text-white">
        Became Law
      </Badge>
      <span className="font-semibold text-green-900">
        Public Law {bill.lawNumber}
      </span>
    </div>
    {bill.signedDate && (
      <p className="text-sm text-green-800">
        Signed: {formatDate(bill.signedDate)}
        {bill.effectiveDate && ` • Effective: ${formatDate(bill.effectiveDate)}`}
      </p>
    )}
  </div>
)}
```

---

### Phase 4: Create "Recently Enacted" Section (30 minutes)

**Create:** `components/dashboard/recently-enacted.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel } from 'lucide-react';

interface Law {
  id: string;
  lawNumber: string;
  title: string;
  billId: string;
  billNumber: string;
  signedDate: string;
}

export function RecentlyEnacted() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/laws/recent?limit=5')
      .then(res => res.json())
      .then(data => {
        setLaws(data.laws);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5" />
          <CardTitle>Recently Enacted Laws</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {laws.map(law => (
            <div key={law.id} className="border-b pb-3 last:border-0">
              <Badge className="bg-green-600 text-white mb-1">
                {law.lawNumber}
              </Badge>
              <h4 className="font-semibold text-sm mb-1">{law.title}</h4>
              <p className="text-xs text-muted-foreground">
                Originally: {law.billNumber} • Signed {formatDate(law.signedDate)}
              </p>
              <div className="flex gap-2 mt-2">
                <a href={`/bills/${law.billId}`} className="text-xs text-blue-600 hover:underline">
                  View Bill
                </a>
                <a href={`/laws/${law.id}`} className="text-xs text-blue-600 hover:underline">
                  View Law
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Add to dashboard:**
```typescript
// app/dashboard/page.tsx
import { RecentlyEnacted } from '@/components/dashboard/recently-enacted';

export default function Dashboard() {
  return (
    <div className="grid gap-6">
      <RecentlyEnacted />
      {/* Other dashboard widgets */}
    </div>
  );
}
```

---

### Phase 5: Create Laws API Route (15 minutes)

**Create:** `app/api/laws/recent/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const response = await fetch(`${process.env.RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'laws',
        query: `
          SELECT
            l.id,
            l.law_type || ' ' || l.law_number as law_number,
            l.title,
            l.signed_date,
            b.id as bill_id,
            b.bill_type || ' ' || b.bill_number as bill_number
          FROM laws l
          LEFT JOIN bills b ON l.bill_congress = b.congress
            AND l.bill_type = b.bill_type
            AND l.bill_number = b.bill_number
          WHERE l.congress = 119
          ORDER BY l.signed_date DESC
          LIMIT ?
        `,
        params: [limit]
      })
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      laws: data.rows || []
    });
  } catch (error) {
    console.error('Laws API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch laws' },
      { status: 500 }
    );
  }
}
```

---

### Phase 6: Add Search Filter (10 minutes)

**Update:** `app/search/page.tsx`

**Add to filters state:**
```typescript
const [filters, setFilters] = useState({
  // ... existing filters
  enactedOnly: false,  // NEW
});
```

**Add to UI:**
```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="enactedOnly"
    checked={filters.enactedOnly}
    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, enactedOnly: !!checked }))}
  />
  <Label htmlFor="enactedOnly" className="font-normal flex items-center gap-1">
    <Gavel className="w-3 h-3" />
    Became Law
  </Label>
</div>
```

**Update API call:**
```typescript
if (filters.enactedOnly) {
  params.append('enacted', 'true');
}
```

**Update API route to handle filter:**
```typescript
// In app/api/search/route.ts
const enactedOnly = searchParams.get('enacted') === 'true';

if (enactedOnly) {
  algoliaFilters.push('status:enacted AND lawNumber:*');
}
```

---

## Rollout Strategy

### MVP (Hackathon Demo)
- ✅ Fetch laws for 119th Congress
- ✅ Link laws to bills
- ✅ Show law badge on bill cards
- ✅ "Recently Enacted" widget on dashboard

### Post-Hackathon
- ⏳ Dedicated `/laws` page
- ⏳ Search filter for enacted laws
- ⏳ Law detail page with full text
- ⏳ Bill timeline showing journey to law
- ⏳ Historical data (118th, 117th Congress)

---

## User Stories

### Story 1: Citizen
**As a** concerned citizen
**I want to** see which bills recently became law
**So that** I can stay informed about new legislation affecting me

### Story 2: Advocate
**As a** policy advocate
**I want to** filter search results to show only enacted laws
**So that** I can focus on legislation that's actually in effect

### Story 3: Researcher
**As a** political researcher
**I want to** see the complete journey from bill to law
**So that** I can analyze the legislative process

### Story 4: Educator
**As a** civics teacher
**I want to** show students recent examples of bills becoming law
**So that** I can teach the legislative process with real examples

---

## Success Metrics

**Engagement:**
- % of users who click "Recently Enacted" section
- Time spent on law-related pages
- Search filter usage (enacted only)

**Value:**
- User feedback: "This helps me understand what's actually changing"
- Increased return visits (check for new laws)
- Social media shares of newly enacted laws

---

## Technical Considerations

### Performance
- Laws are relatively static (once enacted, they don't change)
- Cache law data aggressively (24 hours)
- Index in Algolia for fast search
- No need for real-time updates

### Data Volume
- ~100-200 laws per Congress
- Much smaller than bills (~8,000)
- Low storage requirements

### API Usage
- Fetch laws once per day
- ~250 requests per Congress (1 page)
- Very light on API quota

---

## Next Steps

1. **Add laws table to database schema**
2. **Create fetch-laws script**
3. **Link laws to bills**
4. **Update bill cards to show law status**
5. **Add "Recently Enacted" dashboard widget**
6. **Test with real data**

---

**Ready to implement when you give the go-ahead!**
