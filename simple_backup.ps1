# Supabase Basit Yedek Alma Scripti
Write-Host "=== Supabase Basit Yedek Alma ===" -ForegroundColor Green

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
    $rlsQuery = "SELECT 'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' as enable_rls FROM pg_tables WHERE schemaname IN ('public', 'auth', 'storage', 'realtime') AND rowsecurity = true UNION ALL SELECT 'CREATE POLICY ' || policyname || ' ON ' || schemaname || '.' || tablename || ' FOR ' || cmd || CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END || CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';' as policy_sql FROM pg_policies WHERE schemaname IN ('public', 'auth', 'storage', 'realtime');"
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

# 5. Extension'ları yedekle
Write-Host "5. Extension'lar yedekleniyor..." -ForegroundColor Cyan
try {
    $extensionsQuery = "SELECT 'CREATE EXTENSION IF NOT EXISTS ' || extname || ';' as extension_sql FROM pg_extension ORDER BY extname;"
    psql $databaseUrl -c $extensionsQuery -o "$backupDir\extensions.sql"
    Write-Host "   ✓ Extension'lar yedeklendi" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Extension yedekleme hatası: $($_.Exception.Message)" -ForegroundColor Red
}

# Özet rapor oluştur
Write-Host "6. Özet rapor oluşturuluyor..." -ForegroundColor Cyan
$summaryFile = "$backupDir\backup_summary.txt"
$summary = "=== SUPABASE YEDEK ÖZET RAPORU ===`nTarih: $(Get-Date)`nÇıktı Dizini: $backupDir`n`nYedeklenen Dosyalar:`n- schemas.sql: Şema yapıları`n- data.sql: Tablo verileri`n- rls_policies.sql: RLS politikaları`n- functions.sql: Fonksiyonlar`n- extensions.sql: Extension'lar`n`nKullanım:`n1. Yeni bir Supabase projesi oluşturun`n2. Bu dosyaları sırasıyla çalıştırın:`n   psql -d `"YENİ_DATABASE_URL`" -f schemas.sql`n   psql -d `"YENİ_DATABASE_URL`" -f functions.sql`n   psql -d `"YENİ_DATABASE_URL`" -f extensions.sql`n   psql -d `"YENİ_DATABASE_URL`" -f rls_policies.sql`n   psql -d `"YENİ_DATABASE_URL`" -f data.sql`n`nNot: Kullanıcı dosyasını çalıştırmadan önce gerekli izinleri kontrol edin."

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
