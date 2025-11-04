-- Dashboard Features Migration
-- Adds tables and columns needed for personalized dashboard

-- Enhance users table with NEW personalization fields
-- Note: interests, zip_code, email_notifications, audio_enabled, audio_frequencies already exist
ALTER TABLE users ADD COLUMN notification_preferences TEXT; -- JSON object: {"email": true, "push": true, "daily_brief": true}
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE users ADD COLUMN city TEXT;

-- Briefs table (daily/weekly audio briefings - different from general podcasts)
-- A "brief" is specifically the personalized morning briefing, whereas podcasts are thematic episodes
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
  audio_url TEXT NOT NULL, -- Vultr CDN URL
  transcript TEXT NOT NULL, -- Full transcript with timestamps
  written_digest TEXT NOT NULL, -- Detailed written version with hyperlinks and sources

  -- Content metadata
  news_articles TEXT, -- JSON array of news article objects from Perplexity
  bills_covered TEXT NOT NULL, -- JSON array of bill IDs covered in this brief
  policy_areas TEXT NOT NULL, -- JSON array of policy areas covered

  -- Audio metadata
  duration INTEGER NOT NULL, -- Duration in seconds

  -- Brief structure (for rendering written digest)
  sections TEXT, -- JSON array of sections: [{"type": "news", "items": [...]}, {"type": "legislation", "items": [...]}]

  -- Timestamps
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  scheduled_for DATETIME, -- When brief was scheduled (e.g., 6 AM daily)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user briefs (most recent first)
CREATE INDEX IF NOT EXISTS idx_briefs_user
ON briefs(user_id, generated_at DESC);

-- Index for brief type and scheduled time
CREATE INDEX IF NOT EXISTS idx_briefs_type_schedule
ON briefs(type, scheduled_for DESC);

-- Playback progress tracking (resume where you left off)
CREATE TABLE IF NOT EXISTS playback_progress (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  brief_id TEXT NOT NULL,
  current_time INTEGER NOT NULL, -- Current playback position in seconds
  duration INTEGER NOT NULL, -- Total duration in seconds
  completed BOOLEAN DEFAULT 0, -- Whether user finished listening
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE,
  UNIQUE(user_id, brief_id)
);

-- Index for user playback progress
CREATE INDEX IF NOT EXISTS idx_playback_user
ON playback_progress(user_id, updated_at DESC);

-- Downloaded briefs (for offline playback)
CREATE TABLE IF NOT EXISTS downloaded_briefs (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  brief_id TEXT NOT NULL,
  audio_file_size INTEGER, -- Size in bytes
  downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- Auto-delete old downloads after 30 days

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE,
  UNIQUE(user_id, brief_id)
);

-- Index for user downloads
CREATE INDEX IF NOT EXISTS idx_downloads_user
ON downloaded_briefs(user_id, downloaded_at DESC);

-- Index for cleanup (find expired downloads)
CREATE INDEX IF NOT EXISTS idx_downloads_expired
ON downloaded_briefs(expires_at);

-- News articles cache (Perplexity-enhanced articles)
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY, -- UUID or hash of URL
  title TEXT NOT NULL,
  summary TEXT NOT NULL, -- Perplexity-generated 2-3 sentence summary
  policy_area TEXT NOT NULL, -- e.g., "Healthcare", "Education"
  source_url TEXT NOT NULL UNIQUE,
  source_name TEXT, -- e.g., "The Hill", "Politico"
  published_at DATETIME,

  -- Perplexity metadata
  perplexity_enhanced BOOLEAN DEFAULT 0, -- Whether we enhanced with Perplexity
  related_bills TEXT, -- JSON array of related bill IDs (if any)

  -- Caching
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- Cache expires after 24 hours

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for policy area filtering
CREATE INDEX IF NOT EXISTS idx_news_policy_area
ON news_articles(policy_area, published_at DESC);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_news_cache_expired
ON news_articles(expires_at);

-- Push notification subscriptions (for PWA)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE, -- Push API endpoint
  p256dh_key TEXT NOT NULL, -- Encryption key
  auth_key TEXT NOT NULL, -- Authentication secret
  user_agent TEXT, -- Browser/device info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
ON push_subscriptions(user_id);

-- Email notification queue (for async email sending)
CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily_brief', 'weekly_digest', 'bill_update', 'new_features')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  brief_id TEXT, -- Optional: associated brief ID
  scheduled_for DATETIME NOT NULL,
  sent_at DATETIME,
  error TEXT, -- Error message if sending failed

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE SET NULL
);

-- Index for pending emails (to be sent)
CREATE INDEX IF NOT EXISTS idx_email_queue_pending
ON email_queue(scheduled_for) WHERE sent_at IS NULL;

-- Index for user email history
CREATE INDEX IF NOT EXISTS idx_email_queue_user
ON email_queue(user_id, scheduled_for DESC);

-- Brief generation queue (for scheduled auto-generation)
CREATE TABLE IF NOT EXISTS brief_generation_queue (
  id TEXT PRIMARY KEY, -- UUID
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
  scheduled_for DATETIME NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  failed_at DATETIME,
  error TEXT,
  brief_id TEXT, -- Resulting brief ID once generated

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE SET NULL
);

-- Index for pending generation jobs
CREATE INDEX IF NOT EXISTS idx_brief_queue_pending
ON brief_generation_queue(scheduled_for) WHERE completed_at IS NULL AND failed_at IS NULL;

-- Index for user generation history
CREATE INDEX IF NOT EXISTS idx_brief_queue_user
ON brief_generation_queue(user_id, scheduled_for DESC);
