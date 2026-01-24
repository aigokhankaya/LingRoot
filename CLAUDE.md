# LingRoot - Claude Code Kuralları

## Proje Özeti
LingRoot: AI destekli kişiselleştirilmiş dinleme platformu. Kullanıcının ilgi alanlarına göre içerik üretip, CEFR seviyesine uyarlayarak seslendirir.

---

## 🚀 Yeni Başlayanlar İçin (Onboarding)

### İlk Gün Checklist
```
□ Bu dosyayı baştan sona oku
□ PROJECT_MEMORY.md dosyasını oku
□ docs/database/schema-overview.md incele
□ Local ortam kur (aşağıdaki adımlar)
□ İlk PR: Typo fix veya küçük bug fix
```

### Local Ortam Kurulumu
```bash
# 1. Repo'yu klonla
git clone <repo-url>
cd LingRoot

# 2. Frontend kurulum
cd frontend
cp .env.example .env.local  # Env değişkenlerini doldur
npm install
npm run dev

# 3. Backend kurulum (yeni terminal)
cd backend
cp .env.example .env  # Env değişkenlerini doldur
npm install
npm run dev

# 4. Test et
# Frontend: http://localhost:3000
# Backend: http://localhost:5000/health
```

### Önemli Dosyalar
| Dosya | Açıklama |
|-------|----------|
| `CLAUDE.md` | Bu dosya - tüm kurallar |
| `PROJECT_MEMORY.md` | Detaylı proje hafızası |
| `docs/database/schema-overview.md` | DB şeması (75+ tablo) |
| `docs/codebase/api-services.md` | API servisleri |
| `frontend/src/lib/api.ts` | Merkezi API client (100+ function) |

---

## 🔴 Kritik Kurallar (İhlal Edilemez)

### Güvenlik
- API key veya private key ASLA koda yazılmaz
- JWT secret'lar .env'den okunmalı
- Supabase RLS her zaman aktif
- Hardcoded credentials yasak

### Veritabanı
- DB işlemleri MANUEL yapılır - Supabase'e doğrudan bağlanma
- Migration dosyası hazırla, kullanıcıya "Bu SQL'i Supabase SQL Editor'de çalıştırın" de
- Tablo/kolon varsayma - PROJECT_MEMORY.md'deki şemayı kullan

### Dil
- Kullanıcı ile iletişim TÜRKÇE
- Kod, commit mesajları ve loglar İNGİLİZCE

