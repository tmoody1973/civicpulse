# Interests & Policy Areas - Complete System

## Overview

HakiVo uses a **three-layer system** to match user interests with relevant legislation:

1. **User Interests** → What users care about (15 categories)
2. **Congress.gov Policy Areas** → How bills are officially categorized (~32 areas)
3. **SmartBuckets Semantic Search** → RAG-powered matching for nuanced filtering

---

## 1. User Interests (Onboarding + Settings)

### 15 Interest Categories

Users select topics they care about from these categories:

| Category | ID | Icon | Example Bills |
|----------|-----|------|---------------|
| Healthcare | `healthcare` | Stethoscope | Medicare, Drug prices, ACA |
| Education | `education` | GraduationCap | Student loans, School funding |
| Science & Research | `science` | Flask | NSF funding, Research grants |
| Technology & Privacy | `technology` | Cpu | Data protection, Net neutrality |
| Climate & Environment | `climate` | Leaf | Clean energy, EPA regulations |
| Economy & Jobs | `economy` | DollarSign | Employment, Wages, Labor rights |
| Business & Trade | `business` | Briefcase | Trade agreements, Small business |
| Taxes & Budget | `taxes` | Calculator | Tax reform, Federal budget |
| Immigration | `immigration` | Globe | Border policy, DACA, Visas |
| Housing | `housing` | Home | Affordable housing, Homelessness |
| Defense & Security | `defense` | Shield | Military, National security |
| Transportation & Infrastructure | `transportation` | Truck | Roads, Bridges, Public transit |
| Agriculture & Food | `agriculture` | Sprout | Farm subsidies, Food stamps |
| Social Services | `social` | Heart | Social Security, Medicare, Welfare |
| Civil Rights & Justice | `civil-rights` | Scale | Voting rights, Criminal justice |

### Storage

```sql
-- users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  interests TEXT NOT NULL, -- JSON array: ["healthcare", "education", "climate"]
  -- ... other fields
);
```

---

## 2. Bill Policy Areas (Congress.gov)

### How Bills Are Tagged

Every bill from Congress.gov has:

**A. `policy_area` (string)** - Single primary category
- Examples: "Health", "Education", "Environmental Protection"
- Official Congress.gov taxonomy (~32 policy areas)
- Required field for all bills

**B. `issue_categories` (array)** - Specific legislative subjects
- Examples: ["Medical research", "Drug safety", "Health insurance"]
- Multiple subjects per bill (0-20+)
- More granular than policy areas

### Congress.gov Policy Areas (32 Total)

