-- Migration: Create personalized_news_cache table
-- Purpose: Persistent caching for personalized news articles
-- Date: 2025-01-05

-- Create table
CREATE TABLE IF NOT EXISTS personalized_news_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  article_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  published_date TEXT,
  relevant_topics TEXT NOT NULL, -- JSON array: ["healthcare", "climate"]
  image_url TEXT,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,

  -- Ensure unique articles per user
  UNIQUE(user_id, article_url)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_topics
  ON personalized_news_cache(user_id, relevant_topics);

CREATE INDEX IF NOT EXISTS idx_expires
  ON personalized_news_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_expires
  ON personalized_news_cache(user_id, expires_at);

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_fetched
  ON personalized_news_cache(user_id, fetched_at);
