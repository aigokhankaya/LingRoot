# Promosyon/Kampanya Ozelligi Test Senaryolari Dokumani

> **Created:** 2026-02-05 | **Updated:** 2026-02-05 | **Version:** 1.0

Bu dokuman, LingRoot promosyon/kampanya ozelliginin tum test senaryolarini kapsar. Kaynak kod referanslari: `planController.js`, `subscriptionController.js`, `PromotionSection.tsx`, `PackagesScreen.tsx`.

---

## Modul 1: Backend - Plan CRUD Promosyon Alanlari (planController.js)

### TC-PROMO-01: createPlan - Promosyon Alanlariyla Plan Olusturma
- **Endpoint:** `POST /api/plans`
- **On kosul:** Admin auth token gecerli
- **Girdi:**
  ```json
  {
    "name": "Gold",
    "price": 299,
    "promotion_active": true,
    "promotion_discount_percentage": 50,
    "promotion_original_price": 299,
    "promotion_price": 149,
    "promotion_start_date": "2026-02-01",
    "promotion_end_date": "2026-03-01",
    "promotion_badge_text": "%50 Indirim!",
    "promotion_description": "Lansman kampanyasi"
  }
  ```
- **Beklenen:** `201 Created`, tum promosyon alanlari kayitli, `promotion_active: true`, `estimates` hesaplanmis

### TC-PROMO-02: createPlan - Varsayilan promotion_active Degeri
- **Endpoint:** `POST /api/plans`
- **Girdi:** `{ "name": "Silver", "price": 199 }` (promotion alanlari gonderilmiyor)
- **Beklenen:** `promotion_active: false` (Boolean(undefined || false) = false)

### TC-PROMO-03: createPlan - promotion_active Acikca false Gonderildiginde
- **Girdi:** `{ "name": "Silver", "price": 199, "promotion_active": false }`
- **Beklenen:** `promotion_active: false`

### TC-PROMO-04: createPlan - Numerik Alan Donusumleri
- **Girdi:**
  ```json
  {
    "name": "Gold",
    "price": 299,
    "promotion_discount_percentage": "50",
    "promotion_original_price": "299.99",
    "promotion_price": "149.50"
  }
  ```
- **Beklenen:** DB'ye `Number()` ile donusturulmus degerler yazilir: `promotion_discount_percentage: 50`, `promotion_original_price: 299.99`, `promotion_price: 149.50`

### TC-PROMO-05: createPlan - Bos String → null Donusumu
- **Girdi:**
  ```json
  {
    "name": "Gold",
    "price": 299,
    "promotion_discount_percentage": "",
    "promotion_original_price": "",
    "promotion_price": ""
  }
  ```
- **Beklenen:** Bos string'ler `record`'a eklenmez (kosul: `!== ''`), DB'ye null olarak yansir

### TC-PROMO-06: createPlan - promotion_badge_text ve promotion_description null Donusumu
- **Girdi:** `{ "name": "Gold", "price": 299, "promotion_badge_text": "", "promotion_description": "" }`
- **Beklenen:** `promotion_badge_text: null`, `promotion_description: null` (|| null donusumu)

### TC-PROMO-07: createPlan - Tarih Alanlari
- **Girdi:** `{ ..., "promotion_start_date": "2026-02-01", "promotion_end_date": "2026-03-01" }`
- **Beklenen:** Tarihler string olarak kaydedilir. Bos/falsy tarih gonderilirse record'a eklenmez

### TC-PROMO-08: createPlan - Cache Invalidation
- **On kosul:** Redis cache'te `sub:plans` key'i mevcut
- **Senaryo:** Promosyonlu plan basariyla olusturulur
- **Beklenen:** `invalidateCache('sub:plans')` cagirilir, eski cache temizlenir

### TC-PROMO-09: updatePlan - Promosyon Alanlari Allowed Dizisinde
- **Endpoint:** `PUT /api/plans/:id`
- **Girdi:** `{ "promotion_active": true, "promotion_discount_percentage": 30 }`
- **Beklenen:** Sadece `allowed` dizisindeki alanlar (`promotion_active`, `promotion_discount_percentage`, `promotion_original_price`, `promotion_price`, `promotion_start_date`, `promotion_end_date`, `promotion_badge_text`, `promotion_description`) guncellenir, diger alanlar yok sayilir

### TC-PROMO-10: updatePlan - Bilinmeyen Alan Gonderimi
- **Girdi:** `{ "promotion_active": true, "promotion_unknown_field": "value" }`
- **Beklenen:** `promotion_unknown_field` payload'a eklenmez (allowed listesinde yok)

