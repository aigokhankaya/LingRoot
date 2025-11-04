# LingRoot AI Chat Setup Guide

Bu dokuman, LingRoot'a eklenen ChatGPT-benzeri AI sohbet özelliğinin kurulum ve kullanım kılavuzudur.

## 📋 Özellikler

- ✅ ChatGPT benzeri modern sohbet arayüzü
- ✅ Sol panelde sohbet geçmişi
- ✅ Claude 4.5 (Sonnet) entegrasyonu
- ✅ Real-time mesajlaşma
- ✅ Typing indicator animasyonu
- ✅ Responsive tasarım (mobil uyumlu)
- ✅ Dark mode desteği
- ✅ Sohbet geçmişi saklama

## 🗃️ Veritabanı Tabloları

### 1. `conversations` Tablosu
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2. `messages` Tablosu
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP
);
```

## 🚀 Kurulum Adımları

### 1. Veritabanı Migration

Veritabanı tablolarını oluşturun:

```bash
# Backend dizininde
cd backend
node scripts/runChatMigration.js
```

### 2. Environment Variables

`.env` dosyasına Claude API anahtarınızı ekleyin:

```env
# Claude AI (Anthropic)
CLAUDE_API_KEY=sk-ant-api03-xxxxx
# veya
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

**API Anahtarı Nasıl Alınır:**
1. https://console.anthropic.com/ adresine gidin
2. Hesap oluşturun veya giriş yapın
3. API Keys bölümünden yeni bir anahtar oluşturun
4. Anahtarı kopyalayıp `.env` dosyasına yapıştırın

### 3. Backend Bağımlılıkları

Backend'de gerekli paketler zaten yüklü. Eğer hata alırsanız:

```bash
cd backend
npm install
```

### 4. Frontend Bağımlılıkları

Frontend'de zaten kurulu olan paketler:
- `lucide-react` (ikonlar için)
- `@radix-ui` komponentleri (shadcn/ui)

Kontrol edin:
```bash
cd frontend
npm install
```

### 5. Sunucuları Başlatın

**Backend:**
```bash
cd backend
npm start
# veya development için
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 📂 Dosya Yapısı

### Frontend
```
frontend/
├── pages/
│   └── chat/
│       ├── assistant.tsx          # Yönlendirme sayfası
│       └── [id].tsx               # Ana chat sayfası
├── src/
│   └── components/
│       ├── chat/
│       │   ├── ChatMessage.tsx    # Mesaj bileşeni
│       │   ├── ChatInput.tsx      # Giriş alanı
│       │   └── TypingIndicator.tsx # Yazma göstergesi
│       └── sidebar/
│           ├── Sidebar.tsx        # Ana sidebar
│           └── ConversationList.tsx # Sohbet listesi
```

### Backend
```
backend/
├── routes/
│   └── aiChat.js                  # API routes
├── controllers/
│   └── aiChatController.js        # İş mantığı
├── utils/
│   └── claudeClient.js            # Claude API istemcisi
├── migrations/
│   └── create_chat_tables.sql     # Veritabanı şeması
└── scripts/
    └── runChatMigration.js        # Migration scripti
```

## 🔌 API Endpoints

### GET `/api/ai-chat/conversations`
Kullanıcının tüm sohbetlerini getirir.

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "title": "İngilizce Öğrenme",
      "created_at": "2025-01-01T10:00:00Z",
      "updated_at": "2025-01-01T10:30:00Z"
    }
  ]
}
```

### POST `/api/ai-chat/conversations`
Yeni bir sohbet oluşturur.

**Request:**
```json
{
  "title": "Yeni Sohbet"
}
```

### GET `/api/ai-chat/conversations/:id/messages`
Bir sohbetin tüm mesajlarını getirir.

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Merhaba!",
      "created_at": "2025-01-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Merhaba! Size nasıl yardımcı olabilirim?",
      "created_at": "2025-01-01T10:00:05Z"
    }
  ]
}
```

### POST `/api/ai-chat/conversations/:id/messages`
Yeni bir mesaj gönderir ve Claude'dan yanıt alır.

**Request:**
```json
{
  "content": "B1 seviyesinde bir metin oluştur"
}
```

**Response:**
```json
{
  "success": true,
  "userMessage": { /* mesaj objesi */ },
  "assistantMessage": { /* Claude'dan gelen mesaj */ }
}
```

## 🎨 Kullanıcı Arayüzü

### Welcome Sayfasından Erişim

Welcome sayfasına eklenen kart üzerine tıklandığında `/chat/assistant` rotasına yönlendirir, bu da otomatik olarak yeni bir sohbet oluşturur.

### Sohbet Arayüzü Özellikleri

- **Sol Panel (Sidebar)**
  - Geçmiş sohbetler listesi
  - "Yeni Sohbet" butonu
  - Her sohbetin başlığı ve tarihi
  - Mobilde collapse edilebilir

- **Sağ Panel (Chat Area)**
  - Mesaj geçmişi (scroll edilebilir)
  - Kullanıcı mesajları: Mavi, sağda
  - Claude mesajları: Gri, solda
  - Typing indicator animasyonu
  - Alt kısımda mesaj girişi

- **Responsive Tasarım**
  - Desktop: Sol panel + sohbet alanı yan yana
  - Mobil: Hamburger menü ile sidebar açılır

## 🧪 Test Etme

### Manuel Test
1. Frontend ve backend'i çalıştırın
2. Tarayıcıda `/welcome` sayfasına gidin
3. "LingRoot AI ile İçerik Oluştur" kartına tıklayın
4. Bir mesaj gönderin (örn: "Merhaba!")
5. Claude'dan yanıt almalısınız

### API Test (curl)
```bash
# Token alın (giriş yapın)
TOKEN="your_jwt_token"

