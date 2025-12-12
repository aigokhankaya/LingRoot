# API Request Examples

**Last Updated:** December 2025  
**Scope:** Common request/response samples for key LingRoot API endpoints.

This document complements `endpoints.md` by providing concrete HTTP and JSON examples.

---

## 1. Authentication

### 1.1 Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Doe",
  "nativeLanguage": "tr",
  "targetLanguage": "en",
  "cefrLevel": "A2"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "2f3b9a3f-...",
      "email": "user@example.com",
      "name": "Jane Doe",
      "cefrLevel": "A2"
    },
    "token": "<JWT_TOKEN>"
  }
}
```

**Validation Error (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters."
  }
}
```

---

### 1.2 Login (with optional MFA)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success (no MFA enabled):**

```json
{
  "success": true,
  "data": {
    "user": { "id": "2f3b9a3f-...", "email": "user@example.com" },
    "token": "<JWT_TOKEN>"
  }
}
```

**MFA Required:**

```json
{
  "success": true,
  "requiresMFA": true,
  "tempToken": "<TEMP_TOKEN>"
}
```

---

### 1.3 Verify MFA

```http
POST /api/auth/mfa/verify
Content-Type: application/json

{
  "tempToken": "<TEMP_TOKEN>",
  "code": "123456"
}
```

**Success:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "2f3b9a3f-...", "email": "user@example.com" },
    "token": "<JWT_TOKEN>"
  }
}
```

---

## 2. TTS Processing

### 2.1 Process Text

```http
POST /api/tts/process-text
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "input": "Today I learned about photosynthesis.",
  "level": "B1",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 1.05,
  "nativeLanguage": "tr",
  "generateBilingual": true
}
```

**Success:**

```json
{
  "success": true,
  "data": {
    "mp3Url": "https://.../audio/123.mp3",
    "vttUrl": "https://.../subtitles/123.vtt",
    "adaptedText": "Today I learned about plants and how they make food.",
    "bilingualText": "Bugün bitkilerin nasıl yemek yaptığını öğrendim. / Today I learned about plants and how they make food.",
    "level": "B1",
    "wordCount": 42,
    "duration": 28
  }
}
```

---

### 2.2 Process YouTube

```http
POST /api/tts/process-youtube
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "level": "A2",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 0.95
}
```

---

## 3. AI Chat (Liro)

### 3.1 Create Conversation

```http
POST /api/ai-chat/conversations
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Daily routines"
}
```

### 3.2 Send Message

```http
POST /api/ai-chat/send
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "conversationId": "2f3b9a3f-...",
  "content": "Can you give me simple A2 sentences about daily routines?"
}
```

**Success:**

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_123",
      "role": "assistant",
      "content": "I wake up at seven. I eat breakfast.",
      "createdAt": "2025-12-04T10:00:00.000Z"
    },
    "suggestedTopic": "Daily routines"
  }
}
```

---

## 4. Books

### 4.1 List Books

```http
GET /api/books?page=1&limit=10&language=en
Authorization: Bearer <JWT_TOKEN>
```

### 4.2 Generate Chapter Audio

```http
POST /api/books/123/chapters/1/audio
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "level": "B1",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 1.0
}
```

---

## 5. Vocabulary

### 5.1 Get User Vocabulary

```http
GET /api/vocabulary
Authorization: Bearer <JWT_TOKEN>
```

### 5.2 Add Word Manually

```http
POST /api/vocabulary/add
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "word": "curious",
  "definition": "Wanting to know or learn something",
  "sentence": "The child was curious about everything.",
  "level": "B1"
}
```

### 5.3 Add Word with Translation

```http
POST /api/vocabulary/add-with-translation
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "word": "resilient",
  "context": "She is very resilient after setbacks.",
  "level": "B2"
}
```

---

## 6. Favorites

### 6.1 Toggle Favorite

```http
POST /api/favorites/toggle
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "itemType": "content_item",
  "itemId": "content_123"
}
```

### 6.2 Get Favorites

```http
GET /api/favorites
Authorization: Bearer <JWT_TOKEN>
```

---

## 7. Patterns & Topic Suggestions

### 7.1 Find Patterns in Text

```http
POST /api/patterns/find
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "text": "I have been studying English for three years.",
  "level": "B1"
}
```

### 7.2 Get Topic Suggestions

```http
POST /api/topic-suggestions
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "userInterests": ["travel", "technology"],
  "level": "B1"
}
```

---

## 8. Subscriptions

### 8.1 Subscribe to Plan

```http
POST /api/subscriptions/subscribe
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "planId": 2,
  "paymentMethod": "stripe",
  "paymentToken": "tok_123"
}
```

---

## 9. User Profile

### 9.1 Get Profile

```http
GET /api/users/profile
Authorization: Bearer <JWT_TOKEN>
```

### 9.2 Update Profile

```http
PUT /api/users/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Jane Doe",
  "cefrLevel": "B1",
  "nativeLanguage": "tr",
  "targetLanguage": "en"
}
```

---

## Related Documentation

- [API Endpoints](./endpoints.md)
- [Error Codes](./errors.md)