### TC-PROMO-11: updatePlan - Cache Invalidation
- **On kosul:** Redis cache'te `sub:plans` key'i mevcut
- **Senaryo:** Plan promosyon alanlari guncellenir
- **Beklenen:** `invalidateCache('sub:plans')` cagirilir

### TC-PROMO-12: updatePlan - updated_at Otomatik Guncelleme
- **Senaryo:** Herhangi bir promosyon alani guncellenir
- **Beklenen:** `updated_at` alani guncel ISO timestamp ile ayarlanir

---

## Modul 2: Backend - Tarih Bazli Filtreleme (subscriptionController.js)

### TC-PROMO-13: getSubscriptionPlans - Aktif + Tarih Araliginda
- **Endpoint:** `GET /api/subscriptions/plans`
- **On kosul:** Plan: `promotion_active: true`, `promotion_start_date: "2026-01-01"`, `promotion_end_date: "2026-12-31"`, bugunun tarihi: 2026-02-05
- **Beklenen:** Response'ta `promotion_active: true` doner

### TC-PROMO-14: getSubscriptionPlans - Gecmis Bitis Tarihi
- **On kosul:** Plan: `promotion_active: true`, `promotion_end_date: "2025-12-31"` (gecmis tarih)
- **Beklenen:** Response'ta `promotion_active: false` olarak override edilir (tarih kontrolu: `new Date(promotion_end_date) < now`)

### TC-PROMO-15: getSubscriptionPlans - Gelecek Baslangic Tarihi
- **On kosul:** Plan: `promotion_active: true`, `promotion_start_date: "2026-06-01"` (gelecek tarih)
- **Beklenen:** Response'ta `promotion_active: false` olarak override edilir (tarih kontrolu: `new Date(promotion_start_date) > now`)

### TC-PROMO-16: getSubscriptionPlans - promotion_active: false Durumunda Tarih Kontrol Edilmez
- **On kosul:** Plan: `promotion_active: false`, tarih alanlari dolu (orn: `promotion_start_date: "2026-01-01"`, `promotion_end_date: "2026-12-31"`)
- **Beklenen:** Tarih kontrolune girilmez, `promotion_active: false` olarak kalir

### TC-PROMO-17: getSubscriptionPlans - Null Tarih Alanlari (Sinirsiz Kampanya)
- **On kosul:** Plan: `promotion_active: true`, `promotion_start_date: null`, `promotion_end_date: null`
- **Beklenen:** Her iki tarih kontrolu atlanir (`if (plan.promotion_end_date && ...)` kosulu false), `promotion_active: true` olarak kalir — sinirsiz kampanya

### TC-PROMO-18: getSubscriptionPlans - Sadece start_date Null
- **On kosul:** Plan: `promotion_active: true`, `promotion_start_date: null`, `promotion_end_date: "2026-12-31"`
- **Beklenen:** Start date kontrolu atlanir, sadece end date kontrol edilir. Bugun end date'ten onceyse `promotion_active: true`

### TC-PROMO-19: getSubscriptionPlans - Sadece end_date Null
- **On kosul:** Plan: `promotion_active: true`, `promotion_start_date: "2026-01-01"`, `promotion_end_date: null`
- **Beklenen:** End date kontrolu atlanir, sadece start date kontrol edilir. Bugun start date'ten sonraysa `promotion_active: true`

### TC-PROMO-20: getSubscriptionPlans - Birden Fazla Plan Farkli Promosyon Durumlari
- **On kosul:** 3 plan: (1) aktif promosyon, (2) suresi dolmus promosyon, (3) promosyonsuz
- **Beklenen:** Her plan icin bagimsiz tarih filtresi uygulanir, response'ta (1) `true`, (2) `false`, (3) orijinal deger

---

## Modul 3: Admin Panel - PromotionSection (PromotionSection.tsx)

### TC-PROMO-21: Toggle Kapali Durumu — Detay Alanlari Gizli
- **Sayfa:** Admin Panel > Plan Duzenleme
- **On kosul:** `promotion_active: false`
- **Beklenen:** Sadece Switch toggle gorunur, indirim yuzdesi / fiyat / tarih / rozet / aciklama alanlari render edilmez (`{data.promotion_active && (...)}` blogu)

### TC-PROMO-22: Toggle Acik Durumu — Detay Alanlari Gorunur
- **On kosul:** `promotion_active: true`
- **Beklenen:** Tum detay alanlari gorunur: Indirim Yuzdesi, Rozet Metni, Orijinal Fiyat, Indirimli Fiyat, Baslangic Tarihi, Bitis Tarihi, Promosyon Aciklamasi

