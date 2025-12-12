# API Services (Backend)

**Last Updated:** December 2025  
**Location:** `/backend`

## Overview

The backend API is built with Express.js, providing RESTful endpoints for all LingRoot functionality including TTS processing, AI chat, user management, and subscription handling.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express.js | 4.18.2 | Web framework |
| PostgreSQL | - | Database (via Supabase) |
| OpenAI | 4.52.7 | AI/LLM |
| Socket.io | 4.8.1 | Real-time |
| JWT | 9.0.2 | Authentication |
| Winston | 3.12.0 | Logging |

## Directory Structure

```
backend/
├── server.js               # Entry point (10KB)
├── config/
│   └── database.js         # DB configuration
├── controllers/            # 31 controllers
│   ├── authController.js          # (53KB) Auth operations
│   ├── ttsController.js           # (109KB) TTS processing
│   ├── aiChatController.js        # (28KB) Liro assistant
│   ├── adminController.js         # (53KB) Admin operations
│   ├── subscriptionController.js  # (31KB) Subscriptions
│   ├── iyzicoController.js        # (15KB) iyzico payments
│   ├── stripeController.js        # (12KB) Stripe payments
│   ├── chatController.js          # (20KB) Support chat
│   ├── topicHierarchyController.js # (21KB) Topics
│   └── ... (22 more)
├── routes/                 # 33 route modules
│   ├── authRoutes.js
│   ├── ttsRoutes.js
│   ├── aiChat.js
│   ├── iyzicoRoutes.js
│   ├── stripeRoutes.js
│   └── ... (28 more)
├── middleware/             # 8 middleware modules
│   ├── auth.js
│   ├── errorHandler.js
│   ├── security.js
│   └── ...
├── utils/                  # 45 utility modules
│   ├── openaiClient.js
│   ├── googleTTS.js
│   ├── azureTTS.js
│   ├── amazonPolly.js
│   └── ...
├── prompts/                # 49 AI prompts
├── migrations/             # 54 SQL migrations
├── models/                 # Data models
├── scripts/                # Utility scripts
└── docs/                   # Backend docs
```

## Controllers

### Auth Controller (`controllers/authController.js`)

**Size:** 53KB | **Endpoints:** 15+

| Function | Endpoint | Description |
|----------|----------|-------------|
| `register` | POST /auth/register | User registration |
| `login` | POST /auth/login | User login |
| `logout` | POST /auth/logout | User logout |
| `verifyEmail` | POST /auth/verify-email | Email verification |
| `forgotPassword` | POST /auth/forgot-password | Password reset request |
| `resetPassword` | POST /auth/reset-password | Password reset |
| `enableMFA` | POST /auth/mfa/enable | Enable 2FA |
| `verifyMFA` | POST /auth/mfa/verify | Verify 2FA code |
| `googleAuth` | POST /auth/google | Google OAuth |
| `appleAuth` | POST /auth/apple | Apple Sign-In |
| `facebookAuth` | POST /auth/facebook | Facebook OAuth |

### TTS Controller (`controllers/ttsController.js`)

**Size:** 109KB (largest controller) | **Endpoints:** 10+

| Function | Endpoint | Description |
|----------|----------|-------------|
| `processText` | POST /tts/process-text | Process text input |
| `processYoutube` | POST /tts/process-youtube | Process YouTube |
| `processWeb` | POST /tts/process-web | Process web URL |
| `processFile` | POST /tts/process-file | Process file upload |
| `processBook` | POST /tts/process-book | Process book chapter |
| `getVoices` | GET /tts/voices | List available voices |
| `getHistory` | GET /tts/history | User content history |
| `regenerateAudio` | POST /tts/regenerate | Regenerate audio |

**Processing Flow:**
```
Input → Extract → Translate → CEFR Adapt → Clean → TTS → Merge → Upload → Response
```

### AI Chat Controller (`controllers/aiChatController.js`)

**Size:** 28KB | **Endpoints:** 5+

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getConversations` | GET /ai-chat/conversations | List user chats |
| `createConversation` | POST /ai-chat/conversations | Start new chat |
| `sendMessage` | POST /ai-chat/send | Send message to Liro |
| `deleteConversation` | DELETE /ai-chat/conversations/:id | Delete chat |
| `getTTSForMessage` | POST /ai-chat/tts | Generate audio for message |

### Admin Controller (`controllers/adminController.js`)

**Size:** 53KB | **Endpoints:** 20+

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getUsers` | GET /admin/users | List all users |
| `getUserById` | GET /admin/users/:id | Get user detail |
| `updateUser` | PUT /admin/users/:id | Update user |
| `deleteUser` | DELETE /admin/users/:id | Delete user |
| `getStats` | GET /admin/stats | System statistics |
| `getPlans` | GET /admin/plans | List plans |
| `updatePlan` | PUT /admin/plans/:id | Update plan |
| `getPayments` | GET /admin/payments | Payment history |

### Subscription Controller (`controllers/subscriptionController.js`)

**Size:** 31KB | **Endpoints:** 10+

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getPlans` | GET /subscriptions/plans | Available plans |
| `getCurrentPlan` | GET /subscriptions/current | User's plan |
| `subscribe` | POST /subscriptions/subscribe | Subscribe to plan |
| `cancelSubscription` | POST /subscriptions/cancel | Cancel subscription |
| `verifyApplePurchase` | POST /iap/verify-apple | Verify Apple receipt |
| `verifyGooglePurchase` | POST /iap/verify-google | Verify Google purchase |

## Utilities

### TTS Services

| Utility | Size | Provider |
|---------|------|----------|
| `googleTTS.js` | 23KB | Google Cloud TTS |
| `azureTTS.js` | 13KB | Azure Cognitive Services |
| `amazonPolly.js` | 11KB | AWS Polly |

### AI Utilities

| Utility | Size | Purpose |
|---------|------|---------|
| `openaiClient.js` | 9KB | OpenAI API wrapper |
| `cefrAdapter.js` | 6KB | CEFR level adaptation |
| `translateAndAdapt.js` | 18KB | Translation + adaptation |
| `liroPromptGenerator.js` | 16KB | Liro system prompts |

### Content Processing

| Utility | Size | Purpose |
|---------|------|---------|
| `inputExtractor.js` | 19KB | Multi-source extraction |
| `textProcessor.js` | 15KB | Text cleaning/chunking |
| `audioMerger.js` | 10KB | FFmpeg audio merging |
| `bookTextExtractor.js` | 7KB | Book content extraction |

### Storage & Upload

| Utility | Size | Purpose |
|---------|------|---------|
| `storageUploader.js` | 5KB | Supabase storage upload |
| `supabaseClient.js` | 2KB | Supabase client |

## Middleware

### Authentication (`middleware/auth.js`)

```javascript
// Token verification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin check
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

### Security (`middleware/security.js`)

```javascript
const configureSecurity = (app) => {
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp());
};
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests'
});

const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'TTS rate limit exceeded'
});
```

## Database Queries

### Using Supabase Client

```javascript
const { supabase } = require('../utils/supabaseClient');

// Select
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Insert
const { data, error } = await supabase
  .from('conversations')
  .insert({ user_id: userId, title: 'New Chat' })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('users')
  .update({ last_login: new Date() })
  .eq('id', userId);

// Delete
const { error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', conversationId);
```

## Error Handling

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    requestId: req.requestId
  });
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An error occurred'
    }
  });
};
```

## Logging

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

## Related Documentation

- [API Architecture](../architecture/api-architecture.md)
- [Endpoints Reference](../api/endpoints.md)
- [Database Schema](../database/schema-overview.md)
