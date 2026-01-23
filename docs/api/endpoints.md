# API Endpoints Reference

**Last Updated:** December 2025  
**Base URL:** `http://localhost:5001/api` (dev) | `https://api.lingroot.com/api` (prod)

## Authentication

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "nativeLanguage": "tr",
  "targetLanguage": "en",
  "cefrLevel": "A2"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt_token"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (without MFA):**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt_token"
  }
}
```

**Response (with MFA):**
```json
{
  "success": true,
  "requiresMFA": true,
  "tempToken": "temporary_token"
}
```

### Verify MFA
```http
POST /auth/mfa/verify
Content-Type: application/json

{
  "tempToken": "temporary_token",
  "code": "123456"
}
```

### Google OAuth
```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "google_id_token"
}
```

### Password Reset
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "password": "newSecurePassword123"
}
```

---

## TTS Processing

### Process Text
```http
POST /tts/process-text
Authorization: Bearer <token>
Content-Type: application/json

{
  "input": "This is the text to process.",
  "level": "B1",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 1.0,
  "nativeLanguage": "tr",
  "generateBilingual": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mp3Url": "https://storage.supabase.co/.../audio.mp3",
    "vttUrl": "https://storage.supabase.co/.../subtitles.vtt",
    "adaptedText": "Processed text...",
    "bilingualText": "İşlenmiş metin... / Processed text...",
    "level": "B1",
    "wordCount": 150,
    "duration": 45
  }
}
```

### Process YouTube
```http
POST /tts/process-youtube
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "level": "A2",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 0.9
}
```

### Process Web Page
```http
POST /tts/process-web
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com/article",
  "level": "B1",
  "voice": "en-US-Wavenet-D"
}
```

### Process File
```http
POST /tts/process-file
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
level: B1
voice: en-US-Wavenet-D
```

### Get Available Voices
```http
GET /tts/voices
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "google": [
      {"id": "en-US-Wavenet-D", "name": "US English Male", "gender": "male"},
      {"id": "en-GB-Wavenet-A", "name": "UK English Female", "gender": "female"}
    ],
    "azure": [...],
    "polly": [...]
  }
}
```

### Get Content History
```http
GET /tts/history?page=1&limit=10
Authorization: Bearer <token>
```

---

## AI Chat (Liro)

### Get Conversations
```http
GET /ai-chat/conversations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Learning about food",
      "updatedAt": "2025-12-01T10:00:00Z",
      "messageCount": 5
    }
  ]
}
```

### Create Conversation
```http
POST /ai-chat/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Conversation"
}
```

### Send Message
```http
POST /ai-chat/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "uuid",
  "content": "Can you explain the present perfect tense?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "role": "assistant",
      "content": "The present perfect tense...",
      "createdAt": "2025-12-01T10:05:00Z"
    },
    "suggestedTopic": "Grammar: Present Perfect"
  }
}
```

### Delete Conversation
```http
DELETE /ai-chat/conversations/:id
Authorization: Bearer <token>
```

---

## Books

### List Books
```http
GET /books?page=1&limit=20&language=en&search=adventure
Authorization: Bearer <token>
```

### Get Book Details
```http
GET /books/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Pride and Prejudice",
    "authors": "Jane Austen",
    "language": "en",
    "chapters": [
      {"id": 1, "index": 1, "title": "Chapter 1"},
      {"id": 2, "index": 2, "title": "Chapter 2"}
    ]
  }
}
```

### Generate Chapter Audio
```http
POST /books/:bookId/chapters/:chapterId/audio
Authorization: Bearer <token>
Content-Type: application/json

{
  "level": "B1",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 1.0
}
```

---

## Topic Hierarchy

### Get Topic Tree
```http
GET /topic-hierarchy?level=A2&language=en
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Daily Life",
      "children": [
        {"id": "uuid", "title": "Food & Cooking"},
        {"id": "uuid", "title": "Shopping"}
      ]
    }
  ]
}
```

### Generate Content from Topic
```http
POST /topic-pipeline/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topicId": "uuid",
  "level": "A2",
  "generateBilingual": true
}
```

---

## Vocabulary

### Get User Vocabulary
```http
GET /vocabulary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "word": "serendipity",
      "definition": "The occurrence and development of events by chance in a happy or beneficial way",
      "level": "C2",
      "is_learned": false
    }
  ]
}
```

### Add Word (Manual)
```http
POST /vocabulary/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "word": "ephemeral",
  "definition": "Lasting for a very short time",
  "sentence": "Fashions are ephemeral, changing with every season.",
  "level": "C1"
}
```

### Add Word (Auto-Translation)
```http
POST /vocabulary/add-with-translation
Authorization: Bearer <token>
Content-Type: application/json

{
  "word": "resilience",
  "context": "She showed great resilience in the face of adversity.",
  "level": "B2"
}
```

### Update Word
```http
PUT /vocabulary/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Review next week",
  "is_learned": true
}
```

### Delete Word
```http
DELETE /vocabulary/:id
Authorization: Bearer <token>
```

---

## Favorites

### Get Favorites
```http
GET /favorites
Authorization: Bearer <token>
```

### Toggle Favorite
```http
POST /favorites/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "itemType": "content_item",
  "itemId": "uuid"
}
```

---

## Learning Tools

### Get Topic Suggestions
```http
POST /topic-suggestions
Content-Type: application/json

{
  "userInterests": ["technology", "travel"],
  "level": "B1"
}
```

