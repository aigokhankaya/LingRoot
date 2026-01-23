# @lingroot/api-client

Shared API client for LingRoot Web and Mobile applications.

> **Oluşturulma:** 2026-01-16 | **Güncelleme:** 2026-01-16 | **Versiyon:** 1.0

## Features

- 🔐 **Automatic Token Management** - Handles JWT refresh automatically
- 📱 **Cross-Platform** - Works with React (Web) and React Native (Mobile)
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🔧 **Configurable** - Flexible configuration for different environments
- 📦 **Modular** - Organized by API domain (auth, tts, content, subscription)

## Installation

```bash
# Install the package
npm install @lingroot/api-client

# Install peer dependency
npm install axios
```

## Usage

### Web (Next.js / React)

```typescript
import axios from 'axios';
import { createApiClient, setAxios } from '@lingroot/api-client';

// Initialize axios (required once)
setAxios(axios);

// Create client
const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  getToken: () => localStorage.getItem('lingroot_token'),
  setToken: (token) => localStorage.setItem('lingroot_token', token),
  getRefreshToken: () => localStorage.getItem('lingroot_refresh_token'),
  setRefreshToken: (token) => localStorage.setItem('lingroot_refresh_token', token),
  clearTokens: () => {
    localStorage.removeItem('lingroot_token');
    localStorage.removeItem('lingroot_refresh_token');
  },
  onUnauthorized: () => {
    window.location.href = '/login';
  },
  debug: process.env.NODE_ENV === 'development',
});

export default apiClient;
```

### Mobile (React Native)

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient, setAxios } from '@lingroot/api-client';
import { getApiBaseUrl } from './environmentConfig';

// Initialize axios
setAxios(axios);

// Create client with async storage
const apiClient = createApiClient({
  baseUrl: await getApiBaseUrl(),
  getToken: () => AsyncStorage.getItem('auth_token'),
  setToken: (token) => AsyncStorage.setItem('auth_token', token),
  getRefreshToken: () => AsyncStorage.getItem('refresh_token'),
  setRefreshToken: (token) => AsyncStorage.setItem('refresh_token', token),
  clearTokens: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
  },
  onUnauthorized: () => {
    // Navigate to login screen
    navigationRef.current?.navigate('Login');
  },
});

export default apiClient;
```

## API Modules

### Auth

```typescript
// Login
const result = await apiClient.auth.login({
  email: 'user@example.com',
  password: 'password123',
});

// Register
await apiClient.auth.register({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '+905551234567',
  password: 'securePassword',
});

// Get current user
const user = await apiClient.auth.getCurrentUser();

// OAuth
await apiClient.auth.googleAuth(idToken);
await apiClient.auth.appleAuth(identityToken, { firstName, lastName });
```

### TTS (Text-to-Speech)

```typescript
// Process text to speech
const audio = await apiClient.tts.process({
  type: 'text',
  input: 'Hello world',
  level: 'A1',
  voice: 'emma',
});

// Async processing with job queue
const job = await apiClient.tts.processAsync({
  type: 'topic',
  input: 'Climate Change',
  level: 'B1',
});

// Check job status
const status = await apiClient.tts.getJobStatus(job.jobId);

// List voices
const voices = await apiClient.tts.listVoices('en-US');
const filtered = await apiClient.tts.getFilteredVoices({ gender: 'female', accent: 'british' });

// Create podcast
const podcast = await apiClient.tts.createPodcast({
  topic: 'Artificial Intelligence',
  level: 'B2',
  duration: 5,
  ttsProvider: 'google',
});
```

### Content

```typescript
// Get history
const history = await apiClient.content.getHistory(1, 20);

// Submit new content
await apiClient.content.submit({
  input: 'Original text',
  inputType: 'text',
  level: 'A2',
  mp3Url: 'https://...',
  translatedText: '...',
  adaptedText: '...',
});

// Update progress
await apiClient.content.updateProgress(contentId, 120, 300);

// Quiz
const quiz = await apiClient.content.generateQuiz(contentId);
const result = await apiClient.content.submitQuiz(contentId, answers);
```

### Subscription

```typescript
// Get plans
const plans = await apiClient.subscription.getPlans();

// Current subscription
const subscription = await apiClient.subscription.getCurrentSubscription();

// Usage summary
const usage = await apiClient.subscription.getUsageSummary();

// IAP verification
await apiClient.subscription.verifyApplePurchase(receiptData, productId);
await apiClient.subscription.verifyGooglePurchase(purchaseToken, productId);
```

## Types

All types are exported from the main module:

```typescript
import type {
  User,
  LoginRequest,
  LoginResponse,
  TTSRequest,
  TTSResponse,
  Voice,
  CEFRLevel,
  ContentHistoryItem,
  SubscriptionPlan,
  UsageSummary,
  ApiError,
} from '@lingroot/api-client';
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseUrl` | string | Yes | Base URL for the API |
| `mfaBaseUrl` | string | No | Separate URL for MFA operations |
| `timeout` | number | No | Request timeout (default: 180000ms) |
| `getToken` | function | Yes | Function to get current access token |
| `setToken` | function | Yes | Function to store access token |
| `getRefreshToken` | function | Yes | Function to get refresh token |
| `setRefreshToken` | function | Yes | Function to store refresh token |
| `clearTokens` | function | Yes | Function to clear all tokens |
| `onUnauthorized` | function | No | Callback when token is invalid |
| `debug` | boolean | No | Enable debug logging |

## License

MIT © LingRoot Team
