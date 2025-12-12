# Frontend Structure

**Last Updated:** December 2025  
**Framework:** Next.js 14 (App Router)

## Directory Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Admin panel routes (17 items)
│   │   │   ├── dashboard/      # Admin dashboard
│   │   │   ├── users/          # User management
│   │   │   ├── content/        # Content management
│   │   │   ├── packages/       # Plan management
│   │   │   ├── payments/       # Payment history
│   │   │   ├── statistics/     # Analytics
│   │   │   ├── external-services/  # External service config
│   │   │   └── tts-test/       # TTS testing tool
│   │   ├── dashboard/          # User dashboard
│   │   ├── login/              # Authentication
│   │   ├── register/           # User registration
│   │   ├── subscription/       # Subscription management
│   │   ├── payment/            # Payment processing
│   │   ├── delete-account/     # Account deletion
│   │   ├── api/                # API routes (if any)
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   └── error.tsx           # Error boundary
│   │
│   ├── components/             # React components (82 items)
│   │   ├── ui/                 # Base UI components (19 items)
│   │   ├── chat/               # AI Chat components (6 items)
│   │   ├── admin/              # Admin-specific components
│   │   ├── common/             # Shared components
│   │   ├── shared/             # Cross-page components
│   │   ├── sidebar/            # Navigation sidebar
│   │   ├── sections/           # Page sections
│   │   ├── TopicHierarchy/     # Topic tree components
│   │   ├── user/               # User-related components
│   │   └── layout/             # Layout components
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── api.ts              # API client (60KB+)
│   │   ├── auth.tsx            # Auth context & hooks
│   │   ├── i18n.ts             # Internationalization (236KB)
│   │   ├── admin.ts            # Admin API functions
│   │   ├── content.ts          # Content API functions
│   │   ├── plan.ts             # Plan management
│   │   ├── user.ts             # User API functions
│   │   └── utils.ts            # Helper utilities
│   │
│   ├── services/               # Service layer
│   ├── types/                  # TypeScript definitions
│   ├── context/                # React Context providers
│   ├── hooks/                  # Custom React hooks
│   └── styles/                 # Additional styles
│
├── public/                     # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Key Components

### Core UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `AudioPlayer` | `AudioPlayer.tsx` | Audio playback with controls |
| `SyncedTextPlayer` | `SyncedTextPlayer.tsx` | Text-audio sync display |
| `InputSection` | `InputSection.tsx` | Multi-source input form |
| `OutputSection` | `OutputSection.tsx` | Processed content display |
| `LanguageSelector` | `LanguageSelector.tsx` | Language preference picker |

### Chat Components

| Component | Purpose |
|-----------|---------|
| `ChatInterface` | Main chat UI |
| `ConversationList` | Chat history sidebar |
| `MessageBubble` | Individual message display |
| `ChatInput` | Message input field |

### Admin Components

| Component | Purpose |
|-----------|---------|
| `AdminChatInterface` | Admin support chat |
| `UserManagement` | User CRUD operations |
| `ContentManagement` | Content moderation |
| `PackageInfo` | Subscription plan editor |

## State Management

### Auth Context (`lib/auth.tsx`)

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state |
| `useApi` | API request handling |
| `useToast` | Notification display |

## API Integration

### API Client (`lib/api.ts`)

The main API client handles:
- Request/response interceptors
- Token management
- Error handling
- Request retries

```typescript
// Example usage
import { api } from '@/lib/api';

const response = await api.get('/users/profile');
const data = await api.post('/tts/process-text', payload);
```

### Key API Functions

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `processText` | POST /tts/process-text | Text-to-speech |
| `getConversations` | GET /chat/conversations | Fetch chats |
| `sendMessage` | POST /ai-chat/send | Send AI message |
| `getBooks` | GET /books | Fetch book list |

## Internationalization

The `i18n.ts` file (~236KB) contains the main translation dictionary and helper hooks.

- **Locales (type `Locale`):** `tr`, `en`, `de`, `fr`, `es`, `pt`, `hi`, `id`, `ar`
- **UI supported locales (`supportedLocales`):** `['tr', 'en', 'de', 'ar']`
- **RTL locales:** currently `['ar']` (handled via `RTLProvider` + global RTL CSS)

Frontend components use the following API:

```typescript
import { useTranslation, useLanguage } from '@/lib/i18n';

const { t } = useTranslation();
const { currentLocale, changeLanguage, supportedLocales } = useLanguage();
```

Each locale dictionary is a flat key–value map (e.g. `welcome_audio_generate_button`, `profile_welcome`, `landing_how_step1_title`, ...).

**Process rule:** When adding or changing any user-facing UI text, you **must** update the translation entries for all UI locales in `supportedLocales` (currently `['tr','en','de','ar']`) in the same change.

For a step‑by‑step guide on adding a **new language**, see:

- `docs/codebase/hooks-utils.md` → **Internationalization (`lib/i18n.ts`) – Yeni Dil Ekleme (Frontend Checklist)**

## Styling

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...},
      },
    },
  },
  plugins: [],
};
```

### Component Styling Pattern

```tsx
// Using clsx for conditional classes
import { clsx } from 'clsx';

<button className={clsx(
  'px-4 py-2 rounded',
  isActive && 'bg-primary text-white',
  disabled && 'opacity-50 cursor-not-allowed'
)}>
  {label}
</button>
```

## Routing

### Protected Routes

```tsx
// middleware.ts handles route protection
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  
  if (isProtectedRoute(request.nextUrl.pathname) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Admin Routes

All `/admin/*` routes require:
- Valid authentication
- Admin role verification

## Performance Optimizations

1. **Code Splitting:** Automatic via Next.js
2. **Image Optimization:** Next.js Image component
3. **Lazy Loading:** Dynamic imports for heavy components
4. **Caching:** SWR for API responses

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^14.1.0 | Framework |
| react | ^18.3.1 | UI library |
| axios | ^1.9.0 | HTTP client |
| tailwindcss | ^3.4.17 | Styling |
| @radix-ui/* | Various | UI primitives |
| lucide-react | ^0.513.0 | Icons |
| recharts | ^2.15.3 | Charts |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| typescript | Type checking |
| eslint | Linting |
| @types/* | Type definitions |

## Related Documentation

- [API Services](../codebase/api-services.md)
- [Hooks & Utils](../codebase/hooks-utils.md)
- [System Overview](./system-overview.md)
