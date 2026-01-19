# Database Schema Overview

**Last Updated:** January 2026  
**Database:** PostgreSQL (Supabase)  
**Migrations:** 84 files in `/backend/migrations/`

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      users      │       │     plans       │       │  subscriptions  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ email           │  │    │ name            │  │    │ user_id (FK)    │──┐
│ password_hash   │  │    │ price           │  └───▶│ plan_id (FK)    │  │
│ name            │  │    │ daily_limit     │       │ status          │  │
│ role            │  │    │ features        │       │ start_date      │  │
│ plan_id (FK)    │──┘    │ google_product_id│      │ end_date        │  │
│ cefr_level      │       │ apple_product_id │      │ provider        │  │
│ native_language │       └─────────────────┘       └─────────────────┘  │
│ target_language │                                                      │
│ mfa_enabled     │◀─────────────────────────────────────────────────────┘
│ created_at      │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│  conversations  │       │    messages     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────▶│ id (PK)         │
│ user_id (FK)    │       │ conversation_id │
│ title           │       │ role            │
│ suggested_topic │       │ content         │
│ created_at      │       │ created_at      │
│ updated_at      │       └─────────────────┘
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     books       │       │  book_chapters  │       │  chapter_audio  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────▶│ id (PK)         │──────▶│ id (PK)         │
│ gutendex_id     │       │ book_id (FK)    │       │ chapter_id (FK) │
│ title           │       │ chapter_index   │       │ voice_model     │
│ authors         │       │ chapter_title   │       │ speaking_rate   │
│ cover_url       │       │ chapter_text    │       │ level           │
│ language        │       │ created_at      │       │ mp3_url         │
│ subjects        │       └─────────────────┘       │ vtt_url         │
└─────────────────┘                                 └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│     topics      │       │ content_history │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │
│ title           │       │ content_type    │
│ description     │       │ original_text   │
│ embedding       │       │ adapted_text    │
│ created_at      │       │ mp3_url         │
│ updated_at      │       │ vtt_url         │
└─────────────────┘       │ level           │
                          │ created_at      │
                          └─────────────────┘
```

## Core Tables

### users

Primary user table with authentication and profile data.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',           -- user, admin, moderator
    membership_status VARCHAR(20) DEFAULT 'free',
    plan_id INTEGER REFERENCES plans(id),
    cefr_level VARCHAR(10) DEFAULT 'A2',       -- A1, A2, B1, B2, C1, C2
    native_language VARCHAR(10) DEFAULT 'tr',
    target_language VARCHAR(10) DEFAULT 'en',
    profile_image_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    provider VARCHAR(50) DEFAULT 'email',      -- email, google, apple, facebook
    provider_id TEXT,
    reminder_settings JSONB,
    is_test_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_users_plan_id ON users(plan_id);
```

### plans

Subscription plan definitions.

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                 -- Free, Basic, Pro, Enterprise
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    daily_limit INTEGER DEFAULT 1,
    monthly_limit INTEGER,
    features JSONB,                            -- Feature flags
    google_product_id VARCHAR(100),            -- Google Play product ID
    apple_product_id VARCHAR(100),             -- App Store product ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default plans
INSERT INTO plans (name, price, daily_limit, features) VALUES
('Free', 0, 3, '{"basic_voices": true, "text_input": true}'),
('Basic', 49.99, 10, '{"basic_voices": true, "youtube": true}'),
('Pro', 99.99, 50, '{"all_voices": true, "youtube": true, "books": true, "ai_chat": true}'),
('Enterprise', 299.99, -1, '{"all_features": true, "api_access": true, "priority": true}');
```

### conversations

AI chat conversations.

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    suggested_topic TEXT,                      -- Extracted topic from chat
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
```

### messages

Chat messages within conversations.

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at ASC);
```

### books

Book catalog from Gutenberg.

```sql
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    gutendex_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    authors TEXT,                              -- JSON array as string
    cover_url TEXT,
    download_count INTEGER DEFAULT 0,
    language VARCHAR(10),
    copyright BOOLEAN,
    subjects TEXT,                             -- JSON array as string
    text_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_gutendex_id ON books(gutendex_id);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_language ON books(language);
