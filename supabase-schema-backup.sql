-- Scraping sources table
CREATE TABLE IF NOT EXISTS scraping_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  base_url VARCHAR(500) NOT NULL,
  selectors JSONB NOT NULL, -- { price: string, title?: string, availability?: string, image?: string }
  wait_for_selector VARCHAR(255),
  custom_headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Custom scraping URLs table
CREATE TABLE IF NOT EXISTS custom_scraping_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  material_type VARCHAR(100) NOT NULL, -- MaterialType enum deÄŸeri
  source_id UUID REFERENCES scraping_sources(id) ON DELETE CASCADE,
  custom_selectors JSONB, -- Override selectors for this specific URL
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  last_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Scraping history table (for tracking scraping results)
CREATE TABLE IF NOT EXISTS scraping_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID REFERENCES custom_scraping_urls(id) ON DELETE CASCADE,
  price DECIMAL(10,2),
  title VARCHAR(500),
  availability VARCHAR(100),
  image_url VARCHAR(1000),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraping_sources_active ON scraping_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_scraping_urls_active ON custom_scraping_urls(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_scraping_urls_material_type ON custom_scraping_urls(material_type);
CREATE INDEX IF NOT EXISTS idx_scraping_history_url_id ON scraping_history(url_id);
CREATE INDEX IF NOT EXISTS idx_scraping_history_scraped_at ON scraping_history(scraped_at);

-- RLS (Row Level Security) policies
ALTER TABLE scraping_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_scraping_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_history ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything
CREATE POLICY "Admin full access on scraping_sources" ON scraping_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin full access on custom_scraping_urls" ON custom_scraping_urls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admin full access on scraping_history" ON scraping_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Regular users can only read active sources and URLs
CREATE POLICY "Users can read active scraping_sources" ON scraping_sources
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can read active custom_scraping_urls" ON custom_scraping_urls
  FOR SELECT USING (is_active = true);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_scraping_sources_updated_at 
  BEFORE UPDATE ON scraping_sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_scraping_urls_updated_at 
  BEFORE UPDATE ON custom_scraping_urls 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default scraping sources
INSERT INTO scraping_sources (name, base_url, selectors, wait_for_selector) VALUES
(
  'hepsiburada',
  'hepsiburada.com',
  '{
    "price": ".price-value, .price-current, [data-test-id=\"price-current-price\"]",
    "title": ".product-name, h1, [data-test-id=\"product-name\"]",
    "availability": ".stock-status, .availability, [data-test-id=\"stock-status\"]",
    "image": ".product-image img, .gallery-image img"
  }',
  '.price-value, .price-current'
),
(
  'trendyol',
  'trendyol.com',
  '{
    "price": ".prc-dsc, .prc-org, [data-test-id=\"price-current-price\"]",
    "title": ".pr-new-br, h1, [data-test-id=\"product-name\"]",
    "availability": ".stock-status, .availability",
    "image": ".product-image img, .gallery-image img"
  }',
  '.prc-dsc, .prc-org'
),
(
  'n11',
  'n11.com',
  '{
    "price": ".newPrice, .price, [data-test-id=\"price-current-price\"]",
    "title": ".proName, h1, [data-test-id=\"product-name\"]",
    "availability": ".stock-status, .availability",
    "image": ".product-image img, .gallery-image img"
  }',
  '.newPrice, .price'
),
(
  'insaat-market',
  'insaatmarket.com',
  '{
    "price": ".price, .current-price, [data-test-id=\"price-current-price\"]",
    "title": ".product-title, h1, [data-test-id=\"product-name\"]",
    "availability": ".stock-status, .availability",
    "image": ".product-image img, .gallery-image img"
  }',
  '.price, .current-price'
)
ON CONFLICT (name) DO NOTHING;
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
-- Create calculation history table
CREATE TABLE IF NOT EXISTS calculation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- TODO: Production'da UUID REFERENCES auth.users(id)
  job_type TEXT NOT NULL CHECK (job_type IN ('tavan', 'duvar')),
  sub_type TEXT NOT NULL,
  area DECIMAL(10,2) NOT NULL CHECK (area > 0),
  custom_prices JSONB DEFAULT '{}',
  calculation_result JSONB NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calculation_history_user_id ON calculation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_calculation_history_job_type ON calculation_history(job_type);
