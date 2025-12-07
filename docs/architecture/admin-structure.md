# Admin Panel Structure

**Last Updated:** December 2025  
**Route Base:** `/admin`

## Overview

The Admin Panel provides system administrators with tools for user management, content moderation, subscription handling, and system monitoring.

## Route Structure

```
/admin
├── /login                  # Admin authentication
├── /dashboard              # Overview & statistics
├── /users                  # User management
│   ├── /                   # User list
│   ├── /[id]               # User detail
│   ├── /roles              # Role management
│   └── /create             # Create user
├── /content                # Content management
├── /packages               # Subscription plans
│   ├── /                   # Plan list
│   └── /create             # Create plan
├── /payment-providers      # Payment provider settings (iyzico, Stripe)
├── /card-transactions      # Credit card transaction management
├── /payments               # Payment history
├── /statistics             # Analytics dashboard
├── /external-services      # External service config
├── /tts-test               # TTS testing tool
└── /roles                  # Role definitions
```

## Admin Dashboard

### Key Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Total Users     │ Active Today    │ New This Week               │
│ 12,456          │ 1,234           │ 567                         │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │ Subscription Dist.  │  │ Content Generated Today         │  │
│  │ Free: 65%           │  │ TTS: 456                        │  │
│  │ Basic: 20%          │  │ AI Chat: 2,345                  │  │
│  │ Pro: 12%            │  │ Topics: 123                     │  │
│  │ Enterprise: 3%      │  │                                 │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Components

| Component | Data Source | Refresh |
|-----------|-------------|---------|
| User Count | `/api/admin/stats/users` | Real-time |
| Subscription Distribution | `/api/admin/stats/subscriptions` | Hourly |
| Content Metrics | `/api/admin/stats/content` | 5 min |
| Revenue | `/api/admin/stats/revenue` | Daily |

## User Management

### Features

1. **User List**
   - Search by name, email
   - Filter by role, subscription, status
   - Sort by registration date, activity
   - Pagination

2. **User Detail**
   - Profile information
   - Subscription history
   - Content history
   - Login history
   - Edit capabilities

3. **User Actions**
   - Change subscription plan
   - Reset password
   - Enable/disable MFA
   - Suspend/activate account
   - Delete account

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users (paginated) |
| GET | `/api/admin/users/:id` | Get user detail |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/users/:id/subscription` | Change subscription |
| POST | `/api/admin/users/:id/reset-password` | Send reset email |

## Content Management

### Content Types

| Type | Source | Moderation |
|------|--------|------------|
| TTS Content | User-generated | Auto + Manual |
| AI Chat | Liro conversations | Auto-flagged |
| Books | Gutenberg | Pre-approved |
| Topics | Generated | Auto-approved |

### Moderation Actions

- Flag content
- Remove content
- Warn user
- Ban user from content creation

## Subscription Plans

### Plan Management

```typescript
interface Plan {
  id: number;
  name: string;
  price: number;
  currency: string;
  dailyLimit: number;
  features: {
    ttsVoices: string[];
    bookAccess: boolean;
    aiChat: boolean;
    topicGeneration: boolean;
    priority: boolean;
  };
  googleProductId?: string;
  appleProductId?: string;
}
```

### Plan Editor Features

- Create/edit plans
- Set pricing
- Configure features
- Link to IAP products
- Activate/deactivate

## Payment Providers (`/admin/payment-providers`)

Manage credit card payment providers (iyzico, Stripe).

### Features

1. **Provider Configuration**
   - API Key / Secret Key management
   - Environment selection (Sandbox / Production)
   - Commission rate settings
   - Supported features toggle

2. **Connection Testing**
   - Test API connectivity
   - View test results and timestamps

3. **Provider Types**
   - **iyzico:** Turkish credit cards, installments, 3D Secure
   - **Stripe:** International cards, subscriptions, recurring

## Card Transactions (`/admin/card-transactions`)

View and manage all credit card payment transactions.

### Data Displayed

| Field | Description |
|-------|-------------|
| Date | Transaction timestamp |
| Customer | Email / User ID |
| Amount | Payment amount |
| Net Amount | After commission |
| Status | pending/completed/failed/refunded |
| Card | Last 4 digits, card type |
| Installment | Number of installments |
| Provider | iyzico / Stripe |

### Features

1. **Filtering**
   - By status (Completed, Pending, Failed, Refunded)
   - By date range
   - By provider

2. **Refund Processing**
   - Full refund
   - Partial refund
   - Refund reason tracking

3. **Export**
   - CSV export of transaction data

## Payment History (Legacy)

### Data Displayed

| Field | Description |
|-------|-------------|
| User | Customer name/email |
| Plan | Subscription plan |
| Amount | Payment amount |
| Provider | Apple/Google/Stripe/iyzico |
| Status | Success/Failed/Refunded |
| Date | Transaction timestamp |

### Filters

- Date range
- Provider
- Plan
- Status

## Statistics Dashboard

### Available Charts

1. **User Growth**
   - Daily/weekly/monthly registrations
   - Churn rate
   - Retention curve

2. **Content Usage**
   - TTS generations per day
   - AI chat messages
   - Book reads

3. **Revenue**
   - MRR (Monthly Recurring Revenue)
   - ARPU (Average Revenue Per User)
   - Subscription breakdown

4. **System Health**
   - API response times
   - Error rates
   - TTS success rate

## External Services

### Configurable Services

| Service | Configuration |
|---------|---------------|
| OpenAI | API key, model selection |
| Google TTS | Credentials, voice list |
| Azure TTS | Key, region, voices |
| AWS Polly | Access key, voices |
| Firebase | FCM configuration |
| Supabase | URL, keys |

### Health Monitoring

- Service status checks
- API quota monitoring
- Error rate alerts

## TTS Test Tool

### Features

- Text input for testing
- Voice selection (all providers)
- Speed/rate adjustment
- CEFR level testing
- Audio preview
- Debug output

## Access Control

### Role Hierarchy

```
Super Admin
    └── Admin
          └── Moderator
                └── Support
```

### Permissions Matrix

| Action | Super Admin | Admin | Moderator | Support |
|--------|-------------|-------|-----------|---------|
| View users | ✓ | ✓ | ✓ | ✓ |
| Edit users | ✓ | ✓ | ✓ | ✗ |
| Delete users | ✓ | ✓ | ✗ | ✗ |
| Manage plans | ✓ | ✓ | ✗ | ✗ |
| View payments | ✓ | ✓ | ✓ | ✗ |
| System config | ✓ | ✗ | ✗ | ✗ |

## Admin Components

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `AdminChatInterface` | `AdminChatInterface.tsx` | Support chat |
| `UserTable` | `admin/UserTable.tsx` | User listing |
| `PlanEditor` | `admin/PlanEditor.tsx` | Plan management |
| `StatsChart` | `admin/StatsChart.tsx` | Analytics display |

## Security

1. **Authentication:** Admin-specific login
2. **Session:** Short-lived tokens (1 hour)
3. **Audit Log:** All admin actions logged
4. **IP Whitelist:** Optional IP restriction
5. **2FA:** Mandatory for admin accounts

## Related Documentation

- [API Architecture](./api-architecture.md)
- [User Management API](../api/endpoints.md#admin)
- [System Overview](./system-overview.md)
