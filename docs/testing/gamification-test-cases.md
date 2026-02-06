# Gamification Test Senaryoları Dokümanı

Bu doküman, LingRoot gamification sisteminin tüm test senaryolarını kapsar.

---

## Modül 1: XP Sistemi

### TC-XP-01: XP Ekleme (Başarılı)
- **Endpoint:** `POST /api/gamification/xp`
- **Ön koşul:** Auth token geçerli
- **Girdi:** `{ amount: 50, source: "content", sourceId: "123", description: "Listened content" }`
- **Beklenen:** `{ success: true }`, XP 50 artar, xp_transactions'a kayıt eklenir

### TC-XP-02: XP Limit Aşımı
- **Girdi:** `{ amount: 600, source: "content" }`
- **Beklenen:** Hata — max 500 XP per request

### TC-XP-03: Geçersiz Source
- **Girdi:** `{ amount: 50, source: "hacked" }`
- **Beklenen:** Validation hatası — source whitelist dışı

### TC-XP-04: Negatif XP
- **Girdi:** `{ amount: -10, source: "content" }`
- **Beklenen:** Validation hatası — amount > 0 olmalı

### TC-XP-05: Auth Token Yok
- **Girdi:** Token olmadan XP ekleme isteği
- **Beklenen:** 401 Unauthorized

### TC-XP-06: Description Uzunluk Limiti
- **Girdi:** `{ amount: 10, source: "content", description: "x".repeat(201) }`
- **Beklenen:** Validation hatası — max 200 karakter

### TC-XP-07: Günlük XP Limiti (Abuse Detection)
- **Senaryo:** Aynı gün içinde toplam 10.000+ XP ekleme girişimi
- **Beklenen:** Rate limit veya abuse flag tetiklenir

---

## Modül 2: Level Sistemi

### TC-LVL-01: Level Hesaplama Formülü
- **Formül:** `Level = floor(sqrt(totalXP / 50)) + 1`
- **Test Verileri:**
  | Total XP | Beklenen Level |
  |----------|---------------|
  | 0 | 1 |
  | 49 | 1 |
  | 50 | 2 |
  | 200 | 3 |
  | 5000 | 10 |
  | 500000 | 100 |

### TC-LVL-02: Level Up Tetikleme
- **Senaryo:** XP eklendikten sonra level değişir
- **Beklenen:** Level up event tetiklenir, yeni level kaydedilir

### TC-LVL-03: CEFR Seviye Eşleşmesi
- **Test Verileri:**
  | Level Aralığı | Beklenen CEFR |
  |--------------|--------------|
  | 1-10 | A1 |
  | 11-25 | A2 |
  | 26-45 | B1 |
  | 46-65 | B2 |
  | 66-85 | C1 |
  | 86-100 | C2 |

### TC-LVL-04: Level Sınır Değerleri
- **Senaryo:** Level 10→11 geçişinde CEFR A1→A2 değişimi
- **Beklenen:** Level ve CEFR birlikte güncellenir

---

## Modül 3: Streak Sistemi

### TC-STR-01: Günlük Check-in (İlk Gün)
- **Endpoint:** `POST /api/gamification/streak/checkin`
- **Ön koşul:** Kullanıcının streak'i yok
- **Beklenen:** streak_count = 1, last_activity_date = bugün

### TC-STR-02: Ardışık Gün Check-in
- **Ön koşul:** Dün check-in yapılmış, streak = 5
- **Beklenen:** streak_count = 6, +25 XP bonus

### TC-STR-03: Aynı Gün Tekrar Check-in
- **Ön koşul:** Bugün zaten check-in yapılmış, streak = 5
- **Beklenen:** streak_count değişmez (5 kalır), ekstra XP verilmez

### TC-STR-04: 1 Gün Atladıktan Sonra Check-in
- **Ön koşul:** Son aktivite 2 gün önce, streak = 10
- **Beklenen:** streak_count = 1 (sıfırlanır)

### TC-STR-05: 7 Günlük Streak Milestone
- **Ön koşul:** streak_count = 6
- **Senaryo:** 7. gün check-in
- **Beklenen:** +100 XP bonus, streak achievement açılır

### TC-STR-06: 30 Günlük Streak Milestone
- **Ön koşul:** streak_count = 29
- **Beklenen:** +500 XP bonus, 30-gün achievement

### TC-STR-07: Streak Freeze Kullanma
- **Endpoint:** `POST /api/gamification/streak/freeze`
- **Ön koşul:** freeze_balance = 2, streak = 15, bugün aktivite yok
- **Beklenen:** freeze_balance = 1, streak korunur, last_activity_date = bugün

