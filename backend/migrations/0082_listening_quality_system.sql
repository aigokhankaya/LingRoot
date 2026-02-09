-- ============================================
-- LISTENING QUALITY SYSTEM (LQS)
-- Migration: 0082_listening_quality_system.sql
-- Created: 2026-02-07
-- Description: Dinleme kalitesi metrikleri, oturum takibi ve kelime ustalık sistemi
-- ============================================

-- 1. Dinleme Oturumları (Her dinleme session'ı için detaylı tracking)
CREATE TABLE IF NOT EXISTS listening_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID,
    content_type VARCHAR(50), -- 'podcast', 'article', 'book_chapter', 'document', 'youtube'

    -- Temel metrikler
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    content_duration_seconds INTEGER, -- İçeriğin toplam süresi
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    playback_speed DECIMAL(3,2) DEFAULT 1.0,

    -- Aktif dinleme metrikleri
    pause_count INTEGER DEFAULT 0,
    replay_count INTEGER DEFAULT 0,
    word_tap_count INTEGER DEFAULT 0,
    speed_change_count INTEGER DEFAULT 0,
    subtitle_toggle_count INTEGER DEFAULT 0,
    seek_count INTEGER DEFAULT 0, -- İleri/geri atlama sayısı

    -- Detaylı event log (JSONB)
    events JSONB DEFAULT '[]'::jsonb,
    -- Örnek: [{"type":"pause","time":45.2,"timestamp":"2026-02-07T10:30:00Z"},...]

    -- Kalite skorları (0-100)
    engagement_score INTEGER,
    comprehension_score INTEGER, -- Quiz sonucu
    listening_quality_score INTEGER, -- LQS (hesaplanmış)

    -- XP
    base_xp_earned INTEGER DEFAULT 0,
    quality_multiplier DECIMAL(3,2) DEFAULT 1.0,
    final_xp_earned INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listening_sessions_user ON listening_sessions(user_id);
CREATE INDEX idx_listening_sessions_date ON listening_sessions(created_at);
CREATE INDEX idx_listening_sessions_content ON listening_sessions(content_id);
CREATE INDEX idx_listening_sessions_status ON listening_sessions(status);
CREATE INDEX idx_listening_sessions_user_date ON listening_sessions(user_id, created_at DESC);

-- 2. Kullanıcı Dinleme İstatistikleri (Aggregate stats)
CREATE TABLE IF NOT EXISTS user_listening_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Toplam metrikler
    total_listening_seconds INTEGER DEFAULT 0,
    quality_listening_seconds INTEGER DEFAULT 0, -- LQS > 60 olanlar
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,

    -- Ortalamalar
    avg_engagement_score DECIMAL(5,2) DEFAULT 0,
    avg_comprehension_score DECIMAL(5,2) DEFAULT 0,
    avg_listening_quality_score DECIMAL(5,2) DEFAULT 0,

    -- Hız progression
    preferred_speed DECIMAL(3,2) DEFAULT 1.0,
    max_successful_speed DECIMAL(3,2) DEFAULT 1.0,

    -- Aktif dinleme metrikleri (toplam)
    total_pause_count INTEGER DEFAULT 0,
    total_replay_count INTEGER DEFAULT 0,
    total_word_taps INTEGER DEFAULT 0,

    -- Kelime metrikleri
    words_encountered INTEGER DEFAULT 0,
    words_tapped INTEGER DEFAULT 0,
    words_in_srs INTEGER DEFAULT 0,
    words_mastered INTEGER DEFAULT 0,

    -- CEFR tracking
    estimated_listening_cefr VARCHAR(10),
    listening_cefr_updated_at TIMESTAMPTZ,

    -- Haftalık trend (son 12 hafta)
    weekly_lqs_trend JSONB DEFAULT '[]'::jsonb,
    -- Örnek: [{"week": "2026-W05", "avg_lqs": 75, "sessions": 12}, ...]

    -- Günlük trend (son 30 gün)
    daily_lqs_trend JSONB DEFAULT '[]'::jsonb,
    -- Örnek: [{"date": "2026-02-07", "avg_lqs": 78, "minutes": 45}, ...]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Genişletilmiş Kelime Ustalık Tablosu (Memory Palace için)
CREATE TABLE IF NOT EXISTS vocabulary_mastery_extended (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,

    -- Durum ('encountered', 'familiar', 'learning', 'known', 'mastered')
    status VARCHAR(20) DEFAULT 'encountered',

    -- Memory Palace kategorisi
    palace_room VARCHAR(30) DEFAULT 'dark_zone',
    -- 'dark_zone' (keşfedilmemiş), 'witness_room' (tanıdık),
    -- 'learning_hall' (öğreniliyor), 'knowledge_library' (bilinen),
    -- 'golden_vault' (ustalaşılan)

    -- Context tracking
    encounter_count INTEGER DEFAULT 1,
    unique_content_count INTEGER DEFAULT 1, -- kaç farklı içerikte
    content_types_seen TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['podcast', 'article', 'book']
    content_ids_seen UUID[] DEFAULT ARRAY[]::UUID[],

    -- Tanıma başarısı
    recognition_attempts INTEGER DEFAULT 0,
    recognition_successes INTEGER DEFAULT 0,
    recognition_rate DECIMAL(5,2) DEFAULT 0,

    -- SRS (Spaced Repetition System)
    srs_interval_days INTEGER DEFAULT 1,
    srs_ease_factor DECIMAL(5,2) DEFAULT 2.5,
    next_review_date DATE,
    last_review_result VARCHAR(20), -- 'again', 'hard', 'good', 'easy'

    -- CEFR level of the word
    word_cefr_level VARCHAR(10),

    -- Timestamps
    first_encountered_at TIMESTAMPTZ DEFAULT NOW(),
    last_encountered_at TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    mastered_at TIMESTAMPTZ,

    UNIQUE(user_id, word)
);

CREATE INDEX idx_vocab_mastery_user ON vocabulary_mastery_extended(user_id);
CREATE INDEX idx_vocab_mastery_status ON vocabulary_mastery_extended(status);
CREATE INDEX idx_vocab_mastery_palace ON vocabulary_mastery_extended(palace_room);
CREATE INDEX idx_vocab_mastery_review ON vocabulary_mastery_extended(next_review_date);
CREATE INDEX idx_vocab_mastery_user_status ON vocabulary_mastery_extended(user_id, status);

-- 4. Dinleme Kalitesi Achievement'ları (Seed Data)
INSERT INTO achievements (code, category, title_tr, title_en, description_tr, description_en, icon_emoji, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
-- Listening Quality Achievements
('FOCUSED_LISTENER_1', 'listening_quality', 'Odaklı Dinleyici', 'Focused Listener', 'LQS 80+ ile 5 içerik tamamladın!', 'Completed 5 contents with LQS 80+!', '🎯', 150, 'common', 'lqs_streak', 5, 40),
('DEEP_LISTENER', 'listening_quality', 'Derin Dinleyici', 'Deep Listener', 'LQS 90+ ile 10 içerik tamamladın!', 'Completed 10 contents with LQS 90+!', '🧘', 300, 'rare', 'lqs_streak', 10, 41),
('PERSISTENT_LEARNER', 'listening_quality', 'Azimli Öğrenci', 'Persistent Learner', 'Toplam 50 kez tekrar dinledin!', 'Replayed 50 times total!', '🔄', 100, 'common', 'replay_total', 50, 42),

-- Word Discovery Achievements
('WORD_HUNTER_10', 'vocabulary', 'Kelime Avcısı', 'Word Hunter', '10 farklı kelimeye tıkladın!', 'Tapped 10 unique words!', '🔍', 50, 'common', 'word_taps', 10, 43),
('WORD_HUNTER_100', 'vocabulary', 'Kelime Koleksiyoncusu', 'Word Collector', '100 farklı kelimeye tıkladın!', 'Tapped 100 unique words!', '📖', 200, 'rare', 'word_taps', 100, 44),
('WORD_HUNTER_500', 'vocabulary', 'Kelime Ustası', 'Word Master', '500 farklı kelimeye tıkladın!', 'Tapped 500 unique words!', '🏅', 500, 'epic', 'word_taps', 500, 45),

-- Speed Achievements
('SPEED_STARTER', 'listening_quality', 'Hız Başlangıcı', 'Speed Starter', '1.1x hızda içerik tamamladın!', 'Completed content at 1.1x speed!', '⚡', 75, 'common', 'speed_milestone', 110, 46),
('SPEED_DEMON', 'listening_quality', 'Hız Ustası', 'Speed Demon', '1.2x hızda 5 içerik tamamladın!', 'Completed 5 contents at 1.2x speed!', '🚀', 250, 'rare', 'speed_milestone', 120, 47),

-- Comprehension Streak Achievements
('PERFECT_UNDERSTANDING_3', 'listening_quality', 'Tam Anlayış', 'Perfect Understanding', 'Üst üste 3 içerikte %90+ anlama!', '90%+ comprehension in 3 consecutive contents!', '💡', 150, 'common', 'comprehension_streak', 3, 48),
('PERFECT_UNDERSTANDING_7', 'listening_quality', 'Anlama Ustası', 'Comprehension Master', 'Üst üste 7 içerikte %90+ anlama!', '90%+ comprehension in 7 consecutive contents!', '🧠', 400, 'rare', 'comprehension_streak', 7, 49),
('PERFECT_UNDERSTANDING_30', 'listening_quality', 'Anlama Efsanesi', 'Comprehension Legend', 'Üst üste 30 içerikte %90+ anlama!', '90%+ comprehension in 30 consecutive contents!', '👑', 1000, 'legendary', 'comprehension_streak', 30, 50),

-- Memory Palace Achievements
('PALACE_EXPLORER', 'vocabulary', 'Saray Kaşifi', 'Palace Explorer', 'Kelime Sarayında 100 kelime keşfettin!', 'Discovered 100 words in Memory Palace!', '🏰', 100, 'common', 'palace_words', 100, 51),
('PALACE_MASTER', 'vocabulary', 'Saray Ustası', 'Palace Master', 'Altın Kasada 50 kelimen var!', '50 words in Golden Vault!', '🗝️', 300, 'rare', 'vault_words', 50, 52),
('PALACE_LEGEND', 'vocabulary', 'Saray Efsanesi', 'Palace Legend', 'Altın Kasada 200 kelimen var!', '200 words in Golden Vault!', '👑', 1000, 'legendary', 'vault_words', 200, 53),

-- Quality Hours Achievements
('QUALITY_HOURS_10', 'listening_quality', '10 Kaliteli Saat', '10 Quality Hours', 'LQS 60+ ile 10 saat dinledin!', 'Listened 10 hours with LQS 60+!', '⏰', 200, 'common', 'quality_hours', 10, 54),
('QUALITY_HOURS_50', 'listening_quality', '50 Kaliteli Saat', '50 Quality Hours', 'LQS 60+ ile 50 saat dinledin!', 'Listened 50 hours with LQS 60+!', '🕐', 750, 'rare', 'quality_hours', 50, 55),
('QUALITY_HOURS_100', 'listening_quality', '100 Kaliteli Saat', '100 Quality Hours', 'LQS 60+ ile 100 saat dinledin!', 'Listened 100 hours with LQS 60+!', '⌛', 2000, 'epic', 'quality_hours', 100, 56)

ON CONFLICT (code) DO NOTHING;

-- 5. Trigger: listening_sessions updated_at
CREATE OR REPLACE FUNCTION update_listening_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listening_session_updated ON listening_sessions;
CREATE TRIGGER trigger_listening_session_updated
    BEFORE UPDATE ON listening_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_listening_session_timestamp();

-- 6. Trigger: user_listening_stats updated_at
CREATE OR REPLACE FUNCTION update_user_listening_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_listening_stats_updated ON user_listening_stats;
CREATE TRIGGER trigger_user_listening_stats_updated
    BEFORE UPDATE ON user_listening_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_user_listening_stats_timestamp();

-- 7. Function: LQS hesaplama (SQL level)
-- LQS = (Engagement × 0.3) + (Comprehension × 0.5) + (Consistency × 0.2)
CREATE OR REPLACE FUNCTION calculate_lqs(
    p_engagement_score INTEGER,
    p_comprehension_score INTEGER,
    p_streak_factor DECIMAL DEFAULT 1.0
) RETURNS INTEGER AS $$
DECLARE
    engagement_component DECIMAL;
    comprehension_component DECIMAL;
    consistency_component DECIMAL;
    raw_lqs DECIMAL;
BEGIN
    -- Null kontrolü
    engagement_component := COALESCE(p_engagement_score, 50) * 0.3;
    comprehension_component := COALESCE(p_comprehension_score, 50) * 0.5;
    consistency_component := (p_streak_factor * 100) * 0.2;

    raw_lqs := engagement_component + comprehension_component + consistency_component;

    -- 0-100 arasında sınırla
    RETURN LEAST(100, GREATEST(0, ROUND(raw_lqs)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Function: Engagement score hesaplama
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_pause_count INTEGER,
    p_replay_count INTEGER,
    p_word_tap_count INTEGER,
    p_speed_change_count INTEGER,
    p_duration_seconds INTEGER
) RETURNS INTEGER AS $$
DECLARE
    pause_score DECIMAL;
    replay_score DECIMAL;
    word_tap_score DECIMAL;
    speed_score DECIMAL;
    duration_minutes DECIMAL;
    raw_score DECIMAL;
BEGIN
    duration_minutes := GREATEST(1, p_duration_seconds / 60.0);

    -- Her metrik için normalize edilmiş skor (0-25 arası)
    -- Pause: dakika başına 0.5-2 pause ideal
    pause_score := LEAST(25, (COALESCE(p_pause_count, 0) / duration_minutes) * 12.5);

    -- Replay: Her replay değerli
    replay_score := LEAST(25, COALESCE(p_replay_count, 0) * 5);

    -- Word tap: Kelime araştırma
    word_tap_score := LEAST(25, COALESCE(p_word_tap_count, 0) * 3);

    -- Speed change: Adaptasyon göstergesi
    speed_score := LEAST(25, COALESCE(p_speed_change_count, 0) * 8);

    raw_score := pause_score + replay_score + word_tap_score + speed_score;

    RETURN LEAST(100, GREATEST(0, ROUND(raw_score)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. View: Kullanıcı Memory Palace özeti
CREATE OR REPLACE VIEW v_user_memory_palace AS
SELECT
    user_id,
    COUNT(*) FILTER (WHERE palace_room = 'dark_zone') as dark_zone_count,
    COUNT(*) FILTER (WHERE palace_room = 'witness_room') as witness_room_count,
    COUNT(*) FILTER (WHERE palace_room = 'learning_hall') as learning_hall_count,
    COUNT(*) FILTER (WHERE palace_room = 'knowledge_library') as knowledge_library_count,
    COUNT(*) FILTER (WHERE palace_room = 'golden_vault') as golden_vault_count,
    COUNT(*) as total_words,
    COUNT(*) FILTER (WHERE next_review_date <= CURRENT_DATE) as due_for_review
FROM vocabulary_mastery_extended
GROUP BY user_id;

-- 10. View: Günlük dinleme kalitesi
CREATE OR REPLACE VIEW v_daily_listening_quality AS
SELECT
    user_id,
    DATE(created_at) as listening_date,
    COUNT(*) as session_count,
    SUM(duration_seconds) as total_seconds,
    ROUND(AVG(listening_quality_score), 1) as avg_lqs,
    ROUND(AVG(engagement_score), 1) as avg_engagement,
    ROUND(AVG(comprehension_score), 1) as avg_comprehension,
    SUM(word_tap_count) as total_word_taps,
    SUM(replay_count) as total_replays
FROM listening_sessions
WHERE status = 'completed'
GROUP BY user_id, DATE(created_at);

-- ============================================
-- MIGRATION COMPLETE
-- Run this SQL in Supabase SQL Editor
-- ============================================
