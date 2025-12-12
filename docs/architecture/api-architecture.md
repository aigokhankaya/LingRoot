# API Architecture

**Last Updated:** December 2025  
**Base URL:** `http://localhost:5001` (development) | `https://api.lingroot.com` (production)

## Overview

The LingRoot API is a RESTful service built with Express.js, providing endpoints for content processing, user management, AI chat, and subscription handling.

## Route Structure

```
/api
├── /auth                    # Authentication & authorization
├── /users                   # User management
├── /tts                     # Text-to-speech processing
├── /chat                    # Support chat (admin-user)
├── /ai-chat                 # AI assistant (Liro)
├── /books                   # Book library
├── /topic-hierarchy         # Topic content tree
├── /topic-pipeline          # Automated content generation
├── /subscriptions           # Subscription management
├── /iap                     # In-app purchase verification
├── /iyzico                  # iyzico credit card payments
├── /stripe                  # Stripe credit card payments
├── /admin                   # Admin operations
├── /vocabulary              # User vocabulary
├── /favorites               # User favorites
├── /documents               # Document processing
├── /config                  # System configuration
└── /stats                   # Usage statistics
```

## Controllers (31 Total)

| Controller | Endpoints | Responsibility |
|------------|-----------|----------------|
| `authController.js` | 15+ | Login, register, MFA, password reset, OAuth |
| `ttsController.js` | 10+ | TTS processing, voice selection, audio generation |
| `aiChatController.js` | 5+ | Liro AI assistant conversations |
| `chatController.js` | 8+ | Admin-user support chat |
| `adminController.js` | 20+ | User/content/plan management |
| `subscriptionController.js` | 10+ | Plan subscriptions, billing |
| `iapController.js` | 5+ | Apple/Google IAP verification |
| `iyzicoController.js` | 10+ | iyzico 3D Secure payments, installments, refunds |
| `stripeController.js` | 8+ | Stripe checkout, payment intents, refunds |
| `topicHierarchyController.js` | 8+ | Topic tree management |
| `topicPipelineController.js` | 5+ | Content pipeline execution |
| `contentController.js` | 8+ | Content history, management |
| `documentController.js` | 5+ | PDF/document processing |

## Authentication

### JWT Token Structure

```javascript
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user|admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authentication Middleware

```javascript
// middleware/auth.js
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

### Role-Based Access

```javascript
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

## Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests'
});

// Endpoint-specific limits
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'TTS rate limit exceeded'
});
```

## Request/Response Format

### Standard Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <uuid>
```

### Standard Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Key Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh-token` | Refresh JWT |
| POST | `/api/auth/verify-mfa` | MFA verification |
| POST | `/api/auth/forgot-password` | Password reset |
| POST | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/apple` | Apple Sign-In |

### TTS Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tts/process-text` | Process text input |
| POST | `/api/tts/process-youtube` | Process YouTube URL |
| POST | `/api/tts/process-web` | Process web page |
| POST | `/api/tts/process-file` | Process uploaded file |
| GET | `/api/tts/voices` | Get available voices |
| GET | `/api/tts/history` | Get processing history |

### AI Chat (Liro)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai-chat/conversations` | List conversations |
| POST | `/api/ai-chat/conversations` | Create conversation |
| POST | `/api/ai-chat/send` | Send message |
| DELETE | `/api/ai-chat/conversations/:id` | Delete conversation |

### Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books` | List books |
| GET | `/api/books/:id` | Get book details |
| GET | `/api/books/:id/chapters` | Get chapters |
| POST | `/api/books/:id/chapters/:chapterId/audio` | Generate chapter audio |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/plans` | List plans |
| GET | `/api/subscriptions/current` | Current subscription |
| POST | `/api/subscriptions/subscribe` | Subscribe to plan |
| POST | `/api/iap/verify-apple` | Verify Apple receipt |
| POST | `/api/iap/verify-google` | Verify Google purchase |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT expired |
| `AUTH_MFA_REQUIRED` | 403 | MFA verification needed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `USAGE_LIMIT_EXCEEDED` | 403 | Daily limit reached |
| `TTS_GENERATION_FAILED` | 500 | TTS service error |
| `OPENAI_API_ERROR` | 502 | OpenAI service error |
| `VALIDATION_ERROR` | 400 | Invalid input data |

## Middleware Stack

```javascript
// Execution order
app.use(express.json({ limit: '10mb' }));
app.use(configureSecurity);      // Helmet, XSS, HPP
app.use(requestIdMiddleware);    // Request tracking
app.use(cors(corsOptions));      // CORS handling
app.use(requestLogger);          // Logging
app.use('/api', rateLimiter);    // Rate limiting
app.use('/api', routes);         // Route handlers
app.use(notFound);               // 404 handler
app.use(errorHandler);           // Error handler
```

## WebSocket Support

```javascript
// Socket.io for real-time features
const { initSocket } = require('./utils/socketManager');

const server = http.createServer(app);
initSocket(server);

// Events
socket.on('typing', (data) => { ... });
socket.on('message:read', (data) => { ... });
socket.on('notification', (data) => { ... });
```

## API Versioning

Currently v1 (implicit). Future versions will use:
```
/api/v2/...
```

## Related Documentation

- [Endpoints Reference](../api/endpoints.md)
- [Error Codes](../api/errors.md)
- [Request Examples](../api/request-examples.md)
