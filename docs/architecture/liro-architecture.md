# 🧠 Liro Mimari Dökümanı

**Son Güncelleme:** 21.12.2025
**Versiyon:** 2.1 (User Insight System)

---

## 🎯 Liro Nedir?

Liro, LingRoot platformunun **kişisel dil öğrenme asistanı**dır. Basit bir chatbot değil, kullanıcıyı derinlemesine tanıyan ve zamanla daha iyi anlayan bir **AI Companion**'dır.

---

## 🏛️ 3 Katmanlı Zeka Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    LIRO ZEKA MİMARİSİ                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1️⃣ ANALİZ KATMANI (UserProfileAnalyzer)              │   │
│  │    • 12 veri noktasından kullanıcı profili          │   │
│  │    • İlgi alanları, kelime bilgisi, davranışlar     │   │
│  │    • 🆕 User Insights (Öğrenilmiş Tercihler)         │   │
│  │    • Memory Cache (5 dk TTL)                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2️⃣ KARAR KATMANI (ChatService + DirectorAgent)       │   │
│  │    • Hibrit Model Seçimi (gpt-4o-mini / gpt-4o)    │   │
│  │    • Duygu Analizi (Mood Detection)                 │   │
│  │    • Web Search (Google Custom Search)              │   │
│  │    • Dinamik Seviye Ayarlama                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 3️⃣ HAFIZA KATMANI (Infinite Context)                 │   │
│  │    • Kısa Dönem: Son 20 mesaj                       │   │
│  │    • Uzun Dönem: ConversationSummaryService         │   │
│  │    • Konu Hafızası: RAG + Topic Embeddings          │   │
│  │    • 🆕 Persona Hafızası: user_insights tablosu      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Dosya Yapısı

```
backend/
├── controllers/
│   └── aiChatController.js      # HTTP katmanı
├── services/
│   ├── chatService.js           # İş mantığı (cache destekli)
│   ├── conversationSummaryService.js # Sonsuz hafıza
│   ├── directorAgentService.js  # Duygu analizi
│   └── userInsightService.js    # 🆕 Persona öğrenme
├── utils/
│   ├── userProfileAnalyzer.js   # 12 noktalı profil
│   ├── liroPromptGenerator.js   # Dinamik prompt
│   ├── profileCache.js          # Memory cache
│   ├── dynamicLevelAnalyzer.js  # Seviye ayarlama
│   └── webSearchService.js      # Google Search
├── prompts/
│   ├── liro_system_personalized.txt  # Ana prompt template
│   └── liro/
│       └── user_insight_extraction.txt  # 🆕 Persona extraction
└── constants/
    └── chatConstants.js         # Merkezi sabitler
```

---

## 🔄 Mesaj Akışı

```
1. Kullanıcı mesaj gönderir
       ↓
2. chatService.getUserProfile() (Cache kontrolü)
       ↓
3. userProfileAnalyzer.generateUserProfile()
   └── 12 veri kaynağını toplar (+ userInsights)
       ↓
4. liroPromptGenerator.generateSystemPrompt()
   └── Tüm verileri {{placeholder}}'lara yerleştirir
       ↓
5. OpenAI API çağrısı (Model: seviyeye göre)
       ↓
6. Yanıt DB'ye kaydedilir
       ↓
7. ARKA PLAN (Async):
   ├── Topic Extraction (her 6 mesaj)
   └── 🆕 Insight Extraction (her 10 mesaj)
       ↓
8. Yanıt kullanıcıya döner (SSE streaming)
```

---

## 🧠 User Insight System (v2.1)

### Nasıl Çalışır?
1. Kullanıcı Liro ile sohbet eder
2. Her 10 mesajda bir `userInsightService.extractInsights()` çalışır
3. AI, sohbetten **kalıcı tercihler** çıkarır:
   - **LIKE**: "Futbol haberleri sever"
   - **DISLIKE**: "Grammar düzeltilmesinden hoşlanmıyor"
   - **HABIT**: "Sabahları pratik yapıyor"
   - **GOAL**: "IELTS 7.5 hedefliyor"

4. Çıkarılan veriler `user_insights` tablosuna yazılır
5. Bir sonraki sohbette bu veriler prompt'a eklenir

### Veri Modeli
```sql
user_insights (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  insight_type ENUM('like','dislike','habit','goal','trait','preference'),
  insight_value TEXT,
  confidence INTEGER (0-100),
  source_conversation_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMP
)
```

---

## ⚡ Performans Optimizasyonları

| Optimizasyon | Açıklama |
|--------------|----------|
| **Profile Cache** | Her mesajda 12 tablo sorgusu yerine 5 dk cache |
| **Async Processing** | Topic/Insight extraction arka planda çalışır |
| **Hibrit Model** | A1-B1: gpt-4o-mini (ucuz), B2+: gpt-4o (kaliteli) |
| **Batch Insight** | Her mesaj değil, 10 mesajda bir extraction |

---

## 📊 Veri Kaynakları (12 Nokta)

| # | Kaynak | Kullanım |
|---|--------|----------|
| 1 | users | Temel bilgiler, hesap yaşı |
| 2 | user_interests | İlgi alanları |
| 3 | conversations | Sohbet geçmişi |
| 4 | messages | İçerik analizi |
| 5 | content | Oluşturulan içerikler |
| 6 | vocabulary | Kelime bilgisi |
| 7 | narrations | Ses tercihleri |
| 8 | topics | Konu ağacı |
| 9 | knowledge_profile | Bilgi seviyesi |
| 10 | behavioral_patterns | Davranış kalıpları |
| 11 | recommendations | Öneri geçmişi |
| 12 | **user_insights** | 🆕 Öğrenilmiş tercihler |

---

## 🚀 Gelecek İyileştirmeler

- [ ] Redis Cache (Memory → Redis)
- [ ] Deep Web Search (Site içerik okuma)
- [ ] Real-time Insight Update (WebSocket)
- [ ] A/B Testing for Prompts

---

**Geliştirici:** LingRoot AI Team  
**Tarih:** 21.12.2025
