-- Update price_multiplier column to support more decimal places
-- Change from DECIMAL(5,2) to DECIMAL(10,6) to support values like 0.00083

ALTER TABLE custom_scraping_urls 
ALTER COLUMN price_multiplier TYPE DECIMAL(10,6);

-- Update default value to maintain precision
ALTER TABLE custom_scraping_urls 
ALTER COLUMN price_multiplier SET DEFAULT 1.000000;
