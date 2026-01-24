# LingRoot - AI Mimarisi Detaylı Açıklama
> **Oluşturulma:** 2026-01-03 | **Güncelleme:** 2026-01-03 | **Versiyon:** 1.2

---

## 📋 Bu Doküman Ne Anlatıyor?

Bu doküman, LingRoot'ta kullanılan yapay zeka teknolojilerini **teknik olmayan** bir dille açıklar. Üç ana konuyu ele alıyoruz:

1. **AI Servisleri Entegrasyonu** - OpenAI API kullanımı
2. **Embedding (Vektör Temsili)** - Metinlerin sayılara dönüşmesi
3. **RAG (Retrieval-Augmented Generation)** - Bilgi getirme + üretim

> ⚠️ **Önemli Not:** LingRoot'ta kendi ML modeli **eğitmiyoruz**. OpenAI'ın hazır modellerini API üzerinden kullanıyoruz. Bu sayede GPU maliyeti ve ML uzmanlığı gerektirmeden güçlü AI yetenekleri elde ediyoruz.

---

# 🤖 Bölüm 1: AI Servisleri Entegrasyonu (OpenAI API)

## Nasıl Çalışıyor?

LingRoot, **OpenAI'ın bulut sunucularındaki hazır modelleri** API çağrısıyla kullanır:

```
┌─────────────────────────────────────────────────────────────────┐
│  OpenAI Sunucuları (Onların tarafı - Python, GPU'lar)           │
│  ────────────────────────────────────────────────               │
│  • GPT-4o → Metin üretimi                                       │
│  • text-embedding-3-small → Metin → Vektör dönüşümü             │
├─────────────────────────────────────────────────────────────────┤
│  Google Cloud / AWS Sunucuları                                   │
│  • Google TTS → Metin → Ses (Text-to-Speech)                    │
│  • Amazon Polly → Metin → Ses (alternatif sesler)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    HTTP API (REST)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  LingRoot Backend (Bizim tarafımız - Node.js, JavaScript)       │
│  ────────────────────────────────────────────────────           │
│  • API çağrısı yapar                                            │
│  • Sonuçları işler                                              │
│  • Veritabanına kaydeder                                        │
│  • Kullanıcıya sunar                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Kullandığımız AI Servisleri

### OpenAI
| Model | Ne Yapar? | LingRoot'ta Kullanım |
|-------|-----------|----------------------|
| **GPT-4o** | Metin üretimi, analiz | Podcast scriptleri, Liro sohbet, insight çıkarma |
| **GPT-4o-mini** | Hafif metin işleme | Hızlı sınıflandırma, basit görevler |
| **text-embedding-3-small** | Metin → Vektör | Kullanıcı benzerliği, öneriler |

### Text-to-Speech (Ses Üretimi)
| Servis | Sağlayıcı | LingRoot'ta Kullanım |
|--------|-----------|----------------------|
| **Google TTS** | Google Cloud | Ana ses üretimi, Neural2 ve Gemini sesleri |
| **Amazon Polly** | AWS | Alternatif sesler, çoklu dil desteği |

## Kod Örneği (JavaScript - Python Değil!)

```javascript
// LingRoot Backend - Node.js
const openai = require('openai');

// GPT-4 ile podcast scripti oluşturma
const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
        { role: "system", content: "Sen bir podcast yazarısın..." },
        { role: "user", content: "AI hakkında B1 seviyesinde bir podcast yaz" }
    ]
});

