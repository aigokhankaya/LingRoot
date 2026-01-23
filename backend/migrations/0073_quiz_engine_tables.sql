-- =====================================================
-- Migration: 0073_quiz_engine_tables.sql
-- Description: Quiz Engine altyapısı - Çoklu soru tipi desteği ve SRS entegrasyonu
-- Date: 2026-01-23
-- =====================================================

-- =====================================================
-- 1. QUIZ WORD ATTEMPTS (Kelime Bazlı Quiz Denemeleri)
-- Her quiz cevabında kelime performansını izler
-- SRS entegrasyonu için kritik - yanlış cevaplar word_reviews'a eklenir
-- =====================================================

CREATE TABLE IF NOT EXISTS quiz_word_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    
    -- Quiz bağlantısı
    quiz_result_id UUID REFERENCES user_quiz_results(id) ON DELETE SET NULL,
    question_id INTEGER,                              -- Quiz içindeki soru ID'si
    
    -- Soru detayları
    question_type VARCHAR(50) NOT NULL,               -- 'multiple_choice', 'cloze', 'matching', 'ordering', 'error_correction'
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5), -- Soru zorluğu
    
    -- Sonuç
    was_correct BOOLEAN NOT NULL,
    user_answer TEXT,                                 -- Kullanıcının verdiği cevap
    correct_answer TEXT,                              -- Doğru cevap
    
    -- Performans metrikleri
    response_time_ms INTEGER,                         -- Cevap süresi (milisaniye)
    hints_used INTEGER DEFAULT 0,                     -- Kullanılan ipucu sayısı
    
    -- Context
    source_content_id UUID,                           -- İlgili içerik (varsa)
    sector_id INTEGER REFERENCES sectors(id),         -- İlgili sektör (varsa)
    cefr_level VARCHAR(10),                           -- Sorunun CEFR seviyesi
    
    -- SRS sync tracking
    synced_to_srs BOOLEAN DEFAULT FALSE,              -- word_reviews'a eklendi mi?
    synced_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_quiz_word_attempts_user 
ON quiz_word_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_word_attempts_user_word 
ON quiz_word_attempts(user_id, word);

CREATE INDEX IF NOT EXISTS idx_quiz_word_attempts_correct 
ON quiz_word_attempts(user_id, was_correct);

CREATE INDEX IF NOT EXISTS idx_quiz_word_attempts_type 
ON quiz_word_attempts(question_type);

CREATE INDEX IF NOT EXISTS idx_quiz_word_attempts_srs_sync 
ON quiz_word_attempts(user_id, synced_to_srs) 
WHERE synced_to_srs = FALSE;

CREATE INDEX IF NOT EXISTS idx_quiz_word_attempts_sector 
ON quiz_word_attempts(sector_id);

-- =====================================================
-- 2. USER QUIZ DIFFICULTY PROFILE (Kullanıcı Zorluk Profili)
-- Adaptif zorluk sistemi için kullanıcı performans metrikleri
-- =====================================================

