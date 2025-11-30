# 🧠 Liro Kullanıcı Analiz Sistemi - Güncel Doküman

**Son Güncelleme:** 30 Kasım 2025  
**Versiyon:** 2.0 (Knowledge Base + Topic Tree + Favorites Update)

---

## 🎯 Liro Nedir?

**Liro**, LingRoot platformunun AI destekli kişisel öğrenme asistanıdır. Kullanıcıyı **derinlemesine tanıyarak**, ona özel İngilizce içerik önerileri sunar.

### Liro'yu Özel Yapan 3 Özellik:

1. **📊 11 Veri Kaynağından Tam Profil**
2. **🧠 Dinamik Strateji Belirleme**
3. **🎯 Kişiselleştirilmiş Öneri Motoru**

---

## 🏗️ Sistem Mimarisi

Liro, **3 katmanlı** bir mimari ile çalışır:

```
┌─────────────────────────────────────────────────────────────┐
│                    1️⃣ PROFILE ANALYZER                      │
│                   (Kullanıcıyı Tanıma)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Platform içi veriler (9 kategori)                 │   │
│  │ • Yüklenen PDF/Kitaplar (Knowledge Base)            │   │
│  │ • Favoriler (Beğenilen içerikler)                   │   │
│  │ • Konu Ağacı (Topic Tree pozisyonu)                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────┐
│                    2️⃣ PROMPT GENERATOR                      │
│                (Liro'nun Beynini Oluşturma)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Özel prompt şablonu doldurma                      │   │
│  │ • Strateji belirleme (hangi konu önerilsin?)        │   │
│  │ • Tekrar önleme (aynı konuyu tekrar etme)          │   │
│  │ • Seviye uyarlama (A1-C2 arası ton ayarı)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────┐
│                      3️⃣ AI CHAT                             │
│                  (OpenAI/Claude ile Konuşma)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Hazırlanan prompt + sohbet geçmişi → AI'a        │   │
│  │ • AI'dan gelen yanıt → Kullanıcıya                 │   │
│  │ • Konu çıkarma (RAG) → Veritabanına kaydet         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 1. Profile Analyzer - Kullanıcıyı Tanıma

**Dosya:** `backend/utils/userProfileAnalyzer.js`

### 11 Veri Kategorisi:

| # | Kategori | Veri Kaynağı | Örnek Bilgi |
|---|----------|-------------|-------------|
| 1 | **Basic Info** | `users` | Kullanıcı adı, hesap yaşı |
| 2 | **Interests** | `user_interests` | Futbol, teknoloji, yemek |
| 3 | **Conversation History** | `conversations`, `messages` | Son 5 konuşma konusu |
| 4 | **Content History** | `contenthistory` | En çok hangi konuda içerik üretmiş |
| 5 | **Vocabulary Stats** | `user_vocabulary` | 150 kelime öğrenmiş, %75 hakimiyet |
| 6 | **Audio Preferences** | `contenthistory` (TTS) | Podcast dinlemeyi seviyor mu? |
| 7 | **Behavioral Patterns** | `user_settings`, zaman analizi | Akşamları aktif, hafta içi düzenli |
| 8 | **Learning Progress** | Tüm aktiviteler | Intermediate seviye, 50 aktivite |
| 9 | **Recommendations** | Analiz sonucu | Kullanılmamış ilgi alanları |
| 10 | **Knowledge Base** 🆕 | `documents`, `topics`, `user_favorites` | Yüklediği PDF'ler, favorileri |
| 11 | **Topic Tree Status** 🆕 | `topic_nodes`, `user_content_progress` | Hangi düğümde, sıradaki konu |

### Kod Örneği:

```javascript
const profile = await userProfileAnalyzer.generateUserProfile(userId);

