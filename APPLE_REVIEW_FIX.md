# Apple Review Rejection - IAP Fix Guide

## Rejection Nedeni
Apple review ekibi uygulamanızı test ederken "Product not available: com.lingroot.premium.monthly" hatası aldı.

## Sorunun Kaynağı
Hata backend'e ulaşmadan, mobil uygulamada `react-native-iap` kütüphanesi App Store'dan product bilgilerini alamıyor. Bu, product ID'lerin App Store Connect'te doğru yapılandırılmadığını gösteriyor.

---

## ✅ YAPILMASI GEREKENLER (ÖNCELIK SIRASINA GÖRE)

### 1. App Store Connect - Paid Applications Agreement (EN ÖNEMLİ!)

Apple'ın mesajında açıkça belirttiği gibi:
> "Note that the Account Holder must accept the Paid Apps Agreement in the Business section of App Store Connect before paid in-app purchases will function."

**Adımlar:**
1. [App Store Connect](https://appstoreconnect.apple.com) → **Agreements, Tax, and Banking** → **Agreements**
2. **Paid Applications Agreement** durumunu kontrol edin
3. Eğer "Action Needed" veya "Pending" yazıyorsa, **HEMEN İMZALAYIN**
4. Status "Active" olmalı

⚠️ **Bu adım yapılmadan IAP çalışmaz!**

---

### 2. App Store Connect - In-App Purchase Product ID Kontrolü

**Adımlar:**
1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **LingRoot** → **In-App Purchases**
2. Aşağıdaki product ID'lerin **TAM OLARAK** bu şekilde tanımlı olduğunu kontrol edin:

#### Gold Plan
- **Product ID**: `com.lingroot.premium.monthly`
- **Type**: Auto-Renewable Subscription
- **Reference Name**: "Gold Plan Monthly" (veya benzeri)
- **Subscription Group**: Bir subscription group'a eklenmiş olmalı
- **Status**: "Ready to Submit" veya "Approved"

#### Platinum Plan
- **Product ID**: `com.lingroot.premium.monthly.platin`
- **Type**: Auto-Renewable Subscription
- **Reference Name**: "Platinum Plan Monthly" (veya benzeri)
- **Subscription Group**: Gold ile AYNI subscription group'ta olmalı
- **Status**: "Ready to Submit" veya "Approved"

**Her product için kontrol edin:**
- ✅ **Localization**: En az bir dil (Türkçe ve/veya İngilizce) eklenmiş olmalı
  - Display Name
  - Description
- ✅ **Pricing**: Fiyat tanımlanmış olmalı
- ✅ **Review Information**: Screenshot ve review notes eklenmiş olmalı (ilk submission için)

---

### 3. Subscription Group Kontrolü

**Adımlar:**
1. App Store Connect → **In-App Purchases** → **Subscription Groups**
2. Bir subscription group oluşturun (örn: "LingRoot Premium")
3. Her iki product'ı (Gold ve Platinum) bu group'a ekleyin
4. **Subscription Group Localization** ekleyin (Türkçe ve İngilizce)

---

### 4. Database Product ID Kontrolü

Database'inizdeki product ID'lerin App Store Connect ile eşleştiğinden emin olun.

**Kontrol SQL:**
```sql
SELECT 
  id,
  name,
  price,
  apple_product_id,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY price ASC;
```

**Beklenen Sonuç:**
- Gold Plan: `apple_product_id = 'com.lingroot.premium.monthly'`
- Platinum Plan: `apple_product_id = 'com.lingroot.premium.monthly.platin'`

**Eğer farklıysa, düzeltin:**
```sql
-- Gold Plan
UPDATE subscription_plans
SET apple_product_id = 'com.lingroot.premium.monthly'
WHERE LOWER(name) LIKE '%gold%' AND is_active = true;

-- Platinum Plan
UPDATE subscription_plans
SET apple_product_id = 'com.lingroot.premium.monthly.platin'
WHERE (LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%') AND is_active = true;
```

---

### 5. Backend Environment Variable Kontrolü

Backend'inizde `APPLE_IAP_SHARED_SECRET` environment variable'ının set edildiğinden emin olun.

**Shared Secret'i Bulma:**
1. App Store Connect → **My Apps** → **LingRoot** → **In-App Purchases**
2. **App-Specific Shared Secret** bölümünden kopyalayın
3. Backend environment variable olarak ekleyin:
   ```
   APPLE_IAP_SHARED_SECRET=your_shared_secret_here
   ```

---

### 6. TestFlight ile Test

Yukarıdaki adımları tamamladıktan sonra:

1. **Yeni bir build oluşturun** (build number artırın)
2. TestFlight'a yükleyin
3. **Internal Testing** ile test edin:
   - Packages ekranına gidin
   - Her iki paketi de satın almayı deneyin
   - "Product not available" hatası almamalısınız
   - Satın alma akışı başlamalı (Sandbox environment)

4. **Sandbox Test User** ile test edin:
   - App Store Connect → **Users and Access** → **Sandbox Testers**
   - Yeni bir test user oluşturun
   - iOS Settings → App Store → Sandbox Account ile giriş yapın
   - Uygulamada satın alma yapın

---

## 🔍 Sorun Devam Ederse

### Debug Logging

Backend'de şimdi detaylı logging ekledik. Satın alma sırasında backend loglarını kontrol edin:

```bash
# Backend loglarını izleyin
# Render.com kullanıyorsanız:
# Dashboard → Your Service → Logs

# Aranacak log pattern:
[IAP-xxxxx] Apple receipt verification started
[IAP-xxxxx] Product ID: com.lingroot.premium.monthly
[IAP-xxxxx] Available Apple product IDs in database: [...]
```

### Mobil App Debug

Mobil uygulamada console loglarını kontrol edin:

```
[IAP] Requesting products with IDs: ["com.lingroot.premium.monthly", "com.lingroot.premium.monthly.platin"]
[IAP] Platform: ios
[IAP] Products received: 2
  - com.lingroot.premium.monthly: Gold Plan
  - com.lingroot.premium.monthly.platin: Platinum Plan
```

Eğer "Products received: 0" görüyorsanız, App Store Connect konfigürasyonunda sorun var demektir.

---

## 📝 Apple'a Yanıt (Düzeltmelerden Sonra)

Yukarıdaki adımları tamamladıktan ve TestFlight'ta test ettikten sonra, Apple'a şu şekilde yanıt verin:

```
Thank you for your feedback.

We have identified and resolved the issue:

1. ✅ Paid Applications Agreement has been accepted and is now Active
2. ✅ In-App Purchase products are properly configured in App Store Connect:
   - com.lingroot.premium.monthly (Gold Plan)
   - com.lingroot.premium.monthly.platin (Platinum Plan)
3. ✅ Both products are in "Ready to Submit" status with proper localization
4. ✅ Backend receipt validation now properly handles both production and sandbox environments (status 21007)
5. ✅ Tested successfully with TestFlight internal testing and sandbox users

The purchase flow now works correctly. We have enhanced our backend logging to better track receipt verification for future debugging.

We have submitted build version [YENİ_BUILD_NUMARASI] with these fixes.

Please let us know if you need any additional information.
```

---

## 🚀 Yeni Build Gönderme

1. Mobil app'te build number artırın:
   ```bash
   cd /Users/enesyuzak/Documents/GitHub/LingRoot/Main/LingRootMobile
   # iOS build number artırın (Xcode'da veya Info.plist'te)
   ```

2. Yeni build oluşturun ve TestFlight'a yükleyin

3. TestFlight'ta test edin

4. App Store'a submit edin

---

## ⚠️ Önemli Notlar

- **Sandbox vs Production**: Apple review ekibi production app'i test ederken sandbox receipt'leri kullanır. Backend kodunuz şimdi bunu handle ediyor (status 21007 kontrolü).

- **Product Status**: Product'lar "Approved" olmasa bile review sırasında test edilebilir. "Ready to Submit" yeterli.

- **Subscription Group**: Her iki product da aynı subscription group'ta olmalı ki kullanıcılar upgrade/downgrade yapabilsin.

- **Localization**: En az bir dil için display name ve description gerekli. Türkçe ve İngilizce eklemeniz önerilir.

---

## 📞 Destek

Sorun devam ederse:
1. Backend loglarını kontrol edin (detaylı logging eklendi)
2. Mobil app console loglarını kontrol edin
3. App Store Connect product konfigürasyonunu tekrar gözden geçirin
4. Apple'ın "Request a phone call from App Review" özelliğini kullanın