### TC-STR-08: Streak Freeze — Bakiye Yok
- **Ön koşul:** freeze_balance = 0
- **Beklenen:** Hata — freeze bakiyesi yetersiz

### TC-STR-09: Streak Freeze — Bugün Zaten Kullanılmış
- **Ön koşul:** Bugün zaten freeze kullanılmış
- **Beklenen:** Hata — günlük freeze limiti aşıldı

### TC-STR-10: En Uzun Streak Kaydı
- **Senaryo:** Mevcut streak (20) > longest_streak (15)
- **Beklenen:** longest_streak = 20 güncellenir

---

## Modül 4: Achievement (Başarı) Sistemi

### TC-ACH-01: Achievement Listesi Getirme
- **Endpoint:** `GET /api/gamification/achievements`
- **Beklenen:** earned, available, hidden kategorilerinde achievement listesi

### TC-ACH-02: Streak Achievement Tetikleme
- **Senaryo:** 7 günlük streak tamamlama → STREAK_7
- **Beklenen:** Achievement kazanılır, XP ödülü verilir, earned_at kaydedilir

### TC-ACH-03: Dinleme Achievement (1 Saat)
- **Senaryo:** Toplam 60 dakika dinleme
- **Beklenen:** İlgili listening achievement açılır

### TC-ACH-04: Kelime Achievement (50 Kelime)
- **Senaryo:** 50. kelimeyi öğrenme
- **Beklenen:** Vocabulary achievement tetiklenir

### TC-ACH-05: Level Achievement (Level 10)
- **Senaryo:** Level 10'a ulaşma
- **Beklenen:** Level 10 achievement açılır

### TC-ACH-06: Hidden Achievement — NIGHT_OWL
- **Senaryo:** Gece yarısından sonra aktivite
- **Beklenen:** NIGHT_OWL hidden achievement tetiklenir

### TC-ACH-07: Hidden Achievement — EARLY_BIRD
- **Senaryo:** Sabah 6'dan önce aktivite
- **Beklenen:** EARLY_BIRD hidden achievement tetiklenir

### TC-ACH-08: Aynı Achievement Tekrar Kazanma
- **Senaryo:** Zaten kazanılmış achievement tekrar tetiklenir
- **Beklenen:** Duplicate oluşmaz, ignored edilir

### TC-ACH-09: Achievement Rarity Kontrolü
- **Senaryo:** 40+ achievement'ın her birinin rarity değeri
- **Beklenen:** Rarity = common | rare | epic | legendary — her biri doğru atanmış

---

## Modül 5: Daily Quests (Günlük Görevler)

### TC-DQ-01: Günlük Görev Listesi Getirme
- **Endpoint:** `GET /api/gamification/daily-quests`
- **Beklenen:** 3-4 quest, her birinde type, title, target_amount, current_progress, xp_reward

### TC-DQ-02: Yeni Kullanıcı İçin Görev Üretimi
- **Ön koşul:** Kullanıcı onboarding'den yeni çıkmış (0-48 saat)
- **Beklenen:** Listening-focused görevler (5 dk dinle, içerik seç, içerik oluştur)

### TC-DQ-03: Görev İlerleme Güncelleme
- **Senaryo:** 10 dk dinleme quest'i, kullanıcı 5 dk dinledi
- **Beklenen:** current_progress = 5, quest hâlâ incomplete

### TC-DQ-04: Görev Tamamlama ve Claim
- **Endpoint:** `POST /api/gamification/daily-quests/{questId}/claim`
- **Ön koşul:** Quest progress ≥ target_amount
- **Beklenen:** XP ödülü verilir, quest claimed olarak işaretlenir

### TC-DQ-05: Tamamlanmamış Quest Claim Girişimi
- **Ön koşul:** progress < target_amount
- **Beklenen:** Hata — görev henüz tamamlanmadı

### TC-DQ-06: Aynı Quest Tekrar Claim
- **Ön koşul:** Quest zaten claimed
- **Beklenen:** Hata — zaten talep edilmiş

### TC-DQ-07: Günlük Reset
- **Senaryo:** Gece yarısı (UTC) geçtikten sonra quest listesi yenilenmeli
- **Beklenen:** Yeni günün quest'leri üretilir, dünün tamamlanmamış quest'leri temizlenir

### TC-DQ-08: Görev Tipi Çeşitliliği
- **Beklenen:** Aynı gün içinde aynı task_type'dan birden fazla quest olmamalı

