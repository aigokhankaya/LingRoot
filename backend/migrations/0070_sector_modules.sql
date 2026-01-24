-- =====================================================
-- Migration: 0070_sector_modules.sql
-- Description: Modüler öğrenme yolu sistemi
-- Date: 2026-01-19
-- =====================================================

-- 1. Öğrenme modülleri
CREATE TABLE IF NOT EXISTS sector_modules (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    
    -- Temel bilgiler
    title VARCHAR(255) NOT NULL,
    title_tr VARCHAR(255),
    description TEXT,
    description_tr TEXT,
    
    -- Seviye ve sıralama
    cefr_level VARCHAR(10),
    module_order INTEGER NOT NULL,                   -- Sektör içindeki sıra
    
    -- Tahmini süre
    estimated_minutes INTEGER,
    
    -- Ön koşul modülü (sıralı ilerleme için)
    prerequisite_module_id INTEGER REFERENCES sector_modules(id),
    
    -- Durum
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(sector_id, module_order)
);

-- 2. Modül içerikleri (sıralı öğeler)
CREATE TABLE IF NOT EXISTS module_items (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES sector_modules(id) ON DELETE CASCADE,
    
    -- İçerik tipi ve referansı
    item_type VARCHAR(50) NOT NULL,                  -- 'vocabulary_set', 'content', 'quiz'
    
    -- Referanslar (sadece biri dolu olacak)
    content_id UUID REFERENCES sector_content(id),   -- Makale, diyalog vs.
    quiz_id UUID REFERENCES sector_quizzes(id),      -- Quiz
    vocabulary_ids INTEGER[],                         -- sector_vocabulary.id listesi
    
    -- Sıralama
    item_order INTEGER NOT NULL,
    
    -- Zorunluluk (atlanabilir mi?)
    is_required BOOLEAN DEFAULT TRUE,
    
    -- Meta
    estimated_minutes INTEGER,
    
    UNIQUE(module_id, item_order)
);

-- 3. Kullanıcı modül ilerlemesi
CREATE TABLE IF NOT EXISTS user_module_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES sector_modules(id) ON DELETE CASCADE,
    
    -- Durum
    status VARCHAR(20) DEFAULT 'locked',             -- 'locked', 'unlocked', 'in_progress', 'completed'
    
    -- İlerleme
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    total_items INTEGER,
    
    -- Zamanlar
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    
    PRIMARY KEY (user_id, module_id)
);

-- 4. Kullanıcı modül öğe ilerlemesi
CREATE TABLE IF NOT EXISTS user_module_item_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES module_items(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'not_started',        -- 'not_started', 'in_progress', 'completed', 'skipped'
    score INTEGER,                                    -- Quiz sonucu (varsa)
    completed_at TIMESTAMP,
    
    PRIMARY KEY (user_id, item_id)
);

-- 5. Indexler
CREATE INDEX IF NOT EXISTS idx_modules_sector ON sector_modules(sector_id);
CREATE INDEX IF NOT EXISTS idx_modules_level ON sector_modules(cefr_level);
CREATE INDEX IF NOT EXISTS idx_modules_order ON sector_modules(sector_id, module_order);

CREATE INDEX IF NOT EXISTS idx_module_items_module ON module_items(module_id);
CREATE INDEX IF NOT EXISTS idx_module_items_order ON module_items(module_id, item_order);

CREATE INDEX IF NOT EXISTS idx_user_module_progress_user ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_status ON user_module_progress(status);

-- 6. RLS Policies
ALTER TABLE sector_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_item_progress ENABLE ROW LEVEL SECURITY;

-- Modüller: Aktif olanlar herkes tarafından görülebilir
CREATE POLICY "sector_modules_select_policy" ON sector_modules
    FOR SELECT USING (is_active = true);

CREATE POLICY "module_items_select_policy" ON module_items
    FOR SELECT USING (true);

-- İlerleme: Kullanıcı sadece kendi ilerlemesini görebilir
CREATE POLICY "user_module_progress_policy" ON user_module_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_module_item_progress_policy" ON user_module_item_progress
    FOR ALL USING (auth.uid() = user_id);

-- 7. Modül tamamlama achievements
INSERT INTO achievements (code, title_tr, description_tr, icon_url, xp_reward, condition_type, condition_value) VALUES
('SECTOR_MODULE_FIRST', 'İlk Modül', 'İlk sektör modülünü tamamladın!', '/icons/achievements/module_first.png', 100, 'sector_module_complete', 1),
('SECTOR_MODULE_5', 'Modül Koleksiyoncusu', '5 sektör modülü tamamladın', '/icons/achievements/module_collector.png', 300, 'sector_module_complete', 5),
('SECTOR_MASTER', 'Sektör Ustası', 'Bir sektörün tüm modüllerini tamamladın', '/icons/achievements/sector_complete.png', 500, 'sector_all_modules', 1)
ON CONFLICT (code) DO NOTHING;
