# Hooks & Utilities Reference

**Last Updated:** December 2025  
**Location:** `/frontend/src/lib/`, `/frontend/src/hooks/`

## Frontend Utilities

### API Client (`lib/api.ts`)

**Size:** 61KB  
**Purpose:** Central API communication layer

#### Configuration

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - adds auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### Key Functions

| Function | Description |
|----------|-------------|
| `processText(data)` | Submit text for TTS processing |
| `processYoutube(url, options)` | Process YouTube video |
| `processWeb(url, options)` | Process web page |
| `getConversations()` | Fetch user's AI conversations |
| `sendMessage(conversationId, content)` | Send message to AI |
| `getBooks(params)` | Fetch book list |
| `getBookChapters(bookId)` | Fetch book chapters |
| `generateChapterAudio(bookId, chapterId, options)` | Generate chapter audio |
| `getUserProfile()` | Fetch current user profile |
| `updateProfile(data)` | Update user profile |
| `getPlans()` | Fetch subscription plans |
| `subscribe(planId)` | Subscribe to plan |

---

### Auth Context (`lib/auth.tsx`)

**Size:** 17KB  
**Purpose:** Authentication state management

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Usage
function Component() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm onSubmit={login} />;
  }
  
  return <Dashboard user={user} onLogout={logout} />;
}
```

---

### Internationalization (`lib/i18n.ts`)

**Size:** ~236KB  
**Purpose:** UI çevirileri, dil seçimi ve RTL yönetimi

#### Temel Yapı

```typescript
// Desteklenen locale tipi
export type Locale = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'pt' | 'hi' | 'id' | 'ar';

// Aktif UI dilleri (header / selector vs.)
export const supportedLocales: Locale[] = ['tr', 'en', 'de', 'ar'];

// RTL diller
export const rtlLocales: Locale[] = ['ar'];
export const isRTL = (locale: Locale) => rtlLocales.includes(locale);

// Ana sözlük (özet)
export const translations: Translations = {
  tr: { /* ... */ },
  en: { /* ... */ },
  de: { /* ... */ },
  fr: { /* ... */ },
  es: { /* ... */ },
  pt: { /* ... */ },
  hi: { /* ... */ },
  id: { /* ... */ },
  ar: arTranslations
};

// Dil durumu & değişimi
export const useLanguage = () => {
  const currentLocale = getCurrentLanguage();
  const changeLanguage = (locale: Locale) => {
    if (!supportedLocales.includes(locale)) return;
    setStoredLanguage(locale);             // localStorage
    if (typeof window !== 'undefined') {
      window.location.reload();            // tüm UI'yi yeni dile geçir
    }
  };
  return { currentLocale, changeLanguage, supportedLocales };
};

// Çeviri erişimi
export const useTranslation = (localeOverride?: Locale) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveLocale = localeOverride || (mounted ? getCurrentLanguage() : defaultLocale);
  const { t, currentLocale } = getTranslation(effectiveLocale);
  const memoizedT = useCallback(t, [currentLocale]);
  return { t: memoizedT, currentLocale };
};

