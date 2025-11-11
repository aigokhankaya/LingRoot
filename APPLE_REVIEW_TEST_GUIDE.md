# Apple Review Test Guide - In-App Purchase

## Test Edilen Sürüm
- **Build Number**: 23
- **Version**: (TestFlight'taki version numarası)
- **Platform**: iOS
- **Test Environment**: TestFlight + Production

## In-App Purchase Ürünleri

### 1. Gold Plan
- **Product ID**: `com.lingroot.premium.monthly`
- **Type**: Auto-Renewable Subscription
- **Price**: ₺399/month
- **Features**:
  - Monthly ~483 minutes audio creation
  - Approximately 146 pages text processing
  - All CEFR levels
  - Unlimited vocabulary

### 2. Platinum Plan
- **Product ID**: `com.lingroot.premium.monthly.platin`
- **Type**: Auto-Renewable Subscription
- **Price**: ₺599/month
- **Features**:
  - Monthly ~726 minutes audio creation
  - Approximately 220 pages text processing
  - All CEFR levels
  - Unlimited vocabulary
  - Priority support

## Test Adımları

### Ürünleri Görüntüleme
1. Uygulamayı açın
2. Dashboard → "Paketler" (Packages) butonuna tıklayın
3. Her iki paket de görünmeli (Gold ve Platinum)
4. Fiyatlar ve özellikler doğru görünmeli

### Satın Alma Akışı (TestFlight'ta Test Edildi ✅)
1. Herhangi bir pakete tıklayın
2. "Paketi Satın Al" (Purchase Package) butonuna tıklayın
3. iOS satın alma dialogu açılmalı
4. Product bilgileri görünmeli:
   - Product adı (Gold Plan / Platinum Plan)
   - Fiyat (₺399,99 veya ₺599,99)
   - "For testing purposes only" mesajı (TestFlight'ta)
5. Side button ile onaylayın
6. Satın alma başarılı olmalı

### Backend Verification
- Satın alma sonrası backend'e receipt gönderilir
- Backend hem production hem sandbox environment'ı destekler
- Status 21007 (sandbox receipt in production) otomatik handle edilir

## Bilinen Çalışan Durumlar

✅ **TestFlight Internal Testing**: Başarılı
- Product'lar yükleniyor
- Satın alma akışı çalışıyor
- Backend verification başarılı

✅ **Sandbox Test Users**: Başarılı
- Test kullanıcıları ile satın alma yapılabiliyor

## Olası Review Sorunları ve Çözümler

### Sorun: "Product not available"

**Olası Nedenler:**

1. **Territory/Region Kısıtlaması**
   - Product'lar sadece Türkiye'de aktif olabilir
   - Apple review ekibi US'den test ediyor olabilir
   - **Çözüm**: App Store Connect → Product → Availability → "All Territories" seçili olmalı

2. **Subscription Group Metadata Eksik**
   - Subscription group'un localization'ı eksik olabilir
   - **Çözüm**: Subscription Group → Localizations → En az İngilizce eklenmiş olmalı

3. **Review Information Eksik**
   - Product review bilgileri eksik olabilir
   - **Çözüm**: Her product için Review Information doldurulmalı

4. **Cleared for Sale Durumu**
   - Product'lar henüz "Cleared for Sale" olmayabilir
   - **Çözüm**: Product status "Ready to Submit" veya "Approved" olmalı

## Debug Bilgileri

### Mobil App Logs
Satın alma sırasında console'da şu loglar görünür:

```
[IAP] ========================================
[IAP] Starting subscription purchase flow
[IAP] Product ID requested: com.lingroot.premium.monthly
[IAP] Platform: ios
[IAP] IAP connection initialized
[IAP] Fetching available products...
[IAP] Available products count: 2
[IAP] Available product IDs: ["com.lingroot.premium.monthly", "com.lingroot.premium.monthly.platin"]
[IAP] Product: com.lingroot.premium.monthly
  - Title: Gold Plan
  - Description: Monthly premium package - Unlimited content creation
  - Price: ₺399,99
[IAP] Product: com.lingroot.premium.monthly.platin
  - Title: Platinum Plan
  - Description: Monthly premium+ package - Priority support
  - Price: ₺599,99
[IAP] ✅ Product found: Gold Plan
[IAP] Product price: ₺399,99
[IAP] Requesting subscription with SKU: com.lingroot.premium.monthly
[IAP] Subscription request sent to App Store
```

**Eğer product bulunamazsa:**
```
[IAP] Available products count: 0
[IAP] ❌ Product ID not found in available products!
[IAP] Requested product ID: com.lingroot.premium.monthly
[IAP] Available product IDs: none
[IAP] Total products available: 0
```

Bu durumda hata mesajı şu şekilde olur:
```
"Product not available: com.lingroot.premium.monthly. Available: none"
```

### Backend Logs
Backend'de detaylı logging mevcut:

```
[IAP-xxxxx] ========================================
[IAP-xxxxx] Apple receipt verification started
[IAP-xxxxx] User ID: user-id-here
[IAP-xxxxx] Product ID: com.lingroot.premium.monthly
[IAP-xxxxx] Receipt length: 1234 chars
[IAP-xxxxx] Step 1: Attempting PRODUCTION verification
[IAP-xxxxx] Production URL: https://buy.itunes.apple.com/verifyReceipt
[IAP-xxxxx] Production response status: 21007
[IAP-xxxxx] ⚠️ Production returned status 21007 (sandbox receipt in production)
[IAP-xxxxx] Step 2: Switching to SANDBOX verification
[IAP-xxxxx] Sandbox URL: https://sandbox.itunes.apple.com/verifyReceipt
[IAP-xxxxx] Sandbox response status: 0
[IAP-xxxxx] ✅ Receipt verified using SANDBOX environment
[IAP-xxxxx] Step 3: Extracting receipt information
[IAP-xxxxx] Receipt info extracted - transaction_id: 1000000123456789
[IAP-xxxxx] Step 4: Looking up subscription plan for product com.lingroot.premium.monthly
[IAP-xxxxx] ✅ Plan found: Gold Plan (ID: plan-id-here)
```

## App Store Connect Konfigürasyon Kontrol Listesi

### Product Configuration
- [ ] Product ID: `com.lingroot.premium.monthly` tanımlı
- [ ] Product ID: `com.lingroot.premium.monthly.platin` tanımlı
- [ ] Her iki product da "Auto-Renewable Subscription" type
- [ ] Her iki product da aynı Subscription Group'ta
- [ ] Status: "Ready to Submit" veya "Approved"
- [ ] Availability: "All Territories" seçili
- [ ] Localization: En az İngilizce eklenmiş
- [ ] Pricing: Tanımlanmış
- [ ] Review Information: Doldurulmuş

### Subscription Group
- [ ] Subscription Group oluşturulmuş
- [ ] Group Name: Tanımlanmış
- [ ] Localizations: En az İngilizce eklenmiş
- [ ] Her iki product da bu group'a eklenmiş

### Agreements
- [ ] Paid Applications Agreement: "Active" durumda
- [ ] Banking bilgileri: Doldurulmuş
- [ ] Tax bilgileri: Doldurulmuş

### App Information
- [ ] Bundle ID: `com.lingroot.mobile`
- [ ] App Store Connect'te doğru app seçili
- [ ] In-App Purchases bu app'e bağlı

## Test Kullanıcı Bilgileri

### Sandbox Test User
App Store Connect → Users and Access → Sandbox Testers bölümünden test kullanıcısı oluşturulabilir.

**Test Adımları:**
1. iOS Settings → App Store → Sign Out
2. iOS Settings → App Store → Sandbox Account → Test kullanıcısı ile giriş
3. Uygulamada satın alma yap
4. Sandbox environment kullanılır, gerçek ücret alınmaz

## Sorun Devam Ederse

### Apple'a Sağlanacak Bilgiler

1. **Console Logs**: Yukarıdaki debug logları paylaşın
2. **Backend Logs**: Receipt verification loglarını paylaşın
3. **App Store Connect Screenshots**: Product konfigürasyonunun ekran görüntüleri
4. **Test Video**: TestFlight'ta başarılı satın alma videosu

### Apple Review ile İletişim

"Request a phone call from App Review" özelliğini kullanarak Apple ile direkt görüşme talep edebilirsiniz.

**Mesaj Şablonu:**
```
We have tested the in-app purchase flow extensively on TestFlight (build 23) and it works correctly. 
All products are properly configured in App Store Connect with "All Territories" availability.

The error "Product not available: com.lingroot.premium.monthly" suggests the product IDs are not 
visible during review, but they are working in TestFlight sandbox environment.

Could you please verify:
1. Are the products visible in your test environment?
2. What region/territory are you testing from?
3. Are you seeing any specific error codes in the purchase flow?

We have enhanced our logging to provide more detailed error messages. The new error message will 
show which products are available if any product is not found.

We are happy to provide any additional information or schedule a call to resolve this issue.
```

## Ek Notlar

- Backend receipt validation hem production hem sandbox environment'ı destekler
- Apple'ın önerdiği şekilde önce production, sonra sandbox denenir
- Status 21007 (sandbox receipt in production) otomatik handle edilir
- Tüm IAP işlemleri detaylı loglanır
- Hata mesajları artık hangi product'ların mevcut olduğunu gösterir
