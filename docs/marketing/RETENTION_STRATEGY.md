# LingRoot Retention & Engagement Stratejisi

> **Olusturulma:** 2026-02-22 | **Guncelleme:** 2026-02-22 | **Versiyon:** 1.0

---

## 1. Retention Metrikleri ve Hedefler

### 1.1 Cohort Retention Hedefleri

| Gun | Mevcut | Hedef (3 Ay) | Hedef (6 Ay) |
|-----|--------|--------------|--------------|
| D1 | %35 | %45 | %50 |
| D7 | %20 | %30 | %35 |
| D14 | %15 | %22 | %28 |
| D30 | %10 | %18 | %25 |
| D60 | %7 | %14 | %20 |
| D90 | %5 | %12 | %18 |

### 1.2 Engagement Metrikleri

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| DAU/MAU | %15 | %30 |
| Sessions/DAU | 1.2 | 2.0 |
| Avg Session Duration | 4 dk | 8 dk |
| Contents/Week | 1.5 | 4 |
| Words Saved/Week | 5 | 15 |

---

## 2. Push Notification Stratejisi

### 2.1 Notification Kategorileri

| Kategori | Amac | Gunluk Limit | Opt-out Rate Hedefi |
|----------|------|--------------|---------------------|
| Streak | Gunluk aktivite | 1 | <%5 |
| Content | Yeni icerik onerileri | 1 | <%8 |
| Learning | Kelime tekrar | 1 | <%10 |
| Achievement | Rozet/basarim | Unlimited | <%3 |
| Social | Referral, community | 0.5/gun | <%15 |
| Promo | Indirim, kampanya | 0.3/gun | <%20 |

### 2.2 Streak Notifications

**Zamanlama:** Kullanicinin tercih ettigi saat (varsayilan: 20:00)

| Durum | Mesaj | Gonderim Zamani |
|-------|-------|-----------------|
| Streak devam | "Streak'in 5 gun! Bugun de devam et." | 20:00 |
| Streak risk | "Hey! Bugun hala dinleme yapmadinm. Streak'in tehlikede!" | 21:00 |
| Streak kaybedildi | "Streak'in sifirlandi. Yeniden basla!" | Ertesi gun 10:00 |
| Milestone | "7 gun streak! Harika gidiyorsun!" | Hemen |

**Kisisellesme:**
```javascript
const streakMessage = {
  5: "5 gun oldu! Momentum kazandin.",
  7: "1 hafta! Aliskanlik olusturuyorsun.",
  14: "2 hafta! Artik profesyonelsin.",
  30: "30 gun! Efsane oldun!",
  100: "100 GUN! Inanilmaz basari!"
};
```

### 2.3 Content Notifications

**Tetikleyiciler:**
- Kullanicinin ilgi alaninda yeni icerik
- LIRO'nun ozel onerisi
- Trending topic

**Ornekler:**
```
"Yapay zeka" konusunda yeni bir icerik hazir! Hemen dinle.

LIRO: "Gecen hafta uzay ilgini fark ettim. Mars kolonisi hakkinda bir sey hazirladim."

Trending: "Bu hafta herkes 'Stoicism' dinliyor. Sen de dene?"
```

### 2.4 Learning Notifications (Spaced Repetition)

**Algoritma:** SM-2 benzeri spaced repetition

| Tekrar # | Aralik | Mesaj |
|----------|--------|-------|
| 1 | 1 gun | "Dun ogrendigin 5 kelimeyi tekrar et." |
| 2 | 3 gun | "3 gun once ogrendigin kelimeler seni bekliyor." |
| 3 | 7 gun | "Haftalik tekrar zamani! 12 kelime." |
| 4 | 14 gun | "Bu kelimeleri hatirliyormusun? Kontrol et." |
| 5 | 30 gun | "Uzun sureli hafiza testi! 20 kelime." |

### 2.5 Achievement Notifications

**Aninda Gonderim (Real-time):**
```
"Kelime Avcisi" rozetini kazandin! 50 kelime kaydettinm.

Yeni seviye! "Dinleme Ustasi" oldun.

Tebrikler! Ilk podcast serisini tamamladin.
```

### 2.6 Push Notification Best Practices

