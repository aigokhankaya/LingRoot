# 🎮 LingRoot Akıllı Yönlendirme Sistemi (Smart Flow)

> **Son Güncelleme:** 2025-12-27
> **Doküman Sahibi:** Gamification Team

---

## 📋 GÖREV TÜRLERİ VE XP DEĞERLERİ

### 🎯 Temel Aktiviteler

| Görev Kodu | Açıklama | XP | Koşul | Tetikleyen |
|------------|----------|-----|-------|------------|
| `word_review` | Kelime kartı tekrarı | +3 | Doğru cevap | FlashcardDeck |
| `word_learned` | Yeni kelime öğrenme | +5 | SRS'e ekleme | Vocabulary |
| `word_mastered` | Kelime ustalaşma | +20 | Streak > 5 | SRS Algorithm |
| `listen_minutes` | Dakika başına dinleme | +10/dk | Her dakika | AudioPlayer |
| `content_complete` | İçerik tamamlama | +100 | %100 dinleme | OutputSection |
| `create_content` | İçerik oluşturma | +100 | Yeni içerik | Welcome Page |
| `quiz_complete` | Quiz tamamlama | +50 | Quiz bitirme | ContentQuizModal |
| `quiz_perfect` | Mükemmel quiz | +100 | %100 doğru | ContentQuizModal |
| `daily_streak` | Günlük giriş | +25 | Günlük aktif | Login |

### 📅 Günlük Görevler (Daily Quests)

Sistem her gün 3 rastgele görev atar:

```javascript
const questTemplates = [
    { type: 'listen_minutes', title: '10 dakika dinle', target: 10, xp: 50 },
    { type: 'learn_words', title: '5 kelime öğren', target: 5, xp: 30 },
    { type: 'review_words', title: '10 kelime tekrar et', target: 10, xp: 40 },
    { type: 'complete_content', title: '1 içerik tamamla', target: 1, xp: 75 },
    { type: 'create_content', title: 'Yeni içerik oluştur', target: 1, xp: 100 },
    { type: 'listen_content', title: 'İçerik dinle', target: 1, xp: 50 },
    { type: 'complete_quiz', title: 'Quiz tamamla', target: 1, xp: 50 },
];
```

---

## 🔄 AKILLI YÖNLENDİRME KURALLARI

### Temel İlke
> "Bir görev bittiğinde, kullanıcıyı öğrenme döngüsünde mantıklı bir sonraki adıma yönlendir."

### Yönlendirme Matrisi

```
┌────────────────────┬─────────────────────────────────────────────┐
│ TAMAMLANAN GÖREV   │ ÖNERİLEN SONRAKI GÖREV                      │
├────────────────────┼─────────────────────────────────────────────┤
│ Kelime Çalışması   │ → İçerik Oluştur (öğrendiğin kelimeleri    │
│ (review_words)     │   kullanarak pratik yap)                    │
├────────────────────┼─────────────────────────────────────────────┤
│ İçerik Oluşturma   │ → Dinlemeye Başla (oluşturduğun içeriği    │
│ (create_content)   │   hemen dinle)                              │
├────────────────────┼─────────────────────────────────────────────┤
│ Dinleme Tamamlama  │ → Quiz Çöz (dinlediğin içerikten anlama    │
│ (content_complete) │   testi)                                    │
├────────────────────┼─────────────────────────────────────────────┤
│ Quiz Tamamlama     │ → Kelimeleri Kaydet (quizdeki bilinmeyen   │
│ (quiz_complete)    │   kelimeleri SRS'e ekle)                    │
├────────────────────┼─────────────────────────────────────────────┤
│ Kelime Ekleme      │ → Kelime Çalışması (yeni kelimeleri hemen  │
│ (word_learned)     │   çalış) veya Dashboard'a dön               │
└────────────────────┴─────────────────────────────────────────────┘
```

### Öncelik Sırası

Kullanıcıya görev önerirken şu sırayı takip et:

1. **Acil Görevler** - Bekleyen SRS kartları (due_count > 0)
2. **Yarım Kalan İçerik** - %90'dan az dinlenen içerikler
3. **Günlük Görevler** - Tamamlanmamış daily quests
4. **Yeni İçerik** - Hiç içerik yoksa oluşturmaya yönlendir
5. **Keşif** - Yeni konular öner

---

## 💾 VERİ KAYITLARI

### Backend Tabloları

| Tablo | Amaç |
|-------|------|
| `user_gamification` | Level, XP, streak bilgileri |
| `xp_transactions` | Tüm XP kazanımlarının logu |
| `daily_quests` | Günlük görev durumları |
| `user_achievements` | Kazanılan başarımlar |
| `contenthistory` | Dinleme geçmişi ve ilerleme |
| `user_vocabulary` | Kelime SRS durumları |

### Frontend State

```typescript
// useGamification hook'u tüm durumu yönetir:
{
  stats: { level, totalXp, currentXp, xpForNext, streak },
  dailyQuests: Quest[],
  achievements: Achievement[],
  recentXP: { amount, source }  // Son kazanılan XP
}
```

---

## 🔧 ENTEGRASYON NOKTALARI

### XP Kazanma Tetikleyicileri

1. **Kelime Review** → `srsService.processReview()` → `gamificationService.addXP()`
2. **İçerik Oluşturma** → `contentController.submitContent()` → `gamificationService.addXP()`
3. **Dinleme Tamamlama** → `contentController.updateProgress()` → `gamificationService.addXP()`
4. **Quiz** → `contentController.submitQuiz()` → `gamificationService.addXP()`

### Frontend Geri Bildirim

XP kazanıldığında kullanıcıya gösterilmeli:
1. **Toast/Notification:** "+50 XP kazandın!"
2. **Level Bar Animasyonu:** XP bar dolumu
3. **Level Up Modal:** Yeni seviye kutlaması

---

## 📱 KULLANICI ARAYÜZÜ

### Session Tamamlama Ekranı

```
┌─────────────────────────────────────┐
│           🎉 Harika İş!             │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │  15   │ │  87%  │ │ +45   │     │
│  │Kelime │ │Doğru  │ │  XP   │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  [🎙️ Yeni İçerik Oluştur]          │ ← Primary Action
│  [📚 Devam Et] [🔄 Tekrar]         │ ← Secondary
│                                     │
│  💡 Öneri: Bugün 10 kelime daha    │
│     çalışırsan günlük görevini      │
│     tamamlarsın!                    │
└─────────────────────────────────────┘
```

---

## ⚙️ KONFİGÜRASYON

### XP Değerleri (Ayarlanabilir)

```javascript
// backend/services/gamificationService.js
const XP_REWARDS = {
    WORD_REVIEW_CORRECT: 3,
    WORD_LEARNED: 5,
    WORD_MASTERED: 20,
    CONTENT_LISTEN_PER_MINUTE: 10,
    CONTENT_COMPLETE: 100,
    PODCAST_COMPLETE: 150,
    QUIZ_COMPLETE: 50,
    QUIZ_PERFECT_SCORE: 100,
    DAILY_QUEST_COMPLETE: 50,
    STREAK_DAILY: 25,
};
```

---

## 📝 NOTLAR

1. **XP Dengeleme:** Değerler testlerle optimize edilmeli
2. **Spam Koruması:** Aynı kelime için tekrar XP verilmemeli (24 saat cooldown)
3. **Motivasyon:** Küçük ama sık ödüller > Büyük nadir ödüller
4. **Görsellik:** Her XP kazanımı görsel feedback olmalı

---

*Bu doküman PROJECT_MEMORY.md ile senkron tutulmalıdır.*
