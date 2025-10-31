# Bill Card Enhancement Guide

## Overview
This guide explains how to enhance the Bill Card component to display more detailed information similar to Congress.gov's bill display format.

---

## What Information to Add

Based on the Congress.gov format, we need to add these fields:

### 1. **Congress Information**
- **What it is**: Shows which Congress session (e.g., "119th Congress (2025-2026)")
- **Why it matters**: Users need to know if a bill is from the current or previous Congress
- **Data needed**: `congress` number (already have it!)
- **Display**: "119th Congress (2025-2026)" next to bill number

### 2. **Sponsor Details**
- **What it is**: Full information about who introduced the bill
- **Current**: We only show the bill number and title
- **Need to show**:
  - Sponsor name (e.g., "Thompson, Mike")
  - Party and state/district (e.g., "[Rep.-D-CA-4]")
  - Date introduced (e.g., "Introduced 10/28/2025")
- **Data needed**:
  - `sponsor_name` (have it!)
  - `sponsor_party` (have it!)
  - `sponsor_state` (have it!)
  - `introduced_date` (have it!)
  - Need to add: `sponsor_district` (need to fetch from database)

### 3. **Cosponsors Count**
- **What it is**: How many other members of Congress support the bill
- **Display**: "(114)" as a clickable link
- **Data needed**: `cosponsor_count` (need to add to database/Algolia)

### 4. **Committees**
- **What it is**: Which committee(s) are reviewing the bill
- **Example**: "House - Ways and Means"
- **Data needed**: `committees` array (need to add - fetch from Congress.gov)

### 5. **Latest Action with Date**
- **What it is**: Most recent thing that happened with the bill
- **Current**: We show "Last action: [text] (date)"
- **Enhanced**: "House - 10/28/2025 Referred to the House Committee on Ways and Means. (All Actions)"
- **Data needed**: We have this! Just need to format better

### 6. **Progress Tracker**
- **What it is**: Visual timeline showing where the bill is in the legislative process
- **Stages**:
  1. **Introduced** (dark/active)
  2. **Passed House** (grey/inactive)
  3. **Passed Senate** (grey/inactive)
  4. **To President** (grey/inactive)
  5. **Became Law** (grey/inactive)
- **How it works**: The current stage is highlighted (dark), completed stages are highlighted, future stages are grey
- **Data needed**: `status` field (we have it!)

---

## Current Data vs. Needed Data

### ✅ Data We Already Have (in database)
```javascript
{
  id: "119-hr-5862",
  bill_type: "hr",                    // ✅ House or Senate
  bill_number: 5862,                  // ✅ Bill number
  congress: 119,                      // ✅ Which Congress
  title: "To amend the Internal Revenue Code...",  // ✅ Bill title
  summary: "...",                     // ✅ Summary
  sponsor_name: "Thompson, Mike",     // ✅ Sponsor
  sponsor_party: "D",                 // ✅ Democrat/Republican
  sponsor_state: "CA",                // ✅ State
  introduced_date: "2025-10-28",      // ✅ When introduced
  latest_action_date: "2025-10-28",   // ✅ Most recent action
  latest_action_text: "Referred to...", // ✅ What happened
  status: "introduced",               // ✅ Where in process
  policy_area: "Taxation",            // ✅ Topic
  issue_categories: ["Tax reform"],   // ✅ Categories
  impact_score: 85                    // ✅ Importance
}
```

### ❌ Data We Need to Add

1. **`sponsor_district`**: Which district (e.g., "4" for CA-4)
   - **Where to get it**: Congress.gov API has this in the sponsor object
   - **How to add**: Update the bill fetching script to include `sponsor.district`

2. **`cosponsor_count`**: Number of cosponsors
   - **Where to get it**: Congress.gov API `/bill/{congress}/{type}/{number}/cosponsors`
   - **How to add**: Fetch cosponsors array length and store count

3. **`committees`**: Array of committee names
   - **Where to get it**: Congress.gov API `/bill/{congress}/{type}/{number}/committees`
   - **How to add**: Fetch and store as JSON array
   - **Example**: `["House - Ways and Means", "Senate - Finance"]`

---

## Step-by-Step Implementation Plan

### Step 1: Update Database Schema
Add new columns to the `bills` table:

```sql
ALTER TABLE bills ADD COLUMN sponsor_district TEXT;
ALTER TABLE bills ADD COLUMN cosponsor_count INTEGER DEFAULT 0;
ALTER TABLE bills ADD COLUMN committees TEXT; -- JSON array
```

### Step 2: Update Bill Fetching Script
Modify the Congress.gov API fetching script to include:

