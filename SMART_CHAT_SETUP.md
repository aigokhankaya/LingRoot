# 🧠 LingRoot Smart Chat - OpenAI + RAG Setup Guide

Bu dokuman, LingRoot'a eklenen akıllı, öğrenen ve RAG (Retrieval-Augmented Generation) destekli chat sisteminin kurulum kılavuzudur.

## 📋 Yeni Özellikler

### ✨ Akıllı Özellikler
- ✅ **OpenAI GPT-4 Turbo entegrasyonu** (Claude fallback ile)
- ✅ **Yönlendirici diyalog mantığı** - Kullanıcıyı derinlemesine konulara yönlendirir
- ✅ **RAG (Retrieval-Augmented Generation)** - Benzer konuları bulur ve önerir
- ✅ **Text Embedding** - OpenAI ada-002 ile vektör embeddingler
- ✅ **Konu çıkarma** - Sohbetten otomatik konu belirleme
- ✅ **Akıllı öneriler** - Kullanıcının geçmiş konularına göre öneriler
- ✅ **Popüler konular** - En çok kullanılan konuları gösterir

### 🎯 Kullanıcı Deneyimi
- Kullanıcının geçmiş sohbetleri analiz edilir
- Benzer konular önerilir
- Diğer kullanıcıların başarılı konuları paylaşılır
- Yönlendirici sorularla derinlemesine içerik fikirleri oluşturulur

---

## 🗃️ Veritabanı Yapısı

### Yeni Tablo: `topics`

```sql
CREATE TABLE topics (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    embedding TEXT, -- JSON stringified 1536-dim vector
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Güncellenen Tablo: `conversations`

```sql
ALTER TABLE conversations 
ADD COLUMN suggested_topic TEXT;
```

**İndeksler:**
- `idx_topics_user_id` - Kullanıcıya göre filtreleme
- `idx_topics_created_at` - Tarih sıralaması
- `idx_topics_title` - Full-text search
- `idx_topics_description` - Full-text search
- `idx_conversations_suggested_topic` - Önerilen konulara göre arama

---

## 🚀 Kurulum Adımları

### 1. Environment Variables

`.env` dosyasına OpenAI API anahtarını ekleyin:

```env
# OpenAI API (GPT-4 Turbo + Embeddings)
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_CHAT_MODEL=gpt-4-turbo-preview  # veya gpt-3.5-turbo
```

**API Anahtarı:**
1. https://platform.openai.com/ adresine gidin
2. API Keys bölümünden yeni anahtar oluşturun
3. Anahtarı kopyalayıp `.env` dosyasına ekleyin

**Model Seçenekleri:**
- `gpt-4-turbo-preview` - En akıllı (önerilen)
- `gpt-4` - Güçlü ama daha yavaş
- `gpt-3.5-turbo` - Hızlı ve ekonomik

### 2. Veritabanı Migration

Topics tablosunu oluşturun:

```bash
cd backend
node scripts/runTopicsMigration.js
```

**Oluşturulacaklar:**
- `topics` tablosu
- `conversations.suggested_topic` kolonu
- Performans indeksleri
- Full-text search indeksleri

### 3. Bağımlılıklar

Backend'de yeni bağımlılık yok, OpenAI native `fetch` ile çağrılıyor.

Frontend'de yeni bileşenler otomatik import edilecek.

### 4. Sunucuları Başlatın

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run dev
```

---

## 📂 Dosya Yapısı

### Backend - Yeni Dosyalar

```
backend/
├── utils/
│   └── openaiClient.js                 # OpenAI API client
├── lib/
│   ├── embedding.js                    # Embedding fonksiyonları
│   └── rag.js                          # RAG modülü
├── migrations/
│   └── create_topics_table.sql         # Topics tablosu
└── scripts/
    └── runTopicsMigration.js           # Migration script
```

### Frontend - Yeni Dosyalar

```
frontend/
└── src/
    └── components/
        └── chat/
            └── SmartPromptSuggester.tsx  # Akıllı öneri bileşeni
```

### Güncellenen Dosyalar

