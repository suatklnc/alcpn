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
  material_type VARCHAR(100) NOT NULL, -- MaterialType enum değeri
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