### TC-PROMO-23: Toggle Durum Degisikligi — onChange Callback
- **Senaryo:** Switch toggle'a tiklanir (false → true)
- **Beklenen:** `onChange` callback'i cagirilir: `{ ...data, promotion_active: true }`

### TC-PROMO-24: Indirim Yuzdesi Input Validasyonu
- **Alan:** `promotion_discount_percentage`
- **Beklenen:** `type="number"`, `min="0"`, `max="100"`, placeholder "Orn: 50"

### TC-PROMO-25: Fiyat Alanlari Input Tipleri
- **Alanlar:** `promotion_original_price`, `promotion_price`
- **Beklenen:** `type="number"`, `step="0.01"` (ondalik destegi)

### TC-PROMO-26: Tarih Alanlari Input Tipleri
- **Alanlar:** `promotion_start_date`, `promotion_end_date`
- **Beklenen:** `type="date"` (tarayici tarih secici)

### TC-PROMO-27: Form Alanlari Dogru Deger Gosterimi
- **On kosul:** `data = { promotion_discount_percentage: "50", promotion_badge_text: "%50 Indirim!", promotion_original_price: "299", promotion_price: "149", promotion_start_date: "2026-02-01", promotion_end_date: "2026-03-01", promotion_description: "Lansman" }`
- **Beklenen:** Her input kendi value'sunu dogru gosterir

### TC-PROMO-28: onChange Callback — Tek Alan Degisikligi
- **Senaryo:** `promotion_badge_text` alanina "Yeni Kampanya" yazilir
- **Beklenen:** `onChange({ ...data, promotion_badge_text: "Yeni Kampanya" })` cagirilir, diger alanlar degismez

### TC-PROMO-29: Uyari Mesaji Gorunurlugu
- **On kosul:** `promotion_active: true`
- **Beklenen:** Amber renkli uyari kutusu gorunur: "Bu bilgiler sadece gosterim amaclidir. Gercek indirimli fiyatlandirma App Store Connect ve/veya Google Play Console uzerinden ayarlanmalidir."

### TC-PROMO-30: Kart Baslik ve Aciklama
- **Beklenen:** Kart basligi "Promosyon Ayarlari", aciklama "Kampanya gosterim bilgilerini duzenleyin..." metni gorunur

---

## Modul 4: Mobil - PackagesScreen Promosyon Gosterimi (PackagesScreen.tsx)

### TC-PROMO-31: isPromotionActive — Tum Kosullar Saglandiginda
- **Girdi:** `{ promotion_active: true, promotion_start_date: "2026-01-01", promotion_end_date: "2026-12-31" }`, bugun: 2026-02-05
- **Beklenen:** `isPromotionActive()` → `true`

### TC-PROMO-32: isPromotionActive — promotion_active false
- **Girdi:** `{ promotion_active: false, promotion_start_date: "2026-01-01", promotion_end_date: "2026-12-31" }`
- **Beklenen:** `isPromotionActive()` → `false` (ilk kontrol: `!plan.promotion_active`)

### TC-PROMO-33: isPromotionActive — Gelecek Baslangic Tarihi
- **Girdi:** `{ promotion_active: true, promotion_start_date: "2026-06-01", promotion_end_date: "2026-12-31" }`, bugun: 2026-02-05
- **Beklenen:** `isPromotionActive()` → `false`

### TC-PROMO-34: isPromotionActive — Gecmis Bitis Tarihi
- **Girdi:** `{ promotion_active: true, promotion_start_date: "2025-01-01", promotion_end_date: "2025-12-31" }`, bugun: 2026-02-05
- **Beklenen:** `isPromotionActive()` → `false`

### TC-PROMO-35: isPromotionActive — Null Tarihler (Sinirsiz)
- **Girdi:** `{ promotion_active: true, promotion_start_date: undefined, promotion_end_date: undefined }`
- **Beklenen:** `isPromotionActive()` → `true` (tarih kosullari atlanir)

### TC-PROMO-36: getPromotionRemainingDays — Gecerli Bitis Tarihi
- **Girdi:** `endDate = "2026-02-10"`, bugun: 2026-02-05
- **Beklenen:** `getPromotionRemainingDays()` → `5` (Math.ceil ile yukari yuvarlama)

### TC-PROMO-37: getPromotionRemainingDays — Bugun Son Gun
- **Girdi:** `endDate = "2026-02-05"`, bugun: 2026-02-05 (gun icinde)
- **Beklenen:** `getPromotionRemainingDays()` → `0` (diffMs <= 0 kosulu)