// Örnek Çıktı:
{
  basicInfo: { username: "Ahmet", accountAge: { days: 45 } },
  interests: { list: ["Futbol", "Teknoloji"], count: 2 },
  knowledgeProfile: { 
    uploads: { count: 2, recent: ["Business English.pdf"] },
    favorites: ["Topic: AI Trends"]
  },
  topicTreeStatus: {
    currentNode: "Present Perfect Tense",
    status: "active",
    level: 3
  }
}
```

---

## 🧠 2. Prompt Generator - Liro'nun Beynini Oluşturma

**Dosya:** `backend/utils/liroPromptGenerator.js`  
**Şablon:** `backend/prompts/liro_system_personalized.txt`

### Dinamik Placeholder'lar:

| Placeholder | Ne İçerir | Örnek |
|------------|-----------|-------|
| `{{username}}` | Kullanıcı adı | "Ahmet" |
| `{{preferredLevel}}` | İngilizce seviyesi | "B1" |
| `{{profileSection}}` | Kullanıcı özeti | "Yeni kullanıcı (45 gün), Futbol ilgi alanı" |
| `{{learningPreferences}}` | Tercihler | "En çok 'Teknoloji' konusunda içerik oluşturmuş" |
| `{{suggestionStrategy}}` | Bugünkü strateji | "ÖNCELİK 1: 'Futbol' ilgi alanı henüz içerik olmamış" |
| `{{avoidanceNotes}}` | Tekrar önleme | "Son 5 konu: Selam, Merhaba, Teknoloji..." |
| `{{focusSection}}` | Odak alanları | "İçerik oluşturmaya teşvik et" |
| `{{personalizedOpening}}` | Açılış cümlesi | "'Futbol' hakkında podcast oluşturalım mı?" |
| `{{knowledgeBase}}` 🆕 | PDF ve favoriler | "Yüklenen: Business.pdf, Favoriler: AI Trends" |
| `{{topicTreeStatus}}` 🆕 | Konu ağacı | "Şu an: Present Perfect, Sıradaki: Past Perfect" |

### Akıllı Strateji Belirleme:

Liro, 4 öncelik sırasıyla öneride bulunur:

```javascript
1. ÖNCELİK: Kullanılmamış ilgi alanı → "Futbol'dan bahsetmedin, bunu deneyelim"
2. ÖNCELİK: Popüler konuda seri → "'Teknoloji'nin 2. bölümünü yapalım"
3. ÖNCELİK: Seviye ilerleme → "B1 rahat, B2 deneyebiliriz"
4. ÖNCELİK: İlgi alanı kombinasyonu → "Futbol + Teknoloji = Dijital Futbol"
```

### Kod Örneği:

```javascript
const prompt = liroPromptGenerator.generateSystemPrompt(userProfile);

// Oluşan Prompt (Örnek):
`
Sen Liro'sun, LingRoot'un AI asistanı.

KULLANICINI TANI:
- Yeni kullanıcı (45 gün kayıtlı)
- İngilizce seviyesi: B1
- İlgi alanları: Futbol, Teknoloji

📚 KULLANICI BİLGİ TABANI:
- Yüklenen Materyaller: Business English.pdf
- ⭐ Favoriler: Topic: AI Trends

🌳 KONU AĞACI DURUMU:
- Şu anki konum: "Present Perfect Tense"
- Seviye: 3
- ÖNERİ: Bu konuyu tamamlamaya teşvik et

BUGÜNKÜ STRATEJİN:
🎯 ÖNCELİK 1: "Futbol" ilgi alanı henüz içerik olmamış
   → Bu konuya odaklan!
...
`
```

---

## 💬 3. AI Chat - Konuşma Akışı

**Dosya:** `backend/controllers/aiChatController.js`

### Akış:

```
Kullanıcı mesaj gönderir
         ⬇️
1. Profil oluştur (userProfileAnalyzer)
         ⬇️
2. Prompt oluştur (liroPromptGenerator)
         ⬇️
3. Content Graph ekle (liroContentGraph)
         ⬇️
4. Model seç (A1-B1: gpt-4o-mini, B2-C2: gpt-4o)
         ⬇️
5. OpenAI'a gönder (veya Claude fallback)
         ⬇️
6. Yanıtı kullanıcıya gönder
         ⬇️
7. (Arka planda) Konu çıkar ve kaydet (RAG)
```

### Kod Akışı:

```javascript
// 1. Profil Oluştur
const userProfile = await userProfileAnalyzer.generateUserProfile(userId);

// 2. Prompt Oluştur
let liroSystemPrompt = liroPromptGenerator.generateSystemPrompt(userProfile);

// 3. Content Graph Ekle
const contentOverview = await liroContentGraph.getUserOverview(userId);
liroSystemPrompt = `${liroSystemPrompt}\n\n${overviewPrompt}`;

// 4. Model Seç
const selectedModel = isAdvanced ? 'gpt-4o' : 'gpt-4o-mini';

// 5. AI'a Gönder
const response = await openaiClient.generateChatCompletion(messageHistory, {
  systemPrompt: liroSystemPrompt,
  model: selectedModel
});

