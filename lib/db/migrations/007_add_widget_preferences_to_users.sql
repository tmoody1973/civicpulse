-- Migration: Add widget_preferences column to users table
-- Purpose: Store dashboard widget customization preferences (show/hide, order)
-- This allows users to customize which widgets they see and in what order

-- Add widget_preferences column to users table
-- Stores JSON with format: {"widgets": {"myBills": {"visible": true, "order": 0}, ...}}
ALTER TABLE users ADD COLUMN widget_preferences TEXT;

-- No index needed as lookups are by user ID which already has an index
