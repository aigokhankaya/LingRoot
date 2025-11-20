# LingRootMobile – Push Bildirimleri ve Mağaza Policy Dokümanı

Bu doküman, **LingRootMobile** uygulamasında Firebase Cloud Messaging (FCM) ve cihaz bildirim tokenlarının kullanımı nedeniyle **Google Play** ve **Apple App Store** tarafında dikkat edilmesi gereken gizlilik / policy ayarlarını özetler.

## 1. Hangi verileri topluyoruz?

Push bildirim geliştirmesi kapsamında backend tarafında şunları saklıyoruz:

- **Cihaz bildirimi tokenı** (FCM token)
- **Platform**: `android` / `ios`
- **Cihaz ID** (opsiyonel, varsa)
- **Uygulama sürümü** (`appVersion`)

Bu veriler, Supabase üzerindeki `device_tokens` tablosunda tutuluyor ve **tek amacı**:

- Kullanıcının kendi hesabına ait olaylar için (örn. async TTS `audio_created`) **bildirim göndermek**.

Reklam, üçüncü taraf takip (tracking) veya kullanıcı profilleme amacıyla kullanılmıyor.

---

## 2. Google Play – Data Safety Formu

Google Play Console’da **Data Safety** (Veri Güvenliği) formunu doldururken aşağıdaki noktalar önemli:

### 2.1. Toplanan veri kategorileri

Aşağıdaki kategoriyi topladığını belirtmen gerekir:

- **Device or other IDs** (Cihaz veya diğer kimlikler)
  - Gerekçesi: FCM device token bu kategoriye girer.

Diğer kategoriler (örn. Konum, Kişisel bilgiler vb.) zaten uygulamanda varsa ayrıca işaretlenmiştir; push değişikliği sadece "device IDs" kısmını etkiler.

### 2.2. Kullanım amacı

`Device or other IDs` için kullanım amacı:

- **App functionality** (Uygulama işlevselliği)
  - Async TTS sonucu geldiğinde, kullanıcıya ait sesin hazır olduğunu bildirmek için kullanılıyor.

Aşağıdakileri **işaretlememen** gerekir (şu anda yaptığımız mimariye göre):

- Advertising or marketing
- Analytics (sırf push token için)
- Developer communications (genel kampanya mailleri vb.)
- Personalization
- Account management (sadece push için değilse)

### 2.3. Veri paylaşımı

- Normal senaryoda, **FCM token’ı üçüncü taraflarla paylaşmıyoruz**.
- Firebase burada teknik bir altyapı sağlayıcısı konumunda; Data Safety formunda genelde:
  - "Is this data shared with third parties?" → **Hayır** (sadece backend ↔ Firebase messaging, başka bir şirketle paylaşmıyoruz).

Projenin geri kalanında ek SDK’lar kullanıyorsan (Analytics, Crashlytics, reklam SDK’ları vb.), onların gerektirdiği işaretlemeler ayrıca geçerlidir.

### 2.4. Privacy Policy metni

Play Store’daki **Privacy Policy URL**’sinde aşağıdakine benzer bir bölüm olması tavsiye edilir:

```text
Push Bildirimleri ve Cihaz Tokenları

Uygulamamız, size hesabınıza özel bildirimler gönderebilmek için cihazınıza ait bir bildirim tanımlayıcısı (örneğin Firebase Cloud Messaging tokenı) toplar ve saklar. Bu tanımlayıcı, yalnızca aşağıdaki amaçlarla kullanılır:

- Oluşturduğunuz ses dosyaları hazır olduğunda sizi bilgilendirmek
- Hesabınıza ve kullanımınıza ait önemli uygulama içi bildirimleri iletmek

Bu token, reklam amaçlı profilleme veya üçüncü taraf izleme (tracking) için kullanılmaz ve üçüncü şahıslarla paylaşılmaz. Bildirimleri almak istemezseniz, cihazınızın ayarlarından uygulama bildirimlerini devre dışı bırakabilirsiniz.
```

Bu metni kendi hukuk/gizlilik metnine göre uyarlayabilirsin.

---

## 3. Apple App Store – App Privacy (App Store Connect)

App Store Connect’teki **App Privacy** bölümünde push ile ilgili özellikle şu kısımlara dikkat etmelisin.

