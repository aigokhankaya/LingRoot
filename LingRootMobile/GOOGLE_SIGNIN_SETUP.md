# Google Sign-In SHA-1 Yapılandırması

## Sorun
`DEVELOPER_ERROR: Follow troubleshooting instructions` hatası alıyorsunuz çünkü Google Cloud Console'da SHA-1 sertifika parmak izleri kayıtlı değil.

## SHA-1 Parmak İzleri

### Debug Keystore (Geliştirme)
```
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
Package Name: com.nsyzk.lingrootmobile
```

### Release Keystore (Üretim) - MEVCUT
```
SHA1: 8E:45:7E:79:E5:79:E9:22:99:59:27:A8:11:F0:16:73:8F:EF:57:7E
Package Name: com.nsyzk.lingrootmobile
```

**ÖNEMLİ:** Şu anda kullandığınız keystore'un SHA-1'i yukarıdaki gibidir. Google Cloud Console'da bu SHA-1'i kullanın!

## Google Cloud Console Yapılandırması

### Adım 1: Google Cloud Console'a Giriş
1. https://console.cloud.google.com/ adresine gidin
2. Projenizi seçin (LingRoot veya ilgili proje)

### Adım 2: OAuth 2.0 Client ID'leri Görüntüleme
1. Sol menüden **APIs & Services** > **Credentials** seçin
2. Mevcut OAuth 2.0 Client ID'lerinizi görün

### Adım 3: Android Client ID Yapılandırması

#### Yeni Android Client ID Oluşturma (Eğer yoksa)
1. **+ CREATE CREDENTIALS** > **OAuth client ID** tıklayın
2. Application type: **Android** seçin
3. Name: `LingRoot Android App` yazın
4. Package name: `com.nsyzk.lingrootmobile`
5. SHA-1 certificate fingerprint: `8E:45:7E:79:E5:79:E9:22:99:59:27:A8:11:F0:16:73:8F:EF:57:7E`
6. **CREATE** tıklayın

#### Mevcut Android Client ID'yi Düzenleme (Eğer varsa)
1. Mevcut Android client ID'nizin yanındaki **edit** (kalem) ikonuna tıklayın
2. SHA-1 certificate fingerprint kısmına **mevcut SHA-1'i** ekleyin:
   ```
   8E:45:7E:79:E5:79:E9:22:99:59:27:A8:11:F0:16:73:8F:EF:57:7E
   ```
3. **SAVE** tıklayın

### Adım 4: Debug SHA-1'i de Ekleyin (Opsiyonel)
Geliştirme sırasında debug keystore kullanıyorsanız, debug SHA-1'i de ekleyin:
1. Yeni bir Android Client ID oluşturun
2. Name: `LingRoot Android App (Debug)`
3. Package name: `com.nsyzk.lingrootmobile`
4. SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
5. **CREATE** tıklayın

### Adım 5: Web Client ID'yi Kontrol Etme
Kodunuzda kullandığınız Web Client ID'nin doğru olduğundan emin olun:
```
Web Client ID: 308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com
```

Bu ID'nin **OAuth 2.0 Client IDs** listesinde olduğunu ve **Web application** tipinde olduğunu kontrol edin.

## Test Etme

1. Google Cloud Console'da değişiklikleri yaptıktan sonra **5-10 dakika** bekleyin (Google'ın değişiklikleri yayması için)
2. Uygulamayı tamamen kapatın (force stop)
3. Uygulamayı yeniden başlatın
4. Google Sign-In'i deneyin

## Sorun Devam Ederse

### 1. Package Name Kontrolü
`AndroidManifest.xml` dosyasındaki package name'in doğru olduğundan emin olun:
```xml
<manifest package="com.nsyzk.lingrootmobile">
```

### 2. Google Services JSON
`android/app/google-services.json` dosyasının doğru proje için olduğundan emin olun.

### 3. Temiz Build
```powershell
cd android
.\gradlew clean
cd ..
npx react-native run-android
```

### 4. Logları Kontrol Etme
```powershell
adb logcat | Select-String "GoogleSignIn"
```

## Ek Notlar

- **Debug ve Release için ayrı SHA-1'ler gerekir**
- Her keystore'un kendi SHA-1 parmak izi vardır
- Google Play'e yüklediğinizde Google kendi signing key'ini kullanır, o yüzden Google Play Console'dan da SHA-1 almanız gerekebilir
- Değişiklikler 5-10 dakika içinde aktif olur

## Google Play Console SHA-1 (İleride Gerekebilir)

Google Play'e yükledikten sonra:
1. Google Play Console > Setup > App integrity
2. **App signing** sekmesinde SHA-1 certificate fingerprint'i bulun
3. Bu SHA-1'i de Google Cloud Console'a ekleyin

## Referanslar
- [React Native Google Sign-In Troubleshooting](https://react-native-google-signin.github.io/docs/troubleshooting)
- [Google Sign-In Android Integration](https://developers.google.com/identity/sign-in/android/start-integrating)
