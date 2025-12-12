# Web UI Flows

**Last Updated:** December 2025  
**Framework:** Next.js 14 (App Router)

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC ROUTES                             │
├─────────────────────────────────────────────────────────────────┤
│ /                     → Landing Page                             │
│ /login                → Login (Email, Google, Apple, Facebook)   │
│ /register             → Registration                             │
│ /forgot-password      → Password Reset Request                   │
│ /reset-password       → Password Reset Form                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PROTECTED ROUTES                            │
├─────────────────────────────────────────────────────────────────┤
│ /dashboard            → Main User Dashboard                      │
│ /subscription         → Plan Selection & Management              │
│ /payment              → Payment Processing                       │
│ /delete-account       → Account Deletion                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN ROUTES                              │
├─────────────────────────────────────────────────────────────────┤
│ /admin/login          → Admin Authentication                     │
│ /admin/dashboard      → Admin Overview                           │
│ /admin/users          → User Management                          │
│ /admin/content        → Content Moderation                       │
│ /admin/packages       → Plan Management                          │
│ /admin/payments       → Payment History                          │
│ /admin/statistics     → Analytics                                │
│ /admin/tts-test       → TTS Testing Tool                         │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### Login Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Login Page  │ ──▶ │  Validate    │ ──▶ │  MFA Check   │
│              │     │  Credentials │     │  (if enabled)│
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌──────────────┐            │
                     │  Dashboard   │ ◀─────────┤ Success
                     └──────────────┘            │
                                                  │
                     ┌──────────────┐            │
                     │  MFA Input   │ ◀─────────┤ MFA Required
                     └──────────────┘            │
```

**States:**
| State | Display | API |
|-------|---------|-----|
| Initial | Login form | - |
| Loading | Spinner + disabled form | POST /auth/login |
| MFA Required | MFA input modal | - |
| MFA Verifying | Spinner | POST /auth/mfa/verify |
| Error | Error toast | - |
| Success | Redirect to dashboard | - |

### Registration Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Step 1:     │ ──▶ │  Step 2:     │ ──▶ │  Step 3:     │
│  Email/Pass  │     │  Profile     │     │  Interests   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                     ┌──────────────┐            │
                     │  Dashboard   │ ◀──────────┘
                     └──────────────┘
```

**Form Fields:**
- Step 1: Email, Password, Confirm Password
- Step 2: Name, CEFR Level, Native Language, Target Language
- Step 3: Interest categories (optional)

## Dashboard Flow

### Main Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | User Menu (Profile Dropdown)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │ AI Chat Panel           │  │ Content Section             │  │
│  │ ┌─────────────────────┐ │  │ ┌─────────────────────────┐ │  │
│  │ │ Conversation List   │ │  │ │ Input Form              │ │  │
│  │ │ - Chat 1            │ │  │ │ (Text/YouTube/Web/etc)  │ │  │
│  │ │ - Chat 2            │ │  │ └─────────────────────────┘ │  │
│  │ │ - New Chat +        │ │  │                             │  │
│  │ └─────────────────────┘ │  │ ┌─────────────────────────┐ │  │
│  │ ┌─────────────────────┐ │  │ │ Output / History        │ │  │
│  │ │ Chat Messages       │ │  │ │ - Audio Player          │ │  │
│  │ │                     │ │  │ │ - Synced Text           │ │  │
│  │ └─────────────────────┘ │  │ └─────────────────────────┘ │  │
│  │ ┌─────────────────────┐ │  │                             │  │
│  │ │ Message Input       │ │  │ ┌─────────────────────────┐ │  │
│  │ └─────────────────────┘ │  │ │ Topic Suggestions       │ │  │
│  └─────────────────────────┘  │ └─────────────────────────┘ │  │
│                                └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### AI Chat Flow

```
User Input → Send Message → Show Typing Indicator → 
Display Response → Optional TTS → Topic Extraction
```

**API Sequence:**
1. `POST /api/ai-chat/send` - Send message
2. `GET /api/ai-chat/conversations/:id/messages` - Refresh (if needed)
3. `POST /api/ai-chat/tts` - Generate audio (optional)

**States:**
| State | UI Display |
|-------|------------|
| Empty | "Start a conversation" prompt |
| Loading | Skeleton placeholders |
| Typing | Animated typing indicator |
| Error | Error message + retry button |
| Success | Message bubble |

### Content Generation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Input Form   │ ──▶ │ Processing   │ ──▶ │ Result View  │
│              │     │ (Progress)   │     │ + Audio      │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Input Types:**
| Type | Field | API Endpoint |
|------|-------|--------------|
| Text | Textarea | POST /tts/process-text |
| YouTube | URL input | POST /tts/process-youtube |
| Web | URL input | POST /tts/process-web |
| File | File upload | POST /tts/process-file |
| Book | Book selector | POST /books/:id/chapters/:id/audio |

**Processing States:**
1. **Extracting** - Getting text from source
2. **Translating** - If non-English
3. **Adapting** - CEFR level adjustment
4. **Generating** - TTS audio creation
5. **Complete** - Audio ready

### Audio Player Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Audio Player                                                 │
├─────────────────────────────────────────────────────────────┤
│  ⏮️  ▶️/⏸️  ⏭️   ────●─────────────────   00:45 / 03:20    │
│                                                              │
│  🔊 ━━━━━━━━●━    Speed: 1.0x ▼                             │
├─────────────────────────────────────────────────────────────┤
│  Synced Text Display                                         │
│  "The quick brown fox jumps over the lazy dog."             │
│        ↑                                                     │
│    (highlighted word)                                        │
└─────────────────────────────────────────────────────────────┘
```

**Controls:**
- Play/Pause
- Skip forward/backward (10s)
- Progress bar (seekable)
- Volume slider
- Speed selector (0.5x - 2x)

## Subscription Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Plan Select  │ ──▶ │ Payment      │ ──▶ │ Confirmation │
│              │     │ (IAP/Stripe) │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Plan Display:**
- Plan name & price
- Feature list
- Current plan indicator
- Upgrade/Downgrade button

## Error States

### Global Error Handling

| Error Type | Display | Action |
|------------|---------|--------|
| 401 Unauthorized | Redirect to login | Clear session |
| 403 Forbidden | Access denied message | Upgrade prompt (if plan-related) |
| 404 Not Found | Not found page | Home link |
| 429 Rate Limit | Rate limit toast | Retry timer |
| 500 Server Error | Error page | Retry button |
| Network Error | Offline indicator | Retry when online |

### Component-Level Errors

```tsx
// Standard error state pattern
function ContentSection() {
  const { data, error, isLoading } = useContent();
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data || data.length === 0) return <EmptyState />;
  
  return <ContentList data={data} />;
}
```

## Loading States

### Skeleton Patterns

```tsx
// List skeleton
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
    </div>
  ))}
</div>

// Card skeleton
<div className="animate-pulse">
  <div className="h-48 bg-gray-200 rounded-t" />
  <div className="p-4">
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
  </div>
</div>
```

### Progress Indicators

| Type | Use Case |
|------|----------|
| Spinner | Button loading, quick actions |
| Progress bar | Multi-step processes |
| Skeleton | Content loading |
| Typing dots | AI response |

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640-1024px | Two column, side nav |
| Desktop | > 1024px | Full layout |

## Related Documentation

- [Frontend Structure](../architecture/frontend-structure.md)
- [Admin UI Flows](./admin-ui-flows.md)
- [Component Codebase](../codebase/web.md)
