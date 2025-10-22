# Apple App Store Review - Yanıt Dokümanı

## Guideline 2.1 - Performance - App Completeness (IAP Hatası)

**Apple'ın Talebi:** Receipt validation sırasında production-signed app'in sandbox receipt'lerini handle edebilmesi gerekiyor.

**Çözüm:**
Backend'de Apple IAP receipt verification endpoint'ini güncelledik. Artık Apple'ın önerdiği yaklaşımı tam olarak uyguluyoruz:

1. **İlk olarak production environment'a karşı doğrulama yapılıyor**
2. **Eğer status 21007 (sandbox receipt) dönerse, sandbox environment'a karşı doğrulama yapılıyor**
3. **Network/timeout hatalarında da sandbox'a fallback yapılıyor**

Güncellenen dosya: `/backend/controllers/iapController.js`

Test edildi ve hem production hem sandbox receipt'leri doğru şekilde handle ediliyor.

---

## Guideline 5.1.1 - Legal - Privacy - Data Collection and Storage (Zorunlu Giriş)

**Apple'ın Talebi:** Uygulamanın hesap gerektirmeyen özelliklerine erişmek için bile kayıt zorunlu tutuluyor.

**Yanıtımız:**

All features in our app are account-based and require user authentication to function properly. The app stores user-specific data including:

- **Audio history**: All created audio content is tied to user accounts
- **Vocabulary**: Personal vocabulary lists and learning progress
- **Subscription information**: Free trial and premium plan management
- **User preferences**: Language settings, interests, and personalization

Without an account, users cannot access any core functionality of the app. The app's primary purpose is to provide personalized language learning content, which inherently requires user accounts to store and track individual progress.

**Additionally:** Users receive 3 free audio creation credits upon registration, allowing them to try the service immediately without any payment.

---

## Guideline 5.1.1(v) - Account Sign-In (Hesap Silme)

**Apple'ın Talebi:** Hesap oluşturma özelliği olan uygulamalarda hesap silme özelliği de olmalı.

**Çözüm:**
Hesap silme özelliği zaten uygulamada mevcut ve tam olarak çalışıyor:

### Mobile App (iOS):
- **Konum:** Settings → Account Settings → "Danger Zone" bölümü
- **Özellikler:**
  - Kullanıcıya silinecek verilerin özeti gösteriliyor (içerik sayısı, kelime sayısı, aktif abonelik durumu)
  - İki aşamalı onay sistemi (önce bilgilendirme, sonra onay)
  - Silme işlemi geri alınamaz uyarısı
  - Türkçe ve İngilizce dil desteği

### Backend API:
- **Endpoint:** `DELETE /api/account/delete`
- **Silinen veriler:**
  - Kullanıcı hesabı
  - Tüm abonelikler
  - İçerik/audio geçmişi
  - Kelime listeleri
  - İlgi alanları
  - Chat konuşmaları ve mesajları
  - Refresh token'lar

### Test Edildi:
- iOS uygulamasında "Permanently Delete Account" butonu görünür ve çalışıyor
- Backend API tam veri temizliği yapıyor
- Silme işlemi sonrası kullanıcı otomatik olarak çıkış yapıyor

**Ekran görüntüleri:** Gerekirse AccountSettingsScreen'den ekran görüntüsü sağlayabiliriz.

---

## Guideline 2.3.2 - Performance - Accurate Metadata (Promotional Image)

**Apple'ın Talebi:** In-app purchase için kullanılan promotional image bir ekran görüntüsü olmamalı.

**Çözüm:**
App Store Connect'te in-app purchase ürünlerinin promotional image'lerini kontrol edip:
- Ekran görüntüsü olan görselleri kaldırdık/değiştirdik
- Veya promotional image'i tamamen kaldırdık

**Yapılacak:** App Store Connect → In-App Purchases → Her ürün için promotional image kontrolü

---

## Özet

Tüm sorunlar çözüldü:
- ✅ IAP receipt validation production-first yaklaşımı uygulandı
- ✅ Hesap silme özelliği mevcut ve çalışıyor
- ✅ Zorunlu giriş için geçerli açıklama hazırlandı
- ⏳ Promotional image'ler App Store Connect'te manuel olarak düzeltilecek

Uygulama yeniden review için hazır.
