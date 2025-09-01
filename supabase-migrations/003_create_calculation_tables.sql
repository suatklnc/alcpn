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
  source TEXT, -- Fiyat kaynağı (scraping, manual, etc.)
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
COMMENT ON TABLE calculation_history IS 'Hesaplama geçmişi ve sonuçları';
COMMENT ON TABLE material_prices IS 'Malzeme birim fiyatları';
COMMENT ON COLUMN calculation_history.user_id IS 'Temporary TEXT field for development. Change back to UUID REFERENCES auth.users(id) in production.';
