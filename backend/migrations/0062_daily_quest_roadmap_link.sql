-- ============================================
-- DAILY QUEST - ROADMAP ENTEGRASYONU
-- Migration: 0062_daily_quest_roadmap_link.sql
-- Created: 2026-01-18
-- Description: Günlük görevleri yolculuk quest'lerine bağla
-- ============================================

-- 1. daily_quests tablosuna parent quest bağlantısı ekle
ALTER TABLE daily_quests 
ADD COLUMN IF NOT EXISTS parent_quest_node_id INTEGER REFERENCES quest_nodes(id),
ADD COLUMN IF NOT EXISTS contribution_weight DECIMAL(3,2) DEFAULT 0.20;
-- contribution_weight: Bu görevin parent quest'e katkısı (örn: 0.20 = %20)

-- 2. quest_nodes tablosuna child quest bilgisi ekle
ALTER TABLE quest_nodes
ADD COLUMN IF NOT EXISTS required_daily_completions INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS current_daily_completions INTEGER DEFAULT 0;

-- 3. Yeni indeksler
CREATE INDEX IF NOT EXISTS idx_daily_quests_parent ON daily_quests(parent_quest_node_id);

-- 4. Quest tamamlanma durumunu otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION check_quest_completion_from_daily()
RETURNS TRIGGER AS $$
DECLARE
    parent_quest RECORD;
    completed_count INTEGER;
BEGIN
    -- Eğer günlük görev tamamlandıysa ve parent quest varsa
    IF NEW.is_completed = true AND NEW.parent_quest_node_id IS NOT NULL THEN
        -- Parent quest'in bilgisini al
        SELECT * INTO parent_quest 
        FROM quest_nodes 
        WHERE id = NEW.parent_quest_node_id;
        
        -- Bu parent'a bağlı tamamlanmış daily quest sayısını hesapla
        SELECT COUNT(*) INTO completed_count
        FROM daily_quests
        WHERE parent_quest_node_id = NEW.parent_quest_node_id
          AND user_id = NEW.user_id
          AND is_completed = true;
        
        -- Quest nodes tablosunu güncelle
        UPDATE quest_nodes 
        SET current_daily_completions = completed_count
        WHERE id = NEW.parent_quest_node_id;
        
        -- Eğer yeterli tamamlama olduysa, user_quest_progress'i güncelle
        IF completed_count >= parent_quest.required_daily_completions THEN
            UPDATE user_quest_progress 
            SET status = 'completed', completed_at = NOW()
            WHERE user_id = NEW.user_id 
              AND node_id = NEW.parent_quest_node_id
              AND status != 'completed';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_quest_completion ON daily_quests;
CREATE TRIGGER trigger_daily_quest_completion
    AFTER UPDATE OF is_completed ON daily_quests
    FOR EACH ROW
    WHEN (NEW.is_completed = true AND OLD.is_completed = false)
    EXECUTE FUNCTION check_quest_completion_from_daily();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
