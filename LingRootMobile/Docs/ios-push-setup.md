# LingRootMobile iOS Push (FCM + APNs) Kurulum Dokümanı

Bu doküman, **LingRootMobile** iOS uygulamasında Firebase Cloud Messaging (FCM) ve APNs üzerinden push bildirimleri (özellikle async TTS `audio_created`) çalıştırmak için gerekli adımları özetler.

## 1. Firebase Projesi ve iOS App Eşleşmesi

1. Firebase Console’a gir:
   - https://console.firebase.google.com

2. Kullanılan proje:
   - **Aynı proje** Android `google-services.json` ve backend `firebase-fcm.json` (service account) ile **aynı olmalı**.
   - Proje ID’si üç yerde de eşleşmeli:
     - Android `android/app/google-services.json` → `project_info.project_id`
     - Backend service account JSON → `project_id`
     - iOS `GoogleService-Info.plist` içindeki `PROJECT_ID` alanı

3. Firebase’de iOS uygulamasını kontrol et / oluştur:
   - Firebase projesinde **iOS app** olarak ekli olmalı.
   - `Bundle ID` = Xcode projesindeki iOS bundle id ile **bire bir aynı** olmalı. Örn:
     - Xcode: `Targets → LingRootMobile → General → Bundle Identifier`
     - Firebase iOS app: aynı string.

## 2. GoogleService-Info.plist Dosyasını Hazırlama

1. Firebase Console → Proje → iOS app → **`GoogleService-Info.plist` indir**.

2. Dosyayı projeye koy:
   - Yol: `ios/LingRootMobile/GoogleService-Info.plist`
   - Dosyanın adı **aynen** böyle olmalı.

3. Xcode projesine ekli olduğundan emin ol:
   - Xcode’da `LingRootMobile.xcworkspace` aç.
   - Sol tarafta `LingRootMobile` target altında `GoogleService-Info.plist` görünüyor olmalı.
   - Eğer görünmüyorsa:
     - Xcode → `File → Add Files to "LingRootMobile"...`
     - `ios/LingRootMobile/GoogleService-Info.plist` dosyasını seç.
     - `Copy items if needed` seçili olabilir (projeye kopyalamak isteğine bağlı).

> Not: `GoogleService-Info.plist` genelde **repo’da tutulur** (gitignore’a eklemek zorunlu değildir). Public repo değilse commit etmek pratik olur.

## 3. APNs (Apple Push Notification Service) Ayarları

Firebase FCM’nin iOS’ta çalışması için APNs anahtarı veya sertifikası yüklenmelidir.

1. Apple Developer hesabına gir:
   - https://developer.apple.com/account

2. APNs Authentication Key oluştur (önerilen):
   - `Certificates, Identifiers & Profiles` → `Keys` → `+`.
   - Bir isim ver (örn. `LingRoot APNs Key`).
   - `Apple Push Notifications service (APNs)` işaretle.
   - **.p8** anahtarını indir.
   - Key ID’yi ve Team ID’yi not al.

3. Firebase Console’a dön:
   - Proje Ayarları → `Cloud Messaging` sekmesi.
   - `Apple app configuration` bölümünde:
     - APNs Authentication Key yükle (`.p8` dosyası).
     - Key ID ve Team ID değerlerini gir.

4. İlgili iOS app, bu APNs key ile eşleştirilecek.

## 4. Xcode Capabilities Ayarları

`LingRootMobile` iOS target’ı için:

1. Xcode aç → `LingRootMobile` target’ını seç.
2. `Signing & Capabilities` sekmesine geç.
3. Aşağıdaki satırları ekle / kontrol et:
   - **Push Notifications** capability **eklenmiş** olmalı.
   - **Background Modes** ekle ve içinden:
     - `Remote notifications` tikli olmalı.

Bunlar olmadan app push event’lerini arka planda düzgün alamaz.

## 5. Pod Kurulumu (Firebase + Messaging)

`ios` klasöründe gerekli Pod’ların yüklü olduğundan emin ol.

1. `Podfile` içinde Firebase Messaging ile ilgili satırların olduğundan emin ol (örnek):

```ruby
pod 'Firebase/Core'
pod 'Firebase/Messaging'
```

> Not: Proje halihazırda react-native-firebase kullanıyorsa, ilgili pod’lar otomatik de eklenmiş olabilir.

2. Pod kur:

```bash
cd ios
pod install
```

3. Projeyi şu dosya ile aç:

```text
LingRootMobile/ios/LingRootMobile.xcworkspace
```

> `.xcodeproj` DEĞİL, `.xcworkspace` kullanılmalı.

## 6. React Native Tarafı: FCM Token ve Notification Akışı

