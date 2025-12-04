# API Error Codes Reference

**Last Updated:** December 2025

## Error Response Format

All API errors follow this standard format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {}  // Optional additional context
  }
}
```

## Authentication Errors (4xx)

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `AUTH_REQUIRED` | 401 | No authentication token provided | Include `Authorization: Bearer <token>` header |
| `AUTH_INVALID_TOKEN` | 401 | Token is malformed or expired | Refresh token or re-login |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token has expired | Use refresh token endpoint |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password | Check credentials |
| `AUTH_USER_NOT_FOUND` | 404 | User account does not exist | Register or check email |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email not verified | Complete email verification |
| `AUTH_MFA_REQUIRED` | 403 | MFA verification needed | Submit MFA code |
| `AUTH_MFA_INVALID_CODE` | 401 | Invalid MFA code | Try again with correct code |
| `AUTH_ACCOUNT_DISABLED` | 403 | Account suspended/disabled | Contact support |
| `AUTH_PASSWORD_WEAK` | 400 | Password doesn't meet requirements | Use stronger password |

## Authorization Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `FORBIDDEN` | 403 | Insufficient permissions | Check user role |
| `ADMIN_REQUIRED` | 403 | Admin access required | Login with admin account |
| `PLAN_REQUIRED` | 403 | Paid subscription required | Upgrade plan |
| `FEATURE_DISABLED` | 403 | Feature not available in current plan | Upgrade to higher plan |

## Validation Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `VALIDATION_ERROR` | 400 | Request data failed validation | Check error details for specific fields |
| `MISSING_REQUIRED_FIELD` | 400 | Required field not provided | Include all required fields |
| `INVALID_EMAIL_FORMAT` | 400 | Email format is invalid | Use valid email format |
| `INVALID_CEFR_LEVEL` | 400 | Invalid CEFR level | Use A1, A2, B1, B2, C1, or C2 |
| `INVALID_FILE_TYPE` | 400 | Unsupported file format | Use supported formats (PDF, DOCX, TXT) |
| `FILE_TOO_LARGE` | 400 | File exceeds size limit | Reduce file size (max 10MB) |
| `INVALID_URL` | 400 | URL format is invalid | Provide valid URL |
| `INVALID_YOUTUBE_URL` | 400 | Not a valid YouTube URL | Use youtube.com or youtu.be URL |

## Rate Limiting Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry after delay |
| `TTS_RATE_LIMIT` | 429 | TTS request limit reached | Wait 1 minute |
| `AI_RATE_LIMIT` | 429 | AI request limit reached | Wait and retry |

## Usage Limit Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `USAGE_LIMIT_EXCEEDED` | 403 | Daily usage limit reached | Wait for reset or upgrade plan |
| `MONTHLY_LIMIT_EXCEEDED` | 403 | Monthly usage limit reached | Upgrade plan |
| `CONTENT_LIMIT_EXCEEDED` | 403 | Content generation limit reached | Upgrade plan |

## Resource Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `NOT_FOUND` | 404 | Resource not found | Check resource ID |
| `USER_NOT_FOUND` | 404 | User does not exist | Verify user ID |
| `CONVERSATION_NOT_FOUND` | 404 | Conversation not found | Check conversation ID |
| `BOOK_NOT_FOUND` | 404 | Book not found | Check book ID |
| `CHAPTER_NOT_FOUND` | 404 | Chapter not found | Check chapter ID |
| `CONTENT_NOT_FOUND` | 404 | Content not found | Check content ID |
| `PLAN_NOT_FOUND` | 404 | Subscription plan not found | Check plan ID |

## Processing Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `TTS_GENERATION_FAILED` | 500 | TTS audio generation failed | Retry or try different voice |
| `CEFR_ADAPTATION_FAILED` | 500 | Text adaptation failed | Retry with shorter text |
| `TRANSLATION_FAILED` | 500 | Translation service failed | Retry |
| `CONTENT_EXTRACTION_FAILED` | 500 | Failed to extract content from source | Check URL/file validity |
| `YOUTUBE_TRANSCRIPT_UNAVAILABLE` | 400 | No transcript available for video | Try different video |
| `WEB_CONTENT_BLOCKED` | 400 | Website blocked content extraction | Try different URL |
| `AUDIO_MERGE_FAILED` | 500 | Failed to merge audio files | Retry |
| `STORAGE_UPLOAD_FAILED` | 500 | Failed to upload to storage | Retry |

## External Service Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `OPENAI_API_ERROR` | 502 | OpenAI service error | Retry or wait |
| `GOOGLE_TTS_ERROR` | 502 | Google TTS service error | Try different provider |
| `AZURE_TTS_ERROR` | 502 | Azure TTS service error | Try different provider |
| `SUPABASE_ERROR` | 502 | Database service error | Retry |
| `EXTERNAL_SERVICE_UNAVAILABLE` | 503 | External service temporarily unavailable | Retry later |

## Payment & Subscription Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `PAYMENT_FAILED` | 400 | Payment processing failed | Check payment method |
| `SUBSCRIPTION_ALREADY_EXISTS` | 400 | User already has active subscription | Cancel existing first |
| `SUBSCRIPTION_NOT_FOUND` | 404 | No active subscription | Subscribe to a plan |
| `IAP_VERIFICATION_FAILED` | 400 | In-app purchase verification failed | Contact support |
| `RECEIPT_ALREADY_USED` | 400 | Purchase receipt already processed | Check purchase history |
| `INVALID_RECEIPT` | 400 | Invalid purchase receipt | Contact app store support |

## Server Errors

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error | Retry or contact support |
| `DATABASE_ERROR` | 500 | Database operation failed | Retry |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Retry later |
| `TIMEOUT` | 504 | Request timed out | Retry with smaller input |

## Error Handling Examples

### Frontend Error Handling

```typescript
try {
  const response = await api.post('/tts/process-text', data);
  return response.data;
} catch (error) {
  if (error.response) {
    const { code, message } = error.response.data.error;
    
    switch (code) {
      case 'AUTH_TOKEN_EXPIRED':
        await refreshToken();
        return retry();
      case 'USAGE_LIMIT_EXCEEDED':
        showUpgradePrompt();
        break;
      case 'RATE_LIMIT_EXCEEDED':
        await delay(60000);
        return retry();
      default:
        showError(message);
    }
  }
}
```

### Backend Error Throwing

```javascript
// Custom error class
class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Usage
throw new AppError('USAGE_LIMIT_EXCEEDED', 'Daily limit reached', 403);
```

## Related Documentation

- [API Endpoints](./endpoints.md)
- [Request Examples](./request-examples.md)
- [API Architecture](../architecture/api-architecture.md)