### TC-DQ-09: Roadmap-Linked Quest Önceliği
- **Senaryo:** Aktif roadmap quest'i var
- **Beklenen:** En az 2 daily quest roadmap ile ilişkili

### TC-DQ-10: Sector Daily Quest Üretimi
- **Endpoint:** `POST /api/sectors/{sectorId}/gamification/daily-quests`
- **Ön koşul:** Kullanıcının sector'ü var
- **Beklenen:** 2-3 adet sector-specific quest

---

## Modül 6: Leaderboard ve League Sistemi

### TC-LB-01: Haftalık Leaderboard Getirme
- **Endpoint:** `GET /api/gamification/leaderboard`
- **Beklenen:** Top 30 kullanıcı, rank, XP, streak, league bilgisiyle

### TC-LB-02: Kullanıcının Rank Pozisyonu
- **Senaryo:** Kullanıcı top 30 dışında
- **Beklenen:** Response'ta user_rank ayrıca dönmeli

### TC-LB-03: League Bilgisi Getirme
- **Endpoint:** `GET /api/gamification/my-league`
- **Beklenen:** Kullanıcının mevcut league'i (seed/sprout/sapling/flourish/rooted)

### TC-LB-04: League Terfi Eşikleri
- **Test Verileri:**
  | Haftalık XP | Beklenen League |
  |-------------|----------------|
  | 0-99 | seed |
  | 100-299 | sprout |
  | 300-599 | sapling |
  | 600-999 | flourish |
  | 1000+ | rooted |

### TC-LB-05: Haftalık Score Güncelleme
- **Senaryo:** XP eklendiğinde weekly_scores tablosu güncellenmeli
- **Beklenen:** xp_earned, listening_minutes, content_completed, words_learned doğru artmalı

### TC-LB-06: Sıralama Kriteri
- **Beklenen:** Önce XP DESC, sonra listening_minutes DESC

### TC-LB-07: Promotion/Demotion
- **Senaryo:** Hafta sonu hesaplaması
- **Beklenen:** Top 10 bir üst league'e terfi, bottom 5 bir alt league'e düşüş

---

## Modül 7: Weekly Challenges (Haftalık Mücadeleler)

### TC-WCH-01: Aktif Challenge Listesi
- **Endpoint:** `GET /api/gamification/challenges`
- **Beklenen:** Aktif haftalık challenge'lar, her birinde type, target, XP ödülü, deadline

### TC-WCH-02: Challenge'a Katılma
- **Endpoint:** `POST /api/gamification/challenges/{id}/join`
- **Beklenen:** Kullanıcı challenge'a eklenir, progress 0'dan başlar

### TC-WCH-03: Challenge İlerleme Getirme
- **Endpoint:** `GET /api/gamification/challenges/my-progress`
- **Beklenen:** Katılınan tüm challenge'ların progress bilgisi

### TC-WCH-04: Challenge Tamamlama
- **Senaryo:** Tüm task'lar tamamlandı
- **Beklenen:** is_completed = true, XP ödülü verilir, achievement kontrolü yapılır

### TC-WCH-05: Süresi Dolmuş Challenge'a Katılma
- **Senaryo:** ends_at < şu an
- **Beklenen:** Hata — challenge süresi dolmuş

### TC-WCH-06: Aynı Challenge'a Tekrar Katılma
- **Senaryo:** Zaten katılınmış challenge'a tekrar join
- **Beklenen:** Hata veya idempotent davranış

---

## Modül 8: Streak Society

### TC-SS-01: Streak Society Bilgisi Getirme
- **Endpoint:** `GET /api/gamification/streak-society`
- **Beklenen:** Membership tier, milestone progress, member counts

### TC-SS-02: Tier Eşleşmeleri
- **Test Verileri:**
  | Streak | Beklenen Tier |
  |--------|--------------|
  | 0-6 | Üye değil |
  | 7-29 | Week Warrior |
  | 30-99 | Month Master |
  | 100+ | Legendary |

### TC-SS-03: Bir Sonraki Milestone Hesabı
- **Senaryo:** Streak = 22
- **Beklenen:** Bir sonraki milestone = 30, kalan = 8 gün

---

## Modül 9: Onboarding ve Roadmap

### TC-ONB-01: Dil Seviyesi Değerlendirme
- **Endpoint:** `POST /api/gamification/onboarding/assess`
- **Girdi:** Chat mesajları
- **Beklenen:** CEFR seviyesi tahmini (A1-C2)

