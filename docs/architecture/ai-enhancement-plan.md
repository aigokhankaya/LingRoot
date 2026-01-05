# LingRoot AI Enhancement - Implementation Plan

**Proje Kodu:** LR-AI-ENH-2026  
**Hazırlayan:** Antigravity (Claude Opus 4.5 Thinking)  
**Tarih:** 3 Ocak 2026  
**Yaklaşım:** Iterative, Test-Driven, Mevcut Sistemlere Uyumlu

---

## 📋 Executive Summary

Bu plan, LingRoot'un mevcut güçlü altyapısını (`userInsightService.js`, `userProfileAnalyzer.js`, `content_ratings`) genişleterek:

✅ **Kullanıcı Tanıma:** Insight embedding + feedback loop  
✅ **Eğitim Süreci:** SRS (Spaced Repetition) + Topic Mastery  
✅ **Aktif Kullanım:** Adaptif seviye önerileri + smart suggestions

> **ÖNEMLİ:** Bu plan, önceki €214K önerisinden farklı olarak mevcut sistemleri **genişletmeye** odaklanır. Yeni altyapı kurulmaz, mevcut yapı güçlendirilir.

---

## 🎯 Hedefler ve Metrikler

| Hedef | Mevcut | Hedef | Ölçüm |
|-------|--------|-------|-------|
| Kullanıcı Engagement | 40% | 60%+ | DAU/MAU ratio |
| İçerik Tamamlama | 55% | 75%+ | avg_completion_percentage |
| Kelime Kalıcılığı | (ölçülmüyor) | 70%+ | 30-day recall rate |
| Seviye Uyumu | Manuel | Otomatik | skip rate < 15% |

---

## 🏗️ Mimari Prensipler

### LingRoot Uyumluluk Kuralları

```yaml
# PROJECT_MEMORY.md'den
Rules:
  - Audio pipeline sırası: Whisper → Clean → Adapt → TTS → MFA → VTT
  - Prompt output formatları değiştirilemez
  - API sözleşmesi (Web + Mobile) tek şema
  - Supabase tablo kolonları varsayılmaz, sadece bilinen şema
```

### Implementasyon Prensipleri

1. **Küçük, Geri Alınabilir Değişiklikler** - Her PR tek bir özellik
2. **Backward Compatible** - Mevcut API'lar bozulmaz
3. **Feature Flags** - Yeni özellikler flag ile kontrol edilir
4. **Test First** - Her değişiklik test edilir

---

## 📅 Faz Planlaması

| Faz | İçerik | Süre | Bağımlılık |
|-----|--------|------|------------|
| **Faz 1** | Smart Feedback Integration | 2-3 gün | Migration 055 ✅ |
| **Faz 2** | SRS (Spaced Repetition) Sistemi | 3-4 gün | Faz 1 |
| **Faz 3** | Topic Mastery Tracking | 2-3 gün | Faz 1 |
| **Faz 4** | User Insight Embedding | 2-3 gün | Faz 1-3 |

---

# FAZ 1: Smart Feedback Integration

**Süre:** 2-3 gün  
**Bağımlılık:** Migration 055 (content_ratings) ✅ tamamlanmış

## Değişiklikler

### 1. userInsightService.js - Content Rating Integration

Content ratings'den otomatik insight extraction ekle:

```javascript
async processContentRating(userId, contentId, rating, feedbackType = null) {
  // 1. İçerik bilgilerini al
  const content = await db.query(
    `SELECT input, input_type, level FROM contenthistory WHERE id = $1`,
    [contentId]
  );
  
  if (!content.rows[0]) return;
  const { input: topic, input_type, level } = content.rows[0];
  
  // 2. Rating'e göre insight oluştur
  if (rating === 1) {
    await this.storeInsight(userId, 'like', topic, 80);
    await this.storeInsight(userId, 'preference', `${level} seviyesinde içerik`, 70);
  } else if (rating === -1) {
    if (feedbackType === 'too_difficult') {
      await this.storeInsight(userId, 'preference', `${level} seviyesi zor geliyor`, 85);
    } else if (feedbackType === 'boring') {
      await this.storeInsight(userId, 'dislike', topic, 75);
    }
  }
}
```

