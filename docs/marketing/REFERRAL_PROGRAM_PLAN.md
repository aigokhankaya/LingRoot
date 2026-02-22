# LingRoot Referral Program Uygulama Plani

> **Olusturulma:** 2026-02-22 | **Guncelleme:** 2026-02-22 | **Versiyon:** 1.0

---

## 1. Program Ozeti

### 1.1 Hedef
Mevcut kullanicilar araciligiyla organik buyume saglamak ve CAC'i dusurerek surdurulebilir kullanici edinimi yapmak.

### 1.2 Temel Metrikler

| Metrik | Hedef (3 Ay) | Hedef (6 Ay) |
|--------|--------------|--------------|
| Referral'dan gelen kullanici orani | %15 | %25 |
| Referral conversion rate | %20 | %30 |
| Viral coefficient (K-factor) | 0.3 | 0.5 |
| Ortalama davet sayisi/kullanici | 2 | 3.5 |

---

## 2. Odul Yapisi

### 2.1 Iki Tarafli Odul (Two-Sided Reward)

| Taraf | Odul | Kosul |
|-------|------|-------|
| **Davet Eden** | +7 gun Premium | Davetli kayit oldugunda |
| **Davet Edilen** | +7 gun Premium | Kayit ve ilk icerik olusturma |

### 2.2 Odul Kademeleri (Tier System)

| Kademe | Davet Sayisi | Ek Odul |
|--------|--------------|---------|
| **Starter** | 1-3 | 7 gun Premium / davet |
| **Connector** | 4-10 | 14 gun Premium / davet + Ozel badge |
| **Ambassador** | 11-25 | 1 ay Premium / davet + Ambassador status |
| **Champion** | 25+ | 3 ay Premium / davet + VIP erisim + Gelir paylasimi (%10) |

### 2.3 Gelir Paylasimi (Champion Tier)

- Champion tier kullanicilar, davet ettikleri kullanicilarin Premium abonelik gelirinin %10'unu kazanir
- Odeme: Aylik, minimum 100 TL'ye ulasildiginda
- Odeme yontemi: Banka transferi veya dijital cuzdan

---

## 3. Teknik Uygulama

### 3.1 Veritabani Semasi

```sql
-- Referral codes tablosu
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    code VARCHAR(12) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Referral tracking tablosu
CREATE TABLE referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) NOT NULL,
    referred_id UUID REFERENCES users(id) NOT NULL,
    referral_code VARCHAR(12) REFERENCES referral_codes(code),
    status VARCHAR(20) DEFAULT 'pending', -- pending, activated, rewarded
    referred_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    reward_days_given INTEGER DEFAULT 0
);

-- Referral stats view
CREATE VIEW referral_stats AS
SELECT
    u.id as user_id,
    u.email,
    rc.code as referral_code,
    COUNT(rt.id) as total_referrals,
    COUNT(CASE WHEN rt.status = 'activated' THEN 1 END) as activated_referrals,
    SUM(rt.reward_days_given) as total_reward_days,
    CASE
        WHEN COUNT(rt.id) >= 25 THEN 'champion'
        WHEN COUNT(rt.id) >= 11 THEN 'ambassador'
        WHEN COUNT(rt.id) >= 4 THEN 'connector'
        ELSE 'starter'
    END as tier
FROM users u
LEFT JOIN referral_codes rc ON u.id = rc.user_id
LEFT JOIN referral_tracking rt ON rc.code = rt.referral_code AND rt.status IN ('activated', 'rewarded')
GROUP BY u.id, u.email, rc.code;
```

### 3.2 API Endpoints

```
POST /api/referral/generate-code
- Kullanici icin benzersiz referral kodu olusturur
- Response: { code: "LING-ABC123", shareUrl: "https://lingroot.com/r/LING-ABC123" }

GET /api/referral/stats
- Kullanicinin referral istatistiklerini dondurur
- Response: { totalReferrals, activatedReferrals, tier, rewardDays, shareUrl }

POST /api/referral/apply-code
- Body: { code: "LING-ABC123" }
- Yeni kullanici kayit sirasinda referral kodu uygular

POST /api/referral/claim-reward
- Bekleyen odul varsa kullaniciya uygular
```

### 3.3 Referral Code Formati

```
LING-[6 karakter alfanumerik]
Ornek: LING-ABC123, LING-XYZ789
```

**Ozel Kodlar (Influencer/Partner):**
```
LINGROOT-[ISIM]
Ornek: LINGROOT-EMRE, LINGROOT-ZEYNEP
```

