-- =====================================================
-- Migration: 0069_sector_quiz.sql
-- Description: Sektör quizleri ve sonuç tabloları
-- Date: 2026-01-19
-- =====================================================

-- 1. Quiz tanımları
CREATE TABLE IF NOT EXISTS sector_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    title_tr VARCHAR(255),
    description TEXT,
    
    -- Quiz tipi ve yapılandırma
    quiz_type VARCHAR(50) NOT NULL,                  -- 'vocabulary', 'comprehension', 'mixed', 'fill_blank', 'matching'
    cefr_level VARCHAR(10),
    difficulty VARCHAR(20) DEFAULT 'medium',         -- 'easy', 'medium', 'hard'
    
    -- Zaman ve puan ayarları
    time_limit_seconds INTEGER,                      -- NULL = no limit
    passing_score INTEGER DEFAULT 70,                -- Yüzde olarak geçme notu
    
    -- Sorular (JSONB)
    questions JSONB NOT NULL,
    -- Format: [
    --   { 
    --     "id": 1, 
    --     "type": "multiple_choice", 
    --     "question": "...", 
    --     "options": ["A", "B", "C", "D"], 
    --     "correct": 0, 
    --     "explanation": "...",
    --     "points": 10
    --   }
    -- ]
    
    -- Meta
    total_questions INTEGER GENERATED ALWAYS AS (jsonb_array_length(questions)) STORED,
    max_score INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- İlişkiler (opsiyonel)
    related_content_id UUID REFERENCES sector_content(id),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Kullanıcı quiz sonuçları
CREATE TABLE IF NOT EXISTS user_quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES sector_quizzes(id) ON DELETE CASCADE,
    
    -- Sonuçlar
    score INTEGER NOT NULL,
    score_percentage DECIMAL(5,2),
    correct_count INTEGER NOT NULL,
    wrong_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    
    -- Zaman
    time_taken_seconds INTEGER,
    
    -- Detaylı cevaplar
    answers JSONB,
    -- Format: [{ "question_id": 1, "selected": 2, "correct": 0, "is_correct": false }]
    
    -- Başarı durumu
    is_passed BOOLEAN,
    
    -- Audit
    started_at TIMESTAMP,
    completed_at TIMESTAMP DEFAULT NOW(),
    
    -- Tekrar çözme izni
    attempt_number INTEGER DEFAULT 1
);

-- 3. Indexler
CREATE INDEX IF NOT EXISTS idx_quiz_sector ON sector_quizzes(sector_id);
CREATE INDEX IF NOT EXISTS idx_quiz_type ON sector_quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quiz_level ON sector_quizzes(cefr_level);
CREATE INDEX IF NOT EXISTS idx_quiz_active ON sector_quizzes(is_active);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON user_quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON user_quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed ON user_quiz_results(completed_at DESC);

-- 4. RLS Policies
ALTER TABLE sector_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;

-- Quizler: Aktif olanlar herkes tarafından görülebilir
CREATE POLICY "sector_quizzes_select_policy" ON sector_quizzes
    FOR SELECT USING (is_active = true);

CREATE POLICY "sector_quizzes_admin_all" ON sector_quizzes
    FOR ALL USING (true);

-- Sonuçlar: Kullanıcı sadece kendi sonuçlarını görebilir
CREATE POLICY "user_quiz_results_select_policy" ON user_quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_quiz_results_insert_policy" ON user_quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Quiz tamamlama XP ödülü için achievement ekle
INSERT INTO achievements (code, title_tr, description_tr, icon_url, xp_reward, condition_type, condition_value) VALUES
('SECTOR_QUIZ_FIRST', 'İlk Quiz', 'İlk sektör quizini tamamladın!', '/icons/achievements/quiz_first.png', 50, 'sector_quiz_complete', 1),
('SECTOR_QUIZ_PERFECT', 'Mükemmel Skor', 'Bir quizde %100 aldın!', '/icons/achievements/quiz_perfect.png', 100, 'sector_quiz_perfect', 1),
('SECTOR_QUIZ_10', 'Quiz Ustası', '10 sektör quizi tamamladın', '/icons/achievements/quiz_master.png', 200, 'sector_quiz_complete', 10)
ON CONFLICT (code) DO NOTHING;
