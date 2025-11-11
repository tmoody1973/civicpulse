-- Add test user for multi-worker pipeline testing
-- This user will be picked up by the every-minute scheduler

INSERT OR REPLACE INTO users (
  id,
  email,
  name,
  state,
  district,
  interests,
  created_at
) VALUES (
  'test-user-multiworker',
  'test-multiworker@example.com',
  'Test User for Multi-Worker Pipeline',
  'CA',
  '12',
  '["healthcare", "education"]',
  datetime('now')
);
