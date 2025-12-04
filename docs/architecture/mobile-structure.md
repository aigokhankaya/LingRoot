# Mobile Architecture – LingRootMobile

**Last Updated:** December 2025  
**App:** `LingRootMobile` (React Native / Expo)

## Overview

The mobile app provides a native experience for consuming LingRoot content, managing subscriptions, notifications, and social authentication while sharing the same backend API and CEFR logic as the web app.

- **Framework:** React Native (Expo)
- **State:** Local component state + lightweight contexts
- **Navigation:** React Navigation (stack-based)
- **Platform Targets:** iOS, Android

---

## Folder Structure

**Root (LingRootMobile):**

- `App.tsx` – Entry point, wraps providers and navigation
- `app.config.ts` – Expo application configuration
- `src/` – Application source
  - `components/` – Reusable UI components
  - `contexts/` – React Context providers (auth, subscription, settings)
  - `navigation/` – Navigation container and stacks
  - `screens/` – Screen components
  - `services/` – API, Supabase, IAP, notifications, auth helpers
  - `types/` – Shared TypeScript types
  - `utils/` – Small utility helpers

---

## Navigation

**File:** `src/navigation/AppNavigator.tsx`

Responsibilities:
- Configure root `NavigationContainer`
- Define authentication flow vs. main app flow
- Handle initial route based on auth state

Typical stacks:
- **Auth Stack:** Login, Register, Forgot Password, Social Login
- **Main Stack:** Home, Content Detail, Player, Vocabulary, Settings, Profile
- **Modal Screens:** Subscription paywall, notifications permissions, reminders

The navigator reads user state from contexts (e.g. `AuthContext`) and routes users accordingly.

---

## Screens

**Location:** `src/screens/`

Representative categories (names may differ in code):

- **Onboarding & Auth**
  - Welcome / Onboarding
  - Email-password login
  - Social login (Google / Apple / Facebook)

- **Home & Content**
  - Home / Dashboard
  - Content list (TTS history, books, topics)
  - Content detail & audio player

- **Learning Tools**
  - Vocabulary list
  - Word detail / add-to-vocabulary
  - Topic suggestions

- **Account & Settings**
  - Profile & CEFR level
  - Subscription status
  - Notification preferences
  - Reminder settings

Each screen is a functional React component that:
- Uses hooks from `services/api.ts`, `services/supabase.ts`, etc.
- Reads global state from contexts (auth, subscription, notifications).
- Uses shared components from `src/components/` for consistent UI.

---

## Contexts

**Location:** `src/contexts/`

Example responsibilities:

- **Auth Context**
  - Store current user and JWT token
  - Expose `login`, `logout`, `refreshSession`, and social auth handlers
  - Synchronize with backend `/auth` endpoints and Supabase session where needed

- **Subscription / IAP Context**
  - Track active plan and entitlement status
  - Wrap calls to `services/iap.ts`
  - Expose helpers like `hasFeature` and `isProUser`

- **Notification / Reminder Context**
  - Store push token and reminder preferences
  - Coordinate with `notificationService.*.ts` and `reminderSettingsService.ts`

Contexts are consumed by screens with `useContext` or custom hooks.

---

## Services

**Location:** `src/services/`

Key files:

- `api.ts`
  - Wraps HTTP calls to backend (`/api/...` endpoints)
  - Handles auth headers and error normalization
- `supabase.ts`
  - Supabase client configuration for mobile (if needed)
- `iap.ts`
  - In-app purchase logic (restore purchases, validate receipts, track plans)
- `notificationService*.ts`
  - Push notification registration (platform-specific files for iOS/Android)
  - Topic subscriptions and foreground/background handlers
- `socialAuth.ts`
  - Google / Apple / Facebook sign-in flows
- `reminderSettingsService.ts`
  - CRUD operations for user reminder settings via backend or Supabase
- `environmentConfig.ts`
  - Maps environment variables (API base URL, feature flags) for mobile

These services encapsulate side effects and external dependencies so screens remain mostly declarative.

---

## Components

**Location:** `src/components/`

Contains reusable primitives and composite components, for example:
- Buttons, inputs, modals
- Audio player controls (play/pause, seek bar)
- Subscription banners / paywalls
- Empty state views and loading indicators

The goal is to keep screens thin and move shared UI logic into components.

---

## Types & Utilities

- `src/types/` – Shared interfaces for user, plan, content, notifications, etc.
- `src/utils/` – Utility functions (formatting, parsing, helpers)

These modules exist to:
- Keep API contracts explicit
- Avoid duplicating string literals and magic values
- Provide a single source of truth for domain types on mobile

---

## Integration with Backend & Web

The mobile app:
- Uses the **same API contract** as the web app (`/api/...` endpoints described in `docs/api/endpoints.md`).
- Respects **CEFR adaptation** and prompt rules as described in `PROJECT_MEMORY.md` and `docs/prompts/*.md`.
- Shares business rules for subscriptions, usage limits, and MFA with the backend.

---

## Related Documentation

- [System Overview](../architecture/system-overview.md)
- [API Endpoints](../api/endpoints.md)
- [Web Codebase](../codebase/web.md)
- [API Services](../codebase/api-services.md)
