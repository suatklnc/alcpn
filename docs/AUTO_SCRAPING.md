# Otomatik Fiyat Çekme Sistemi

Bu dokümantasyon, URL Tester sayfasına eklenen otomatik zamanlanmış fiyat çekme özelliğini açıklar.

## 🎯 Özellikler

- **Otomatik Zamanlanmış Fiyat Çekme**: Kaydedilmiş URL'ler için belirli aralıklarla otomatik fiyat çekme
- **Fiyat Çarpanı**: Çekilen fiyatı belirli bir çarpan ile çarparak malzeme fiyatını belirleme
- **Esnek Zamanlama**: 1 saat ile 1 hafta arasında çekme aralığı seçimi
- **Manuel Tetikleme**: İstediğiniz zaman manuel olarak fiyat çekme
- **Durum Takibi**: Son çekim zamanı ve bir sonraki çekim zamanını görüntüleme

## 🗄️ Veritabanı Değişiklikleri

### Yeni Alanlar (`custom_scraping_urls` tablosu)

```sql
-- Otomatik fiyat çekme alanları
auto_scraping_enabled BOOLEAN DEFAULT false,
auto_scraping_interval_hours INTEGER DEFAULT 24,
price_multiplier DECIMAL(5,2) DEFAULT 1.00,
last_auto_scraped_at TIMESTAMP WITH TIME ZONE,
next_auto_scrape_at TIMESTAMP WITH TIME ZONE
```

### Yeni İndeksler

```sql
-- Otomatik fiyat çekme sorguları için
CREATE INDEX idx_custom_scraping_urls_auto_scraping 
ON custom_scraping_urls(auto_scraping_enabled, next_auto_scrape_at) 
WHERE auto_scraping_enabled = true;

-- Malzeme türü ve otomatik fiyat çekme için
CREATE INDEX idx_custom_scraping_urls_material_auto 
ON custom_scraping_urls(material_type, auto_scraping_enabled) 
WHERE auto_scraping_enabled = true;
```

## 🔧 API Endpoint'leri

### 1. Otomatik Fiyat Çekme (Admin)

**GET** `/api/admin/auto-scraping`
- Zamanı gelmiş tüm URL'ler için otomatik fiyat çekme işlemini başlatır
- Admin yetkisi gerektirir

**POST** `/api/admin/auto-scraping`
- Belirtilen URL'ler için manuel fiyat çekme işlemini başlatır
- Body: `{ "url_ids": ["uuid1", "uuid2"] }`

### 2. Cron Job Endpoint

**GET** `/api/cron/auto-scraping`
- Zamanlanmış görevler için otomatik fiyat çekme
- Bearer token authentication gerektirir
- Vercel cron job'ları tarafından çağrılır

## 🎨 Kullanıcı Arayüzü

### URL Test Formu

Yeni URL kaydederken otomatik fiyat çekme ayarları:

- **Otomatik Fiyat Çekmeyi Etkinleştir**: Checkbox ile açma/kapama
- **Çekme Aralığı**: 1 saat, 6 saat, 12 saat, 24 saat, 48 saat, 1 hafta seçenekleri
- **Fiyat Çarpanı**: Çekilen fiyatı çarpan ile çarpma (örn: 1.2 = %20 artış)

### Kaydedilmiş URL'ler

Her URL kartında:

- **Otomatik Fiyat Çekme Durumu**: Aktif/Pasif göstergesi
- **Çarpan ve Aralık Bilgisi**: Mevcut ayarlar
- **Son Çekim Zamanı**: En son ne zaman fiyat çekildiği
- **Sonraki Çekim Zamanı**: Bir sonraki otomatik çekim zamanı
- **Şimdi Çek Butonu**: Manuel fiyat çekme
- **Ayarlar Butonu**: Çarpan ve aralık güncelleme

### Genel Kontroller

- **Otomatik Fiyat Çek Butonu**: Tüm zamanı gelmiş URL'ler için toplu fiyat çekme

## ⚙️ Kurulum

### 1. Veritabanı Migrasyonu

```bash
# Supabase'de migration'ı çalıştır
psql -h your-db-host -U postgres -d your-db-name -f supabase-migrations/005_add_auto_scraping_fields.sql
```

