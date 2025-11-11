# Database Schema Reference

## Summary

✅ All required tables exist in main app database
✅ Vultr bucket name confirmed: `civic-pulse-podcasts`
✅ Ready for implementation

---

## Tables

### 1. `users` Table
**Location:** `.next/standalone/lib/db/migrations/001_dashboard_features.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  state TEXT,
  district TEXT,
  policy_interests TEXT, -- JSON array of interests
  widget_preferences TEXT, -- JSON object
  subscription_tier TEXT DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields for Workers:**
- `policy_interests`: JSON array like `["Healthcare", "Education", "Climate"]`
- `state`, `district`: For bill filtering
- `subscription_tier`: 'free' | 'pro'

---

### 2. `bills` Table
**Location:** `.next/standalone/lib/db/migrations/002_fix_nullable_columns.sql`

```sql
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,
  bill_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  sponsor_bioguide_id TEXT,
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,
  introduced_date TEXT,
  latest_action_date TEXT,
  latest_action_text TEXT,
  status TEXT DEFAULT 'introduced',
  issue_categories TEXT,  -- JSON array like ["Healthcare", "Social Services"]
  impact_score INTEGER DEFAULT 0,
  cosponsor_count INTEGER DEFAULT 0,
  cosponsors TEXT,
  congress_url TEXT,
  synced_to_algolia_at DATETIME,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  smartbucket_key TEXT,
  synced_to_smartbucket_at DATETIME,
  searchable_text TEXT,
  plain_english_summary TEXT,
  tracking_count INTEGER DEFAULT 0
);

-- Indices
CREATE INDEX idx_bills_congress ON bills(congress);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_searchable_text ON bills(searchable_text);
CREATE INDEX idx_bills_smartbucket_sync ON bills(synced_to_smartbucket_at);
CREATE INDEX idx_bills_tracking_count ON bills(tracking_count DESC, latest_action_date DESC);
```

**Key Fields for Workers:**
- `issue_categories`: JSON array for matching user interests
- `impact_score`: For prioritization (higher = more important)
- `latest_action_date`: For filtering recent bills
- `plain_english_summary`: User-friendly description
- `sponsor_state`: For state-specific filtering

---

### 3. `briefs` Table (Podcasts)
**Location:** `.next/standalone/lib/db/migrations/001_dashboard_features.sql`

```sql
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  written_digest TEXT NOT NULL,
  news_articles TEXT, -- JSON array of article objects
  bills_covered TEXT NOT NULL, -- JSON array of bill IDs
  policy_areas TEXT NOT NULL, -- JSON array of policy areas
  duration INTEGER NOT NULL, -- seconds
  sections TEXT, -- JSON array of sections
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  scheduled_for DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Key Fields for Workers:**
- `audio_url`: Vultr CDN URL from upload
- `transcript`: Full dialogue script from Claude
- `written_digest`: Text summary
- `bills_covered`: Array of bill IDs like `["hr-1234-118", "s-5678-118"]`
- `duration`: Calculated from audio file size

---

### 4. `news_articles` Table
**Location:** `.next/standalone/lib/db/migrations/001_dashboard_features.sql`

```sql
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  policy_area TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  source_name TEXT,
  published_at DATETIME,
  perplexity_enhanced BOOLEAN DEFAULT 0,
  related_bills TEXT, -- JSON array of bill IDs
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields for Workers:**
- `policy_area`: For matching user interests
- `related_bills`: Links news to bills
- `cached_at`, `expires_at`: For cache management

---

## Query Examples

### Fetch Bills for User
```typescript
const query = `
  SELECT * FROM bills
  WHERE (
    issue_categories LIKE '%Healthcare%' OR
    issue_categories LIKE '%Education%'
  )
  AND latest_action_date >= datetime('now', '-30 days')
  ORDER BY impact_score DESC
  LIMIT 3
`;
```

### Save Brief to Database
```typescript
const query = `
  INSERT INTO briefs (
    id, user_id, type, audio_url, transcript,
    written_digest, bills_covered, policy_areas, duration
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

await env.HAKIVO_DB.execute(query, [
  briefId,
  userId,
  'daily',
  audioUrl,
  JSON.stringify(dialogueScript),
  writtenDigest,
  JSON.stringify(billIds),
  JSON.stringify(policyAreas),
  duration
]);
```

### Check for Existing Brief (Cache)
```typescript
const query = `
  SELECT * FROM briefs
  WHERE user_id = ?
  AND type = 'daily'
  AND date(generated_at) = date('now')
`;
```

---

## Vultr Storage Configuration

**Bucket Name:** `civic-pulse-podcasts`
**Region:** `ewr` (East Coast)
**Environment Variables:**
- `VULTR_STORAGE_ENDPOINT`: e.g., `ewr1.vultrobjects.com`
- `VULTR_ACCESS_KEY`: S3-compatible access key
- `VULTR_SECRET_KEY`: S3-compatible secret key
- `VULTR_CDN_URL`: e.g., `https://cdn.hakivo.com`

**Upload Path Structure:**
```
civic-pulse-podcasts/
└── podcasts/
    └── {userId}/
        └── {type}/
            └── {timestamp}.mp3
```

**Example Upload Key:**
```typescript
const key = `podcasts/${userId}/daily/${Date.now()}.mp3`;
// Result: podcasts/user-123/daily/1699123456789.mp3
```

**CDN URL:**
```
https://cdn.hakivo.com/podcasts/user-123/daily/1699123456789.mp3
```

---

## Implementation Notes

### JSON Fields
All JSON fields use `TEXT` type in SQLite and store stringified JSON:
```typescript
// Storing
JSON.stringify(['Healthcare', 'Education'])

// Retrieving
JSON.parse(row.policy_interests)
```

### Date Filtering
SQLite uses `datetime()` function:
```sql
-- Last 30 days
latest_action_date >= datetime('now', '-30 days')

-- Today only
date(generated_at) = date('now')
```

### LIKE Queries for JSON Arrays
Since issue_categories is stored as JSON string:
```sql
issue_categories LIKE '%Healthcare%'
```

This works because JSON arrays stringify to: `["Healthcare","Education"]`

---

## Ready for Implementation ✅

All required database structures exist. Proceed with implementing:
1. Bill queries using `issue_categories` matching
2. Brief saves using all required fields
3. News article caching
4. Vultr uploads to `civic-pulse-podcasts` bucket
