# Dinleme Kalitesi Gamification Sistemi (LQS)

> **Oluşturulma:** 2026-02-07 | **Güncelleme:** 2026-02-07 | **Versiyon:** 1.0

## Genel Bakış

LingRoot dinleme odaklı bir platform olduğu için, gamification sistemi **dinleme süresini** değil **dinleme kalitesini** ölçmeye odaklanır.

### Problem: Vanity Metrics

Eski sistem:
- 10 dakika dinle = 100 XP
- Kullanıcı arka planda oynatıp hiç dinlemeden XP kazanabilir

Yeni sistem:
- LQS (Listening Quality Score) ile kalite ölçümü
- XP = base_xp × quality_multiplier

---

## LQS (Listening Quality Score)

### Hesaplama Formülü

```
LQS = (Engagement × 0.3) + (Comprehension × 0.5) + (Consistency × 0.2)
```

| Bileşen | Ağırlık | Açıklama |
|---------|---------|----------|
| Engagement | 30% | Pause, replay, word_tap, speed_change |
| Comprehension | 50% | Quiz sonucu (0-100) |
| Consistency | 20% | Streak faktörü |

### Engagement Score Hesaplama

```javascript
engagementScore = Math.min(100,
  pauseScore +      // max 25, ideal: 0.5-2 pause/dk
  replayScore +     // max 25, her replay = 5 puan
  wordTapScore +    // max 25, her tap = 3 puan
  speedScore        // max 25, her değişiklik = 8 puan
);
```

### XP Multiplier

```javascript
qualityMultiplier = 0.5 + (LQS / 200);  // 0.5 - 1.0 arası
finalXP = baseXP × qualityMultiplier;
```

| LQS | Multiplier | 10dk Base XP | Final XP |
|-----|------------|--------------|----------|
| 0   | 0.50x      | 100          | 50       |
| 50  | 0.75x      | 100          | 75       |
| 70  | 0.85x      | 100          | 85       |
| 100 | 1.00x      | 100          | 100      |

---

## Aktif Dinleme Sinyalleri

### Ölçülen Metrikler

| Metrik | Açıklama | İdeal Değer |
|--------|----------|-------------|
| `pause_count` | Duraklama sayısı | 0.5-2 per minute |
| `replay_count` | Tekrar dinleme | > 0 (anlamak için uğraş) |
| `word_tap_count` | Kelime tıklaması | > 0 (kelime keşfi) |
| `speed_change_count` | Hız değişikliği | Adaptasyon göstergesi |
| `subtitle_toggle_count` | Altyazı açma/kapama | - |
| `seek_count` | İleri/geri atlama | - |

### Frontend Event Tracking

```typescript
// useListeningSession hook kullanımı
const { trackPause, trackReplay, trackWordTap } = useListeningSession();

// Audio player'da
onPause={() => trackPause(currentTime)}
onReplay={(from, to) => trackReplay(from, to)}
onWordClick={(word) => trackWordTap(word, currentTime)}
```

---

## Memory Palace (Kelime Sarayı)

### Odalar

| Oda | Koşul | Açıklama |
|-----|-------|----------|
| 🌑 Karanlık Bölge | - | Henüz keşfedilmemiş (tahminî 5000+ kelime) |
| 👁️ Tanık Odası | 1-2 karşılaşma | Duyunca tanıyor |
| 📚 Öğrenim Salonu | 5+ karşılaşma VEYA SRS'de | Aktif öğrenme |
| 🏛️ Bilgi Kütüphanesi | 3+ başarılı tekrar | Bilinen kelimeler |
| 🏆 Altın Kasa | 5+ farklı context'te %90+ tanıma | Ustalaşılan |

### Kelime İlerlemesi

```
encountered → familiar → learning → known → mastered
     ↓           ↓          ↓         ↓         ↓
dark_zone → witness → learning → library → vault
```

---

## API Endpoints

### Listening Session

