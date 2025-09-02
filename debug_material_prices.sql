-- Material prices tablosunun yapısını kontrol et
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'material_prices' 
ORDER BY ordinal_position;

-- RLS politikalarını kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'material_prices';

-- Mevcut kayıtları kontrol et
SELECT * FROM material_prices WHERE material_type = 'aski_teli';

-- RLS durumunu kontrol et
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'material_prices';
