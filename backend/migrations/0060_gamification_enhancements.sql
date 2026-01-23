-- ============================================
-- GAMIFICATION ENHANCEMENTS
-- Migration: 0060_gamification_enhancements.sql
-- Created: 2026-01-17
-- Description: Leaderboard, Weekly Challenges, Streak Society
-- ============================================

-- 1. Weekly Scores (Leaderboard için)
CREATE TABLE IF NOT EXISTS weekly_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    listening_minutes INTEGER DEFAULT 0,
    content_completed INTEGER DEFAULT 0,
    words_learned INTEGER DEFAULT 0,
    rank INTEGER,
    league VARCHAR(20) DEFAULT 'seed',
    promoted BOOLEAN DEFAULT FALSE,
    demoted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_scores_week ON weekly_scores(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_xp ON weekly_scores(week_start, xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_user ON weekly_scores(user_id);

-- 2. Leagues tanımları
CREATE TABLE IF NOT EXISTS leagues (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name_tr VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    rank_order INTEGER,
    min_xp_to_promote INTEGER,
    demotion_zone INTEGER DEFAULT 5, -- Son 5 kişi düşer
    promotion_zone INTEGER DEFAULT 10 -- İlk 10 kişi çıkar
);

-- League seed data
INSERT INTO leagues (code, name_tr, name_en, icon, rank_order, min_xp_to_promote, demotion_zone, promotion_zone) VALUES
('seed', 'Tohum', 'Seed', '🌱', 1, 0, 5, 10),
('sprout', 'Filiz', 'Sprout', '🌿', 2, 100, 5, 10),
('sapling', 'Fidan', 'Sapling', '🌳', 3, 300, 5, 10),
('flourish', 'Çiçek', 'Flourish', '🌸', 4, 600, 5, 10),
('rooted', 'Kök', 'Rooted', '🏆', 5, 1000, 0, 0) -- En üst lig
ON CONFLICT (code) DO NOTHING;

-- 3. Weekly Challenges
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id SERIAL PRIMARY KEY,
    title_tr VARCHAR(100) NOT NULL,
    title_en VARCHAR(100),
    description_tr TEXT,
    description_en TEXT,
    theme VARCHAR(50) NOT NULL, -- 'science', 'business', 'culture', 'general'
    theme_icon VARCHAR(10),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    tasks JSONB NOT NULL, -- [{type, target, xp_reward, title}]
    badge_code VARCHAR(50), -- Kazanılan rozet
    total_xp_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_dates ON weekly_challenges(week_start, week_end);

-- 4. User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES weekly_challenges(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tasks_progress JSONB DEFAULT '{}', -- {task_index: current_amount}
    completed_tasks INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    badge_claimed BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_challenge ON user_challenge_progress(challenge_id);

-- 5. Streak Society (user_gamification'a ekleme)
ALTER TABLE user_gamification 
ADD COLUMN IF NOT EXISTS streak_society VARCHAR(20),
ADD COLUMN IF NOT EXISTS streak_badge_url TEXT,
ADD COLUMN IF NOT EXISTS current_league VARCHAR(20) DEFAULT 'seed';

-- 6. Yeni Achievements (Streak Society + Leaderboard)
INSERT INTO achievements (code, category, title_tr, title_en, description_tr, icon_emoji, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
-- Streak Society rozetleri
('STREAK_SOCIETY_WEEK', 'streak', 'Haftalık Savaşçı', 'Week Warrior', '7+ gün streak ile Streak Society''ye katıldın!', '⚔️', 150, 'common', 'streak_days', 7, 5),
('STREAK_SOCIETY_MONTH', 'streak', 'Ay Ustası', 'Month Master', '30+ gün streak ile Elit gruba katıldın!', '🌙', 500, 'rare', 'streak_days', 30, 6),
('STREAK_SOCIETY_LEGEND', 'streak', 'Efsanevi Kök', 'Legendary Root', '100+ gün streak ile Efsane oldun!', '👑', 2000, 'legendary', 'streak_days', 100, 7),

-- Leaderboard rozetleri
('LEAGUE_PROMOTED', 'leaderboard', 'Yükselen Yıldız', 'Rising Star', 'İlk kez bir üst lige çıktın!', '⬆️', 100, 'common', 'league_promote', 1, 40),
('LEAGUE_ROOTED', 'leaderboard', 'Kök Liga Şampiyonu', 'Rooted Champion', 'En üst lige ulaştın!', '🏆', 1000, 'epic', 'league_reached', 5, 41),
('LEAGUE_TOP_3', 'leaderboard', 'Podyum', 'Podium Finish', 'Haftalık sıralamada ilk 3''e girdin!', '🥇', 200, 'rare', 'league_top3', 1, 42),

-- Challenge rozetleri
('CHALLENGE_FIRST', 'challenge', 'Meydan Okuyan', 'Challenger', 'İlk haftalık challenge''ı tamamladın!', '🎯', 100, 'common', 'challenge_complete', 1, 50),
('CHALLENGE_MASTER', 'challenge', 'Challenge Ustası', 'Challenge Master', '10 haftalık challenge tamamladın!', '🏅', 500, 'rare', 'challenge_complete', 10, 51),

-- İçerik rozetleri (ek)
('PODCAST_LOVER', 'listening', 'Podcast Tutkunu', 'Podcast Lover', '10 podcast tamamladın!', '🎙️', 200, 'rare', 'podcast_count', 10, 13),
('CONTENT_CREATOR_PRO', 'content', 'İçerik Üretici Pro', 'Content Creator Pro', '50 içerik oluşturdun!', '✍️', 500, 'epic', 'content_created', 50, 35),

-- Zaman bazlı rozetler
('EARLY_BIRD', 'special', 'Erken Kuş', 'Early Bird', 'Sabah 6''dan önce çalıştın!', '🐦', 100, 'rare', 'special', 0, 102),
('NIGHT_OWL', 'special', 'Gece Kuşu', 'Night Owl', 'Gece yarısından sonra çalıştın!', '🦉', 100, 'rare', 'special', 0, 103),
('WEEKEND_WARRIOR', 'special', 'Hafta Sonu Savaşçısı', 'Weekend Warrior', 'Hafta sonu 3+ saat çalıştın!', '🗓️', 150, 'rare', 'special', 0, 104)

ON CONFLICT (code) DO NOTHING;

-- 7. Örnek Weekly Challenge (Bu hafta için)
INSERT INTO weekly_challenges (title_tr, title_en, description_tr, theme, theme_icon, week_start, week_end, tasks, badge_code, total_xp_reward) VALUES
(
    'Bilim ve Teknoloji Maratonu',
    'Science & Technology Marathon',
    'Bu hafta bilim ve teknoloji konularında kendini geliştir!',
    'science',
    '🔬',
    DATE_TRUNC('week', CURRENT_DATE)::DATE,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
    '[
        {"type": "listen_content", "target": 3, "xp_reward": 150, "title_tr": "3 bilim içeriği dinle", "title_en": "Listen to 3 science contents"},
        {"type": "learn_words", "target": 20, "xp_reward": 100, "title_tr": "20 teknoloji kelimesi öğren", "title_en": "Learn 20 technology words"},
        {"type": "complete_quiz", "target": 2, "xp_reward": 100, "title_tr": "2 quiz tamamla", "title_en": "Complete 2 quizzes"},
        {"type": "create_content", "target": 1, "xp_reward": 150, "title_tr": "1 bilim içeriği oluştur", "title_en": "Create 1 science content"}
    ]'::JSONB,
    'CHALLENGE_FIRST',
    500
)
ON CONFLICT DO NOTHING;

-- 8. Leaderboard hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_weekly_ranks()
RETURNS void AS $$
BEGIN
    -- Bu haftanın skorlarını sırala ve rank ata
    WITH ranked AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY week_start 
                ORDER BY xp_earned DESC, listening_minutes DESC
            ) as new_rank
        FROM weekly_scores
        WHERE week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE
    )
    UPDATE weekly_scores ws
    SET rank = ranked.new_rank
    FROM ranked
    WHERE ws.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

-- 9. Streak Society güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_streak_society()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.streak_count >= 100 THEN
        NEW.streak_society := 'legendary';
    ELSIF NEW.streak_count >= 30 THEN
        NEW.streak_society := 'month_master';
    ELSIF NEW.streak_count >= 7 THEN
        NEW.streak_society := 'week_warrior';
    ELSE
        NEW.streak_society := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_streak_society ON user_gamification;
CREATE TRIGGER trigger_update_streak_society
    BEFORE UPDATE OF streak_count ON user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION update_streak_society();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
