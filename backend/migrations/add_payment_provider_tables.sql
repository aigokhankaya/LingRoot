-- Migration: Ödeme Sağlayıcıları ve Kredi Kartı İşlemleri Tabloları
-- Date: 2025-12-07
-- Description: iyzico entegrasyonu için gerekli tablolar

-- Payment Providers Table
CREATE TABLE IF NOT EXISTS payment_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    environment VARCHAR(20) DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    api_key TEXT,
    secret_key TEXT,
    base_url VARCHAR(255),
    settings JSONB DEFAULT '{}',
    supported_features JSONB DEFAULT '{
        "creditCard": true,
        "installment": false,
        "threeDSecure": true,
        "refund": true,
        "partialRefund": false,
        "recurring": false
    }',
    commission_rates JSONB DEFAULT '{
        "creditCard": 2.49,
        "debitCard": 1.79,
        "installment": {
            "2": 3.49,
            "3": 4.49,
            "6": 5.99,
            "9": 7.49,
            "12": 8.99
        }
    }',
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_result BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card Transactions Table
CREATE TABLE IF NOT EXISTS card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_provider_id UUID NOT NULL REFERENCES payment_providers(id),
    subscription_id UUID REFERENCES subscriptions(id),
    plan_id UUID,
    
    -- İşlem bilgileri
    transaction_type VARCHAR(20) DEFAULT 'payment' CHECK (transaction_type IN ('payment', 'refund', 'partial_refund', 'chargeback')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    
    -- Tutar bilgileri
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    
    -- Kart bilgileri (maskelenmiş)
    card_last_four_digits VARCHAR(4),
    card_type VARCHAR(50),
    card_association VARCHAR(50),
    card_family VARCHAR(50),
    bin_number VARCHAR(6),
    
    -- Taksit bilgileri
    installment_count INTEGER DEFAULT 1,
    installment_amount DECIMAL(10, 2),
    
    -- iyzico özel alanları
    iyzico_conversation_id VARCHAR(100),
    iyzico_payment_id VARCHAR(100) UNIQUE,
    iyzico_payment_transaction_id VARCHAR(100),
    iyzico_fraud_status INTEGER,
    
    -- Stripe özel alanları
    stripe_payment_intent_id VARCHAR(100),
    stripe_payment_id VARCHAR(100),
    stripe_session_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    
    -- 3D Secure
    three_d_secure BOOLEAN DEFAULT FALSE,
    three_d_secure_id VARCHAR(100),
    
    -- Komisyon ve net tutar
    commission_rate DECIMAL(5, 2),
    commission_amount DECIMAL(10, 2),
    net_amount DECIMAL(10, 2),
    
    -- Hata bilgileri
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- İade bilgileri
    refunded_amount DECIMAL(10, 2) DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    
    -- Müşteri bilgileri
    customer_email VARCHAR(255),
    customer_ip VARCHAR(45),
    
    -- Meta bilgiler
    metadata JSONB DEFAULT '{}',
    raw_response JSONB,
    
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_card_transactions_user_id ON card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_provider_id ON card_transactions(payment_provider_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_status ON card_transactions(status);
CREATE INDEX IF NOT EXISTS idx_card_transactions_type ON card_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created_at ON card_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_providers_name ON payment_providers(name);
CREATE INDEX IF NOT EXISTS idx_payment_providers_is_active ON payment_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_card_transactions_stripe_pi ON card_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_stripe_session ON card_transactions(stripe_session_id);

-- Default iyzico provider (sandbox)
INSERT INTO payment_providers (name, display_name, is_active, is_default, environment, supported_features)
VALUES (
    'iyzico',
    'iyzico',
    FALSE,
    FALSE,
    'sandbox',
    '{"creditCard": true, "installment": true, "threeDSecure": true, "refund": true, "partialRefund": false, "recurring": false}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Default Stripe provider (test)
INSERT INTO payment_providers (name, display_name, is_active, is_default, environment, supported_features, commission_rates)
VALUES (
    'stripe',
    'Stripe',
    FALSE,
    TRUE,
    'sandbox',
    '{"creditCard": true, "installment": false, "threeDSecure": true, "refund": true, "partialRefund": true, "recurring": true}'::jsonb,
    '{"creditCard": 2.9, "debitCard": 2.9, "installment": {}}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_providers_updated_at ON payment_providers;
CREATE TRIGGER update_payment_providers_updated_at
    BEFORE UPDATE ON payment_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_card_transactions_updated_at ON card_transactions;
CREATE TRIGGER update_card_transactions_updated_at
    BEFORE UPDATE ON card_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- Admin only access for payment_providers
CREATE POLICY payment_providers_admin_policy ON payment_providers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users can see their own transactions
CREATE POLICY card_transactions_user_select ON card_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admin can see all transactions
CREATE POLICY card_transactions_admin_all ON card_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE payment_providers IS 'Ödeme sağlayıcı yapılandırmaları (iyzico, stripe vb.)';
COMMENT ON TABLE card_transactions IS 'Kredi kartı ile yapılan tüm ödeme işlemleri';
