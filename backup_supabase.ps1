# Supabase PostgreSQL Yedek Alma Scripti
# Bu script Supabase projenizden kapsamlı yedek alır

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = ".\supabase_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

Write-Host "=== Supabase Yedek Alma Başlatılıyor ===" -ForegroundColor Green

# Çıktı dizinini oluştur
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir
    Write-Host "Çıktı dizini oluşturuldu: $OutputDir" -ForegroundColor Yellow
}

# PostgreSQL bağlantı bilgilerini ayıkla
$connectionString = $DatabaseUrl
Write-Host "Veritabanına bağlanılıyor..." -ForegroundColor Yellow

# 1. Şema yapılarını yedekle
Write-Host "1. Şema yapıları yedekleniyor..." -ForegroundColor Cyan
$schemaFile = Join-Path $OutputDir "schemas.sql"
& pg_dump --schema-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f $schemaFile $connectionString

# 2. Veri yedekle
Write-Host "2. Veriler yedekleniyor..." -ForegroundColor Cyan
$dataFile = Join-Path $OutputDir "data.sql"
& pg_dump --data-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f $dataFile $connectionString

# 3. RLS politikalarını yedekle
Write-Host "3. RLS politikaları yedekleniyor..." -ForegroundColor Cyan
$rlsFile = Join-Path $OutputDir "rls_policies.sql"
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

& psql -d $connectionString -c $rlsQuery -o $rlsFile

# 4. Fonksiyonları yedekle
Write-Host "4. Fonksiyonlar yedekleniyor..." -ForegroundColor Cyan
$functionsFile = Join-Path $OutputDir "functions.sql"
& pg_dump --schema-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f $functionsFile $connectionString

# 5. Trigger'ları yedekle
Write-Host "5. Trigger'lar yedekleniyor..." -ForegroundColor Cyan
$triggersFile = Join-Path $OutputDir "triggers.sql"
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

& psql -d $connectionString -c $triggersQuery -o $triggersFile

# 6. Index'leri yedekle
Write-Host "6. Index'ler yedekleniyor..." -ForegroundColor Cyan
$indexesFile = Join-Path $OutputDir "indexes.sql"
$indexesQuery = @"
-- Index'ler
SELECT indexdef || ';' as index_sql
FROM pg_indexes 
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime')
ORDER BY schemaname, tablename, indexname;
"@

& psql -d $connectionString -c $indexesQuery -o $indexesFile

# 7. View'ları yedekle
Write-Host "7. View'lar yedekleniyor..." -ForegroundColor Cyan
$viewsFile = Join-Path $OutputDir "views.sql"
$viewsQuery = @"
-- View'lar
SELECT 
    'CREATE VIEW ' || schemaname || '.' || viewname || ' AS ' || definition || ';' as view_sql
FROM pg_views 
WHERE schemaname IN ('public', 'auth', 'storage', 'realtime')
ORDER BY schemaname, viewname;
"@

& psql -d $connectionString -c $viewsQuery -o $viewsFile

# 8. Extension'ları yedekle
Write-Host "8. Extension'lar yedekleniyor..." -ForegroundColor Cyan
$extensionsFile = Join-Path $OutputDir "extensions.sql"
$extensionsQuery = @"
-- Extension'lar
SELECT 'CREATE EXTENSION IF NOT EXISTS ' || extname || ';' as extension_sql
FROM pg_extension 
ORDER BY extname;
"@

& psql -d $connectionString -c $extensionsQuery -o $extensionsFile

# 9. Kullanıcıları yedekle
Write-Host "9. Kullanıcılar yedekleniyor..." -ForegroundColor Cyan
$usersFile = Join-Path $OutputDir "users.sql"
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

& psql -d $connectionString -c $usersQuery -o $usersFile

# 10. Özet rapor oluştur
Write-Host "10. Özet rapor oluşturuluyor..." -ForegroundColor Cyan
$summaryFile = Join-Path $OutputDir "backup_summary.txt"
$summary = @"
=== SUPABASE YEDEK ÖZET RAPORU ===
Tarih: $(Get-Date)
Çıktı Dizini: $OutputDir

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

Write-Host "=== YEDEK ALMA TAMAMLANDI ===" -ForegroundColor Green
Write-Host "Yedek dosyaları: $OutputDir" -ForegroundColor Yellow
Write-Host "Özet rapor: $summaryFile" -ForegroundColor Yellow

# Dosya boyutlarını göster
Write-Host "`nDosya Boyutları:" -ForegroundColor Cyan
Get-ChildItem $OutputDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "$($_.Name): $size KB" -ForegroundColor White
}