### TC-ONB-02: Archetype Listesi
- **Endpoint:** `GET /api/gamification/onboarding/archetypes`
- **Beklenen:** Career, Travel, Intellectual archetypes

### TC-ONB-03: Onboarding Tamamlama
- **Endpoint:** `POST /api/gamification/onboarding/complete`
- **Girdi:** `{ archetype, assessedCEFR, targetCEFR, weeklyMinutes, sectors[] }`
- **Beklenen:** Profil oluşturulur, roadmap üretilir, daily quests başlar

### TC-ONB-04: Onboarding Reset
- **Endpoint:** `POST /api/gamification/onboarding/reset`
- **Beklenen:** Profil, quest progress, daily quests, achievements, XP sıfırlanır

### TC-ONB-05: Onboarding Reset Limiti
- **Senaryo:** Aynı gün 3. kez reset
- **Beklenen:** Hata — günlük reset limiti (3) aşıldı

### TC-ONB-06: Roadmap Getirme
- **Endpoint:** `GET /api/gamification/roadmap`
- **Beklenen:** Quest node listesi, her birinde status (not_started/in_progress/completed)

---

## Modül 10: Quest Sistemi

### TC-QST-01: Quest Başlatma
- **Endpoint:** `POST /api/gamification/quests/{nodeId}/start`
- **Beklenen:** Quest status = in_progress

### TC-QST-02: Quest Tamamlama
- **Endpoint:** `POST /api/gamification/quests/{nodeId}/complete`
- **Girdi:** `{ score: 85 }`
- **Beklenen:** Quest completed, XP ödülü, bir sonraki quest açılır

### TC-QST-03: Quest Auto-Complete
- **Endpoint:** `POST /api/gamification/quests/auto-complete`
- **Girdi:** `{ type: "listen", verificationData: {...} }`
- **Beklenen:** İlgili roadmap quest'i otomatik tamamlanır

### TC-QST-04: Geçersiz NodeId
- **Girdi:** nodeId = -1
- **Beklenen:** Validation hatası

### TC-QST-05: Geçersiz Auto-Complete Type
- **Girdi:** `{ type: "invalid_type" }`
- **Beklenen:** Validation hatası — valid types: listen, vocabulary, quiz, reading, speaking, milestone, content

---

## Modül 11: Sector Gamification

### TC-SG-01: Sector Progress Getirme
- **Endpoint:** `GET /api/sectors/{sectorId}/gamification/progress`
- **Beklenen:** vocabulary, content, modules progress + totalXP + sectorStreak

### TC-SG-02: Tüm Sector İstatistikleri
- **Endpoint:** `GET /api/sectors/gamification/all-stats`
- **Beklenen:** Kullanıcının tüm sector'lerinin gamification istatistikleri

### TC-SG-03: Sector Aktivite Kaydetme (Roleplay)
- **Endpoint:** `POST /api/sectors/{sectorId}/gamification/activity`
- **Girdi:**
  ```json
  {
    "activityType": "sector_roleplay_complete",
    "sourceId": 42,
    "metadata": {
      "completedTurns": 8,
      "totalTurns": 10,
      "practiceTime": 300,
      "vocabularyLearned": ["negotiate", "deadline"],
      "playMode": "practice"
    }
  }
  ```
- **Beklenen:** XP kazanılır, sector stats güncellenir, streak kontrolü yapılır, achievement kontrolü yapılır

### TC-SG-04: Sector Aktivite Kaydetme (Podcast)
- **Girdi:** activityType = "sector_podcast_complete"
- **Beklenen:** XP + streak + achievement kontrolleri

### TC-SG-05: Sector Streak (Ardışık Gün)
- **Senaryo:** Sector'de ardışık gün aktivite
- **Beklenen:** sector_streak artır, milestone'larda bonus XP

### TC-SG-06: Sector Streak Sıfırlanma
- **Senaryo:** 2+ gün sector aktivitesi yok
- **Beklenen:** sector_streak = 0

### TC-SG-07: Perfect Score Bonus
- **Senaryo:** Quiz'de %100 doğru
- **Beklenen:** 1.5x XP multiplier

### TC-SG-08: High Score Bonus
- **Senaryo:** Quiz'de %80+ doğru (perfect değil)
- **Beklenen:** 1.25x XP multiplier

---

## Modül 12: Sector Challenges

### TC-SCH-01: Sector Challenge Listesi
- **Endpoint:** `GET /api/sectors/{sectorId}/challenges`
- **Beklenen:** Aktif challenge'lar, difficulty, target, XP bilgisiyle