# Yeni sohbet oluştur
curl -X POST http://localhost:5001/api/ai-chat/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}'

# Mesaj gönder
CONV_ID="conversation_id"
curl -X POST http://localhost:5001/api/ai-chat/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello Claude!"}'
```

## 🔧 Sorun Giderme

### "Claude API key is not configured" Hatası
- `.env` dosyasında `CLAUDE_API_KEY` veya `ANTHROPIC_API_KEY` tanımlı mı?
- Backend'i yeniden başlattınız mı?

### "Konuşma bulunamadı" Hatası
- Migration çalıştırıldı mı?
- Veritabanı bağlantısı çalışıyor mu?

### Mesajlar Görünmüyor
- Browser console'da hata var mı?
- API endpoint'leri doğru mu? (`/api/ai-chat/...`)
- Token geçerli mi? (localStorage'da `token` var mı?)

### Claude Yanıt Vermiyor
- Claude API limitleri kontrol edin
- API anahtarı geçerli mi?
- Backend logs'larda hata var mı?

## 📝 Geliştirme Notları

### Claude System Prompt
`claudeClient.js` içinde sistem promptu özelleştirilebilir:
- CEFR seviyeleri (A1-C2) için özel davranışlar
- İçerik türleri (metin, podcast, alıştırma vb.)
- Dil tercihi (Türkçe/İngilizce)

### Örnek Kullanım Senaryoları

**1. İçerik Oluşturma:**
```
Kullanıcı: "B1 seviyesinde teknoloji hakkında bir metin yaz"
Claude: [B1 seviyesinde teknoloji metni oluşturur]
```

**2. Kelime Öğretimi:**
```
Kullanıcı: "entrepreneur kelimesini A2 seviyesinde açıkla"
Claude: [Basit İngilizce ile açıklama yapar]
```

**3. Alıştırma:**
```
Kullanıcı: "present perfect tense ile 5 cümle yaz"
Claude: [5 örnek cümle oluşturur]
```

## 🚀 Production Deployment

### Supabase Migration
```sql
-- Supabase Dashboard > SQL Editor'de çalıştırın
-- create_chat_tables.sql dosyasının içeriğini yapıştırın
```

### Environment Variables (Render/Vercel)
```
CLAUDE_API_KEY=sk-ant-api03-xxxxx
```

### CORS Ayarları
Backend `server.js` içinde frontend domain'i ekleyin:
```javascript
const allowedOrigins = [
  "https://yourdomain.com",
  // ...
];
```

## 📊 Maliyet ve Limitler

Claude API kullanımı ücretlidir. Fiyatlandırma:
- Input: ~$3 / 1M tokens
- Output: ~$15 / 1M tokens

**Örnek Hesaplama:**
- Ortalama sohbet: 500 token input + 1000 token output
- Maliyet: (500 × $3/1M) + (1000 × $15/1M) = ~$0.02 per sohbet
- 1000 sohbet = ~$20

## 🎯 Gelecek Geliştirmeler

- [ ] Streaming responses (gerçek zamanlı yazma)
- [ ] Sesli mesaj desteği
- [ ] Dosya/resim yükleme
- [ ] Sohbet paylaşma
- [ ] Sohbet dışa aktarma (PDF/Markdown)
- [ ] Sohbet arama
- [ ] Favorilere ekleme
- [ ] Etiketleme/kategorilendirme

## 📞 Destek

Sorun yaşarsanız:
1. Bu README'yi kontrol edin
2. Backend logs'ları inceleyin
3. Browser console'u kontrol edin
4. GitHub Issues'da arama yapın

---

**İyi Kodlamalar! 🚀**
