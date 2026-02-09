# LingRoot - Claude Code Rules
 
LingRoot: AI-powered personalized listening platform. Generates content based on user interests, adapts to CEFR level, and voices it with synchronized subtitles.
 
> "LingRoot, sevdiginiz icerikleri sizin Ingilizce seviyenize ceviren ve dinlemeniz icin seslendiren bir platformdur."
 
For detailed project memory, architecture, roadmap: see `PROJECT_MEMORY.md`
For DB schema (75+ tables): see `docs/database/schema-overview.md`
 
## Language Rule

- User communication: TURKISH (always)
- Documentation, reports, analysis files (.md): TURKISH (always)
- Code, commits, logs: ENGLISH
 
## Build & Dev Commands
 
```bash
# Frontend (port 3000)
cd frontend && npm run dev           # Dev server
cd frontend && npm run dev:clean     # Clean .next + dev (uses localhost:5001)
cd frontend && npm run build         # Builds shared pkg first, then Next.js
cd frontend && npx tsc --noEmit      # Type check
cd frontend && npm run lint          # ESLint
 
# Backend (port 5001)
cd backend && npm run dev            # nodemon server.js
 
# Shared package (must build before frontend)
cd packages/api-client && npm run build   # tsc
```
 
## Tech Stack
 
| Layer | Technology |
|-------|-----------|
| Web | Next.js (React) - App Router |
| Mobile | React Native (Expo) |
| Backend | Express.js (Node.js) |
| Database | PostgreSQL (Supabase) + Redis |
| AI | OpenAI (GPT-5.1, GPT-4o, GPT-4o-mini) |
| Audio | Google TTS + MFA Forced Aligner |
| Storage | Supabase Storage + Cloudflare R2 |
 
## Active Rules (Immutable)
 
These rules CANNOT be violated under any circumstances:
 
1. **No secrets in code** — API keys, JWT secrets must come from .env. Never suggest or write credentials.
2. **Prompt output format is frozen** — Never change prompt output formats.
3. **Audio pipeline order is immutable:**
   `Whisper → Cleanup → CEFR adaptation → TTS (Google) → Audio merge → MFA → VTT/SRT`
   - Whisper transcript cannot be used directly (CEFR adaptation required)
   - No direct TTS from n8n (causes timeout/audio corruption on long texts)
   - TTS voices: en-US → "Aria", en-GB → "Libby"
   - Speed: 1.05 default, Pitch: -2 to +2, Max segment: 1500 chars
   - SSML `<break time="300ms"/>` default
   - MFA: word-level timestamps, tolerance ±0.3s, outlier >1.5s → re-align
4. **DB columns: never assume** — Use only known schema from `docs/database/schema-overview.md`.
5. **No file/folder restructuring** without explicit user approval.
6. **Single API schema** for both Web and Mobile — never diverge.
7. **Business logic untouchable** unless user explicitly requests change.
8. **API contract** (request/response shape) cannot be changed unilaterally.
9. **`any` is banned** — Use `unknown` or proper types.
10. **CEFR-inappropriate English: forbidden** — All generated content must match target CEFR level.
11. **TTS voice names: do not change arbitrarily.**
12. **Deployment: Cloudflare Tunnel → Backend Only.**
 
## DB Operations

- **Analiz/okuma sorguları:** Supabase REST API üzerinden bağlanılabilir (`.env`'den credentials kullanarak).
- **Schema değişiklikleri:** ASLA otomatik çalıştırma. SQL migration dosyası hazırla → Kullanıcıya "Supabase SQL Editor'da çalıştır" de.
- Supabase RLS must always be active.
- After every migration, update BOTH:
  - `docs/database/schema-overview.md`
  - `docs/database/complete-column-reference.md`
- Migration file and doc updates happen in the SAME step, never deferred.
 
## Documentation Sync
 
Priority order before making changes:
1. `PROJECT_MEMORY.md` (always first)
2. `docs/architecture/*.md`
3. `docs/codebase/*.md`
4. `docs/api/*.md`, `docs/database/schema-overview.md`
 
Rules:
- If docs contradict code → note the conflict, ask user, NEVER assume.
- New endpoint/table/prompt/feature → update or create relevant doc file.
- "Code updated but doc is stale" is UNACCEPTABLE.
- Code-first documentation: read source code BEFORE writing any doc. Never write docs from memory.
 
## Document Versioning
 
Every created/updated .md file must have under the title:
```
> **Created:** YYYY-MM-DD | **Updated:** YYYY-MM-DD | **Version:** X.Y
```
 
## Architecture Rules
 
- **Max 500 lines** per controller/component file — split if larger
- Business logic → Service layer (not in controllers)
- **App Router** (`/src/app/`) for new pages — NEVER add to Pages Router (`/pages/`)
- No duplicate components — extend existing ones
 
## Naming Conventions
 
| Type | Format | Example |
|------|--------|---------|
| Variables/Functions | camelCase | `userName`, `getUserData()` |
| Components | PascalCase | `AudioPlayer` |
| DB tables | snake_case | `user_profiles` |
| Env vars/Constants | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Types/Interfaces | PascalCase | `ApiResponse` |
| AI prompt files | kebab-case | `cefr-adapt-v2` |
 
## Color Palette
 
| Usage | Tailwind |
|-------|----------|
| Primary | `teal-*`, `cyan-*` |
| Accent | `orange-*`, `amber-*` |
| Neutral | `slate-*`, `gray-*` |
| Success | `green-*`, `emerald-*` |
| Warning | `yellow-*` |
| Error | `red-*` |
 
**BANNED:** `purple-*`, `violet-*`, `fuchsia-*`, `pink-*` — no "AI purple" or neon/cyberpunk aesthetics.
 
## Canonical Components (Use These)
 
```
AudioPlayer        → src/components/common/AudioPlayer.tsx
SyncedTextPlayer   → src/components/SyncedTextPlayer.tsx
Button             → src/components/ui/button.tsx
Input              → src/components/ui/input.tsx
Dialog             → src/components/ui/dialog.tsx
ContentCard        → src/components/sectors/ContentCard.tsx
```
Do NOT create: NewSyncedTextPlayer, new AudioPlayer, new Button, inline `<button>`.
 
## Commit Format
 
```
<type>: <short description>
```
Types: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `test:`, `chore:`
 
## Token Efficiency

- **Explore/Task agent kullanma** — dosya yolları belli veya tahmin edilebilir ise doğrudan `Glob` + `Read` kullan.
- Explore agent sadece codebase yapısı tamamen bilinmiyorsa veya açık uçlu araştırma gerektiğinde kullanılmalı.
- Bilinen dizin yapısı: `frontend/src/`, `backend/`, `LingRootMobile/src/`, `packages/api-client/`.
- Ekran dosyaları: `LingRootMobile/src/screens/`, bileşenler: `LingRootMobile/src/components/` & `frontend/src/components/`.
- Navigation: `LingRootMobile/src/navigation/AppNavigator.tsx`.

## Error & Uncertainty Handling

- If uncertain about architecture/rules → **NEVER assume** → ask user.
- If agent makes an error → state it, propose rollback, get approval before critical changes.
- Build/test failure → fix before continuing.
 
## Error Signatures (Known Issues)
 
| Signal | Action |
|--------|--------|
| "silent audio detected" | Re-run MFA with boosted energy threshold |
| "alignment drift" | Resegment → re-align → merge |
| "google TTS latency high" | Reduce chunk size to 700 chars |
| Supabase 429 | 2s exponential retry |
| Cloudflare 525 | Automatic fallback → local API |
| MFA timeout | Redispatch to Worker #2 |
 