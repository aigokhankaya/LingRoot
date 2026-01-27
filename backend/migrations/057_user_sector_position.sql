-- =====================================================
-- Migration: 057_user_sector_position.sql
-- Description: Kullanıcı sektör pozisyon bilgisi ekleme
-- Date: 2026-01-23
-- =====================================================

-- 1. user_sectors tablosuna pozisyon alanları ekle
ALTER TABLE user_sectors 
ADD COLUMN IF NOT EXISTS job_position VARCHAR(100),
ADD COLUMN IF NOT EXISTS job_position_en VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS company_size VARCHAR(20);

-- 2. Alan açıklamaları
COMMENT ON COLUMN user_sectors.job_position IS 'Kullanıcının sektördeki pozisyonu (Türkçe)';
COMMENT ON COLUMN user_sectors.job_position_en IS 'Kullanıcının sektördeki pozisyonu (İngilizce)';
COMMENT ON COLUMN user_sectors.years_experience IS 'Sektördeki deneyim yılı';
COMMENT ON COLUMN user_sectors.company_name IS 'Şirket adı (opsiyonel)';
COMMENT ON COLUMN user_sectors.company_size IS 'Şirket büyüklüğü: startup, small, medium, large, enterprise';

-- 3. Pozisyon için index
CREATE INDEX IF NOT EXISTS idx_user_sectors_position ON user_sectors(job_position);

-- 4. Örnek pozisyon şablonları tablosu (AI önerileri için)
CREATE TABLE IF NOT EXISTS sector_position_templates (
    id SERIAL PRIMARY KEY,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    position_tr VARCHAR(100) NOT NULL,
    position_en VARCHAR(100) NOT NULL,
    level VARCHAR(20) DEFAULT 'mid', -- entry, mid, senior, executive
    is_common BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_position_templates_sector ON sector_position_templates(sector_id);

-- RLS
ALTER TABLE sector_position_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "position_templates_select_policy" ON sector_position_templates
    FOR SELECT USING (true);

-- 5. Yaygın pozisyon şablonlarını ekle
INSERT INTO sector_position_templates (sector_id, position_tr, position_en, level, sort_order) VALUES
-- IT & Software (sector_id = 1)
((SELECT id FROM sectors WHERE code = 'it_software'), 'Yazılım Geliştirici', 'Software Developer', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'it_software'), 'Kıdemli Yazılım Mühendisi', 'Senior Software Engineer', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'it_software'), 'Teknik Lider', 'Tech Lead', 'senior', 3),
((SELECT id FROM sectors WHERE code = 'it_software'), 'IT Müdürü', 'IT Manager', 'executive', 4),
((SELECT id FROM sectors WHERE code = 'it_software'), 'DevOps Mühendisi', 'DevOps Engineer', 'mid', 5),

-- Finance (sector_id = 2)
((SELECT id FROM sectors WHERE code = 'finance'), 'Finans Analisti', 'Financial Analyst', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'finance'), 'Muhasebe Müdürü', 'Accounting Manager', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'finance'), 'CFO', 'Chief Financial Officer', 'executive', 3),
((SELECT id FROM sectors WHERE code = 'finance'), 'Banka Şube Müdürü', 'Bank Branch Manager', 'senior', 4),

-- Tourism (sector_id = 3)
((SELECT id FROM sectors WHERE code = 'tourism'), 'Otel Resepsiyonisti', 'Hotel Receptionist', 'entry', 1),
((SELECT id FROM sectors WHERE code = 'tourism'), 'Tur Operatörü', 'Tour Operator', 'mid', 2),
((SELECT id FROM sectors WHERE code = 'tourism'), 'Otel Genel Müdürü', 'Hotel General Manager', 'executive', 3),

-- Logistics (sector_id = 4)
((SELECT id FROM sectors WHERE code = 'logistics'), 'Lojistik Koordinatörü', 'Logistics Coordinator', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'logistics'), 'Tedarik Zinciri Yöneticisi', 'Supply Chain Manager', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'logistics'), 'Lojistik Direktörü', 'Logistics Director', 'executive', 3),
((SELECT id FROM sectors WHERE code = 'logistics'), 'Depo Müdürü', 'Warehouse Manager', 'senior', 4),
((SELECT id FROM sectors WHERE code = 'logistics'), 'Gümrük Müşaviri', 'Customs Broker', 'mid', 5),

-- Healthcare (sector_id = 5)
((SELECT id FROM sectors WHERE code = 'healthcare'), 'Hemşire', 'Nurse', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'healthcare'), 'Doktor', 'Doctor', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'healthcare'), 'Hastane Yöneticisi', 'Hospital Administrator', 'executive', 3),

-- Legal (sector_id = 7)
((SELECT id FROM sectors WHERE code = 'legal'), 'Avukat', 'Lawyer', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'legal'), 'Hukuk Müşaviri', 'Legal Counsel', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'legal'), 'Hukuk Direktörü', 'Legal Director', 'executive', 3),

-- Marketing (sector_id = 9)
((SELECT id FROM sectors WHERE code = 'marketing'), 'Dijital Pazarlama Uzmanı', 'Digital Marketing Specialist', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'marketing'), 'Marka Yöneticisi', 'Brand Manager', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'marketing'), 'CMO', 'Chief Marketing Officer', 'executive', 3),

-- HR (sector_id = 13)
((SELECT id FROM sectors WHERE code = 'hr'), 'İK Uzmanı', 'HR Specialist', 'mid', 1),
((SELECT id FROM sectors WHERE code = 'hr'), 'İK Müdürü', 'HR Manager', 'senior', 2),
((SELECT id FROM sectors WHERE code = 'hr'), 'İK Direktörü', 'HR Director', 'executive', 3)

ON CONFLICT DO NOTHING;
