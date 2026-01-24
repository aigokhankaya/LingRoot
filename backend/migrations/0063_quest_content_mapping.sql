-- ============================================
-- QUEST - CONTENT MAPPING
-- Migration: 0063_quest_content_mapping.sql
-- Created: 2026-01-18
-- Description: Quest'leri içeriklere bağla ve İş İngilizcesi modülü ekle
-- ============================================

-- 1. Quest content config yapısını zenginleştir
ALTER TABLE quest_nodes
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50), -- 'topic', 'word_set', 'quiz', 'custom'
ADD COLUMN IF NOT EXISTS content_filter JSONB DEFAULT '{}';
-- content_filter örnek: {"category": "business", "cefr_level": "B1", "min_words": 10}

-- 2. İçerik kategorileri tablosu - önce varsa sil
DROP TABLE IF EXISTS content_categories CASCADE;

CREATE TABLE content_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_tr VARCHAR(100),
    name_en VARCHAR(100),
    parent_code VARCHAR(50),
    icon_emoji VARCHAR(10),
    suggested_cefr VARCHAR(10),
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO content_categories (code, name_tr, name_en, icon_emoji, suggested_cefr) VALUES
('business', 'İş İngilizcesi', 'Business English', '💼', 'B1'),
('business_email', 'E-posta Yazımı', 'Email Writing', '📧', 'B1'),
('business_meetings', 'Toplantılar', 'Meetings', '🤝', 'B2'),
('business_presentations', 'Sunumlar', 'Presentations', '📊', 'B2'),
('travel', 'Seyahat', 'Travel', '✈️', 'A2'),
('daily', 'Günlük Konuşma', 'Daily Conversation', '💬', 'A1'),
('academic', 'Akademik', 'Academic', '🎓', 'C1'),
('technology', 'Teknoloji', 'Technology', '💻', 'B1'),
('health', 'Sağlık', 'Health', '🏥', 'B1'),
('entertainment', 'Eğlence', 'Entertainment', '🎬', 'A2');

-- 3. İş İngilizcesi için quest node'ları oluştur
-- Önce mevcut iş ingilizcesi quest'lerini temizle (varsa)
DELETE FROM quest_nodes WHERE task_subtype = 'business' AND title LIKE '%İş İngilizcesi%';

-- İş İngilizcesi Modülü Quest'leri
INSERT INTO quest_nodes (
    title, description, step_order, week_number, 
    required_level, prerequisite_node_id, reward_xp, 
    task_type, task_subtype, estimated_minutes,
    content_type, content_filter, icon_emoji, 
    is_major_milestone, required_daily_completions
) VALUES 
-- Hafta 2: İş İngilizcesine Giriş
(
    'İş E-postası Temelleri', 
    'Profesyonel e-posta yazımının temel kalıplarını öğren.',
    10, 2, 5, NULL, 100, 
    'vocabulary', 'business', 15,
    'word_set',
    '{"category": "business_email", "word_count": 15}'::JSONB,
    '📧', false, 3
),
(
    'E-posta Kalıpları Dinle',
    'Gerçek iş e-postalarının seslendirilmiş örneklerini dinle.',
    11, 2, 5, NULL, 75, 
    'listen', 'business', 10,
    'topic',
    '{"category": "business", "subcategory": "email"}'::JSONB,
    '🎧', false, 2
),
(
    'Toplantı Diyaloğu',
    'Bir iş toplantısı kaydını dinle ve anlama pratiği yap.',
    12, 2, 5, NULL, 100, 
    'listen', 'business', 15,
    'topic',
    '{"category": "business", "subcategory": "meetings"}'::JSONB,
    '🤝', false, 2
),
(
    'İş İngilizcesi Quiz',
    'Öğrendiklerini test et ve bilgini pekiştir.',
    13, 2, 5, NULL, 75, 
    'quiz', 'business', 10,
    'quiz',
    '{"type": "vocabulary", "category": "business"}'::JSONB,
    '📝', false, 1
),
(
    'İş İngilizcesine Giriş Tamamlandı!',
    'Tebrikler! İş dünyasının temel kelimelerini öğrendin.',
    14, 2, 5, NULL, 250, 
    'milestone', 'business', 5,
    NULL, NULL,
    '🏆', true, 0
),

-- Hafta 3: Sunum Teknikleri
(
    'Sunum Kelime Hazinesi',
    'Etkili sunum için gerekli kelimeleri öğren.',
    15, 3, 7, NULL, 100, 
    'vocabulary', 'presentations', 15,
    'word_set',
    '{"category": "business_presentations", "word_count": 20}'::JSONB,
    '📊', false, 3
),
(
    'TED Talk Dinleme',
    'Profesyonel bir sunumu dinle ve analiz et.',
    16, 3, 7, NULL, 100, 
    'listen', 'presentations', 20,
    'topic',
    '{"category": "business", "subcategory": "presentations"}'::JSONB,
    '🎤', false, 2
),
(
    'Sunum Teknikleri Tamamlandı!',
    'Artık etkili sunum yapabilirsin!',
    17, 3, 7, NULL, 300, 
    'milestone', 'presentations', 5,
    NULL, NULL,
    '🎯', true, 0
);

-- 4. Prerequisite bağlantılarını kur (step_order'a göre)
UPDATE quest_nodes qn1
SET prerequisite_node_id = (
    SELECT qn2.id 
    FROM quest_nodes qn2 
    WHERE qn2.step_order = qn1.step_order - 1
      AND qn2.task_subtype = qn1.task_subtype
    LIMIT 1
)
WHERE qn1.task_subtype IN ('business', 'presentations')
  AND qn1.step_order > 10;

-- 5. Yeni kullanıcılar için bu quest'leri de user_quest_progress'e ekleyecek trigger
CREATE OR REPLACE FUNCTION add_new_quests_to_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Yeni eklenen quest için tüm kullanıcılara 'locked' progress ekle
    INSERT INTO user_quest_progress (user_id, node_id, status)
    SELECT DISTINCT ug.user_id, NEW.id, 'locked'
    FROM user_gamification ug
    WHERE ug.onboarding_completed = true
    ON CONFLICT (user_id, node_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_new_quests ON quest_nodes;
CREATE TRIGGER trigger_add_new_quests
    AFTER INSERT ON quest_nodes
    FOR EACH ROW
    EXECUTE FUNCTION add_new_quests_to_progress();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
