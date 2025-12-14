# LingRoot - AI-Powered Language Learning Platform

**Son Güncelleme:** Aralık 2025

LingRoot, kullanıcıların dil becerilerini geliştirmelerine yardımcı olan, yapay zeka destekli bir dil öğrenme platformudur. Metin, web, kitap ve çeşitli kaynaklardan CEFR seviyesine uyarlanmış sesli içerikler üretir.

## Project Structure

```
LingRoot/
├── backend/              # Node.js (Express) backend API
│   ├── config/           # Veritabanı ve uygulama konfigürasyonu
│   ├── controllers/      # 29 controller (AI Chat, TTS, Books, Topics, IAP vb.)
│   ├── middleware/       # Auth, rate limiting, validation
│   ├── routes/           # 31 route modülü
│   ├── utils/            # TTS, CEFR adapter, text processor vb.
│   ├── prompts/          # 49 AI prompt dosyası (CEFR seviyelerine göre)
│   ├── migrations/       # 54 SQL migration dosyası
│   ├── docs/             # Backend dokümantasyonu
│   ├── scripts/          # Utility scriptleri
│   └── server.js         # Ana giriş noktası
├── frontend/             # Next.js 14 web uygulaması
│   ├── src/
│   │   ├── app/          # 30 sayfa/layout (App Router)
│   │   ├── components/   # 82 React bileşeni
│   │   ├── lib/          # API, i18n, utilities
│   │   ├── services/     # API servis katmanı
│   │   ├── types/        # TypeScript tipleri
│   │   └── context/      # React Context providers
│   └── package.json
├── LingRootMobile/       # React Native (Expo) mobil uygulama
│   ├── src/              # Mobil uygulama kaynak kodu
│   ├── ios/              # iOS native konfigürasyonu
│   ├── android/          # Android native konfigürasyonu
│   └── Docs/             # Mobil dokümantasyon
├── docs/                 # Proje geneli dokümantasyon
│   ├── ONBOARDING.md     # 🆕 Yeni geliştiriciler için 5 günlük rehber
│   ├── templates/        # 🆕 Doküman şablonları
│   ├── architecture/     # Mimari dokümanlar
│   ├── api/              # API referansı
│   ├── testing/          # Test planları
│   └── database/         # Veritabanı şeması
├── analiz/               # Analiz ve raporlar
└── scripts/              # Global utility scriptleri
```

**🚀 Yeni Başlıyorsanız:** [`docs/ONBOARDING.md`](docs/ONBOARDING.md) dosyasını okuyun!

## Features

### İçerik İşleme
- **Text-to-Speech (TTS):** Google Cloud TTS, Azure TTS, AWS Polly desteği
- **CEFR Adaptation:** OpenAI GPT-4o ile A1-C2 seviye uyarlama
- **Multi-Input Support:**
  - ✅ **Text:** Doğrudan metin girişi
  - ✅ **File:** PDF, DOCX, TXT, EPUB dosya yükleme
  - ✅ **Topic Tree:** Konu bazlı içerik üretimi
  - ✅ **Web:** Web sayfası içerik çıkarma
  - ✅ **Books:** Gutenberg kütüphanesinden kitap okuma
  - ✅ **Topic Pipeline:** Konu bazlı otomatik içerik üretme

### AI Özellikleri
- **AI Chat:** ChatGPT benzeri dil asistanı
- **Topic Suggestions:** Kullanıcı ilgilerine göre konu önerileri (RAG)
- **CEFR Prompts:** Her seviye için özelleştirilmiş 49 prompt
- **Bilingual Content:** İki dilli içerik üretimi

### Kullanıcı Yönetimi
- **Multi-Auth:** Email/Password, Google, Apple, Facebook
- **MFA:** TOTP tabanlı iki faktörlü doğrulama
- **Subscriptions:** Plan tabanlı üyelik sistemi
- **IAP:** Google Play ve Apple App Store entegrasyonu

### Platform Desteği
- **Web:** Next.js 14 (App Router)
- **Mobile:** React Native (Expo) - iOS & Android
- **API:** RESTful + WebSocket (Socket.io)

## Environment Variables

Create a `.env` file in the `backend/` directory based on `backend/.env.example`. Fill in the required credentials:

