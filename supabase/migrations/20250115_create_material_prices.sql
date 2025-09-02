-- Create material_prices table
CREATE TABLE IF NOT EXISTS material_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_type TEXT NOT NULL UNIQUE,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE material_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view material prices" ON material_prices
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert material prices" ON material_prices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update material prices" ON material_prices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default prices
INSERT INTO material_prices (material_type, unit_price) VALUES
  ('beyaz_alcipan', 45.00),
  ('c_profili', 8.00),
  ('u_profili', 12.00),
  ('aski_teli', 2.50),
  ('aski_masasi', 3.00),
  ('klips', 0.80),
  ('vida', 0.30)
ON CONFLICT (material_type) DO NOTHING;