```typescript
// In scripts/fetch-bills.ts or wherever you fetch from Congress.gov

// Fetch sponsor district
const sponsorDistrict = bill.sponsors?.[0]?.district || null;

// Fetch cosponsor count
const cosponsorsResponse = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/cosponsors`
);
const cosponsorsData = await cosponsorsResponse.json();
const cosponsorCount = cosponsorsData.cosponsors?.length || 0;

// Fetch committees
const committeesResponse = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/committees`
);
const committeesData = await committeesResponse.json();
const committees = committeesData.committees?.map(c =>
  `${c.chamber} - ${c.name}`
) || [];

// Save to database
await db.bills.update({
  where: { id: billId },
  data: {
    sponsor_district: sponsorDistrict,
    cosponsor_count: cosponsorCount,
    committees: JSON.stringify(committees)
  }
});
```

### Step 3: Update Algolia Sync
Add new fields to Algolia sync script:

```typescript
// In scripts/sync-algolia-simple.ts

function transformToAlgoliaRecord(bill: any): AlgoliaRecord {
  return {
    // ... existing fields ...
    sponsorDistrict: bill.sponsor_district,
    cosponsorCount: bill.cosponsor_count || 0,
    committees: bill.committees ? JSON.parse(bill.committees) : [],
  };
}

// Update attributesToRetrieve in setSettings
attributesToRetrieve: [
  // ... existing fields ...
  'sponsorDistrict',
  'cosponsorCount',
  'committees'
]
```

### Step 4: Update BillCard Component Interface

```typescript
// In components/dashboard/bill-card.tsx

export interface Bill {
  id: string;
  number: string;  // e.g., "HR 5862"
  congress: number; // e.g., 119
  title: string;
  summary: string;
  status: 'introduced' | 'committee' | 'passed-house' | 'passed-senate' | 'enacted';

  // Sponsor info
  sponsorName: string;        // "Thompson, Mike"
  sponsorParty: string;       // "D" or "R"
  sponsorState: string;       // "CA"
  sponsorDistrict?: string;   // "4" (only for House members)

  // Timeline info
  introducedDate: string;     // "2025-10-28"
  lastActionDate: string;     // "2025-10-28"
  lastAction: string;         // "Referred to..."

  // Additional info
  cosponsorCount: number;     // 114
  committees: string[];       // ["House - Ways and Means"]

  // Existing fields
  issueCategories: string[];
  impactScore: number;
  aiSummary?: string;
}
```

### Step 5: Add Helper Functions

```typescript
// Helper to format Congress years
function getCongressYears(congress: number): string {
  const startYear = 1789 + ((congress - 1) * 2);
  const endYear = startYear + 2;
  return `${startYear}-${endYear}`;
}
// Usage: "119th Congress (2025-2026)"

// Helper to format sponsor info
function formatSponsor(bill: Bill): string {
  const chamber = bill.number.startsWith('HR') || bill.number.startsWith('H') ? 'Rep.' : 'Sen.';
  const party = bill.sponsorParty;
  const state = bill.sponsorState;
  const district = bill.sponsorDistrict ? `-${bill.sponsorDistrict}` : '';

  return `[${chamber}-${party}-${state}${district}]`;
}
// Usage: "[Rep.-D-CA-4]"

// Helper to format date
function formatIntroducedDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}
// Usage: "10/28/2025"
```

### Step 6: Add Progress Tracker Component

```typescript
// components/dashboard/bill-progress-tracker.tsx

interface Stage {
  name: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface Props {
  billStatus: Bill['status'];
}

export function BillProgressTracker({ billStatus }: Props) {
  const stages: Stage[] = [
    { name: 'Introduced', status: getStageStatus('introduced', billStatus) },
    { name: 'Passed House', status: getStageStatus('passed-house', billStatus) },
    { name: 'Passed Senate', status: getStageStatus('passed-senate', billStatus) },
    { name: 'To President', status: getStageStatus('to-president', billStatus) },
    { name: 'Became Law', status: getStageStatus('enacted', billStatus) }
  ];

  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, index) => (
        <div key={stage.name} className="flex items-center">
          {/* Stage box */}
          <div className={cn(
            "px-3 py-1 text-xs font-medium transition-colors",
            stage.status === 'completed' && "bg-green-600 text-white",
            stage.status === 'current' && "bg-gray-800 text-white",
            stage.status === 'upcoming' && "bg-gray-200 text-gray-600"
          )}>
            {stage.name}
          </div>

          {/* Arrow */}
          {index < stages.length - 1 && (
            <div className="w-4 h-0 border-t-2 border-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}

function getStageStatus(
  stageName: string,
  currentStatus: Bill['status']
): 'completed' | 'current' | 'upcoming' {
  const order = ['introduced', 'committee', 'passed-house', 'passed-senate', 'enacted'];
  const stageIndex = order.indexOf(stageName);
  const currentIndex = order.indexOf(currentStatus);

  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'current';
  return 'upcoming';
}
```