*   `NODE_ENV`: `development` or `production`
*   `PORT`: Port for the backend server (e.g., `5001`)
*   `LOG_LEVEL`: Logging verbosity (`error`, `warn`, `info`, `http`, `debug`)
*   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database credentials (if applicable)
*   `JWT_SECRET`, `JWT_EXPIRES_IN`: For user authentication
*   `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`: For email services
*   **`OPENAI_API_KEY`**: **Required** for CEFR adaptation.
*   **`GOOGLE_APPLICATION_CREDENTIALS`**: **Required** for Google TTS. Set the absolute path to your GCP service account key file.
*   **`SUPABASE_URL`**: **Required** for audio storage.
*   **`SUPABASE_SERVICE_KEY`**: **Required** for audio storage (use the `service_role` key).
*   `SUPABASE_BUCKET_NAME`: Name of the Supabase bucket for audio files (e.g., `audio-outputs`).
*   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: For payment processing (if applicable).
*   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: For SMS services (if applicable).
*   `FRONTEND_URL`: URL of the frontend application (e.g., `http://localhost:3000`).

Create a `.env.local` file in the `frontend/` directory:

*   `NEXT_PUBLIC_API_URL`: URL of the running backend server (e.g., `http://localhost:5001`).

## Setup and Installation

**Prerequisites:**

*   Node.js (v18 or later recommended)
*   npm or pnpm
*   `ffmpeg` installed on the backend server (for audio merging)

**Backend Setup:**

1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
3.  Edit `.env` and add your actual credentials (OpenAI, Google Cloud, Supabase are essential for TTS).
4.  Install dependencies:
    ```bash
    npm install
    ```
5.  Run the development server:
    ```bash
    npm run dev
    ```
    The backend should start, typically on the port specified in `.env` (default 5001).

**Frontend Setup:**

1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Create the local environment file:
    ```bash
    touch .env.local
    ```
3.  Edit `.env.local` and set `NEXT_PUBLIC_API_URL` to your backend server's address (e.g., `NEXT_PUBLIC_API_URL=http://localhost:5001`).
4.  Install dependencies:
    ```bash
    npm install
    ```
5.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend should start, typically on `http://localhost:3000`.

## API Usage Example (TTS)

**Endpoint:** `POST /api/tts/process`

**Request Body (JSON):**

```json
{
  "input": "This is a sample text to be converted to speech.",
  "type": "text",
  "level": "B1",
  "SesHızı": 1.0
}
```

**Request Body (Multipart Form Data for File Upload):**

*   `input`: (Optional) Can be empty if type is 'file'.
*   `type`: `file`
*   `level`: `B1` (or desired CEFR level)
*   `SesHızı`: `1.0` (or desired speaking rate)
*   `file`: The actual file (`.txt`, `.pdf`, `.docx`) being uploaded.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "This is sample text. It will be changed to speech.", // The CEFR-adapted text
  "mp3_url": "https://your-project-ref.supabase.co/storage/v1/object/public/audio-outputs/lingroot_B1_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.mp3",
  "level": "B1",
  "vtt_url": "" // Placeholder for future VTT generation
}
```

**Error Response (e.g., 400 Bad Request):**

```json
{
  "success": false,
  "message": "Missing required input parameters (type, input/file, level)"
}
```

## Testing

*   **Backend:** Unit/integration tests can be added using frameworks like Jest or Mocha/Chai (basic setup might exist).
    ```bash
    # cd backend
    # npm test
    ```
*   **Frontend:** Use standard Next.js testing practices (e.g., Jest, React Testing Library).
*   **Manual:** Run both backend and frontend servers and use the web interface to test the TTS functionality with text input.

## Deployment

### Backend Deployment Options

#### Option 1: Cloudflare Tunnel (Recommended for Local Development)

Cloudflare Tunnel ile backend'inizi lokal bilgisayarınızdan internete açabilirsiniz. Render'e deploy etmeye gerek kalmaz.

**Avantajları:**
- ✅ Ücretsiz ve sınırsız trafik
- ✅ Otomatik HTTPS
- ✅ Lokal geliştirme ortamınızdan çalışır
- ✅ Hızlı test ve debug

**Hızlı Başlangıç:**

```powershell
# 1. Cloudflared kur
choco install cloudflared