**Yapilmasi Gerekenler:**
- Kisisellesme (isim, ilgi alani, seviye)
- Dogru zamanlama (kullanici timezone)
- Actionable CTA
- Emoji (ozellikle achievement icin)
- Deep link (ilgili ekrana yonlendirme)

**Yapilmamasi Gerekenler:**
- Gunde 3'ten fazla notification
- Gece 22:00-08:00 arasi gonderim
- Generic mesajlar
- Agresif satis dili
- Opt-out'a itmek

### 2.7 Smart Delivery

```javascript
// Optimal gonderim zamani hesaplama
function getOptimalSendTime(userId) {
  const userActivity = getUserActivityHistory(userId);
  const peakHours = analyzeActivityPeaks(userActivity);

  // Kullanicinin en aktif oldugu saati bul
  // Ama notification gondermeye uygun zaman diliminde
  const optimalHour = peakHours.filter(h => h >= 9 && h <= 21)[0] || 12;

  return optimalHour;
}
```

---

## 3. Email Marketing Stratejisi

### 3.1 Email Dizileri

#### Welcome Serisi (14 Gun, 7 Email)

| Gun | Konu | Amac |
|-----|------|------|
| 0 | Hosgeldin! LingRoot'a ilk adimlar | Onboarding |
| 1 | Ilk icerigi nasil olusturursun? | Aktivasyon |
| 3 | LIRO ile tanistin mi? | Feature discovery |
| 5 | Kelime defteri nasil kullanilir? | Feature discovery |
| 7 | 7 gun oldu! Premium'u kesfet | Conversion |
| 10 | En populer konular | Engagement |
| 14 | Premium son sans! | Conversion |

#### Re-engagement Serisi (Pasif Kullanicilar)

| Gun (Pasiflik) | Konu | Amac |
|----------------|------|------|
| 3 | "Seni ozledik! Streak'in bekliyord" | Return |
| 7 | "Bu hafta kacirdigin icerikler" | FOMO |
| 14 | "LIRO seni merak ediyor" | Emotional |
| 30 | "Hesabin hala aktif! %30 indirim" | Win-back |
| 60 | "Son sans: %50 indirim" | Last attempt |

#### Upgrade Serisi (Free Kullanicilar)

| Tetikleyici | Konu | Amac |
|-------------|------|------|
| 5 icerik olusturma | "Premium ile sinirsiz icerik" | Feature limit |
| 10 kelime kaydetme | "Kelime defteri doldu! Premium ile sinirsiz" | Feature limit |
| Trial bitis -3 gun | "Denemeniz 3 gun sonra bitiyor" | Urgency |
| Trial bitis -1 gun | "Yarin sona eriyor! Simdi abone ol" | Urgency |
| Trial bitis | "Premium ozellikleri kaybetmeyin" | Loss aversion |

### 3.2 Email Tasarim Ilkeleri

- Mobile-first (responsive)
- Tek CTA (buton)
- Kisa ve oz (300 kelime max)
- Kisisellesme (isim, son aktivite, seviye)
- Brand renkleri (Teal/Cyan)
- Unsubscribe linki görünür

### 3.3 Email Metrikleri Hedefleri

| Metrik | Hedef |
|--------|-------|
| Open Rate | %25+ |
| Click Rate | %5+ |
| Unsubscribe Rate | <%0.5 |
| Spam Rate | <%0.1 |

---

## 4. In-App Engagement Mekanizmalari

### 4.1 Daily Quest Sistemi

**Gunluk Gorevler:**

| Gorev | XP | Zorluk |
|-------|----|----|
| 1 icerik dinle | 10 XP | Kolay |
| 5 dakika dinleme | 15 XP | Kolay |
| 3 kelime kaydet | 10 XP | Kolay |
| LIRO ile sohbet | 20 XP | Orta |
| 1 quiz tamamla | 25 XP | Orta |
| 15 dakika dinleme | 30 XP | Zor |
| 10 kelime tekrar | 20 XP | Zor |

**Bonus Gorevler (Haftalik):**
- 7/7 gunluk gorev tamamla: +100 XP
- 5 farkli konuda icerik dinle: +75 XP
- 50 kelime kaydet: +50 XP

### 4.2 Weekly Challenge

**Haftalik Tema Bazli Challange'lar:**