### TC-SCH-02: Challenge Detay Getirme
- **Endpoint:** `GET /api/sectors/{sectorId}/challenges/{challengeId}`
- **Beklenen:** Tek challenge detayı

### TC-SCH-03: Challenge'a Katılma
- **Endpoint:** `POST /api/sectors/{sectorId}/challenges/{challengeId}/join`
- **Beklenen:** Kullanıcı eklenir, progress 0

### TC-SCH-04: Challenge İlerleme Güncelleme
- **Endpoint:** `PUT /api/sectors/{sectorId}/challenges/{challengeId}/progress`
- **Girdi:** `{ incrementBy: 1 }`
- **Beklenen:** Progress artır

### TC-SCH-05: Challenge Leaderboard
- **Endpoint:** `GET /api/sectors/{sectorId}/challenges/{challengeId}/leaderboard`
- **Beklenen:** Top 10 katılımcı, user rank, progress

### TC-SCH-06: Challenge Stats
- **Endpoint:** `GET /api/sectors/{sectorId}/challenge-stats`
- **Beklenen:** total_joined, total_completed, total_xp_earned, win_rate, best_rank

### TC-SCH-07: Challenge Tipleri
- **6 template kontrol:** vocabulary_master, content_champion, roleplay_expert, podcast_listener, streak_warrior, quiz_master
- **Her birinin:** XP ödülü, bonus XP, target doğru mu?

---

## Modül 13: Recommendation & Learning Path

### TC-REC-01: Kişiselleştirilmiş Öneriler
- **Endpoint:** `GET /api/sectors/{sectorId}/recommendations?limit=5`
- **Beklenen:** ContentRecommendation[], her birinde score ve recommendation_reason

### TC-REC-02: Next Best Content
- **Endpoint:** `GET /api/sectors/{sectorId}/next-best`
- **Beklenen:** type (continue/vocabulary_review/new_content), reason

### TC-REC-03: Learning Path
- **Endpoint:** `GET /api/sectors/{sectorId}/learning-path`
- **Beklenen:** Steps listesi, completion_percentage, user_level

### TC-REC-04: Vocabulary Recommendations
- **Endpoint:** `GET /api/sectors/{sectorId}/vocabulary-recommendations?mode=mixed`
- **Beklenen:** review_words + new_words, total_due, total_new

### TC-REC-05: Daily Summary
- **Endpoint:** `GET /api/sectors/{sectorId}/daily-summary`
- **Beklenen:** Greeting, next_action, vocabulary_due, today_stats, motivational_message

---

## Modül 14: Frontend UI Testleri

### TC-UI-01: LevelProgressBar Gösterimi
- **Sayfa:** Dashboard header
- **Beklenen:** Mevcut level, XP bar, streak sayısı doğru gösterilir

### TC-UI-02: Level Up Modal
- **Tetikleyici:** XP eklendikten sonra level değişimi
- **Beklenen:** Confetti animasyonu, eski→yeni level animasyonu, CEFR gösterimi

### TC-UI-03: Achievement Modal
- **Tetikleyici:** Yeni achievement kazanılması
- **Beklenen:** Rarity'ye göre renk/stil, XP ödülü gösterimi, spinning ring animasyonu

### TC-UI-04: DailyQuestsCard Gösterimi
- **Sayfa:** Dashboard
- **Beklenen:** 3-4 quest, progress bar'lar, claim butonu (tamamlananlar için pulsing)

### TC-UI-05: Leaderboard Gösterimi
- **Sayfa:** Dashboard
- **Beklenen:** Top 10, madalya ikonları (top 3), kullanıcı pozisyonu, league renkleri

### TC-UI-06: WeeklyChallenges Gösterimi
- **Sayfa:** Dashboard
- **Beklenen:** Challenge kartları, progress bar, join butonu, kalan gün sayacı

### TC-UI-07: StreakSociety Gösterimi
- **Sayfa:** Dashboard
- **Beklenen:** Tier gösterimi, milestone progress, üye sayıları

### TC-UI-08: GamificationBanner Öncelik Mantığı
- **Senaryolar:**
  1. Streak risk altında (bugün aktivite yok + streak var) → Streak uyarısı
  2. Challenge deadline yakın (3 gün kala) → Challenge hatırlatması
  3. Yeni kullanıcı → Onboarding prompt
  4. Dönen kullanıcı → Hoşgeldin kartı

