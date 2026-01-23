-- =====================================================
-- Migration: 0066_sector_vocabulary_table.sql
-- Description: Sektör İngilizcesi - Terminoloji sözlüğü
-- Date: 2026-01-19
-- =====================================================

-- 1. Sektörel terminoloji sözlüğü
CREATE TABLE IF NOT EXISTS sector_vocabulary (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    pronunciation VARCHAR(100),
    definition_en TEXT NOT NULL,
    definition_tr TEXT NOT NULL,
    example_sentence TEXT,
    example_sentence_tr TEXT,
    category VARCHAR(50),                             -- 'documentation', 'roles', 'processes', 'tools'
    cefr_level VARCHAR(10),
    frequency_rank INTEGER,                           -- Sektörde kullanım sıklığı sırası
    audio_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(sector_id, word)
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_sector_vocab_sector ON sector_vocabulary(sector_id);
CREATE INDEX IF NOT EXISTS idx_sector_vocab_word ON sector_vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_sector_vocab_level ON sector_vocabulary(cefr_level);
CREATE INDEX IF NOT EXISTS idx_sector_vocab_category ON sector_vocabulary(category);

-- 2. user_vocabulary tablosuna sector_id ekle
ALTER TABLE user_vocabulary 
ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id);

CREATE INDEX IF NOT EXISTS idx_user_vocab_sector ON user_vocabulary(sector_id);

-- RLS Policies
ALTER TABLE sector_vocabulary ENABLE ROW LEVEL SECURITY;

-- Sector Vocabulary: Herkes okuyabilir
CREATE POLICY "sector_vocabulary_select_policy" ON sector_vocabulary
    FOR SELECT USING (true);

CREATE POLICY "sector_vocabulary_insert_policy" ON sector_vocabulary
    FOR INSERT WITH CHECK (true);

CREATE POLICY "sector_vocabulary_update_policy" ON sector_vocabulary
    FOR UPDATE USING (true);

CREATE POLICY "sector_vocabulary_delete_policy" ON sector_vocabulary
    FOR DELETE USING (true);