### Step 7: Update BillCard Layout

```typescript
// In components/dashboard/bill-card.tsx

export function BillCard({ bill, /* ... */ }: BillCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        {/* Bill Number + Congress */}
        <div className="flex items-baseline gap-2 mb-2">
          <a href={`/bills/${bill.id}`} className="text-blue-600 hover:underline font-medium">
            {bill.number}
          </a>
          <span className="text-sm text-muted-foreground">
            — {bill.congress}th Congress ({getCongressYears(bill.congress)})
          </span>
        </div>

        {/* Title */}
        <CardTitle className="text-base leading-tight mb-3">
          {bill.title}
        </CardTitle>

        {/* Sponsor Info */}
        <div className="text-sm text-muted-foreground mb-2">
          <span className="font-medium">Sponsor: </span>
          <a href="#" className="text-blue-600 hover:underline">
            {bill.sponsorName} {formatSponsor(bill)}
          </a>
          <span> (Introduced {formatIntroducedDate(bill.introducedDate)}) </span>
          {bill.cosponsorCount > 0 && (
            <>
              <span className="font-medium">Cosponsors: </span>
              <a href="#" className="text-blue-600 hover:underline">
                ({bill.cosponsorCount})
              </a>
            </>
          )}
        </div>

        {/* Committees */}
        {bill.committees.length > 0 && (
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">Committees: </span>
            {bill.committees.join(', ')}
          </div>
        )}

        {/* Latest Action */}
        <div className="text-sm text-muted-foreground mb-3">
          <span className="font-medium">Latest Action: </span>
          {bill.lastAction}
          <a href="#" className="text-blue-600 hover:underline ml-1">
            (All Actions)
          </a>
        </div>

        {/* Progress Tracker */}
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Tracker:</div>
          <BillProgressTracker billStatus={bill.status} />
        </div>

        {/* Status + Categories Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_VARIANTS[bill.status]}>
            {STATUS_LABELS[bill.status]}
          </Badge>
          {bill.issueCategories.map(category => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary section - keep existing */}
        {/* Buttons - keep existing */}
      </CardContent>
    </Card>
  );
}
```

---

## Summary of Changes

### What You'll See After Implementation

**Before (Current):**
```
HR 5862
To amend the Internal Revenue Code...

[Introduced] [Tax Reform]

Summary: This bill modifies...
Last action: Referred to committee (10/28/2025)

[View Details] [Track Bill]
```

**After (Enhanced):**
```
HR 5862 — 119th Congress (2025-2026)

To amend the Internal Revenue Code of 1986...

Sponsor: Thompson, Mike [Rep.-D-CA-4] (Introduced 10/28/2025) Cosponsors: (114)
Committees: House - Ways and Means
Latest Action: House - 10/28/2025 Referred to the House Committee on Ways and Means. (All Actions)

Tracker:
[Introduced] → [Passed House] → [Passed Senate] → [To President] → [Became Law]
   (dark)        (grey)            (grey)            (grey)          (grey)

[Introduced] [Tax Reform] [Taxation]

Summary: This bill modifies...

[View Details] [Track Bill]
```

---

## Testing Checklist

After implementing:

- [ ] Bill number shows with Congress session
- [ ] Sponsor displays with full party/state/district info
- [ ] Introduced date is formatted correctly (MM/DD/YYYY)
- [ ] Cosponsor count shows (if > 0)
- [ ] Committees list displays (if available)
- [ ] Latest action shows with date
- [ ] Progress tracker highlights correct stage
- [ ] All links are styled correctly (blue, underlined on hover)
- [ ] Works on mobile (responsive design)
- [ ] Loading states work for cosponsors/committees data

---

## Next Steps

1. **Add database columns** (sponsor_district, cosponsor_count, committees)
2. **Update Congress.gov fetching script** to get new fields
3. **Re-sync all bills** to populate new fields
4. **Update Algolia** to include new fields
5. **Update BillCard component** with new layout
6. **Create BillProgressTracker component**
7. **Test on multiple bills** with different statuses
8. **Deploy and verify** on production

---

## Questions or Issues?

- **Where do I get Congress.gov API data?** Check `scripts/fetch-bills-from-congress.ts`
- **How do I update Algolia?** Run `npx tsx scripts/sync-algolia-simple.ts --clear`
- **The progress tracker isn't working:** Check the `status` field mapping
- **Cosponsors not showing:** Verify the Congress.gov API returned cosponsors data
- **Mobile display broken:** Test responsive classes (use `md:` prefixes for larger screens)

---

**Last Updated:** October 29, 2025
