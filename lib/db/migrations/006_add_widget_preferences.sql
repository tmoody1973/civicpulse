-- Migration: Add widget_preferences table
-- Purpose: Store dashboard widget customization preferences (show/hide, order)
-- This allows users to customize which widgets they see and in what order

-- Create widget_preferences table
CREATE TABLE IF NOT EXISTS widget_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  preferences TEXT NOT NULL, -- JSON string containing widget visibility and order
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_widget_preferences_user_id ON widget_preferences(user_id);

-- Create foreign key reference to users table (SQLite doesn't enforce FKs by default, but this documents the relationship)
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
