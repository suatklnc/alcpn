# Supabase Interaktif Yedek Alma Scripti
# Bu script kullanıcıdan bilgi alarak yedek oluşturur

Write-Host "=== Supabase Interaktif Yedek Alma ===" -ForegroundColor Green
Write-Host ""

# Yedek dizinini oluştur
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "supabase_backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "Yedek dizini oluşturuldu: $backupDir" -ForegroundColor Yellow

# PostgreSQL araçlarını PATH'e ekle
$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"

Write-Host ""
Write-Host "Supabase Database URL'inizi girin:" -ForegroundColor Cyan
Write-Host "Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -ForegroundColor Gray
Write-Host ""

$databaseUrl = Read-Host "Database URL"

if ([string]::IsNullOrEmpty($databaseUrl)) {
    Write-Host "HATA: Database URL boş olamaz!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Yedek alma işlemi başlatılıyor..." -ForegroundColor Yellow
Write-Host ""

# 1. Şema yapılarını yedekle
Write-Host "1. Şema yapıları yedekleniyor..." -ForegroundColor Cyan
try {
    pg_dump --schema-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "$backupDir\schemas.sql" $databaseUrl
    Write-Host "   ✓ Şema yapıları yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Şema yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Veri yedekle
Write-Host "2. Veriler yedekleniyor..." -ForegroundColor Cyan
try {
    pg_dump --data-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "$backupDir\data.sql" $databaseUrl
    Write-Host "   ✓ Veriler yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Veri yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. RLS politikalarını yedekle
Write-Host "3. RLS politikaları yedekleniyor..." -ForegroundColor Cyan
try {
    $rlsQuery = @"
-- RLS Politikaları
SELECT 
    'ALTER TABLE ' || schemaname || '.' || tablename || 
    ' ENABLE ROW LEVEL SECURITY;' as enable_rls
FROM pg_tables 
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime')
AND rowsecurity = true
UNION ALL
SELECT 
    'CREATE POLICY ' || policyname || ' ON ' || schemaname || '.' || tablename ||
    ' FOR ' || cmd ||
    CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
    CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';' as policy_sql
FROM pg_policies 
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime');
"@
    psql $databaseUrl -c $rlsQuery -o "$backupDir\rls_policies.sql"
    Write-Host "   ✓ RLS politikaları yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ RLS yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Fonksiyonları yedekle
Write-Host "4. Fonksiyonlar yedekleniyor..." -ForegroundColor Cyan
try {
    pg_dump --schema-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "$backupDir\functions.sql" $databaseUrl
    Write-Host "   ✓ Fonksiyonlar yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Fonksiyon yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Trigger'ları yedekle
Write-Host "5. Trigger'lar yedekleniyor..." -ForegroundColor Cyan
try {
    $triggersQuery = @"
-- Trigger'lar
SELECT 
    'CREATE TRIGGER ' || triggername || ' ' ||
    CASE WHEN tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END || ' ' ||
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
    END ||
    ' ON ' || schemaname || '.' || tablename ||
    ' FOR EACH ROW EXECUTE FUNCTION ' || pg_get_triggerdef(oid) || ';' as trigger_sql
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'auth', 'storage', 'realtime')
AND NOT tgisinternal;
"@
    psql $databaseUrl -c $triggersQuery -o "$backupDir\triggers.sql"
    Write-Host "   ✓ Trigger'lar yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Trigger yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Index'leri yedekle
Write-Host "6. Index'ler yedekleniyor..." -ForegroundColor Cyan
try {
    $indexesQuery = @"
-- Index'ler
SELECT indexdef || ';' as index_sql
FROM pg_indexes 
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime')
ORDER BY schemaname, tablename, indexname;
"@
    psql $databaseUrl -c $indexesQuery -o "$backupDir\indexes.sql"
    Write-Host "   ✓ Index'ler yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Index yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. View'ları yedekle
Write-Host "7. View'lar yedekleniyor..." -ForegroundColor Cyan
try {
    $viewsQuery = @"
-- View'lar
SELECT 
    'CREATE VIEW ' || schemaname || '.' || viewname || ' AS ' || definition || ';' as view_sql
FROM pg_views 
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime')
ORDER BY schemaname, viewname;
"@
    psql $databaseUrl -c $viewsQuery -o "$backupDir\views.sql"
    Write-Host "   ✓ View'lar yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ View yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Extension'ları yedekle
Write-Host "8. Extension'lar yedekleniyor..." -ForegroundColor Cyan
try {
    $extensionsQuery = @"
-- Extension'lar
SELECT 'CREATE EXTENSION IF NOT EXISTS ' || extname || ';' as extension_sql
FROM pg_extension 
ORDER BY extname;
"@
    psql $databaseUrl -c $extensionsQuery -o "$backupDir\extensions.sql"
    Write-Host "   ✓ Extension'lar yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Extension yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Kullanıcıları yedekle
Write-Host "9. Kullanıcılar yedekleniyor..." -ForegroundColor Cyan
try {
    $usersQuery = @"
-- Kullanıcılar ve Roller
SELECT 
    'CREATE ROLE ' || rolname || 
    CASE WHEN rolsuper THEN ' SUPERUSER' ELSE '' END ||
    CASE WHEN rolinherit THEN ' INHERIT' ELSE ' NOINHERIT' END ||
    CASE WHEN rolcreaterole THEN ' CREATEROLE' ELSE '' END ||
    CASE WHEN rolcreatedb THEN ' CREATEDB' ELSE '' END ||
    CASE WHEN rolcanlogin THEN ' LOGIN' ELSE ' NOLOGIN' END ||
    CASE WHEN rolreplication THEN ' REPLICATION' ELSE '' END ||
    CASE WHEN rolbypassrls THEN ' BYPASSRLS' ELSE '' END ||
    ';' as user_sql
FROM pg_roles 
WHERE rolname NOT LIKE 'pg_%'
ORDER BY rolname;
"@
    psql $databaseUrl -c $usersQuery -o "$backupDir\users.sql"
    Write-Host "   ✓ Kullanıcılar yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Kullanıcı yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Özet rapor oluştur
Write-Host "10. Özet rapor oluşturuluyor..." -ForegroundColor Cyan
$summaryFile = "$backupDir\backup_summary.txt"
$summary = @"
=== SUPABASE YEDEK ÖZET RAPORU ===
Tarih: $(Get-Date)
Çıktı Dizini: $backupDir

Yedeklenen Dosyalar:
- schemas.sql: Şema yapıları
- data.sql: Tablo verileri
- rls_policies.sql: RLS politikaları
- functions.sql: Fonksiyonlar
- triggers.sql: Trigger'lar
- indexes.sql: Index'ler
- views.sql: View'lar
- extensions.sql: Extension'lar
- users.sql: Kullanıcılar ve roller

Kullanım:
1. Yeni bir Supabase projesi oluşturun
2. Bu dosyaları sırasıyla çalıştırın:
   psql -d "YENİ_DATABASE_URL" -f schemas.sql
   psql -d "YENİ_DATABASE_URL" -f functions.sql
   psql -d "YENİ_DATABASE_URL" -f triggers.sql
   psql -d "YENİ_DATABASE_URL" -f indexes.sql
   psql -d "YENİ_DATABASE_URL" -f views.sql
   psql -d "YENİ_DATABASE_URL" -f extensions.sql
   psql -d "YENİ_DATABASE_URL" -f rls_policies.sql
   psql -d "YENİ_DATABASE_URL" -f data.sql
   psql -d "YENİ_DATABASE_URL" -f users.sql

Not: Kullanıcı dosyasını çalıştırmadan önce gerekli izinleri kontrol edin.
"@

$summary | Out-File -FilePath $summaryFile -Encoding UTF8
Write-Host "   ✓ Özet rapor oluşturuldu" -ForegroundColor Green

Write-Host ""
Write-Host "=== YEDEK ALMA TAMAMLANDI ===" -ForegroundColor Green
Write-Host "Yedek dosyaları: $backupDir" -ForegroundColor Yellow
Write-Host "Özet rapor: $summaryFile" -ForegroundColor Yellow

# Dosya boyutlarını göster
Write-Host ""
Write-Host "Dosya Boyutları:" -ForegroundColor Cyan
Get-ChildItem $backupDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "$($_.Name): $size KB" -ForegroundColor White
}

Write-Host ""
Write-Host "Yedek alma işlemi tamamlandı!" -ForegroundColor Green
Write-Host "Dosyaları kontrol etmek için: Get-ChildItem $backupDir" -ForegroundColor Gray