| Hafta | Tema | Hedef | Odul |
|-------|------|-------|------|
| 1 | Dinleme Maratonu | 60 dk dinle | 200 XP + Badge |
| 2 | Kelime Ustasi | 30 kelime kaydet | 200 XP + Badge |
| 3 | Kesfet | 5 yeni konu dene | 200 XP + Badge |
| 4 | Sosyal | 2 arkadas davet et | 300 XP + Badge |

### 4.3 Monthly Milestones

| Milestone | Kosul | Odul |
|-----------|-------|------|
| 30 Gun Aktif | Ayda 20+ gun giris | Premium rozet + 500 XP |
| Dinleme Sampiyon | Ayda 10+ saat dinleme | Ozel avatar + 300 XP |
| Kelime Koleksiyoncusu | Ayda 100+ kelime | Ozel tema + 400 XP |

### 4.4 Streak Freeze (Premium)

- Maksimum 2 freeze/ay
- 1 freeze = 1 gun streak koruma
- Freeze kullanildiginda bildirim: "Streak freeze kullanildi. 1 hakkiniz kaldi."

### 4.5 XP & Level Sistemi

**Level Gereksinimleri:**

| Level | Toplam XP | Unvan |
|-------|-----------|-------|
| 1 | 0 | Yeni Baslayan |
| 5 | 500 | Dinleyici |
| 10 | 1,500 | Ogrenmet |
| 20 | 5,000 | Ustalasiyor |
| 30 | 10,000 | Uzman |
| 50 | 25,000 | Efsane |
| 100 | 100,000 | Grandmaster |

---

## 5. Segmentasyon ve Kisisellesme

### 5.1 Kullanici Segmentleri

| Segment | Tanim | Strateji |
|---------|-------|----------|
| **New Users** | 0-7 gun | Onboarding, feature discovery |
| **Active Learners** | 7+ gun, 3+ session/hafta | Engagement, premium push |
| **Power Users** | 30+ dk/gun, streak 14+ | Ambassador program, referral |
| **At Risk** | 3-7 gun pasif | Re-engagement, win-back |
| **Churned** | 14+ gun pasif | Win-back kampanyalari |
| **Premium** | Odeme yapan | Retention, upsell (yillik) |

### 5.2 Behavior-Based Triggers

```javascript
// Ornek: At-risk kullanici tespiti
const atRiskCriteria = {
  daysSinceLastSession: 3,
  sessionCountLastWeek: 0,
  streakBroken: true,
  hasNotification: true
};

// Trigger: Ozel re-engagement kampanyasi
if (matchesAtRiskCriteria(user)) {
  sendReEngagementEmail(user);
  schedulePushNotification(user, 'streak_risk');
  showInAppModal(user, 'welcome_back_offer');
}
```

### 5.3 Kisisellesme Parametreleri

| Parametre | Kullanim |
|-----------|----------|
| First name | Email, push notification |
| CEFR level | Icerik onerileri |
| Interests | Topic recommendations |
| Learning goal | Motivasyonel mesajlar |
| Streak count | Streak notifications |
| Last activity | Re-engagement timing |
| Time zone | Notification timing |
| Device type | Rich push vs simple |

---

## 6. Onboarding Optimizasyonu

### 6.1 Onboarding Akisi (Revize)

```
1. Welcome Screen
   "LingRoot'a Hosgeldin!"
   [Baslat]

2. CEFR Level Test (Opsiyonel)
   "Seviyeni olcelim mi?"
   [Evet, test et] [Atlat, kendim secerim]

3. Interest Selection
   "Hangi konular ilgini cekiyor?"
   [Grid: Bilim, Tarih, Teknoloji, Sanat, Spor, Is Dunyasi, ...]
   (Min 3 sec)

4. Learning Goal
   "Hedefin ne?"
   [Gunluk konusma] [Is Ingilizcesi] [Sinav hazırlık] [Genel gelisim]

5. Daily Commitment
   "Gunde ne kadar zaman ayirabilirsin?"
   [5 dk] [10 dk] [15 dk] [30 dk+]

6. Notification Permission
   "Hatirlatmalar alm ister misin?"
   [Saat secimi] [Hayir, tesekkurler]

7. First Content
   "Ilk icerigi hemen olusturalim!"
   [Konu gir] veya [LIRO'ya sor]
```

