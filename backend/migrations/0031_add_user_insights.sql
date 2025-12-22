-- Migration: Add user_insights table for User Persona System
-- Date: 2025-12-21
-- Description: Stores qualitative user insights (likes, dislikes, habits, goals) extracted from conversations

-- Create ENUM type for insight categories
DO $$ BEGIN
    CREATE TYPE insight_type AS ENUM ('like', 'dislike', 'habit', 'goal', 'trait', 'preference');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_insights table
CREATE TABLE IF NOT EXISTS user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type insight_type NOT NULL,
    insight_value TEXT NOT NULL,
    confidence INTEGER DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_type ON user_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_user_insights_active ON user_insights(user_id, is_active) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

-- Users can only see their own insights
CREATE POLICY "Users can view own insights" ON user_insights
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own insights (via backend)
CREATE POLICY "Users can insert own insights" ON user_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own insights
CREATE POLICY "Users can update own insights" ON user_insights
    FOR UPDATE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE user_insights IS 'Stores learned user preferences and traits for Liro personalization (User Persona System)';
COMMENT ON COLUMN user_insights.insight_type IS 'Category: like, dislike, habit, goal, trait, preference';
COMMENT ON COLUMN user_insights.confidence IS 'How confident the system is about this insight (0-100)';
COMMENT ON COLUMN user_insights.is_active IS 'Soft delete - allows disabling insights without losing data';
