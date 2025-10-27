-- Civic Pulse Database Schema
-- Raindrop SmartSQL (SQLite)

-- Users table (for future auth integration)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  state TEXT,
  district INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Representatives table
CREATE TABLE IF NOT EXISTS representatives (
  bioguide_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  state TEXT NOT NULL,
  district INTEGER,
  chamber TEXT NOT NULL CHECK (chamber IN ('Senate', 'House')),
  image_url TEXT,
  official_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by state and district
CREATE INDEX IF NOT EXISTS idx_representatives_state_district
ON representatives(state, district);

-- Index for chamber filtering
CREATE INDEX IF NOT EXISTS idx_representatives_chamber
ON representatives(chamber);

-- Bills table (source of truth for all bill data)
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY, -- Format: "{billType}{billNumber}-{congress}" e.g. "hr1-119"
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL, -- hr, s, hjres, sjres, hconres, sconres, hres, sres
  bill_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT, -- Full summary (no size limit)
  full_text TEXT, -- Complete bill text (optional, for offline access)

  -- Sponsor info
  sponsor_bioguide_id TEXT,
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,

  -- Dates and status
  introduced_date TEXT NOT NULL,
  latest_action_date TEXT NOT NULL,
  latest_action_text TEXT,
  status TEXT NOT NULL, -- introduced, passed_house, passed_senate, enacted

  -- Enhanced metadata (from congress-enhanced.ts)
  issue_categories TEXT, -- JSON array: ["Healthcare", "Economy"]
  impact_score INTEGER DEFAULT 0, -- 0-100
  cosponsor_count INTEGER DEFAULT 0,
  cosponsors TEXT, -- JSON object: {"count": 45, "names": ["Rep. Smith", ...]}

  -- URLs
  congress_url TEXT, -- Congress.gov URL

  -- Sync tracking
  synced_to_algolia_at DATETIME, -- When last synced to Algolia
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- When last synced from Congress.gov

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(congress, bill_type, bill_number)
);

-- Index for fast lookups by congress and update date
CREATE INDEX IF NOT EXISTS idx_bills_congress_date
ON bills(congress, latest_action_date DESC);

-- Index for sponsor lookups
CREATE INDEX IF NOT EXISTS idx_bills_sponsor
ON bills(sponsor_bioguide_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_bills_status
ON bills(status, congress);

-- Index for impact score (trending, important bills)
CREATE INDEX IF NOT EXISTS idx_bills_impact
ON bills(impact_score DESC, latest_action_date DESC);

-- Index for sync tracking (find bills needing sync)
CREATE INDEX IF NOT EXISTS idx_bills_sync
ON bills(synced_to_algolia_at);

-- User representatives mapping (many-to-many)
CREATE TABLE IF NOT EXISTS user_representatives (
  user_id TEXT NOT NULL,
  bioguide_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, bioguide_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bioguide_id) REFERENCES representatives(bioguide_id) ON DELETE CASCADE
);

-- User interests (for personalized bill feeds)
CREATE TABLE IF NOT EXISTS user_interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast user interest lookups
CREATE INDEX IF NOT EXISTS idx_user_interests_user
ON user_interests(user_id);

-- Podcasts table
CREATE TABLE IF NOT EXISTS podcasts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
  audio_url TEXT NOT NULL,
  transcript TEXT,
  duration INTEGER, -- seconds
  bills_covered TEXT, -- JSON array of bill IDs: ["hr1-119", "s500-119"]
  representatives_mentioned TEXT, -- JSON array of bioguide IDs
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  listened_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user podcasts (most recent first)
CREATE INDEX IF NOT EXISTS idx_podcasts_user
ON podcasts(user_id, generated_at DESC);

-- Index for podcast type filtering
CREATE INDEX IF NOT EXISTS idx_podcasts_type
ON podcasts(type, generated_at DESC);

-- User bill interactions (bookmarks, views, shares)
CREATE TABLE IF NOT EXISTS user_bill_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK(interaction_type IN ('view', 'bookmark', 'share')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Index for user interactions (most recent first)
CREATE INDEX IF NOT EXISTS idx_interactions_user
ON user_bill_interactions(user_id, created_at DESC);

-- Index for bill popularity tracking
CREATE INDEX IF NOT EXISTS idx_interactions_bill
ON user_bill_interactions(bill_id, interaction_type);

-- Bill popularity stats (aggregate data for trending)
CREATE TABLE IF NOT EXISTS bill_stats (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL UNIQUE,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  podcast_mention_count INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Index for trending bills (most viewed, bookmarked)
CREATE INDEX IF NOT EXISTS idx_bill_stats_trending
ON bill_stats(view_count DESC, bookmark_count DESC, last_updated DESC);
