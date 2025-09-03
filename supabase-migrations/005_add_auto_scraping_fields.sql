-- Add auto-scraping fields to custom_scraping_urls table
ALTER TABLE custom_scraping_urls 
ADD COLUMN IF NOT EXISTS auto_scraping_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_scraping_interval_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS price_multiplier DECIMAL(5,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS last_auto_scraped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_auto_scrape_at TIMESTAMP WITH TIME ZONE;

-- Add index for auto-scraping queries
CREATE INDEX IF NOT EXISTS idx_custom_scraping_urls_auto_scraping 
ON custom_scraping_urls(auto_scraping_enabled, next_auto_scrape_at) 
WHERE auto_scraping_enabled = true;

-- Add index for material type and auto-scraping
CREATE INDEX IF NOT EXISTS idx_custom_scraping_urls_material_auto 
ON custom_scraping_urls(material_type, auto_scraping_enabled) 
WHERE auto_scraping_enabled = true;

-- Function to update next_auto_scrape_at when auto_scraping_interval_hours changes
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

-- Create trigger for auto-scraping time updates
DROP TRIGGER IF EXISTS trigger_update_next_auto_scrape_at ON custom_scraping_urls;
CREATE TRIGGER trigger_update_next_auto_scrape_at
  BEFORE UPDATE ON custom_scraping_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_next_auto_scrape_at();

-- Function to update next_auto_scrape_at after successful scraping
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

-- Create trigger for updating auto-scrape schedule after successful scraping
DROP TRIGGER IF EXISTS trigger_update_auto_scrape_schedule ON scraping_history;
CREATE TRIGGER trigger_update_auto_scrape_schedule
  AFTER INSERT ON scraping_history
  FOR EACH ROW
  WHEN (NEW.success = true)
  EXECUTE FUNCTION update_auto_scrape_schedule();
