# Kuafor Randevu Sistemi

Bu proje, kuaför randevu yönetim sistemi için geliştirilmiş bir monorepo yapısıdır.

## Proje Yapısı

- `kuafor-randevu-web`: Next.js ile geliştirilmiş web uygulaması
- `kuafor-randevu-mobile`: React Native/Expo ile geliştirilmiş mobil uygulama
- `kuafor-randevu-api`: Backend API servisi

## Kurulum

Her bir proje için ayrı kurulum talimatları:

### Web Uygulaması
```bash
cd kuafor-randevu-web
npm install
npm run dev
```

### Mobil Uygulama
```bash
cd kuafor-randevu-mobile
npm install
npx expo start
```

### API
```bash
cd kuafor-randevu-api
npm install
npm run dev
```

## Geliştirme

Her bir proje kendi klasöründe bağımsız olarak geliştirilebilir. Ortak konfigürasyonlar ve paylaşılan kodlar için `shared` klasörü kullanılabilir.
