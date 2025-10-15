# Sosyal Medya Girişi Kurulum Rehberi

LingRoot Mobile uygulamasında Google, Facebook ve Apple ile giriş özelliğinin kurulumu için detaylı adımlar.

## İçindekiler
1. [Google Sign-In Kurulumu](#google-sign-in-kurulumu)
2. [Facebook Login Kurulumu](#facebook-login-kurulumu)
3. [Apple Sign-In Kurulumu](#apple-sign-in-kurulumu)
4. [Environment Variables](#environment-variables)
5. [Test Etme](#test-etme)

---

## Google Sign-In Kurulumu

### 1. Google Cloud Console Ayarları

1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Yeni bir proje oluşturun veya mevcut projeyi seçin
3. **APIs & Services > Credentials** bölümüne gidin
4. **Create Credentials > OAuth 2.0 Client ID** seçin

#### Android için OAuth Client ID

1. Application type: **Android**
2. Package name: `com.nsyzk.lingrootmobile`
3. SHA-1 certificate fingerprint almak için:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Debug için SHA-1'i kopyalayın
4. **Create** butonuna tıklayın
5. **Önemli:** Android için oluşturulan Client ID'yi kullanmayacaksınız. Android, Web Client ID'yi kullanır!

#### iOS için OAuth Client ID

1. Application type: **iOS**
2. Bundle ID: `com.lingroot.mobile`
3. **Create** butonuna tıklayın

#### Web Client ID (Backend için)

1. Application type: **Web application**
2. Authorized redirect URIs:
   - `https://lingloops-backend.onrender.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (development)
3. **Create** butonuna tıklayın
4. Client ID'yi kopyalayın - bu backend'de kullanılacak

### 2. Android Konfigürasyonu

`android/app/build.gradle` dosyasına Google Play Services dependency'si zaten eklenmiş durumda:

```gradle
dependencies {
    // Google Sign-In
    implementation("com.google.android.gms:play-services-auth:21.0.0")
}
```

### 3. iOS Konfigürasyonu

1. `ios/LingRootMobile/Info.plist` dosyasını açın
2. Aşağıdaki konfigürasyonu ekleyin:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR-IOS-CLIENT-ID</string>
    </array>
  </dict>
</array>
```

`YOUR-IOS-CLIENT-ID` yerine iOS OAuth Client ID'nizin tersini yazın (örn: `123456-abc.apps.googleusercontent.com` ise `com.googleusercontent.apps.123456-abc`)

3. Podfile'ı güncelleyin:
```bash
cd ios
pod install
```

---

## Facebook Login Kurulumu

### 1. Facebook Developer Console Ayarları

1. [Facebook Developers](https://developers.facebook.com/) adresine gidin
2. **My Apps > Create App** seçin
3. App Type: **Consumer**
4. App Name: **LingRoot**
5. App Contact Email: Geçerli bir email adresi

#### Facebook App ID ve App Secret

1. **Settings > Basic** bölümünde:
   - **App ID** ve **App Secret**'i kopyalayın
   - **Add Platform** butonuna tıklayın

#### Android Platform Ekle

1. Platform type: **Android**
2. Package Name: `com.nsyzk.lingrootmobile`
3. Class Name: `com.nsyzk.lingrootmobile.MainActivity`
4. Key Hashes için:
   ```bash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
   ```
   Şifre: `android`
5. Key hash'i yapıştırın

#### iOS Platform Ekle

1. Platform type: **iOS**
2. Bundle ID: `com.lingroot.mobile`
3. **Save Changes**

### 2. Android Konfigürasyonu

1. `android/app/src/main/res/values/strings.xml` dosyasını oluşturun/güncelleyin:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">LingRoot</string>
    <string name="facebook_app_id">YOUR_FACEBOOK_APP_ID</string>
    <string name="fb_login_protocol_scheme">fbYOUR_FACEBOOK_APP_ID</string>
    <string name="facebook_client_token">YOUR_FACEBOOK_CLIENT_TOKEN</string>
</resources>
```

2. `android/app/src/main/AndroidManifest.xml` dosyasına ekleyin:

```xml
<application>
    <!-- Facebook Configuration -->
    <meta-data 
        android:name="com.facebook.sdk.ApplicationId" 
        android:value="@string/facebook_app_id"/>
    <meta-data 
        android:name="com.facebook.sdk.ClientToken" 
        android:value="@string/facebook_client_token"/>
    
    <!-- Facebook Login Activity -->
    <activity 
        android:name="com.facebook.FacebookActivity"
        android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation"
        android:label="@string/app_name" />
    <activity
        android:name="com.facebook.CustomTabActivity"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="@string/fb_login_protocol_scheme" />
        </intent-filter>
    </activity>
</application>
```

### 3. iOS Konfigürasyonu

1. `ios/LingRootMobile/Info.plist` dosyasına ekleyin:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fbYOUR_FACEBOOK_APP_ID</string>
    </array>
  </dict>
</array>

<key>FacebookAppID</key>
<string>YOUR_FACEBOOK_APP_ID</string>
<key>FacebookClientToken</key>
<string>YOUR_FACEBOOK_CLIENT_TOKEN</string>
<key>FacebookDisplayName</key>
<string>LingRoot</string>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fbapi</string>
  <string>fb-messenger-share-api</string>
  <string>fbauth2</string>
  <string>fbshareextension</string>
</array>
```

2. `ios/LingRootMobile/AppDelegate.mm` dosyasını güncelleyin:

```objc
#import <FBSDKCoreKit/FBSDKCoreKit.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [[FBSDKApplicationDelegate sharedInstance] application:application
                           didFinishLaunchingWithOptions:launchOptions];
  // ... diğer kodlar
  return YES;
}

- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [[FBSDKApplicationDelegate sharedInstance] application:app
                                                        openURL:url
                                                        options:options];
}
```

---

## Apple Sign-In Kurulumu

### 1. Apple Developer Account Ayarları

1. [Apple Developer](https://developer.apple.com/) hesabınıza giriş yapın
2. **Certificates, Identifiers & Profiles** bölümüne gidin
3. **Identifiers** seçin
4. App ID'nizi seçin (`com.lingroot.mobile`)
5. **Sign in with Apple** capability'sini etkinleştirin
6. **Save** butonuna tıklayın

### 2. Xcode Ayarları

1. Xcode'da projeyi açın: `ios/LingRootMobile.xcworkspace`
2. **Signing & Capabilities** sekmesine gidin
3. **+ Capability** butonuna tıklayın
4. **Sign in with Apple** seçin

### 3. iOS Konfigürasyonu

`ios/LingRootMobile/Info.plist` dosyasına gerekli ayarlar zaten mevcut. Apple Sign-In için ek bir konfigürasyon gerekmez.

**Not:** Apple Sign-In sadece iOS 13+ cihazlarda çalışır ve yalnızca fiziksel cihazlarda test edilebilir.

---

## Environment Variables

### Mobile App (.env dosyası)

`LingRootMobile/.env` dosyasını oluşturun:

```env
# Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_GOOGLE_IOS_CLIENT_ID

# Backend API
EXPO_PUBLIC_API_URL=https://lingloops-backend.onrender.com
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Backend (.env dosyası)

Backend `.env` dosyasına ekleyin:

```env
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Facebook OAuth
FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET

# Apple OAuth (opsiyonel - gelecekte server-side verification için)
APPLE_CLIENT_ID=com.lingroot.mobile
APPLE_TEAM_ID=YOUR_APPLE_TEAM_ID
APPLE_KEY_ID=YOUR_APPLE_KEY_ID
```

---

## Test Etme

### Google Sign-In Test

1. Android/iOS emulator veya fiziksel cihazda uygulamayı çalıştırın
2. Login/Register ekranında "Google ile Giriş Yap" butonuna tıklayın
3. Google hesabınızı seçin
4. İzinleri onaylayın
5. Başarılı giriş sonrası ana ekrana yönlendirilmelisiniz

### Facebook Login Test

1. Facebook Developer Console'da test kullanıcıları ekleyin
2. Uygulamada "Facebook ile Giriş Yap" butonuna tıklayın
3. Facebook hesabınızla giriş yapın
4. İzinleri onaylayın

### Apple Sign-In Test

**Önemli:** Apple Sign-In sadece fiziksel iOS cihazlarda test edilebilir!

1. Fiziksel iOS cihazda uygulamayı çalıştırın
2. "Apple ile Giriş Yap" butonuna tıklayın
3. Face ID/Touch ID ile onaylayın
4. Email paylaşma seçeneğini belirleyin

---

## Sorun Giderme

### Google Sign-In Hataları

- **Error 10:** SHA-1 fingerprint yanlış veya eksik
  - `./gradlew signingReport` ile SHA-1'i kontrol edin
  - Google Console'da doğru SHA-1'i kullandığınızdan emin olun

- **Developer Error:** Web Client ID yanlış
  - `.env` dosyasında `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` değerini kontrol edin

### Facebook Login Hataları

- **Invalid Key Hash:** Key hash yanlış
  - Key hash'i yeniden oluşturun ve Facebook Console'a ekleyin

- **App Not Setup:** Facebook App ayarları eksik
  - App ID ve Client Token'ın doğru olduğundan emin olun

### Apple Sign-In Hataları

- **Not Available:** iOS 13+ gerekli
  - Cihaz iOS sürümünü kontrol edin

- **Capability Missing:** Xcode'da capability eklenmemiş
  - Xcode'da Sign in with Apple capability'sini ekleyin

---

## Güvenlik Notları

1. **API Keys:** Asla API key'leri git repository'sine commit etmeyin
2. **.env dosyaları:** `.gitignore` dosyasına `.env` eklendiğinden emin olun
3. **Production Keys:** Production'da farklı OAuth client'ları kullanın
4. **Backend Validation:** Tüm sosyal auth token'ları backend'de doğrulanmalı

---

## Ek Kaynaklar

- [Google Sign-In Documentation](https://developers.google.com/identity/sign-in/android/start-integrating)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/android)
- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [react-native-google-signin](https://github.com/react-native-google-signin/google-signin)
- [react-native-fbsdk-next](https://github.com/thebergamo/react-native-fbsdk-next)
- [@invertase/react-native-apple-authentication](https://github.com/invertase/react-native-apple-authentication)
