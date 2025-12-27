-- ============================================
-- GAMIFICATION SYSTEM TABLES
-- Migration: 0055_gamification_tables.sql
-- Created: 2025-12-25
-- Description: Hero's Journey gamification infrastructure
-- ============================================

-- 1. Kullanıcı Oyunlaştırma Profili
CREATE TABLE IF NOT EXISTS user_gamification (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1,       -- 1-100 arası (CEFR mapped)
    current_xp INTEGER DEFAULT 0,          -- Mevcut level içindeki XP
    total_lifetime_xp INTEGER DEFAULT 0,   -- Toplam kazanılan XP
    streak_count INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,      -- En uzun seri
    last_activity_date DATE DEFAULT CURRENT_DATE,
    freeze_balance INTEGER DEFAULT 0,      -- Satın alınan dondurma hakları
    archetype VARCHAR(50),                 -- 'career', 'travel', 'intellectual'
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_gamification_level ON user_gamification(current_level);
CREATE INDEX idx_user_gamification_streak ON user_gamification(streak_count);

-- 2. Kullanıcı Hedefleri (The Prophecy)
CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50),                 -- 'primary', 'weekly', 'milestone'
    archetype VARCHAR(50),                 -- 'career', 'travel', 'intellectual'
    target_cefr VARCHAR(10),               -- 'C1'
    current_cefr VARCHAR(10),              -- 'B1'
    weekly_minutes_goal INTEGER DEFAULT 120,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'active',   -- active, completed, abandoned
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_user_goals_status ON user_goals(status);

-- 3. Başarımlar (Achievements/Badges)
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,      -- 'FIRST_BLOOD', 'BOOKWORM_1'
    category VARCHAR(50),                  -- 'listening', 'vocabulary', 'streak', 'milestone'
    title_tr VARCHAR(100) NOT NULL,
    title_en VARCHAR(100),
    description_tr TEXT,
    description_en TEXT,
    icon_url TEXT,
    icon_emoji VARCHAR(10),                -- Fallback emoji
    xp_reward INTEGER DEFAULT 50,
    rarity VARCHAR(20) DEFAULT 'common',   -- common, rare, epic, legendary
    condition_type VARCHAR(50),            -- 'listen_minutes', 'streak_days', 'words_learned'
    condition_value INTEGER,
    is_hidden BOOLEAN DEFAULT FALSE,       -- Sürpriz başarımlar
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,        -- Kullanıcıya gösterildi mi?
    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- 4. Görev Düğümleri (Quest Nodes - Yol Haritası)
CREATE TABLE IF NOT EXISTS quest_nodes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,           -- 1, 2, 3... (Sıralama)
    week_number INTEGER,                   -- Hangi haftaya ait
    required_level INTEGER DEFAULT 1,      -- Minimum level
    prerequisite_node_id INTEGER REFERENCES quest_nodes(id),
    reward_xp INTEGER DEFAULT 100,
    task_type VARCHAR(50),                 -- 'content', 'quiz', 'milestone', 'challenge'
    task_subtype VARCHAR(50),              -- 'podcast', 'book', 'vocabulary', 'boss_fight'
    content_reference_id VARCHAR(100),     -- Bağlı olduğu içerik ID
    content_config JSONB,                  -- Ek konfigürasyon
    estimated_minutes INTEGER DEFAULT 10,
    is_major_milestone BOOLEAN DEFAULT FALSE,
    icon_emoji VARCHAR(10) DEFAULT '📜',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quest_nodes_order ON quest_nodes(step_order);
CREATE INDEX idx_quest_nodes_week ON quest_nodes(week_number);

-- 5. Kullanıcı Görev İlerlemesi
CREATE TABLE IF NOT EXISTS user_quest_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id INTEGER REFERENCES quest_nodes(id),
    status VARCHAR(20) DEFAULT 'locked',   -- locked, unlocked, in_progress, completed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    score INTEGER,
    attempts INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, node_id)
);

CREATE INDEX idx_user_quest_progress_user ON user_quest_progress(user_id);
CREATE INDEX idx_user_quest_progress_status ON user_quest_progress(status);

-- 6. Günlük Görevler (Daily Quests)
CREATE TABLE IF NOT EXISTS daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_date DATE DEFAULT CURRENT_DATE,
    task_type VARCHAR(50) NOT NULL,        -- 'listen_10min', 'learn_5words', 'complete_quiz'
    task_title VARCHAR(100),
    target_amount INTEGER NOT NULL,
    current_amount INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 50,
    is_completed BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,      -- Ödül alındı mı?
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_daily_quests_user_date ON daily_quests(user_id, quest_date);

-- 7. Kelime Tekrar Sistemi (SRS - Spaced Repetition)
CREATE TABLE IF NOT EXISTS word_reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    next_review_date DATE DEFAULT CURRENT_DATE,
    interval_days INTEGER DEFAULT 1,       -- SuperMemo/SM-2 algoritması için
    ease_factor DECIMAL(5,2) DEFAULT 2.5,
    repetition_count INTEGER DEFAULT 0,
    streak_correct INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    source_content_id VARCHAR(100),        -- Nereden öğrenildi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, word)
);

CREATE INDEX idx_word_reviews_user ON word_reviews(user_id);
CREATE INDEX idx_word_reviews_next ON word_reviews(user_id, next_review_date);

