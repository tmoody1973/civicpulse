--
-- Create news_articles table for shared news pool (not per-user)
-- Populated by scheduled refresh every 6 hours
--

CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE, -- Enforce unique URLs
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  published_date TEXT NOT NULL,
  relevant_topics TEXT NOT NULL, -- JSON array of topic IDs
  image_url TEXT, -- OG image from article (or Perplexity fallback)
  image_alt TEXT, -- Alt text for image
  image_photographer TEXT, -- Photographer credit (Pexels only)
  image_photographer_url TEXT, -- Photographer URL (Pexels only)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast lookups by topic and date
CREATE INDEX IF NOT EXISTS idx_news_articles_topics_date
  ON news_articles(relevant_topics, published_date DESC, created_at DESC);

-- Index for cleanup of old articles
CREATE INDEX IF NOT EXISTS idx_news_articles_created
  ON news_articles(created_at);

-- Index for fast URL lookups (duplicate detection)
CREATE INDEX IF NOT EXISTS idx_news_articles_url
  ON news_articles(url);
