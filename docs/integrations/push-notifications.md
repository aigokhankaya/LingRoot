# Push Notifications Integration

**Last Updated:** December 2025  
**Platforms:** iOS (APNs), Android (FCM)

This document describes how LingRoot handles push notifications for mobile apps.

---

## 1. Overview

Push notifications are used to:

- Remind users to continue learning (daily reminders)
- Notify about new content matching their interests
- Alert subscription status changes
- Deliver system announcements

---

## 2. Architecture

### 2.1 Components

```
Mobile App
    ↓ (register token)
Backend API (/api/notifications/register)
    ↓ (store)
Supabase (device_tokens table)
    ↓ (send via)
Firebase Cloud Messaging (FCM) → Android
Apple Push Notification Service (APNs) → iOS
```

### 2.2 Database Schema

**Table: `device_tokens`**

```sql
CREATE TABLE device_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'ios' | 'android'
    device_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);
```

**Table: `notifications`**

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Mobile Implementation

### 3.1 iOS (APNs)

**File:** `LingRootMobile/src/services/notificationService.ios.ts`

Responsibilities:
- Request notification permissions
- Register for remote notifications
- Handle foreground/background notifications
- Process notification taps

Key functions:
- `requestPermissions()` – Request user permission
- `registerForPushNotifications()` – Get APNs token
- `onNotificationReceived(handler)` – Handle incoming notifications
- `onNotificationOpened(handler)` – Handle notification taps

### 3.2 Android (FCM)

**File:** `LingRootMobile/src/services/notificationService.android.ts`

Responsibilities:
- Similar to iOS but uses FCM
- Handle notification channels (Android 8+)
- Process data-only messages

Key functions:
- Same interface as iOS for consistency
- Additional: `createNotificationChannel(channelId, options)`

### 3.3 Common Interface

**File:** `LingRootMobile/src/services/notificationService.ts`

Exports a unified interface that delegates to platform-specific implementations:

```typescript
export interface NotificationService {
  requestPermissions(): Promise<boolean>;
  registerForPushNotifications(): Promise<string | null>;
  onNotificationReceived(handler: NotificationHandler): void;
  onNotificationOpened(handler: NotificationHandler): void;
  getInitialNotification(): Promise<Notification | null>;
}
```

---

## 4. Backend Implementation

### 4.1 Token Registration

**Endpoint:** `POST /api/notifications/register`

```json
{
  "token": "ExponentPushToken[abc123...]",
  "platform": "ios",
  "deviceName": "iPhone 15 Pro"
}
```

### 4.2 Sending Notifications

**Service:** `backend/services/notificationService.js`

Key functions:
- `sendToUser(userId, notification)` – Send to all user devices
- `sendToToken(token, notification)` – Send to specific device
- `sendBulk(userIds, notification)` – Batch send
- `scheduleReminder(userId, time, notification)` – Schedule future send

### 4.3 Reminder System

**Service:** `backend/services/reminderService.js`

Coordinates with:
- `reminderSettingsService.ts` (mobile)
- User preferences stored in Supabase

Reminder types:
- Daily study reminder
- Weekly progress summary
- Streak maintenance alerts

---

## 5. Configuration

### 5.1 Environment Variables

**Backend:**
```env
# Firebase (for Android)
FIREBASE_PROJECT_ID=lingroot-xxxxx
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...

# Apple (for iOS)
APNS_KEY_ID=ABC123
APNS_TEAM_ID=XYZ789
APNS_KEY_PATH=./keys/AuthKey_ABC123.p8
APNS_BUNDLE_ID=com.lingroot.app
```

### 5.2 Firebase Setup

1. Create Firebase project
2. Add Android app with package name
3. Download `google-services.json` → `LingRootMobile/android/app/`
4. Generate service account key for backend

### 5.3 APNs Setup

1. Create APNs key in Apple Developer portal
2. Download `.p8` key file
3. Note Key ID and Team ID
4. Configure backend with key path

---

## 6. Notification Types

### 6.1 Transactional

- Subscription confirmed/expired
- Password reset
- Account security alerts

### 6.2 Engagement

- Daily reminder: "Time to practice! 🎧"
- New content: "New topics matching your interests"
- Streak: "Keep your 7-day streak going!"

### 6.3 Marketing (Optional)

- Feature announcements
- Promotional offers

---

## 7. Best Practices

### 7.1 User Experience

- Always request permission at appropriate time (not on first launch)
- Provide clear value proposition before asking
- Allow granular control in settings
- Respect quiet hours

### 7.2 Technical

- Handle token refresh gracefully
- Remove invalid tokens from database
- Use exponential backoff for retries
- Log delivery status for debugging

### 7.3 Privacy

- Never include sensitive data in notification payload
- Use data-only messages for sensitive updates
- Comply with platform guidelines

---

## 8. Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `InvalidToken` | Token expired or invalid | Remove from DB, prompt re-registration |
| `NotRegistered` | App uninstalled | Remove token from DB |
| `MessageTooBig` | Payload > 4KB | Reduce payload size |
| `RateLimitExceeded` | Too many requests | Implement backoff |

---

## 9. Related Documentation

- [Mobile Architecture](../architecture/mobile-structure.md)
- [Database Schema](../database/schema-overview.md)
- [Supabase Integration](./supabase.md)
