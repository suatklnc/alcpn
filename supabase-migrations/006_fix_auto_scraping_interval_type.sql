-- Fix auto_scraping_interval_hours column type to support decimal values
-- This allows for sub-hour intervals like 5 seconds (0.00139 hours)

-- First, update the column type
ALTER TABLE custom_scraping_urls 
ALTER COLUMN auto_scraping_interval_hours TYPE DECIMAL(10,6);

-- Update the function to handle decimal values properly
CREATE OR REPLACE FUNCTION update_next_auto_scrape_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If auto scraping is enabled and interval changed, update next scrape time
  IF NEW.auto_scraping_enabled = true AND 
     (OLD.auto_scraping_interval_hours IS DISTINCT FROM NEW.auto_scraping_interval_hours OR
      OLD.auto_scraping_enabled = false) THEN
    
    -- Set next scrape time based on last scraped time or current time
    IF NEW.last_auto_scraped_at IS NOT NULL THEN
      NEW.next_auto_scrape_at = NEW.last_auto_scraped_at + 
        (NEW.auto_scraping_interval_hours || ' hours')::INTERVAL;
    ELSE
      NEW.next_auto_scrape_at = NOW() + 
        (NEW.auto_scraping_interval_hours || ' hours')::INTERVAL;
    END IF;
  END IF;
  
  -- If auto scraping is disabled, clear next scrape time
  IF NEW.auto_scraping_enabled = false THEN
    NEW.next_auto_scrape_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the auto-scrape schedule function as well
CREATE OR REPLACE FUNCTION update_auto_scrape_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the custom_scraping_urls table with last scraped time and next scrape time
  UPDATE custom_scraping_urls 
  SET 
    last_auto_scraped_at = NEW.scraped_at,
    next_auto_scrape_at = NEW.scraped_at + (auto_scraping_interval_hours || ' hours')::INTERVAL,
    last_price = NEW.price
  WHERE id = NEW.url_id 
    AND auto_scraping_enabled = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