// Kullanım
const { t } = useTranslation();
const { currentLocale, changeLanguage, supportedLocales } = useLanguage();
```

> **Not:** `RTLProvider` bileşeni, `currentLocale` değerine göre `document.documentElement.dir` ve `body` class’larını (`rtl` / `ltr`) otomatik yönetir.

#### Yeni Dil Ekleme (Frontend Checklist)

Yeni bir locale (ör. `it`) eklerken aşağıdaki adımlar **eksiksiz** uygulanmalıdır:

1. **Locale tipini güncelle**  
   - `frontend/src/lib/i18n.ts` içinde `Locale` tipine yeni kodu ekle:  
     `export type Locale = 'tr' | 'en' | ... | 'ar' | 'it';`

2. **Çeviri sözlüğünü ekle**  
   - Tercihen `frontend/src/lib/translations/it.ts` benzeri bir dosya oluştur (`arTranslations` yapısına paralel).  
   - En azından şu gruplar doldurulmalı:
     - Genel UI: login/register/header/footer
     - Landing & welcome: `landing_*`, `welcome_*`
     - Dashboard & profile: `dashboard_*`, `profile_*`
     - Settings & content-selection: `settings_*`, `content_selection_*`

3. **Ana sözlüğe bağla**  
   - `i18n.ts` başında yeni dosyayı import et:  
     `import { itTranslations } from './translations/it';`
   - `translations` objesine ekle:  
     `it: itTranslations,`

4. **Dil isimlerini ekle**  
   - Tüm mevcut dillerde (özellikle `tr`, `en`, `ar`) şu anahtarı ekle:  
     `language_it: 'Italiano'`  
   - Böylece `LanguageSelector` bileşenleri `t('language_it')` ile doğru etiketi gösterebilir.

5. **Kullanıcıya açılacak mı?**  
   - UI’de seçilebilir olmasını istiyorsan `supportedLocales` dizisine ekle:  
     `export const supportedLocales: Locale[] = ['tr', 'en', 'ar', 'it'];`
   - Sadece arka planda (ör. TTS / çeviri) kullanılacaksa `supportedLocales`’a ekleme.

6. **RTL gereksinimini belirle**  
   - Dil sağdan sola ise (ör. Farsça, Urduca):
     - `rtlLocales` dizisine ekle (örn. `['ar', 'fa']`).
     - Gerekirse `globals.css` içinde ek RTL class’ları tanımla.

7. **Hard-coded alanları ve özel bölümleri gözden geçir**  
   Aşağıdaki yerlerde genellikle el ile liste/metin tutuluyor; yeni dili buraya da ekle:
   - `pages/index.tsx` → header dil seçimi / butonlar
   - `pages/profile.tsx` → profil hero & istatistik alanları (`profile_*`, `content_selection_*`)
   - `pages/terms.tsx` → kullanım şartları / legal doküman metinleri (`terms_*`, `legal_documents`)
   - `pages/settings.tsx` → interface & native language dropdown’ları
   - `components/shared/ProfileDropdownMenu.tsx` → `profile_menu_*` (profil menüsü maddeleri)
   - **Topic hierarchy** bileşenleri:  
     - `TopicHierarchySection`, `TopicTree` → `topics_*`, `topics_input_*` metinleri (welcome & dashboard)  
     - `TopicNode` → `topics_node_*` rozetler, durum etiketleri ve aksiyon butonları  
     - `SubtopicModal` → `topics_subtopic_modal_*` başlıklar, açıklamalar, butonlar  
     - `ManualSubtopicModal` → `topics_manual_modal_*` başlıklar, placeholder'lar, butonlar
   - Herhangi başka bir `select` / buton içinde `tr`, `en` sabit yazılmış yerler

8. **Test & doğrulama**  
   - `npx tsc --noEmit` (TypeScript hatası olmamalı)
   - `npm run dev` ile şu sayfaları yeni locale ile tek tek kontrol et:
     - `/` (landing)
     - `/welcome`
     - `/dashboard`, `/profile`, `/settings`, `/content-selection`
   - UI’de **hiçbir yerde** ham key (`welcome_...`, `profile_...`) görünmemeli.

9. **Yeni UI metni ekleme kuralı (zorunlu)**  
   - Frontend’de yeni bir kullanıcıya dönük metin eklediğinde veya mevcut bir metni değiştirdiğinde:  
     - En az tüm **UI dilleri** için (şu an: `supportedLocales = ['tr','en','de','ar']`) karşılıklarını ekle/güncelle.  
     - Yani aynı PR’da/commit’te: 
       - `tr` ve `en` sözlükleri (`i18n.ts`)  
       - `de` sözlüğü (`i18n.ts` içi Almanca blok)  
       - `ar` sözlüğü (`lib/translations/ar.ts`)  
       güncel olmalı.  
   - Sadece Türkçe metin ekleyip diğer dilleri boş bırakmak **kabul edilmez**; bu durum üretimde yarım çeviri (TR/EN/DE/AR karışık) görünmesine neden olur.

Bu checklist, gelecekte eklenecek tüm diller için (ör. İtalyanca, Rusça vb.) referans olarak kullanılmalıdır.

---

### Admin Utilities (`lib/admin.ts`)

**Size:** 5KB  
**Purpose:** Admin panel API functions

```typescript
// User management
async function getUsers(params: UserQueryParams): Promise<PaginatedUsers> {}
async function getUserById(id: string): Promise<User> {}
async function updateUser(id: string, data: Partial<User>): Promise<User> {}
async function deleteUser(id: string): Promise<void> {}

// Statistics
async function getStats(): Promise<SystemStats> {}
async function getUserGrowth(period: string): Promise<GrowthData[]> {}
async function getContentStats(): Promise<ContentStats> {}

