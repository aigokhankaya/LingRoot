-- =====================================================
-- Migration: 0074_sector_gamification_full_integration.sql
-- Description: Sektör İngilizcesi - Gamification tam entegrasyonu
-- Date: 2026-01-23
-- Author: Senior Architect
-- =====================================================

-- ============================================
-- 1. XP Rewards Tablosu (Dinamik XP yönetimi)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_reward_config (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,          -- 'general', 'sector', 'quiz', 'streak'
    base_xp INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sektör XP ödülleri
INSERT INTO xp_reward_config (code, category, base_xp, description) VALUES
-- Sektör kelime öğrenimi
('SECTOR_VOCAB_LEARN', 'sector', 15, 'Sektör terimi öğrenme'),
('SECTOR_VOCAB_MASTER', 'sector', 30, 'Sektör terimi ustası olma'),
('SECTOR_VOCAB_REVIEW_CORRECT', 'sector', 5, 'Sektör terimi doğru tekrar'),

-- Sektör içerik
('SECTOR_CONTENT_START', 'sector', 10, 'Sektör içeriği başlatma'),
('SECTOR_CONTENT_COMPLETE', 'sector', 50, 'Sektör içeriği tamamlama'),
('SECTOR_DIALOGUE_COMPLETE', 'sector', 60, 'Sektör diyaloğu tamamlama'),

-- Sektör quiz
('SECTOR_QUIZ_COMPLETE', 'sector', 75, 'Sektör quizi tamamlama'),
('SECTOR_QUIZ_PERFECT', 'sector', 150, 'Sektör quizinde mükemmel skor'),
('SECTOR_QUIZ_PASS', 'sector', 50, 'Sektör quizi geçme'),

-- Roleplay
('SECTOR_ROLEPLAY_COMPLETE', 'sector', 100, 'Roleplay senaryosu tamamlama'),
('SECTOR_ROLEPLAY_EXCELLENT', 'sector', 175, 'Mükemmel roleplay performansı'),

-- Podcast
('SECTOR_PODCAST_LISTEN', 'sector', 40, 'Sektör podcast dinleme'),
('SECTOR_PODCAST_COMPLETE', 'sector', 80, 'Sektör podcast tamamlama'),

-- Modül
('SECTOR_MODULE_COMPLETE', 'sector', 200, 'Sektör modülü tamamlama'),
('SECTOR_ALL_MODULES', 'sector', 500, 'Tüm sektör modüllerini tamamlama')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. Word Exposure Log (Pasif SRS)
-- ============================================
CREATE TABLE IF NOT EXISTS word_exposure_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    sector_id INTEGER REFERENCES sectors(id),
    content_id UUID,
    content_type VARCHAR(50),               -- 'article', 'dialogue', 'podcast', 'roleplay'
    exposure_type VARCHAR(20) NOT NULL,     -- 'read', 'listen', 'quiz', 'active_review'
    context_sentence TEXT,
    exposed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_exposure_user ON word_exposure_log(user_id);
CREATE INDEX IF NOT EXISTS idx_word_exposure_word ON word_exposure_log(word);
CREATE INDEX IF NOT EXISTS idx_word_exposure_sector ON word_exposure_log(sector_id);
CREATE INDEX IF NOT EXISTS idx_word_exposure_date ON word_exposure_log(exposed_at);

-- RLS
ALTER TABLE word_exposure_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_exposure_user_policy" ON word_exposure_log
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. Sector Streak Tracking (Sektör serisi)
-- ============================================
ALTER TABLE user_sector_stats 
ADD COLUMN IF NOT EXISTS sector_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_sector_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sector_activity_date DATE;

-- ============================================
-- 4. Genişletilmiş Achievements
-- ============================================
INSERT INTO achievements (code, category, title_tr, title_en, description_tr, icon_emoji, xp_reward, condition_type, condition_value, rarity, sort_order) VALUES
-- Sektör Streak
('SECTOR_STREAK_7', 'sector', 'Sektör Odağı', 'Sector Focus', '7 gün üst üste sektör içeriği tamamladın', '🔥', 200, 'sector_streak', 7, 'rare', 310),
('SECTOR_STREAK_14', 'sector', 'Sektör Tutkunu', 'Sector Enthusiast', '14 gün üst üste sektör içeriği tamamladın', '🔥', 350, 'sector_streak', 14, 'epic', 311),
('SECTOR_STREAK_30', 'sector', 'Sektör Ustası', 'Sector Master', '30 gün üst üste sektör içeriği tamamladın', '👑', 1000, 'sector_streak', 30, 'legendary', 312),

-- Roleplay
('ROLEPLAY_FIRST', 'sector', 'İlk Sahne', 'First Scene', 'İlk roleplay senaryonu tamamladın', '🎭', 100, 'roleplay_complete', 1, 'common', 320),
('ROLEPLAY_5', 'sector', 'Oyuncu', 'Actor', '5 roleplay senaryosu tamamladın', '🎬', 200, 'roleplay_complete', 5, 'rare', 321),
('ROLEPLAY_10', 'sector', 'Profesyonel Aktör', 'Professional Actor', '10 roleplay senaryosu tamamladın', '🌟', 400, 'roleplay_complete', 10, 'epic', 322),

-- Podcast
('SECTOR_PODCAST_FIRST', 'sector', 'Podcast Dinleyici', 'Podcast Listener', 'İlk sektör podcastini dinledin', '🎧', 75, 'sector_podcast', 1, 'common', 330),
('SECTOR_PODCAST_5', 'sector', 'Podcast Hayranı', 'Podcast Fan', '5 sektör podcastini dinledin', '📻', 150, 'sector_podcast', 5, 'rare', 331),
('SECTOR_PODCAST_10', 'sector', 'Podcast Bağımlısı', 'Podcast Addict', '10 sektör podcastini dinledin', '🎙️', 300, 'sector_podcast', 10, 'epic', 332),

-- Quiz Streak
('SECTOR_QUIZ_STREAK_3', 'quiz', 'Quiz Serisi', 'Quiz Streak', '3 quizde üst üste %80+ aldın', '📊', 150, 'quiz_streak', 3, 'rare', 340),
('SECTOR_QUIZ_STREAK_5', 'quiz', 'Quiz Şampiyonu', 'Quiz Champion', '5 quizde üst üste %80+ aldın', '🏅', 300, 'quiz_streak', 5, 'epic', 341),

-- Vocabulary Mastery
('SECTOR_VOCAB_MASTERY_50', 'vocabulary', 'Terminoloji Uzmanı', 'Terminology Expert', 'Bir sektörde 50 kelimeyi ustalaştın', '📚', 300, 'sector_vocab_mastery', 50, 'rare', 350),
('SECTOR_VOCAB_MASTERY_100', 'vocabulary', 'Terminoloji Gurusu', 'Terminology Guru', 'Bir sektörde 100 kelimeyi ustalaştın', '📖', 500, 'sector_vocab_mastery', 100, 'epic', 351),
('SECTOR_VOCAB_COMPLETE', 'vocabulary', 'Sektör Sözlüğü', 'Sector Dictionary', 'Bir sektörün tüm kelimelerini öğrendin', '🏆', 1000, 'sector_vocab_complete', 1, 'legendary', 352),

-- Multi-sector expertise
('POLYGLOT_PROFESSIONAL_3', 'sector', 'Çok Yönlü', 'Versatile', '3 sektörde en az 25 kelime öğrendin', '🌐', 400, 'multi_sector_vocab', 3, 'epic', 360),
('POLYGLOT_PROFESSIONAL_5', 'sector', 'Evrensel Uzman', 'Universal Expert', '5 sektörde en az 25 kelime öğrendin', '🌍', 800, 'multi_sector_vocab', 5, 'legendary', 361),

-- Daily Quest Sector
('SECTOR_DAILY_QUEST_7', 'sector', 'Sektör Görevi Uzmanı', 'Sector Quest Expert', '7 gün üst üste sektör görevlerini tamamladın', '✅', 250, 'sector_daily_streak', 7, 'rare', 370)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 5. Sektör Quest Node Templates
-- ============================================
-- Sektör bazlı quest şablonlarını quest_nodes'a ekle
-- Bu quest'ler kullanıcının sektörüne göre dinamik olarak oluşturulacak

CREATE TABLE IF NOT EXISTS sector_quest_templates (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    title_template VARCHAR(255) NOT NULL,       -- '%SECTOR% Terminolojisi' gibi placeholder
    description_template TEXT,
    task_type VARCHAR(50) NOT NULL,             -- 'vocabulary', 'content', 'quiz', 'roleplay'
    task_subtype VARCHAR(50),
    reward_xp INTEGER DEFAULT 75,
    estimated_minutes INTEGER DEFAULT 15,
    difficulty VARCHAR(20) DEFAULT 'medium',    -- 'easy', 'medium', 'hard'
    prerequisite_template_id INTEGER REFERENCES sector_quest_templates(id),
    icon_emoji VARCHAR(10) DEFAULT '📚',
    is_major_milestone BOOLEAN DEFAULT FALSE,
    module_order INTEGER,                       -- Hangi modülde olacağı (0 = genel)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Genel sektör quest template'leri (tüm sektörler için)
INSERT INTO sector_quest_templates (sector_id, title_template, description_template, task_type, task_subtype, reward_xp, estimated_minutes, icon_emoji, module_order) VALUES
-- Vocabulary quests
(NULL, '%SECTOR% Temel Terimleri', 'Sektörün en temel 20 terimini öğren', 'vocabulary', 'basic', 100, 20, '📝', 1),
(NULL, '%SECTOR% İleri Terminoloji', 'İleri düzey sektör terimlerini öğren', 'vocabulary', 'advanced', 150, 25, '📖', 2),
(NULL, '%SECTOR% Tekrar Turu', 'Öğrendiğin terimleri pekiştir', 'vocabulary', 'review', 75, 15, '🔄', 1),

-- Content quests
(NULL, '%SECTOR% Makalesi', 'Sektörel bir makale oku ve dinle', 'content', 'article', 100, 15, '📰', 1),
(NULL, '%SECTOR% Diyaloğu', 'Profesyonel bir konuşma dinle', 'content', 'dialogue', 120, 20, '💬', 2),
(NULL, '%SECTOR% Podcast', 'Sektör podcast bölümü dinle', 'content', 'podcast', 150, 25, '🎧', 2),

-- Quiz quests
(NULL, '%SECTOR% Terminoloji Quizi', 'Kelime bilgini test et', 'quiz', 'vocabulary', 100, 10, '❓', 1),
(NULL, '%SECTOR% Anlama Quizi', 'İçerik anlama testini tamamla', 'quiz', 'comprehension', 125, 15, '📊', 2),

-- Roleplay quests
(NULL, '%SECTOR% Roleplay: Başlangıç', 'İlk profesyonel senaryonu oyna', 'roleplay', 'beginner', 150, 20, '🎭', 2),
(NULL, '%SECTOR% Roleplay: İleri', 'Zorlu bir senaryo ile meydan oku', 'roleplay', 'advanced', 200, 25, '🌟', 3),

-- Milestone
(NULL, '%SECTOR% Modül 1 Tamamlandı', 'Sektörün temel modülünü tamamladın!', 'milestone', NULL, 250, 0, '🏆', 1)
ON CONFLICT DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_sector_quest_templates_sector ON sector_quest_templates(sector_id);
CREATE INDEX IF NOT EXISTS idx_sector_quest_templates_type ON sector_quest_templates(task_type);

-- ============================================
-- 6. User Gamification'a Sector Tracking
-- ============================================
ALTER TABLE user_gamification 
ADD COLUMN IF NOT EXISTS primary_sector_id INTEGER REFERENCES sectors(id),
ADD COLUMN IF NOT EXISTS sector_quest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sector_quest_date DATE;

-- ============================================
-- 7. Daily Quests'e Sektör Kolonları
-- ============================================
ALTER TABLE daily_quests 
ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id),
ADD COLUMN IF NOT EXISTS is_sector_related BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_daily_quests_sector ON daily_quests(sector_id);

-- ============================================
-- 8. Quiz Results'a XP Tracking
-- ============================================
ALTER TABLE user_quiz_results 
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_source VARCHAR(50) DEFAULT 'quiz';

-- ============================================
-- 9. Sector Content Progress'e XP
-- ============================================
ALTER TABLE user_sector_content_progress 
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0;

-- ============================================
-- 10. User Vocabulary'ye Sektör İlişkisi
-- ============================================
-- Zaten var: ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id);
-- Index ekle
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_sector ON user_vocabulary(sector_id);