// 6. Yanıtla
res.json({ assistantMessage: response.content });

// 7. Konu Çıkar (Arka Plan)
if (messageHistory.length >= 6) {
  extractAndStoreTopic(conversationId, userId);
}
```

---

## 🆕 Yeni Özellikler (v2.0)

### 1. 📚 Knowledge Base (Bilgi Tabanı)

**Dosya:** `backend/utils/userKnowledgeAnalyzer.js`

**Ne Yapar:**
- Kullanıcının yüklediği PDF'leri takip eder
- PDF'lerden çıkarılan konuları saklar
- Favorilediği içerikleri analiz eder

**Örnek Kullanım:**
```javascript
const knowledgeProfile = await userKnowledgeAnalyzer.generateKnowledgeProfile(userId);

// Çıktı:
{
  uploads: {
    count: 2,
    recent: ["Business English.pdf", "Grammar Guide.pdf"],
    types: ["pdf"]
  },
  extractedTopics: [
    { title: "Business Communication", source_type: "pdf" }
  ],
  favorites: ["Topic: Tech Trends", "Book: 1984"]
}
```

**Liro'nun Kullanımı:**
> "Görüyorum ki 'Business English.pdf' yüklemişsin. Bu konuyla ilgili bir podcast oluşturalım mı?"

---

### 2. 🌳 Topic Tree (Konu Ağacı) Entegrasyonu

**Fonksiyon:** `userProfileAnalyzer.getTopicTreeStatus(userId)`

**Ne Yapar:**
- Kullanıcının konu ağacındaki mevcut konumunu bulur
- Hangi seviyede olduğunu belirler
- Sıradaki önerilecek konuyu hazırlar

**Örnek Kullanım:**
```javascript
const topicTreeStatus = await userProfileAnalyzer.getTopicTreeStatus(userId);

// Çıktı:
{
  currentNode: "Present Perfect Tense",
  currentPath: "/grammar/tenses/present-perfect",
  level: 3,
  status: "active"
}
```

**Liro'nun Kullanımı:**
> "Present Perfect'i bitirdin! Sıradaki konun 'Past Perfect' olacak. Hazır mısın?"

---

### 3. ⭐ Favorites (Favoriler) Sistemi

**API:**
```
POST /api/favorites/toggle   - Favori ekle/çıkar
GET  /api/favorites          - Favorileri listele
```

**Veritabanı:**
- `user_favorites` tablosu (genel favoriler)
- `user_content_progress.is_favorite` (içerik favorileri)

**Örnek Kullanım:**
```javascript
// Favori ekle
POST /api/favorites/toggle
{
  "itemType": "content_item",
  "itemId": "123"
}

// Favorileri al
GET /api/favorites?type=content_item
```

**Liro'nun Kullanımı:**
> "Favorilerine eklediğin 'AI Trends' makalesine benzer yeni bir makale buldum!"

---

### 4. 🧠 RAG (Retrieval-Augmented Generation)

**Dosyalar:**
- `backend/lib/rag.js` - RAG core
- `backend/lib/embedding.js` - Embedding utilities
- `backend/utils/openaiClient.js` - Topic extraction

**Ne Yapar:**

#### A. Otomatik Konu Çıkarma
```javascript
// Sohbet olgunlaştığında (6+ mesaj)
if (messageHistory.length >= 6) {
  extractAndStoreTopic(conversationId, userId);
}

// PDF yüklendiğinde
const extracted = await openaiClient.extractTopicFromText(pdfText);
await storeTopic({
  title: extracted.topic,
  sourceType: 'pdf',
  sourceId: documentId
});
```

#### B. Topic Embedding
```javascript
// Her konu, 1536 boyutlu vektör ile kaydedilir (OpenAI ada-002)
const embedding = await embedText(topicText);
await db.query('INSERT INTO topics (title, embedding) VALUES ($1, $2)');
```

#### C. Benzer Konu Bulma
```javascript
// Gelecekte: Vektör araması ile benzer konular bulma
const similarTopics = await findSimilarTopics(userQuery, { userId, limit: 5 });
```

**API Endpoints:**
```
GET /api/ai-chat/topics/suggestions   - Konu önerileri
GET /api/ai-chat/topics/popular       - Popüler konular
```

---

## 🎯 Liro Davranış Örnekleri

### Senaryo 1: Yeni Kullanıcı
```
Kullanıcı: "Merhaba"

