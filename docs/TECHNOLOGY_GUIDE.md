# LingRoot - Teknoloji ve Yetenekler Kılavuzu
> **Oluşturulma:** 2026-01-03 | **Güncelleme:** 2026-01-03 | **Versiyon:** 2.0

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Temel Teknolojiler](#temel-teknolojiler)
3. [AI ve Makine Öğrenimi](#ai-ve-makine-öğrenimi)
4. [Ses İşleme Pipeline](#ses-işleme-pipeline)
5. [Öğrenme Sistemleri](#öğrenme-sistemleri)
6. [Veritabanı ve Altyapı](#veritabanı-ve-altyapı)
7. [Frontend Teknolojileri](#frontend-teknolojileri)
8. [Güvenlik ve Stabilite](#güvenlik-ve-stabilite)

---

## 🎯 Genel Bakış

**LingRoot**, yapay zeka destekli **kişiselleştirilmiş dil öğrenme platformudur**. Kullanıcıların ilgi alanlarına göre içerik üreten, sesli podcast'ler oluşturan ve bilimsel yöntemlerle kelime öğreten akıllı bir asistan sunar.

### Ne Yapar?

| Özellik | Açıklama |
|---------|----------|
| 🎧 **Podcast Üretimi** | İstediğiniz konuda AI tarafından yazılmış, profesyonel sesle okunan podcast'ler |
| 🗣️ **Telaffuz Analizi** | Konuşmanızı dinleyip hataları tespit eden ve düzelten sistem |
| 📚 **Akıllı Kelime Tekrarı** | Bilimsel SM-2 algoritması ile kelime kalıcılığını %70+ artıran sistem |
| 🤖 **Liro AI Asistan** | Sizi tanıyan, tercihlerinizi öğrenen kişisel dil öğretmeni |
| 🎮 **Gamification** | Rozetler, streak'ler ve quest'lerle motivasyon artırıcı oyunlaştırma |

---

## 🔧 Temel Teknolojiler

### Backend (Sunucu Tarafı)

| Teknoloji | Ne Yapar? | Neden Kullanıyoruz? |
|-----------|-----------|---------------------|
| **Node.js** | JavaScript runtime | Hızlı, ölçeklenebilir API'lar için |
| **Express.js** | Web framework | RESTful API endpoint'leri oluşturmak için |
| **PostgreSQL** | Veritabanı | Güvenilir, ACID-uyumlu veri depolama |
| **Supabase** | Backend-as-a-Service | Auth, Realtime, Storage hizmetleri |

### Frontend (Kullanıcı Arayüzü)

| Teknoloji | Ne Yapar? | Neden Kullanıyoruz? |
|-----------|-----------|---------------------|
| **Next.js 14** | React framework | SSR, routing, performans optimizasyonu |
| **TypeScript** | Tip güvenli JavaScript | Hata önleme, kod kalitesi |
| **Tailwind CSS** | Utility-first CSS | Hızlı, tutarlı tasarım |
| **Framer Motion** | Animasyon kütüphanesi | Akıcı, profesyonel animasyonlar |

---

## 🧠 AI ve Makine Öğrenimi

### OpenAI Entegrasyonu

| Model | Ne Yapar? | Kullanım Alanı |
|-------|-----------|----------------|
| **GPT-4o** | Metin üretimi | Podcast scriptleri, sohbet, içerik |
| **GPT-4o-mini** | Hafif metin işleme | Hızlı yanıtlar, basit görevler |
| **Whisper** | Ses → Metin | Kullanıcı telaffuz analizi |
| **text-embedding-3-small** | Metin → Vektör | Kullanıcı benzerliği, öneriler |

### Liro - AI Dil Asistanı

```
Liro, kullanıcıyı "tanıyan" bir yapay zeka asistanıdır:

✅ Tercihlerinizi öğrenir (hangi konuları seviyorsunuz?)
✅ Seviyenizi adapte eder (çok zor/kolay içerik önermez)
✅ İlerlemenizi takip eder (hangi kelimeleri biliyorsunuz?)
✅ Kişiselleştirilmiş feedback verir
```

**Nasıl Çalışır?**

1. **userInsightService** → Sohbetlerden tercihler çıkarır
2. **feedbackLoopService** → Rating'lerden optimal seviye hesaplar
3. **userEmbeddingService** → Benzer kullanıcıları bulur, öneriler sunar

---

## 🎙️ Ses İşleme Pipeline

LingRoot'un en güçlü özelliklerinden biri **uçtan uca ses işleme pipeline'ıdır**.

### Pipeline Akışı

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Whisper   │ →  │    Clean    │ →  │    Adapt    │
│  (STT/ASR)  │    │  (Temizle)  │    │ (Seviyele)  │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     VTT     │ ←  │     MFA     │ ←  │     TTS     │
│  (Altyazı)  │    │ (Senkron)   │    │   (Sesle)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Teknoloji Detayları

| Adım | Teknoloji | Ne Yapar? |
|------|-----------|-----------|
| **Whisper** | OpenAI Whisper | Ses dosyasını metne çevirir (Speech-to-Text) |
| **Clean** | GPT-4o | Gramer düzeltme, tutarlılık kontrolü |
| **Adapt** | GPT-4o | CEFR seviyesine göre metni sadeleştirir |
| **TTS** | ElevenLabs / OpenAI | Metni doğal sesle okur (Text-to-Speech) |
| **MFA** | Montreal Forced Aligner | Ses ve metni kelime bazında senkronize eder |
| **VTT** | Custom Generator | Karaoke tarzı altyazı dosyası oluşturur |

---

## 📖 Öğrenme Sistemleri

### 1. SRS (Spaced Repetition System)

**SM-2 Algoritması** kullanarak kelimeleri unutmadan önce tekrar ettirir.

```
Nasıl Çalışır?
─────────────
İlk öğrenme  → 1 gün sonra tekrar
Doğru cevap  → 6 gün sonra tekrar
Yine doğru  → 15 gün sonra tekrar
...
Yanlış cevap → En başa dön (1 gün)
```

**Bilimsel Kanıt:** Araştırmalar, SRS'nin geleneksel ezber yöntemlerine göre **%50-70 daha etkili** olduğunu gösteriyor.

| Parametre | Açıklama |
|-----------|----------|
| **Ease Factor** | Kelimenin zorluk katsayısı (1.3 - 2.5) |
| **Interval** | Tekrar aralığı (gün) |
| **Quality** | Kullanıcının cevap kalitesi (0-5) |

### 2. Topic Mastery (Konu Ustalığı)

Her konu için ilerleme takibi:

```
Status Flow:
not_started → in_progress → completed → mastered
     0%           1-69%        70-84%      85%+
```

**Mastery Score Formülü:**
- %40 → Tamamlama oranı
- %30 → Rating ortalaması
- %30 → İçerik sayısı (max 10)

### 3. Gamification (Oyunlaştırma)

| Özellik | Açıklama |
|---------|----------|
| **Daily Streak** | Her gün giriş yapınca artan seri |
| **XP (Deneyim)** | Her aktiviteden kazanılan puan |
| **Badges** | "First Steps", "Word Master" gibi rozetler |
| **Quests** | "Bugün 5 kelime öğren" gibi görevler |
| **Leaderboard** | Haftalık/aylık sıralama |

---

## 💾 Veritabanı ve Altyapı

### PostgreSQL + Supabase

| Tablo | İçerik |
|-------|--------|
| `users` | Kullanıcı profilleri, embedding'ler |
| `contenthistory` | Üretilen tüm içerikler |
| `word_reviews` | SRS kelime tekrar verileri |
| `user_topic_mastery` | Konu bazlı ilerleme |
| `user_insights` | AI'ın öğrendiği kullanıcı tercihleri |
| `content_ratings` | Beğeni/beğenmeme verileri |

### pgvector Extension

**Vektör benzerliği** için kullanılır:

```sql
-- Benzer kullanıcıları bul
SELECT * FROM users
ORDER BY insight_embedding <=> $1  -- Cosine similarity
LIMIT 5;
```

Bu sayede "Senin gibi düşünenler bunu beğendi" önerileri yapılabilir.

---

## ⚛️ Frontend Teknolojileri

### Component Architecture

```
src/
├── components/
│   ├── progress/
│   │   ├── MasteryProgressCard.tsx   → Konu ilerleme kartı
│   │   └── StreakCelebration.tsx     → Streak kutlama animasyonu
│   ├── vocabulary/
│   │   └── FlashcardDeck.tsx         → Kelime kartları
│   └── audio/
│       ├── MiniPlayer.tsx            → Global mini player
│       └── KaraokePlayer.tsx         → Karaoke altyazılı player
```

### State Management

| Teknoloji | Kullanım |
|-----------|----------|
| **React Context** | Auth, Audio Player state |
| **useState/useReducer** | Lokal component state |
| **SWR / React Query** | API data fetching & caching |

---

## 🔒 Güvenlik ve Stabilite

### Self-Healing Patterns

| Pattern | Ne Yapar? |
|---------|-----------|
| **Retry with Backoff** | Hata durumunda otomatik yeniden deneme (500ms → 1s → 2s) |
| **Circuit Breaker** | Sürekli hata veren servisi geçici devre dışı bırakır |
| **Graceful Degradation** | Hata olursa varsayılan değer döndürür |

### Input Sanitization

```javascript
// SQL Injection koruması
const safeOrderBy = allowedValues.includes(orderBy) ? orderBy : 'default';

// Word sanitization
const sanitizedWord = word.toLowerCase().trim().slice(0, 100);
```

### Authentication

| Özellik | Teknoloji |
|---------|-----------|
| **JWT Tokens** | Kullanıcı kimlik doğrulama |
| **RLS (Row Level Security)** | Veritabanı seviyesinde yetkilendirme |
| **API Rate Limiting** | DDoS koruması |

---

## 📊 Performans Optimizasyonları

| Optimizasyon | Etki |
|--------------|------|
| **CDN (Cloudflare)** | Statik içerikler için %80 daha hızlı |
| **Connection Pooling** | Veritabanı bağlantı yönetimi |
| **Lazy Loading** | Sayfa yükleme hızı artışı |
| **Image Optimization** | Next.js Image component |

---

## 🎯 Sonuç

LingRoot, modern web teknolojileri ve yapay zeka entegrasyonuyla **kişiselleştirilmiş dil öğrenme** deneyimi sunar:

✅ **GPT-4** ile akıllı içerik üretimi  
✅ **SM-2 algoritması** ile bilimsel kelime tekrarı  
✅ **ElevenLabs/OpenAI TTS** ile doğal ses  
✅ **pgvector** ile kullanıcı benzerliği önerileri  
✅ **Self-healing patterns** ile stabil sistem  

---

## 📚 İlgili Dokümanlar

- [PROJECT_MEMORY.md](../PROJECT_MEMORY.md) - Proje kuralları ve yol haritası
- [ai-enhancement-plan.md](./architecture/ai-enhancement-plan.md) - AI geliştirme planı
- [gamification-strategy.md](./architecture/gamification-strategy.md) - Oyunlaştırma stratejisi
- [api-services.md](./codebase/api-services.md) - API servisleri detayları

---

*Bu doküman, LingRoot projesinin teknoloji yığınını ve yeteneklerini özetlemek amacıyla hazırlanmıştır.*
