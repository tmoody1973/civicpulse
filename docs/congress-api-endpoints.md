# Congress.gov API Endpoints

## Overview

All endpoints require an API key parameter: `?api_key=YOUR_KEY`

**Base URL:** `https://api.congress.gov/v3`

**Rate Limit:** 1 request per second (5,000 requests per hour)

---

## Endpoints We'll Use

### 1. **Get List of Bills**

**Purpose:** Get list of all bills for a Congress

**Endpoint:**
```
GET /bill/{congress}
```

**Example:**
```
https://api.congress.gov/v3/bill/119?api_key=YOUR_KEY&limit=250
```

**Parameters:**
- `congress` - Congress number (e.g., 119)
- `limit` - Results per page (max 250)
- `offset` - Pagination offset
- `format` - Response format (json or xml)

**Response:**
```json
{
  "bills": [
    {
      "congress": 119,
      "type": "hr",
      "number": "1",
      "originChamber": "House",
      "originChamberCode": "H",
      "title": "To...",
      "url": "https://api.congress.gov/v3/bill/119/hr/1",
      "latestAction": {
        "actionDate": "2025-01-03",
        "text": "Referred to the Committee on..."
      }
    }
  ],
  "pagination": {
    "count": 250,
    "next": "https://api.congress.gov/v3/bill/119?offset=250"
  }
}
```

**What we get:**
- List of all bills
- Basic metadata (number, type, title)
- Latest action
- Link to full bill details

**How we'll use it:**
```typescript
// Get first page
const response = await fetch(
  `https://api.congress.gov/v3/bill/119?api_key=${key}&limit=250`
);

// Loop through all pages
while (data.pagination.next) {
  // Fetch next page
}
```

---

### 2. **Get Bill Details**

**Purpose:** Get complete information about a specific bill

**Endpoint:**
```
GET /bill/{congress}/{type}/{number}
```

**Example:**
```
https://api.congress.gov/v3/bill/119/hr/5862?api_key=YOUR_KEY
```

**Parameters:**
- `congress` - Congress number (119)
- `type` - Bill type (hr, s, hjres, sjres, hconres, sconres, hres, sres)
- `number` - Bill number (5862)

**Response:**
```json
{
  "bill": {
    "congress": 119,
    "type": "hr",
    "number": "5862",
    "title": "To amend the Internal Revenue Code...",
    "introducedDate": "2025-10-28",
    "constitutionalAuthorityStatementText": "...",
    "sponsors": [
      {
        "bioguideId": "T000460",
        "fullName": "Rep. Thompson, Mike [D-CA-4]",
        "firstName": "Mike",
        "lastName": "Thompson",
        "party": "D",
        "state": "CA",
        "district": "4",
        "url": "https://api.congress.gov/v3/member/T000460"
      }
    ],
    "cosponsors": {
      "count": 124,
      "url": "https://api.congress.gov/v3/bill/119/hr/5862/cosponsors"
    },
    "committees": {
      "url": "https://api.congress.gov/v3/bill/119/hr/5862/committees"
    },
    "actions": {
      "count": 5,
      "url": "https://api.congress.gov/v3/bill/119/hr/5862/actions"
    },
    "summaries": {
      "count": 1,
      "url": "https://api.congress.gov/v3/bill/119/hr/5862/summaries"
    },
    "subjects": {
      "count": 3,
      "url": "https://api.congress.gov/v3/bill/119/hr/5862/subjects"
    },
    "textVersions": {
      "count": 1,
      "url": "https://api.congress.gov/v3/bill/119/hr/5862/text"
    },
    "latestAction": {
      "actionDate": "2025-10-28",
      "text": "Referred to the Committee on Ways and Means.",
      "actionTime": null
    },
    "policyArea": {
      "name": "Taxation"
    },
    "laws": null,
    "notes": null
  }
}
```

**What we get:**
- Complete bill metadata
- Sponsor information (name, party, state, district)
- Cosponsor count
- Committee assignments (via URL)
- Actions history (via URL)
- Summaries (via URL)
- Subjects/categories
- Full text versions (via URL)
- Policy area
- Latest action

**How we'll use it:**
```typescript
const response = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${key}`
);
const billData = await response.json();

// Extract sponsor info
const sponsor = billData.bill.sponsors[0];

// Store in database
await storeBill({
  id: `${congress}-${type}-${number}`,
  congress,
  bill_type: type,
  bill_number: number,
  title: billData.bill.title,
  sponsor_name: sponsor.fullName,
  sponsor_party: sponsor.party,
  sponsor_state: sponsor.state,
  sponsor_district: sponsor.district,
  introduced_date: billData.bill.introducedDate,
  policy_area: billData.bill.policyArea?.name,
  ...
});
```

---

### 3. **Get Bill Cosponsors**

