# Admin Codebase Overview

**Last Updated:** December 2025  
**Location:** `frontend/src/app/admin`, `frontend/src/components/admin`, `frontend/src/lib/admin.ts`

This document describes the structure and responsibilities of the LingRoot admin panel code.

---

## 1. Purpose

The admin panel is used internally by the team to:

- Manage users and their subscriptions
- Inspect usage and statistics
- Configure TTS providers and environments
- Review content and troubleshoot issues

It runs as part of the main Next.js app and shares the same backend API and authentication.

---

## 2. Routing Structure

**Base path:** `/admin`

**Location:** `frontend/src/app/admin`

Typical routes (exact file names may vary):

- `/admin/login` – Admin login screen
- `/admin/dashboard` – High-level statistics and quick links
- `/admin/users` – User list and filters
- `/admin/users/[id]` – User detail
  - `/admin/users/[id]/audio` – User audio history
  - `/admin/users/[id]/logins` – Login history
  - `/admin/users/[id]/package` – Subscription details
- `/admin/packages` – Subscription plans
  - `/admin/packages/[id]` – Plan detail/edit
- `/admin/statistics` – System and usage statistics
- `/admin/tts-test` – TTS test and diagnostics page
- `/admin/content` – Content and prompts related tools
- `/admin/payments` – Payment / environment tooling

The admin routes use the same `layout.tsx` pattern as the main app but with an admin‑specific shell.

---

## 3. Layout & Shell

**File:** `frontend/src/app/admin/layout.tsx`

Responsibilities:

- Render a consistent admin shell (sidebar, header, main content area)
- Protect routes (only allow authenticated admin users)
- Provide navigation links to common admin pages

Admin layout typically:

- Checks the current user role (e.g. `role === 'admin'`)
- Redirects non-admins to a safe page (e.g. `/login`)
- Wraps children with shared providers if needed

---

## 4. Admin Components

**Location:** `frontend/src/components/admin`

Examples of responsibilities:

- `UserTable` – Paginated user list with filters and actions
- `EnvironmentSelector` – Select between environments (e.g. dev, staging, prod)
- `PaymentEnvironmentSelector` – Payment/IAP environment selection
- `TtsProviderSelector` / `TtsProviderSettings` – Configure TTS providers

These components:

- Receive data via props or via hooks that talk to `lib/admin.ts`
- Emphasize clarity and safety (avoid destructive actions without confirmation)

---

## 5. Admin Library

**File:** `frontend/src/lib/admin.ts`

This module centralizes admin API calls and helpers. Typical functions:

- **User management**
  - `getUsers(params)` – Fetch paginated user list with filters
  - `getUserById(id)` – Fetch detailed user information
  - `updateUser(id, data)` – Update user properties (role, flags)
  - `deleteUser(id)` – Soft/hard delete user (depending on backend)

- **Statistics**
  - `getStats()` – Overall system statistics
  - `getUserGrowth(period)` – User growth over time
  - `getContentStats()` – Content usage metrics

- **Plans**
  - `getPlans()` – Fetch subscription plans
  - `updatePlan(id, data)` – Update plan metadata
  - `createPlan(data)` – Create new plan

This library is a thin wrapper around the HTTP client (`lib/api.ts`), keeping admin code DRY and centralized.

---

## 6. Middleware & Access Control

**File:** `frontend/src/middleware.ts`

The middleware is responsible for:

- Checking authentication for `/admin` paths
- Redirecting unauthenticated users to `/admin/login` or `/login`
- Optionally checking role/permissions

This keeps sensitive admin routes protected even for direct URL access.

---

## 7. Error Handling & Logging

- Admin pages should surface meaningful error messages when API requests fail.
- `frontend/src/lib/logging.ts` can be used to log client‑side errors to the backend.
- Critical admin actions (plan changes, deletions) should be logged on the server side as well (see backend docs).

---

## 8. Related Documentation

- [Admin Architecture](../architecture/admin-structure.md)
- [API Services](./api-services.md)
- [Web Codebase](./web.md)