CREATE TABLE IF NOT EXISTS user_quiz_difficulty_profile (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Beceri bazlı doğruluk oranları (0.0 - 1.0)
    vocabulary_accuracy DECIMAL(4,3) DEFAULT 0.500,   -- Kelime bilgisi
    grammar_accuracy DECIMAL(4,3) DEFAULT 0.500,      -- Gramer
    listening_accuracy DECIMAL(4,3) DEFAULT 0.500,    -- Dinleme
    reading_accuracy DECIMAL(4,3) DEFAULT 0.500,      -- Okuma anlama
    
    -- Soru tipi bazlı doğruluk
    mc_accuracy DECIMAL(4,3) DEFAULT 0.500,           -- Multiple choice
    cloze_accuracy DECIMAL(4,3) DEFAULT 0.500,        -- Fill-in-blank
    matching_accuracy DECIMAL(4,3) DEFAULT 0.500,     -- Eşleştirme
    ordering_accuracy DECIMAL(4,3) DEFAULT 0.500,     -- Sıralama
    
    -- Performans metrikleri
    avg_response_time_ms INTEGER DEFAULT 5000,        -- Ortalama cevap süresi
    fastest_response_ms INTEGER,                      -- En hızlı cevap
    slowest_response_ms INTEGER,                      -- En yavaş cevap
    
    -- İstatistikler
    total_questions_answered INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,                 -- Ardışık doğru cevap
    best_streak INTEGER DEFAULT 0,                    -- En uzun ardışık doğru
    
    -- Tercihler (AI tarafından öğrenilir)
    preferred_question_types JSONB DEFAULT '[]',      -- Tercih edilen tipler
    struggling_topics JSONB DEFAULT '[]',             -- Zorlandığı konular
    mastered_topics JSONB DEFAULT '[]',               -- Ustalık kazandığı konular
    
    -- Önerilen zorluk seviyesi (AI tarafından hesaplanır)
    recommended_difficulty INTEGER DEFAULT 3 CHECK (recommended_difficulty BETWEEN 1 AND 5),
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. QUIZ QUESTION TEMPLATES (Soru Şablonları)
-- Dinamik soru üretimi için şablonlar
-- =====================================================

CREATE TABLE IF NOT EXISTS quiz_question_templates (
    id SERIAL PRIMARY KEY,
    
    -- Soru tipi ve kategorisi
    question_type VARCHAR(50) NOT NULL,               -- 'cloze', 'matching', 'ordering', 'error_correction'
    category VARCHAR(50),                             -- 'vocabulary', 'grammar', 'phrase', 'collocation'
    subcategory VARCHAR(50),                          -- Daha spesifik kategori
    
    -- CEFR ve zorluk
    cefr_level VARCHAR(10),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    
    -- Şablon içeriği (JSONB)
    template JSONB NOT NULL,
    -- Örnek cloze: { "pattern": "The CEO made a _____ decision.", "answer_type": "word", "pos": "adjective" }
    -- Örnek matching: { "pair_count": 5, "category": "business_verbs" }
    -- Örnek ordering: { "sentence_type": "conditional", "word_count_range": [5, 8] }
    
    -- İlişkiler
    sector_id INTEGER REFERENCES sectors(id),         -- Sektör-spesifik şablonlar
    
    -- Meta
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(4,3),                        -- Ortalama başarı oranı
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_type 
ON quiz_question_templates(question_type);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_level 
ON quiz_question_templates(cefr_level, difficulty);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_sector 
ON quiz_question_templates(sector_id);

-- =====================================================
-- 4. QUIZ SESSION (Quiz Oturumu)
-- Uzun quizler için oturum takibi
-- =====================================================

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Quiz bilgisi
    quiz_id UUID REFERENCES sector_quizzes(id) ON DELETE SET NULL,
    quiz_type VARCHAR(50),                            -- 'sector', 'vocabulary', 'content', 'adaptive'
    
    -- İçerik bağlantısı
    content_id UUID,                                  -- İlgili içerik
    sector_id INTEGER REFERENCES sectors(id),
    
    -- Oturum durumu
    status VARCHAR(20) DEFAULT 'in_progress',         -- 'in_progress', 'completed', 'abandoned', 'paused'
    current_question_index INTEGER DEFAULT 0,
    total_questions INTEGER,
    
    -- Cevaplar (ara kayıt)
    answers JSONB DEFAULT '[]',
    
    -- Zamanlama
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    time_limit_seconds INTEGER,
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- Sonuç (tamamlandığında)
    score INTEGER,
    score_percentage DECIMAL(5,2),
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user 
ON quiz_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status 
ON quiz_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_active 
ON quiz_sessions(user_id, status) 
WHERE status = 'in_progress';

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Quiz Word Attempts
ALTER TABLE quiz_word_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_word_attempts_user_select" ON quiz_word_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quiz_word_attempts_user_insert" ON quiz_word_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz Difficulty Profile
ALTER TABLE user_quiz_difficulty_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_difficulty_profile_user_all" ON user_quiz_difficulty_profile
    FOR ALL USING (auth.uid() = user_id);

-- Quiz Sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_sessions_user_all" ON quiz_sessions
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 6. TRIGGER: Otomatik profil güncelleme
-- =====================================================

CREATE OR REPLACE FUNCTION update_quiz_difficulty_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Profil yoksa oluştur
    INSERT INTO user_quiz_difficulty_profile (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- İstatistikleri güncelle
    UPDATE user_quiz_difficulty_profile
    SET 
        total_questions_answered = total_questions_answered + 1,
        total_correct = total_correct + CASE WHEN NEW.was_correct THEN 1 ELSE 0 END,
        avg_response_time_ms = (
            (avg_response_time_ms * total_questions_answered + COALESCE(NEW.response_time_ms, 5000)) 
            / (total_questions_answered + 1)
        ),
        current_streak = CASE 
            WHEN NEW.was_correct THEN current_streak + 1 
            ELSE 0 
        END,
        best_streak = GREATEST(best_streak, CASE WHEN NEW.was_correct THEN current_streak + 1 ELSE 0 END),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Soru tipine göre accuracy güncelle
    CASE NEW.question_type
        WHEN 'multiple_choice' THEN
            UPDATE user_quiz_difficulty_profile
            SET mc_accuracy = (
                SELECT COALESCE(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END), 0.5)
                FROM quiz_word_attempts
                WHERE user_id = NEW.user_id AND question_type = 'multiple_choice'
                ORDER BY created_at DESC
                LIMIT 50
            )
            WHERE user_id = NEW.user_id;
        WHEN 'cloze' THEN
            UPDATE user_quiz_difficulty_profile
            SET cloze_accuracy = (
                SELECT COALESCE(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END), 0.5)
                FROM quiz_word_attempts
                WHERE user_id = NEW.user_id AND question_type = 'cloze'
                ORDER BY created_at DESC
                LIMIT 50
            )
            WHERE user_id = NEW.user_id;
        WHEN 'matching' THEN
            UPDATE user_quiz_difficulty_profile
            SET matching_accuracy = (
                SELECT COALESCE(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END), 0.5)
                FROM quiz_word_attempts
                WHERE user_id = NEW.user_id AND question_type = 'matching'
                ORDER BY created_at DESC
                LIMIT 50
            )
            WHERE user_id = NEW.user_id;
        WHEN 'ordering' THEN
            UPDATE user_quiz_difficulty_profile
            SET ordering_accuracy = (
                SELECT COALESCE(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END), 0.5)
                FROM quiz_word_attempts
                WHERE user_id = NEW.user_id AND question_type = 'ordering'
                ORDER BY created_at DESC
                LIMIT 50
            )
            WHERE user_id = NEW.user_id;
        ELSE
            -- Diğer tipler için vocabulary_accuracy kullan
            UPDATE user_quiz_difficulty_profile
            SET vocabulary_accuracy = (
                SELECT COALESCE(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END), 0.5)
                FROM quiz_word_attempts
                WHERE user_id = NEW.user_id
                ORDER BY created_at DESC
                LIMIT 100
            )
            WHERE user_id = NEW.user_id;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quiz_difficulty ON quiz_word_attempts;