- `backend/controllers/aiChatController.js` - OpenAI entegrasyonu
- `backend/routes/aiChat.js` - Yeni endpoint'ler
- `frontend/pages/chat/[id].tsx` - SmartPromptSuggester entegrasyonu

---

## 🔌 API Endpoints

### 🆕 Yeni Endpoint'ler

#### GET `/api/ai-chat/suggestions`
Popüler konuları getirir.

**Query Params:**
- `limit` (number, default: 10) - Döndürülecek konu sayısı

**Response:**
```json
{
  "success": true,
  "topics": [
    {
      "id": "uuid",
      "title": "Yapay Zeka ve Gelecek",
      "description": "AI'nın günlük hayatımızdaki rolü",
      "usage_count": 15,
      "creator_name": "Ahmet Yılmaz"
    }
  ]
}
```

#### GET `/api/ai-chat/conversations/:id/suggestions`
Kullanıcıya özel akıllı öneriler getirir.

**Response:**
```json
{
  "success": true,
  "suggestions": {
    "yourPreviousTopics": [
      {
        "title": "Çocukluk Anıları",
        "description": "İlkokul yıllarım",
        "type": "previous"
      }
    ],
    "relatedTopics": [
      {
        "title": "Nostalji ve Hatıralar",
        "description": "Geçmişe dönüş",
        "similarity": 0.87,
        "creatorName": "Ayşe Demir",
        "type": "related"
      }
    ]
  }
}
```

### 🔄 Güncellenen Endpoint

#### POST `/api/ai-chat/conversations/:id/messages`
Artık OpenAI kullanıyor, akıllı prompting yapıyor ve otomatik konu çıkarımı yapıyor.

**Yeni Davranışlar:**
1. Kullanıcının geçmiş konuları sistem promptuna eklenir
2. Sohbet 6+ mesaja ulaştığında otomatik konu çıkarımı yapılır
3. Çıkarılan konu `topics` tablosuna eklenir
4. OpenAI başarısız olursa Claude'a fallback yapılır

---

## 🤖 OpenAI Client Özellikleri

### Chat Completion

```javascript
const openaiClient = require('./utils/openaiClient');

const response = await openaiClient.generateChatCompletion(messages, {
  systemPrompt: 'Custom system prompt',
  temperature: 0.8,
  maxTokens: 2000,
});

console.log(response.content);  // AI yanıtı
console.log(response.usage);    // Token kullanımı
```

### Text Embedding

```javascript
const { embedText, embedTexts } = require('./lib/embedding');

// Tek metin
const embedding = await embedText('Hello world');
// 1536-boyutlu vektör

// Çoklu metin (batch)
const embeddings = await embedTexts(['Text 1', 'Text 2', 'Text 3']);
// Array of 1536-dim vectors
```

### Cosine Similarity

```javascript
const { cosineSimilarity } = require('./lib/embedding');

const similarity = cosineSimilarity(embedding1, embedding2);
// 0 ile 1 arası benzerlik skoru
```

---

## 🔍 RAG (Retrieval-Augmented Generation)

### Konu Saklama

```javascript
const { storeTopic } = require('./lib/rag');

const topic = await storeTopic({
  title: 'Yapay Zeka',
  description: 'AI ve makine öğrenimi',
  userId: 'user-uuid',
});
```

### Benzer Konuları Bulma

```javascript
const { findSimilarTopics } = require('./lib/rag');

const similar = await findSimilarTopics('teknoloji hakkında', {
  userId: 'user-uuid',
  excludeUserId: true,  // Diğer kullanıcıların konuları
  limit: 5,
});
```

### Kullanıcıya Özel Öneriler

```javascript
const { suggestTopicsForUser } = require('./lib/rag');

const suggestions = await suggestTopicsForUser(
  'user-uuid',
  'son sohbet içeriği'
);
```

### Otomatik Konu Çıkarımı

```javascript
const { extractAndStoreTopic } = require('./lib/rag');

// Sohbetten otomatik konu çıkar ve sakla
const topic = await extractAndStoreTopic('conversation-uuid', 'user-uuid');
```

---

## 🎨 SmartPromptSuggester Bileşeni

