-- Civic Pulse Database Schema
-- SQLite database for user management, bill tracking, and civic engagement

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  zip_code TEXT,
  state TEXT,
  district TEXT,
  interests TEXT,
  email_notifications BOOLEAN DEFAULT true,
  audio_enabled BOOLEAN DEFAULT true,
  audio_frequencies TEXT,
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip_code);

-- Bills table with enhanced metadata fields
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
  introduced_date TEXT NOT NULL,
  latest_action_date TEXT NOT NULL,
  latest_action_text TEXT,
  status TEXT NOT NULL,
  issue_categories TEXT,
  impact_score INTEGER DEFAULT 0,
  cosponsor_count INTEGER DEFAULT 0,
  cosponsors TEXT,
  congress_url TEXT,
  synced_to_algolia_at DATETIME,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(congress, bill_type, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_congress_date ON bills(congress, latest_action_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON bills(sponsor_bioguide_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status, congress);
CREATE INDEX IF NOT EXISTS idx_bills_impact ON bills(impact_score DESC, latest_action_date DESC);

-- Representatives table
CREATE TABLE IF NOT EXISTS representatives (
  bioguide_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  chamber TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT,
  image_url TEXT,
  office_address TEXT,
  phone TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  committees TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reps_state_district ON representatives(state, district);
CREATE INDEX IF NOT EXISTS idx_reps_chamber ON representatives(chamber);

-- User bills (many-to-many tracking)
CREATE TABLE IF NOT EXISTS user_bills (
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  status TEXT DEFAULT 'tracking',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, bill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Podcasts table
CREATE TABLE IF NOT EXISTS podcasts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  audio_url TEXT,
  transcript TEXT,
  bills_covered TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_podcasts_user ON podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_generated ON podcasts(generated_at DESC);

-- RSS articles table
CREATE TABLE IF NOT EXISTS rss_articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  author TEXT,
  published_at TIMESTAMP,
  image_url TEXT,
  categories TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rss_feed ON rss_articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_published ON rss_articles(published_at DESC);

-- Vote records table
CREATE TABLE IF NOT EXISTS vote_records (
  id TEXT PRIMARY KEY,
  bioguide_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  vote_date TEXT NOT NULL,
  chamber TEXT NOT NULL,
  roll_call_number INTEGER,
  FOREIGN KEY (bioguide_id) REFERENCES representatives(bioguide_id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);
