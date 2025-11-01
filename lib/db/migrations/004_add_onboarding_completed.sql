-- Migration: Add onboarding_completed field to users table
-- Purpose: Track whether user has completed the onboarding flow
-- This prevents showing onboarding modal on every login

-- Add onboarding_completed column (defaults to false for existing users)
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;

-- Add onboarding preferences columns
ALTER TABLE users ADD COLUMN zip_code TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN district INTEGER;
ALTER TABLE users ADD COLUMN interests TEXT; -- JSON array of issue preferences

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(state, district);

-- Note: SQLite uses INTEGER for boolean (0 = false, 1 = true)