// Sonuç: OpenAI sunucularında işlendi, bize sadece cevap geldi
const script = response.choices[0].message.content;
```

---

## LingRoot'ta AI Kullanım Örnekleri

### 1. Kullanıcı Tercih Çıkarımı (Insight Extraction)

**Amaç:** Kullanıcının neleri sevdiğini sohbetlerden otomatik öğrenmek.

```
┌─────────────────────────────────────────────────────────────────┐
│  Kullanıcı Liro ile sohbet ediyor:                              │
│  "Teknoloji haberleri ilgimi çekiyor, özellikle AI konuları"    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  GPT-4o API Çağrısı:                                            │
│  "Bu sohbetten kullanıcı tercihlerini JSON olarak çıkar"        │
│                                                                  │
│  Cevap:                                                          │
│  {                                                               │
│    "type": "like",                                               │
│    "value": "Teknoloji haberleri, AI",                          │
│    "confidence": 85                                              │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Veritabanına Kaydet → Sonraki sefere Liro bu bilgiyi kullanır  │
└─────────────────────────────────────────────────────────────────┘
```

**Çıktı:** Kullanıcının neyi sevip sevmediğini bilen bir sistem.

---

### 2. SM-2 Algoritması (Kelime Tekrarı)

> ⚠️ **Not:** SM-2 bir **Machine Learning algoritması DEĞİLDİR**. Matematiksel bir formüldür ve tamamen JavaScript ile yazılmıştır. AI/ML kullanmaz.

**Amaç:** Kelimeleri tam unutulmadan önce tekrar ettirerek kalıcı hafızaya geçirmek.

**Nasıl Çalışır?**

```
                    "apple" kelimesi
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
 1. GÜN                 6. GÜN                15. GÜN
 (İlk öğrenme)      (Tekrar #1)           (Tekrar #2)
    │                      │                      │
    │   Doğru bildi ✓      │   Doğru bildi ✓      │
    │                      │                      │
    └──────────────────────┴──────────────────────┘
                           │
                           ▼
                       37. GÜN
                    (Tekrar #3)
                           │
                    Yanlış bildi ✗
                           │
                           ▼
                     EN BAŞA DÖN (1. GÜN)
```

**Formül (Saf JavaScript - AI yok):**
```javascript
// srsService.js - Bu bir formül, ML değil!
calculateNextReview(quality, previousData) {
    // Ease Factor güncellemesi (SM-2 matematiksel formülü)
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Minimum 1.3
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    // Interval hesapla
    interval = Math.round(interval * easeFactor);
    
    return { interval, easeFactor, nextReviewDate };
}
```

**Çıktı:** Minimum eforla maksimum kelime kalıcılığı (%70+ retention).

---

# 📐 Bölüm 2: Embedding (Vektör Temsili)

## Ne Demek?

**Embedding**, bir metni sayı dizisine (vektöre) dönüştürmektir. Bu işlemi **OpenAI API** yapar, biz yapmıyoruz.

```
                    Biz Ne Yapıyoruz?
                    ─────────────────
                    
Metin: "Kullanıcı teknoloji ve AI seviyor"
                           │
                           ▼
            openai.embeddings.create({
                model: "text-embedding-3-small",
                input: metin
            })
                           │
                           ▼
    OpenAI sunucuları işliyor (Python, GPU)
                           │
                           ▼
    Çıktı: [0.023, 0.156, -0.089, ...] (1536 sayı)
                           │
                           ▼
    Biz veritabanına kaydediyoruz (PostgreSQL + pgvector)
```

## LingRoot'ta Nasıl Kullanıyoruz?

### Kullanıcı Benzerliği (User Similarity)

**Amaç:** "Senin gibi düşünenler bunu beğendi" önerileri sunmak.

**Akış:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ADIM 1: Kullanıcı Tercih Özeti                                 │
│                                                                  │
│  Ahmet: "Likes: Technology, AI. Goals: Business English"        │
│  Mehmet: "Likes: Technology, Space. Goals: Travel English"      │
│  Ayşe: "Likes: Cooking, Art. Goals: Casual conversation"        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ADIM 2: OpenAI Embedding API                                    │
│                                                                  │
│  Ahmet  → [0.23, 0.87, 0.12, ...]                               │
│  Mehmet → [0.25, 0.85, 0.14, ...]  ← Ahmet'e benzer!            │
│  Ayşe   → [0.91, 0.12, 0.45, ...]  ← Farklı                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ADIM 3: PostgreSQL + pgvector ile Benzerlik Hesabı             │
│                                                                  │
│  SELECT * FROM users                                             │
│  ORDER BY insight_embedding <=> $ahmet_embedding                │
│  LIMIT 5;                                                        │
│                                                                  │
│  Sonuç: Mehmet %94 benzer                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ADIM 4: Mehmet'in beğendiği içerikleri Ahmet'e öner            │
└─────────────────────────────────────────────────────────────────┘
```

**Çıktı:** Benzer tercihlere sahip kullanıcıları bularak kişiselleştirilmiş öneriler.

---

# 🔍 Bölüm 3: RAG (Retrieval-Augmented Generation)

## Ne Demek?

**RAG = Bilgi Getir + Üret**

GPT gibi modeller genel bilgiyle eğitilmiş. Ama kullanıcıya özel bilgileri bilmez. RAG ile:
1. Önce **veritabanından** ilgili bilgiyi getiririz
2. Bu bilgiyi GPT'ye **context** olarak veririz
3. GPT bu bilgiyle **kişiselleştirilmiş cevap** üretir

## Klasik GPT vs RAG

```
┌─────────────────────────────────────────────────────────────────┐
│  KLASİK GPT (Context yok)                                        │
│                                                                  │
│  Soru: "Bana bir podcast öner"                                  │
│  GPT: "İşte bazı popüler podcast'ler..." (genel cevap)          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  RAG ile GPT (LingRoot'un yaptığı)                               │
│                                                                  │
│  1. Veritabanından Getir (RETRIEVAL):                           │
│     - Kullanıcı tercihleri: "AI, Teknoloji"                     │
│     - Seviye: B1                                                 │
│     - Son dinlediği: "Machine Learning Basics"                  │
│                                                                  │
│  2. GPT'ye Context olarak ver (AUGMENTED):                      │
│     System: "Kullanıcı AI seviyor, B1 seviyesi, son olarak      │
│              Machine Learning Basics dinledi..."                 │
│                                                                  │
│  3. GPT cevabı (GENERATION):                                     │
│     "AI ilginiz için 'Deep Learning Fundamentals' podcast'ini   │
│      önerebilirim! Machine Learning Basics'in devamı niteliğinde│
│      ve B1 seviyenize uygun."                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Özet: LingRoot AI Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LingRoot AI MİMARİSİ                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  OpenAI API      │    │    EMBEDDING     │    │       RAG        │  │
│  │  (Hazır Modeller)│    │  (Vektör Temsili)│    │(Bilgi Getir+Üret)│  │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤  │
│  │                  │    │                  │    │                  │  │
│  │ • GPT-4o (metin) │    │ • Metin → Vektör │    │ • Veritabanından │  │
│  │ • Google TTS     │    │ • Benzerlik Bul  │    │   bilgi getir    │  │
│  │ • Amazon Polly   │    │ • Öneri Sistemi  │    │ • GPT'ye ver     │  │
│  │                  │    │                  │    │ • Cevap üret     │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │             │
│           └───────────────────────┴───────────────────────┘             │
│                                   │                                      │
│                         Node.js / JavaScript                             │
│                      (Python kullanmıyoruz!)                             │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────┐    ┌──────────────────────────────────────────┐  │
│  │  SM-2 Algoritması│    │        KİŞİSELLEŞTİRİLMİŞ                │  │
│  │  (Saf JavaScript)│    │        ÖĞRENME DENEYİMİ                  │  │
│  │                  │    │                                          │  │
│  │  ⚠️ ML DEĞİL!    │    │  • Kullanıcıyı tanıyan AI               │  │
│  │  Matematiksel    │    │  • Akıllı kelime tekrarı                │  │
│  │  formül          │    │  • Benzer kullanıcı önerileri           │  │
│  └──────────────────┘    └──────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Sonuç: Bu Teknolojiler Ne Sağlıyor?

| Teknoloji | Biz Mi Yapıyoruz? | Girdi | Çıktı |
|-----------|-------------------|-------|-------|
| **GPT-4o** | ❌ OpenAI API | Metin | Üretilmiş metin |
| **Google TTS** | ❌ Google Cloud API | Metin | Ses dosyası (MP3) |
| **Amazon Polly** | ❌ AWS API | Metin | Ses dosyası (MP3) |
| **Embedding** | ❌ OpenAI API | Metin | 1536-boyutlu vektör |
| **Cosine Similarity** | ✅ PostgreSQL (pgvector) | İki vektör | %0-100 benzerlik |
| **RAG** | ✅ Biz (Node.js) | Veritabanı + GPT | Kişisel cevap |
| **SM-2** | ✅ Biz (JavaScript) | Kelime + Cevap | Tekrar zamanı |

### Neden ML Eğitmiyoruz?

| Kendi Model Eğitimi | OpenAI API Kullanımı |
|---------------------|----------------------|
| $50,000+ başlangıç maliyeti | $0 başlangıç |
| ML mühendisi gerekli | Sadece JavaScript |
| 6+ ay geliştirme | Hemen kullanılabilir |
| GPU sunucu gerekli | Sunucu yok |

**Sonuç:** Kullanıcı sayısı 100,000+'yı geçene kadar OpenAI API kullanmak daha mantıklı.

---

## 📚 İlgili Dokümanlar

- [PROJECT_MEMORY.md](../PROJECT_MEMORY.md) - Proje kuralları
- [TECHNOLOGY_GUIDE.md](./TECHNOLOGY_GUIDE.md) - Tüm teknolojiler
- [api-services.md](./codebase/api-services.md) - API servisleri

---

*Bu doküman, LingRoot'un AI sistemlerini açıklamak için hazırlanmıştır. ML modeli eğitmiyoruz, hazır API'leri kullanıyoruz.*