### TC-UI-09: SectorProgressCard
- **Sayfa:** Sector detay sayfası
- **Beklenen:** Vocabulary (%40), Content (%40), Modules (%20) ağırlıklı progress circle

### TC-UI-10: SectorChallengeHub Tabs
- **Beklenen:** Active, Completed, Stats sekmeleri çalışır, geçişlerde veri yüklenir

### TC-UI-11: Quest Claim Butonu Durumları
- **Tamamlanmamış:** Disabled, gri
- **Tamamlanmış:** Pulsing animasyon, yeşil
- **Claimed:** Checkmark, disabled

### TC-UI-12: Ses Efektleri
- **xp-gain.mp3:** XP kazanıldığında çalar
- **level-up.mp3:** Level up olduğunda çalar
- **achievement.mp3:** Achievement açıldığında çalar
- **Volume:** %30, ses dosyası yoksa sessiz fail

---

## Modül 15: Güvenlik ve Edge Case'ler

### TC-SEC-01: Rate Limiting — XP Endpoint
- **Senaryo:** Hızlı ardışık 100+ XP isteği
- **Beklenen:** Rate limiter devreye girer

### TC-SEC-02: Rate Limiting — Quest Claim
- **Senaryo:** Hızlı ardışık claim denemeleri
- **Beklenen:** Rate limiter devreye girer

### TC-SEC-03: Race Condition — Eşzamanlı XP Ekleme
- **Senaryo:** 2 paralel XP ekleme isteği
- **Beklenen:** FOR UPDATE ile lock, doğru toplam XP, duplicate yok

### TC-SEC-04: Race Condition — Eşzamanlı Streak Check-in
- **Senaryo:** 2 paralel check-in isteği
- **Beklenen:** Streak sadece 1 artar

### TC-SEC-05: SQL Injection Kontrolü
- **Girdi:** sourceId = "'; DROP TABLE users; --"
- **Beklenen:** Parameterized query ile güvenli, hata fırlatmaz

### TC-SEC-06: Başka Kullanıcının Verisine Erişim
- **Senaryo:** UserA, UserB'nin achievement/quest verilerini getirmeye çalışır
- **Beklenen:** Sadece kendi verileri döner

### TC-SEC-07: Onboarding Reset Sınırı (3/gün)
- **Senaryo:** 4. reset girişimi
- **Beklenen:** Rate limit hatası

---

## Modül 16: Entegrasyon Testleri

### TC-INT-01: İçerik Dinleme → XP + Quest + Streak + Achievement Akışı
- **Senaryo:** Kullanıcı 10 dk içerik dinler
- **Beklenen Zincir:**
  1. XP eklenir (10 XP/dk = 100 XP)
  2. Listening daily quest progress güncellenir
  3. Streak check-in yapılır
  4. Achievement kontrolü (listening milestone)
  5. Weekly score güncellenir
  6. Challenge progress güncellenir (katılınmışsa)

### TC-INT-02: Quiz Tamamlama → XP + Achievement + Challenge
- **Senaryo:** Quiz %100 doğru
- **Beklenen:** quiz_complete XP + quiz_perfect_score bonus + quiz achievement + challenge progress

### TC-INT-03: Sector Roleplay → XP + Sector Stats + Achievement
- **Senaryo:** Roleplay tamamlama
- **Beklenen:** Roleplay XP + sector stats update + sector streak + achievement check

### TC-INT-04: Level Up Zinciri
- **Senaryo:** XP ekleme → level up → achievement → leaderboard update
- **Beklenen:** Tüm zincir atomik ve doğru sırada çalışır

### TC-INT-05: Haftalık Döngü
- **Senaryo:** Hafta sonu → yeni hafta başlangıcı
- **Beklenen:** Leaderboard sıfırlanır, league promotion/demotion, yeni challenge'lar

---

## Özet

| Modül | Test Sayısı |
|-------|------------|
| XP Sistemi | 7 |
| Level Sistemi | 4 |
| Streak Sistemi | 10 |
| Achievement Sistemi | 9 |
| Daily Quests | 10 |
| Leaderboard & League | 7 |
| Weekly Challenges | 6 |
| Streak Society | 3 |
| Onboarding & Roadmap | 6 |
| Quest Sistemi | 5 |
| Sector Gamification | 8 |
| Sector Challenges | 7 |
| Recommendations | 5 |
| Frontend UI | 12 |
| Güvenlik & Edge Cases | 7 |
| Entegrasyon | 5 |
| **TOPLAM** | **111** |
