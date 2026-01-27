# 🎮 Quiz Engine Enhancements

> **Oluşturulma:** 2026-01-23 | **Güncelleme:** 2026-01-23 | **Versiyon:** 1.0

---

## 📋 ÖZET

Content Quiz sistemi aşağıdaki pedagojik iyileştirmelerle güçlendirildi:

1. **Çoklu Soru Tipi Desteği** - MC, Cloze, Matching
2. **Akıllı Distractor Seçimi** - Semantik ve fonetik benzerlik
3. **SRS Entegrasyonu** - Yanlış cevaplar otomatik tekrar listesine
4. **Adaptif Zorluk** - Kullanıcı performansına göre
5. **Zengin Geri Bildirim** - Açıklamalar ve sonraki adım önerileri

---

## 🔄 DEĞİŞİKLİKLER

### Backend

#### `contentController.js`

| Fonksiyon | Değişiklik |
|-----------|------------|
| `generateQuiz` | Quiz Engine entegrasyonu, çoklu tip, SRS kelimeleri |
| `submitQuiz` | Quiz Engine değerlendirme, SRS sync, word attempt kaydı |
| `generateSmartQuestion` | Yeni - tip bazlı soru üretimi |
| `generateMCQuestion` | Yeni - akıllı MC soru üretimi |
| `generateClozeQuestion` | Yeni - boşluk doldurma sorusu |
| `selectSmartDistractors` | Yeni - pedagojik distractor seçimi |
| `generateNextActions` | Yeni - performansa göre öneri |

### Frontend

#### `ContentQuizModal.tsx`

| Özellik | Açıklama |
|---------|----------|
| Çoklu soru tipi UI | MC, Cloze, Matching için ayrı render |
| SRS sync gösterimi | Yanlış kelimeler listesi |
| Level up animasyonu | Animasyonlu bildrim |
| Next actions | Akıllı sonraki adım önerileri |

#### `api.ts`

```typescript
// Eski
export const submitContentQuiz = async (contentId: string, answers: any)

// Yeni  
export const submitContentQuiz = async (contentId: string, answers: any, questions?: any[])
```

---

## 📝 API DEĞİŞİKLİKLERİ

### GET `/api/content/:id/quiz`

#### Yeni Query Parametreleri:
- `count` (number) - Soru sayısı (varsayılan: 5, max: 7)
- `types` (string) - Virgülle ayrılmış tipler: `multiple_choice,cloze,matching`
- `difficulty` (number) - Zorluk seviyesi 1-5 (boş = adaptif)

#### Yeni Yanıt Formatı:
```json
{
  "success": true,
  "data": {
    "contentId": "uuid",
    "totalQuestions": 5,
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "word": "sustainable",
        "question": "\"sustainable\" kelimesinin anlamı nedir?",
        "options": ["sürdürülebilir", "geçici", "hızlı", "karmaşık"],
        "correct": 0,
        "points": 10,
        "difficulty": 3,
        "explanation": { "tr": "sustainable: sürdürülebilir", "en": null },
        "priority": "content"
      },
      {
        "id": 2,
        "type": "cloze",
        "word": "innovation",
        "question": "Boşluğu doldurun: \"The company focuses on _____\"",
        "correct": "innovation",
        "acceptAlternatives": ["innovation", "INNOVATION"]
      }
    ],
    "metadata": {
      "cefrLevel": "B1",
      "recommendedDifficulty": 3,
      "includedTypes": ["multiple_choice", "cloze"],
      "srsWordsIncluded": 2,
      "strugglingWordsIncluded": 1
    }
  }
}
```

### POST `/api/content/:id/quiz/submit`

#### Yeni Request Body:
```json
{
  "answers": [
    { "questionId": 1, "word": "sustainable", "selectedAnswer": 0, "type": "multiple_choice" },
    { "questionId": 2, "word": "innovation", "selectedAnswer": "innovation", "type": "cloze" }
  ],
  "questions": [/* optional - orijinal sorular */]
}
```

#### Yeni Yanıt Formatı:
```json
{
  "success": true,
  "data": {
    "score": 80,
    "correctCount": 4,
    "wrongCount": 1,
    "totalQuestions": 5,
    "passed": true,
    "xpEarned": 72,
    "detailedAnswers": [
      {
        "questionId": 1,
        "word": "sustainable",
        "isCorrect": true,
        "userAnswer": 0,
        "correctAnswer": 0,
        "feedback": "Doğru!",
        "explanation": { "tr": "sustainable: sürdürülebilir" }
      }
    ],
    "srsSync": {
      "synced": 1,
      "wordsToReview": ["innovation"]
    },
    "levelProgress": {
      "currentLevel": 5,
      "xpInLevel": 120,
      "xpForNextLevel": 200,
      "leveledUp": false
    },
    "nextActions": [
      { "type": "review_words", "title": "Kelimeleri Çalış", "description": "1 kelimeyi tekrar et", "route": "/vocabulary?mode=due", "priority": 1 }
    ]
  }
}
```

---

## 🧠 PEDAGOJİK YAPISAL DEĞİŞİKLİKLER

### 1. Akıllı Distractor Seçimi

Rastgele seçim yerine **skor tabanlı** seçim:

```javascript
// Distractor puanlaması
score += commonWords.length * 2;       // Semantik benzerlik
score += firstLetterMatch ? 1 : 0;     // Fonetik benzerlik  
score += similarLength ? 1 : 0;        // Uzunluk benzerliği
score += samePOS ? 2 : 0;              // Kelime türü eşleşmesi
```

### 2. Kelime Havuzu Önceliklendirme

```
Öncelik 1: SRS'ten gelen "due" kelimeler (max 2)
Öncelik 2: Daha önce yanlış yapılan kelimeler (max 2)
Öncelik 3: İçerikteki kelimeler (kalan)
```

### 3. XP Hesaplama İyileştirmesi

| Durum | XP |
|-------|-----|
| Geçti (base) | 50 |
| Perfect Score | 100 |
| Skor bonusu | +2 per %10 |
| Geçemedi (base) | 25 |
| %50+ effort bonus | +10 |

---

## 🔮 GELECEK GELİŞTİRMELER

- [ ] Spiral öğrenme takvimi (kelime-bazlı tekrar)
- [ ] Speaking/Pronunciation soruları (STT)
- [ ] Comprehension soruları (içerik anlama)
- [ ] Distractor veritabanı (false cognates, confusing pairs)
- [ ] Real-time feedback (soru bazlı anında geri bildirim)

---

*Bu doküman PROJECT_MEMORY.md ile senkron tutulmalıdır.*