**Purpose:** Get list of cosponsors for a bill

**Endpoint:**
```
GET /bill/{congress}/{type}/{number}/cosponsors
```

**Example:**
```
https://api.congress.gov/v3/bill/119/hr/5862/cosponsors?api_key=YOUR_KEY
```

**Response:**
```json
{
  "cosponsors": [
    {
      "bioguideId": "P000197",
      "fullName": "Rep. Pelosi, Nancy [D-CA-11]",
      "firstName": "Nancy",
      "lastName": "Pelosi",
      "party": "D",
      "state": "CA",
      "district": "11",
      "sponsorshipDate": "2025-10-29"
    },
    {
      "bioguideId": "J000288",
      "fullName": "Rep. Johnson, Hank [D-GA-4]",
      "party": "D",
      "state": "GA",
      "district": "4",
      "sponsorshipDate": "2025-10-30"
    }
  ],
  "pagination": {
    "count": 124
  }
}
```

**What we get:**
- List of all cosponsors
- Cosponsor details (name, party, state, district)
- When they cosponsored

**How we'll use it:**
```typescript
const response = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/cosponsors?api_key=${key}&limit=250`
);
const data = await response.json();

// Just store the count for now
const cosponsorCount = data.cosponsors?.length || 0;
```

---

### 4. **Get Bill Committees**

**Purpose:** Get committees assigned to review a bill

**Endpoint:**
```
GET /bill/{congress}/{type}/{number}/committees
```

**Example:**
```
https://api.congress.gov/v3/bill/119/hr/5862/committees?api_key=YOUR_KEY
```

**Response:**
```json
{
  "committees": [
    {
      "url": "https://api.congress.gov/v3/committee/house/hswm00",
      "systemCode": "hswm00",
      "name": "Ways and Means Committee",
      "chamber": "House",
      "type": "Standing",
      "activities": [
        {
          "name": "Referred to",
          "date": "2025-10-28T16:02:00Z"
        }
      ]
    }
  ]
}
```

**What we get:**
- List of committees
- Committee name and chamber
- Committee activities (referred, reported, etc.)

**How we'll use it:**
```typescript
const response = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/committees?api_key=${key}`
);
const data = await response.json();

// Extract committee names
const committees = data.committees?.map(c =>
  `${c.chamber} - ${c.name}`
) || [];

// Store as JSON array
await updateBill(billId, {
  committees: JSON.stringify(committees)
});
```

---

### 5. **Get Bill Text**

**Purpose:** Get full text of the bill

**Endpoint:**
```
GET /bill/{congress}/{type}/{number}/text
```

**Example:**
```
https://api.congress.gov/v3/bill/119/hr/5862/text?api_key=YOUR_KEY
```

**Response:**
```json
{
  "textVersions": [
    {
      "type": "Introduced in House",
      "date": "2025-10-28T04:00:00Z",
      "formats": [
        {
          "type": "Formatted Text",
          "url": "https://www.congress.gov/119/bills/hr5862/BILLS-119hr5862ih.htm"
        },
        {
          "type": "PDF",
          "url": "https://www.congress.gov/119/bills/hr5862/BILLS-119hr5862ih.pdf"
        },
        {
          "type": "Formatted XML",
          "url": "https://www.congress.gov/119/bills/hr5862/BILLS-119hr5862ih.xml"
        }
      ]
    }
  ]
}
```

**What we get:**
- List of text versions (Introduced, Engrossed, Enrolled, etc.)
- Links to formatted text, PDF, XML

**How we'll use it:**
```typescript
const response = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/text?api_key=${key}`
);
const data = await response.json();

// Get latest version (usually first in array)
const latestVersion = data.textVersions?.[0];
const textUrl = latestVersion?.formats?.find(f => f.type === 'Formatted Text')?.url;

if (textUrl) {
  // Fetch the actual text content
  const textResponse = await fetch(textUrl);
  const fullText = await textResponse.text();

  // Clean HTML and store
  const cleanText = stripHtml(fullText);
  await updateBill(billId, { full_text: cleanText });
}
```

---

### 6. **Get Bill Summaries**

**Purpose:** Get official CRS summaries

**Endpoint:**
```
GET /bill/{congress}/{type}/{number}/summaries
```

**Example:**
```
https://api.congress.gov/v3/bill/119/hr/5862/summaries?api_key=YOUR_KEY
```

**Response:**
```json
{
  "summaries": [
    {
      "versionCode": "00",
      "actionDate": "2025-10-28",
      "actionDesc": "Introduced in House",
      "updateDate": "2025-10-29T10:30:00Z",
      "text": "This bill modifies the Internal Revenue Code to allow self-employed individuals to deduct 100% of health insurance costs..."
    }
  ]
}
```

**What we get:**
- Official CRS (Congressional Research Service) summaries
- Summary text
- Version and date

**How we'll use it:**
```typescript
const response = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/summaries?api_key=${key}`
);
const data = await response.json();

// Get latest summary
const summary = data.summaries?.[0]?.text || null;

await updateBill(billId, { summary });
```