### Kullanım

```tsx
<SmartPromptSuggester
  conversationId={conversationId}
  onSelectSuggestion={(prompt) => sendMessage(prompt)}
/>
```

### Özellikler

**Tab 1: Akıllı Öneriler**
- 📚 Daha Önce Konuştuklarınız (Previous topics)
- ✨ Benzer İlginç Konular (Related topics with similarity scores)

**Tab 2: Popüler Konular**
- 🔥 En Çok Kullanılan Konular (Usage count ile)

**Görünüm:**
- Chip-style butonlar (kolay tıklama)
- Renk kodlaması (mavi: geçmiş, mor: benzer, yeşil: popüler)
- Hover efektleri
- Dark mode desteği

---

## 🧠 Yönlendirici Prompt Sistemi

### System Prompt

OpenAI'ya verilen sistem promptu:

```
Sen LingRoot AI Assistant'sın. Kullanıcılara İngilizce öğrenme içeriği 
oluşturmalarında yardımcı oluyorsun.

GÖREVIN:
1. Kullanıcıyla sıcak, motive edici bir tonla konuş
2. Onları öğretici, derinlemesine anlatılabilir bir konu seçmeye yönlendir
3. Çok genel konular yerine spesifik, ilgi çekici konular öner
4. CEFR seviyeleri (A1-C2) hakkında bilgilendir

YAKLAŞIMIN:
- İlk mesajlarda kullanıcıyı tanımaya çalış
- İlgi alanlarını öğren
- Belirsiz cevaplarda detay iste
- Somut, öğretici içerik fikirleri sun

BAĞLAM:
Kullanıcının daha önce şu konular hakkında konuşmuş: [...]
```

### Örnek Diyalog Akışı

**1. Açılış:**
> AI: Selam! 👋 Bugün neyle ilgilenmek istersin? Teknoloji, spor, sanat, 
> seyahat gibi konulardan birini seçebilir ya da kendi fikrin olabilir.

**2. İlgi Belirleme:**
> Kullanıcı: Teknoloji ilgimi çekiyor.
> AI: Harika seçim! Teknolojide hangi alan daha çok ilgini çekiyor? 
> Yapay zeka, mobil uygulamalar, oyun geliştirme, kripto paralar...?

**3. Detaylandırma:**
> Kullanıcı: Yapay zeka.
> AI: Süper! 🤖 Yapay zeka ile ilgili belirli bir konu düşünüyor musun? 
> Örneğin günlük hayatta kullandığın bir AI tool, ilginç bir haber ya da 
> kişisel bir deneyimin oldu mu?

**4. Konu Oluşturma:**
> Kullanıcı: ChatGPT'yi çok kullanıyorum.
> AI: Mükemmel! ChatGPT'nin hayatını nasıl değiştirdiğini, en çok hangi 
> işlerde kullandığını anlatan bir metin yazabiliriz. B1 seviyesinde olsun mu?

---

## 📊 Veri Akışı

```
1. Kullanıcı mesaj gönderir
   ↓
2. Backend geçmiş mesajları alır
   ↓
3. Kullanıcının önceki konuları DB'den çekilir
   ↓
4. Akıllı system prompt oluşturulur
   ↓
5. OpenAI'ya istek gönderilir
   ↓
6. AI yanıtı kullanıcıya gösterilir
   ↓
7. (6+ mesaj varsa) Otomatik konu çıkarımı yapılır
   ↓
8. Çıkarılan konu embedding ile saklanır
   ↓
9. Benzer konular için RAG hazır
```

---

## 💰 Maliyet Hesaplama

### OpenAI Fiyatlandırma (2024)

**GPT-4 Turbo:**
- Input: $10 / 1M tokens
- Output: $30 / 1M tokens

**GPT-3.5 Turbo:**
- Input: $0.50 / 1M tokens
- Output: $1.50 / 1M tokens

**Text Embedding (ada-002):**
- $0.10 / 1M tokens

### Örnek Hesaplama

**Ortalama sohbet (GPT-4 Turbo):**
- 10 mesaj exchange
- ~500 token input per turn
- ~800 token output per turn
- Total: 13,000 tokens

