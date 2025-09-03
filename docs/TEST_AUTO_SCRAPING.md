# Otomatik Fiyat Çekme Test Senaryosu

Bu dokümantasyon, otomatik fiyat çekme özelliğinin nasıl test edileceğini açıklar.

## 🧪 Test Adımları

### 1. Veritabanı Hazırlığı

```bash
# Supabase'de migration'ı çalıştır
psql -h your-db-host -U postgres -d your-db-name -f supabase-migrations/005_add_auto_scraping_fields.sql
```

### 2. Environment Variables

```bash
# .env dosyasına ekle
CRON_SECRET=test-secret-key-123
```

### 3. Test URL'i Ekleme

1. Admin paneline git: `http://localhost:3000/admin/url-tester`
2. Test formunda:
   - **URL**: `https://example.com/product` (test için)
   - **CSS Selector**: `.price`
   - **Malzeme Türü**: `beyaz_alcipan`
   - **Otomatik Fiyat Çekme**: ✅ Etkinleştir
   - **Çekme Aralığı**: `1 Saat`
   - **Fiyat Çarpanı**: `1.2`

3. "Test Et" butonuna tıkla
4. Başarılı olursa "Kaydet" butonuna tıkla

### 4. Manuel Test

#### A. Tek URL Test

```bash
# Manuel fiyat çekme test
curl -X POST http://localhost:3000/api/admin/auto-scraping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{"url_ids": ["your-url-id"]}'
```

#### B. Tüm URL'ler Test

```bash
# Tüm zamanı gelmiş URL'ler için test
curl -X GET http://localhost:3000/api/admin/auto-scraping \
  -H "Authorization: Bearer your-admin-token"
```

#### C. Cron Job Test

```bash
# Cron endpoint test
curl -X GET http://localhost:3000/api/cron/auto-scraping \
  -H "Authorization: Bearer test-secret-key-123"
```

### 5. Veritabanı Kontrolü

```sql
-- Otomatik fiyat çekme ayarları
SELECT 
  id,
  url,
  material_type,
  auto_scraping_enabled,
  auto_scraping_interval_hours,
  price_multiplier,
  last_auto_scraped_at,
  next_auto_scrape_at
FROM custom_scraping_urls 
WHERE auto_scraping_enabled = true;

-- Fiyat çekme geçmişi
SELECT 
  sh.*,
  csu.material_type,
  csu.url
FROM scraping_history sh
JOIN custom_scraping_urls csu ON sh.url_id = csu.id
ORDER BY sh.scraped_at DESC
LIMIT 10;

-- Malzeme fiyatları
SELECT 
  material_type,
  unit_price,
  updated_at
FROM material_prices
ORDER BY updated_at DESC;
```

## 🎯 Beklenen Sonuçlar

### 1. URL Kaydetme
- URL başarıyla kaydedilmeli
- Otomatik fiyat çekme ayarları kaydedilmeli
- `next_auto_scrape_at` zamanı hesaplanmalı

### 2. Manuel Fiyat Çekme
- API başarılı response dönmeli
- `scraping_history` tablosuna kayıt eklenmeli
- `material_prices` tablosu güncellenmeli
- `next_auto_scrape_at` zamanı güncellenmeli

### 3. Otomatik Fiyat Çekme
- Zamanı gelmiş URL'ler bulunmalı
- Her URL için fiyat çekme işlemi gerçekleşmeli
- Başarılı/başarısız sonuçlar loglanmalı
- Malzeme fiyatları güncellenmeli

## 🐛 Troubleshooting

### Yaygın Hatalar

1. **"No URLs ready for auto-scraping"**
   - URL'lerin `auto_scraping_enabled = true` olduğunu kontrol et
   - `next_auto_scrape_at` zamanının geçmiş olduğunu kontrol et

2. **"Failed to fetch URLs for auto-scraping"**
   - Veritabanı bağlantısını kontrol et
   - Migration'ın çalıştığını kontrol et

3. **"Error updating material price"**
   - `material_prices` tablosunun mevcut olduğunu kontrol et
   - RLS policy'lerini kontrol et

4. **"Unauthorized" (Cron endpoint)**
   - `CRON_SECRET` environment variable'ını kontrol et
   - Authorization header'ını kontrol et

### Debug Komutları

```bash
# Veritabanı bağlantısı test
curl -X GET http://localhost:3000/api/material-prices

# Admin endpoint test
curl -X GET http://localhost:3000/api/admin/custom-scraping-urls

# Test scraping endpoint
curl -X POST http://localhost:3000/api/admin/test-scraping \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "selector": ".price",
    "material_type": "beyaz_alcipan"
  }'
```

## 📊 Test Verileri

### Örnek Test URL'leri

```json
{
  "url": "https://www.hepsiburada.com/alci-pan-beyaz-12-5mm-120x240cm-p-HBV00000QZQZP",
  "selector": ".price-value",
  "material_type": "beyaz_alcipan",
  "auto_scraping_enabled": true,
  "auto_scraping_interval_hours": 24,
  "price_multiplier": 1.1
}
```

### Beklenen Fiyat Hesaplaması

```
Çekilen Fiyat: ₺45.00
Çarpan: 1.2
Final Fiyat: ₺45.00 × 1.2 = ₺54.00
```

## 🔄 Sürekli Test

### 1. Zamanlanmış Test

```bash
# Her 5 dakikada bir test et
while true; do
  echo "Testing auto-scraping at $(date)"
  curl -X GET http://localhost:3000/api/cron/auto-scraping \
    -H "Authorization: Bearer test-secret-key-123"
  sleep 300
done
```

### 2. Log Monitoring

```bash
# Development server logları
npm run dev

# Vercel function logları
vercel logs --follow
```

## ✅ Test Checklist

- [ ] Veritabanı migration'ı çalıştırıldı
- [ ] Environment variables ayarlandı
- [ ] Test URL'i eklendi
- [ ] Manuel fiyat çekme test edildi
- [ ] Otomatik fiyat çekme test edildi
- [ ] Cron endpoint test edildi
- [ ] Veritabanı güncellemeleri kontrol edildi
- [ ] Hata durumları test edildi
- [ ] Log kayıtları kontrol edildi
- [ ] Performance test edildi

## 📈 Performance Test

### Yük Testi

```bash
# 10 eşzamanlı istek
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/cron/auto-scraping \
    -H "Authorization: Bearer test-secret-key-123" &
done
wait
```

### Memory Usage

```bash
# Node.js memory kullanımı
ps aux | grep node
```

## 🎉 Başarı Kriterleri

1. **Fonksiyonellik**: Tüm özellikler beklendiği gibi çalışmalı
2. **Performance**: 100 URL için < 5 dakika
3. **Reliability**: %95+ başarı oranı
4. **Error Handling**: Hatalar düzgün loglanmalı
5. **Data Integrity**: Veritabanı tutarlılığı korunmalı