### 2. Environment Variables

```bash
# Vercel'de veya .env dosyasında
CRON_SECRET=your-secret-key-here
```

### 3. Vercel Cron Job

`vercel.json` dosyasında otomatik olarak yapılandırılmış:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-scraping",
      "schedule": "0 * * * *"
    }
  ]
}
```

Bu her saat başı otomatik fiyat çekme işlemini tetikler.

### 4. Manuel Cron Job (Opsiyonel)

Sunucunuzda manuel cron job kurmak için:

```bash
# Script'i çalıştırılabilir yap
chmod +x scripts/setup-cron.sh

# Environment variables'ları ayarla
export CRON_SECRET="your-secret-key"
export APP_URL="https://your-app.vercel.app"

# Cron job'u kur
./scripts/setup-cron.sh
```

## 🔄 Çalışma Mantığı

### 1. URL Kaydetme

- Kullanıcı URL'yi test eder ve başarılı olursa kaydeder
- Otomatik fiyat çekme ayarlarını belirler
- `next_auto_scrape_at` zamanı hesaplanır

### 2. Otomatik Fiyat Çekme

- Cron job her saat başı çalışır
- Zamanı gelmiş URL'ler sorgulanır (`next_auto_scrape_at <= NOW()`)
- Her URL için fiyat çekme işlemi gerçekleştirilir
- Başarılı ise:
  - `scraping_history` tablosuna kayıt eklenir
  - `material_prices` tablosu güncellenir
  - `next_auto_scrape_at` zamanı güncellenir

### 3. Fiyat Hesaplama

```
Final Price = Scraped Price × Price Multiplier
```

Örnek:
- Çekilen fiyat: ₺100
- Çarpan: 1.2
- Final fiyat: ₺120

## 📊 Monitoring

### Log Takibi

```bash
# Vercel'de function logları
vercel logs --follow

# Manuel cron job logları
tail -f /var/log/auto-scraping.log
```

### Veritabanı Sorguları

```sql
-- Aktif otomatik fiyat çekme URL'leri
SELECT * FROM custom_scraping_urls 
WHERE auto_scraping_enabled = true 
AND is_active = true;

-- Son 24 saatteki fiyat çekme geçmişi
SELECT * FROM scraping_history 
WHERE scraped_at >= NOW() - INTERVAL '24 hours'
ORDER BY scraped_at DESC;

-- Zamanı gelmiş URL'ler
SELECT * FROM custom_scraping_urls 
WHERE auto_scraping_enabled = true 
AND next_auto_scrape_at <= NOW();
```

## 🚨 Troubleshooting

### Yaygın Sorunlar

1. **Cron job çalışmıyor**
   - Vercel'de cron job'ların aktif olduğunu kontrol edin
   - `CRON_SECRET` environment variable'ının doğru ayarlandığını kontrol edin

2. **Fiyat çekme başarısız**
   - URL'nin hala geçerli olduğunu kontrol edin
   - CSS selector'ın hala doğru olduğunu kontrol edin
   - Rate limiting nedeniyle geçici başarısızlık olabilir

3. **Fiyat güncellenmiyor**
   - `material_prices` tablosunda ilgili malzeme türünün mevcut olduğunu kontrol edin
   - Database trigger'larının çalıştığını kontrol edin

### Debug Komutları

```bash
# Manuel test
curl -H "Authorization: Bearer your-secret" \
     "https://your-app.vercel.app/api/cron/auto-scraping"

# Admin panelinden manuel çalıştırma
# URL Tester sayfasında "Otomatik Fiyat Çek" butonuna tıklayın
```

## 🔒 Güvenlik

- Cron endpoint'i Bearer token authentication kullanır
- Admin endpoint'leri admin yetkisi gerektirir
- Rate limiting ile aşırı kullanım önlenir
- Tüm işlemler loglanır

## 📈 Performans

- Veritabanı sorguları optimize edilmiştir
- İndeksler otomatik fiyat çekme sorgularını hızlandırır
- Rate limiting ile hedef sitelere aşırı yük binmesi önlenir
- Paralel işlem yapılmaz, sıralı işlem ile güvenlik sağlanır
