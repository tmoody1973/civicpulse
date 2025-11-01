-- Migration: Add sync_history table
-- Purpose: Track automated bill sync runs for admin dashboard

CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,           -- 'daily_bill_sync', 'manual_sync', etc.
  status TEXT NOT NULL,               -- 'success', 'failure', 'running'
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  run_id TEXT,                        -- GitHub Actions run ID
  run_url TEXT,                       -- Link to GitHub Actions run
  error_message TEXT,                 -- Error details if failed
  bills_fetched INTEGER,              -- Number of bills fetched
  bills_processed INTEGER,            -- Number of bills processed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_type ON sync_history(sync_type);
