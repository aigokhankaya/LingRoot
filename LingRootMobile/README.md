# LingRoot Mobile - AI Destekli Dil Öğrenme Mobil Uygulaması

LingRoot'un React Native ile geliştirilmiş mobil uygulaması. Expo Framework kullanılarak Android ve iOS platformları için geliştirilmiştir.

## Özelikler

- 🎯 **AI Destekli CEFR Adaptasyonu**: Metinleri A1-C2 seviyelerine göre otomatik uyarlar
- 🔊 **Text-to-Speech**: Metinleri doğal sese dönüştürür
- 📱 **Çapraz Platform**: Android ve iOS desteği
- 🔐 **Güvenli Authentication**: Supabase tabanlı kullanıcı yönetimi
- 📚 **Ses Kütüphanesi**: Oluşturulan sesleri organize eder
- 🔔 **Akıllı Bildirimler**: 5 dakikada bir kelime hatırlatmaları
- 📖 **Kelime Yönetimi**: Öğrenilmemiş kelimelerin otomatik takibi
- 🎨 **Modern UI/UX**: React Native ile native görünüm

## Teknoloji Yığını

- **Framework**: Expo (React Native)
- **Dil**: TypeScript
- **Navigation**: React Navigation
- **State Management**: React Context
- **Authentication**: Supabase Auth
- **HTTP Client**: Axios
- **Icons**: React Native Vector Icons

## Kurulum

### Gereksinimler

- Node.js (v18+)
- npm veya yarn
- Expo CLI
- Android Studio (Android geliştirme için)
- Xcode (iOS geliştirme için - macOS gerekli)

### Adım Adım Kurulum

1. **Bağımlılıkları kurun:**
   ```bash
   npm install
   ```

2. **Environment variables ayarlayın:**
   `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli değerleri girin:
   ```bash
   cp .env.example .env
   ```

3. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm start
   ```

## 🔔 Bildirim Sistemi

LingRoot Mobile, öğrenilmemiş kelimeleri hatırlatmak için akıllı bir bildirim sistemi içerir.

### Nasıl Çalışır

1. **Otomatik Başlatma**: Kullanıcı giriş yaptığında bildirimler otomatik başlar
2. **5 Dakika Aralıklar**: Her 5 dakikada bir öğrenilmemiş kelime hatırlatması
3. **Rastgele Seçim**: Kelime listesinden rastgele öğrenilmemiş kelime seçilir
4. **Akıllı Navigasyon**: Bildirime tıklandığında kelimeler sayfasında ilgili kelime açılır

### Bildirim İçeriği

```
📚 Vocabulary Reminder
example: örnek, misal
```

### Kullanım

1. **İlk Kurulum**: Uygulama ilk açıldığında bildirim izni istenir
2. **Kelime Ekleme**: Vocabulary sekmesinden kelimeler ekleyin
3. **Otomatik Hatırlatma**: Sistem otomatik olarak kelimeleri hatırlatır
4. **Test**: Profil > "Test Bildirimi" ile test edebilirsiniz
5. **Durum Kontrolü**: Profil > "Bildirim Durumu" ile sistem durumunu kontrol edin

### Sorun Giderme

**Bildirim Gelmiyor:**
- Cihaz ayarlarından bildirim izinlerini kontrol edin
- "Bildirim Durumu" ile sistem durumunu kontrol edin
- Oturum süresinin dolmadığından emin olun

**Authentication Hatası:**
- Çıkış yapıp tekrar giriş yapın
- Internet bağlantınızı kontrol edin

**Kelime Bulunamadı:**
- Vocabulary sekmesinden kelime ekleyin
- Mevcut kelimelerin "öğrenilmemiş" olduğundan emin olun