```
POST /api/listening/session/start
  body: { contentId, contentType, contentDuration }
  response: { sessionId, startedAt }

POST /api/listening/session/:id/event
  body: { eventType, eventData }
  eventType: 'pause' | 'play' | 'replay' | 'word_tap' | 'speed_change' | 'subtitle_toggle' | 'seek'

POST /api/listening/session/:id/complete
  body: { comprehensionScore?, completionPercentage? }
  response: { lqs, finalXp, bonuses, warning }
```

### Stats & Trends

```
GET /api/listening/stats
  response: { avgLQS, totalMinutes, qualityMinutes, ... }

GET /api/listening/quality-trend?days=7
  response: { trend: [{ date, avgLQS, minutes }] }
```

### Memory Palace

```
GET /api/listening/palace
  response: { rooms, totalWords, recentWords }

GET /api/listening/due-reviews
  response: { dueCount, words }

POST /api/listening/vocabulary/:word/review
  body: { result: 'again' | 'hard' | 'good' | 'easy' }
```

---

## Database Schema

### listening_sessions
- Dinleme oturumu detaylı tracking
- Her pause, replay, word_tap kaydı
- LQS ve XP hesaplaması

### user_listening_stats
- Aggregate istatistikler
- Günlük/haftalık trendler
- CEFR tahmini

### vocabulary_mastery_extended
- Memory Palace için genişletilmiş kelime tablosu
- Context tracking (kaç farklı içerikte)
- SRS (Spaced Repetition System)

---

## Achievement'lar

### Dinleme Kalitesi

| Code | Title | Koşul | XP |
|------|-------|-------|-----|
| FOCUSED_LISTENER_1 | Odaklı Dinleyici | LQS 80+ ile 5 içerik | 150 |
| DEEP_LISTENER | Derin Dinleyici | LQS 90+ ile 10 içerik | 300 |
| PERSISTENT_LEARNER | Azimli Öğrenci | 50 replay | 100 |

### Kelime Keşfi

| Code | Title | Koşul | XP |
|------|-------|-------|-----|
| WORD_HUNTER_10 | Kelime Avcısı | 10 kelime tap | 50 |
| WORD_HUNTER_100 | Kelime Koleksiyoncusu | 100 kelime tap | 200 |
| PALACE_MASTER | Saray Ustası | 50 kelime Altın Kasa'da | 300 |

### Anlama Serisi

| Code | Title | Koşul | XP |
|------|-------|-------|-----|
| PERFECT_UNDERSTANDING_3 | Tam Anlayış | 3 içerik üst üste %90+ | 150 |
| PERFECT_UNDERSTANDING_7 | Anlama Ustası | 7 içerik üst üste %90+ | 400 |

---

## Daily Quests (Kalite Odaklı)

### Yeni Quest Tipleri

| Type | Title | Target | XP |
|------|-------|--------|-----|
| quality_listen | LQS 70+ ile 1 içerik tamamla | 1 | 75 |
| word_discovery | 3 kelime keşfet | 3 | 40 |
| comprehension_high | %80+ anlama ile 1 içerik | 1 | 100 |
| replay_master | 5 kez tekrar dinle | 5 | 50 |
| speed_challenge | 1.1x hızda 1 içerik bitir | 1 | 75 |

---

## Dosya Yapısı

### Backend

```
backend/
├── services/
│   └── listeningService.js      # LQS hesaplama, session yönetimi
├── routes/
│   └── listeningRoutes.js       # API endpoints
└── migrations/
    └── 0082_listening_quality_system.sql
```

### Frontend

```
frontend/src/
├── components/gamification/
│   ├── ListeningQualityCard.tsx  # LQS dashboard
│   └── MemoryPalace.tsx          # Kelime sarayı
└── hooks/
    └── useListeningSession.ts    # Event tracking hook
```

---

## Uygulama Notları

1. **AudioPlayer entegrasyonu**: useListeningSession hook'u AudioPlayer component'ine bağlanmalı
2. **Quiz entegrasyonu**: Quiz tamamlandığında comprehensionScore session'a gönderilmeli
3. **Kelime popup'ı**: Kelimeye tıklandığında trackWordTap çağrılmalı
4. **Mobil uyumluluk**: React Native için aynı hook pattern uygulanabilir