// Plan management
async function getPlans(): Promise<Plan[]> {}
async function updatePlan(id: number, data: Partial<Plan>): Promise<Plan> {}
async function createPlan(data: CreatePlanData): Promise<Plan> {}
```

---

### Plan Utilities (`lib/plan.ts`)

**Size:** 7KB  
**Purpose:** Subscription plan helpers

```typescript
// Check if user has access to feature
function hasFeature(user: User, feature: string): boolean {
  const plan = user.plan || { features: {} };
  return plan.features[feature] === true;
}

// Get remaining daily usage
function getRemainingUsage(user: User): number {
  const limit = user.plan?.dailyLimit || 3;
  const used = user.dailyUsage || 0;
  return Math.max(0, limit - used);
}

// Check if plan upgrade needed
function needsUpgrade(user: User, feature: string): boolean {
  return !hasFeature(user, feature);
}

// Get plan comparison
function comparePlans(currentPlan: Plan, targetPlan: Plan): PlanComparison {
  return {
    priceChange: targetPlan.price - currentPlan.price,
    newFeatures: getNewFeatures(currentPlan, targetPlan),
    limitChange: targetPlan.dailyLimit - currentPlan.dailyLimit
  };
}
```

---

### Content Utilities (`lib/content.ts`)

**Size:** 6KB  
**Purpose:** Content processing helpers

```typescript
// Format duration for display
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calculate reading time
function estimateReadingTime(wordCount: number, wpm: number = 150): number {
  return Math.ceil(wordCount / wpm);
}

// Get content type icon
function getContentTypeIcon(type: ContentType): IconType {
  const icons = {
    text: TextIcon,
    youtube: YoutubeIcon,
    web: GlobeIcon,
    file: FileIcon,
    book: BookIcon
  };
  return icons[type];
}

// Truncate text for preview
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
```

---

### User Utilities (`lib/user.ts`)

**Size:** 7KB  
**Purpose:** User profile helpers

```typescript
// Get display name
function getDisplayName(user: User): string {
  if (user.name) return user.name;
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email.split('@')[0];
}

// Get avatar URL
function getAvatarUrl(user: User): string {
  if (user.profileImageUrl) return user.profileImageUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(user))}`;
}

// Get CEFR level display
function getCEFRDisplay(level: string): { label: string; color: string } {
  const displays = {
    A1: { label: 'Beginner', color: 'green' },
    A2: { label: 'Elementary', color: 'blue' },
    B1: { label: 'Intermediate', color: 'yellow' },
    B2: { label: 'Upper Intermediate', color: 'orange' },
    C1: { label: 'Advanced', color: 'red' },
    C2: { label: 'Proficiency', color: 'purple' }
  };
  return displays[level] || { label: level, color: 'gray' };
}
```

---

### Logging Utilities (`lib/logging.ts`)

**Size:** 3KB  
**Purpose:** Client-side logging

```typescript
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
    sendToServer('info', message, data);
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
    sendToServer('warn', message, data);
  },
  
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
    sendToServer('error', message, {
      message: error?.message,
      stack: error?.stack
    });
  }
};

async function sendToServer(level: string, message: string, data?: any) {
  if (process.env.NODE_ENV === 'production') {
    await fetch('/api/log', {
      method: 'POST',
      body: JSON.stringify({ level, message, data, timestamp: new Date() })
    });
  }
}
```

---

### UI Utilities (`lib/utils.ts`)

**Size:** <1KB  
**Purpose:** Common UI helpers

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className
)} />
```

---

## Custom Hooks

### useAuth

```typescript
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### useWordSync

**Location:** `hooks/useWordSync.ts`
**Purpose:** Synchronizes audio playback with text for read-along experience

```typescript
interface UseWordSyncProps {
  audioUrl: string;
  timepoints: Timepoint[];
  originalText: string;
}

interface UseWordSyncReturn {
  activeWordIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  wordTimestamps: WordTimestamp[];
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

// Usage
const { 
  activeWordIndex, 
  play, 
  pause 
} = useWordSync({
  audioUrl: '...',
  timepoints: [...],
  originalText: '...'
});
```

## Related Documentation

- [Web Codebase](./web.md)
- [Frontend Structure](../architecture/frontend-structure.md)
- [API Services](./api-services.md)
