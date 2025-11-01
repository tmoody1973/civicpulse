-- Migration 002: Fix NOT NULL constraints on optional date fields
-- Congress.gov API doesn't always provide introduced_date, latest_action_date
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new table with correct schema
CREATE TABLE IF NOT EXISTS bills_new (
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
  introduced_date TEXT,  -- Changed from NOT NULL to nullable
  latest_action_date TEXT,  -- Changed from NOT NULL to nullable
  latest_action_text TEXT,
  status TEXT DEFAULT 'introduced',  -- Changed from NOT NULL to nullable with default
  issue_categories TEXT,
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

-- Step 2: Copy data from old table to new table (if any exists)
INSERT INTO bills_new SELECT * FROM bills;

-- Step 3: Drop old table
DROP TABLE bills;

-- Step 4: Rename new table to bills
ALTER TABLE bills_new RENAME TO bills;

-- Step 5: Recreate indices
CREATE INDEX IF NOT EXISTS idx_bills_searchable_text ON bills(searchable_text);
CREATE INDEX IF NOT EXISTS idx_bills_smartbucket_sync ON bills(synced_to_smartbucket_at);
CREATE INDEX IF NOT EXISTS idx_bills_tracking_count ON bills(tracking_count DESC, latest_action_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_congress ON bills(congress);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
