-- Migration 003: Add columns for cosponsors, actions, and amendments
-- These enhance bill information for better search and analysis

-- Add cosponsor data
ALTER TABLE bills ADD COLUMN cosponsors TEXT; -- JSON array of cosponsor objects
ALTER TABLE bills ADD COLUMN cosponsor_count INTEGER DEFAULT 0;

-- Add action/legislative history data
ALTER TABLE bills ADD COLUMN actions TEXT; -- JSON array of legislative actions

-- Add amendment data
ALTER TABLE bills ADD COLUMN amendments TEXT; -- JSON array of amendments
ALTER TABLE bills ADD COLUMN amendment_count INTEGER DEFAULT 0;

-- Add tracking columns
ALTER TABLE bills ADD COLUMN fetched_cosponsors_at TEXT;
ALTER TABLE bills ADD COLUMN fetched_actions_at TEXT;
ALTER TABLE bills ADD COLUMN fetched_amendments_at TEXT;
