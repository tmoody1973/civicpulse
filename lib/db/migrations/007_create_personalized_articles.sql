--
-- Create personalized_articles table for storing user-specific news
-- Cached results from Perplexity API searches
--

CREATE TABLE IF NOT EXISTS personalized_articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  published_date TEXT NOT NULL,
  relevant_topics TEXT NOT NULL, -- JSON array of topic IDs
  image_url TEXT, -- Featured image URL
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast lookups by user and cache key
CREATE INDEX IF NOT EXISTS idx_personalized_articles_user_cache
  ON personalized_articles(user_id, cache_key, created_at DESC);

-- Index for cleanup of old cached articles
CREATE INDEX IF NOT EXISTS idx_personalized_articles_created
  ON personalized_articles(created_at);
