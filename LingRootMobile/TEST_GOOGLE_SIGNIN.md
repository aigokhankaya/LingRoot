# Google Sign-In Debug Adımları

## 1. Logları Kontrol Et

Uygulamayı çalıştırırken logları izleyin:

```cmd
npx react-native log-android
```

Google Sign-In'e tıkladığınızda şu logları arayın:
- `[GOOGLE_SIGNIN]` ile başlayan loglar
- `GoogleSignIn` içeren hatalar
- `DEVELOPER_ERROR` detayları

## 2. Google Play Services Kontrol

Cihazınızda/emulatörde:
1. Settings > Apps > Google Play Services
2. Version'ı kontrol edin (en az 20.x.x olmalı)
3. Eğer eski ise, Google Play Store'dan güncelleyin

## 3. OAuth Consent Screen Kontrol

Google Cloud Console'da:
1. APIs & Services > OAuth consent screen
2. **Publishing status** kontrol edin:
   - Eğer **"Testing"** ise → Test users listesine email ekleyin
   - Veya **"Publish app"** ile production'a alın

## 4. Test Users Ekleme (Eğer Testing modundaysa)

1. OAuth consent screen > Test users
2. "+ ADD USERS" butonuna tıklayın
3. Test etmek istediğiniz Gmail adresini ekleyin
4. Save

## 5. Cache Temizleme

```cmd
# Metro cache temizle
npx react-native start --reset-cache

# Başka terminalde
npx react-native run-android

# Veya tamamen temizle
cd LingRootMobile\android
gradlew.bat clean
cd ..\..
npx react-native run-android
```

## 6. Uygulamayı Cihazdan Sil

1. Uygulamayı cihazdan/emulatörden tamamen silin
2. Yeniden yükleyin
3. Google Sign-In'i test edin

## 7. Alternatif: Farklı Google Hesabı Dene

Eğer birden fazla Google hesabınız varsa, farklı bir hesapla deneyin.

## 8. Son Çare: OAuth Client'ı Yeniden Oluştur

1. Google Cloud Console > Credentials
2. Android Client'ı silin
3. Yeni bir Android OAuth client oluşturun:
   - Package name: com.nsyzk.lingrootmobile
   - SHA-1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
4. Yeni Client ID'yi .env dosyasına ekleyin
5. Uygulamayı yeniden build edin

## Beklenen Log Çıktısı

Başarılı olduğunda:
```
[GOOGLE_SIGNIN] Configuration attempt: {hasWebClientId: true, hasIosClientId: true, hasAndroidClientId: true, platform: 'android'}
[GOOGLE_SIGNIN] Config: {platform: 'android', webClientId: '308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com'}
[GOOGLE_SIGNIN] Configuration successful
```

Hata olduğunda:
```
[GOOGLE_SIGNIN] Error: {code: '...', message: '...'}
```
