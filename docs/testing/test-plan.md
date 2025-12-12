# Test Plan – LingRoot

**Last Updated:** December 2025  
**Scope:** Web, Admin, Backend API, Mobile (high level)

This document provides a structured test plan to complement the existing `qa-checklist.md` and `worst-case-scenarios.md`.

---

## 1. Objectives

- Verify that core user journeys work end‑to‑end
- Ensure CEFR adaptation, TTS, and MFA behave correctly
- Catch regressions in key flows (auth, payments, audio pipeline)
- Provide a repeatable plan for pre‑release testing

---

## 2. Test Levels

1. **Unit Tests**
   - Scope: isolated functions (utilities, services)
   - Example areas:
     - Text processing helpers
     - Plan / feature checks
     - Frontend utilities (`lib/content.ts`, `lib/user.ts`, etc.)

2. **Integration Tests**
   - Scope: API endpoints + database
   - Example areas:
     - Auth + MFA
     - TTS processing endpoints
     - Books and chapter audio endpoints

3. **End‑to‑End (E2E) Tests**
   - Scope: Full web flows via browser automation
   - Example tools: Playwright / Cypress (to be selected)

4. **Manual Exploratory Tests**
   - Scope: New features and UX changes

---

## 3. Critical User Journeys (E2E)

### 3.1 Registration & Onboarding

- User registers with email/password
- Confirms email if required
- Sets native/target language and CEFR level
- Lands on dashboard and sees correct initial state

### 3.2 Login + MFA

- Login without MFA
- Enable MFA, log out
- Login again → MFA challenge → verify code
- Invalid MFA code scenarios

### 3.3 TTS – Text Flow

- Input text, choose level and voice
- Start processing and wait for completion
- Verify:
  - MP3 plays without errors
  - Subtitles are synchronized
  - Adapted text respects CEFR constraints

### 3.4 TTS – YouTube/Web/File

- Provide a valid YouTube URL / web URL / upload file
- Run through pipeline
- Validate that:
  - Language is detected correctly (where applicable)
  - Text is adapted and audio generated
  - Errors for unsupported content are handled gracefully

### 3.5 AI Chat (Liro)

- Start a new conversation
- Send multiple messages at different levels
- Verify responses respect CEFR level (at least smoke‑test style)
- Check topic suggestions appear and link correctly

### 3.6 Books & Chapter Audio

- Browse books list
- Open a book and its chapters
- Generate audio for a chapter
- Verify audio and subtitles play correctly

### 3.7 Vocabulary & Favorites

- Add words to vocabulary (manual + auto‑translation)
- Update notes and `is_learned` flag
- Delete a word
- Toggle favorites for content/topics/books and verify list view

### 3.8 Subscription & Payments (Web)

- View available plans
- Subscribe to a paid plan (using test payment flow)
- Downgrade / cancel scenario
- Verify limits and features change accordingly

### 3.9 Admin Panel

- Admin login
- View user list and filter
- Inspect a single user’s:
  - Audio history
  - Login history
  - Subscription information
- Modify a plan (non‑destructive test environment)

---

## 4. API Test Coverage

For each critical endpoint group described in `docs/api/endpoints.md`:

- **Auth & MFA**
  - Happy path (register, login, MFA verify)
  - Invalid credentials, locked account scenarios

- **TTS (`/tts/*`)**
  - Valid text / YouTube / web / file requests
  - Rate limit / usage limit boundaries (where feasible)

- **AI Chat (`/ai-chat/*`)**
  - Conversation create, list, send, delete

- **Books (`/books/*`)**
  - Listing, details, chapter audio generation

- **Vocabulary & Favorites**
  - CRUD operations for vocabulary
  - Favorites toggle and retrieval

Each endpoint should have at least:
- One success case
- One validation error case

---

## 5. Non-Functional Tests

### 5.1 Performance

- Measure response times for:
  - `/tts/process-text`
  - `/ai-chat/send`
  - `/books/*`
- Target:
  - API p95 latency within acceptable range (platform‑dependent)

### 5.2 Security (High-Level)

- Basic checks:
  - Auth required for protected endpoints
  - Role checks on admin endpoints
  - No sensitive data in client‑side logs

### 5.3 Reliability

- Simulate intermittent failures of external services (OpenAI, Google TTS) where feasible in test/staging.
- Verify fallback and error messaging.

---

## 6. Regression Strategy

Before each release:

1. Run automated unit + integration tests
2. Execute a **smoke E2E suite** for:
   - Auth + MFA
   - One TTS text job
   - One AI chat conversation
   - One book audio generation
3. Manually spot‑check admin‑only operations in a safe environment.

---

## 7. Test Data & Environments

- Use dedicated test accounts and test projects (Supabase, payment sandbox).
- Avoid reusing production user data.
- Keep `.env` for test/staging clearly separated from production.

---

## Related Documentation

- [QA Checklist](./qa-checklist.md)
- [Worst Case Scenarios](./worst-case-scenarios.md)
- [API Endpoints](../api/endpoints.md)
- [System Overview](../architecture/system-overview.md)
