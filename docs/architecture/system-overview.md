# System Overview

**Last Updated:** January 2026  
**Version:** 2.0

## Executive Summary

LingRoot is an AI-powered language learning platform that transforms various content sources into CEFR-aligned audio learning materials. The system supports web, iOS, and Android platforms with a unified backend API.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   Web Frontend  │  Mobile App     │  Admin Panel                            │
│   (Next.js 14)  │  (React Native) │  (Next.js)                              │
│   Port: 3000    │  iOS & Android  │  /admin routes                          │
└────────┬────────┴────────┬────────┴─────────────────┬───────────────────────┘
         │                 │                          │
         └─────────────────┼──────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                     Express.js Backend (Port: 5001)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Security Layer: Helmet, CORS, Rate Limiting, JWT Auth, MFA                 │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  AI Services    │ │  TTS Services   │ │  Storage        │
│  - OpenAI GPT-4 │ │  - Google TTS   │ │  - Supabase DB  │
│  - Embeddings   │ │  - Azure TTS    │ │  - Supabase     │
│                 │ │  - AWS Polly    │ │    Storage      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Core Components

### 1. Client Applications

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Frontend | Next.js 14 (App Router) | Primary user interface |
| Mobile App | React Native (Expo) | iOS/Android applications |
| Admin Panel | Next.js (integrated) | System administration |

### 2. Backend Services

| Service | Responsibility |
|---------|----------------|
| Auth Service | User authentication, MFA, OAuth |
| TTS Pipeline | Text-to-speech conversion with CEFR adaptation |
| AI Chat Service | Liro language assistant |
| Content Service | Multi-source content extraction |
| Subscription Service | Plan management, IAP handling |
| Topic Pipeline | Automated content generation |

### 3. External Integrations

| Service | Provider | Purpose |
|---------|----------|---------|
| AI/LLM | OpenAI GPT-4o | CEFR adaptation, chat, translation |
| TTS | Google Cloud, Azure, AWS Polly | Audio synthesis |
| Database | Supabase (PostgreSQL) | Primary data store |
| Storage | Supabase Storage | Audio files, documents |
| IAP | Apple App Store, Google Play | Subscription handling |
| Push | Firebase Cloud Messaging | Mobile notifications |

## Data Flow

### Content Processing Pipeline

```
Input Source → Extraction → Translation → CEFR Adaptation → TTS → Storage → Client
     │              │             │              │           │        │
     ▼              ▼             ▼              ▼           ▼        ▼
  Text/URL    inputExtractor  translate   cefrAdapter   googleTTS  Supabase
  YouTube     bookExtractor   ToEnglish   (A1-C2)       azureTTS   Storage
  PDF/DOCX                                             amazonPolly
  Web Page
```

### Authentication Flow

```
Client → Login Request → JWT Generation → Token Storage → Protected Routes
                ↓                                              ↓
         MFA Check (if enabled)                        Token Validation
                ↓                                              ↓
         TOTP Verification                             Role-based Access
```

## Technology Stack

### Backend
- **Runtime:** Node.js v20.x
- **Framework:** Express.js 4.18
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Direct SQL queries with pg client
- **Auth:** JWT + bcrypt + TOTP (MFA)
- **Logging:** Winston
- **Real-time:** Socket.io

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, Lucide Icons
- **State:** React Context API
- **API Client:** Axios

### Mobile
- **Framework:** React Native (Expo)
- **Navigation:** Expo Router
- **IAP:** react-native-iap

## Scalability Considerations

1. **Horizontal Scaling:** Stateless API design allows multiple instances
2. **Caching:** Audio files cached in Supabase Storage
3. **Rate Limiting:** Per-user and global rate limits
4. **Queue Processing:** Background job processing for long tasks
5. **CDN Ready:** Audio served via Supabase CDN

## Security Measures

- JWT-based authentication with refresh tokens
- MFA support (TOTP-based)
- CORS whitelist configuration
- Rate limiting per endpoint
- Input sanitization and validation
- SQL injection prevention (parameterized queries)
- XSS protection via helmet

## Monitoring & Logging

- Winston logger with file rotation
- Request ID tracking
- Error aggregation
- Performance metrics via custom middleware

## Dependencies

### Critical External Services
1. **OpenAI API** - Required for CEFR adaptation
2. **Supabase** - Required for database and storage
3. **TTS Provider** - At least one required (Google/Azure/AWS)

### Optional Services
- Firebase (push notifications)
- Cloudflare (tunnel for development)

## Related Documentation

- [Frontend Structure](./frontend-structure.md)
- [Admin Structure](./admin-structure.md)
- [API Architecture](./api-architecture.md)
- [AI Pipeline](./ai-pipeline.md)