-- ============================================
-- 11. Sektör Onboarding Tercihleri
-- ============================================
CREATE TABLE IF NOT EXISTS user_sector_preferences (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    onboarding_sector_selected BOOLEAN DEFAULT FALSE,
    sector_goals JSONB,                     -- {"primary_goal": "career", "focus_areas": [...]}
    preferred_content_types TEXT[],         -- ['article', 'dialogue', 'podcast']
    daily_sector_time_goal INTEGER DEFAULT 15, -- Dakika
    weekly_sector_content_goal INTEGER DEFAULT 5, -- İçerik sayısı
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS
ALTER TABLE user_sector_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sector_preferences_policy" ON user_sector_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 12. Completed Quests'e Sektör ID
-- ============================================
-- quest_nodes zaten sector_id FK'sine sahip (0067'de eklenmiş)
-- Ama kullanıcı quest progress'ine de ekleyelim
ALTER TABLE user_quest_progress
ADD COLUMN IF NOT EXISTS sector_context_id INTEGER REFERENCES sectors(id);

-- ============================================
-- MIGRATION LOG
-- ============================================
INSERT INTO parameters (key, value, description)
VALUES ('migration_0074', 'completed_' || NOW()::TEXT, 'Sector Gamification Full Integration')
ON CONFLICT (key) DO UPDATE SET value = 'completed_' || NOW()::TEXT;
