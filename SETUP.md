# LingRoot Setup Guide

**Son Güncelleme:** Aralık 2025

## Gereksinimler

- **Node.js:** v20.x (backend), v18+ (frontend)
- **PostgreSQL:** Supabase üzerinden
- **FFmpeg:** Audio işleme için gerekli
- **Google Cloud Account:** TTS için
- **OpenAI API Key:** AI özellikleri için

## Environment Variables

### Backend (.env)

`backend/` dizininde `.env` dosyası oluşturun:

```bash
# Server Configuration
NODE_ENV=development
PORT=5001
LOG_LEVEL=debug

# Database (Supabase PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=audio-outputs

# Authentication
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=sk-your-openai-key

# TTS Services (en az biri gerekli)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
AZURE_SPEECH_KEY=your-azure-key
AZURE_SPEECH_REGION=westeurope

# Frontend URL (CORS için)
FRONTEND_URL=http://localhost:3000

# Optional - IAP
GOOGLE_PLAY_PACKAGE_NAME=com.lingroot.app
APPLE_SHARED_SECRET=your-apple-secret
```

### Frontend (.env.local)

`frontend/` dizininde `.env.local` dosyası oluşturun:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001

# Supabase Client
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Database Setup

1. [Supabase](https://supabase.com) üzerinden proje oluşturun

2. **Temel Tablolar** - Aşağıdaki migration'ları sırayla çalıştırın:

### Users Tablosu
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',
    membership_status VARCHAR(20) DEFAULT 'free',
    plan_id INTEGER REFERENCES plans(id),
    cefr_level VARCHAR(10) DEFAULT 'A2',
    native_language VARCHAR(10) DEFAULT 'tr',
    target_language VARCHAR(10) DEFAULT 'en',
    profile_image_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    provider VARCHAR(50) DEFAULT 'email',
    provider_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);
```

### Conversations & Messages (AI Chat)
```sql
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    suggested_topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Topics (Konu Önerileri)
```sql
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    embedding TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Books & Chapters
```sql
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    gutendex_id INTEGER,
    title TEXT NOT NULL,
    authors TEXT,
    cover_url TEXT,
    download_count INTEGER DEFAULT 0,
    language VARCHAR(10),
    copyright BOOLEAN,
    subjects TEXT,
    text_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_chapters (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    chapter_index INTEGER NOT NULL,
    chapter_title TEXT,
    chapter_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapter_audio (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER REFERENCES book_chapters(id) ON DELETE CASCADE,
    voice_model VARCHAR(100) NOT NULL,
    speaking_rate DECIMAL(3,2) NOT NULL,
    level VARCHAR(10) NOT NULL,
    mp3_url VARCHAR(1000) NOT NULL,
    vtt_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, voice_model, speaking_rate, level)
);
```

### Plans & Subscriptions
```sql
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    daily_limit INTEGER DEFAULT 1,
    features JSONB,
    google_product_id VARCHAR(100),
    apple_product_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    status VARCHAR(20) DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    provider VARCHAR(50),
    provider_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Tüm migration'lar için `backend/migrations/` klasörüne bakın.

## Running the Application

### Backend
```bash
cd backend
npm install
npm run dev
```
Backend `http://localhost:5001` adresinde başlar.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend `http://localhost:3000` adresinde başlar.

## FFmpeg Kurulumu

### Windows
```powershell
winget install ffmpeg
# veya
choco install ffmpeg
```

### macOS
```bash
brew install ffmpeg
```

### Linux
```bash
sudo apt install ffmpeg
```

## Authentication Flow

Sistem çoklu auth yöntemlerini destekler:
- **Email/Password:** JWT tabanlı, opsiyonel MFA (TOTP)
- **Google Sign-In:** OAuth 2.0
- **Apple Sign-In:** Apple ID ile giriş
- **Facebook Sign-In:** Facebook OAuth

## API Endpoints

### Auth
- `POST /api/auth/register` - Kayıt
- `POST /api/auth/login` - Giriş
- `POST /api/auth/verify-mfa` - MFA doğrulama

### AI Chat
- `GET /api/chat/conversations` - Konuşma listesi
- `POST /api/chat/conversations` - Yeni konuşma
- `POST /api/ai-chat/send` - Mesaj gönder

### Content
- `POST /api/tts/process-text` - Metin işle
- `POST /api/tts/process-youtube` - YouTube işle
- `GET /api/books` - Kitap listesi

### Topics
- `GET /api/topic-hierarchy` - Konu hiyerarşisi
- `POST /api/topic-pipeline/generate` - İçerik üret

Tüm endpoint'ler için `backend/routes/` klasörüne bakın. 