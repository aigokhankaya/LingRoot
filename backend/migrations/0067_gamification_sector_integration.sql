-- =====================================================
-- Migration: 0067_gamification_sector_integration.sql
-- Description: Sektör İngilizcesi - Gamification entegrasyonu
-- Date: 2026-01-19
-- =====================================================

-- 1. Quest nodes'a sector bağlantısı
ALTER TABLE quest_nodes 
ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id);

CREATE INDEX IF NOT EXISTS idx_quest_nodes_sector ON quest_nodes(sector_id);

-- 2. Sektör kullanım istatistikleri
CREATE TABLE IF NOT EXISTS user_sector_stats (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    content_completed INTEGER DEFAULT 0,
    content_in_progress INTEGER DEFAULT 0,
    vocabulary_learned INTEGER DEFAULT 0,
    vocabulary_reviewing INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, sector_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sector_stats_user ON user_sector_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sector_stats_sector ON user_sector_stats(sector_id);

-- 3. Sektörel başarımlar
INSERT INTO achievements (code, title_tr, description_tr, icon_url, xp_reward, condition_type, condition_value) VALUES
-- İlk adımlar
('SECTOR_FIRST_CONTENT', 'Sektör Keşifçisi', 'İlk sektörel içeriğini tamamladın!', '/icons/achievements/sector_explorer.png', 50, 'sector_content_complete', 1),
('SECTOR_FIRST_VOCAB', 'Terminoloji Meraklısı', 'İlk sektör terimini öğrendin!', '/icons/achievements/vocab_curious.png', 25, 'sector_vocab_learned', 1),

-- İçerik başarımları
('SECTOR_5_CONTENTS', 'Sektör Öğrencisi', '5 sektörel içerik tamamladın', '/icons/achievements/sector_student.png', 100, 'sector_content_complete', 5),
('SECTOR_10_CONTENTS', 'Sektör Çırağı', '10 sektörel içerik tamamladın', '/icons/achievements/sector_apprentice.png', 150, 'sector_content_complete', 10),
('SECTOR_25_CONTENTS', 'Sektör Profesyoneli', '25 sektörel içerik tamamladın', '/icons/achievements/sector_professional.png', 300, 'sector_content_complete', 25),
('SECTOR_50_CONTENTS', 'Sektör Uzmanı', '50 sektörel içerik tamamladın', '/icons/achievements/sector_expert.png', 500, 'sector_content_complete', 50),
('SECTOR_100_CONTENTS', 'Sektör Ustası', '100 sektörel içerik tamamladın', '/icons/achievements/sector_master.png', 1000, 'sector_content_complete', 100),

-- Terminoloji başarımları
('SECTOR_VOCAB_10', 'Terminoloji Çırağı', '10 sektör terimi öğrendin', '/icons/achievements/vocab_apprentice.png', 50, 'sector_vocab_learned', 10),
('SECTOR_VOCAB_25', 'Terminoloji Öğrencisi', '25 sektör terimi öğrendin', '/icons/achievements/vocab_student.png', 100, 'sector_vocab_learned', 25),
('SECTOR_VOCAB_50', 'Terminoloji Uzmanı', '50 sektör terimi öğrendin', '/icons/achievements/vocab_expert.png', 200, 'sector_vocab_learned', 50),
('SECTOR_VOCAB_100', 'Terminoloji Ustası', '100 sektör terimi öğrendin', '/icons/achievements/vocab_master.png', 400, 'sector_vocab_learned', 100),
('SECTOR_VOCAB_250', 'Terminoloji Gurusu', '250 sektör terimi öğrendin', '/icons/achievements/vocab_guru.png', 750, 'sector_vocab_learned', 250),

-- Çoklu sektör başarımları
('MULTI_SECTOR_2', 'Çok Yönlü', '2 farklı sektörde içerik tamamladın', '/icons/achievements/multi_2.png', 150, 'multi_sector_complete', 2),
('MULTI_SECTOR_5', 'Poliglot Profesyonel', '5 farklı sektörde içerik tamamladın', '/icons/achievements/multi_5.png', 500, 'multi_sector_complete', 5)
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE user_sector_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sector_stats_select_policy" ON user_sector_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_sector_stats_insert_policy" ON user_sector_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sector_stats_update_policy" ON user_sector_stats
    FOR UPDATE USING (auth.uid() = user_id);