### 3.1. Toplanan veri tipi

Push token, Apple’ın kategorilerinde genelde **"Identifiers"** (Tanımlayıcılar) başlığı altına girer.

- Data Type: **Identifiers** → örn. `Device ID` / `User ID`
- Source: `Collected from the app` (kullanıcıdan app aracılığıyla).

### 3.2. Kullanım amacı

Bu tanımlayıcılar için amaçlar:

- **App Functionality** → Evet
  - Async TTS çıktısı hazır olduğunda kullanıcıyı bilgilendirmek.

Aşağıdakiler, sadece push token için genelde **hayır**:

- Third-party Advertising
- Developer’s Advertising or Marketing
- Analytics (sırf token için)
- Product Personalization
- Other Purposes (eğer ek bir amaç yoksa)

### 3.3. Tracking / ATT (App Tracking Transparency)

- Mevcut mimarimizde, FCM token’ı **cross-app tracking** için kullanılmıyor.
- Kullanıcı farklı uygulamalarda takip edilmiyor, reklam profili üretilmiyor.
- Bu yüzden:
  - **ATT izin popup’ına gerek yok**.
  - App Privacy’de "Tracking" bölümünü push token için işaretlemen gerekmiyor.

Yine de başka SDK’ların (reklam, analitik vb.) gerektirdiği ATT kullanımları varsa, onlar için ayrı değerlendirme yapmalısın.

### 3.4. Gizlilik politikasında örnek metin

App Store için de kullanılabilecek benzer bir paragraf:

```text
Push Bildirimleri

Uygulamamız, size bildirim gönderebilmek için Apple Push Notification service (APNs) ve Firebase Cloud Messaging gibi servisler aracılığıyla cihazınıza ait bir bildirim tanımlayıcısı saklar. Bu tanımlayıcı yalnızca uygulamanın temel işlevselliğini sağlamak (örneğin, oluşturduğunuz ses içerikleri hazır olduğunda haber vermek) amacıyla kullanılır.

Bu tanımlayıcı reklam amaçlı kullanılmaz, üçüncü taraflarla paylaşılmaz ve farklı uygulamalar arasında sizi takip etmek için kullanılmaz. Bildirimleri almak istemediğinizde, cihazınızın ayarlarından uygulamanın bildirim izinlerini kapatabilirsiniz.
```

---

## 4. Politika Güncelleme Checklist’i

Her yeni sürüm öncesi kontrol edebileceğin kısa bir liste:

1. **Firebase / FCM**
   - Android `google-services.json`, iOS `GoogleService-Info.plist` ve backend `firebase-fcm.json` aynı Firebase projesini işaret ediyor mu?
2. **Google Play Console – Data Safety**
   - `Device or other IDs` → "Collected" olarak işaretli mi?
   - Kullanım amacı → "App functionality" olarak eklendi mi?
   - Reklam / tracking için işaretlenmedi mi?
3. **App Store Connect – App Privacy**
   - `Identifiers / Device ID` (veya benzeri) toplandığı belirtilmiş mi?
   - Kullanım amacı → "App Functionality" olarak işaretli mi?
   - Tracking (ATT) sadece gerçekten cross-app tracking varsa işaretli mi?
4. **Gizlilik Politikası (Privacy Policy URL)**
   - Push bildirimleri ve cihaz token’larının nasıl kullanıldığına dair kısa bir bölüm var mı?
   - Kullanıcıya bildirimleri kapatma yolu (cihaz ayarları) tarif ediliyor mu?

---

## 5. Özet

- Yaptığımız push notification geliştirmesi;
  - Ekstra hassas veri toplamıyor,
  - Sadece cihaz bildirimi token’ı ve bazı teknik bilgileri (platform, app version) backend’e ekliyor.
- Buna karşılık;
  - Google Play Data Safety formunda **Device IDs** için "App functionality" amacıyla veri topladığımızı belirtmeliyiz.
  - App Store App Privacy formunda **Identifiers** altında benzer beyan yapmalıyız.
  - Gizlilik politikamızda push bildirimleri ve device token’larıyla ilgili kısa bir açıklama olması tavsiye edilir.

Bu dokümanı referans alarak, yeni push mimarisiyle uyumlu Play Store / App Store policy güncellemelerini kolayca yapabilirsin.
