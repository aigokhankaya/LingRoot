# LingRoot Performans Denetim Raporu

> **Created:** 2026-02-03 | **Updated:** 2026-02-04 | **Version:** 1.2

**Kapsam:** Web Frontend (Next.js), Mobil Uygulama (React Native) ve Backend (Express.js) genelinde kapsamlı performans analizi.
**Toplam Bulgu:** 75
**Rapor Türü:** Analiz ve ilerleme takibi — Orijinal analiz 2026-02-03, uygulama durumu 2026-02-04.

---

## İçindekiler

- [Yönetici Özeti](#yönetici-özeti)
- [Web Frontend Bulguları (Next.js)](#1-web-frontend-bulguları-nextjs)
- [Mobil Uygulama Bulguları (React Native)](#2-mobil-uygulama-bulguları-react-native)
- [Backend Bulguları (Express.js)](#3-backend-bulguları-expressjs)
- [Platformlar Arası Ortak Desenler](#4-platformlar-arası-ortak-desenler)
- [İyileştirme Önerileri](#5-i̇yileştirme-önerileri)
- [Öncelik Matrisi](#6-öncelik-matrisi-etki-vs-efor)
- [Aşamalı Yol Haritası](#7-aşamalı-yol-haritası)

---

## Yönetici Özeti

### Genel İstatistikler

| Ciddiyet | Web | Mobil | Backend | Toplam |
|----------|-----|-------|---------|--------|
| KRİTİK | 3 | 5 | 5 | **13** |
| YÜKSEK | 12 | 6 | 5 | **23** |
| ORTA | 11 | 10 | 7 | **28** |
| DÜŞÜK | 2 | 4 | 5 | **11** |
| **Toplam** | **28** | **25** | **22** | **75** |

### Sağlık Skoru: 53 / 100 ↑ (önceki: 22)

**Güncel durum** (48/75 bulgu çözüldü, 3 kısmi, 2 bilinçli karar, 22 açık):

Kalan ceza: `(1.5×15 + 9×5 + 10×2 + 3×0.5)` = `89`
Formül: `10000 / (100 + 89)` ≈ **53/100**

| Ciddiyet | Orijinal | Çözüldü | Kısmi | Karar | Açık |
|----------|----------|---------|-------|-------|------|
| KRİTİK   | 13       | 11      | 1     | —     | 1    |
| YÜKSEK   | 23       | 13      | 2     | —     | 8    |
| ORTA     | 28       | 16      | —     | 2     | 10   |
| DÜŞÜK    | 11       | 8       | —     | —     | 3    |
| **Toplam** | **75** | **48**  | **3** | **2** | **22** |

Orijinal skor: `10000 / (100 + 371.5)` ≈ **22/100** → Ceza azaltımı: 371.5 → 89 (%76 azalma)

### En Kritik 5 Bulgu

| # | Alan | Bulgu | Etki | Durum |
|---|------|-------|------|-------|
| 1 | Web | SyncedTextPlayer 240 FPS'de O(n) doğrusal tarama ile çalışıyor | Saniyede 360.000'e kadar karşılaştırma, aşırı CPU tüketimi | ✅ Çözüldü |
| 2 | Mobil | 19 ekranın tamamı eager import ile yükleniyor, sıfır lazy loading | Artan soğuk başlatma süresi, JS bundle'ın tamamı açılışta parse ediliyor | ✅ Çözüldü |
| 3 | Backend | Response compression middleware'i yok | Tüm JSON yanıtlar sıkıştırılmadan gönderiliyor | ✅ Çözüldü |
| 4 | Mobil | AudioContext/LanguageContext/AuthContext değerleri memoize edilmemiş | Herhangi bir context değişikliğinde tüm uygulamada zincirleme re-render | ✅ Çözüldü |
| 5 | Backend | Auth middleware her kimlik doğrulamalı istekte DB'ye sorgu atıyor | Her API çağrısında gereksiz Supabase sorgusu | ✅ Çözüldü |

---

## 1. Web Frontend Bulguları (Next.js)

### KRİTİK

#### WEB-C-001: Çift FontAwesome Yüklemesi (npm + CDN)

**Kategori:** Bundle & Build
**Dosya:** `frontend/src/app/layout.tsx:5,26`

FontAwesome CSS iki kez yükleniyor — bir npm import ile, bir de CDN `<link>` ile:

```tsx
// Satır 5 - npm paketi import
import '@fortawesome/fontawesome-free/css/all.min.css';

// Satır 26 - CDN link etiketi (DUPLIKAT)
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
```

**Etki:** CSS payload'u iki katına çıkıyor (~60KB minified), render-blocking harici istek oluşturuyor ve CDN'deki eski versiyon (6.4.0) npm paketinden (6.7.2) farklı olduğu için ikon tutarsızlıklarına yol açabiliyor.

---

#### WEB-C-002: SyncedTextPlayer — 1533 Satırlık Monolit, 240 FPS Döngüsü

**Kategori:** Bileşenler / Render
**Dosya:** `frontend/src/components/SyncedTextPlayer.tsx`

Bu bileşen 1533 satır (500 satır mimari limitinin 3 katı). Temel sorunlar:

**a) 240 FPS requestAnimationFrame döngüsü (satır 626):**
```tsx
const updateInterval = timingMethod === 'Backend' ?
    (1000 / 240) :  // 240 FPS
    (1000 / 120);   // 120 FPS
```

**b) Her karede doğrusal O(n) tarama (satır 467-517):**
```tsx
for (let i = 0; i < wordTimestamps.length; i++) {
    const timestamp = wordTimestamps[i];
    if (timestamp && currentTime >= timestamp.startTime && currentTime < timestamp.endTime) {
        foundWordIndex = i;
        break;
    }
}
```
1500 kelime × 240 FPS = saniyede 360.000'e kadar karşılaştırma. `useWordSync.ts` hook'u doğru şekilde binary search kullanıyor, ancak bu bileşen kullanmıyor.

**c) requestAnimationFrame hiçbir zaman iptal edilmiyor (satır 638-639):** Döngü koşulsuz olarak `requestAnimationFrame` çağırıyor, cleanup fonksiyonunda `cancelAnimationFrame` yok. Ses duraklatıldığında bile çalışmaya devam ediyor.

**d) React.memo ile sarılmamış.** Her kelime `<span>` elementine her render'da yeni inline style nesnesi atanıyor.

**Etki:** Ciddi CPU tüketimi, pil tüketimi, düşük donanımlı cihazlarda frame düşmeleri.

---

#### WEB-C-003: Neredeyse Tüm Sayfalar 'use client'

**Kategori:** Sayfalar / Route'lar
**Dosyalar:** `frontend/src/app/` altında 40 sayfa dosyası

Neredeyse tüm sayfalarda en üstte `'use client'` bulunuyor, bu şu anlama geliyor:
- Sunucu tarafı render (SSR) yok
- Sayfa render edilmeden önce tüm JavaScript indirilip parse edilmeli
- Suspense ile streaming SSR yok
- Server Component sınırlarıyla otomatik kod bölme yok

**Etki:** Tüm uygulama istemci taraflı SPA gibi davranıyor, Next.js'in SSR/streaming performans avantajları kaybediliyor.

---

### YÜKSEK

#### WEB-H-001: Bundle Analyzer veya optimizePackageImports Yok

**Kategori:** Bundle & Build
**Dosya:** `frontend/next.config.js`

`@next/bundle-analyzer` entegrasyonu ve büyük bağımlılıklar için `experimental.optimizePackageImports` yapılandırması (`echarts`, `firebase`, `framer-motion`, `lucide-react`, `react-icons`) bulunmuyor.

**Etki:** Sadece birkaç export kullanılsa bile kütüphanelerin tamamı bundle'a dahil ediliyor.

---

#### WEB-H-002: echarts Tam Wildcard Import (~1MB)

**Kategori:** Bundle & Build
**Dosya:** `frontend/src/app/admin/dashboard/page.tsx:25`

```tsx
import * as echarts from 'echarts';
```

**Etki:** echarts kütüphanesinin tamamı (~1MB minified) admin dashboard'a import ediliyor. `echarts/core` ile sadece gerekli chart tipleri kullanılmalı.

---

#### WEB-H-003: Ağır Bağımlılıklar Tree-Shaking Koruması Olmadan

**Kategori:** Bundle & Build
**Dosya:** `frontend/package.json`

Tree-shaking koruması olmayan büyük bağımlılıklar: `firebase` (~200KB+), `framer-motion` (40+ dosyada), `echarts` (~1MB), `lottie-react`, `recharts`, `swiper`, `socket.io-client`.

**Etki:** Tüm sayfalarda önemli ölçüde şişirilmiş bundle boyutu.

---

#### WEB-H-004: Üretim Kodunda 299 console.log İfadesi

**Kategori:** Bileşenler / Performans
**Dosyalar:** `frontend/src/` altında 41 dosya

En çok bulunan dosyalar: `useWordSync.ts` (42), `SyncedTextPlayer.tsx` (34), `InputSection.tsx` (34), `auth.tsx` (32), `AudioPlayerContext.tsx` (13).

Özellikle sıcak yollarda sorunlu:
```tsx
console.log(`🎵 [AUDIO STATE DEBUG] React isPlaying: ${isPlaying}, Audio paused: ${audioRef.current.paused}...`);
```

**Etki:** Animasyon döngüleri ve event handler'lardaki string serializasyonu çalışma zamanı performansını düşürüyor.

---

#### WEB-H-005: Sadece 1 Bileşen React.memo Kullanıyor

**Kategori:** Bileşenler / Render
**Dosya:** `frontend/src/components/NewSyncedTextPlayer.tsx:81`

80+ bileşenden sadece `NewSyncedTextPlayer` React.memo kullanıyor. Memo'lanmamış büyük bileşenler: `SyncedTextPlayer` (1533 satır), `OutputSection` (891 satır), `InputSection` (856 satır), `BookTab` (1033 satır).

**Etki:** Üst bileşen yeniden render olduğunda, prop'lar değişmemiş olsa bile tüm alt bileşenler yeniden render oluyor.

---

#### WEB-H-006: Admin Dashboard — 2079 Satır

**Kategori:** Bileşenler / Mimari
**Dosya:** `frontend/src/app/admin/dashboard/page.tsx`

2079 satır ile 500 satır limitinin 4 katı. echarts wildcard import dahil.

**Etki:** Mimari kuralları ihlal ediyor. Bölünme veya lazy loading olmadan dev render ağacı.

---

#### WEB-H-007: Ağır Bileşenler İçin Lazy Loading Yok

**Kategori:** Sayfalar / Route'lar
**Dosyalar:** Sadece 1 dosya `next/dynamic` kullanıyor, `React.lazy` kullanan 0 dosya var.

Dinamik import edilmesi gereken bileşenler: `SyncedTextPlayer`, `BookTab` (1033 satır), `ApiCostDashboard`, echarts/recharts, oyun bileşenleri, `OnboardingFlow`.

**Etki:** Kullanılıp kullanılmadığına bakılmaksızın tüm ağır bileşenler ilk bundle'a dahil ediliyor.

---

#### WEB-H-008: Suspense Boundary'leri Eksik

**Kategori:** Sayfalar / Route'lar
**Dosyalar:** Sadece 2 dosya `<Suspense>` kullanıyor (`AnalyticsTracker.tsx`, `payment/page.tsx`)

Veri çeken bileşenler için route veya bileşen düzeyinde Suspense boundary yok.

**Etki:** Tüm sayfa en yavaş veri getirme işlemine kadar bloke oluyor, streaming veya aşamalı render yapılamıyor.

---

#### WEB-H-009: next/image Yerine Ham `<img>` Etiketleri

**Kategori:** Sayfalar / Route'lar
**Dosyalar:** 11+ dosyada ham `<img>` etiketi kullanılıyor (`BookTab.tsx`, `Footer.tsx`, `BookCard.tsx`, `Leaderboard.tsx`, admin sayfaları vb.)

ESLint kuralı `@next/next/no-img-element` devre dışı.

**Etki:** Lazy loading, responsive srcset, WebP/AVIF format, blur placeholder ve doğru boyutlandırma eksik.

---

#### WEB-H-010: SWR / React Query / Stale-While-Revalidate Yok

**Kategori:** Veri Getirme
**Dosya:** `frontend/src/lib/api.ts`

Tüm API çağrıları ham `fetch` ile yapılıyor — önbellek katmanı, stale-while-revalidate veya eşzamanlı istek tekilleştirmesi yok. Her bileşen mount'unda yeni API çağrısı tetikleniyor.

**Etki:** Gereksiz ağ istekleri, istemci tarafı veri tekilleştirmesi yok, daha yavaş algılanan performans.

---

#### WEB-H-011: AudioPlayerContext Saniyede 10 Kez Global Re-render Tetikliyor

**Kategori:** State Yönetimi
**Dosya:** `frontend/src/context/AudioPlayerContext.tsx:95-99,312-330`

```tsx
// Her 100ms'de güncelleme
syncIntervalRef.current = window.setInterval(() => {
    if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
    }
}, 100);
```

Context `value` nesnesi (satır 312) her render'da yeniden oluşturuluyor, `useAudioPlayer()` tüketicilerinin tamamının saniyede 10 kez yeniden render olmasına neden oluyor.

**Etki:** MiniPlayer, ExpandedPlayerModal ve ses tüketen tüm bileşenleri etkileyen global re-render zinciri, saniyede 10 kez.

---

#### WEB-H-012: Bellek Sızıntısı — Audio Elementleri Temizlenmiyor

**Kategori:** Bellek Yönetimi
**Dosya:** `frontend/src/context/AudioPlayerContext.tsx:143-211`

`playTrack()` içinde `audio.addEventListener(...)` ile eklenen event listener'lar hiçbir zaman kaldırılmıyor. Her çağrı 7 event listener ile yeni bir `Audio()` elementi oluşturuyor.

**Etki:** Zamanla sızan audio elementleri ve event listener'lar birikir, bellek tüketimi artar.

---

### ORTA

#### WEB-M-001: Performans Sorunlarını Yakalayan ESLint Kuralları Devre Dışı

**Kategori:** Build Yapılandırması
**Dosya:** `frontend/package.json:8-13`

Devre dışı kurallar: `react-hooks/exhaustive-deps`, `@next/next/no-img-element`, `@next/next/no-page-custom-font`, `@typescript-eslint/no-unused-vars`.

**Etki:** Hook'lardaki stale closure'lar tespit edilemiyor, ham `<img>` kullanımı işaretlenmiyor.

---

#### WEB-M-002: CSS @import ile Harici Google Fonts (Render-Blocking)

**Kategori:** Bundle & Build
**Dosya:** `frontend/src/app/globals.css:1-2`

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');
```

**Etki:** CSS `@import` render'ı bloke ediyor. Arapça font ihtiyaç olmasa bile TÜM kullanıcılar için yükleniyor. `next/font` kullanılmalı.

---

#### WEB-M-003: useWordSync — isPlaying Stale Closure

**Kategori:** Bileşenler
**Dosya:** `frontend/src/hooks/useWordSync.ts:255`

`isPlaying` değişkeni `syncLoop` içinde referans alınıyor ancak `useCallback` bağımlılık dizisinde YOK.

**Etki:** Stale closure eski `isPlaying` değerini yakalıyor, sync döngüsü yanlış davranıyor.

---

#### WEB-M-004: MembershipContext Value Her Render'da Yeniden Oluşturuluyor

**Kategori:** State Yönetimi
**Dosya:** `frontend/src/context/MembershipContext.tsx:96`

`value` prop'unda inline nesne literal. `canUse`, `badge`, `upgrade`, `refresh` her render'da `useMemo`/`useCallback` olmadan yeniden oluşturuluyor.

**Etki:** Tüm tüketiciler herhangi bir membership state değişikliğinde yeniden render oluyor.

---

#### WEB-M-005: AuthContext Value Yeniden Oluşturuluyor + Fonksiyonlar Memoize Edilmemiş

**Kategori:** State Yönetimi
**Dosya:** `frontend/src/lib/auth.tsx:476`

`login`, `loginWithGoogle`, `register` `useCallback` ile sarılmamış. Sadece `logout` sarılmış.

**Etki:** Her provider render'ında tüm auth tüketicilerinde gereksiz re-render.

---

#### WEB-M-006: framer-motion İçin Dinamik Import Yok

**Kategori:** Bundle & Build
**Dosyalar:** 40+ dosyada framer-motion import ediliyor

framer-motion'ın ~40KB'ı (gzipped) statik import'lar nedeniyle birçok sayfanın ilk bundle'ına dahil ediliyor.

**Etki:** Animasyona ihtiyaç duymayan sayfalarda bile animasyon kütüphanesi yükleniyor.

---

#### WEB-M-007: TopicPipelineComponent — Sabit Kodlanmış localhost URL

**Kategori:** Veri Getirme
**Dosya:** `frontend/src/components/TopicPipelineComponent.tsx:84,126`

```tsx
const response = await fetch('http://localhost:5001/api/topic-pipeline/suggestions', { ... });
```

**Etki:** Üretimde çalışmayacak. Next.js rewrite proxy yapılandırmasını atlıyor.

---

#### WEB-M-008: Görünürlük Kontrolü Olmadan Polling

**Kategori:** Veri Getirme
**Dosyalar:** `frontend/src/components/NotificationBell.tsx:86` (60sn), `frontend/src/components/admin/JobDashboard.tsx:67` (10sn)

Tarayıcı sekmesi görünür olmadığında bile polling devam ediyor.

**Etki:** Sekme arka plandayken gereksiz bant genişliği, CPU ve pil tüketimi.

---

#### WEB-M-009: globals.css — 877 Satır, 50+ !important

**Kategori:** CSS / Stil
**Dosya:** `frontend/src/app/globals.css`

Manuel RTL override'ları (30+ kural), agresif wildcard seçiciler, TÜM div'leri etkileyen container genişliklerinde `!important`.

**Etki:** Stil spesifiklik çatışmaları, potansiyel layout bozulmaları, büyük CSS payload.

---

#### WEB-M-010: Aynı Anda Üç İkon Sistemi Yüklü

**Kategori:** Bundle & Build
**Dosyalar:** FontAwesome (npm + CDN), `lucide-react`, `react-icons`

**Etki:** Sadece birine ihtiyaç varken üç ayrı ikon kütüphanesi indiriliyor.

---

#### WEB-M-011: OpenTelemetry SDK Her Sayfada Yükleniyor

**Kategori:** Bundle & Build
**Dosya:** `frontend/src/app/client-layout.tsx:7,17-19`

OpenTelemetry SDK (~30-50KB) her sayfa yüklemesinde başlatılıyor.

**Etki:** Çoğu kullanıcının fayda görmediği fazladan JavaScript. Feature flag arkasına alınmalı.

---

### DÜŞÜK

#### WEB-L-001: Firebase Analytics Eager Yükleniyor

**Kategori:** Bundle & Build
**Dosya:** `frontend/src/lib/firebase.ts:1-2`

Firebase SDK (~80KB) eagerly import ediliyor. Dinamik `import()` kullanılmalı.

**Etki:** `isSupported()` kontrolüne rağmen modül bundle'a dahil ediliyor.

---

#### WEB-L-002: Tailwind Purge'de Ölü Yollar

**Kategori:** Build Yapılandırması
**Dosya:** `frontend/tailwind.config.js:5-9`

Content yolları muhtemelen mevcut olmayan `./pages/**` ve `./components/**` (kök seviye) dizinlerini içeriyor.

**Etki:** Mevcut olmayan yolların taranmasıyla hafif build süresi artışı.

---

## 2. Mobil Uygulama Bulguları (React Native)

### KRİTİK

#### MOB-C-001: 19 Ekranın Tamamı Eager Import — Sıfır Lazy Loading

**Kategori:** Navigasyon & Ekranlar
**Dosya:** `LingRootMobile/src/navigation/AppNavigator.tsx:26-46`

```typescript
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import CreateScreen from '../screens/CreateScreen';
// ... 14 ekran daha
```

`LingRootMobile/src/` genelinde `React.lazy` kullanımı sıfır.

**Etki:** 19 ekranın tamamı (3.208 satırlık CreateScreen, AudioPlayerScreen'in kullandığı 3.402 satırlık AudioPlayer dahil) açılışta parse ediliyor. Soğuk başlatma süresi ve başlangıç bellek tüketimi artıyor.

---

#### MOB-C-002: Dev Bileşen Dosyaları 500 Satır Limitini Çok Aşıyor

**Kategori:** Bileşenler / Mimari

| Dosya | Satır | Limit Aşımı |
|-------|-------|-------------|
| `LingRootMobile/src/components/AudioPlayer.tsx` | 3.402 | 6,8x |
| `LingRootMobile/src/screens/CreateScreen.tsx` | 3.208 | 6,4x |
| `LingRootMobile/src/screens/LiroScreen.tsx` | 1.572 | 3,1x |
| `LingRootMobile/src/screens/VocabularyScreen.tsx` | 1.323 | 2,6x |
| `LingRootMobile/src/screens/ChatScreen.tsx` | 1.201 | 2,4x |
| `LingRootMobile/src/screens/TopicTreeScreen.tsx` | 722 | 1,4x |

AudioPlayer'da 28 `useState` + 24 `useRef` çağrısı var. CreateScreen'de 64 `useState` çağrısı var.

**Etki:** Tek bir state değişikliği tüm monolitin yeniden render edilmesine neden oluyor. Granüler `React.memo` sınırları uygulanamıyor.

---

#### MOB-C-003: AudioContext Value Nesnesi Memoize Edilmemiş

**Kategori:** Context / State
**Dosya:** `LingRootMobile/src/contexts/AudioContext.tsx:48-63`

```typescript
const value: AudioContextType = {
  currentTrack,
  isPlaying,
  sound,
  setCurrentTrack: setCurrentTrackWithLog,
  setIsPlaying: setIsPlayingWithLog,
  setSound,
  isTrackPlaying,          // her render'da yeniden oluşturulan fonksiyon
  stopAllAudio: async () => {  // her render'da yeniden oluşturulan inline async arrow
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); }
  },
};
```

`isTrackPlaying` `useCallback` ile sarılmamış. `stopAllAudio` her render'da yeniden oluşturulan inline arrow.

**Etki:** Yeni nesne referansı nedeniyle `useAudioContext()` tüketicilerinin tamamı her ses state değişikliğinde yeniden render oluyor.

---

#### MOB-C-004: LanguageContext Value Nesnesi ve `t` Fonksiyonu Memoize Edilmemiş

**Kategori:** Context / State
**Dosya:** `LingRootMobile/src/contexts/LanguageContext.tsx:84-106`

```typescript
const t = (key: string, vars?: Record<string, string | number>): string => {
  // string interpolasyon mantığı...
};

const value: LanguageContextType = {
  language, setLanguage, t, isLoading,  // her render'da yeni referanslar
};
```

`t` fonksiyonu her render'da yeniden oluşturuluyor. `setLanguage` `useCallback` ile sarılmamış. `value` `useMemo` ile sarılmamış.

**Etki:** `useLanguage()` neredeyse HER ekran ve bileşen tarafından tüketiliyor. LanguageProvider'ın herhangi bir re-render'ı tüm uygulama ağacına yayılıyor.

---

#### MOB-C-005: Hiçbir Ekran Bileşeninde React.memo Yok

**Kategori:** Navigasyon & Ekranlar
**Dosyalar:** `LingRootMobile/src/screens/` altındaki 19 ekran dosyasının tamamı

Tüm `src/` genelinde sadece 3 `React.memo` kullanımı bulundu: `SkiaWordHighlight.tsx`, `AudioPlayer.tsx` (iç WordComponent), `SkiaSentenceHighlight.tsx`.

Hiçbir ekran export'u `React.memo` kullanmıyor:
```typescript
const HomeScreen = () => (
  <TourProvider tooltip={CustomTooltip} maskPath={homeMaskPath}>
    <HomeScreenContent />
  </TourProvider>
);
export default HomeScreen;  // React.memo ile sarılmamış
```

**Etki:** Her üst bileşen re-render'ı (tab navigator, context değişiklikleri) tüm ekranları yeniden render ediyor — React Navigation tarafından canlı tutulan ekran dışı olanlar dahil.

---

### YÜKSEK

#### MOB-H-001: AuthContext Value Nesnesi Memoize Edilmemiş

**Kategori:** Context / State
**Dosya:** `LingRootMobile/src/contexts/AuthContext.tsx:574-584`

Value nesnesi 7 async fonksiyon içeriyor (`signIn`, `signUp`, `signOut`, `updateUserProfile`, `signInWithGoogleProvider`, `signInWithFacebookProvider`, `signInWithAppleProvider`) — hiçbiri `useCallback` ile sarılmamış.

**Etki:** Herhangi bir auth state değişikliğinde `useAuth()` tüketicilerinin tamamı yeniden render oluyor.

---

#### MOB-H-002: HomeScreen Her Tab Odağında Cache Olmadan API Verisi Getiriyor

**Kategori:** Ekranlar / Servisler
**Dosya:** `LingRootMobile/src/screens/HomeScreen.tsx:247-250,324-330`

```typescript
useEffect(() => { fetchUserStats(); fetchPlanFeatures(); }, [user?.id]);

useFocusEffect(React.useCallback(() => {
    fetchUserStats().then(() => perfLog.mark('home:focus:fetchDone'));
}, [user?.id]));
```

İlk mount'ta `fetchUserStats` İKİ KEZ çağrılıyor (useEffect + useFocusEffect). Sonraki her tab odağında sıfır cache ile tekrar çalışıyor.

**Etki:** Her tab geçişi 2 API çağrısı tetikliyor. Hızlı geçişler gereksiz istekler oluşturuyor.

---

#### MOB-H-003: LibraryScreen Her Odaklanmada Veri Yeniden Getiriyor

**Kategori:** Ekranlar / Servisler
**Dosya:** `LingRootMobile/src/screens/LibraryScreen.tsx:550-572`

HomeScreen ile aynı desen. `fetchAudioHistory(false, 1)` her odaklanmada eski/yeni kontrolü veya TTL olmadan çalışıyor.

**Etki:** Library'ye her tab geçişi yeni bir API çağrısı tetikliyor, scroll pozisyonunu sıfırlayabilir.

---

#### MOB-H-004: 29 Dosyada 151 Inline Arrow Fonksiyon (onPress Handler)

**Kategori:** Bileşenler / Render
**Dosyalar:** `CreateScreen.tsx` (24), `AudioPlayer.tsx` (14), `VocabularyScreen.tsx` (13), `TopicTreeScreen.tsx` (11), `ChatScreen.tsx` (10) ve 24 dosya daha.

```typescript
onPress={() => handlePlayTrack(item)}
onLongPress={() => handleLongPress(item)}
```

**Etki:** Her inline fonksiyon her render'da yeni referans oluşturuyor, alt bileşenlerdeki `React.memo`'yu etkisiz kılıyor.

---

#### MOB-H-005: Çok Sınırlı useMemo ve useCallback Kullanımı

**Kategori:** Bileşenler / Render
**Dosyalar:** Tüm ekranlar

| Ekran | Satır | useCallback | useMemo |
|-------|-------|-------------|---------|
| ProfileScreen | - | 0 | 0 |
| ChatScreen | 1.201 | 0 | 0 |
| LiroScreen | 1.572 | 0 | 0 |
| VocabularyScreen | 1.323 | 0 | 0 |
| HomeScreen | - | 1 | 0 |
| LibraryScreen | - | 1 | 0 |
| CreateScreen | 3.208 | 3 | 4 |

**Etki:** Hesaplanmış değerler, filtre fonksiyonları ve event handler'lar memoizasyon olmadan her render'da yeniden oluşturuluyor.

---

#### MOB-H-006: audioService.ts — Global Mutable Singleton Callback, Temizleme Yok

**Kategori:** Servisler
**Dosya:** `LingRootMobile/src/services/audioService.ts:28-80`

```typescript
let statusCallback: ((status: any) => void) | null = null;
let progressListenerRegistered = false;
```

Üç event listener global olarak kaydediliyor ve hiçbir zaman kaldırılmıyor. `statusCallback` tek bir global değişken — sonraki tüketiciler önceki tüketicilerin callback'ini sessizce eziyorlar. Playback sırasında her 0,5 saniyede tetikleniyor.

**Etki:** Bileşen unmount olursa stale callback referansları. Kalıcı listener'lardan bellek sızıntısı riski.

---

### ORTA

#### MOB-M-001: VocabularyScreen FlatList — scrollEnabled=false + Math.random() Key

**Kategori:** Ekranlar
**Dosya:** `LingRootMobile/src/screens/VocabularyScreen.tsx:723-729`

```typescript
<FlatList
  data={filteredWords.slice(1)}           // her render'da yeni dizi
  keyExtractor={(item) => item.id?.toString() || Math.random().toString()}  // rastgele key!
  scrollEnabled={false}                    // FlatList sanallaştırmasını tamamen etkisiz kılıyor
/>
```

**Etki:** 1) Tüm elemanlar aynı anda render ediliyor (sanallaştırma yok). 2) Rastgele key'ler her render'da unmount/remount'a neden oluyor. 3) `slice(1)` yeni dizi referansı oluşturuyor.

---

#### MOB-M-002: Hiçbir FlatList'te getItemLayout Yok

**Kategori:** Ekranlar
**Dosyalar:** `LibraryScreen.tsx:962`, `VocabularyScreen.tsx:723`, `ChatScreen.tsx:504,595`

`LingRootMobile/src/` genelinde `getItemLayout` kullanımı sıfır.

**Etki:** `scrollToIndex()` tüm ara elemanları ölçmeyi gerektiriyor (O(n)). Her scroll'da fazladan layout hesaplamaları.

---

#### MOB-M-003: Navigasyon Ekran Seçeneklerinde Inline Fonksiyonlar

**Kategori:** Navigasyon
**Dosya:** `LingRootMobile/src/navigation/AppNavigator.tsx:294,331,738-847`

~10 adet `headerBackground: () => <BlurHeader />` fonksiyonu ve `headerLeft` seçeneklerinde inline style nesneleri.

**Etki:** Her navigator render'ında yeni fonksiyon + style nesne referansları. LanguageContext'teki memoize edilmemiş `t` fonksiyonu ile birleşince sık tetikleniyor.

---

#### MOB-M-004: KeyboardToggleOverlay — Global Bileşende useNativeDriver: false

**Kategori:** Bileşenler / Animasyon
**Dosya:** `LingRootMobile/src/components/KeyboardToggleOverlay.tsx:12-17`

```typescript
Animated.timing(bottomAnim, {
    toValue: to,
    duration: ANIMATION_DURATION_MS,
    useNativeDriver: false,   // JS thread animasyonu
}).start();
```

AppNavigator'ın kökünde render ediliyor (satır 876), klavye her görünümde HER ekranda tetikleniyor.

**Etki:** JS thread animasyonu diğer işlemleri bloke ediyor. `transform: [{ translateY }]` ile `useNativeDriver: true` kullanılabilir.

---

#### MOB-M-005: Modül Kapsamında Dimensions.get('window') — Döndürmede Eski Kalıyor

**Kategori:** Bileşenler
**Dosyalar:** `HomeScreen.tsx:36`, `AudioPlayer.tsx:51`, `SkiaWordHighlight.tsx:57`, `SkiaSentenceHighlight.tsx:41`, `VocabularyScreen.tsx:48`, `LoginScreen.tsx:27`, `RegisterScreen.tsx:24`

```typescript
const { width: SCREEN_WIDTH } = Dimensions.get('window');  // modül kapsamı — güncellenmez
```

**Etki:** Cihaz döndürme, split-screen veya pencere boyutu değişikliğinde değerler eski kalıyor. `useWindowDimensions()` kullanılmalı.

---

#### MOB-M-006: TourProvider 7 Ekranı Koşulsuz Sarıyor

**Kategori:** Bileşenler
**Dosyalar:** `HomeScreen.tsx:1170`, `LibraryScreen.tsx:1021`, `CreateScreen.tsx:3204`, `VocabularyScreen.tsx:1320`, `ProfileScreen.tsx:503`, `AudioPlayerScreen.tsx:49`

`CopilotProvider` (react-native-copilot) tüm 7 ekranda context, overlay, SVG mask ve gesture responder sistemi oluşturuyor — tur tamamlandıktan sonra bile.

**Etki:** Oturumların büyük çoğunluğu için (ilk turdan sonra) saf overhead.

---

#### ~~MOB-M-007: 30 Saniyelik Bildirim Polling'i Arka Planda Durmuyor~~

**Karar:** Bu madde uygulanmayacak — mevcut polling davranışı korunacak.

---

#### MOB-M-008: contentService.ts'de Hiçbir API Çağrısında Cache Yok

**Kategori:** Servisler
**Dosya:** `LingRootMobile/src/services/contentService.ts` (tüm dosya, 261 satır)

Her fonksiyon API'ye doğrudan erişiyor — bellek cache, AsyncStorage cache ve TTL yok. Not: Aynı dizindeki `subscriptionService.ts` iyi uygulanmış çok katmanlı bir cache'e sahip ve örnek olarak kullanılabilir.

**Etki:** Ekran odaklanma re-fetch'leri (MOB-H-002, MOB-H-003) ile birleşince, her tab geçişi nadiren değişen veriler için yeni API çağrıları tetikliyor.

---

#### MOB-M-009: Çift HTTP İstemci Kütüphanesi (axios + fetch)

**Kategori:** Bağımlılıklar
**Dosya:** `LingRootMobile/package.json:29` (`axios`)

`api.ts` axios kullanıyor; `AuthContext.tsx`, `ChatScreen.tsx`, `LiroScreen.tsx` ham `fetch` kullanıyor.

**Etki:** Bundle'a duplike HTTP işlevselliği için ~13KB ekleniyor. İnterceptor'lar ve hata yönetimi ayrı ayrı uygulanıyor.

---

#### MOB-M-010: @shopify/react-native-skia — 2 Bileşen İçin Ağır Bağımlılık

**Kategori:** Bağımlılıklar
**Dosya:** `LingRootMobile/package.json:27`

Sadece `SkiaWordHighlight.tsx` ve `SkiaSentenceHighlight.tsx` dosyalarında metin arkasına renkli dikdörtgen çizmek için kullanılıyor.

**Etki:** Uygulama binary boyutuna ~2-3MB ekliyor. **Karar: Skia korunacak, alternatif yöntem değerlendirilmeyecek.**

---

### DÜŞÜK

#### MOB-L-001: Üretim Kodunda 34 Dosyada 481 console.log/warn/error

**Kategori:** Genel
**Dosyalar:** `AudioPlayer.tsx` (55), `api.ts` (37), `socialAuth.ts` (35), `PackagesScreen.tsx` (28), `AuthContext.tsx` (27), `SkiaWordHighlight.tsx` (27) ve 28 dosya daha.

**Etki:** Sıcak yollarda string serializasyon overhead'i. React Native üretim build'lerinde console.log'u otomatik kaldırmıyor — `babel-plugin-transform-remove-console` gerekiyor.

---

#### MOB-L-002: package.json'da lodash Var Ama Kaynak Kodda Kullanılmıyor

**Kategori:** Bağımlılıklar
**Dosya:** `LingRootMobile/package.json:34`

Kaynak kodda lodash için sıfır `import` veya `require` bulundu.

**Etki:** Yanlışlıkla bundle'lanırsa ~72KB ekleyen ölü bağımlılık, artı kurulum süresi overhead'i.

---

#### MOB-L-003: TrackPlayer.setupPlayer() iOS'ta Başlatmayı Bloke Ediyor

**Kategori:** Native Modüller
**Dosya:** `LingRootMobile/App.tsx:46-48`

```typescript
if (Platform.OS === 'ios') {
  await TrackPlayer.setupPlayer();
}
```

İlk render döngüsünde çağrılıyor, sonraki başlatma adımlarını (`NotificationService.initialize()` vb.) bloke ediyor.

**Etki:** Hemen ses çalmayabilecek kullanıcılar için ilk etkileşimli kareyi geciktiriyor.

---

#### MOB-L-004: Bildirim Servisi Event Listener'ları Modül Kapsamında — Hiç Temizlenmiyor

**Kategori:** Servisler
**Dosya:** `LingRootMobile/src/services/notificationService.ios.ts:10-100`

`PushNotification.configure()` ve `DeviceEventEmitter.addListener` modül kapsamında. Listener'lar uygulama ömrü boyunca kalıcı ve hot reload'da birikiyor.

**Etki:** Geliştirme sırasında potansiyel bellek sızıntısı. Handler closure'ları garbage collection'ı engelliyor.

---

## 3. Backend Bulguları (Express.js)

### KRİTİK

#### BE-C-001: Response Compression Middleware'i Yok

**Kategori:** Sunucu Yapılandırması
**Dosya:** `backend/server.js`

`compression` npm paketi `package.json`'da bulunmuyor ve gzip/brotli sıkıştırma middleware'i uygulanmamış. Her JSON yanıt sıkıştırılmadan gönderiliyor.

**Etki:** Büyük payload'lar için (timepoint'li içerik geçmişi, kelime koleksiyonları, admin dashboard'lar) önemli bant genişliği israfı.

---

#### BE-C-002: Auth Middleware Her Kimlik Doğrulamalı İstekte DB'ye Sorgu Atıyor

**Kategori:** Middleware
**Dosya:** `backend/middleware/auth.js:78-84`

```javascript
const { data: user, error } = await measureTime(
  () => supabase
    .from("users")
    .select("id, email, role")
    .eq("id", decoded.id)
    .single(),
  'Supabase User Lookup'
);
```

Her kimlik doğrulamalı istek bir Supabase sorgusu yapıyor. ~50+ korumalı route ile bu, her API çağrısında bir DB round-trip demek.

**Etki:** Büyük gereksiz veritabanı yükü. JWT zaten kullanıcı kimliğini taşıyor — kısa ömürlü bir cache (60 saniye bile) dakikada binlerce gereksiz sorguyu ortadan kaldırır.

---

#### BE-C-003: getContentHistory Pagination Olmadan TÜM İçeriği Döndürüyor

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/contentController.js:228-255`

```javascript
const { data, error } = await supabase
  .from('contenthistory')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
// .limit() veya .range() çağrısı yok
```

Tam `SELECT *` ile kullanıcının tüm içerik geçmişini getiriyor — `words` (JSON), `timepoints` (JSON) ve `dialogue_segments` (JSON) sütunları dahil, her biri onlarca KB olabilir.

**Etki:** Yüzlerce içeriğe sahip güçlü kullanıcılar için devasa payload'lar. Yanıt boyutu sınırsız büyüyor.

---

#### BE-C-004: getContentCount Sadece Süre Hesaplamak İçin TÜM Timepoint'leri Getiriyor

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/contentController.js:279-312`

```javascript
const { data: contents } = await supabase
  .from('contenthistory')
  .select('timepoints')
  .eq('user_id', userId);
// Ardından TÜM satırları döngüye alıp JSON parse edip son timepoint'i çıkarıyor
```

**Etki:** Sadece süreleri toplamak için her içerik kaydı için potansiyel olarak çok büyük JSON `timepoints` sütununu getiriyor. SQL aggregate veya özel bir `duration_seconds` sütunu olmalı.

---

#### BE-C-005: Quiz Gönderiminde N+1 Sorgu Deseni

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/contentController.js:1571-1617`

```javascript
for (const wrongWord of wrongWords) {
  await srsService.reviewWord(userId, wrongWord.word, ...);
}
for (const answer of detailedResults) {
  if (answer.word) {
    await quizEngineService.recordWordAttempt(userId, {...}, {...});
  }
}
```

Döngülerde sıralı `await`. 4 yanlış cevaplı 7 soruluk bir quiz için = 11 sıralı DB çağrısı.

**Etki:** Gecikme cevap sayısıyla doğrusal olarak artıyor. `Promise.all()` veya toplu insert kullanılmalı.

---

### YÜKSEK

#### BE-H-001: Geçici Audio/VTT Verileri İçin Bellek İçi Map'ler (Bellek Sızıntısı Riski)

**Kategori:** Bellek Yönetimi
**Dosya:** `backend/controllers/ttsController.js:37-42`

```javascript
const tempAudioFiles = new Map();
const tempVttFiles = new Map();
const activeTtsRequests = new Map();
```

Ses tamponlarını (her biri birkaç MB) process belleğinde saklıyor. Temizleme her saatte bir çalışıyor. `activeTtsRequests` başarısızlık senaryolarında hiç temizlenmiyor.

**Etki:** Yük altında bellek sınırsız büyüyor. İstek ortasında process crash olursa slotlar kalıcı olarak meşgul kalıyor.

---

#### BE-H-002: Dev Controller Dosyaları 500 Satır Limitini Aşıyor

**Kategori:** Mimari

| Controller | Satır | Limit Aşımı |
|------------|-------|-------------|
| `ttsController.js` | 2.216 | 4,4x |
| `contentController.js` | 1.750 | 3,5x |
| `adminController.js` | 1.575 | 3,2x |
| `authController.js` | 1.573 | 3,1x |
| `aiChatController.js` | 1.367 | 2,7x |
| `topicHierarchyController.js` | 1.067 | 2,1x |
| `subscriptionController.js` | 867 | 1,7x |

**Etki:** Bakım kalitesi düşüyor; performans sorunlarını tespit etmek ve izole etmek zorlaşıyor.

---

#### BE-H-003: getUserStats 4 Sıralı DB Çağrısı Yapıyor

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/statsController.js:12-113`

Birbirinden bağımsız 4 sıralı Supabase çağrısı `Promise.all()` ile paralelleştirilebilir. İlk çağrı sadece saymak için TÜM kullanıcı kelime hazinesini getiriyor — `COUNT(*)` yeterli olurdu.

**Etki:** Toplam endpoint gecikmesi = tüm 4 sorgunun toplamı yerine en uzununun süresi olabilir.

---

#### BE-H-004: Controller'larda 52+ Kez `SELECT *` Kullanılıyor

**Kategori:** Controller'lar
**Dosyalar:** `libraryController.js` (5), `documentController.js` (8), `subscriptionController.js` (4), `topicHierarchyController.js` (6) ve daha fazlası.

**Etki:** Sadece birkaç sütun gerektiğinde büyük JSON/text alanları dahil tüm sütunlar getiriliyor. Artan payload boyutu ve DB yükü.

---

#### BE-H-005: Rate Limiting ~55 Route Dosyasının Sadece 6'sında Uygulanıyor

**Kategori:** Route'lar / Güvenlik
**Rate limiting olan dosyalar:** `authRoutes.js`, `ttsRoutes.js`, `clientErrorRoutes.js`, `aiChat.js`, `gamificationRoutes.js`, `metricsRoutes.js`

**Pahalı endpoint'lerde eksik:** `contentRoutes.js` (işleme), `vocabularyRoutes.js` (OpenAI), `topicHierarchy.js` (OpenAI), `subscriptionRoutes.js` (Stripe), `documentRoutes.js` (PDF yükleme), `libraryRoutes.js`, `statsRoutes.js`, `srsRoutes.js`.

`security.js` middleware'i birçok rate limiter tanımlıyor (`contentLimiter`, `vocabularyLimiter`, `podcastLimiter`) ama çoğu **hiçbir route dosyası tarafından import edilmiyor veya kullanılmıyor**.

**Etki:** Pahalı endpoint'ler (OpenAI çağrıları, dosya işleme) kötüye kullanıma karşı korumasız.

---

### ORTA

#### BE-M-001: Redis Response Caching İçin Kullanılmıyor

**Kategori:** Caching
**Dosya:** `backend/utils/storage/redisClient.js`

Redis bağlı ama sadece BullMQ iş kuyrukları ve JWT kara listelemesi için kullanılıyor. Uygulama düzeyinde yanıt önbelleği yok.

**Etki:** Sık erişilen veriler (abonelik planları, CEFR parametreleri, kullanıcı istatistikleri) her seferinde DB'den sorgulanıyor.

---

#### BE-M-002: Sequelize Connection Pool Çok Küçük + Çift DB Pool

**Kategori:** Veritabanı Yapılandırması
**Dosyalar:** `backend/config/database.js:21-26`, `backend/config/db.js:65`

Sequelize pool max = 5. Ayrı `pg` Pool max = 20. Aynı veritabanına iki ayrı connection pool, artı Supabase JS client = üçlü bağlantı overhead'i.

**Etki:** Yük altında bağlantı tükenmesi. Verimsiz kaynak kullanımı.

---

#### BE-M-003: enrichBatch — 200ms Uyku ile Sıralı Await

**Kategori:** Servisler
**Dosya:** `backend/services/wordEnrichmentService.js:70-79`

```javascript
async enrichBatch(words) {
  for (const word of words) {
    const enriched = await this.enrichWord(word);
    results.push(enriched);
    await new Promise(r => setTimeout(r, 200)); // zorla gecikme
  }
}
```

Her kelime = ayrı OpenAI API çağrısı + 200ms zoraki gecikme. 10 kelime = minimum 2 saniye sadece uyku süresi.

**Etki:** Toplu işlem gereksiz yere yavaş. Tüm kelimeler için tek bir toplu prompt çok daha verimli olurdu.

---

#### BE-M-004: API Yanıtlarında Cache Header'ları Yok

**Kategori:** Sunucu Yapılandırması
**Dosya:** `backend/server.js`

Sadece TTS controller'ı `Cache-Control` header'ları ayarlıyor. Diğer tüm API yanıtlarında cache header'ı yok.

**Etki:** Tarayıcılar/istemciler nispeten statik verileri (abonelik planları, kelime tanımları) önbelleğe alamıyor.

---

#### BE-M-005: Kelime Hazinesinde ORDER BY RANDOM()

**Kategori:** Veritabanı
**Dosya:** `backend/controllers/vocabularyController.js:378`

```sql
ORDER BY RANDOM() LIMIT $2
```

**Etki:** Her rastgele kelime isteğinde tam tablo taraması yapıyor. Büyük kelime koleksiyonları için maliyetli.

---

#### BE-M-006: İçerik İşleme Endpoint'lerinde Kimlik Doğrulama Eksik

**Kategori:** Route'lar / Güvenlik
**Dosya:** `backend/routes/contentRoutes.js:29-41`

`process-link`, `process-text`, `process-file`, `process-hashtag`, `article-details` — `authenticate` middleware'i ve rate limiting yok.

**Etki:** Herkes kimlik doğrulaması olmadan metin işleme, haber getirme ve makale çıkarma tetikleyebilir. Bu endpoint'ler harici API'ler çağırıyor.

---

#### BE-M-007: Library Controller — Öğe Detayları İçin 3 Sıralı DB Çağrısı

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/libraryController.js:100-190`

3 sıralı sorgu (kitap detayları, bölümler, kullanıcı ilerleme durumu) — hepsi bağımsız, hepsi `SELECT *` kullanıyor.

**Etki:** Endpoint gecikmesi = 3 sorgunun toplamı. `Promise.all()` ile belirli sütun seçimi kullanılmalı.

---

### DÜŞÜK

#### BE-L-001: package.json'da Kullanılmayan Bağımlılıklar

**Kategori:** Bağımlılıklar
**Dosya:** `backend/package.json`

Kullanılmayanlar: `mongoose`, `twilio`, `express-mongo-sanitize`, `got`, `csv-parser` (sadece migration'larda).

**Etki:** Artan kurulum süresi, node_modules boyutu ve saldırı yüzeyi.

---

#### BE-L-002: Cluster Mode veya Worker Thread'ler Yok

**Kategori:** Sunucu Yapılandırması
**Dosya:** `backend/server.js`

Tek Node.js process'i. CPU yoğun TTS işlemleri için `cluster` modülü veya worker thread'ler kullanılmıyor.

**Etki:** Eşzamanlı TTS isteklerinde tek thread'li darboğaz.

---

#### BE-L-003: TTS Sıcak Yolunda Aşırı Loglama

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/ttsController.js`

Tek bir TTS isteği boyunca 30+ `logger.info()` çağrısı, tam istek gövdesi dökümleri dahil.

**Etki:** Yük altında verbose info-level loglama nedeniyle I/O overhead'i.

---

#### BE-L-004: subscriptionController — Sıralı Bağımsız Sorgular

**Kategori:** Controller'lar
**Dosya:** `backend/controllers/subscriptionController.js:70-100`

Paralelleştirilebilecek iki sıralı Supabase sorgusu (plan arama + kullanıcı arama).

**Etki:** Checkout session oluşturmada küçük gecikme artışı.

---

#### BE-L-005: Çift Veritabanı Yapılandırması (Sequelize + pg Pool)

**Kategori:** Mimari
**Dosyalar:** `backend/config/database.js`, `backend/config/db.js`

Sequelize görünüşe göre sadece iyzico controller'ı tarafından kullanılıyor. Bir veritabanı için iki ORM bakımı yapılıyor.

**Etki:** Artan karmaşıklık, iki katına çıkan bağlantı overhead'i, gereksiz bağımlılık.

---

## 4. Platformlar Arası Ortak Desenler

### Desen 1: Context/State Value Memoizasyonu Eksik

| Platform | Bulgular |
|----------|----------|
| Web | WEB-H-011, WEB-M-004, WEB-M-005 (AudioPlayerContext, MembershipContext, AuthContext) |
| Mobil | MOB-C-003, MOB-C-004, MOB-H-001 (AudioContext, LanguageContext, AuthContext) |

**Temel Neden:** Context provider `value` prop'ları her render'da yeni nesne referansı oluşturuyor. Value içindeki fonksiyonlar `useCallback` ile sarılmamış. Bu, TÜM tüketicilerin gereksiz yere yeniden render olmasına neden oluyor.

---

### Desen 2: API Yanıt Önbelleği Mevcut Değil

| Platform | Bulgular |
|----------|----------|
| Mobil | MOB-M-008 (contentService sıfır cache), MOB-H-002, MOB-H-003 (odaklanmada refetch) |
| Backend | BE-M-001 (Redis cache kullanılmıyor), BE-M-004 (cache header yok) |
| Web | WEB-H-010 (SWR/React Query yok) |

**Temel Neden:** İstemci veya sunucu tarafında önbellek katmanı yok. Her etkileşim yeni API çağrıları tetikliyor.

---

### Desen 3: console.log Kirliliği

| Platform | Sayı | Bulgular |
|----------|------|----------|
| Web | 299 (41 dosya) | WEB-H-004 |
| Mobil | 481 (34 dosya) | MOB-L-001 |
| **Toplam** | **780 ifade** | |

**Temel Neden:** console ifadelerinin build zamanında kaldırılması yok. Debug loglama üretim kod yollarında bırakılmış.

---

### Desen 4: Dosya Boyut Limiti İhlalleri (>500 satır)

| Platform | Limiti Aşan Dosyalar |
|----------|----------------------|
| Web | SyncedTextPlayer (1533), OutputSection (891), InputSection (856), BookTab (1033), Admin Dashboard (2079) |
| Mobil | AudioPlayer (3402), CreateScreen (3208), LiroScreen (1572), VocabularyScreen (1323), ChatScreen (1201) |
| Backend | ttsController (2216), contentController (1750), adminController (1575), authController (1573), aiChatController (1367) |

**Temel Neden:** 500 satır kuralının otomatik uygulanması yok. Yeniden yapılandırma olmadan organik büyüme.

---

## 5. İyileştirme Önerileri

### Web Frontend

| ID | Düzeltme | Efor | Risk |
|----|----------|------|------|
| WEB-C-001 | CDN `<link>` FontAwesome'u kaldır, sadece npm import'u bırak | Düşük | Yok |
| WEB-C-002 | 60 FPS'ye düşür, binary search kullan (useWordSync'ten), `cancelAnimationFrame` ekle, `React.memo` ile sar | Orta | Düşük — kelime senkron doğruluğunu test et |
| WEB-C-003 | Veri çeken sayfaları Server Component'e dönüştür, etkileşimi Client Component çocuklarında tut | Yüksek | Orta — yeniden yapılandırma gerektirir |
| WEB-H-001 | `@next/bundle-analyzer` ekle, büyük kütüphaneler için `experimental.optimizePackageImports` ekle | Düşük | Yok |
| WEB-H-002 | `import * as echarts` yerine `import { BarChart, ... } from 'echarts/charts'` kullan | Düşük | Yok |
| WEB-H-003 | Import'ları denetle, `firebase`, `framer-motion` için barrel-file-free import kullan | Orta | Düşük |
| WEB-H-004 | Üretimde console kaldırmak için `babel-plugin-transform-remove-console` veya `next.config.js` compiler seçeneği ekle | Düşük | Yok |
| WEB-H-005 | Büyük bileşenleri uygun prop karşılaştırması ile `React.memo` ile sar | Orta | Düşük — ref eşitliğini sağla |
| WEB-H-006 | Admin dashboard'u alt bileşenlere böl, grafikler için dinamik import kullan | Orta | Yok |
| WEB-H-007 | `SyncedTextPlayer`, `BookTab`, oyunlar, grafikler için `next/dynamic` kullan | Orta | Düşük |
| WEB-H-008 | Route ve veri çeken bileşen düzeyinde `<Suspense>` boundary'leri ekle | Orta | Düşük |
| WEB-H-009 | `<img>`'yi `next/image` ile değiştir, ESLint kuralını yeniden etkinleştir | Düşük | Yok |
| WEB-H-010 | SWR veya React Query'yi stale-while-revalidate ile entegre et | Yüksek | Orta — tüm fetch çağrılarını refaktör et |
| WEB-H-011 | `currentTime`'ı ayrı context'e taşı veya `useRef` + subscription deseni kullan; value nesnesini `useMemo` ile sar | Orta | Düşük |
| WEB-H-012 | Event listener referanslarını sakla, cleanup'ta `removeEventListener` çağır; object URL'leri iptal et | Düşük | Yok |
| WEB-M-001 | `react-hooks/exhaustive-deps` ve `no-img-element` ESLint kurallarını yeniden etkinleştir | Düşük | Düşük — mevcut hataları ortaya çıkarabilir |
| WEB-M-002 | Google Fonts için `next/font`'a geç; Arapça fontu kullanıcı locale'ine göre lazy yükle | Düşük | Yok |
| WEB-M-003 | `isPlaying`'i `syncLoop` useCallback bağımlılık dizisine ekle | Düşük | Yok |
| WEB-M-004 | MembershipContext value'yu `useMemo` ile, fonksiyonları `useCallback` ile sar | Düşük | Yok |
| WEB-M-005 | AuthContext fonksiyonlarını `useCallback` ile, value'yu `useMemo` ile sar | Düşük | Yok |
| WEB-M-006 | Kritik olmayan sayfalarda framer-motion bileşenleri için `next/dynamic` kullan | Orta | Düşük |
| WEB-M-007 | Sabit kodlanmış localhost'u env değişkeni veya Next.js API rewrite ile değiştir | Düşük | Yok |
| WEB-M-008 | `document.visibilityState` kontrolü ekle, sekme gizliyken polling'i durdur | Düşük | Yok |
| WEB-M-009 | RTL'yi Tailwind RTL plugin veya CSS logical properties'e taşı; `!important` azalt | Yüksek | Orta |
| WEB-M-010 | Tek ikon kütüphanesinde standardize ol (tercihen tree-shaking için `lucide-react`) | Orta | Düşük |
| WEB-M-011 | OpenTelemetry'yi feature flag arkasına al veya sadece staging/dev'de yükle | Düşük | Yok |
| WEB-L-001 | Firebase analytics için dinamik `import()` kullan | Düşük | Yok |
| WEB-L-002 | Tailwind content yapılandırmasından ölü yolları kaldır | Düşük | Yok |

### Mobil Uygulama

| ID | Düzeltme | Efor | Risk |
|----|----------|------|------|
| MOB-C-001 | `React.lazy` + `Suspense` veya React Navigation'ın lazy ekran yüklemesini kullan | Orta | Düşük — navigasyon geçişlerini test et |
| MOB-C-002 | AudioPlayer'ı AudioControls, AudioWaveform, AudioLyrics vb.'ye böl. CreateScreen'i adım bileşenlerine böl | Yüksek | Orta — state akışını koru |
| MOB-C-003 | `isTrackPlaying`'i `useCallback` ile, `stopAllAudio`'yu `useCallback` ile, value'yu `useMemo` ile sar | Düşük | Yok |
| MOB-C-004 | `t`'yi `useCallback` ile sar (deps: `[language]`), `setLanguage`'ı `useCallback` ile, value'yu `useMemo` ile sar | Düşük | Yok |
| MOB-C-005 | Tüm ekran export'larını `React.memo` ile sar | Düşük | Yok |
| MOB-H-001 | AuthContext fonksiyonlarını `useCallback` ile, value'yu `useMemo` ile sar | Düşük | Yok |
| MOB-H-002 | API çağrılarından önce TTL tabanlı cache kontrolü ekle; veri tazeyse (<60sn) refetch'i atla | Orta | Düşük |
| MOB-H-003 | MOB-H-002 ile aynı — `subscriptionService.ts` caching desenini yeniden kullan | Orta | Düşük |
| MOB-H-004 | Inline arrow'ları `useCallback` ile sarılmış handler'lara çıkar | Orta | Yok |
| MOB-H-005 | Hesaplanmış değerler için `useMemo` (`filteredTracks`, `filteredWords`, `allFeatures`), handler'lar için `useCallback` ekle | Orta | Yok |
| MOB-H-006 | Listener referanslarını sakla, cleanup fonksiyonu ekle, bileşen ID'sine göre Map ile tek callback deposu kullan | Orta | Düşük |
| MOB-M-001 | FlatList'i ScrollView + map ile değiştir (sanallaştırma zaten etkisiz olduğundan) veya FlatList'te scrolling'i etkinleştirmek için yeniden yapılandır; `Math.random()` fallback'ini kaldır | Orta | Düşük |
| MOB-M-002 | Uniform satır yüksekliği olan FlatList'lere `getItemLayout` ekle | Düşük | Yok |
| MOB-M-003 | `headerBackground` ve `headerLeft`'i render dışında tanımlanmış sabit bileşen referanslarına çıkar | Düşük | Yok |
| MOB-M-004 | `transform: [{ translateY }]` ile `useNativeDriver: true` kullan | Düşük | Yok |
| MOB-M-005 | `useWindowDimensions()` hook'u ile değiştir | Düşük | Yok |
| MOB-M-006 | TourProvider'ı sadece tur tamamlanmamışsa koşullu render et (AsyncStorage flag kontrolü) | Düşük | Yok |
| MOB-M-007 | ~~Polling'i arka planda durdur~~ — **Karar: Mevcut davranış korunacak, aksiyon yok** | — | — |
| MOB-M-008 | TTL ile bellek + AsyncStorage cache uygula (`subscriptionService.ts` desenini takip et) | Orta | Yok |
| MOB-M-009 | axios'u kaldır, `fetch`'te standardize ol (React Native 0.79'da native) | Orta | Düşük — interceptor mantığını güncelle |
| MOB-M-010 | ~~Skia değiştirme~~ — **Karar: Skia korunacak, aksiyon yok** | — | — |
| MOB-L-001 | babel.config.js'e `babel-plugin-transform-remove-console` ekle | Düşük | Yok |
| MOB-L-002 | package.json'dan `lodash` kaldır | Düşük | Yok |
| MOB-L-003 | `TrackPlayer.setupPlayer()`'ı uygulama başlatması yerine ilk ses etkileşimine ertele | Düşük | Düşük |
| MOB-L-004 | Listener referanslarını sakla ve cleanup'ta `remove()` çağır. Duplike kayda karşı guard koy | Düşük | Yok |

### Backend

| ID | Düzeltme | Efor | Risk |
|----|----------|------|------|
| BE-C-001 | `npm install compression` ve server.js'e `app.use(compression())` ekle | Düşük | Yok |
| BE-C-002 | Kullanıcı arama sonucunu Redis'te 60sn TTL ile cache'le; DB sorgusundan önce cache kontrol et | Orta | Düşük |
| BE-C-003 | Sorguya `.limit()` ve `.range()` ekle; `*` yerine sadece gerekli sütunları seç | Düşük | Yok |
| BE-C-004 | contenthistory'ye `duration_seconds` sütunu ekle; migration ile doldur; SQL SUM kullan | Orta | Düşük — migration gerektirir |
| BE-C-005 | Sıralı döngüleri `Promise.all()` veya toplu insert ile değiştir | Düşük | Yok |
| BE-H-001 | Map boyut limitleri ekle, temizleme aralığını 15 dk'ya düşür, başarısızlık yollarında temizleme ekle | Orta | Düşük |
| BE-H-002 | Controller'ları service katmanı + ince controller desenine böl | Yüksek | Orta |
| BE-H-003 | 4 sorguyu `Promise.all()` ile sar; kelime getirmeyi `COUNT(*)` ile değiştir | Düşük | Yok |
| BE-H-004 | Tüm controller'larda `.select('*')`'ı belirli sütun seçimleriyle değiştir | Orta | Yok |
| BE-H-005 | `security.js`'te tanımlı rate limiter'ları ilgili route'lara import et ve uygula | Düşük | Yok |
| BE-M-001 | Sık erişilen veriler için uygun TTL ile Redis caching uygula (planlar, CEFR param., kullanıcı istatistikleri) | Orta | Düşük |
| BE-M-002 | Sadece iyzico tarafından kullanılıyorsa Sequelize'ı kaldır; `pg` Pool veya Supabase client'ta standardize ol | Orta | Orta — iyzico akışlarını test et |
| BE-M-003 | Tüm kelimeler için tek toplu OpenAI prompt'una yeniden yapılandır; yapay gecikmeyi kaldır | Orta | Düşük |
| BE-M-004 | Statik-benzeri endpoint'lere `Cache-Control` header'ları ekle (planlar, tanımlar, ayarlar) | Düşük | Yok |
| BE-M-005 | `ORDER BY RANDOM()`'u önceden hesaplanmış rastgele ID'ler veya `TABLESAMPLE` ile değiştir | Düşük | Yok |
| BE-M-006 | İçerik işleme route'larına `authenticate` middleware'i ve uygun rate limiter ekle | Düşük | Yok — güvenlik iyileştirmesi |
| BE-M-007 | 3 bağımsız sorguyu `Promise.all()` ile sar; belirli sütunları seç | Düşük | Yok |
| BE-L-001 | `mongoose`, `twilio`, `express-mongo-sanitize`, `got`'u package.json'dan kaldır | Düşük | Yok |
| BE-L-002 | `cluster` modülü eklemeyi veya TTS'i worker thread'lere taşımayı değerlendir | Yüksek | Orta |
| BE-L-003 | TTS loglamayı `debug` seviyesine düşür; `info`'yu sadece anahtar kilometre taşlarında tut | Düşük | Yok |
| BE-L-004 | Plan + kullanıcı sorgularını `Promise.all()` ile sar | Düşük | Yok |
| BE-L-005 | Tek `pg` client lehine Sequelize kaldırmasını değerlendir | Orta | Orta |

---

## 6. Öncelik Matrisi (Etki vs Efor)

### Kadran 1: Yüksek Etki / Düşük Efor — HEMEN YAP

| ID | Bulgu | Efor |
|----|-------|------|
| WEB-C-001 | Duplike FontAwesome CDN linkini kaldır | Düşük |
| WEB-H-004 | Üretim build'lerinden console.log kaldır | Düşük |
| WEB-H-009 | `<img>`'yi `next/image` ile değiştir | Düşük |
| WEB-H-012 | Audio element bellek sızıntısını düzelt (removeEventListener ekle) | Düşük |
| WEB-M-002 | Google Fonts için `next/font`'a geç | Düşük |
| WEB-M-004 | MembershipContext value'yu `useMemo` ile sar | Düşük |
| WEB-M-005 | AuthContext fonksiyonlarını `useCallback` ile sar | Düşük |
| MOB-C-003 | AudioContext value + fonksiyonları memoize et | Düşük |
| MOB-C-004 | LanguageContext value + `t` fonksiyonunu memoize et | Düşük |
| MOB-C-005 | Tüm ekranları `React.memo` ile sar | Düşük |
| MOB-H-001 | AuthContext value + fonksiyonları memoize et | Düşük |
| MOB-M-002 | FlatList'lere `getItemLayout` ekle | Düşük |
| MOB-M-005 | `Dimensions.get`'i `useWindowDimensions` ile değiştir | Düşük |
| ~~MOB-M-007~~ | ~~Arka planda bildirim polling'ini durdur~~ — Karar: Korunacak | — |
| MOB-L-001 | babel-plugin-transform-remove-console ekle | Düşük |
| MOB-L-002 | Kullanılmayan lodash bağımlılığını kaldır | Düşük |
| BE-C-001 | Compression middleware ekle | Düşük |
| BE-C-003 | getContentHistory'ye pagination ekle | Düşük |
| BE-C-005 | Sıralı döngüleri Promise.all() ile değiştir | Düşük |
| BE-H-003 | getUserStats sorgularını paralelleştir + COUNT kullan | Düşük |
| BE-H-005 | Tanımlı rate limiter'ları route'lara uygula | Düşük |
| BE-M-006 | İçerik işleme route'larına auth middleware ekle | Düşük |
| BE-L-001 | Kullanılmayan bağımlılıkları kaldır | Düşük |

### Kadran 2: Yüksek Etki / Yüksek Efor — ŞİMDİ PLANLA

| ID | Bulgu | Efor |
|----|-------|------|
| WEB-C-002 | SyncedTextPlayer refaktörü (60fps, binary search, memo) | Orta |
| WEB-C-003 | Sayfaları Server Component'e dönüştür | Yüksek |
| WEB-H-010 | Veri getirme için SWR/React Query entegre et | Yüksek |
| WEB-H-011 | AudioPlayerContext'i böl (currentTime ayrımı) | Orta |
| MOB-C-001 | 19 ekranın tamamı için lazy loading uygula | Orta |
| MOB-C-002 | AudioPlayer (3402 satır) ve CreateScreen'i (3208 satır) böl | Yüksek |
| MOB-H-002/003 | İçerik servisine TTL tabanlı cache ekle | Orta |
| MOB-M-008 | contentService için çok katmanlı cache uygula | Orta |
| BE-C-002 | Auth kullanıcı aramasını Redis'te cache'le | Orta |
| BE-C-004 | duration_seconds sütunu + migration ekle | Orta |
| BE-H-002 | Büyük controller'ları service katmanına böl | Yüksek |
| BE-H-004 | SELECT *'ı proje genelinde belirli sütunlarla değiştir | Orta |
| BE-M-001 | Redis response caching katmanı uygula | Orta |

### Kadran 3: Düşük Etki / Düşük Efor — FIRSATTA YAP

| ID | Bulgu | Efor |
|----|-------|------|
| WEB-H-001 | Bundle analyzer + optimizePackageImports ekle | Düşük |
| WEB-H-002 | echarts/core kullan, wildcard import yerine | Düşük |
| WEB-M-003 | useWordSync stale closure'ı düzelt | Düşük |
| WEB-M-007 | Sabit kodlanmış localhost URL'i değiştir | Düşük |
| WEB-M-008 | Polling'e görünürlük kontrolü ekle | Düşük |
| WEB-M-011 | OpenTelemetry'ye feature flag koy | Düşük |
| WEB-L-001 | Firebase analytics için dinamik import | Düşük |
| WEB-L-002 | Ölü Tailwind yollarını kaldır | Düşük |
| MOB-M-003 | Navigator inline fonksiyonlarını çıkar | Düşük |
| MOB-M-004 | KeyboardToggleOverlay'de useNativeDriver kullan | Düşük |
| MOB-M-006 | TourProvider'ı koşullu render et | Düşük |
| MOB-L-003 | TrackPlayer kurulumunu ilk kullanıma ertele | Düşük |
| MOB-L-004 | Bildirim listener'larını temizle | Düşük |
| BE-M-004 | Cache-Control header'ları ekle | Düşük |
| BE-M-005 | ORDER BY RANDOM()'u değiştir | Düşük |
| BE-M-007 | Library controller sorgularını paralelleştir | Düşük |
| BE-L-003 | TTS loglama ayrıntısını azalt | Düşük |
| BE-L-004 | Subscription controller sorgularını paralelleştir | Düşük |

### Kadran 4: Düşük Etki / Yüksek Efor — ERTELE

| ID | Bulgu | Efor |
|----|-------|------|
| WEB-M-009 | globals.css RTL'yi logical properties'e taşı | Yüksek |
| WEB-M-010 | Tek ikon kütüphanesinde standardize ol | Orta |
| MOB-M-009 | axios'u kaldır, fetch'te standardize ol | Orta |
| ~~MOB-M-010~~ | ~~Skia değiştirme~~ — Karar: Korunacak | — |
| BE-M-002 | Sequelize'ı kaldır, pg'de standardize ol | Orta |
| BE-M-003 | OpenAI kelime zenginleştirmeyi toplu yap | Orta |
| BE-L-002 | Cluster mode / worker thread ekle | Yüksek |
| BE-L-005 | Sequelize kaldırmasını değerlendir | Orta |

---

## 7. Aşamalı Yol Haritası

### Faz 1: Hızlı Kazanımlar

**Odak:** Minimum risk ve efor ile maksimum etki.

- [x] Backend'e `compression` middleware ekle (BE-C-001)
- [x] Duplike FontAwesome CDN linkini kaldır (WEB-C-001)
- [x] TÜM context value'ları `useMemo` ile, fonksiyonları `useCallback` ile memoize et (WEB-M-004, WEB-M-005, MOB-C-003, MOB-C-004, MOB-H-001)
- [x] Tüm mobil ekranları `React.memo` ile sar (MOB-C-005)
- [x] Hem web hem mobil build'lere `babel-plugin-transform-remove-console` ekle (WEB-H-004, MOB-L-001)
- [x] Google Fonts için `next/font`'a geç (WEB-M-002)
- [x] `getContentHistory`'ye pagination ekle (BE-C-003)
- [x] Quiz gönderimindeki sıralı döngüleri `Promise.all()` ile değiştir (BE-C-005)
- [x] `getUserStats` sorgularını paralelleştir + `COUNT(*)` kullan (BE-H-003)
- [x] Mevcut rate limiter'ları korumasız route'lara uygula (BE-H-005)
- [x] İçerik işleme route'larına auth middleware ekle (BE-M-006)
- [x] Hem web hem mobilden kullanılmayan bağımlılıkları kaldır (MOB-L-002, BE-L-001)
- [x] Audio element bellek sızıntısını düzelt (WEB-H-012)
- [x] Sekme arka plandayken web polling'ini durdur (WEB-M-008)

### Faz 2: Temel Optimizasyon

**Odak:** Lazy loading, caching ve context bölme.

- [x] Mobil navigator'da lazy ekran yüklemesi uygula (MOB-C-001)
- [x] Ağır web bileşenleri için `next/dynamic` ekle (WEB-H-007) (kısmi — admin bileşenleri dynamic, SyncedTextPlayer hâlâ eager)
- [x] Mobilde içerik servisi caching katmanı uygula (subscriptionService desenini takip et) (MOB-M-008)
- [x] Auth kullanıcı aramasını Redis'te cache'le (BE-C-002)
- [x] AudioPlayerContext'i böl — `currentTime`'ı value'dan ayır (WEB-H-011)
- [x] SyncedTextPlayer refaktörü: 60fps, binary search, cancelAnimationFrame, React.memo (WEB-C-002)
- [x] Proje genelinde `<img>`'yi `next/image` ile değiştir (WEB-H-009)
- [x] Route düzeyinde Suspense boundary'leri ekle (WEB-H-008)
- [ ] Backend controller'larda `SELECT *`'ı belirli sütunlarla değiştir (BE-H-004) — ERTELENDİ: Orta efor, birçok controller'da değişiklik gerekir
- [x] Mobil FlatList'lere `getItemLayout` ekle (MOB-M-002)
- [x] `Dimensions.get`'i `useWindowDimensions` ile değiştir (MOB-M-005)
- [x] Backend statik endpoint'lere `Cache-Control` header'ları ekle (BE-M-004)

### Faz 3: Mimari İyileştirmeler

**Odak:** Uzun vadeli performans için yapısal iyileştirmeler.

- [x] Büyük mobil bileşenleri böl (AudioPlayer, CreateScreen) (MOB-C-002) (kısmi — alt bileşenler çıkarıldı, ana dosyalar hâlâ büyük)
- [x] Büyük backend controller'ları service katmanına böl (BE-H-002)
- [x] Web veri getirme için SWR veya React Query entegre et (WEB-H-010)
- [ ] Temel web sayfalarını Server Component'e dönüştür (WEB-C-003) — ERTELENDİ: Yüksek efor, 40 sayfa refaktörü gerektirir
- [x] Sık erişilen veriler için Redis response caching uygula (BE-M-001)
- [x] contenthistory'ye `duration_seconds` sütunu + migration ekle (BE-C-004)
- [x] Tek ikon kütüphanesinde standardize ol (WEB-M-010)
- [ ] globals.css RTL'yi logical properties'e taşı (WEB-M-009) — ERTELENDİ: Yüksek efor, 873 satır CSS + 183 RTL override refaktörü
- [x] OpenAI kelime zenginleştirme çağrılarını toplu hale getir (BE-M-003)

### Faz 4: Son Dokunuşlar

**Odak:** Düşük öncelikli iyileştirmeler ve izleme.

- [x] `@next/bundle-analyzer` ve `optimizePackageImports` ekle (WEB-H-001)
- [x] TourProvider'ı sadece gerektiğinde koşullu render et (MOB-M-006)
- [x] OpenTelemetry yüklemesine feature flag koy (WEB-M-011)
- [x] KeyboardToggleOverlay'de `useNativeDriver: true` kullan (MOB-M-004)
- [x] TrackPlayer kurulumunu ilk ses etkileşimine ertele (MOB-L-003)
- [x] Uygulanabilirse Sequelize'ı kaldır (BE-L-005)
- [x] ~~Highlight'lar için Skia değiştirmeyi değerlendir (MOB-M-010) — Karar: Skia korunacak~~
- [x] TTS için cluster mode / worker thread ekle (BE-L-002)
- [x] Bildirim servisi listener'larını temizle (MOB-L-004)
- [x] TTS loglama ayrıntısını azalt (BE-L-003)

---

## 8. Uygulama Durumu Özeti

> **Güncelleme:** 2026-02-04

| Faz | Toplam | Tamamlandı | Kısmi | Ertelendi |
|-----|--------|------------|-------|-----------|
| Faz 1 | 14 | 14 | 0 | 0 |
| Faz 2 | 12 | 10 | 1 | 1 |
| Faz 3 | 9 | 6 | 1 | 2 |
| Faz 4 | 13 | 13 | 0 | 0 |
| **Toplam** | **48** | **43** | **2** | **3** |

**Genel Sağlık Skoru:** 22/100 → **53/100** (+31 puan) — Çözülen: 48/75 (%64), Kısmi: 3/75 (%4), Karar: 2/75 (%3), Açık: 22/75 (%29)

### Ertelenen Maddeler

| Madde | Faz | Sebep |
|-------|-----|-------|
| BE-H-004: SELECT * → belirli sütun seçimi | Faz 2 | Orta efor, birçok controller'da tek tek değişiklik gerekir |
| WEB-C-003: Server Components dönüşümü | Faz 3 | Yüksek efor, 40 sayfa mimarisinin yeniden yapılandırılması |
| WEB-M-009: CSS logical properties (RTL) | Faz 3 | Yüksek efor, 873 satırlık CSS dosyasında 76+ yönlü özellik refaktörü |

### Kısmi Tamamlanan Maddeler

| Madde | Faz | Durum |
|-------|-----|-------|
| WEB-H-007: next/dynamic | Faz 2 | Admin bileşenleri dynamic, SyncedTextPlayer hâlâ eager import |
| MOB-C-002: Büyük bileşen bölme | Faz 3 | Alt bileşenler çıkarıldı (audio/*, create/*) ama ana dosyalar hâlâ büyük (AudioPlayer 2251, CreateScreen 1779 satır) |

---

*Bu rapor orijinal olarak analiz dokümanı olarak hazırlanmıştır. 48/75 bulgu çözülmüş, 3 kısmi çözülmüş, 2 bilinçli karar verilmiş ve 22 bulgu hâlâ açıktır. Kalan açık bulgular doğrulanmalı ve düzeltmeler deploy edilmeden önce test edilmelidir.*
