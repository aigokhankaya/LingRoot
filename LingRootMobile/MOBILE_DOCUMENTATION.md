# LingRoot Mobile - Kapsamlı Dokümantasyon

LingRoot'un React Native ile geliştirilmiş mobil uygulaması. Bu dokümantasyon, mobil uygulamanın mimarisini, bileşenlerini ve geliştirme süreçlerini detaylı şekilde açıklar.

## 📋 İçindekiler

1. [Proje Yapısı](#proje-yapısı)
2. [Özellikler](#özellikler)
3. [Teknoloji Yığını](#teknoloji-yığını)
4. [Environment Variables](#environment-variables)
5. [Kurulum](#kurulum)
6. [Sistem Bileşen Özeti](#sistem-bileşen-özeti)
7. [Ekranlar (Screens)](#ekranlar-screens)
8. [Bileşenler (Components)](#bileşenler-components)
9. [Servisler (Services)](#servisler-services)
10. [Context Providers](#context-providers)
11. [Navigasyon Yapısı](#navigasyon-yapısı)
12. [API Entegrasyonu](#api-entegrasyonu)
13. [In-App Purchase (IAP)](#in-app-purchase-iap)
14. [Bildirim Sistemi](#bildirim-sistemi)
15. [Deployment](#deployment)

---

## Proje Yapısı

```
LingRootMobile/
├── src/
│   ├── components/          # Yeniden kullanılabilir UI bileşenleri
│   │   ├── AudioPlayer.tsx         # Ana ses oynatıcı (kelime/cümle vurgulama)
│   │   ├── HighlightedText.tsx     # Metin vurgulama bileşeni
│   │   ├── KeyboardToggleOverlay.tsx # Klavye toggle overlay
│   │   ├── PatternList.tsx          # Pattern listesi
│   │   ├── SkiaSentenceHighlight.tsx # Skia ile cümle vurgulama
│   │   ├── SkiaWordHighlight.tsx    # Skia ile kelime vurgulama
│   │   └── UsageEstimateCard.tsx    # Kullanım tahmini kartı
│   │
│   ├── contexts/            # React Context providers
│   │   ├── AudioContext.tsx        # Global ses durumu yönetimi
│   │   ├── AuthContext.tsx         # Kullanıcı kimlik doğrulama
│   │   └── LanguageContext.tsx     # Çoklu dil desteği (tr/en)
│   │
│   ├── locales/             # Çeviri dosyaları
│   │   ├── en.json                 # İngilizce çeviriler
│   │   └── tr.json                 # Türkçe çeviriler
│   │
│   ├── navigation/          # Navigasyon yapılandırması
│   │   └── AppNavigator.tsx        # Ana navigasyon router
│   │
│   ├── screens/             # Uygulama ekranları
│   │   ├── AccountSettingsScreen.tsx
│   │   ├── ChatScreen.tsx           # Destek mesajlaşma
│   │   ├── CreateScreen.tsx         # İçerik oluşturma
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── HomeScreen.tsx           # Ana ekran
│   │   ├── LibraryScreen.tsx        # Ses kütüphanesi
│   │   ├── LiroScreen.tsx           # AI asistan
│   │   ├── LoginScreen.tsx
│   │   ├── MembershipScreen.tsx
│   │   ├── PackagesScreen.tsx       # IAP paketleri
│   │   ├── PatternListScreen.tsx    # Pattern listesi
│   │   ├── PrivacyPolicyScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ReminderSettingsScreen.tsx
│   │   ├── ResetPasswordScreen.tsx
│   │   ├── TermsOfServiceScreen.tsx
│   │   ├── TtsProviderSettingsScreen.tsx
│   │   └── VocabularyScreen.tsx     # Kelime yönetimi
│   │
│   ├── services/            # API ve iş mantığı servisleri
│   │   ├── api.ts                   # Ana API istemcisi
│   │   ├── audioService.ts          # Ses oynatma servisi
│   │   ├── environmentConfig.ts     # Ortam yapılandırması
│   │   ├── iap.ts                   # In-App Purchase
│   │   ├── notificationService.android.ts
│   │   ├── notificationService.ios.ts
│   │   ├── notificationService.ts   # Platform seçici
│   │   ├── pushTokenService.ts      # Push token yönetimi
│   │   ├── reminderSettingsService.ts
│   │   ├── socialAuth.ts            # Google/Apple/Facebook auth
│   │   └── supabase.ts              # Supabase istemcisi
│   │
│   ├── types/               # TypeScript tip tanımları
│   │   └── index.ts                 # Tüm tipler
│   │
│   └── utils/               # Yardımcı fonksiyonlar
│       ├── textHighlighter.ts       # Metin vurgulama yardımcıları
│       ├── usageEstimates.ts        # Kullanım tahmin hesaplamaları
│       └── voiceDisplayNames.ts     # Ses isim dönüştürmeleri
│
├── ios/                     # iOS native kodları
├── android/                 # Android native kodları
├── assets/                  # Statik dosyalar (fontlar, resimler)
├── .env                     # Environment variables (git'te yok)
├── .env.example             # Örnek environment dosyası
├── app.json                 # Expo/RN uygulama yapılandırması
├── babel.config.js
├── metro.config.js
├── package.json
└── tsconfig.json
```

---

## Özellikler

### 🎯 Temel Özellikler
- **AI Destekli CEFR Adaptasyonu**: Metinleri A1-C2 seviyelerine göre otomatik uyarlar
- **Text-to-Speech (TTS)**: Metinleri doğal sese dönüştürür (Google Cloud TTS)
- **Podcast Oluşturma**: Konuya dayalı dialog formatında podcast üretimi
- **Dosya Desteği**: PDF, Word, TXT dosyalarından metin çıkarma
- **Gerçek Zamanlı Kelime Takibi**: Ses çalarken kelime/cümle vurgulama

### 📱 Platform Özellikleri
- **Çapraz Platform**: Android ve iOS desteği
- **Native Performans**: React Native ile native görünüm
- **Offline Destek**: AsyncStorage ile veri kalıcılığı

### 🔐 Kimlik Doğrulama
- **Email/Şifre**: Standart kayıt ve giriş
- **Google Sign-In**: OAuth 2.0 ile hızlı giriş
- **Apple Sign-In**: iOS için Apple ID desteği
- **Facebook Login**: Facebook OAuth entegrasyonu
- **Token Yenileme**: Otomatik JWT refresh

### 💳 Ödeme Sistemi
- **iOS IAP**: Apple In-App Purchase
- **Google Play**: Google Play Billing
- **Backend Doğrulama**: Receipt/token sunucu tarafı doğrulama
- **Abonelik Yönetimi**: Otomatik yenileme ve iptal

### 🔔 Bildirim Sistemi
- **Push Notifications**: Firebase Cloud Messaging
- **Local Notifications**: Kelime hatırlatmaları
- **Platform Spesifik**: iOS/Android ayrı implementasyonlar

### 📚 Öğrenme Özellikleri
- **Kelime Yönetimi**: Öğrenilmemiş kelimelerin takibi
- **Pattern Tanıma**: CEFR seviyesine göre dilbilgisi kalıpları
- **Progress Tracking**: İlerleme takibi

---

## Teknoloji Yığını

### Framework & Dil
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| React Native | 0.79.5 | Mobil framework |
| TypeScript | 5.8.3 | Tip güvenliği |
| React | 19.0.0 | UI kütüphanesi |

### Navigasyon
| Paket | Açıklama |
|-------|----------|
| @react-navigation/native | Core navigasyon |
| @react-navigation/stack | Stack navigator |
| @react-navigation/bottom-tabs | Tab navigator |

### State Management
| Paket | Açıklama |
|-------|----------|
| React Context | Global state |
| @react-native-async-storage/async-storage | Kalıcı depolama |

### Kimlik Doğrulama
| Paket | Açıklama |
|-------|----------|
| @supabase/supabase-js | Supabase client |
| @react-native-google-signin/google-signin | Google OAuth |
| @invertase/react-native-apple-authentication | Apple Sign-In |
| react-native-fbsdk-next | Facebook SDK |

### Ses & Medya
| Paket | Açıklama |
|-------|----------|
| react-native-track-player | Gelişmiş ses oynatıcı |
| @shopify/react-native-skia | High-performance graphics |

### Ödeme
| Paket | Açıklama |
|-------|----------|
| react-native-iap | In-App Purchase |

### Bildirimler
| Paket | Açıklama |
|-------|----------|
| @react-native-firebase/messaging | Firebase Cloud Messaging |
| @react-native-community/push-notification-ios | iOS local notifications |
| react-native-push-notification | Android notifications |

### UI & Diğer
| Paket | Açıklama |
|-------|----------|
| react-native-vector-icons | İkon seti |
| react-native-gesture-handler | Gesture handling |
| react-native-reanimated | Animasyonlar |
| axios | HTTP istemcisi |

---

## Environment Variables

`.env` dosyasını `.env.example`'dan kopyalayın:

```bash
cp .env.example .env
```

### Gerekli Değişkenler

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API
EXPO_PUBLIC_API_URL=http://localhost:5001
EXPO_PUBLIC_MFA_API_URL=https://your-tunnel.trycloudflare.com  # Opsiyonel: MFA için ayrı URL

# Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

### Ortam Yapılandırması

Uygulama içinden ortam seçimi yapılabilir. `environmentConfig.ts` servisi:

```typescript
type Environment = 'production' | 'test' | 'local';

interface EnvironmentConfig {
  baseUrl: string;
  environment: Environment;
}

// Production: https://lingloops-backend.onrender.com
// Test: CloudFlare Tunnel URL
// Local: 10.0.2.2:5001 (emülatör) veya bilgisayar IP'si
```

---

## Kurulum

### Gereksinimler

- **Node.js**: v18+
- **npm** veya **yarn**
- **Android Studio**: Android geliştirme için
- **Xcode**: iOS geliştirme için (macOS gerekli)
- **CocoaPods**: iOS bağımlılıkları için

### Adım Adım Kurulum

1. **Repository'yi klonlayın:**
   ```bash
   git clone https://github.com/aigokhankaya/LingRoot.git
   cd LingRoot/Main/LingRootMobile
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **iOS Pod'larını yükleyin (macOS):**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Environment variables ayarlayın:**
   ```bash
   cp .env.example .env
   # .env dosyasını düzenleyip gerekli değerleri girin
   ```

5. **Metro bundler'ı başlatın:**
   ```bash
   npm start
   ```

6. **Uygulamayı çalıştırın:**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

### Local Development (Backend Test)

Android emülatörde lokal backend'e bağlanmak için:

```bash
# 1. Backend'i başlatın (ayrı terminal)
cd ../backend && npm run dev

# 2. Android için özel URL kullanın
# Emülatör: 10.0.2.2:5001
# Fiziksel cihaz: Bilgisayarınızın IP adresi (ör: 192.168.1.100:5001)
```

---

## Sistem Bileşen Özeti

### 🧑‍💻 Kullanıcı Giriş Noktaları

| Dosya | Açıklama |
|-------|----------|
| `src/screens/CreateScreen.tsx` | Metin, dosya, podcast girişlerini yönetir |
| `src/screens/HomeScreen.tsx` | Ana sayfa ve hızlı erişim |
| `src/screens/LibraryScreen.tsx` | Oluşturulan seslerin listesi |

### 🔁 API İletişimi

| Dosya | Açıklama |
|-------|----------|
| `src/services/api.ts` | Tüm backend API çağrıları |
| `src/services/supabase.ts` | Supabase auth işlemleri |

### 🔐 Kimlik Doğrulama

| Dosya | Açıklama |
|-------|----------|
| `src/contexts/AuthContext.tsx` | Auth state yönetimi |
| `src/services/socialAuth.ts` | Google/Apple/Facebook login |

### 🔊 Ses İşleme

| Dosya | Açıklama |
|-------|----------|
| `src/components/AudioPlayer.tsx` | Ses oynatma ve kelime takibi |
| `src/services/audioService.ts` | TrackPlayer wrapper |
| `src/contexts/AudioContext.tsx` | Global ses durumu |

### 💳 Ödeme

| Dosya | Açıklama |
|-------|----------|
| `src/services/iap.ts` | In-App Purchase yönetimi |
| `src/screens/PackagesScreen.tsx` | Paket seçimi UI |

### 🔔 Bildirimler

| Dosya | Açıklama |
|-------|----------|
| `src/services/notificationService.ios.ts` | iOS bildirim implementasyonu |
| `src/services/notificationService.android.ts` | Android bildirim implementasyonu |
| `src/services/pushTokenService.ts` | FCM token yönetimi |

---

## Ekranlar (Screens)

### Auth Screens

#### LoginScreen.tsx
- Email/şifre ile giriş
- Google, Apple, Facebook social login
- Şifremi unuttum linki
- Kayıt sayfasına yönlendirme

#### RegisterScreen.tsx
- Email, şifre, isim, telefon ile kayıt
- Form validasyonu
- Otomatik Free Trial abonelik ataması

#### ForgotPasswordScreen.tsx
- Email ile şifre sıfırlama isteği

#### ResetPasswordScreen.tsx
- Yeni şifre belirleme

### Main Tabs

#### HomeScreen.tsx
- Kullanıcı karşılama
- İstatistikler (oluşturulan ses sayısı, toplam dinleme)
- Hızlı erişim butonları (Metin, Dosya, Podcast, LIRO)
- Son aktiviteler

#### LibraryScreen.tsx
- Oluşturulan seslerin listesi
- Seviye bazlı filtreleme (A1-C2)
- Arama özelliği
- Ses detayına tıklama → AudioPlayer modal
- Swipe-to-delete

#### CreateScreen.tsx
Ana içerik oluşturma ekranı. Modlar:
1. **text**: Direkt metin girişi
2. **file**: PDF/Word/TXT yükleme
3. **podcast**: Konu bazlı dialog oluşturma

Ayarlar:
- CEFR seviye seçimi (A1-C2)
- Konuşma hızı (0.5x - 2.0x)
- Ses seçimi (cinsiyet, aksan, kategori)

#### ProfileScreen.tsx
- Kullanıcı bilgileri (isim, email, avatar)
- Paket bilgisi ve kalan kullanım
- Hesap ayarları linki
- Dil değiştirme
- Bildirim testi
- Çıkış işlemi

### Detail Screens

#### VocabularyScreen.tsx
- Kelime listesi görüntüleme
- Kelime ekleme/silme
- Öğrenildi/öğrenilmedi durumu
- Kelime arama

#### ChatScreen.tsx
- Destek mesajlaşma ekranı
- Conversation listesi
- Real-time mesajlaşma

#### LiroScreen.tsx
- AI asistan chatbot
- CEFR seviyesine göre yanıtlar

#### PackagesScreen.tsx
- Mevcut paketler (Gold, Platinum)
- Fiyat ve özellik karşılaştırması
- IAP satın alma akışı

#### PatternListScreen.tsx
- CEFR seviyesine göre dilbilgisi kalıpları
- Örnek cümleler ve açıklamalar

#### ReminderSettingsScreen.tsx
- Kelime hatırlatma ayarları
- Bildirim zamanlaması

#### AccountSettingsScreen.tsx
- Profil düzenleme
- Şifre değiştirme
- Hesap silme

#### TtsProviderSettingsScreen.tsx
- TTS sağlayıcı seçimi (Google, OpenAI)
- Ses kalitesi ayarları

---

## Bileşenler (Components)

### AudioPlayer.tsx (Ana Bileşen)

Tam ekran modal ses oynatıcı.

**Özellikler:**
- 🎵 Ses oynatma/duraklatma/seek
- 📝 Gerçek zamanlı kelime vurgulama
- 📖 Cümle bazlı vurgulama modu
- 🎨 Pattern vurgulama (gramer kalıpları)
- 📋 Kelimeye tıklayıp sözlüğe ekleme
- 🔄 Hız ayarı
- 📱 Full-screen modal

**Props:**
```typescript
interface AudioPlayerProps {
  track: AudioTrack;
  visible: boolean;
  onClose: () => void;
  timepoints?: Timepoint[];
  words?: string[];
  initialHighlightMode?: 'word' | 'sentence';
}
```

### SkiaWordHighlight.tsx

Skia ile yüksek performanslı kelime vurgulama.

**Özellikler:**
- 60 FPS smooth animasyon
- Kelime bazlı highlight
- Tıklanabilir kelimeler
- Otomatik scroll

### SkiaSentenceHighlight.tsx

Cümle bazlı vurgulama bileşeni.

**Özellikler:**
- Cümle tespiti (noktalama bazlı)
- Satır bazlı vurgulama
- Smooth geçişler

### UsageEstimateCard.tsx

Kullanım tahmini gösteren kart.

**Özellikler:**
- Kalan audio hakkı
- Tahmini dakika hesaplaması
- Progress bar

### PatternList.tsx

Dilbilgisi kalıplarını listeleyen bileşen.

**Özellikler:**
- Pattern başlığı ve açıklaması
- Örnek cümleler
- Türkçe çeviriler

### HighlightedText.tsx

Basit metin vurgulama bileşeni.

### KeyboardToggleOverlay.tsx

Klavye açıkken gösterilen overlay.

---

## Servisler (Services)

### api.ts

Ana API istemcisi. Axios tabanlı.

**Özellikler:**
- Otomatik token ekleme (interceptor)
- Token yenileme (401 handling)
- Render.com hibernation handling
- Timeout yönetimi

**Ana Metodlar:**
```typescript
apiService = {
  // Bağlantı kontrolü
  checkConnectivity(): Promise<boolean>,
  
  // TTS İşlemleri
  processTextToSpeech(request: TTSRequest): Promise<TTSResponse>,
  processTextToSpeechAsync(request: TTSRequest): Promise<JobResponse>,
  createPodcast(params: PodcastParams): Promise<any>,
  getJobStatus(jobId: string): Promise<any>,
  getActiveTtsJob(): Promise<JobStatusResponse>,
  
  // Audio İşlemleri
  getAudioLibrary(): Promise<AudioTrack[]>,
  deleteAudio(id: string): Promise<void>,
  
  // Kelime İşlemleri
  getVocabulary(): Promise<Word[]>,
  addWordToVocabulary(word: string): Promise<void>,
  addWordWithTranslation(word: string, translation: string): Promise<void>,
  deleteWord(id: string): Promise<void>,
  markWordAsLearned(id: string): Promise<void>,
  
  // Subscription
  getCurrentSubscription(): Promise<Subscription>,
  getAvailablePlans(): Promise<Plan[]>,
  
  // IAP Verification
  verifyAppleReceipt(receipt: string, productId: string): Promise<any>,
  verifyGooglePlayPurchase(token: string, productId: string, packageName: string): Promise<any>,
  
  // Notifications
  registerPushToken(token: string, platform: string): Promise<void>,
  getUnreadNotifications(): Promise<Notification[]>,
  markNotificationAsRead(id: string): Promise<void>,
  
  // Support
  getConversations(): Promise<Conversation[]>,
  sendMessage(conversationId: string, content: string): Promise<void>,
  
  // Voice
  getAvailableVoices(): Promise<Voice[]>,
  
  // Patterns
  findPatterns(text: string, level: string): Promise<Pattern[]>,
}
```

### supabase.ts

Supabase authentication wrapper.

```typescript
authService = {
  signIn(email: string, password: string),
  signUp(email: string, password: string, fullName?: string, phoneNumber?: string),
  signOut(),
  resetPassword(email: string),
  updatePassword(newPassword: string),
  onAuthStateChange(callback),
  getSession(),
}
```

### socialAuth.ts

Social login implementasyonları.

```typescript
// Google Sign-In
configureGoogleSignIn(),
signInWithGoogle(): Promise<SocialAuthResult>,

// Apple Sign-In (iOS only)
signInWithApple(): Promise<SocialAuthResult>,

// Facebook Login
configureFacebookSDK(),
signInWithFacebook(): Promise<SocialAuthResult>,

// Cleanup
signOutFromSocialProviders(),
```

### iap.ts

In-App Purchase yönetimi.

```typescript
// Product IDs
IAP_PRODUCTS = {
  goldMonthly: 'com.lingroot.premium.monthly',
  platinumMonthly: 'com.lingroot.premium.monthly.platin',
}

// Functions
initIAP(): Promise<void>,
endIAP(): Promise<void>,
getProducts(): Promise<Product[]>,
purchaseProduct(productId: string): Promise<PurchaseResult>,
restorePurchases(): Promise<void>,
```

### audioService.ts

TrackPlayer wrapper.

```typescript
createSound(url: string): Promise<{
  playAsync(): Promise<void>,
  pauseAsync(): Promise<void>,
  stopAsync(): Promise<void>,
  setPositionAsync(ms: number): Promise<void>,
  getStatusAsync(): Promise<PlaybackStatus>,
  setOnPlaybackStatusUpdate(callback),
  unloadAsync(): Promise<void>,
}>,
```

### notificationService.ts

Platform-aware bildirim servisi.

**iOS (notificationService.ios.ts):**
```typescript
NotificationService = {
  initialize(),
  requestPermissions(): Promise<boolean>,
  setupNotificationResponseHandler(callback),
  scheduleVocabularyReminder(word: Word),
  setupPeriodicVocabularyNotifications(),
  stopVocabularyReminders(),
  sendTestNotification(),
  consumePendingWordId(): string | null,
}
```

**Android (notificationService.android.ts):**
- react-native-push-notification kullanır
- Aynı API imzası

### pushTokenService.ts

FCM token yönetimi.

```typescript
registerPushTokenWithBackend(): Promise<void>,
setupPushTokenRefreshListener(),
```

### environmentConfig.ts

Ortam yapılandırma yönetimi.

```typescript
getEnvironmentConfig(): Promise<EnvironmentConfig>,
setEnvironment(env: 'production' | 'test' | 'local'): Promise<void>,
getApiBaseUrl(): Promise<string>,
```

### reminderSettingsService.ts

Hatırlatıcı ayarları yönetimi.

```typescript
getReminderSettings(): Promise<ReminderSettings>,
saveReminderSettings(settings: ReminderSettings): Promise<void>,
```

---

## Context Providers

### AuthContext.tsx

Kullanıcı kimlik doğrulama state'i.

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string, phoneNumber?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  signInWithGoogle?: () => Promise<void>;
  signInWithFacebook?: () => Promise<void>;
  signInWithApple?: () => Promise<void>;
}

// Kullanım
const { user, signIn, signOut } = useAuth();
```

### AudioContext.tsx

Global ses durumu yönetimi.

```typescript
interface AudioContextType {
  currentTrack: AudioTrack | null;
  setCurrentTrack: (track: AudioTrack | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  sound: any;
  setSound: (sound: any) => void;
  stopAllAudio: () => Promise<void>;
}

// Kullanım
const { currentTrack, isPlaying, stopAllAudio } = useAudioContext();
```

### LanguageContext.tsx

Çoklu dil desteği.

```typescript
interface LanguageContextType {
  language: 'tr' | 'en';
  setLanguage: (lang: 'tr' | 'en') => void;
  t: (key: string) => string;
}

// Kullanım
const { language, setLanguage, t } = useLanguage();
// t('home.title') → "Ana Sayfa" veya "Home"
```

---

## Navigasyon Yapısı

### Stack Navigator (Root)

```
RootStackParamList:
├── Auth (Stack)
│   ├── Login
│   ├── Register
│   ├── ForgotPassword
│   └── ResetPassword
│
└── Main (Tabs) - Authenticated users only
    ├── Home
    ├── Library
    ├── Create
    └── Profile
    
Additional Screens (from Main):
├── Vocabulary { wordId?: string }
├── Liro
├── Settings
├── Membership
├── Packages
├── Chat { conversationId?: string }
├── PatternList
├── PrivacyPolicy
├── TermsOfService
├── ReminderSettings
└── TtsProviderSettings
```

### Tab Navigator (Main)

```typescript
MainTabParamList = {
  Home: undefined,
  Library: undefined,
  Create: { mode?: string },
  Profile: undefined,
}
```

### Deep Linking

Bildirimlerden navigasyon:
- **Vocabulary notification**: `Vocabulary` screen with `wordId` param
- **Audio notification**: `Library` screen with `notificationAudio` param
- **Support notification**: `Chat` screen with `conversationId` param

---

## API Entegrasyonu

### Backend URL'leri

| Ortam | URL |
|-------|-----|
| Production | https://lingloops-backend.onrender.com |
| Test | CloudFlare Tunnel URL |
| Local (Emulator) | http://10.0.2.2:5001 |
| Local (Device) | http://[YOUR_IP]:5001 |

### Ana Endpoint'ler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /api/tts/process | Senkron TTS işleme |
| POST | /api/tts/process-async | Asenkron TTS işleme |
| POST | /api/tts/create-podcast | Podcast oluşturma |
| GET | /api/tts/job/:id | Job durumu sorgulama |
| GET | /api/audios | Audio kütüphanesi |
| DELETE | /api/audios/:id | Audio silme |
| GET | /api/vocabulary | Kelime listesi |
| POST | /api/vocabulary | Kelime ekleme |
| GET | /api/subscriptions/current | Aktif abonelik |
| POST | /api/subscriptions/verify-apple | Apple receipt doğrulama |
| POST | /api/subscriptions/verify-google | Google purchase doğrulama |
| POST | /api/auth/register | Kayıt |
| POST | /api/auth/login | Giriş |
| POST | /api/auth/google-login | Google login |
| POST | /api/auth/apple-login | Apple login |
| GET | /api/notifications/unread | Okunmamış bildirimler |
| POST | /api/push-tokens | Push token kayıt |

### Request/Response Tipleri

```typescript
// TTS Request
interface TTSRequest {
  type: 'text' | 'file';
  input: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  speakingRate?: number;
  voice?: string;
  gender?: 'male' | 'female' | 'neutral';
  accent?: 'american' | 'british' | 'australian';
}

// TTS Response
interface TTSResponse {
  success: boolean;
  message: string;
  mp3_url?: string;
  level: string;
  words?: string[];
  timepoints?: Timepoint[];
  real_duration?: number;
  speaking_rate?: number;
}

// Audio Track
interface AudioTrack {
  id: string;
  title: string;
  url: string;
  level: string;
  duration: number;
  created_at: string;
  translated_text?: string;
  adapted_text?: string;
  timepoints?: Timepoint[];
  words?: string[];
}
```

---

## In-App Purchase (IAP)

### Product ID'ler

**iOS (Apple):**
```
com.lingroot.premium.monthly      → Gold Monthly
com.lingroot.premium.monthly.platin → Platinum Monthly
```

**Android (Google Play):**
```
com.nsyzk.lingrootmobile.gold.monthly    → Gold Monthly
com.nsyzk.lingroot.platinum.monthly      → Platinum Monthly
```

### Satın Alma Akışı

```
1. Kullanıcı paket seçer (PackagesScreen)
2. purchaseProduct() çağrılır
3. Native IAP dialog açılır
4. Satın alma tamamlanır
5. Receipt/token backend'e gönderilir
6. Backend doğrular ve subscription oluşturur
7. UI güncellenir
```

### Backend Doğrulama

**iOS:**
```typescript
apiService.verifyAppleReceipt(receipt, productId)
// Backend: /api/subscriptions/verify-apple
```

**Android:**
```typescript
apiService.verifyGooglePlayPurchase(purchaseToken, productId, packageName)
// Backend: /api/subscriptions/verify-google
```

---

## Bildirim Sistemi

### Push Notifications (FCM)

1. **Token Kaydı:**
   - Uygulama başlatıldığında FCM token alınır
   - Token backend'e kaydedilir
   - Token yenilendiğinde otomatik güncelleme

2. **Bildirim Tipleri:**
   - `audio_created`: TTS işlemi tamamlandı
   - `support_message`: Yeni destek mesajı
   - `vocabulary_reminder`: Kelime hatırlatması

3. **Bildirim Handling:**
   - Foreground: Alert veya in-app toast
   - Background: System notification
   - Killed: Cold start + navigation

### Local Notifications

iOS ve Android için ayrı implementasyon:

```typescript
// Kelime hatırlatması
NotificationService.scheduleVocabularyReminder({
  word: "example",
  translation: "örnek",
  id: "word-123"
});

// Periyodik hatırlatma
NotificationService.setupPeriodicVocabularyNotifications();
// Her 5 dakikada bir rastgele öğrenilmemiş kelime
```

---

## Deployment

### EAS Build (Expo Application Services)

```bash
# EAS CLI kurulumu
npm install -g @expo/eas-cli

# Login
eas login

# Build konfigürasyonu
eas build:configure

# Android APK/AAB
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production

# Her ikisi
eas build --platform all --profile production
```

### Manuel Build

**Android:**
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/
```

**iOS:**
```bash
cd ios
xcodebuild -workspace LingRootMobile.xcworkspace -scheme LingRootMobile -configuration Release archive
```

### Store Bilgileri

| Platform | Bundle ID / Package Name |
|----------|-------------------------|
| iOS | com.lingroot.mobile |
| Android | com.nsyzk.lingrootmobile |

| Platform | App ID |
|----------|--------|
| iOS (App Store) | 6753145745 |

---

## Troubleshooting

### Metro Bundler Sorunları
```bash
# Cache temizle ve yeniden başlat
npm start -- --reset-cache
```

### iOS Build Sorunları
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

### Android Build Sorunları
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Bağlantı Sorunları
- Emülatör: `10.0.2.2:5001` kullanın
- Fiziksel cihaz: Aynı WiFi'da olun ve bilgisayar IP'sini kullanın
- Firewall: 5001 portunu açın

### Token Sorunları
```typescript
// Token temizleme
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.removeItem('auth_token');
await AsyncStorage.removeItem('refresh_token');
await AsyncStorage.removeItem('user_data');
```

---

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## İletişim

- **Proje**: LingRoot
- **Website**: [Web Uygulaması](../frontend)
- **Backend**: [API Servisi](../backend)
- **Destek**: support@lingroot.com
