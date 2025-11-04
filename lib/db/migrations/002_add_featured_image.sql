-- Add featured_image_url to briefs table
-- For displaying card previews in Marketplace.org-style layout
ALTER TABLE briefs ADD COLUMN featured_image_url TEXT;

-- Add brief title for card display
ALTER TABLE briefs ADD COLUMN title TEXT;