# 2. Otomatik kurulum script'ini çalıştır
cd f:\Main
.\setup-cloudflare-tunnel.ps1

# 3. Backend'i başlat
cd backend
npm run dev

# 4. Tunnel'ı başlat
cloudflared tunnel run lingroot-mfa
```

**Detaylı Rehberler:**
- 📚 **Detaylı Kurulum**: `CLOUDFLARE_TUNNEL_SETUP.md`
- 🚀 **Hızlı Başlangıç**: `CLOUDFLARE_TUNNEL_QUICKSTART.md`
- 🧪 **Test Script'i**: `test-cloudflare-tunnel.ps1`

#### Option 2: Render (Cloud Deployment)

*   Ensure `ffmpeg` is available in the build environment.
*   Set environment variables in the Render service settings.
*   Use `npm start` as the start command.

### Frontend Deployment

*   **Vercel:**
    *   Set the `NEXT_PUBLIC_API_URL` environment variable in Vercel to the deployed backend URL.
    *   Vercel should automatically detect and build the Next.js application.

## MCP (Main Codebase Pattern) Uyumlu Kod Standartları

LingRoot projesinde kodun sürdürülebilirliği ve hatasız build için aşağıdaki MCP standartlarına uyulmaktadır:

- **Tipler (Types/Interfaces):**
  - Tüm ana tipler (ör. `User`, `AuthContextType`, `MembershipLevel`) `src/types/` altında merkezi olarak tanımlanır ve her yerde import edilerek kullanılır.
  - Tekrar tip tanımı yapılmaz.
- **API Mapping:**
  - API'den gelen snake_case veriler, frontend'de camelCase'e map edilir. Mapping fonksiyonları `src/lib/` altında merkezi olarak tutulur.
- **Context ve Hook Kullanımı:**
  - Kullanıcı ve auth işlemleri için sadece `useAuth` kullanılır. Diğer context'ler merkezi hook'tan veri alır.
- **Dosya ve Dizin Yapısı:**
  - Her ana modül için ayrı dosya/dizin, ortak tipler ve yardımcılar merkezi bir yerde.
- **Bileşen Prop ve Enum Standartları:**
  - Bileşenlerde kullanılacak prop'lar (ör. `variant`, `status`) union type veya enum olarak merkezi bir yerde tanımlanır ve her yerde aynı isim/değerler kullanılır.
- **.gitignore:**
  - Sadece kökte bulunur, tüm alt dizinler için geçerlidir.
- **Bağımlılıklar:**
  - Tüm bağımlılıklar güncel ve eksiksiz olarak `package.json'da tutulur.

---

## 🛠️ System Component Summary & Key File Responsibilities

### 🧑‍💻 User Interface & Input Handling
- **File:** `apps/frontend/src/components/InputSection.jsx`  
  Manages all user input types: text, topic, web link, document upload, book selection, and Spotify link.

- **File:** `apps/frontend/src/app/page.jsx`  
  Contains the homepage layout and routes the main user flow.

### 🔁 API Communication (Frontend to Backend)
- **File:** `apps/frontend/src/lib/api.ts`  
  Contains functions that send input data to backend endpoints and handle responses.

### 📡 Backend API Endpoint Definition
- **File:** `apps/backend/routes/ttsRoutes.js`  
  Defines the main route `/api/tts/process` and routes input to the controller.

### 🧠 Main Processing Workflow (Backend)
- **File:** `apps/backend/controllers/ttsController.js`  
  Orchestrates the full pipeline: input validation → text extraction → translation → CEFR adaptation → text cleaning → TTS → audio merging → file upload → API response.

### 🧾 Input Text Extraction 
- **File:** `apps/backend/utils/inputExtractor.js`  
  Extracts plain text from raw input such as pasted text, URLs, documents.

### 🌐 Language Detection & Translation
- **Library:** `@vitalets/google-translate-api`  
  Automatically detects the language and translates non-English text to English (within `ttsController.js`).

### 🧹 Text Cleaning for TTS
- **File:** `apps/backend/utils/textProcessor.js`  
  `cleanTextForTTS` removes emojis, symbols, HTML/Markdown and normalizes spacing while preserving paragraph structure.