### Find Patterns in Text
```http
POST /patterns/find
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "I have been waiting for two hours.",
  "level": "B1"
}
```

### Get Patterns by Level
```http
GET /patterns/level/:level
Authorization: Bearer <token>
```

### Get Pattern History
```http
GET /patterns/history
Authorization: Bearer <token>
```

---

## Subscriptions

### Get Plans
```http
GET /subscriptions/plans
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Free",
      "price": 0,
      "dailyLimit": 3,
      "features": ["basic_voices", "text_input"]
    },
    {
      "id": 2,
      "name": "Pro",
      "price": 99.99,
      "dailyLimit": 50,
      "features": ["all_voices", "youtube", "books", "ai_chat"]
    }
  ]
}
```

### Get Current Subscription
```http
GET /subscriptions/current
Authorization: Bearer <token>
```

### Subscribe to Plan
```http
POST /subscriptions/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": 2,
  "paymentMethod": "stripe",
  "paymentToken": "tok_xxx"
}
```

---

## User Profile

### Get Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "cefrLevel": "B1",
  "nativeLanguage": "tr",
  "targetLanguage": "en"
}
```

### Get Usage Statistics
```http
GET /stats/usage
Authorization: Bearer <token>
```

---

## Credit Card Payments (iyzico)

### Initialize 3D Secure Checkout
```http
POST /api/iyzico/checkout/init
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "uuid",
  "cardHolderName": "JOHN DOE",
  "cardNumber": "5528790000000008",
  "expireMonth": "12",
  "expireYear": "30",
  "cvc": "123",
  "installment": 1
}
```

**Response:**
```json
{
  "success": true,
  "threeDSHtmlContent": "<html>...",
  "transactionId": "uuid"
}
```

### 3D Secure Callback
```http
POST /api/iyzico/callback
Content-Type: application/x-www-form-urlencoded
```

### Check BIN Number
```http
POST /api/iyzico/check-bin
Authorization: Bearer <token>
Content-Type: application/json

{
  "binNumber": "552879"
}
```

### Get Installment Options
```http
POST /api/iyzico/installments
Authorization: Bearer <token>
Content-Type: application/json

{
  "binNumber": "552879",
  "price": 99.99
}
```

---

## Credit Card Payments (Stripe)

### Create Checkout Session
```http
POST /api/stripe/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "uuid",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_xxx",
  "sessionUrl": "https://checkout.stripe.com/..."
}
```

### Create Payment Intent
```http
POST /api/stripe/payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "uuid"
}
```

### Get Payment Status
```http
GET /api/stripe/payment-status/:paymentIntentId
Authorization: Bearer <token>
```

### Stripe Webhook
```http
POST /api/stripe/webhook
Stripe-Signature: <signature>
Content-Type: application/json
```

---

## Admin Endpoints

### List Users
```http
GET /admin/users?page=1&limit=50&role=user&search=john
Authorization: Bearer <admin_token>
```

### Get System Stats
```http
GET /admin/stats
Authorization: Bearer <admin_token>
```

### Update User Subscription
```http
POST /admin/users/:id/subscription
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "planId": 3,
  "reason": "Customer support upgrade"
}
```

### System & Queue Metrics

#### Queue Dashboard (Bull Board)
```http
GET /admin/queues
Authorization: Bearer <admin_token>
```
Redirects to the Bull Board UI.

#### Health Check
```http
GET /admin/metrics/health
Authorization: Bearer <admin_token>
```
**Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-15T22:00:00Z",
  "uptime": 1234.5,
  "redis": {
    "available": true,
    "url": "redis://***:6379"
  }
}
```

#### Queue Statistics
```http
GET /admin/metrics/queues
Authorization: Bearer <admin_token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "tts-processing": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 0
    }
  }
}
```

#### All Metrics
```http
GET /admin/metrics/all
Authorization: Bearer <admin_token>
```

### Payment Provider Management

#### List Payment Providers
```http
GET /api/iyzico/admin/providers
Authorization: Bearer <admin_token>
```

#### Create/Update Payment Provider
```http
POST /api/iyzico/admin/providers
PUT /api/iyzico/admin/providers/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "iyzico",
  "displayName": "iyzico",
  "isActive": true,
  "isDefault": true,
  "environment": "sandbox",
  "apiKey": "sandbox-xxx",
  "secretKey": "sandbox-xxx"
}
```

#### Test Provider Connection
```http
POST /api/iyzico/admin/providers/:id/test
POST /api/stripe/admin/test-connection
Authorization: Bearer <admin_token>
```

### Card Transaction Management

#### List Transactions
```http
GET /api/iyzico/admin/transactions?page=1&limit=20&status=completed
Authorization: Bearer <admin_token>
```

#### Get Transaction Summary
```http
GET /api/iyzico/admin/transactions/summary
Authorization: Bearer <admin_token>
```

#### Process Refund
```http
POST /api/iyzico/admin/refund
POST /api/stripe/admin/refund
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "transactionId": "uuid",
  "amount": 50.00,
  "reason": "Customer request"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `AUTH_INVALID_TOKEN` | 401 | Invalid or expired token |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `MFA_REQUIRED` | 403 | MFA verification needed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `USAGE_LIMIT_EXCEEDED` | 403 | Daily limit reached |
| `INTERNAL_ERROR` | 500 | Server error |

## Related Documentation

- [API Architecture](../architecture/api-architecture.md)
- [Error Codes](./errors.md)
- [Request Examples](./request-examples.md)
