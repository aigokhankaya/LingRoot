# Production Deployment Guide

**Last Updated:** December 2025  
**Environments:** Development, Staging, Production

This document describes how to deploy LingRoot components to production in a way that is consistent with `PROJECT_MEMORY.md` and current infrastructure.

---

## 1. High-Level Architecture

Components:

1. **Backend API** – Node.js/Express service
2. **Frontend Web** – Next.js app (SSR/SPA hybrid)
3. **Mobile App** – React Native / Expo (iOS & Android)
4. **Database & Auth** – Supabase (PostgreSQL + Auth + Storage)
5. **TTS & AI Pipelines** – External services (OpenAI, Google TTS, MFA aligner)
6. **Edge / Networking** – Cloudflare Tunnel + CDN

Key rule (from PROJECT_MEMORY):
- Backend must run **behind Cloudflare Tunnel**.
- Storage for TTS outputs should use **Cloudflare R2** where possible, Supabase Storage for user-generated data.

---

## 2. Backend Deployment

### 2.1 Requirements

- Node.js LTS
- Access to environment variables (see `docs/devops/environment-variables.md`)
- Supabase project and service role key
- Cloudflare account with Tunnel configured

### 2.2 Build & Run

Typical steps (Render, Cloud Run or similar PaaS):

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` → `.env`
   - Set production values for:
     - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
     - `JWT_SECRET`
     - `OPENAI_API_KEY`
     - `GOOGLE_APPLICATION_CREDENTIALS`
     - `FRONTEND_URL`, `MOBILE_DEEP_LINK`

3. **Start server**
   ```bash
   npm run start
   ```

The backend should listen on an internal port (e.g. `5001`) and **not** be directly exposed to the public internet.

### 2.3 Cloudflare Tunnel

1. Configure a tunnel pointing to the backend:
   ```bash
   cloudflared tunnel --url http://localhost:5001
   ```
2. Map a hostname, e.g.: `api.lingroot.example.com`.
3. Ensure CORS settings in the backend allow:
   - `https://app.lingroot.com` (web)
   - Mobile app origins / deep links.

Resulting public base URL:
- `https://api.lingroot.example.com/api` (production API).

---

## 3. Frontend Web Deployment

Frontend stack: Next.js (likely deployed to Vercel or similar).

### 3.1 Build Settings

- **Build command:** `npm run build`
- **Output directory:** `.next` (handled by platform)

### 3.2 Environment Variables

Minimum required:

- `NEXT_PUBLIC_API_URL=https://api.lingroot.example.com/api`
- `NEXT_PUBLIC_ENVIRONMENT=production`
- Analytics / monitoring keys (if used)

### 3.3 Verification Checklist

After deploy:
- [ ] Landing page loads without console errors
- [ ] Login / register flow works end-to-end
- [ ] TTS processing works for a short text
- [ ] AI chat opens and returns responses
- [ ] Subscription paywall and plan display work

---

## 4. Mobile App Deployment

Mobile app: `LingRootMobile` (Expo-based).

### 4.1 Configuration

In `LingRootMobile/env.example` and/or `environmentConfig.ts`:

- `API_BASE_URL=https://api.lingroot.example.com/api`
- Push notification keys / project IDs
- Store-specific product identifiers for IAP

### 4.2 Build & Release

Using Expo EAS (example):

```bash
cd LingRootMobile
npm install
npx expo prebuild
npx eas build --platform ios
npx eas build --platform android
```

Submit artifacts to App Store / Google Play following their respective guidelines.

### 4.3 Post-Release Checks

- [ ] Login / social login works on physical devices
- [ ] Push notifications received (where enabled)
- [ ] In-app purchases validate and unlock correct plan
- [ ] Audio playback and subtitles are synchronized

---

## 5. Database & Migrations

Database: Supabase (PostgreSQL).

### 5.1 Applying Migrations

Migrations are stored in `backend/migrations/`.

Typical process:

1. Set `SUPABASE_DB_URL` or use Supabase SQL editor.
2. Apply migrations in order as described in `MIGRATION_INSTRUCTIONS.md` and `docs/database/schema-overview.md`.
3. Verify:
   - `check_subscriptions_schema.sql`
   - `check_user_plan.sql`

### 5.2 Safety Guidelines

- Never run destructive migrations directly on production without backup.
- Keep `schema-overview.md` in sync with migration changes.

---

## 6. Secrets & Configuration Management

- Do **not** commit real secrets into the repository.
- Use:
  - Platform secret managers (Render dashboard, Cloud Run secrets, etc.)
  - `.env` files only in secure environments
- Keys to keep secure:
  - OpenAI, Google Cloud, Supabase service role, JWT secret, Stripe / IAP secrets.

---

## 7. Monitoring & Logging

Recommended tools (platform-dependent):
- Application logs (PaaS dashboard)
- Error tracking (Sentry or similar)
- Supabase logs for DB and Auth

Operational checks:
- [ ] 5xx error rate remains low
- [ ] DB slow query logs are monitored
- [ ] TTS cost and OpenAI usage are periodically reviewed

---

## 8. Rollback Strategy

- Keep previous release artifacts (frontend & backend) for quick rollback.
- Use feature flags for risky changes where possible.
- For database migrations:
  - Provide backward-compatible migrations when possible.
  - If not possible, plan a maintenance window.

---

## Related Documentation

- [Local Setup](./local-setup.md)
- [Environment Variables](./environment-variables.md)
- [Database Schema Overview](../database/schema-overview.md)
- [Cloudflare Tunnel Integration](../integrations/cloudflare.md)