**Maliyet:**
- Input: 5,000 × $10/1M = $0.05
- Output: 8,000 × $30/1M = $0.24
- **Toplam: ~$0.29 per sohbet**

**Embedding (her konu için 1 kez):**
- ~200 token per topic
- $0.10 / 1M = **$0.00002 per topic**

**Aylık maliyet (1000 kullanıcı):**
- 1000 kullanıcı × 10 sohbet = 10,000 sohbet
- 10,000 × $0.29 = **~$2,900/ay**

**Optimizasyon:**
- GPT-3.5 Turbo kullanarak **~$150/ay** (20x daha ucuz)
- Temperature düşürerek token kullanımını azalt
- Cache system prompt'u

---

## 🧪 Test Senaryoları

### 1. Yönlendirici Diyalog Testi

```
Kullanıcı: "Merhaba"
Beklenen: Sıcak karşılama + ilgi alanı sorusu

Kullanıcı: "Teknoloji"
Beklenen: Teknoloji içinde detaylandırma sorusu

Kullanıcı: "ChatGPT kullanıyorum"
Beklenen: Kişisel deneyim sorgusu + seviye önerisi
```

### 2. RAG Testi

```bash
# 1. Bir konu kaydet
curl -X POST /api/ai-chat/conversations/{id}/messages \
  -d '{"content": "Yapay zeka hakkında konuşalım"}'

# 2. 6+ mesaj sonra otomatik konu çıkarımını bekle

# 3. Önerileri kontrol et
curl /api/ai-chat/conversations/{id}/suggestions

# Beklenen: Benzer konular listesi
```

### 3. Embedding Similarity Testi

```javascript
const { embedText, cosineSimilarity } = require('./lib/embedding');

const emb1 = await embedText('Yapay zeka ve makine öğrenimi');
const emb2 = await embedText('AI ve neural networks');
const emb3 = await embedText('Yemek tarifleri');

console.log(cosineSimilarity(emb1, emb2)); // ~0.85 (yüksek benzerlik)
console.log(cosineSimilarity(emb1, emb3)); // ~0.15 (düşük benzerlik)
```

---

## 🔧 Sorun Giderme

### "OpenAI API key is not configured"
- `.env` dosyasında `OPENAI_API_KEY` var mı?
- Backend'i yeniden başlattınız mı?

### "Topics tablosu bulunamadı"
- Migration çalıştırıldı mı?
```bash
node scripts/runTopicsMigration.js
```

### Embeddingler çalışmıyor
- OpenAI API kotanız var mı?
- API key'in embedding yetkisi var mı?

### Öneriler görünmüyor
- Henüz konu oluşturulmamış olabilir (6+ mesaj gerekli)
- Embedding işlemi background'da çalışıyor, birkaç saniye bekleyin

### OpenAI rate limit hatası
- Free tier kullanıyorsanız limitlere takılmış olabilirsiniz
- Pay-as-you-go'ya geçin veya rate limiting ekleyin

---

## 🎯 Sonraki Adımlar

Şimdi sistemi test etmek için:

### 1. Migration Çalıştırın
```bash
cd backend
node scripts/runTopicsMigration.js
```

### 2. Environment Variables Ekleyin
```bash
# backend/.env
OPENAI_API_KEY=sk-proj-xxxxx
```

### 3. Sunucuları Başlatın
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run dev
```

### 4. Test Edin
1. http://localhost:3000/chat/new
2. Birkaç mesaj gönderin
3. Akıllı önerilerin görünmesini bekleyin
4. Popüler konular sekmesine bakın

---

**🎉 Smart Chat sistemi hazır!**

Artık LingRoot:
- ✅ Kullanıcıları yönlendirir
- ✅ Akıllı öneriler sunar
- ✅ Geçmişi hatırlar
- ✅ Benzer konuları bulur
- ✅ Öğrenir ve gelişir

**Geliştirici:** Windsurf / Claude 4.5  
**Tarih:** 2025-01-04  
**Versiyon:** 3.0 (Smart Chat)
