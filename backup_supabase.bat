@echo off
REM Supabase PostgreSQL Yedek Alma Scripti
REM Bu script Supabase projenizden kapsamlı yedek alır

setlocal enabledelayedexpansion

echo === Supabase Yedek Alma Basit Script ===
echo.

REM Supabase bağlantı bilgilerini al
set /p DATABASE_URL="Supabase Database URL'inizi girin (postgresql://...): "

REM Çıktı dizinini oluştur
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

set "OUTPUT_DIR=supabase_backup_%timestamp%"
mkdir "%OUTPUT_DIR%"

echo Yedek dizini oluşturuldu: %OUTPUT_DIR%
echo.

REM PostgreSQL araçlarının kurulu olup olmadığını kontrol et
where pg_dump >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: pg_dump bulunamadı!
    echo Lütfen PostgreSQL'i kurun veya PATH'e ekleyin.
    echo https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: psql bulunamadı!
    echo Lütfen PostgreSQL'i kurun veya PATH'e ekleyin.
    echo https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo PostgreSQL araçları bulundu, yedek alma başlatılıyor...
echo.

REM 1. Şema yapılarını yedekle
echo 1. Şema yapıları yedekleniyor...
pg_dump --schema-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "%OUTPUT_DIR%\schemas.sql" "%DATABASE_URL%"
if %errorlevel% neq 0 (
    echo HATA: Şema yedekleme başarısız!
    pause
    exit /b 1
)

REM 2. Veri yedekle
echo 2. Veriler yedekleniyor...
pg_dump --data-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "%OUTPUT_DIR%\data.sql" "%DATABASE_URL%"
if %errorlevel% neq 0 (
    echo HATA: Veri yedekleme başarısız!
    pause
    exit /b 1
)

REM 3. RLS politikalarını yedekle
echo 3. RLS politikaları yedekleniyor...
psql "%DATABASE_URL%" -c "SELECT 'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' as enable_rls FROM pg_tables WHERE schemaname IN ('public', 'auth', 'storage', 'realtime') AND rowsecurity = true UNION ALL SELECT 'CREATE POLICY ' || policyname || ' ON ' || schemaname || '.' || tablename || ' FOR ' || cmd || CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END || CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END || CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';' as policy_sql FROM pg_policies WHERE schemaname IN ('public', 'auth', 'storage', 'realtime');" -o "%OUTPUT_DIR%\rls_policies.sql"

REM 4. Fonksiyonları yedekle
echo 4. Fonksiyonlar yedekleniyor...
pg_dump --schema-only --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "%OUTPUT_DIR%\functions.sql" "%DATABASE_URL%"

REM 5. Trigger'ları yedekle
echo 5. Trigger'lar yedekleniyor...
psql "%DATABASE_URL%" -c "SELECT 'CREATE TRIGGER ' || triggername || ' ' || CASE WHEN tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END || ' ' || CASE WHEN tgtype & 4 = 4 THEN 'INSERT' WHEN tgtype & 8 = 8 THEN 'DELETE' WHEN tgtype & 16 = 16 THEN 'UPDATE' END || ' ON ' || schemaname || '.' || tablename || ' FOR EACH ROW EXECUTE FUNCTION ' || pg_get_triggerdef(oid) || ';' as trigger_sql FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname IN ('public', 'auth', 'storage', 'realtime') AND NOT tgisinternal;" -o "%OUTPUT_DIR%\triggers.sql"

REM 6. Index'leri yedekle
echo 6. Index'ler yedekleniyor...
psql "%DATABASE_URL%" -c "SELECT indexdef || ';' as index_sql FROM pg_indexes WHERE schemaname IN ('public', 'auth', 'storage', 'realtime') ORDER BY schemaname, tablename, indexname;" -o "%OUTPUT_DIR%\indexes.sql"

REM 7. View'ları yedekle
echo 7. View'lar yedekleniyor...
psql "%DATABASE_URL%" -c "SELECT 'CREATE VIEW ' || schemaname || '.' || viewname || ' AS ' || definition || ';' as view_sql FROM pg_views WHERE schemaname IN ('public', 'auth', 'storage', 'realtime') ORDER BY schemaname, viewname;" -o "%OUTPUT_DIR%\views.sql"

REM 8. Extension'ları yedekle
echo 8. Extension'lar yedekleniyor...
psql "%DATABASE_URL%" -c "SELECT 'CREATE EXTENSION IF NOT EXISTS ' || extname || ';' as extension_sql FROM pg_extension ORDER BY extname;" -o "%OUTPUT_DIR%\extensions.sql"

REM 9. Kullanıcıları yedekle
echo 9. Kullanıcılar yedekleniyor...
psql "%DATABASE_URL%" -c "SELECT 'CREATE ROLE ' || rolname || CASE WHEN rolsuper THEN ' SUPERUSER' ELSE '' END || CASE WHEN rolinherit THEN ' INHERIT' ELSE ' NOINHERIT' END || CASE WHEN rolcreaterole THEN ' CREATEROLE' ELSE '' END || CASE WHEN rolcreatedb THEN ' CREATEDB' ELSE '' END || CASE WHEN rolcanlogin THEN ' LOGIN' ELSE ' NOLOGIN' END || CASE WHEN rolreplication THEN ' REPLICATION' ELSE '' END || CASE WHEN rolbypassrls THEN ' BYPASSRLS' ELSE '' END || ';' as user_sql FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname;" -o "%OUTPUT_DIR%\users.sql"

REM 10. Özet rapor oluştur
echo 10. Özet rapor oluşturuluyor...
echo === SUPABASE YEDEK ÖZET RAPORU === > "%OUTPUT_DIR%\backup_summary.txt"
echo Tarih: %date% %time% >> "%OUTPUT_DIR%\backup_summary.txt"
echo Çıktı Dizini: %OUTPUT_DIR% >> "%OUTPUT_DIR%\backup_summary.txt"
echo. >> "%OUTPUT_DIR%\backup_summary.txt"
echo Yedeklenen Dosyalar: >> "%OUTPUT_DIR%\backup_summary.txt"
echo - schemas.sql: Şema yapıları >> "%OUTPUT_DIR%\backup_summary.txt"
echo - data.sql: Tablo verileri >> "%OUTPUT_DIR%\backup_summary.txt"
echo - rls_policies.sql: RLS politikaları >> "%OUTPUT_DIR%\backup_summary.txt"
echo - functions.sql: Fonksiyonlar >> "%OUTPUT_DIR%\backup_summary.txt"
echo - triggers.sql: Trigger'lar >> "%OUTPUT_DIR%\backup_summary.txt"
echo - indexes.sql: Index'ler >> "%OUTPUT_DIR%\backup_summary.txt"
echo - views.sql: View'lar >> "%OUTPUT_DIR%\backup_summary.txt"
echo - extensions.sql: Extension'lar >> "%OUTPUT_DIR%\backup_summary.txt"
echo - users.sql: Kullanıcılar ve roller >> "%OUTPUT_DIR%\backup_summary.txt"

echo.
echo === YEDEK ALMA TAMAMLANDI ===
echo Yedek dosyaları: %OUTPUT_DIR%
echo Özet rapor: %OUTPUT_DIR%\backup_summary.txt
echo.

REM Dosya boyutlarını göster
echo Dosya Boyutları:
dir "%OUTPUT_DIR%" /-c

echo.
echo Yedek alma işlemi tamamlandı!
pause
