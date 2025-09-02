# ALCPN - Malzeme Hesaplama Uygulaması

Modern web teknolojileri kullanılarak geliştirilmiş malzeme miktarı hesaplama ve fiyatlandırma uygulaması.

## 🚀 Özellikler

- **Hızlı Hesaplama**: Malzeme miktarlarını hızlı ve doğru bir şekilde hesaplayın
- **Güncel Fiyatlar**: Otomatik olarak güncellenen malzeme fiyatları ile bütçenizi planlayın
- **Hesaplama Geçmişi**: Geçmiş hesaplamalarınızı kaydedin ve istediğiniz zaman tekrar görüntüleyin
- **Kullanıcı Kimlik Doğrulama**: Güvenli giriş ve kayıt sistemi
- **Responsive Tasarım**: Mobil ve masaüstü cihazlarda mükemmel görünüm

## 🛠️ Teknolojiler

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Code Quality**: ESLint, Prettier
- **Deployment**: Vercel

## 🔐 Admin Panel Güvenliği

Admin paneline erişim sadece belirli email adreslerine sahip kullanıcılara verilir:

### Environment Variable ile Kontrol
`.env.local` dosyasına şu satırı ekleyin:
```bash
ADMIN_EMAILS=suatklnc@gmail.com,admin2@example.com
```

### Güvenlik Özellikleri
- ✅ Email bazlı erişim kontrolü
- ✅ Otomatik yönlendirme (yetkisiz erişimde)
- ✅ Hata mesajı gösterimi
- ✅ Server-side doğrulama

## 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı

## 🚀 Kurulum

1. **Projeyi klonlayın**

   ```bash
   git clone <repository-url>
   cd alcpn
   ```

2. **Bağımlılıkları yükleyin**

   ```bash
   npm install
   ```

3. **Environment variables'ı ayarlayın**

   ```bash
   cp .env.example .env.local
   ```

   `.env.local` dosyasını düzenleyerek Supabase bilgilerinizi ekleyin:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Development server'ı başlatın**

   ```bash
   npm run dev
   ```

5. **Tarayıcınızda açın**
   ```
   http://localhost:3000
   ```

## 📝 Kullanılabilir Scripts

- `npm run dev` - Development server'ı başlatır
- `npm run build` - Production build oluşturur
- `npm run start` - Production server'ı başlatır
- `npm run lint` - ESLint kontrolü yapar
- `npm run lint:fix` - ESLint hatalarını otomatik düzeltir
- `npm run type-check` - TypeScript tip kontrolü yapar
- `npm run format` - Prettier ile kod formatlar
- `npm run format:check` - Prettier format kontrolü yapar
- `npm run check-all` - Tüm kontrolleri çalıştırır

## 🗂️ Proje Yapısı

```
alcpn/
├── src/
│   ├── app/                 # Next.js App Router sayfaları
│   │   ├── login/          # Giriş sayfası
│   │   ├── register/       # Kayıt sayfası
│   │   ├── layout.tsx      # Ana layout
│   │   └── page.tsx        # Ana sayfa
│   ├── components/         # React bileşenleri
│   │   ├── Header.tsx      # Header bileşeni
│   │   ├── Footer.tsx      # Footer bileşeni
│   │   └── Layout.tsx      # Layout wrapper
│   ├── lib/               # Yardımcı kütüphaneler
│   │   ├── supabase.ts    # Supabase client
│   │   ├── supabase-test.ts # Supabase test fonksiyonları
│   │   └── auth-context.tsx # Auth context
│   ├── types/             # TypeScript tip tanımları
│   │   └── database.ts    # Veritabanı tipleri
│   └── utils/             # Yardımcı fonksiyonlar
├── .env.example           # Environment variables örneği
├── .prettierrc           # Prettier yapılandırması
├── .prettierignore       # Prettier ignore dosyası
├── eslint.config.mjs     # ESLint yapılandırması
├── next.config.ts        # Next.js yapılandırması
├── tailwind.config.ts    # Tailwind CSS yapılandırması
└── tsconfig.json         # TypeScript yapılandırması
```

## 🔧 Geliştirme

### Code Quality

Proje ESLint ve Prettier ile kod kalitesini sağlar:

```bash
# Tüm kontrolleri çalıştır
npm run check-all

# Sadece lint kontrolü
npm run lint

# Lint hatalarını düzelt
npm run lint:fix

# Kod formatla
npm run format
```

### Supabase Kurulumu

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. Project Settings > API'den URL ve anon key'i alın
4. `.env.local` dosyasına ekleyin

## 🚀 Deployment

### Vercel ile Deployment

1. Projeyi GitHub'a push edin
2. [Vercel](https://vercel.com) hesabı oluşturun
3. GitHub repository'sini import edin
4. Environment variables'ı ekleyin
5. Deploy edin

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add some amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

Proje hakkında sorularınız için issue açabilirsiniz.
