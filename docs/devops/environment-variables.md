# Environment Variables Reference

**Last Updated:** December 2025

## Overview

This document lists all environment variables used across the LingRoot platform.

## Backend Environment Variables

**Location:** `/backend/.env`

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment: `development`, `production` |
| `PORT` | No | `5001` | Backend server port |
| `LOG_LEVEL` | No | `info` | Logging level: `error`, `warn`, `info`, `debug` |

### Database (Supabase)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | - | Supabase service role key |
| `SUPABASE_BUCKET_NAME` | No | `audio-outputs` | Storage bucket name |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration |
| `MFA_ISSUER` | No | `LingRoot` | MFA issuer name |

### AI Services

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Default model for CEFR |
| `OPENAI_CHAT_MODEL` | No | `gpt-4o` | Model for AI chat |

### TTS Services

#### Google Cloud TTS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Conditional | - | Path to GCP credentials JSON |

#### Azure TTS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SPEECH_KEY` | Conditional | - | Azure Speech API key |
| `AZURE_SPEECH_REGION` | Conditional | `westeurope` | Azure region |

#### AWS Polly

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | Conditional | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Conditional | - | AWS secret key |
| `AWS_REGION` | Conditional | `us-east-1` | AWS region |

### OAuth Providers

#### Google OAuth

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Conditional | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Conditional | - | Google OAuth secret |

#### Apple Sign-In

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APPLE_CLIENT_ID` | Conditional | - | Apple client ID |
| `APPLE_TEAM_ID` | Conditional | - | Apple team ID |
| `APPLE_KEY_ID` | Conditional | - | Apple key ID |
| `APPLE_PRIVATE_KEY` | Conditional | - | Apple private key |

#### Facebook OAuth

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FACEBOOK_APP_ID` | Conditional | - | Facebook app ID |
| `FACEBOOK_APP_SECRET` | Conditional | - | Facebook app secret |

### In-App Purchases

#### Apple IAP

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APPLE_SHARED_SECRET` | Conditional | - | App Store shared secret |
| `APPLE_IAP_ENVIRONMENT` | No | `sandbox` | `sandbox` or `production` |

#### Google Play

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_PLAY_PACKAGE_NAME` | Conditional | - | Android package name |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Conditional | - | Service account JSON |

### Email (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | - | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASSWORD` | No | - | SMTP password |
| `EMAIL_FROM` | No | - | From email address |

### Push Notifications

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | Conditional | - | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Conditional | - | Firebase private key |
| `FIREBASE_CLIENT_EMAIL` | Conditional | - | Firebase client email |

### CORS & Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Frontend URL for CORS |
| `ALLOWED_ORIGINS` | No | - | Additional CORS origins |

---

## Frontend Environment Variables

**Location:** `/frontend/.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | - | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | - | Supabase anon key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |

---

## Mobile Environment Variables

**Location:** `/LingRootMobile/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_URL` | Yes | - | Backend API URL |
| `SUPABASE_URL` | Yes | - | Supabase URL |
| `SUPABASE_ANON_KEY` | Yes | - | Supabase anon key |
| `GOOGLE_WEB_CLIENT_ID` | Conditional | - | Google Sign-In ID |
| `GOOGLE_IOS_CLIENT_ID` | Conditional | - | Google iOS client ID |
| `GOOGLE_ANDROID_CLIENT_ID` | Conditional | - | Google Android client ID |

---

## Environment Examples

### Development

```env
# Backend (.env)
NODE_ENV=development
PORT=5001
LOG_LEVEL=debug

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx

JWT_SECRET=development-secret-change-in-production-32chars
OPENAI_API_KEY=sk-xxx

GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

FRONTEND_URL=http://localhost:3000
```

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

### Production

```env
# Backend
NODE_ENV=production
PORT=5001
LOG_LEVEL=info

SUPABASE_URL=https://prod.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx

JWT_SECRET=super-secure-production-secret-minimum-32-characters

OPENAI_API_KEY=sk-xxx
AZURE_SPEECH_KEY=xxx
AZURE_SPEECH_REGION=westeurope

FRONTEND_URL=https://lingroot.com
```

## Security Notes

1. **Never commit `.env` files** - They are in `.gitignore`
2. **Use strong secrets** - Minimum 32 characters for JWT_SECRET
3. **Rotate keys regularly** - Especially production API keys
4. **Restrict API key permissions** - Use minimum required scope
5. **Encrypt at rest** - Use platform-provided secret management

## Validation

Check required variables on startup:

```javascript
// utils/validateEnv.js
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
});
```

## Related Documentation

- [Local Setup](./local-setup.md)
- [Production Deploy](./production-deploy.md)
- [System Overview](../architecture/system-overview.md)
