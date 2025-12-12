# Local Development Setup

**Last Updated:** December 2025  
**Estimated Time:** 30 minutes

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | v20.x | `winget install OpenJS.NodeJS.LTS` |
| npm | 10.x | Included with Node.js |
| Git | Latest | `winget install Git.Git` |
| FFmpeg | Latest | `winget install FFmpeg.FFmpeg` |
| PostgreSQL | 15+ | Via Supabase (cloud) |

### Required Accounts

| Service | Purpose | Signup URL |
|---------|---------|------------|
| Supabase | Database & Storage | https://supabase.com |
| OpenAI | AI/LLM | https://platform.openai.com |
| Google Cloud | TTS (optional) | https://console.cloud.google.com |
| Azure | TTS (optional) | https://portal.azure.com |

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/lingroot/lingroot.git
cd lingroot
```

### 2. Backend Setup

```bash
cd backend
npm install
cp env.example.txt .env
```

Edit `.env` with your credentials:

```env
# Server
NODE_ENV=development
PORT=5001
LOG_LEVEL=debug

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=audio-outputs

# Authentication
JWT_SECRET=your-secure-secret-min-32-chars
JWT_EXPIRES_IN=7d

# AI Services (Required)
OPENAI_API_KEY=sk-your-openai-key

# TTS (At least one required)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
# OR
AZURE_SPEECH_KEY=your-azure-key
AZURE_SPEECH_REGION=westeurope

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Start backend:

```bash
npm run dev
```

Backend runs at: `http://localhost:5001`

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start frontend:

```bash
npm run dev
```

Frontend runs at: `http://localhost:3000`

## Database Setup

### Supabase Configuration

1. Create project at [Supabase](https://supabase.com)

2. Run migrations in SQL Editor:

```sql
-- Core tables (run in order)
-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    cefr_level VARCHAR(10) DEFAULT 'A2',
    native_language VARCHAR(10) DEFAULT 'tr',
    target_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Plans table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    daily_limit INTEGER DEFAULT 1,
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (name, price, daily_limit, features) VALUES
('Free', 0, 3, '{"basic_voices": true}'),
('Pro', 99.99, 50, '{"all_voices": true, "books": true, "ai_chat": true}');
```

3. Create Storage bucket:
   - Go to Storage → New bucket
   - Name: `audio-outputs`
   - Public: Yes

### Storage CORS

Add CORS policy to bucket:

```json
{
  "allowedOrigins": ["http://localhost:3000", "https://lingroot.com"],
  "allowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "allowedHeaders": ["*"],
  "maxAgeSeconds": 3600
}
```

## FFmpeg Installation

### Windows

```powershell
# Using winget
winget install FFmpeg.FFmpeg

# Using Chocolatey
choco install ffmpeg

# Verify installation
ffmpeg -version
```

### macOS

```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

## Google Cloud TTS Setup

1. Create project in [Google Cloud Console](https://console.cloud.google.com)

2. Enable Text-to-Speech API

3. Create service account with TTS permissions

4. Download JSON key file

5. Set environment variable:

```env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/credentials.json
```

## Cloudflare Tunnel (Optional)

For external testing without deploying:

```powershell
# Install
choco install cloudflared

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create lingroot

# Configure
# See CLOUDFLARE_TUNNEL_SETUP.md for details

# Run
cloudflared tunnel run lingroot
```

## Verification

### Backend Health Check

```bash
curl http://localhost:5001/api/health
```

Expected response:
```json
{"status": "ok", "timestamp": "2025-12-01T00:00:00.000Z"}
```

### Frontend Check

Open `http://localhost:3000` in browser. You should see the login page.

### TTS Test

```bash
curl -X POST http://localhost:5001/api/tts/process-text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"input": "Hello world", "level": "A2"}'
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on backend | Check if backend is running |
| `401 Unauthorized` | Check JWT token or API key |
| `CORS error` | Verify FRONTEND_URL in backend .env |
| `FFmpeg not found` | Ensure FFmpeg is in PATH |
| TTS fails | Check TTS provider credentials |

### Log Files

```
backend/
└── logs/
    ├── error.log      # Error logs
    └── combined.log   # All logs
```

### Debug Mode

```bash
# Backend with debug logging
LOG_LEVEL=debug npm run dev

# Frontend with verbose output
npm run dev -- --verbose
```

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Thunder Client (API testing)

### API Testing

Import Postman collection from `docs/postman/` or use the included Thunder Client collection.

## Related Documentation

- [Production Deploy](./production-deploy.md)
- [Environment Variables](./environment-variables.md)
- [Database Schema](../database/schema-overview.md)