CREATE TRIGGER trigger_update_quiz_difficulty
    AFTER INSERT ON quiz_word_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_difficulty_profile();

-- =====================================================
-- 7. QUIZ ACHİEVEMENTS (Ek başarımlar)
-- =====================================================

INSERT INTO achievements (code, title_tr, description_tr, icon_url, xp_reward, condition_type, condition_value) VALUES
-- Cloze Quiz Achievements
('CLOZE_FIRST', 'İlk Boşluk Doldurma', 'İlk cloze quizini tamamladın!', '/icons/achievements/cloze_first.png', 30, 'cloze_complete', 1),
('CLOZE_MASTER', 'Boşluk Ustası', '50 cloze sorusu doğru cevapladın', '/icons/achievements/cloze_master.png', 150, 'cloze_correct', 50),

-- Matching Quiz Achievements
('MATCHING_FIRST', 'İlk Eşleştirme', 'İlk eşleştirme quizini tamamladın!', '/icons/achievements/matching_first.png', 30, 'matching_complete', 1),
('MATCHING_MASTER', 'Eşleştirme Ustası', '30 eşleştirme setini doğru tamamladın', '/icons/achievements/matching_master.png', 150, 'matching_correct', 30),

-- Ordering Quiz Achievements  
('ORDERING_FIRST', 'İlk Sıralama', 'İlk sıralama quizini tamamladın!', '/icons/achievements/ordering_first.png', 30, 'ordering_complete', 1),
('ORDERING_MASTER', 'Sıralama Ustası', '40 cümleyi doğru sıraladın', '/icons/achievements/ordering_master.png', 150, 'ordering_correct', 40),

