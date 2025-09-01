-- Fix foreign key constraints for development
-- Remove foreign key constraints that reference auth.users table

-- Drop foreign key constraints
ALTER TABLE scraping_sources DROP CONSTRAINT IF EXISTS scraping_sources_created_by_fkey;
ALTER TABLE custom_scraping_urls DROP CONSTRAINT IF EXISTS custom_scraping_urls_created_by_fkey;

-- Change created_by to TEXT to allow any value during development
ALTER TABLE scraping_sources ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE custom_scraping_urls ALTER COLUMN created_by TYPE TEXT;

-- Add comment for future reference
COMMENT ON COLUMN scraping_sources.created_by IS 'Temporary TEXT field for development. Change back to UUID REFERENCES auth.users(id) in production.';
COMMENT ON COLUMN custom_scraping_urls.created_by IS 'Temporary TEXT field for development. Change back to UUID REFERENCES auth.users(id) in production.';
