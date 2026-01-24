-- ============================================
-- CONTENT TRACKING & GAMIFICATION
-- Migration: 0064_content_progress_tracking.sql
-- Description: Add listening progress and completion tracking
-- ============================================

-- 1. Add progress tracking columns to contenthistory
ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS last_position INTEGER DEFAULT 0;

ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;

ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Index for finding incomplete content
CREATE INDEX IF NOT EXISTS idx_contenthistory_incomplete 
ON contenthistory(user_id, is_completed) 
WHERE is_completed = FALSE AND last_position > 0;

-- 3. Add daily quest type for content listening if not exists
INSERT INTO daily_quests (user_id, quest_date, task_type, task_title, target_amount, xp_reward)
SELECT u.id, CURRENT_DATE, 'listen_content', 'İçerik Dinle', 1, 50
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM daily_quests dq 
    WHERE dq.user_id = u.id 
    AND dq.quest_date = CURRENT_DATE 
    AND dq.task_type = 'listen_content'
)
ON CONFLICT DO NOTHING;

-- 4. Comments
COMMENT ON COLUMN contenthistory.last_position IS 'Last listening position in seconds for resume functionality';
COMMENT ON COLUMN contenthistory.duration IS 'Total audio duration in seconds';
COMMENT ON COLUMN contenthistory.is_completed IS 'Whether user completed listening to this content';
COMMENT ON COLUMN contenthistory.completed_at IS 'Timestamp when user completed listening';