### Kod Stilleri
| Tür | Format | Örnek |
|-----|--------|-------|
| Variables | camelCase | `userName`, `isActive` |
| Functions | camelCase | `getUserData()`, `handleClick()` |
| Components | PascalCase | `UserProfile`, `AudioPlayer` |
| DB tables | snake_case | `user_profiles`, `listening_progress` |
| Env variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_TIMEOUT` |
| Types/Interfaces | PascalCase | `UserData`, `ApiResponse` |

---

## � Dokümantasyon Önceliği

Değişiklik yapmadan önce şu sırayla dokümantasyona bak:
1. `PROJECT_MEMORY.md` (her zaman ilk referans)
2. İlgili `docs/architecture/*.md`
3. İlgili `docs/codebase/*.md`
4. Gerekirse `docs/api/*.md` ve `docs/database/schema-overview.md`

**Kritik:**
- Dokümantasyon ile kod çelişirse → Önce çelişkiyi not et, kullanıcıya sor, varsayım YAPMA
- Yeni endpoint, tablo, prompt ekleniyorsa → İlgili doc dosyasını güncelle veya oluştur
- "Kod güncellendi ama doküman eski kaldı" durumu KABUL EDİLEMEZ

---

## 🔒 Business Logic Kuralı

- Kullanıcı açıkça istemedikçe business logic **DEĞİŞTİRİLMEZ**
- API sözleşmesi (request/response şekli) tek taraflı değiştirilemez
- Tercih sırası:
  1. Önce dokümantasyon ekle/güncelle
  2. Sonra küçük, lokal, geri alınabilir refactor (gerekliyse)

---

## 📁 DB Schema Sync (Zorunlu)

Her migration dosyası oluşturulduğunda veya DB şemasında değişiklik yapıldığında **MUTLAKA** güncelle:
- `docs/database/schema-overview.md` — Tablo listesi, ER diyagramı, kategori
- `docs/database/complete-column-reference.md` — Etkilenen tablonun tam kolon detayları

**Kural:** Migration dosyası → Doküman güncellemesi **AYNI ANDA** yapılır, ayrı adım olarak bırakılmaz.

---

## 📅 Doküman Versiyonlama

Oluşturulan veya güncellenen her doküman dosyasında (*.md) başlık altında:
```
> **Oluşturulma:** YYYY-MM-DD | **Güncelleme:** YYYY-MM-DD | **Versiyon:** X.Y
```
- İlk oluşturmada: Oluşturulma = Güncelleme, Versiyon = 1.0
- Her güncellemede: Güncelleme tarihi ve versiyon artırılır

---

## 📖 Code-First Documentation

Dokümantasyon yazmadan **ÖNCE** ilgili kaynak kodları okunmalıdır:
- Varsayım yaparak veya hafızadan doküman yazılmaz
- Gerçek kod yapısı, fonksiyon isimleri, parametreler kaynak dosyalardan doğrulanmalıdır

---

## ❓ Belirsizlik Durumu

Mimaride veya kurallarda belirsizlik varsa:
1. **VARSAYIM YAPMA**
2. Kullanıcıya soru sor
3. Yanıt gelene kadar kritik mimari kararlar alma

---

## 🔄 Hata Yönetimi

Agent hata yaparsa:
1. Hatayı açıkça belirt
2. Rollback veya düzeltme öner
3. Kullanıcı onayı olmadan kritik değişiklik yapma

Build/test hatası oluşursa → Devam etmeden önce düzelt.

---

## ⚡ Terminal Auto-Execute

- `npm`, `git`, `fs` işlemleri için `SafeToAutoRun: true` varsayılan
- **Yıkıcı işlemler** (silme, resetleme, drop) için kullanıcı onayı **ZORUNLU**

---

## �📋 Git Workflow

### Branch Stratejisi
```
main          ← Production (korumalı, direct push yasak)
  └── develop ← Staging/Test ortamı
        ├── feature/xxx  ← Yeni özellik
        ├── fix/xxx      ← Bug fix
        ├── refactor/xxx ← Refactoring
        └── docs/xxx     ← Dokümantasyon
```

### Branch İsimlendirme
```
feature/add-dark-mode
feature/LING-123-user-settings
fix/audio-player-crash
fix/LING-456-login-redirect
refactor/split-tts-controller
docs/update-api-docs
```

### Commit Mesaj Formatı
```
<type>: <short description>

[optional body]

[optional footer]
```

**Tipler:**
- `feat:` Yeni özellik
- `fix:` Bug fix
- `refactor:` Kod iyileştirme (davranış değişmez)
- `docs:` Dokümantasyon
- `style:` Formatting, missing semicolons (kod değişmez)
- `test:` Test ekleme/düzeltme
- `chore:` Build, config değişiklikleri

**Örnekler:**
```bash
feat: add resume listening feature to dashboard
fix: resolve audio player crash on iOS Safari
refactor: split ttsController into smaller modules
docs: update API endpoint documentation
```

### PR Açma Kuralları
1. Branch'i güncel tut: `git pull origin develop`
2. Değişiklik 500+ satır ise PR'ı böl
3. Self-review yap (diff'i kontrol et)
4. PR template'i doldur
5. Reviewer ata

---

## 👀 Code Review Kuralları

### Reviewer İçin
- [ ] TypeScript hata yok mu? (`npx tsc --noEmit`)
- [ ] 500 satır limiti aşılmış mı?
- [ ] `any` kullanılmış mı?
- [ ] Duplicate component oluşturulmuş mu?
- [ ] Renk paletine uygun mu? (purple yasak)
- [ ] App Router kullanılmış mı? (Pages Router'a ekleme yasak)
- [ ] Business logic service layer'da mı?
- [ ] Error handling standardına uygun mu?

### Merge Kuralları
- En az 1 approve gerekli
- TypeScript hata varsa merge edilemez
- CI/CD checks geçmeli
- Conflict varsa çözülmeli

### Review Öncelikleri
1. 🔴 **Security** - Auth, RLS, credentials
2. 🟠 **Correctness** - Logic hataları, edge cases
3. 🟡 **Performance** - N+1 queries, unnecessary re-renders
4. 🟢 **Style** - Naming, formatting, best practices

---

## 🏗️ Mimari Kurallar

### Controller Kuralları
- **Max 500 satır/controller** - Daha büyükse böl
- Business logic → Service layer'a taşı
- 1 controller = 1 domain
- Direct DB erişimi yapma → Service kullan

### Service Kuralları
- Class-based singleton pattern
- Her service tek sorumluluk
- Repository pattern kullan (direct Supabase query yerine)

### Component Kuralları
- **Max 500 satır/component** - Daha büyükse böl
- Duplicate component oluşturma → Mevcut olanı extend et
- **App Router kullan** (`/src/app/`) - Pages Router'a yeni sayfa EKLEME
- Barrel exports kullan (`index.ts`)

---

## 📦 Import Sıralaması

```typescript
// 1. React/Next.js core
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 2. External packages (alfabetik)
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// 3. Internal components (@/components)
import { Button } from '@/components/ui/button';
import AudioPlayer from '@/components/common/AudioPlayer';

// 4. Lib/Utils (@/lib)
import { api, fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// 5. Hooks (@/hooks)
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// 6. Context (@/context)
import { AuthProvider } from '@/context/AuthContext';

// 7. Types (@/types)
import type { User, ApiResponse } from '@/types';

// 8. Styles (en son)
import styles from './Component.module.css';
```

---

## 🔷 TypeScript Kuralları

### Type Safety (Zorunlu)
- **`any` YASAK** - `unknown` veya proper type kullan
- Her API response için interface tanımla
- Generic types kullan (`ApiResponse<T>`)
- `catch (error: unknown)` kullan

### Interface Standartları
```typescript
// Component props: {ComponentName}Props
interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;  // Optional için ? kullan
  onEnd?: () => void;  // Event handlers: onAction formatı
  children?: React.ReactNode;  // Children varsa ReactNode
}

// API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Entity types
interface User {
  id: string;
  email: string;
  created_at: string;
  // ... diğer alanlar
}
```

### Error Handling Standardı
```typescript
// Her modül için error prefix
const MODULE_ERRORS = {
  AUTH001: { code: 'AUTH001', status: 401, message: 'Invalid token' },
  AUTH002: { code: 'AUTH002', status: 403, message: 'Access denied' },
  USER001: { code: 'USER001', status: 404, message: 'User not found' },
  SECT001: { code: 'SECT001', status: 404, message: 'Sector not found' },
  QUIZ001: { code: 'QUIZ001', status: 400, message: 'Invalid quiz data' },
};

// Try-catch pattern
try {
  const result = await someAsyncOperation();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('Operation failed:', error.message);
  }
  throw MODULE_ERRORS.AUTH001;
}
```

---

## ⚛️ Component Props Standardı

```typescript
// ✅ DOĞRU
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';  // Union types
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;  // Event: onAction
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',  // Default değer
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
}) => { ... };

// ❌ YANLIŞ
interface Props {  // İsim belirsiz
  v?: string;  // Kısaltma
  click?: Function;  // Generic Function type
  data?: any;  // any kullanımı
}
```

---

## 🗂️ State Management Kuralları

### Ne Zaman Ne Kullan?

| Durum | Çözüm | Örnek |
|-------|-------|-------|
| Component-local state | `useState` | Form inputs, toggle |
| Derived state | `useMemo` | Filtered list |
| Cross-component (2-3 level) | Props drilling | Parent → Child |
| App-wide state | React Context | Auth, Theme, i18n |
| Server state | API + `useEffect` | User data, content |
| Complex form | `useReducer` | Multi-step form |

### Context Kullanım Kuralları
```typescript
// 1. Context sadece gerçekten global olan şeyler için
// ✅ Auth, Theme, Language
// ❌ Tek component'ta kullanılan state

// 2. Context dosya yapısı
// src/context/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | null>(null);
export const AuthProvider: React.FC<{children: ReactNode}> = ...
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
};
```

### Mevcut Context'ler
- `AuthContext` - Kullanıcı auth state
- `LanguageContext` - i18n
- `ThemeContext` - Dark/Light mode (gelecek)

---

## 🌐 API Endpoint Standartları

### URL Yapısı
```
✅ DOĞRU (Noun-based, RESTful)
GET    /api/users           → List users
GET    /api/users/:id       → Get user
POST   /api/users           → Create user
PUT    /api/users/:id       → Update user
DELETE /api/users/:id       → Delete user

❌ YANLIŞ (Verb-based)
GET    /api/getUsers
POST   /api/createUser
POST   /api/deleteUser
```

### Response Format
```typescript
// Başarılı response
{
  "success": true,
  "data": { ... },
  "message": "User created successfully"
}

// Hata response
{
  "success": false,
  "error": "USER001",
  "message": "User not found"
}

// Pagination
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Versioning (Planlanan)
```
/api/v1/users  ← Gelecekte migrate edilecek
/api/users     ← Mevcut (v1 olmadan)
```

---

## 🔐 Environment Variables

### Frontend (.env.local)
```bash
# Zorunlu
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
NEXT_PUBLIC_API_URL=http://localhost:5000

# Opsiyonel
NEXT_PUBLIC_GA_ID=G-XXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Backend (.env)
```bash
# Zorunlu - Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx  # SERVICE key, anon değil!
DATABASE_URL=postgresql://...

# Zorunlu - Auth
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Zorunlu - AI
OPENAI_API_KEY=sk-xxx

# Zorunlu - Storage
CLOUDFLARE_R2_ACCESS_KEY=xxx
CLOUDFLARE_R2_SECRET_KEY=xxx
CLOUDFLARE_R2_BUCKET=lingroot

# Opsiyonel
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug
```

### Env Kuralları
- `.env` dosyaları ASLA commit edilmez (`.gitignore`'da)
- `.env.example` dosyası güncel tutulur
- Production secret'ları Vercel/Railway environment'ta
- Local'de `.env.local` (frontend), `.env` (backend)

---

## ✅ Enforcement (Otomatik Kontroller)

### ESLint Kuralları (Aktif)
```javascript
// .eslintrc.js
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',  // any yasak
    '@typescript-eslint/no-unused-vars': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  }
}
```

### Pre-commit Hook (Husky) - Kurulacak
```bash
# .husky/pre-commit
npm run lint
npx tsc --noEmit
```

### CI/CD Checks (Kurulacak)
```yaml
# GitHub Actions
- npm run lint
- npm run build
- npm run test (gelecek)
```

### IDE Ayarları (Önerilen)
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

## ⚠️ Kural İstisnaları (Exceptions)

### Ne Zaman İstisna Gerekir?
- Legacy code'a müdahale ederken
- Üçüncü parti library kısıtlamaları
- Performance-critical code
- Deadline pressure (geçici)

### İstisna Süreci
1. PR açıklamasında nedeni belirt
2. Tech Lead onayı al
3. TODO comment ile issue bağla:
```typescript
// TODO(LING-123): Refactor to remove any when migrating to v2
// Exception approved by @techlead on 2024-01-15
const legacyData: any = await oldApi.fetch();
```

### Geçici İstisnalar
- Maximum 30 gün geçerli
- Issue'da deadline belirt
- Sprint planning'de review et

---

## 🎨 Renk Paleti

### Onaylı Renkler
| Kullanım | Tailwind Classes |
|----------|------------------|
| Primary | `teal-*`, `cyan-*` |
| Accent | `orange-*`, `amber-*` |
| Neutral | `slate-*`, `gray-*` |
| Success | `green-*`, `emerald-*` |
| Warning | `yellow-*` |
| Error | `red-*` |

### YASAKLI Renkler
```
❌ purple-*, violet-*, fuchsia-*, pink-*
❌ "Neon" veya "Cyberpunk" estetiği
❌ Gradient'larda yasaklı renkler
```

---

## 🛠️ Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Web | Next.js 14 (React 18) - App Router öncelikli |
| Mobile | React Native (Expo) |
| Backend | Express.js (Node.js) |
| Database | PostgreSQL (Supabase) - 75+ tablo |
| AI | OpenAI (GPT-4o, GPT-4o-mini) |
| Audio | Google TTS + MFA Forced Aligner |
| Storage | Supabase Storage + Cloudflare R2 |

---

## 🎵 Audio Pipeline (Sıra Değişmez)

```
Whisper → Cleanup → CEFR adaptation → TTS (Google) → Audio merge → MFA → VTT/SRT
```

**Kurallar:**
- Pipeline sırası DEĞİŞTİRİLEMEZ
- Whisper transcript'i direkt kullanılamaz (CEFR uyarlaması şart)
- n8n içinden direkt TTS yapılamaz

---

## 📁 Klasör Yapısı

```
/frontend
  /pages              # Pages Router (LEGACY - yeni sayfa EKLEME)
  /src/app            # App Router (YENİ SAYFALAR BURAYA)
  /src/components
    /ui               # Radix UI primitives (Button, Input, Dialog)
    /common           # Shared components (AudioPlayer, LoadingSpinner)
    /gamification     # XP, streaks, achievements
    /sectors          # Sector components
    /content          # Content components (ResumeContentCard)
  /src/lib            # API, auth, i18n, utils
  /src/hooks          # Custom hooks
  /src/context        # React contexts (Auth, Language)
  /src/types          # TypeScript types

/backend
  /controllers        # HTTP handlers (max 500 satır)
  /services           # Business logic
  /routes             # Route definitions
  /middleware         # Auth, validation, error
  /utils
    /ai               # LLM, prompts
    /audio            # TTS, MFA
    /storage          # Supabase, R2
    /infra            # Rate limiting, concurrency
    /common           # Logging, formatting

/docs                 # Documentation
```

---

## 🚨 Bilinen Sorunlar (Technical Debt)

### Kritik (Çözülmeli)
| Sorun | Dosya | Çözüm | Owner |
|-------|-------|-------|-------|
| God Object | `ttsController.js` (2220 satır) | 4-5 controller'a böl | - |
| God Object | `adminController.js` (1575 satır) | Domain'e göre böl | - |
| Type Safety | 336 adet `any` kullanımı | `unknown` ile değiştir | - |
| Karma Router | `/pages` + `/src/app` | App Router'a migrate et | - |
| RLS Loophole | `sectors` tablosu | Admin policy ekle | - |

### Yüksek (Planla)
| Sorun | Dosya | Çözüm |
|-------|-------|-------|
| Duplicate | `SyncedTextPlayer` + `NewSyncedTextPlayer` | Birleştir → `SyncedTextPlayer` kullan |
| Duplicate | 4 farklı AudioPlayer | Unified component |
| No DI | Tüm controller'lar | `awilix` ekle |
| No Tests | Proje geneli | Jest + Playwright |

### Orta (Backlog)
| Sorun | Açıklama |
|-------|----------|
| API Versioning | `/api/v1/` yapısı yok |
| Accessibility | aria-* çok az kullanılmış |
| Bundle Size | Code splitting eksik |
| Soft Delete | `deleted_at` kolonu yok |

---

## 🧩 Component Kullanım Rehberi

### Kullanılacak Component'lar (Canonical)
```
AudioPlayer        → src/components/common/AudioPlayer.tsx
SyncedTextPlayer   → src/components/SyncedTextPlayer.tsx  ✅ BU KULLANILACAK
Button             → src/components/ui/button.tsx
Input              → src/components/ui/input.tsx
Dialog             → src/components/ui/dialog.tsx
ContentCard        → src/components/sectors/ContentCard.tsx
```

### KULLANMA (Deprecated/Duplicate)
```
❌ NewSyncedTextPlayer.tsx  → SyncedTextPlayer.tsx kullan (birleştirilecek)
❌ Yeni AudioPlayer yazma   → Mevcut AudioPlayer'ı extend et
❌ Yeni Button yazma        → ui/button.tsx kullan
❌ Inline <button> elementi → Button component kullan
```

---

## 📊 CEFR Seviyeleri

| Seviye | Açıklama | Kelime/Cümle |
|--------|----------|--------------|
| A1 | Çok basit cümleler | Temel kelimeler, present tense |
| A2 | Basit geçmiş zaman | Günlük ifadeler |
| B1 | Karmaşık cümleler | Bağlaçlar, çeşitli zamanlar |
| B2 | Soyut konular | Nüanslar, idiomlar başlangıç |
| C1 | İdiyomlar | İnce ayrımlar, akademik |
| C2 | Ana dil seviyesi | Tam akıcılık |

---

## 🎮 Gamification

| Sistem | Açıklama |
|--------|----------|
| XP | Dinleme, quiz, kelime öğrenme |
| Streak | Günlük aktivite takibi |
| Achievements | Milestone bazlı |
| Daily Quests | Günlük görevler |
| Leaderboard | Haftalık sıralama |

---

## 🧪 Test Protokolü

### Her Değişiklikte
```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Build test
npm run build

# 4. Manual test (şimdilik)
# Kullanıcıdan ekran görüntüsü iste
```

### Gelecek (Kurulacak)
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 💻 Sık Kullanılan Komutlar

```bash
# Frontend
cd frontend && npm run dev          # Development server
cd frontend && npm run build        # Production build
cd frontend && npx tsc --noEmit     # Type check

# Backend
cd backend && npm run dev           # Development server
cd backend && npm run build         # Production build

# Lint
npm run lint                        # ESLint check
npm run lint:fix                    # Auto-fix

# Git
git checkout -b feature/xxx         # Yeni branch
git pull origin develop             # Develop'u çek
git push -u origin feature/xxx      # Push & track
```

---

## ❌ Anti-Patterns (YAPMA)

### Kod Yapısı
- ❌ 500+ satırlık controller/component dosyaları
- ❌ `any` type kullanımı
- ❌ Direct Supabase query controller'da (service kullan)
- ❌ Duplicate component oluşturma
- ❌ Pages Router'a yeni sayfa ekleme
- ❌ Named export yerine default export (component'larda)

### Business Logic
- ❌ Prompt output formatını değiştirme
- ❌ Whisper transcript'ini direkt kullanma (CEFR uyarlaması şart)
- ❌ n8n içinden direkt TTS yapma
- ❌ Audio pipeline sırasını değiştirme

### Güvenlik
- ❌ Hardcoded credentials
- ❌ `USING (true)` RLS policy (admin kontrolü şart)
- ❌ JWT secret'ları default bırakma
- ❌ Service key'i frontend'de kullanma

### Performance
- ❌ Tüm translations'ı tek dosyada tutma (i18n.ts 4762 satır)
- ❌ Dynamic import kullanmama
- ❌ Image optimization atlaması
- ❌ useEffect'te dependency array eksikliği

---

## ✅ Yeni Özellik Checklist

```
□ App Router kullandım (/src/app/)
□ TypeScript types tanımladım (any yok)
□ Mevcut component'ları kullandım (duplicate yok)
□ Service layer'da business logic
□ Error handling standardına uygun
□ Max 500 satır/dosya
□ Renk paletine uygun (purple yasak)
□ Accessibility (aria-* labels)
□ Mobile responsive
□ Import sıralaması doğru
□ Props interface tanımlandı
□ Default values verildi
□ Loading/Error states var
```

---

## 📝 Migration Oluştururken

```sql
-- Her migration'da:
-- 1. IF NOT EXISTS kullan
-- 2. Rollback planı yaz
-- 3. Index ekle (sık sorgulanan kolonlar)
-- 4. RLS policy tanımla
-- 5. created_at, updated_at ekle

-- Örnek:
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_new_table_user ON new_table(user_id);
CREATE INDEX IF NOT EXISTS idx_new_table_status ON new_table(status);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON new_table
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON new_table
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rollback:
-- DROP TABLE IF EXISTS new_table;
```

---

## 📞 Yardım & İletişim

- **Bug/Issue:** GitHub Issues
- **Soru:** Ekip Slack kanalı
- **Acil:** Tech Lead'e DM

---

*Son güncelleme: 2026-01-24*