From [Congress.gov Policy Area Taxonomy](https://www.congress.gov/help/field-values/policy-area):

1. Agriculture and Food
2. Animals
3. Armed Forces and National Security
4. Arts, Culture, Religion
5. Civil Rights and Liberties
6. Commerce
7. Congress
8. Crime and Law Enforcement
9. Economics and Public Finance
10. Education
11. Emergency Management
12. Energy
13. Environmental Protection
14. Families
15. Finance and Financial Sector
16. Foreign Trade and International Finance
17. Government Operations and Politics
18. Health
19. Housing and Community Development
20. Immigration
21. International Affairs
22. Labor and Employment
23. Law
24. Native Americans
25. Public Lands and Natural Resources
26. Science, Technology, Communications
27. Social Sciences and History
28. Social Welfare
29. Sports and Recreation
30. Taxation
31. Transportation and Public Works
32. Water Resources Development

### Storage

```sql
-- bills table
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,
  bill_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  policy_area TEXT, -- Single official policy area
  issue_categories TEXT NOT NULL, -- JSON array of subjects
  -- ... other fields
);
```

---

## 3. Mapping: User Interests → Bill Policy Areas

### Direct Mapping Table

| User Interest | Maps to `policy_area` | Maps to `issue_categories` (keywords) |
|---------------|----------------------|--------------------------------------|
| `healthcare` | "Health" | "health", "medical", "medicare", "medicaid", "insurance", "hospital", "drug", "pharmaceutical" |
| `education` | "Education" | "education", "school", "college", "university", "student", "teacher", "learning" |
| `science` | "Science, Technology, Communications" | "science", "research", "NSF", "innovation", "laboratory", "scientific" |
| `technology` | "Science, Technology, Communications" | "technology", "internet", "privacy", "data", "cybersecurity", "broadband", "AI", "software" |
| `climate` | "Environmental Protection", "Energy" | "climate", "environment", "renewable", "emissions", "pollution", "conservation", "EPA" |
| `economy` | "Economics and Public Finance", "Labor and Employment" | "economy", "employment", "jobs", "wages", "labor", "unemployment", "workforce" |
| `business` | "Commerce", "Foreign Trade and International Finance" | "business", "trade", "commerce", "small business", "entrepreneurship", "exports", "imports" |
| `taxes` | "Taxation", "Economics and Public Finance" | "tax", "taxation", "IRS", "revenue", "fiscal", "budget", "deficit" |
| `immigration` | "Immigration" | "immigration", "visa", "border", "refugee", "asylum", "citizenship", "deportation" |
| `housing` | "Housing and Community Development" | "housing", "affordable housing", "homelessness", "HUD", "rental", "mortgage" |
| `defense` | "Armed Forces and National Security" | "defense", "military", "security", "armed forces", "veterans", "Pentagon", "DOD" |
| `transportation` | "Transportation and Public Works" | "transportation", "infrastructure", "roads", "bridges", "transit", "highway", "rail" |
| `agriculture` | "Agriculture and Food" | "agriculture", "farm", "food", "crop", "livestock", "SNAP", "food stamps", "nutrition" |
| `social` | "Social Welfare", "Families" | "social security", "welfare", "medicare", "medicaid", "benefits", "assistance", "elderly" |
| `civil-rights` | "Civil Rights and Liberties", "Crime and Law Enforcement" | "civil rights", "voting", "justice", "criminal justice", "police", "discrimination", "equality" |

---

## 4. Implementation: Filtering Bills by Interests

### Option A: SQL Filtering (Fast, Basic)

```typescript
// Get bills matching user interests
async function getBillsForUser(userId: string) {
  // Get user interests
  const user = await db.query(`SELECT interests FROM users WHERE id = ?`, [userId]);
  const interests = JSON.parse(user.interests); // ["healthcare", "education"]

  // Map interests to policy areas
  const policyAreas = interests.flatMap(interest => INTEREST_TO_POLICY_MAP[interest]);

  // Query bills
  const bills = await db.query(`
    SELECT * FROM bills
    WHERE policy_area IN (${policyAreas.map(() => '?').join(',')})
    ORDER BY introduced_date DESC
    LIMIT 50
  `, policyAreas);

  return bills;
}

// Mapping object
const INTEREST_TO_POLICY_MAP = {
  'healthcare': ['Health'],
  'education': ['Education'],
  'climate': ['Environmental Protection', 'Energy'],
  // ... etc
};
```

### Option B: SmartBuckets Semantic Search (Intelligent, Nuanced)

```typescript
// Use Raindrop SmartBuckets for semantic bill matching
async function getBillsForUserSemantic(userId: string) {
  // Get user interests
  const user = await db.query(`SELECT interests FROM users WHERE id = ?`, [userId]);
  const interests = JSON.parse(user.interests); // ["healthcare", "education", "climate"]

  // Convert interests to natural language query
  const query = interests.map(interest => {
    const label = ISSUE_CATEGORIES.find(c => c.id === interest)?.label;
    return label;
  }).join(', ');
  // Result: "Healthcare, Education, Climate & Environment"

  // Query SmartBuckets
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/buckets/bills/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      limit: 50,
      filters: {
        congress: 119 // Current congress
      }
    })
  });

  const results = await response.json();
  return results.documents; // Bills ranked by relevance
}
```

**Why SmartBuckets?**
- **Semantic understanding**: Matches "climate change" with "renewable energy" bills automatically
- **Contextual ranking**: Orders bills by relevance, not just keyword match
- **Handles synonyms**: "healthcare" matches "medical", "health insurance", "medicare"
- **Cross-topic bills**: Finds bills that touch multiple user interests

---

## 5. SmartBuckets Setup for Bills

### Create Bills Bucket

```typescript
// lib/search/setup-smartbuckets.ts

async function setupBillsBucket() {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'bills',
      description: 'U.S. Congressional Bills - searchable by topic, sponsor, and content',
      schema: {
        id: 'string',
        congress: 'number',
        bill_type: 'string',
        bill_number: 'number',
        title: 'string',
        summary: 'text', // Full-text searchable
        full_text: 'text', // Full-text searchable
        policy_area: 'string',
        issue_categories: 'array',
        sponsor_name: 'string',
        introduced_date: 'date',
        status: 'string'
      },
      indexFields: ['title', 'summary', 'full_text', 'policy_area', 'issue_categories'] // Enable semantic search
    })
  });

  return response.json();
}
```

### Index Bills in SmartBuckets

```typescript
// scripts/index-bills-smartbuckets.ts

async function indexBillsInSmartBuckets() {
  // Get all bills from database
  const bills = await db.query(`SELECT * FROM bills WHERE full_text IS NOT NULL`);

  // Index in SmartBuckets (batch upload)
  for (let i = 0; i < bills.length; i += 100) {
    const batch = bills.slice(i, i + 100);

    await fetch(`${RAINDROP_SERVICE_URL}/api/buckets/bills/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: batch.map(bill => ({
          id: bill.id,
          content: `${bill.title}\n\n${bill.summary}\n\n${bill.full_text}`,
          metadata: {
            congress: bill.congress,
            bill_type: bill.bill_type,
            bill_number: bill.bill_number,
            policy_area: bill.policy_area,
            issue_categories: JSON.parse(bill.issue_categories),
            sponsor_name: bill.sponsor_name,
            introduced_date: bill.introduced_date
          }
        }))
      })
    });

    console.log(`Indexed ${i + batch.length}/${bills.length} bills`);
  }
}
```

---

## 6. Dashboard Implementation

### Personalized Bill Feed

```typescript
// app/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPersonalizedBills() {
      // Fetch bills based on user interests
      const response = await fetch('/api/bills/personalized');
      const data = await response.json();
      setBills(data.bills);
      setLoading(false);
    }

    loadPersonalizedBills();
  }, []);

  return (
    <div>
      <h1>Your Personalized Bill Feed</h1>
      {loading ? (
        <p>Loading bills based on your interests...</p>
      ) : (
        <div>
          {bills.map(bill => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### API Route for Personalized Bills

```typescript
// app/api/bills/personalized/route.ts

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  // Get current user
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user interests
  const userProfile = await db.query(`SELECT interests FROM users WHERE id = ?`, [user.id]);
  const interests = JSON.parse(userProfile.interests);

  if (!interests || interests.length === 0) {
    // No interests set - return recent bills
    const recentBills = await db.query(`
      SELECT * FROM bills
      WHERE congress = 119
      ORDER BY introduced_date DESC
      LIMIT 50
    `);
    return NextResponse.json({ bills: recentBills });
  }

  // Use SmartBuckets for semantic search
  const query = interests.map(interest => {
    const label = ISSUE_CATEGORIES.find(c => c.id === interest)?.label;
    return label;
  }).join(', ');

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/buckets/bills/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      limit: 50,
      filters: {
        congress: 119
      }
    })
  });

  const results = await response.json();

  return NextResponse.json({
    bills: results.documents,
    matchedInterests: interests
  });
}
```

---

## 7. Testing the System

### Test User Flow

1. **Onboarding**: User selects interests (e.g., healthcare, climate, education)
2. **Settings**: User can view and edit interests at any time
3. **Dashboard**: Shows personalized bill feed based on interests
4. **Bill Detail**: Shows why bill matched user interests (e.g., "Matches your interest in Healthcare")

### Sample Queries

```typescript
// User interested in healthcare
// Should match:
const healthcareBills = [
  "HR 1234: Affordable Insulin Act", // policy_area = "Health"
  "S 5678: Medicare Expansion Act", // issue_categories includes "Medicare"
  "HR 9012: Drug Price Transparency", // issue_categories includes "Pharmaceutical"
];

// User interested in climate
// Should match:
const climateBills = [
  "HR 3456: Clean Energy Investment Act", // policy_area = "Energy"
  "S 7890: EPA Emissions Standards", // policy_area = "Environmental Protection"
  "HR 2345: Renewable Energy Tax Credits", // issue_categories includes "Renewable energy"
];

// User interested in both healthcare + climate
// Should match bills from both categories
// PLUS bills that touch both (e.g., "Climate Change and Public Health Act")
```

---

## 8. Next Steps

### Phase 1: Basic Filtering ✅
- [x] Add Interests UI to Settings page
- [x] Map user interests to bill policy areas
- [ ] Filter dashboard bills by user interests (SQL)

### Phase 2: SmartBuckets Integration
- [ ] Set up SmartBuckets for bills
- [ ] Index all bills with full text
- [ ] Implement semantic search API
- [ ] Replace SQL filtering with SmartBuckets

### Phase 3: Advanced Personalization
- [ ] Track user engagement (which bills they view/save)
- [ ] Machine learning recommendations
- [ ] "Discover new interests" based on behavior
- [ ] Email digests with personalized bills

---

## Summary

**Current State:**
- ✅ User interests captured in onboarding
- ✅ Settings page shows interests UI
- ✅ Bills have policy_area and issue_categories
- ✅ Mapping defined between interests and policy areas

**Next Immediate Step:**
- Add filtering to `/api/bills/personalized` endpoint
- Update dashboard to call `/api/bills/personalized`
- Show "Matches your interests" badges on bill cards

**Future Enhancement:**
- Set up SmartBuckets for semantic bill search
- Index bills for RAG-powered recommendations
- Implement "Why am I seeing this?" explanations
