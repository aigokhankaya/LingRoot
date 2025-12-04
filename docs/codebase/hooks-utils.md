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

**Size:** 236KB  
**Purpose:** Multi-language support

```typescript
// Supported languages
type Locale = 'tr' | 'en' | 'de' | 'fr' | 'es';

// Translation function
function t(key: string, locale: Locale = 'tr'): string {
  return translations[locale]?.[key] || key;
}

// Usage
const label = t('common.submit', 'en'); // "Submit"
const label = t('common.submit', 'tr'); // "Gönder"

// With interpolation
function t(key: string, params: Record<string, string>, locale: Locale) {
  let text = translations[locale][key];
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, v);
  });
  return text;
}

// Usage
t('greeting.hello', { name: 'John' }, 'en'); // "Hello, John!"
```

#### Translation Structure

```typescript
const translations = {
  tr: {
    common: {
      submit: 'Gönder',
      cancel: 'İptal',
      save: 'Kaydet',
      delete: 'Sil',
      loading: 'Yükleniyor...',
      error: 'Hata',
      success: 'Başarılı'
    },
    auth: {
      login: 'Giriş Yap',
      register: 'Kayıt Ol',
      logout: 'Çıkış Yap',
      email: 'E-posta',
      password: 'Şifre'
    },
    chat: {
      newChat: 'Yeni Sohbet',
      sendMessage: 'Mesaj Gönder',
      typing: 'Yazıyor...'
    },
    // ... 5000+ keys
  },
  en: { ... },
  de: { ... },
  fr: { ... },
  es: { ... }
};
```

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