### 6.2 Onboarding Metrikleri

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| Completion Rate | %65 | %85 |
| Time to First Content | 8 dk | 3 dk |
| D1 Retention (onboarding complete) | %45 | %60 |
| Notification Opt-in | %40 | %60 |

### 6.3 Onboarding A/B Testleri

- Test 1: CEFR test zorunlu vs opsiyonel
- Test 2: Interest selection grid vs list
- Test 3: Skip option goster vs gosterme
- Test 4: Progress indicator goster vs gosterme

---

## 7. Churn Prevention

### 7.1 Churn Prediction Modeli

**Risk Faktörleri:**

| Faktor | Agirlik |
|--------|---------|
| 3 gun pasif | +20 |
| Streak kaybı | +15 |
| Session suresi azalması | +10 |
| Push notification kapatma | +25 |
| Premium iptal | +30 |
| Negatif feedback | +20 |

**Risk Seviyeleri:**
- 0-20: Dusuk risk
- 21-40: Orta risk
- 41-60: Yuksek risk
- 61+: Kritik risk

### 7.2 Churn Prevention Aksiyonlari

| Risk Seviyesi | Aksiyon |
|---------------|---------|
| Orta | Personalized push notification |
| Yuksek | Email + in-app modal + ozel teklif |
| Kritik | Direkt iletisim (email), %50 indirim, feedback talep |

### 7.3 Win-Back Kampanyalari

**30 Gun Pasif:**
- Email: "Seni ozledik! Geri don, 7 gun Premium hediye."
- Push: "LIRO seni bekliyor. Streak'e yeniden basla!"

**60 Gun Pasif:**
- Email: "Hesabin hala aktif. %30 indirimle Premium'a gec."
- SMS (opsiyonel): "LingRoot'u ozledin mi? [link]"

**90 Gun Pasif:**
- Email: "Son sans! %50 indirim + 1 ay ekstra."
- Sadece bu segmente ozel kampanya

---

## 8. Analytics & Tracking

### 8.1 Event Tracking

```javascript
// Retention events
track('session_start', { source, duration_since_last });
track('session_end', { duration, contents_viewed, words_saved });
track('streak_updated', { streak_count, is_milestone });
track('streak_broken', { previous_streak });
track('content_completed', { topic, duration, level });
track('word_saved', { word, source_content });
track('achievement_unlocked', { achievement_id, achievement_name });
track('level_up', { new_level, total_xp });
track('notification_received', { type, campaign_id });
track('notification_clicked', { type, campaign_id });
track('notification_dismissed', { type, campaign_id });
track('email_opened', { campaign_id, subject });
track('email_clicked', { campaign_id, link });
```

### 8.2 Retention Dashboard

```
Retention Overview
------------------
D1: 47% (+2% vs last week)
D7: 28% (-1% vs last week)
D30: 16% (stable)

Cohort Analysis:
[Cohort heatmap visualizasyonu]

At-Risk Users: 1,234 (12% of MAU)
Churned This Week: 456

Top Retention Drivers:
1. Streak feature (+15% D30)
2. LIRO conversations (+12% D7)
3. Push notifications (+8% D1)

Churn Reasons (Survey):
1. Zamanim yok (34%)
2. Icerik cesitliligi az (22%)
3. Premium pahalı (18%)
4. Teknik sorunlar (14%)
5. Diger (12%)
```

---

## 9. Uygulama Oncelikleri

### Faz 1: Temel Retention (2 Hafta)

- [ ] Streak notification optimizasyonu
- [ ] Daily quest sistemi
- [ ] Welcome email serisi
- [ ] At-risk segment tespiti

### Faz 2: Engagement (2 Hafta)

- [ ] XP ve level sistemi
- [ ] Weekly challenge
- [ ] Achievement notifications
- [ ] Re-engagement email serisi

### Faz 3: Advanced (4 Hafta)

- [ ] Churn prediction modeli
- [ ] Personalized notification timing
- [ ] A/B test framework
- [ ] Win-back kampanyalari

---

## 10. Basari Kriterleri

| Metrik | 3 Ay Hedefi | 6 Ay Hedefi |
|--------|-------------|-------------|
| D1 Retention | %45 | %50 |
| D30 Retention | %18 | %25 |
| DAU/MAU | %25 | %30 |
| Push CTR | %8 | %12 |
| Email Open Rate | %25 | %30 |
| Churn Rate (Monthly) | %8 | %5 |