Bu repo özelinde önemli noktalar:

### 6.1. FCM Token Alma ve Backend’e Gönderme

- Token alma ve backend’e kaydetme Android + iOS için ortaktır:
  - `src/services/pushTokenService.ts`
  - `src/contexts/AuthContext.tsx` içinde login / bootstrap sonrasında `registerPushTokenForUser` çağrılır.

Bu sayede iOS cihazın FCM token’ı:

- Backend `/api/device-tokens` endpoint’ine **platform: 'ios'** ile kaydedilir.
- Supabase `device_tokens` tablosunda saklanır.

Kurulum tarafında özel bir ek işlem gerekmiyor; önemli olan:
- Firebase iOS config doğru,
- Pod’lar yüklü,
- App push izni alıyor.

### 6.2. iOS Notification Handling

- iOS için kod `src/services/notificationService.ios.ts` içinde.
- Önemli kısımlar:
  - `PushNotification.configure` ile gelen bildirimler `onNotification` içinde yakalanıyor.
  - `userInfo.type === 'audio_created'` ise:
    - `audioData` parse ediliyor.
    - `NotificationService` içindeki `responseCallback` çağrılıyor.
- `AppNavigator.tsx` içinde:
  - `NotificationService.setupNotificationResponseHandler(...)` ile callback tanımlanıyor.
  - Bu callback, `parsed.type === 'audio_created'` olduğunda:
    - `Library` ekranına `params: { notificationAudio: audioData }` ile navigate ediyor.

Ayrıca, platformdan bağımsız olarak:

- `MainTabs` içindeki polling (Android + iOS ortak):
  - `/api/tts/notifications/unread` ile unread `audio_created` notification’ları alır.
  - Varsa, global navigation ref ile `Library` ekranına `notificationAudio` paramıyla reset eder.
  - Sonra bu notification’ı **read** işaretler.

### 6.3. Library + AudioPlayer Entegrasyonu (Platform Bağımsız)

- `src/screens/LibraryScreen.tsx`:
  - `useEffect` içinde `route.params.notificationAudio` dinlenir.
  - Gelen `audioData`:
    - Eğer sadece **özet** ise (FCM payload’ı küçük):
      - `audioId` üzerinden `apiService.getUserContentById(audioId)` ile backend’ten tam içerik çekilir.
      - `words`, `timepoints`, `original_turkish` hydrate edilir.
    - Sonra `AudioTrack` oluşturulur ve `AudioPlayer` açılır.

Bu mantık Android/iOS için aynıdır; ekstra iOS spesifik kod gerektirmez.

## 7. iOS’ta Push Bildirim Test Adımları

1. **Backend ve Firebase kontrolü**
   - Backend logunda FCM için şu satırlar görünmeli:
     - `[FirebaseAdmin] Initialized from FIREBASE_SERVICE_ACCOUNT_FILE ...`
     - `[PushNotification] FCM send result: {"successCount":1, "failureCount":0}`

2. **İlk çalıştırma:**
   - `pod install` sonrası iOS app’i Xcode’dan veya `npx react-native run-ios` ile çalıştır.
   - App içindeyken push izni sorulursa **izin ver**.

3. **Async TTS başlat:**
   - Uygulama içinden async TTS (`process-async`) başlat.

4. **App’i arka plana al:**
   - Home tuşu / swipe ile uygulamayı arka plana al.

5. **Push kontrolü:**
   - iOS cihazda push bildirimi geliyor mu?
   - Bildirime tıkla:
     - Beklenen davranış:
       - App açılır.
       - Kısa süre sonra `Library` ekranı + `AudioPlayer` modalı yeni sesle açılır.

6. **Eğer push gelmiyorsa:**
   - `GoogleService-Info.plist` doğru projeden mi?
   - APNs key Firebase’e yüklü mü?
   - Xcode’da `Push Notifications` ve `Background Modes → Remote notifications` açık mı?
   - Gerçek cihazda test ediyor musun? (Simulator için APNs/FCM push gelmez.)

## 8. Özet

- iOS tarafında ek JS değişikliği gerekmiyor; Android için yaptığımız FCM payload küçültme ve Library hydration mantığı iOS için de aynen geçerli.
- Asıl kritik olan:
  - Firebase projesinin tüm uçlarda (Android, iOS, backend) **aynı** olması,
  - `GoogleService-Info.plist`’in doğru konumda ve Xcode projesine ekli olması,
  - APNs key’in Firebase’e doğru yüklenmesi,
  - iOS capabilities’in (Push Notifications, Remote notifications) açık olması.

Bu adımları takip ederek iOS’ta da async TTS `audio_created` bildirimlerinin düzgün şekilde çalışmasını sağlayabilirsin.