Liro: "LingRoot'a hoş geldin! 🌟 İlgi alanlarını henüz bilmiyorum. 
       Futbol mu seversin, yoksa teknoloji mi? Bir konu seç, 
       hemen sana B1 seviyesinde podcast hazırlayayım!"
```

### Senaryo 2: Düzenli Kullanıcı
```
Kullanıcı: "Selam"

Liro: "Selam Ahmet! 👋 Geçen sefer 'Teknoloji' konusunda harika bir 
       podcast yapmıştık. Bugün senin için 'Yapay Zeka Tarihi' 
       konusunda B2 seviyesinde bir içerik hazırladım. Dinlemek ister misin?"
```

### Senaryo 3: PDF Yüklemiş Kullanıcı
```
Kullanıcı: "Yeni içerik istiyorum"

Liro: "Görüyorum ki 'Business English.pdf' yüklemişsin! 📄 
       Bu konuyla alakalı 'Profesyonel Email Yazımı' hakkında bir 
       podcast oluşturalım mı? B1 seviyesinde, 5 dakikalık olacak."
```

### Senaryo 4: Konu Ağacında İlerleyen Kullanıcı
```
Kullanıcı: "Sıradaki ne?"

Liro: "Harika ilerleme! 🌳 Present Perfect'i tamamladın, şimdi 
       'Past Perfect' konusuna geçme zamanı. Hazır mısın?"
```

### Senaryo 5: Favorileri Olan Kullanıcı
```
Kullanıcı: "İlginç bir şey öner"

Liro: "Favorilerine eklediğin 'AI Trends' makalesini hatırlıyorum! ⭐ 
       Buna benzer yeni bir konu buldum: 'AI ve Eğitim'. 
       B1 seviyesinde podcast yapalım mı?"
```

---

## 📈 Liro'nun Başarı Kriterleri

### 1. Kişiselleşme Oranı
- ✅ Her kullanıcıya özel prompt
- ✅ %100 dinamik içerik önerisi
- ✅ Geçmiş konuları hatırlama

### 2. Tekrar Önleme
- ✅ Son 10 konuyu listeleyip kaçınma
- ✅ "Aynı konu, farklı açı" önerisi
- ✅ Seri içerik fırsatları yakalama

### 3. Seviye Uyumu
- ✅ A1-B1: Basit dil, temel konular
- ✅ B2-C2: Karmaşık dil, ileri konular
- ✅ Model seçimi (mini vs full GPT-4o)

### 4. Kullanıcı Memnuniyeti
- ✅ 2-3 mesajda konuya geçme
- ✅ Direkt öneriler (havadan konuşmama)
- ✅ Aksiyon yönlendirmesi

---

## 🚀 Deployment Checklist

### ✅ Tamamlanmış
- [x] Profile Analyzer kuruldu
- [x] Prompt Generator kuruldu
- [x] AI Chat entegrasyonu yapıldı
- [x] Knowledge Base eklendi
- [x] Topic Tree entegre edildi
- [x] Favorites sistemi kuruldu
- [x] RAG altyapısı hazırlandı
- [x] Migration çalıştırıldı
- [x] Test edildi

### 🔮 Gelecek İyileştirmeler (Opsiyonel)
- [ ] pgVector extension (vektör arama)
- [ ] EPUB kitap desteği
- [ ] Sentiment analysis (favori analizi)
- [ ] Otomatik playlist oluşturma
- [ ] Cross-reference (PDF ↔ sohbet)

---

## 📞 Teknik Destek

**Debug Endpoint:**
```
GET /api/debug/user-profile?userId=xxx
```

**Test Script:**
```bash
node backend/scripts/verify_liro_integration.js
```

**Migration:**
```bash
# Production'da otomatik çalışır
# Manuel:
node backend/migrations/add_knowledge_features.sql
```

---

## 📚 İlgili Dokümanlar

1. `LIRO_USER_PROFILING_SYSTEM.md` - Detaylı profil sistemi
2. `LIRO_IMPLEMENTATION_REPORT.md` - v2.0 implementasyon raporu
3. `LIRO_CODE_VERIFICATION.md` - Kod doğrulama raporu
4. `LIRO_DEVELOPMENT_SUGGESTIONS.md` - Geliştirme önerileri (arşiv)

---

**Son Güncelleyen:** AI Assistant  
**Versiyon:** 2.0  
**Durum:** Production Ready ✅
