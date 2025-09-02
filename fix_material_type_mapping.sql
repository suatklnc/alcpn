-- Material type mapping'i düzelt
-- karopan_t_ana_tasiyici -> t_ana_tasiyici

UPDATE material_prices 
SET material_type = 't_ana_tasiyici' 
WHERE material_type = 'karopan_t_ana_tasiyici';

-- Diğer karopan type'ları da güncelle
UPDATE material_prices 
SET material_type = 'tali_120_tasiyici' 
WHERE material_type = 'karopan_tali_120_tasiyici';

UPDATE material_prices 
SET material_type = 'tali_60_tasiyici' 
WHERE material_type = 'karopan_tali_60_tasiyici';

UPDATE material_prices 
SET material_type = 'plaka' 
WHERE material_type = 'karopan_plaka';

UPDATE material_prices 
SET material_type = 'omega' 
WHERE material_type = 'karopan_omega';

UPDATE material_prices 
SET material_type = 'alcipan' 
WHERE material_type = 'karopan_alcipan';

UPDATE material_prices 
SET material_type = 'agraf' 
WHERE material_type = 'karopan_agraf';

UPDATE material_prices 
SET material_type = 'dubel_civi' 
WHERE material_type = 'karopan_dubel_civi';

UPDATE material_prices 
SET material_type = 'vida_25' 
WHERE material_type = 'karopan_vida_25';

UPDATE material_prices 
SET material_type = 'vida_35' 
WHERE material_type = 'karopan_vida_35';

-- Klipin type'ları da güncelle
UPDATE material_prices 
SET material_type = 't_ana_tasiyici' 
WHERE material_type = 'klipin_t_ana_tasiyici';

UPDATE material_prices 
SET material_type = 'tali_120_tasiyici' 
WHERE material_type = 'klipin_tali_120_tasiyici';

UPDATE material_prices 
SET material_type = 'tali_60_tasiyici' 
WHERE material_type = 'klipin_tali_60_tasiyici';

UPDATE material_prices 
SET material_type = 'plaka' 
WHERE material_type = 'klipin_plaka';

UPDATE material_prices 
SET material_type = 'omega' 
WHERE material_type = 'klipin_omega';

UPDATE material_prices 
SET material_type = 'alcipan' 
WHERE material_type = 'klipin_alcipan';

UPDATE material_prices 
SET material_type = 'agraf' 
WHERE material_type = 'klipin_agraf';

UPDATE material_prices 
SET material_type = 'dubel_civi' 
WHERE material_type = 'klipin_dubel_civi';

UPDATE material_prices 
SET material_type = 'vida_25' 
WHERE material_type = 'klipin_vida_25';

UPDATE material_prices 
SET material_type = 'vida_35' 
WHERE material_type = 'klipin_vida_35';

-- Duvar type'ları da güncelle
UPDATE material_prices 
SET material_type = 'alcipan' 
WHERE material_type = 'duvar_alcipan';

UPDATE material_prices 
SET material_type = 'c_profili' 
WHERE material_type = 'duvar_c_profili';

UPDATE material_prices 
SET material_type = 'u_profili' 
WHERE material_type = 'duvar_u_profili';

UPDATE material_prices 
SET material_type = 'vida' 
WHERE material_type = 'duvar_vida';

UPDATE material_prices 
SET material_type = 'dubel_civi' 
WHERE material_type = 'duvar_dubel';

-- Zemin type'ları da güncelle
UPDATE material_prices 
SET material_type = 'alcipan' 
WHERE material_type = 'zemin_alcipan';

UPDATE material_prices 
SET material_type = 'c_profili' 
WHERE material_type = 'zemin_c_profili';

UPDATE material_prices 
SET material_type = 'u_profili' 
WHERE material_type = 'zemin_u_profili';

UPDATE material_prices 
SET material_type = 'vida' 
WHERE material_type = 'zemin_vida';

UPDATE material_prices 
SET material_type = 'dubel_civi' 
WHERE material_type = 'zemin_dubel';

-- Sonuçları kontrol et
SELECT material_type, unit_price FROM material_prices ORDER BY material_type;