### TC-PROMO-38: getPromotionRemainingDays — Gecmis Tarih
- **Girdi:** `endDate = "2026-01-01"`
- **Beklenen:** `getPromotionRemainingDays()` → `0`

### TC-PROMO-39: getPromotionRemainingDays — Null/Undefined Girdi
- **Girdi:** `endDate = undefined`
- **Beklenen:** `getPromotionRemainingDays()` → `null`

### TC-PROMO-40: Promosyon Badge Gosterimi
- **On kosul:** `isPromotionActive(plan) = true`, `plan.promotion_badge_text = "%50 Indirim!"`
- **Beklenen:** Sari (amber) renkte badge goruntulenir, metin: "%50 Indirim!"

### TC-PROMO-41: Promosyon Badge — Badge Text Bos
- **On kosul:** `isPromotionActive(plan) = true`, `plan.promotion_badge_text = null`
- **Beklenen:** Badge render edilmez (`hasPromotion && plan.promotion_badge_text &&` kosulu)

### TC-PROMO-42: Ustu Cizili Fiyat ve Indirimli Fiyat Gosterimi
- **On kosul:** `hasPromotion = true`, `promotion_original_price: 299`, `promotion_price: 149`
- **Beklenen:** `originalPrice` stili ile ustu cizili "₺299" ve `promotionPrice` stili ile buyuk "₺149" gosterilir

### TC-PROMO-43: Ustu Cizili Fiyat — promotion_original_price null Fallback
- **On kosul:** `hasPromotion = true`, `promotion_original_price: null`, `plan.price: 299`
- **Beklenen:** Ustu cizili fiyat olarak `plan.price` (₺299) gosterilir (fallback: `plan.promotion_original_price || plan.price`)

### TC-PROMO-44: Indirimli Fiyat — promotion_price null Fallback
- **On kosul:** `hasPromotion = true`, `promotion_price: null`, `plan.price: 299`
- **Beklenen:** Indirimli fiyat olarak `plan.price` (₺299) gosterilir (fallback: `plan.promotion_price || plan.price`)

### TC-PROMO-45: Geri Sayim Gosterimi — Kalan Gunler
- **On kosul:** `hasPromotion = true`, `remainingDays = 5`
- **Beklenen:** Timer ikonu + "Kampanya 5 gun sonra sona eriyor" (TR) veya "Campaign ends in 5 days" (EN)

### TC-PROMO-46: Geri Sayim Gosterimi — Son Gun
- **On kosul:** `hasPromotion = true`, `remainingDays = 0`
- **Beklenen:** "Son gun!" (TR) veya "Last day!" (EN)

### TC-PROMO-47: Geri Sayim — end_date null ise Gizli
- **On kosul:** `hasPromotion = true`, `promotion_end_date: null`
- **Beklenen:** `remainingDays = null`, geri sayim blogu render edilmez (`remainingDays !== null` kosulu)

### TC-PROMO-48: Promosyon Aciklamasi Gosterimi
- **On kosul:** `hasPromotion = true`, `plan.promotion_description = "Lansman kampanyasi"`
- **Beklenen:** Italik stilde "Lansman kampanyasi" metni gosterilir

### TC-PROMO-49: Promosyon Aciklamasi — Bos/Null
- **On kosul:** `hasPromotion = true`, `plan.promotion_description = null`
- **Beklenen:** Aciklama blogu render edilmez (`hasPromotion && plan.promotion_description &&` kosulu)

### TC-PROMO-50: Promosyonsuz Plan Karti — Normal Fiyat Gosterimi
- **On kosul:** `isPromotionActive(plan) = false`
- **Beklenen:** Tek fiyat gosterimi (`styles.price`), ustu cizili fiyat yok, badge yok, geri sayim yok, aciklama yok

### TC-PROMO-51: Promosyonlu Plan Karti — Ozel Stil
- **On kosul:** `hasPromotion = true`
- **Beklenen:** Kart stili `promotionPlanCard` uygulanir: amber border (`#F59E0B`), amber shadow, elevation arttirilmis

### TC-PROMO-52: Promosyon + Aktif Paket Birlikte
- **On kosul:** `hasPromotion = true`, `isActive = true`
- **Beklenen:** Hem `activePlanCard` hem `promotionPlanCard` stilleri birlikte uygulanir, badge + aktif paket rozeti birlikte gorunur

---

## Ozet

| Modul | Test Sayisi |
|-------|------------|
| Backend - Plan CRUD Promosyon Alanlari | 12 |
| Backend - Tarih Bazli Filtreleme | 8 |
| Admin Panel - PromotionSection | 10 |
| Mobil - PackagesScreen Promosyon Gosterimi | 22 |
| **TOPLAM** | **52** |
