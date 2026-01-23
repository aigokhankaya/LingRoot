-- =====================================================
-- Migration: 0065_sector_content_table.sql
-- Description: Sektör İngilizcesi - İçerik havuzu tablosu
-- Date: 2026-01-19
-- =====================================================

-- 1. Sektörel içerik havuzu
CREATE TABLE IF NOT EXISTS sector_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,                -- 'article', 'dialogue', 'scenario', 'newsletter'
    cefr_level VARCHAR(10) NOT NULL,                  -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
    title VARCHAR(255) NOT NULL,
    title_tr VARCHAR(255),
    description TEXT,
    original_text TEXT NOT NULL,
    dialogue_data JSONB,                              -- Diyalog içerikleri için
    key_vocabulary TEXT[],                            -- İçerikteki önemli kelimeler
    comprehension_questions JSONB,                    -- Anlama soruları
    tags TEXT[],
    
    -- Kaynak bilgisi
    source_url TEXT,
    source_author VARCHAR(255),
    source_date DATE,
    
    -- Audio/Video
    audio_url TEXT,
    vtt_url TEXT,
    duration_seconds INTEGER,
    
    -- İstatistikler
    read_count INTEGER DEFAULT 0,
    listen_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    
    -- Durum
    status VARCHAR(20) DEFAULT 'draft',               -- 'draft', 'published', 'archived'
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_sector_content_sector ON sector_content(sector_id);
CREATE INDEX IF NOT EXISTS idx_sector_content_level ON sector_content(cefr_level);
CREATE INDEX IF NOT EXISTS idx_sector_content_type ON sector_content(content_type);
CREATE INDEX IF NOT EXISTS idx_sector_content_status ON sector_content(status);
CREATE INDEX IF NOT EXISTS idx_sector_content_tags ON sector_content USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_sector_content_created ON sector_content(created_at DESC);

-- 2. Kullanıcı içerik ilerlemesi
CREATE TABLE IF NOT EXISTS user_sector_content_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES sector_content(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started',         -- 'not_started', 'in_progress', 'completed'
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_user_content_progress_user ON user_sector_content_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_progress_status ON user_sector_content_progress(status);

-- RLS Policies
ALTER TABLE sector_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sector_content_progress ENABLE ROW LEVEL SECURITY;

-- Sector Content: Yayınlanmış içerikler herkes tarafından okunabilir
CREATE POLICY "sector_content_select_policy" ON sector_content
    FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);

CREATE POLICY "sector_content_insert_policy" ON sector_content
    FOR INSERT WITH CHECK (true);

CREATE POLICY "sector_content_update_policy" ON sector_content
    FOR UPDATE USING (true);

-- User Content Progress: Kullanıcı kendi ilerlemesini görebilir
CREATE POLICY "user_content_progress_select_policy" ON user_sector_content_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_content_progress_insert_policy" ON user_sector_content_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_content_progress_update_policy" ON user_sector_content_progress
    FOR UPDATE USING (auth.uid() = user_id);