### 2. feedbackLoopService.js (YENİ)

Kullanıcı davranış pattern'larını analiz et:

- `calculateOptimalLevel(userId)` - Adaptif CEFR seviye önerisi
- `getPreferredContentType(userId)` - Tercih edilen format analizi
- `generateAdaptiveContext(userId)` - Liro için context oluştur

### 3. Liro Integration

`liroPromptGenerator.js`'e adaptive context ekle.

---

# FAZ 2: SRS (Spaced Repetition) Sistemi

**Süre:** 3-4 gün

## Database

Migration: `056_srs_word_reviews.sql`

```sql
CREATE TABLE word_reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    word VARCHAR(100) NOT NULL,
    word_translation VARCHAR(200),
    context_sentence TEXT,
    
    -- SM-2 Algorithm fields
    next_review_date DATE DEFAULT CURRENT_DATE,
    interval_days INTEGER DEFAULT 1,
    ease_factor DECIMAL(5,2) DEFAULT 2.5,
    repetition_count INTEGER DEFAULT 0,
    streak_correct INTEGER DEFAULT 0,
    
    UNIQUE(user_id, word)
);
```

## API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/srs/due` | GET | Bugün tekrar edilecek kelimeler |
| `/api/srs/review` | POST | Tekrar sonucunu işle |
| `/api/srs/words` | POST | Yeni kelime ekle |
| `/api/srs/stats` | GET | SRS istatistikleri |

---

# FAZ 3: Topic Mastery Tracking

**Süre:** 2-3 gün

## Database

Migration: `057_topic_mastery.sql`

```sql
CREATE TABLE user_topic_mastery (
    user_id UUID REFERENCES users(id),
    topic_node_id INTEGER REFERENCES topic_nodes(id),
    
    content_completed INTEGER DEFAULT 0,
    content_total INTEGER DEFAULT 0,
    mastery_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'not_started',
    
    PRIMARY KEY (user_id, topic_node_id)
);
```

## Özellikler

- Konu bazlı ilerleme takibi
- Mastery score hesaplama (completion + rating + listening)
- Status: not_started → in_progress → completed → mastered

---

# FAZ 4: User Insight Embedding

**Süre:** 2-3 gün

## Database

Migration: `058_user_embedding.sql`

```sql
ALTER TABLE users ADD COLUMN insight_embedding VECTOR(1536);
CREATE INDEX idx_users_insight_embedding ON users 
USING ivfflat (insight_embedding vector_cosine_ops);
```

## Özellikler

- Insight'lardan embedding oluşturma
- Benzer kullanıcı bulma (cosine similarity)
- "Senin gibi düşünenler bunu beğendi" önerileri

---

## Rollout Strategy

| Hafta | Özellik | Rollout |
|-------|---------|---------|
| **1** | Feedback Loop | 100% |
| **2** | SRS System | 50% A/B test |
| **3** | SRS System | 100% |
| **4** | Topic Mastery | 100% |
| **5** | User Embedding | 20% beta |
| **6** | User Embedding | 100% |

---

## Success Metrics

| Metric | Baseline | Week 2 | Week 6 |
|--------|----------|--------|--------|
| Content Completion | 55% | 60% | 75% |
| Return Rate (7-day) | 40% | 45% | 55% |
| SRS Words Learned | 0 | 50 avg | 200 avg |
| Skip Rate | 25% | 20% | 15% |

---

## İlgili Dokümanlar

- [PROJECT_MEMORY.md](../../PROJECT_MEMORY.md)
- [gamification-strategy.md](./gamification-strategy.md)
- [ai-enhancement-analysis.md](../review/ai-enhancement-analysis.md)
