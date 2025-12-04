# ERD – Entity Relationship Diagram (Textual)

**Last Updated:** December 2025  
**Source of truth:** `schema-overview.md` + `backend/migrations/*.sql`

This document provides a textual ERD-style overview of the main entities and their relationships.

---

## 1. Core Entities

### 1.1 users

- **PK:** `id` (UUID)
- One user:
  - has zero or one **plan** (via `plan_id`)
  - has zero or many **subscriptions**
  - has zero or many **conversations**, **content_history**, **user_vocabulary**, **user_interests**, **user_favorites` (if present), **notifications**, etc.

Relationships:
- `users.plan_id` → `plans.id` (many users → one plan)

### 1.2 plans

- Defines subscription offerings.
- Referenced by:
  - `users.plan_id`
  - `subscriptions.plan_id`

### 1.3 subscriptions

- **FKs:**
  - `user_id` → `users.id`
  - `plan_id` → `plans.id`

A user can have many subscriptions over time; at most one active at a time.

---

## 2. AI Chat & Topics

### 2.1 conversations

- **PK:** `id` (UUID)
- **FK:** `user_id` → `users.id`
- 1 conversation has many **messages**.

### 2.2 messages

- **PK:** `id` (UUID)
- **FK:** `conversation_id` → `conversations.id`

Relationship:
- `users 1 ──< conversations 1 ──< messages`

### 2.3 topics

- **PK:** `id` (UUID)
- **FK:** `user_id` → `users.id`

Represents user-specific topics used for suggestions and content generation.

---

## 3. Books & Audio

### 3.1 books

- **PK:** `id` (SERIAL)
- Has many **book_chapters**.

### 3.2 book_chapters

- **PK:** `id` (SERIAL)
- **FK:** `book_id` → `books.id`
- Has many **chapter_audio** entries.

### 3.3 chapter_audio

- **PK:** `id` (SERIAL)
- **FK:** `chapter_id` → `book_chapters.id`
- Uniqueness across (`chapter_id`, `voice_model`, `speaking_rate`, `level`).

Relationship chain:
- `books 1 ──< book_chapters 1 ──< chapter_audio`

---

## 4. Content History & Usage

### 4.1 content_history

- **PK:** `id` (UUID)
- **FK:** `user_id` → `users.id`
- Optional FK: `chapter_id` → `book_chapters.id`

Represents processed content (text, YouTube, web, file, book) and its TTS outputs.

### 4.2 daily_usage_patterns (from migrations)

- Linked to `users` via `user_id`.
- Stores derived analytics about when users typically learn.

---

## 5. Vocabulary & Interests

### 5.1 user_vocabulary

- **PK:** `id` (SERIAL)
- **FK:** `user_id` → `users.id`
- Unique constraint on (`user_id`, `word`).

### 5.2 user_interests

- **PK:** `id` (UUID)
- **FK:** `user_id` → `users.id`

### 5.3 user_favorites (from migrations)

- **PK:** `id` (SERIAL)
- **FK:** `user_id` → `users.id`
- `item_type`, `item_id` identify the target (content, topic, book, document).

Relationships:
- `users 1 ──< user_vocabulary`
- `users 1 ──< user_interests`
- `users 1 ──< user_favorites`

---

## 6. Notifications & Devices

### 6.1 notifications

- Linked to `users` (FK `user_id`).
- Stores notification events and metadata.

### 6.2 device_tokens

- Linked to `users` (FK `user_id`).
- Stores push notification tokens per device.

Relationship:
- `users 1 ──< notifications`
- `users 1 ──< device_tokens`

---

## 7. Support Chat & External Services

### 7.1 support_chat tables

- Allow users to contact support; linked back to `users`.

### 7.2 external_services

- Tracks configuration and health for external integrations.

---

## 8. ASCII ERD Sketch

Simplified high-level view:

```text
users
  ├─< subscriptions
  ├─< conversations ──< messages
  ├─< content_history
  ├─< user_vocabulary
  ├─< user_interests
  ├─< user_favorites
  ├─< notifications
  └─< device_tokens

plans
  └─< subscriptions

books ──< book_chapters ──< chapter_audio

topics (per user)
```

For full column definitions and constraints, see `schema-overview.md`.

---

## Related Documentation

- [Database Schema Overview](./schema-overview.md)
- [System Overview](../architecture/system-overview.md)
- [AI Pipeline](../architecture/ai-pipeline.md)
