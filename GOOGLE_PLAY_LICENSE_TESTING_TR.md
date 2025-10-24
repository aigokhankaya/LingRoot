# Google Play Console - License Testing (Türkçe Rehber)

## Yöntem 1: Internal Testing (ÖNERİLEN)

### Adım 1: Internal Testing Oluştur
```
Sol menü → Test edin ve yayınlayın → Test etme → Internal testing
```

### Adım 2: Yeni Sürüm Oluştur
```
Internal testing → Create new release (Yeni sürüm oluştur)
```

### Adım 3: APK/AAB Yükle
```
Upload → app-release.aab veya app-release.apk
```

### Adım 4: Test Kullanıcıları Ekle
```
Internal testing → Testers sekmesi → Create email list

Email List Name: LingRoot Test Users
Emails:
- your.email@gmail.com
- test.user@gmail.com
```

### Adım 5: Kaydet ve Yayınla
```
Save → Review release → Start rollout to Internal testing
```

---

## Yöntem 2: License Testing (Klasik Yol)

### Adım 1: Ayarlar'a Git

**İngilizce arayüz:**
```
Sol menü → Setup → License testing
```

**Türkçe arayüz (olası yollar):**
```
Sol menü → Kurulum → Lisans testi
Sol menü → Ayarlar → Lisans testi
Sol menü → Uygulama bütünlüğü → Lisans testi
```

### Adım 2: Email Ekle
```
License testers → Add email addresses

Emails:
your.email@gmail.com
test.user@gmail.com
```

### Adım 3: License Response
```
License response: RESPOND_NORMALLY (varsayılan)
```

---

## Yöntem 3: Direkt URL (En Kolay!)

### Google Play Console URL'leri:

**Internal Testing:**
```
https://play.google.com/console/u/0/developers/YOUR_DEVELOPER_ID/app/YOUR_APP_ID/tracks/internal-testing
```

**License Testing:**
```
https://play.google.com/console/u/0/developers/YOUR_DEVELOPER_ID/app/YOUR_APP_ID/app-settings
```

**Uygulama ID'nizi bulmak için:**
- Sol menüde uygulamanızı seçin
- URL'deki `/app/XXXXXXXXX/` kısmı app ID'niz

---

## Test Kullanıcısı Eklendikten Sonra

### 1. Test Kullanıcısına Link Gönder

**Internal Testing linki:**
```
Test edin ve yayınlayın → Internal testing → Testers sekmesi → Copy link
```

Bu link şuna benzer:
```
https://play.google.com/apps/internaltest/XXXXXXXXX
```

### 2. Test Kullanıcısı Ne Yapmalı?

1. **Linke tıkla** (yukarıdaki internal testing linki)
2. **"Become a tester"** butonuna tıkla
3. **Google Play Store'dan uygulamayı indir**
4. **Satın alma testi yap**

---

## Hangi Yöntemi Seçmeliyim?

| Yöntem | Avantaj | Dezavantaj |
|--------|---------|------------|
| **Internal Testing** | ✅ Kolay kurulum<br>✅ Test linki var<br>✅ Gerçek Play Store deneyimi | ⚠️ APK/AAB yükleme gerekli |
| **License Testing** | ✅ APK yükleme gerekmez<br>✅ Hızlı test | ⚠️ Bulması zor<br>⚠️ Eski yöntem |

**Öneri:** Internal Testing kullanın! 🚀

---

## Sorun Giderme

### "License testing bulamıyorum"
**Çözüm:**
- Internal Testing kullanın (daha kolay)
- Veya Google Play Console dilini İngilizce yapın:
  ```
  Sağ üst → Profil → Language → English
  ```

### "Internal testing'e APK yükleyemiyorum"
**Çözüm:**
- AAB (Android App Bundle) oluşturun:
  ```bash
  cd F:\Main\LingRootMobile\android
  .\gradlew.bat bundleRelease --no-daemon --console plain
  ```
- Dosya: `android\app\build\outputs\bundle\release\app-release.aab`

### "Test kullanıcısı satın alma yapamıyor"
**Çözüm:**
- Test kullanıcısının Gmail hesabıyla cihazda giriş yaptığından emin olun
- Internal testing linkinden uygulamayı indirdiğinden emin olun
- Product ID'lerin Google Play Console'da tanımlı olduğunu kontrol edin

---

## Hızlı Başlangıç

### En Hızlı Yol (5 Dakika):

1. **Internal Testing Oluştur**
   ```
   Test edin ve yayınlayın → Internal testing → Create new release
   ```

2. **AAB Yükle**
   ```bash
   .\gradlew.bat bundleRelease
   # Dosya: android\app\build\outputs\bundle\release\app-release.aab
   ```

3. **Test Kullanıcısı Ekle**
   ```
   Testers sekmesi → Create email list → Email ekle
   ```

4. **Linki Paylaş**
   ```
   Copy link → Test kullanıcısına gönder
   ```

5. **Test Et!**
   - Test kullanıcısı linke tıklar
   - "Become a tester" → Install
   - Satın alma testi yapar

✅ Bitti!