```

### book_chapters

Book chapter content.

```sql
CREATE TABLE book_chapters (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_index INTEGER NOT NULL,
    chapter_title TEXT,
    chapter_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_book_chapters_book_id ON book_chapters(book_id);
CREATE UNIQUE INDEX idx_book_chapters_unique ON book_chapters(book_id, chapter_index);
```

### chapter_audio

Cached audio for book chapters.

```sql
CREATE TABLE chapter_audio (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES book_chapters(id) ON DELETE CASCADE,
    voice_model VARCHAR(100) NOT NULL,
    speaking_rate DECIMAL(3,2) NOT NULL,
    level VARCHAR(10) NOT NULL,
    mp3_url VARCHAR(1000) NOT NULL,
    vtt_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, voice_model, speaking_rate, level)
);

CREATE INDEX idx_chapter_audio_chapter_id ON chapter_audio(chapter_id);
```

### topics

User topics with embeddings for RAG.

```sql
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    embedding TEXT,                            -- JSON stringified vector (1536 dims)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_topics_title ON topics USING gin(to_tsvector('english', title));
```

### content_history

User's processed content history.

```sql
CREATE TABLE content_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,         -- text, youtube, web, file, book, podcast
    original_text TEXT,
    adapted_text TEXT,
    translated_text TEXT,
    bilingual_text TEXT,
    mp3_url TEXT,
    vtt_url TEXT,
    level VARCHAR(10),
    voice_model VARCHAR(100),
    speaking_rate DECIMAL(3,2),
    word_count INTEGER,
    duration_seconds INTEGER,
    source_url TEXT,
    chapter_id INTEGER,
    is_favorite BOOLEAN DEFAULT FALSE,
    processing_duration_ms INTEGER,            -- Time taken to generate audio (milliseconds)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_history_user_id ON content_history(user_id);
CREATE INDEX idx_content_history_created_at ON content_history(created_at DESC);
CREATE INDEX idx_content_history_type ON content_history(content_type);
```

### subscriptions

User subscription records.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    plantype VARCHAR(50),                      -- Plan name (Free Trial, Pro Monthly, etc.)
    status VARCHAR(20) DEFAULT 'active',       -- active, cancelled, expired
    startdate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enddate TIMESTAMP WITH TIME ZONE,
    provider VARCHAR(50),                      -- stripe, apple, google
    provider_subscription_id TEXT,
    receipt_data TEXT,
    audio_creation_count INTEGER DEFAULT 0,
    
    -- Apple IAP fields
    apple_transaction_id TEXT,
    apple_original_transaction_id TEXT,
    apple_receipt_data TEXT,
    apple_subscription_status VARCHAR(50),
    apple_auto_renew_status BOOLEAN DEFAULT TRUE,
    
    -- Google Play fields
    google_purchase_token TEXT,
    google_subscription_status VARCHAR(50),    -- active, canceled, on_hold, grace_period, expired, revoked
    google_auto_renew_status BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider);
CREATE INDEX idx_subscriptions_google_purchase_token ON subscriptions(google_purchase_token);
CREATE INDEX idx_subscriptions_apple_transaction_id ON subscriptions(apple_transaction_id);
```

### payment_providers

Payment provider configurations (iyzico, Stripe, etc.).

```sql
CREATE TABLE payment_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,            -- 'iyzico', 'stripe'
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    environment VARCHAR(20) DEFAULT 'sandbox',   -- sandbox, production
    api_key TEXT,
    secret_key TEXT,
    base_url VARCHAR(255),
    settings JSONB DEFAULT '{}',
    supported_features JSONB,                    -- creditCard, installment, threeDSecure, refund, recurring
    commission_rates JSONB,                      -- creditCard, debitCard, installment rates
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_result BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_providers_name ON payment_providers(name);
CREATE INDEX idx_payment_providers_is_active ON payment_providers(is_active);
```

### card_transactions

Credit card transaction records for iyzico and Stripe payments.

