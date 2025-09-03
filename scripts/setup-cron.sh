#!/bin/bash

# Otomatik fiyat çekme için cron job kurulum script'i
# Bu script'i çalıştırmadan önce CRON_SECRET environment variable'ını ayarlayın

echo "🔧 Otomatik Fiyat Çekme Cron Job Kurulumu"
echo "========================================"

# Environment variable kontrolü
if [ -z "$CRON_SECRET" ]; then
    echo "❌ HATA: CRON_SECRET environment variable'ı ayarlanmamış!"
    echo "Örnek: export CRON_SECRET='your-secret-key-here'"
    exit 1
fi

# URL kontrolü
if [ -z "$APP_URL" ]; then
    echo "❌ HATA: APP_URL environment variable'ı ayarlanmamış!"
    echo "Örnek: export APP_URL='https://your-app.vercel.app'"
    exit 1
fi

echo "✅ Environment variables kontrol edildi"
echo "   CRON_SECRET: ${CRON_SECRET:0:10}..."
echo "   APP_URL: $APP_URL"

# Cron job'u ekle (her saat başı çalışacak)
CRON_JOB="0 * * * * curl -H \"Authorization: Bearer $CRON_SECRET\" \"$APP_URL/api/cron/auto-scraping\" >> /var/log/auto-scraping.log 2>&1"

echo ""
echo "📝 Eklenen Cron Job:"
echo "$CRON_JOB"
echo ""

# Cron job'u geçici dosyaya yaz
echo "$CRON_JOB" > /tmp/auto-scraping-cron

# Mevcut cron job'ları kontrol et
if crontab -l 2>/dev/null | grep -q "auto-scraping"; then
    echo "⚠️  UYARI: Zaten bir auto-scraping cron job'u mevcut!"
    echo "Mevcut job'u güncellemek için 'y' yazın, iptal etmek için 'n' yazın:"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Mevcut auto-scraping job'larını kaldır ve yenisini ekle
        (crontab -l 2>/dev/null | grep -v "auto-scraping"; cat /tmp/auto-scraping-cron) | crontab -
        echo "✅ Cron job güncellendi!"
    else
        echo "❌ Kurulum iptal edildi"
        rm /tmp/auto-scraping-cron
        exit 0
    fi
else
    # Yeni cron job ekle
    (crontab -l 2>/dev/null; cat /tmp/auto-scraping-cron) | crontab -
    echo "✅ Cron job başarıyla eklendi!"
fi

# Geçici dosyayı temizle
rm /tmp/auto-scraping-cron

echo ""
echo "📋 Kurulum Tamamlandı!"
echo "======================"
echo "• Cron job her saat başı çalışacak"
echo "• Log dosyası: /var/log/auto-scraping.log"
echo "• Cron job'ları görüntülemek için: crontab -l"
echo "• Cron job'u kaldırmak için: crontab -e"
echo ""
echo "🧪 Test için manuel çalıştırma:"
echo "curl -H \"Authorization: Bearer $CRON_SECRET\" \"$APP_URL/api/cron/auto-scraping\""
echo ""
echo "📊 Log takibi:"
echo "tail -f /var/log/auto-scraping.log"