---

## 4. Kullanici Akisi (User Flow)

### 4.1 Davet Eden (Referrer)

```
1. Ayarlar > Arkadaslarini Davet Et
2. Kisisel referral kodunu ve linki gor
3. Paylasim secenekleri: WhatsApp, Instagram DM, SMS, Link Kopyala
4. Davet durumunu takip et (pending, activated)
5. Odul kazanildiginda push notification + confetti
```

### 4.2 Davet Edilen (Referee)

```
1. Referral linki ile uygulamayi ac/indir
2. Kayit formunda referral kodu otomatik doldurulur
3. Kayit tamamla
4. "7 gun Premium hediye!" ekrani
5. Ilk icerik olustur (aktivasyon kriteri)
6. Her iki taraf da odul kazanir
```

---

## 5. Paylasim Mekanizmalari

### 5.1 Deep Link Yapisi

```
Web: https://lingroot.com/r/LING-ABC123
iOS Universal Link: https://lingroot.com/r/LING-ABC123
Android App Link: https://lingroot.com/r/LING-ABC123

Fallback:
- App yuklu: Uygulamaya yonlendir + kod otomatik uygula
- App yuklu degil: App Store/Play Store + kod kaydet (deferred deep link)
```

### 5.2 Paylasim Mesaj Sablonlari

**WhatsApp:**
```
Hey! LingRoot ile Ingilizce dinleme pratigi yapiyorum, gercekten cok iyi.
Senin icin de 7 gun Premium hediye: [LINK]
```

**Instagram DM:**
```
Bu uygulamayi denemelisin! Ingilizce icerikleri seviyene gore dinliyorsun.
7 gun ucretsiz Premium: [LINK]
```

**SMS:**
```
LingRoot'u dene! 7 gun Premium hediye: [LINK]
```

**Twitter/X:**
```
LingRoot ile Ingilizce ogrenmenin yeni yolunu kesfettim.
Kendi seviyemde icerik dinlemek harika.
Sen de dene: [LINK]
```

### 5.3 Paylasim UI

```
[Referral Card]
+------------------------------------------+
|  Arkadaslarini Davet Et                  |
|                                          |
|  Senin Kodun: LING-ABC123               |
|  [Kodu Kopyala]                          |
|                                          |
|  +--------+ +--------+ +--------+        |
|  |WhatsApp| |Instagram| | SMS   |        |
|  +--------+ +--------+ +--------+        |
|                                          |
|  Her davet = 7 gun Premium               |
|  Davetlerin: 3 basarili                  |
|  Kazandigin: 21 gun Premium              |
+------------------------------------------+
```

---

## 6. Viral Loop Tasarimi

### 6.1 Progress Share Card

Kullanicinin haftalik ilerlemesini paylasabilecegi Instagram Story uyumlu gorsel:

```
+------------------------------------------+
|         [LingRoot Logo]                   |
|                                          |
|  Bu Hafta Dinledim:                      |
|  45 dakika                               |
|                                          |
|  Ogrendigim Kelimeler: 23                |
|  Streak: 7 gun                           |
|                                          |
|  lingroot.com/r/LING-ABC123              |
+------------------------------------------+

Boyut: 1080x1920 px (Instagram Story)
Renk: Brand gradient + user stats
```

### 6.2 Achievement Share

Rozet kazanildiginda paylasim prompt'u:

```
Tebrikler! "Kelime Ustasi" rozetini kazandin!

[Paylas] [Atla]
```

**Paylasim icerigi:**
```
LingRoot'ta "Kelime Ustasi" rozetini kazandim!
100 yeni kelime ogrendim.
Sen de basla: [LINK]
```

### 6.3 Streak Milestone

Streak milestone'larinda (7, 30, 100 gun) paylasim tesviki:

```
30 Gun Streak!

Bu basariyi paylasarak arkdaslarinla gurur duy.

[Instagram'da Paylas] [Atla]
```

---

## 7. Push Notification Stratejisi

### 7.1 Referrer Notifications

| Tetikleyici | Baslik | Icerik |
|-------------|--------|--------|
| Davet gonderildi | "Link'in paylasıldı!" | "[Isim] davet linkini aldi. Parmak carpiyor!" |
| Davet kaydoldu | "Yeni arkadas!" | "[Isim] katildi! 7 gun Premium kazandin." |
| Tier yukseltme | "Seviye atlandin!" | "Connector oldun! Artik 14 gun Premium / davet." |

### 7.2 Referee Notifications

