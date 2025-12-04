# Web Application Codebase

**Last Updated:** December 2025  
**Location:** `/frontend`

## Overview

The web application is built with Next.js 14 using the App Router pattern, providing a modern, performant user interface for the LingRoot language learning platform.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.1.0 | React framework |
| React | 18.3.1 | UI library |
| TypeScript | 5.8.3 | Type safety |
| Tailwind CSS | 3.4.17 | Styling |
| Axios | 1.9.0 | HTTP client |
| Radix UI | Various | UI primitives |
| Lucide React | 0.513.0 | Icons |
| Recharts | 2.15.3 | Charts |
| Socket.io Client | 4.8.1 | Real-time |

## Directory Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (1KB)
│   │   ├── globals.css         # Global styles (17KB)
│   │   ├── error.tsx           # Error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   ├── login/page.tsx      # Login page
│   │   ├── register/page.tsx   # Registration page
│   │   ├── dashboard/page.tsx  # User dashboard
│   │   ├── subscription/       # Subscription pages
│   │   ├── payment/            # Payment flow
│   │   ├── delete-account/     # Account deletion
│   │   └── admin/              # Admin panel (17 routes)
│   │
│   ├── components/             # 82 React components
│   │   ├── ui/                 # 19 base components
│   │   ├── chat/               # 6 chat components
│   │   ├── admin/              # 5 admin components
│   │   ├── common/             # 7 shared components
│   │   ├── shared/             # Cross-page components
│   │   ├── sidebar/            # 2 sidebar components
│   │   ├── sections/           # 6 page sections
│   │   ├── TopicHierarchy/     # 6 topic components
│   │   ├── user/               # 3 user components
│   │   └── layout/             # Layout components
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── api.ts              # API client (61KB)
│   │   ├── auth.tsx            # Auth context (17KB)
│   │   ├── i18n.ts             # Translations (236KB)
│   │   ├── admin.ts            # Admin functions (5KB)
│   │   ├── content.ts          # Content API (6KB)
│   │   ├── plan.ts             # Plan functions (7KB)
│   │   ├── user.ts             # User functions (7KB)
│   │   ├── googleAuth.ts       # Google OAuth (7KB)
│   │   ├── supabaseClient.ts   # Supabase client
│   │   ├── logging.ts          # Client logging
│   │   └── utils.ts            # Helpers
│   │
│   ├── services/               # Service layer
│   ├── types/                  # TypeScript types
│   ├── context/                # React contexts
│   ├── hooks/                  # Custom hooks
│   └── styles/                 # Additional CSS
│
├── public/                     # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Core Components

### Input Section (`components/InputSection.tsx`)

The main content input form supporting multiple input types.

**Size:** 63KB (largest component)

**Features:**
- Text input
- YouTube URL processing
- Web page URL processing
- File upload (PDF, DOCX, TXT, EPUB)
- Book selection
- Topic selection
- Voice and speed configuration
- CEFR level selection

**Props:**
```typescript
interface InputSectionProps {
  onSubmit: (data: ContentInput) => Promise<void>;
  isProcessing: boolean;
  userLevel: CEFRLevel;
}
```

### Audio Player (`components/AudioPlayer.tsx`)

Custom audio player with advanced features.

**Size:** 19KB

**Features:**
- Play/pause/seek
- Speed control (0.5x - 2x)
- Volume control
- Progress bar
- Time display
- Keyboard shortcuts

### Synced Text Player (`components/SyncedTextPlayer.tsx`)

Text-audio synchronization display.

**Size:** 56KB

**Features:**
- Word-level highlighting
- Sentence following
- Click-to-seek
- VTT subtitle support
- Bilingual display

### Chat Components

| Component | Size | Purpose |
|-----------|------|---------|
| `ChatInterface.tsx` | - | Main chat UI |
| `ConversationList.tsx` | - | Chat history sidebar |
| `MessageBubble.tsx` | - | Message display |
| `ChatInput.tsx` | - | Message input |
| `TypingIndicator.tsx` | - | Typing animation |

### Topic Hierarchy (`components/TopicHierarchy/`)

Multi-level topic selection tree.

| Component | Purpose |
|-----------|---------|
| `TopicTree.tsx` | Tree structure display |
| `TopicNode.tsx` | Individual node |
| `TopicFilter.tsx` | Level filtering |
| `TopicSearch.tsx` | Topic search |

## Page Structure

### Dashboard (`app/dashboard/page.tsx`)

Main user dashboard after login.

**Sections:**
1. Welcome header with user info
2. Quick actions (New Chat, Generate Content)
3. Conversation list (recent chats)
4. Content history
5. Recommended topics
6. Usage statistics

### Login/Register Flow

```
/login
  ├── Email/Password form
  ├── Google Sign-In button
  ├── Apple Sign-In button
  ├── Facebook Sign-In button
  └── MFA verification (if enabled)

/register
  ├── Personal info form
  ├── Email verification
  ├── CEFR level selection
  ├── Language preferences
  └── Interest selection
```

### Subscription Pages

```
/subscription
  ├── Current plan display
  ├── Plan comparison
  ├── Upgrade/downgrade options
  └── Billing history

/payment
  ├── Payment method selection
  ├── Invoice preview
  └── Confirmation
```

## State Management

### Auth Context

```typescript
// lib/auth.tsx
const AuthContext = createContext<AuthContextType>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth methods
  const login = async (email, password) => {...};
  const logout = async () => {...};
  const register = async (data) => {...};
  
  return (
    <AuthContext.Provider value={{ user, login, logout, ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Data Fetching Patterns

```typescript
// SWR for cached data
import useSWR from 'swr';

function useConversations() {
  const { data, error, mutate } = useSWR('/api/chat/conversations', fetcher);
  return { conversations: data, isLoading: !error && !data, mutate };
}

// Direct API calls for mutations
async function sendMessage(conversationId: string, content: string) {
  const response = await api.post('/api/ai-chat/send', {
    conversationId,
    content
  });
  return response.data;
}
```

## Styling Patterns

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### Component Styling

```tsx
// Using clsx for conditional classes
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<button className={cn(
  'px-4 py-2 rounded-md font-medium',
  variant === 'primary' && 'bg-primary-600 text-white',
  variant === 'secondary' && 'bg-gray-100 text-gray-900',
  disabled && 'opacity-50 cursor-not-allowed'
)}>
```

## Internationalization

```typescript
// lib/i18n.ts (236KB)
const translations = {
  tr: {
    common: {
      submit: 'Gönder',
      cancel: 'İptal',
      // ... 5000+ keys
    }
  },
  en: {...},
  de: {...},
  fr: {...},
  es: {...}
};

export function t(key: string, locale: string): string {
  return get(translations[locale], key) || key;
}
```

## Performance Optimizations

1. **Code Splitting:** Automatic via Next.js
2. **Dynamic Imports:** For heavy components
3. **Image Optimization:** Next.js Image
4. **Font Optimization:** Next.js Font
5. **Caching:** SWR for API responses

## Related Documentation

- [Frontend Structure](../architecture/frontend-structure.md)
- [Hooks & Utils](./hooks-utils.md)
- [API Services](./api-services.md)