CREATE INDEX IF NOT EXISTS idx_calculation_history_created_at ON calculation_history(created_at);

-- Create material prices table for storing current prices
CREATE TABLE IF NOT EXISTS material_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_name TEXT NOT NULL UNIQUE,
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  unit TEXT NOT NULL DEFAULT 'm2',
  source TEXT, -- Fiyat kaynaÄŸÄ± (scraping, manual, etc.)
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Insert default material prices
INSERT INTO material_prices (material_name, unit_price, unit, source) VALUES
  ('aluminyum_profil', 45.00, 'm', 'manual'),
  ('aluminyum_levha', 120.00, 'm2', 'manual'),
  ('aski_teli', 8.50, 'm', 'manual'),
  ('vida', 0.75, 'adet', 'manual'),
  ('dubel', 0.50, 'adet', 'manual'),
  ('silikon', 25.00, 'adet', 'manual'),
  ('boya', 180.00, 'kg', 'manual')
ON CONFLICT (material_name) DO NOTHING;

-- Create RLS policies for calculation_history
ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (development)
CREATE POLICY "Allow all operations for calculation_history" ON calculation_history
  FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for material_prices
ALTER TABLE material_prices ENABLE ROW LEVEL SECURITY;

-- Allow read access for all, write access for admin only
CREATE POLICY "Allow read access for material_prices" ON material_prices
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write access for material_prices" ON material_prices
  FOR ALL USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE calculation_history IS 'Hesaplama geÃ§miÅŸi ve sonuÃ§larÄ±';
COMMENT ON TABLE material_prices IS 'Malzeme birim fiyatlarÄ±';
COMMENT ON COLUMN calculation_history.user_id IS 'Temporary TEXT field for development. Change back to UUID REFERENCES auth.users(id) in production.';
-- Add sharing functionality to calculation_history table
-- Migration: 004_add_sharing_to_calculations.sql

-- Add share_id column for unique shareable links
ALTER TABLE calculation_history 
ADD COLUMN IF NOT EXISTS share_id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add is_shared column to track sharing status
ALTER TABLE calculation_history 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Add shared_at timestamp
ALTER TABLE calculation_history 
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster share_id lookups
CREATE INDEX IF NOT EXISTS idx_calculation_history_share_id ON calculation_history(share_id);

-- Create index for shared calculations
CREATE INDEX IF NOT EXISTS idx_calculation_history_is_shared ON calculation_history(is_shared);

-- Add comment for documentation
COMMENT ON COLUMN calculation_history.share_id IS 'Unique identifier for sharing calculations publicly';
COMMENT ON COLUMN calculation_history.is_shared IS 'Whether this calculation is shared publicly';
COMMENT ON COLUMN calculation_history.shared_at IS 'When the calculation was shared';

-- Update RLS policies to allow public access to shared calculations
-- Allow anyone to read shared calculations
CREATE POLICY "Allow public read access to shared calculations" ON calculation_history
  FOR SELECT USING (is_shared = true);

-- Note: The existing "Allow all operations for calculation_history" policy 
-- already covers the owner's access to their own calculations
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
-- Update price_multiplier column to support more decimal places
-- Change from DECIMAL(5,2) to DECIMAL(10,6) to support values like 0.00083

ALTER TABLE custom_scraping_urls 
ALTER COLUMN price_multiplier TYPE DECIMAL(10,6);

-- Update default value to maintain precision
ALTER TABLE custom_scraping_urls 
ALTER COLUMN price_multiplier SET DEFAULT 1.000000;
