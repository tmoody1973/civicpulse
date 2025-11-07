-- Podcast Jobs Queue Table
-- Background job tracking for podcast generation (replaces Raindrop Queue due to binding bug)

CREATE TABLE IF NOT EXISTS podcast_jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'complete', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT DEFAULT 'Job queued for processing...',

  -- Job parameters
  bill_count INTEGER,
  topics TEXT, -- JSON array of topics

  -- Results
  audio_url TEXT,
  duration INTEGER, -- seconds
  bills_covered TEXT, -- JSON array of bill IDs
  transcript TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_status ON podcast_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_user ON podcast_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_queued ON podcast_jobs(status, created_at) WHERE status = 'queued';

-- Index for cleanup queries (delete old jobs)
CREATE INDEX IF NOT EXISTS idx_podcast_jobs_completed ON podcast_jobs(status, completed_at) WHERE status IN ('complete', 'failed');
