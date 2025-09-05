# Supabase PostgreSQL Yedek Alma Rehberi

Bu rehber, Supabase projenizden kapsamlı bir yedek almanız için farklı yöntemler sunar.

## 🚀 Hızlı Başlangıç

### Yöntem 1: Supabase CLI (Önerilen)

1. **Supabase CLI'yi kurun:**
   ```powershell
   .\install_supabase_cli.ps1
   ```

2. **Supabase'e giriş yapın:**
   ```bash
   supabase login
   ```

3. **Projenizi başlatın:**
   ```bash
   supabase init
   ```

4. **Yedek alın:**
   ```bash
   # Tam yedek
   supabase db dump > full_backup.sql
   
   # Sadece şema
   supabase db dump --schema-only > schema.sql
   
   # Sadece veri
   supabase db dump --data-only > data.sql
   ```

### Yöntem 2: PowerShell Script (Gelişmiş)

1. **PowerShell scriptini çalıştırın:**
   ```powershell
   .\backup_supabase.ps1 -DatabaseUrl "postgresql://user:password@host:port/database"
   ```

### Yöntem 3: Batch Script (Basit)

1. **Batch dosyasını çalıştırın:**
   ```cmd
   .\backup_supabase.bat
   ```

2. **Supabase Database URL'inizi girin**

## 📁 Yedeklenen İçerikler

### Temel Yedekler
- **Şema Yapıları** (`schemas.sql`): Tüm tablo, view, function yapıları
- **Veri** (`data.sql`): Tüm tablo verileri
- **RLS Politikaları** (`rls_policies.sql`): Row Level Security kuralları
- **Fonksiyonlar** (`functions.sql`): Tüm PostgreSQL fonksiyonları

### Detaylı Yedekler
- **Trigger'lar** (`triggers.sql`): Veritabanı trigger'ları
- **Index'ler** (`indexes.sql`): Performans index'leri
- **View'lar** (`views.sql`): Veritabanı view'ları
- **Extension'lar** (`extensions.sql`): PostgreSQL extension'ları
- **Kullanıcılar** (`users.sql`): Kullanıcı hesapları ve roller

## 🔧 Gereksinimler

### Supabase CLI için
- Node.js (v14 veya üzeri)
- npm veya yarn

### PostgreSQL araçları için
- PostgreSQL Client Tools
- `pg_dump` ve `psql` komutları

## 📋 Supabase Database URL Formatı

```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Örnek:**
```
postgresql://postgres:your_password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## 🔄 Yedek Geri Yükleme

### 1. Yeni Supabase Projesi Oluşturun
- Supabase Dashboard'dan yeni proje oluşturun
- Database URL'ini alın

### 2. Yedekleri Geri Yükleyin
```bash
# Sırasıyla çalıştırın:
psql "YENİ_DATABASE_URL" -f schemas.sql
psql "YENİ_DATABASE_URL" -f functions.sql
psql "YENİ_DATABASE_URL" -f triggers.sql
psql "YENİ_DATABASE_URL" -f indexes.sql
psql "YENİ_DATABASE_URL" -f views.sql
psql "YENİ_DATABASE_URL" -f extensions.sql
psql "YENİ_DATABASE_URL" -f rls_policies.sql
psql "YENİ_DATABASE_URL" -f data.sql
psql "YENİ_DATABASE_URL" -f users.sql
```

## ⚠️ Önemli Notlar

1. **Güvenlik**: Database URL'inizi güvenli tutun
2. **İzinler**: Kullanıcı dosyasını çalıştırmadan önce gerekli izinleri kontrol edin
3. **Sıra**: Dosyaları belirtilen sırada çalıştırın
4. **Test**: Yedekleri geri yüklemeden önce test ortamında deneyin

## 🆘 Sorun Giderme

### PostgreSQL araçları bulunamıyor
```bash
# Windows için PostgreSQL kurulumu
# https://www.postgresql.org/download/windows/
```

### Supabase CLI kurulumu başarısız
```bash
# Alternatif kurulum yöntemleri:
# Chocolatey
choco install supabase

# Scoop
scoop install supabase

# Manuel indirme
# https://github.com/supabase/cli/releases
```

### Bağlantı hatası
- Database URL'inizi kontrol edin
- Şifrenizin doğru olduğundan emin olun
- Firewall ayarlarını kontrol edin

## 📞 Destek

Sorunlarınız için:
- Supabase Dokümantasyonu: https://supabase.com/docs
- PostgreSQL Dokümantasyonu: https://www.postgresql.org/docs/
- GitHub Issues: https://github.com/supabase/cli/issues
