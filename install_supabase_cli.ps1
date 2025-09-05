# Supabase CLI Kurulum Scripti
# Bu script Supabase CLI'yi Windows'ta kurar

Write-Host "=== Supabase CLI Kurulumu ===" -ForegroundColor Green

# Node.js kurulu mu kontrol et
Write-Host "Node.js kontrol ediliyor..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js bulundu: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "HATA: Node.js bulunamadı!" -ForegroundColor Red
    Write-Host "Lütfen önce Node.js'i kurun: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# npm kurulu mu kontrol et
Write-Host "npm kontrol ediliyor..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm bulundu: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "HATA: npm bulunamadı!" -ForegroundColor Red
    exit 1
}

# Supabase CLI'yi kur
Write-Host "Supabase CLI kuruluyor..." -ForegroundColor Yellow
try {
    npm install -g supabase
    Write-Host "Supabase CLI başarıyla kuruldu!" -ForegroundColor Green
} catch {
    Write-Host "HATA: Supabase CLI kurulumu başarısız!" -ForegroundColor Red
    Write-Host "Alternatif kurulum yöntemleri:" -ForegroundColor Yellow
    Write-Host "1. Chocolatey: choco install supabase" -ForegroundColor White
    Write-Host "2. Scoop: scoop install supabase" -ForegroundColor White
    Write-Host "3. Manuel: https://github.com/supabase/cli/releases" -ForegroundColor White
    exit 1
}

# Kurulumu doğrula
Write-Host "Kurulum doğrulanıyor..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI başarıyla kuruldu: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "HATA: Supabase CLI kurulumu doğrulanamadı!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Kurulum Tamamlandı ===" -ForegroundColor Green
Write-Host "Artık Supabase CLI'yi kullanabilirsiniz!" -ForegroundColor Yellow
Write-Host "`nKullanım örnekleri:" -ForegroundColor Cyan
Write-Host "supabase login" -ForegroundColor White
Write-Host "supabase init" -ForegroundColor White
Write-Host "supabase db dump --data-only > backup.sql" -ForegroundColor White
Write-Host "supabase db dump --schema-only > schema.sql" -ForegroundColor White