### 📘 CEFR Adaptation with GPT
- **File:** `apps/backend/utils/cefrAdapter.js`  
  Adapts the clean, translated text to a CEFR level (A1–C2) using a detailed OpenAI prompt while preserving paragraph and meaning structure.

### 📦 Text Chunking
- **File:** `apps/backend/utils/textProcessor.js`  
  `chunkText` breaks down CEFR-adapted text into chunks for TTS processing while preserving logical boundaries.

### 🔊 Text-to-Speech (Google TTS)
- **File:** `apps/backend/utils/googleTts.js`  
  Uses Google Cloud Text-to-Speech API to synthesize MP3 segments.

### 🔗 Audio Merging
- **File:** `apps/backend/utils/audioMerger.js`  
  Joins individual MP3 segments into a single final audio file.

### ☁️ File Upload (Supabase)
- **File:** `apps/backend/utils/storageUploader.js`  
  Uploads the final MP3 to Supabase Storage and returns the file URL.

### 📤 API Response Format
- **Location:** End of `ttsController.js`  
  Returns JSON with `translated_text`, `input_language`, `level`, `mp3_url`, and optionally `vtt_url`.

### 🔐 Configuration & API Keys
- Stored in `.env` (not included in repo):
  - `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - `GOOGLE_APPLICATION_CREDENTIALS` path
  - Email credentials, Stripe, JWT, etc.

---

## 🔗 Additional API Integrations

### 🎙️ Listen Notes API (for podcast transcript extraction)
- Website: [https://www.listennotes.com/api/](https://www.listennotes.com/api/)
- Free & paid tiers available. Allows transcript retrieval and podcast search.
- Can be integrated to retrieve text from podcast episodes for CEFR adaptation.

### 🧠 Gladia API (audio-to-text transcription)
- Website: [https://gladia.io/](https://gladia.io/)
- Provides accurate transcription of audio (MP3/WAV) with multi-language support.
- Can process Spotify or uploaded files and return clean transcripts for level transformation.
- API Docs: [https://docs.gladia.io](https://docs.gladia.io)

## 🚀 Konu (Topic) ile 15 Dakikalık Anlatım Akışı

### Kullanıcı Akışı
1. Kullanıcı ana ekranda **Konu** (Topic) butonuna tıklar ve bir başlık girer.
2. Backend, bu başlığı ChatGPT'ye göndererek yaklaşık 15 dakikalık, detaylı ve akıcı bir **Türkçe anlatım metni** oluşturur.
3. Oluşan Türkçe metin, OpenAI CEFR adaptasyon fonksiyonu ile kullanıcının seçtiği İngilizce seviyesine uygun şekilde **İngilizce'ye çevrilir**.
4. İngilizce metin, Google TTS ile ses dosyasına dönüştürülür.
5. Frontend'de kullanıcıya:
    - **Ses dosyası** (audio player)
    - **Altında İngilizce metin** (seviye adaptasyonlu)
    - **Varsa üstte Türkçe anlatım metni**
   birlikte gösterilir.

### Teknik Akış
- `type: "topic"` ile gelen isteklerde backend'de:
  1. `generateTopicText(topic)` fonksiyonu ile ChatGPT'den ~15 dakikalık Türkçe anlatım alınır.
  2. Bu metin, CEFR seviyesine uygun İngilizce'ye çevrilir (`adaptToCEFR`).
  3. İngilizce metin TTS ile ses dosyasına dönüştürülür.
  4. API yanıtında hem İngilizce metin (`message`), hem Türkçe metin (`original_turkish`), hem de ses dosyası (`mp3_url`) döner.

### Örnek API Yanıtı
```json
{
  "success": true,
  "message": "Adapted English text...",
  "original_turkish": "15 dakikalık Türkçe anlatım...",
  "mp3_url": "https://.../audio.mp3",
  ...
}
```

### Frontend
- Eğer `original_turkish` varsa, İngilizce metnin üstünde sarı kutuda gösterilir.
- İngilizce metin ve ses dosyası her zamanki gibi gösterilir.

## 🎯 Amaç
Kullanıcının girdiği konu başlığı üzerinden araştırma yapılacak, ardından bu konuda 15 dakikalık ses dosyasına uygun, sadeleştirilmiş ve seviyelendirilmiş bir İngilizce anlatım metni üretilecektir.

## ✅ GPT Prompt (Türkçe Anlatım + İngilizce Komut)
**Prompt Başlığı:** Konuya Dayalı İngilizce Anlatım Metni Üretimi (15 Dakika | CEFR Uyumlu)

```
Aşağıda verilen konu başlığı, kullanıcının ilgi alanına göre seçtiği kısa bir ifadedir. Bu konuyu temel alarak önce kısa bir araştırma yapın, ardından bu konu hakkında kullanıcıya 15 dakikalık bir anlatım sunacak şekilde detaylı bir İngilizce metin oluşturun.