| Tetikleyici | Baslik | Icerik |
|-------------|--------|--------|
| Ilk acilis | "Hosgeldin!" | "[Referrer] seni davet etti. 7 gun Premium hediye!" |
| 3. gun | "Premium'un sona eriyor" | "Premium'un 4 gun sonra bitiyor. Simdi abone ol!" |

---

## 8. Fraud Prevention

### 8.1 Kurallar

- Ayni device'tan maksimum 3 referral (device fingerprint)
- Ayni IP'den maksimum 5 referral/gun
- Email domain blacklist (gecici email servisleri)
- Yeni hesap en az 24 saat aktif olmali
- Referred user en az 1 icerik olusturmali

### 8.2 Fraud Detection

```javascript
// Fraud skoru hesaplama
function calculateFraudScore(referral) {
  let score = 0;

  if (referral.sameDeviceCount > 2) score += 30;
  if (referral.sameIPCount > 3) score += 20;
  if (isTemporaryEmail(referral.referredEmail)) score += 40;
  if (referral.timeSinceSignup < 60) score += 20; // 60 dakikadan az
  if (!referral.hasCreatedContent) score += 30;

  return score; // 70+ = fraud flag
}
```

### 8.3 Manuel Inceleme

Score 70+ olan referral'lar:
1. Otomatik odul verilmez
2. Admin panelinde "fraud review" kuyruğuna eklenir
3. Manuel onay/red

---

## 9. Analytics & Tracking

### 9.1 Event Tracking

```javascript
// Firebase/Mixpanel events
track('referral_code_generated', { userId, code });
track('referral_link_shared', { userId, platform }); // whatsapp, instagram, sms, copy
track('referral_link_clicked', { code, source });
track('referral_signup_started', { code, referrerId });
track('referral_signup_completed', { code, referrerId, referredId });
track('referral_activated', { code, referrerId, referredId });
track('referral_reward_claimed', { userId, rewardDays, tier });
```

### 9.2 Dashboard Metrikleri

```
Referral Program Dashboard
--------------------------
Today's Referrals: 45
This Week: 312
This Month: 1,234

Conversion Funnel:
- Links Shared: 5,000
- Links Clicked: 1,500 (30%)
- Signups Started: 600 (40%)
- Signups Completed: 400 (67%)
- Activated: 320 (80%)

Top Referrers:
1. Emre S. - 47 referrals (Champion)
2. Zeynep K. - 23 referrals (Ambassador)
3. Ahmet M. - 15 referrals (Ambassador)

K-Factor: 0.4
Payback Period: 2.3 months
```

---

## 10. Uygulama Timeline

### Faz 1: MVP (2 Hafta)

- [ ] Referral codes tablosu ve API
- [ ] Temel paylasim UI (kod + kopyala)
- [ ] Deferred deep link entegrasyonu
- [ ] Odul verme mekanizmasi (7 gun Premium)
- [ ] Temel analytics

### Faz 2: Growth (2 Hafta)

- [ ] Tier sistemi
- [ ] WhatsApp/Instagram paylasim entegrasyonu
- [ ] Progress share card
- [ ] Push notifications
- [ ] Fraud detection

### Faz 3: Scale (4 Hafta)

- [ ] Leaderboard
- [ ] Ambassador program
- [ ] Gelir paylasimi sistemi
- [ ] A/B testleri
- [ ] Advanced analytics dashboard

---

## 11. A/B Test Plani

### Test 1: Odul Miktari

- Variant A: 7 gun Premium (kontrol)
- Variant B: 14 gun Premium
- Variant C: 3 gun Premium + 50 bonus XP
- Metrik: Referral conversion rate, LTV

### Test 2: Paylasim CTA

- Variant A: "Arkadaslarini Davet Et"
- Variant B: "7 Gun Premium Kazan"
- Variant C: "Birlikte Ogren"
- Metrik: Click-through rate, share rate

### Test 3: Share Timing

- Variant A: Onboarding sonrasi
- Variant B: Ilk icerik tamamlama sonrasi
- Variant C: 3. gun (streak)
- Metrik: Share rate, quality of referrals

---

## 12. Basari Kriterleri

| Metrik | Minimum | Hedef | Stretch |
|--------|---------|-------|---------|
| Referral'dan gelen kullanicilar | %10 | %20 | %30 |
| Referral conversion (click->signup) | %15 | %25 | %35 |
| Referral retention (D30) | %18 | %25 | %32 |
| Viral coefficient (K) | 0.2 | 0.4 | 0.6 |
| Program katilim orani | %15 | %30 | %45 |
