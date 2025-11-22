-- Migration: Create Support Chat Tables
-- Description: Completely separate support chat schema for user-admin messaging
-- NOTE: Does not touch existing conversations/messages tables used by LIRO.

-- Support conversations table
CREATE TABLE IF NOT EXISTS support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Support messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'admin')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support message attachments table
CREATE TABLE IF NOT EXISTS support_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update support_conversations timestamps when a new support_message is added
CREATE OR REPLACE FUNCTION update_support_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_conversations
    SET updated_at = NOW(), last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update support_conversations timestamp when new support_message is added
CREATE TRIGGER trigger_update_support_conversation_timestamp
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_support_conversation_timestamp();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id
    ON support_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_support_conversations_status_priority
    ON support_conversations(status, priority);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id
    ON support_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at
    ON support_messages(created_at);

-- Documentation comments
COMMENT ON TABLE support_conversations IS 'Stores support chat conversations between users and admins (separate from LIRO AI tables).';
COMMENT ON TABLE support_messages IS 'Stores individual messages within support_conversations.';
COMMENT ON TABLE support_message_attachments IS 'Stores file attachments for support messages.';

COMMENT ON COLUMN support_conversations.status IS 'Conversation status: open, in_progress, waiting, resolved, closed';
COMMENT ON COLUMN support_conversations.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN support_messages.sender_type IS 'Type of sender in support chat: user or admin';
COMMENT ON COLUMN support_messages.is_read IS 'Whether the message has been read by the recipient in support chat';