```sql
CREATE TABLE card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_provider_id UUID NOT NULL REFERENCES payment_providers(id),
    subscription_id UUID REFERENCES subscriptions(id),
    plan_id UUID,
    
    -- Transaction info
    transaction_type VARCHAR(20) DEFAULT 'payment',  -- payment, refund, partial_refund, chargeback
    status VARCHAR(20) DEFAULT 'pending',            -- pending, processing, completed, failed, cancelled, refunded
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    
    -- Card info (masked)
    card_last_four_digits VARCHAR(4),
    card_type VARCHAR(50),                           -- VISA, MASTERCARD, TROY
    card_association VARCHAR(50),
    card_family VARCHAR(50),
    bin_number VARCHAR(6),
    
    -- Installment
    installment_count INTEGER DEFAULT 1,
    installment_amount DECIMAL(10, 2),
    
    -- iyzico specific
    iyzico_conversation_id VARCHAR(100),
    iyzico_payment_id VARCHAR(100) UNIQUE,
    iyzico_payment_transaction_id VARCHAR(100),
    
    -- Stripe specific
    stripe_payment_intent_id VARCHAR(100),
    stripe_payment_id VARCHAR(100),
    stripe_session_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    
    -- 3D Secure
    three_d_secure BOOLEAN DEFAULT FALSE,
    three_d_secure_id VARCHAR(100),
    
    -- Commission
    commission_rate DECIMAL(5, 2),
    commission_amount DECIMAL(10, 2),
    net_amount DECIMAL(10, 2),
    
    -- Error info
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Refund info
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    
    -- Customer info
    customer_email VARCHAR(255),
    customer_ip VARCHAR(45),
    
    -- Meta
    metadata JSONB DEFAULT '{}',
    raw_response JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_transactions_user_id ON card_transactions(user_id);
CREATE INDEX idx_card_transactions_provider_id ON card_transactions(payment_provider_id);
CREATE INDEX idx_card_transactions_status ON card_transactions(status);
CREATE INDEX idx_card_transactions_type ON card_transactions(transaction_type);
CREATE INDEX idx_card_transactions_created_at ON card_transactions(created_at);
CREATE INDEX idx_card_transactions_stripe_pi ON card_transactions(stripe_payment_intent_id);
CREATE INDEX idx_card_transactions_stripe_session ON card_transactions(stripe_session_id);
```

## Support Tables

### user_vocabulary

User's saved vocabulary.

```sql
CREATE TABLE user_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    original_word VARCHAR(255),
    definition TEXT,
    example_sentence TEXT,
    notes TEXT,
    level VARCHAR(10),
    is_learned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, word)
);
```

### user_interests

User's learning interests.

```sql
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### user_favorites

User's favorite content.

```sql
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,            -- 'content_item', 'topic', 'book', 'document'
    item_id VARCHAR(255) NOT NULL,             -- UUID or Integer ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);
```

### user_book_progress

Tracks user's reading/listening progress for books and documents (unified library).

```sql
CREATE TABLE user_book_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Polymorphic reference (can be Public Book or User Document)
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('book', 'document')),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Progress Data
    current_chapter_index INTEGER DEFAULT 1,
    current_position_seconds INTEGER DEFAULT 0,  -- Audio timestamp
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_finished BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_content_reference CHECK (
        (content_type = 'book' AND book_id IS NOT NULL AND document_id IS NULL) OR
        (content_type = 'document' AND document_id IS NOT NULL AND book_id IS NULL)
    ),
    UNIQUE(user_id, content_type, book_id, document_id)
);

CREATE INDEX idx_user_progress_user ON user_book_progress(user_id);
CREATE INDEX idx_user_progress_last_access ON user_book_progress(last_accessed_at DESC);
```

## Migration History

Migrations are located in `/backend/migrations/` and should be run in order:

```
0001_initial.sql
0002_add_settings_table.sql
0003_add_apple_iap_fields.sql
0004_add_google_play_fields.sql
...
create_chat_tables.sql
create_books_tables.sql
create_topics_table.sql
add_payment_provider_tables.sql       # iyzico & Stripe entegrasyonu
...
```

## Related Documentation

- [Local Setup](../devops/local-setup.md)
- [API Services](../codebase/api-services.md)
- [System Overview](../architecture/system-overview.md)