---

### 7. **Get Bill Subjects**

**Purpose:** Get legislative subjects/categories

**Endpoint:**
```
GET /bill/{congress}/{type}/{number}/subjects
```

**Example:**
```
https://api.congress.gov/v3/bill/119/hr/5862/subjects?api_key=YOUR_KEY
```

**Response:**
```json
{
  "subjects": {
    "legislativeSubjects": [
      {
        "name": "Health insurance"
      },
      {
        "name": "Self-employment"
      },
      {
        "name": "Tax deductions"
      }
    ],
    "policyArea": {
      "name": "Taxation"
    }
  }
}
```

**What we get:**
- Legislative subjects (detailed categories)
- Policy area (broad category)

**How we'll use it:**
```typescript
const response = await fetch(
  `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/subjects?api_key=${key}`
);
const data = await response.json();

const subjects = data.subjects?.legislativeSubjects?.map(s => s.name) || [];
const policyArea = data.subjects?.policyArea?.name || null;

await updateBill(billId, {
  issue_categories: JSON.stringify(subjects),
  policy_area: policyArea
});
```

---

## Complete Fetching Flow

Here's how we'll use these endpoints together:

```typescript
async function fetchBill(congress: number, type: string, number: number) {
  const key = process.env.CONGRESS_API_KEY;

  // 1. Get bill details (includes sponsor)
  const billResponse = await fetch(
    `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${key}`
  );
  const billData = await billResponse.json();

  await sleep(1000); // Rate limit

  // 2. Get cosponsors count
  const cosponsorsResponse = await fetch(
    `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/cosponsors?api_key=${key}`
  );
  const cosponsorsData = await cosponsorsResponse.json();
  const cosponsorCount = cosponsorsData.cosponsors?.length || 0;

  await sleep(1000); // Rate limit

  // 3. Get committees
  const committeesResponse = await fetch(
    `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/committees?api_key=${key}`
  );
  const committeesData = await committeesResponse.json();
  const committees = committeesData.committees?.map(c => `${c.chamber} - ${c.name}`) || [];

  await sleep(1000); // Rate limit

  // 4. Get full text (if available)
  let fullText = null;
  const textResponse = await fetch(
    `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/text?api_key=${key}`
  );
  const textData = await textResponse.json();
  const textUrl = textData.textVersions?.[0]?.formats?.find(f => f.type === 'Formatted Text')?.url;

  if (textUrl) {
    await sleep(1000); // Rate limit
    const textContentResponse = await fetch(textUrl);
    fullText = await textContentResponse.text();
  }

  // 5. Store in database
  await storeBill({
    id: `${congress}-${type}-${number}`,
    congress,
    bill_type: type,
    bill_number: number,
    title: billData.bill.title,
    summary: billData.bill.summaries?.[0]?.text,
    sponsor_name: billData.bill.sponsors?.[0]?.fullName,
    sponsor_party: billData.bill.sponsors?.[0]?.party,
    sponsor_state: billData.bill.sponsors?.[0]?.state,
    sponsor_district: billData.bill.sponsors?.[0]?.district,
    introduced_date: billData.bill.introducedDate,
    latest_action_date: billData.bill.latestAction?.actionDate,
    latest_action_text: billData.bill.latestAction?.text,
    status: determineStatus(billData.bill),
    policy_area: billData.bill.policyArea?.name,
    issue_categories: JSON.stringify(billData.bill.subjects?.legislativeSubjects?.map(s => s.name) || []),
    cosponsor_count: cosponsorCount,
    committees: JSON.stringify(committees),
    full_text: fullText,
    impact_score: calculateImpactScore(billData.bill)
  });
}
```

---

## API Request Summary

**For each bill, we make:**
- 1 request: Bill list (shared across all bills)
- 1 request: Bill details
- 1 request: Cosponsors
- 1 request: Committees
- 1 request: Text versions list
- 1 request: Full text content (if available)

**Total:** ~5-6 requests per bill

**For 8,000 bills:**
- ~40,000-48,000 total requests
- At 1 req/sec: ~11-13 hours
- **Optimized:** ~8,000 requests (skip detailed cosponsors list, use count from bill details)
- At 1 req/sec: ~2-3 hours ✅

---

## Rate Limit Handling

**Congress.gov limits:**
- 1 request per second
- 5,000 requests per hour

**Our strategy:**
```typescript
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Between each request
await sleep(1000); // Wait 1 second
```

---

**All endpoints documented! Ready to build the fetch script.**