-- 8. Kelime Ustalık Matrisi (Global Status)
CREATE TABLE IF NOT EXISTS word_mastery (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    cefr_level VARCHAR(10),                -- Kelimenin ait olduğu seviye
    status VARCHAR(20) DEFAULT 'unknown',  -- 'known', 'learning', 'want_to_learn', 'unknown'
    confidence_score INTEGER DEFAULT 0,    -- 0-100
    encounter_count INTEGER DEFAULT 0,     -- Kaç kez karşılaşıldı
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, word)
);

CREATE INDEX idx_word_mastery_user_status ON word_mastery(user_id, status);

-- 9. Quiz Sonuçları
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_type VARCHAR(50) NOT NULL,        -- 'vocab_hunt', 'boss_fight', 'discovery', 'daily'
    quiz_config JSONB,                     -- Soru detayları
    score INTEGER,
    max_score INTEGER,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    time_spent_seconds INTEGER,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_type ON quiz_attempts(quiz_type);

-- 10. XP Transaction Log (Audit Trail)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,               -- Pozitif veya negatif
    source VARCHAR(50) NOT NULL,           -- 'content', 'quiz', 'streak', 'achievement'
    source_id VARCHAR(100),                -- İlgili içerik/quiz ID
    description TEXT,
    level_before INTEGER,
    level_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_date ON xp_transactions(created_at);

-- ============================================
-- DEFAULT ACHIEVEMENTS (Seed Data)
-- ============================================

INSERT INTO achievements (code, category, title_tr, title_en, description_tr, icon_emoji, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
-- Streak Achievements
('STREAK_3', 'streak', 'Ateş Başladı', 'Fire Started', '3 gün üst üste giriş yaptın!', '🔥', 50, 'common', 'streak_days', 3, 1),
('STREAK_7', 'streak', 'Haftalık Savaşçı', 'Weekly Warrior', '7 gün üst üste giriş yaptın!', '⚔️', 100, 'common', 'streak_days', 7, 2),
('STREAK_30', 'streak', 'Ay Ustası', 'Month Master', '30 gün üst üste giriş yaptın!', '🌙', 500, 'rare', 'streak_days', 30, 3),
('STREAK_100', 'streak', 'Efsane', 'Legend', '100 gün üst üste giriş yaptın!', '👑', 2000, 'legendary', 'streak_days', 100, 4),

-- Listening Achievements
('LISTEN_60', 'listening', 'İlk Saat', 'First Hour', '1 saat içerik dinledin!', '🎧', 100, 'common', 'listen_minutes', 60, 10),
('LISTEN_300', 'listening', 'Dinleme Tutkunu', 'Listening Enthusiast', '5 saat içerik dinledin!', '🎵', 250, 'rare', 'listen_minutes', 300, 11),
('LISTEN_1000', 'listening', 'Ses Ustası', 'Audio Master', '16+ saat içerik dinledin!', '🎼', 1000, 'epic', 'listen_minutes', 1000, 12),

-- Vocabulary Achievements
('WORDS_10', 'vocabulary', 'Kelime Avcısı', 'Word Hunter', '10 kelime öğrendin!', '📝', 50, 'common', 'words_learned', 10, 20),
('WORDS_50', 'vocabulary', 'Kelime Koleksiyoncusu', 'Word Collector', '50 kelime öğrendin!', '📚', 200, 'rare', 'words_learned', 50, 21),
('WORDS_200', 'vocabulary', 'Sözlük Ustası', 'Dictionary Master', '200 kelime öğrendin!', '🏆', 1000, 'epic', 'words_learned', 200, 22),

-- Milestone Achievements
('FIRST_CONTENT', 'milestone', 'İlk Adım', 'First Step', 'İlk içeriğini tamamladın!', '🎉', 100, 'common', 'content_count', 1, 30),
('LEVEL_10', 'milestone', 'Yükselen Yıldız', 'Rising Star', 'Level 10''a ulaştın!', '⭐', 200, 'common', 'level_reached', 10, 31),
('LEVEL_25', 'milestone', 'Parlayan Elmas', 'Shining Diamond', 'Level 25''e ulaştın!', '💎', 500, 'rare', 'level_reached', 25, 32),
('LEVEL_50', 'milestone', 'Usta', 'Expert', 'Level 50''ye ulaştın!', '🏅', 1000, 'epic', 'level_reached', 50, 33),

-- Hidden/Surprise Achievements
('NIGHT_OWL', 'special', 'Gece Kuşu', 'Night Owl', 'Gece yarısından sonra çalıştın!', '🦉', 100, 'rare', 'special', 0, 100),
('EARLY_BIRD', 'special', 'Erken Kuş', 'Early Bird', 'Sabah 6''dan önce çalıştın!', '🐦', 100, 'rare', 'special', 0, 101)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- XP Level hesaplama fonksiyonu (100 level sistemi)
CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Her level için gereken XP artarak gider
    -- Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, ...
    RETURN GREATEST(1, FLOOR(SQRT(total_xp / 50.0)) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Level'e göre sonraki level için gereken XP
CREATE OR REPLACE FUNCTION xp_for_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (current_level * current_level * 50);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: user_gamification updated_at
CREATE OR REPLACE FUNCTION update_gamification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gamification_updated
    BEFORE UPDATE ON user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION update_gamification_timestamp();

-- Yeni kullanıcı için otomatik gamification profili oluştur
CREATE OR REPLACE FUNCTION create_gamification_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_gamification (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eğer users tablosu varsa trigger ekle
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS trigger_create_gamification_profile ON users;
        CREATE TRIGGER trigger_create_gamification_profile
            AFTER INSERT ON users
            FOR EACH ROW
            EXECUTE FUNCTION create_gamification_profile();
    END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