-- Streak Achievements
('QUIZ_STREAK_5', 'Quiz Serisi 5', 'Ardışık 5 quiz sorusunu doğru cevapladın', '/icons/achievements/quiz_streak_5.png', 50, 'quiz_streak', 5),
('QUIZ_STREAK_10', 'Quiz Serisi 10', 'Ardışık 10 quiz sorusunu doğru cevapladın', '/icons/achievements/quiz_streak_10.png', 100, 'quiz_streak', 10),
('QUIZ_STREAK_25', 'Quiz Efsanesi', 'Ardışık 25 quiz sorusunu doğru cevapladın', '/icons/achievements/quiz_streak_25.png', 250, 'quiz_streak', 25),

-- Speed Achievements
('QUICK_ANSWER', 'Hızlı Cevap', '10 soruyu 3 saniyenin altında cevaplayın', '/icons/achievements/quick_answer.png', 75, 'quick_answer_count', 10),

-- Mixed Quiz Achievements
('QUIZ_VARIETY', 'Çeşitlilik Ustası', '5 farklı soru tipinde quiz tamamladın', '/icons/achievements/quiz_variety.png', 100, 'quiz_types_used', 5)

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 8. YARDIMCI FONKSİYONLAR
-- =====================================================

-- Kullanıcının belirli bir kelime için performansını getir
CREATE OR REPLACE FUNCTION get_word_quiz_stats(p_user_id UUID, p_word VARCHAR)
RETURNS TABLE (
    total_attempts INTEGER,
    correct_count INTEGER,
    accuracy DECIMAL,
    avg_response_time INTEGER,
    last_attempt_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_attempts,
        COUNT(*) FILTER (WHERE was_correct)::INTEGER as correct_count,
        COALESCE(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END), 0)::DECIMAL as accuracy,
        COALESCE(AVG(response_time_ms), 0)::INTEGER as avg_response_time,
        MAX(created_at) as last_attempt_at
    FROM quiz_word_attempts
    WHERE user_id = p_user_id AND word = p_word;
END;
$$ LANGUAGE plpgsql;

-- Kullanıcının zorlandığı kelimeleri getir
CREATE OR REPLACE FUNCTION get_struggling_words(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    word VARCHAR,
    attempts INTEGER,
    accuracy DECIMAL,
    last_wrong_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qwa.word,
        COUNT(*)::INTEGER as attempts,
        AVG(CASE WHEN qwa.was_correct THEN 1.0 ELSE 0.0 END)::DECIMAL as accuracy,
        MAX(qwa.created_at) FILTER (WHERE NOT qwa.was_correct) as last_wrong_at
    FROM quiz_word_attempts qwa
    WHERE qwa.user_id = p_user_id
    GROUP BY qwa.word
    HAVING AVG(CASE WHEN qwa.was_correct THEN 1.0 ELSE 0.0 END) < 0.5
       AND COUNT(*) >= 2
    ORDER BY accuracy ASC, attempts DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TAMAMLANDI
-- =====================================================

COMMENT ON TABLE quiz_word_attempts IS 'Kelime bazlı quiz denemeleri - SRS entegrasyonu için kullanılır';
COMMENT ON TABLE user_quiz_difficulty_profile IS 'Kullanıcı quiz zorluk profili - Adaptif zorluk sistemi için';
COMMENT ON TABLE quiz_question_templates IS 'Dinamik soru üretimi için şablonlar';
COMMENT ON TABLE quiz_sessions IS 'Quiz oturum takibi - uzun/kesintiye uğrayan quizler için';