4. **Uygulamayı çalıştırın:**
   - **Android**: `npm run android` veya Expo Go uygulaması ile QR kod tarayın
   - **iOS**: `npm run ios` veya Expo Go uygulaması ile QR kod tarayın
   - **Web**: `npm run web`

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_URL=http://localhost:5001
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
```

## 🔧 Local Development (Backend ile Test)

Android geliştirme yaparken backend değişikliklerini Render'a push etmeden önce lokalde test edebilirsiniz.

### Hızlı Başlangıç

1. **Otomatik Kurulum** (Önerilen):
   ```powershell
   .\setup-local-dev.ps1
   ```
   Bu script:
   - Bilgisayarınızın IP adresini otomatik bulur
   - `.env` dosyasını oluşturur
   - Firewall ayarlarını yapar (opsiyonel)

2. **Backend'i Başlatın**:
   ```bash
   cd ..\backend
   npm run dev
   ```

3. **Bağlantıyı Test Edin**:
   ```powershell
   .\test-backend-connection.ps1
   ```

4. **Expo'yu Başlatın**:
   ```bash
   npx expo start -c
   ```

### Manuel Kurulum

Detaylı adımlar ve sorun giderme için [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) dosyasına bakın.

### Önemli Notlar

- **Emülatör**: `10.0.2.2:5001` kullanın
- **Fiziksel Cihaz**: Bilgisayarınızın IP'sini kullanın (örn: `192.168.1.100:5001`)
- **Aynı Wi-Fi**: Cihaz ve bilgisayar aynı ağda olmalı
- **Firewall**: 5001 portu açık olmalı

## Proje Yapısı

```
src/
├── components/          # Yeniden kullanılabilir bileşenler
├── contexts/           # React Context providers
├── navigation/         # Navigasyon yapılandırması
├── screens/           # Uygulama ekranları
├── services/          # API ve Supabase servisleri
├── types/             # TypeScript tip tanımları
└── utils/             # Yardımcı fonksiyonlar
```

## API Entegrasyonu

Mobil uygulama, mevcut LingRoot backend API'sini kullanır:

- **Base URL**: `http://localhost:5001` (geliştirme)
- **TTS Endpoint**: `POST /api/tts/process`
- **Authentication**: Supabase Auth

## Özellikler

### 🏠 Ana Sayfa
- Kullanıcı karşılama ekranı
- İstatistikler (oluşturulan ses, dinleme süresi)
- Hızlı erişim butonları

### 🎤 Ses Oluşturma
- Metin girişi
- Dosya yükleme (PDF, Word) - yakında
- CEFR seviye seçimi (A1-C2)
- Konuşma hızı ayarı
- Gerçek zamanlı TTS işleme

### 📚 Ses Kütüphanesi
- Oluşturulan seslerin listesi
- Seviye bazlı filtreleme
- Arama özelliği
- Ses oynatma kontrolü

### 👤 Profil
- Kullanıcı bilgileri
- Hesap ayarları
- Üyelik bilgisi
- Çıkış işlemi

## Geliştirme

### Yeni Özellik Ekleme

1. Gerekli tip tanımlarını `src/types/index.ts`'ye ekleyin
2. Yeni ekran oluşturun `src/screens/`
3. Navigasyon güncellemeyi `src/navigation/AppNavigator.tsx`
4. Gerekli servisleri `src/services/` altında ekleyin

### Build Alma

```bash
# Android APK
npx expo build:android

# iOS IPA  
npx expo build:ios

# EAS Build (önerilen)
npx eas build --platform android
npx eas build --platform ios
```

## Deployment

### Expo Application Services (EAS)

1. EAS CLI kurulumu:
   ```bash
   npm install -g @expo/eas-cli
   ```

2. EAS hesabınıza giriş yapın:
   ```bash
   eas login
   ```

3. Build konfigürasyonu:
   ```bash
   eas build:configure
   ```

4. Build başlatın:
   ```bash
   eas build --platform all
   ```

## Troubleshooting

### Metro bundler sorunları
```bash
npm start -- --clear
```

### Cache temizleme
```bash
npx expo start -c
```

### Android build sorunları
```bash
cd android && ./gradlew clean
cd .. && npx expo run:android
```

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## İletişim

- **Proje**: LingRoot
- **Website**: [Web Uygulaması](../frontend)
- **Backend**: [API Servisi](../backend) 