🧠 Kurallar:
1. Konuyu derinlemesine ama sade bir dille anlatın. Herkesin anlayabileceği şekilde yazın.
2. Hedef İngilizce seviyesi: {{level}} (örn: A1, A2, B1…)
3. Metnin toplam uzunluğu yaklaşık **1500–1800 kelime** arası olmalı.
4. İçerik giriş, gelişme ve sonuç yapısına sahip olmalı.
5. NGSL (New General Service List) kelime dağarcığına uygun olun.
6. CEFR seviyesinin dışına çıkan karmaşık kelimeleri veya yapıları kullanmayın.
7. Paragraflar 100–120 kelime arası olmalı ve sesli anlatıma uygun, doğal ritimde yazılmalı.
8. Metin TTS (text-to-speech) için uygun olmalı: özel karakter, emoji, parantez, alıntı, başlık işareti vb. kullanılmamalı.

🎧 Hedef: Bu metin, daha sonra otomatik olarak seslendirilecek ve kullanıcıya 15 dakikalık bir İngilizce anlatım olarak sunulacak.

🎯 Kullanıcıdan gelen konu başlığı:
"{{konu}}"

Şimdi yukarıdaki kurallara uygun olarak, bu konuda seviyeye uygun İngilizce anlatım metni oluşturun. Paragraf paragraf ilerleyin, ancak başlık veya numaralandırma kullanmayın. Giriş bölümünden başlayın.

## Backend Pipeline (Ortak Metin İşleme Akışı)

Tüm içerik türleri için backend'de ortak bir metin işleme pipeline'ı kullanılır. Bu pipeline şunları içerir:

1. **Metin Çıkarma:**
   - `text`, `topic`, `file`, `weblink`, `youtube`, `book`, `spotify` gibi farklı türlerden metin çıkarılır.
2. **Metin Temizleme:**
   - Çıkarılan metin, TTS ve seviye dönüştürme için temizlenir.
3. **Seviye Dönüştürme & TTS:**
   - (Opsiyonel) CEFR seviyesine göre dönüştürme ve TTS için parçalara ayırma.

### Ortak Pipeline Kullanımı

Aşağıdaki endpointler, ilgili içerik türü için pipeline'ı tetikler:

- `POST /api/content/process-text`      → Metin
- `POST /api/content/process-file`      → Dosya (PDF, DOCX, TXT, vb.)
- `POST /api/content/process-link`      → Web Linki
- `POST /api/content/process-youtube`   → YouTube (Not implemented)
- `POST /api/content/process-web`       → Web (Not implemented)
- `POST /api/content/process-book`      → Kitap (Not implemented)
- `POST /api/content/process-spotify`   → Spotify (Not implemented)

Henüz yapılmamış türler için endpointler hazır, fonksiyonlar "not implemented" döndürür.

### Örnek Akış

1. Kullanıcı bir içerik türü seçer ve input gönderir.
2. İlgili endpoint'e istek atılır.
3. Pipeline:
   - Metin çıkarır
   - Temizler
   - (Varsa) seviye dönüştürür, TTS için işler
4. Sonuç frontend'e döner.

## Deployment Guide (Güncel)

- Backend ve frontend kurulum adımları değişmedi.
- Backend'de yeni pipeline ve endpointler eklendi. Tüm içerik türleri için ortak bir iş akışı vardır.
- Henüz tamamlanmamış içerik türleri için endpointler hazır, ileride kolayca geliştirilebilir.
