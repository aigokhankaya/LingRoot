-- =====================================================
-- Migration: 0064_sectors_table.sql
-- Description: Sektör İngilizcesi - Temel sektör tabloları
-- Date: 2026-01-19
-- =====================================================

-- 1. Sektör tanımları tablosu
CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_tr VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_tr TEXT,
    description_en TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    sub_categories TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Kullanıcı sektör tercihleri tablosu
CREATE TABLE IF NOT EXISTS user_sectors (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sector_id INTEGER REFERENCES sectors(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    proficiency_level VARCHAR(20) DEFAULT 'beginner',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, sector_id)
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_sectors_code ON sectors(code);
CREATE INDEX IF NOT EXISTS idx_sectors_active ON sectors(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sectors_user ON user_sectors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sectors_sector ON user_sectors(sector_id);

-- 3. Varsayılan sektörleri ekle
INSERT INTO sectors (code, name_tr, name_en, icon, color, sort_order, description_tr, description_en) VALUES
('it_software', 'Bilişim ve Yazılım', 'IT & Software', 'code', '#6366F1', 1, 'Yazılım geliştirme, programlama ve bilişim teknolojileri', 'Software development, programming and information technology'),
('finance', 'Finans ve Bankacılık', 'Finance & Banking', 'chart-line', '#10B981', 2, 'Banka işlemleri, yatırım, muhasebe ve finans yönetimi', 'Banking, investment, accounting and financial management'),
('tourism', 'Turizm ve Otelcilik', 'Tourism & Hospitality', 'plane', '#F59E0B', 3, 'Otel, seyahat, restoran ve konaklama hizmetleri', 'Hotel, travel, restaurant and accommodation services'),
('logistics', 'Lojistik ve Dış Ticaret', 'Logistics & Foreign Trade', 'truck', '#3B82F6', 4, 'Depo yönetimi, tedarik zinciri, uluslararası nakliye ve gümrük', 'Warehouse management, supply chain, international shipping and customs'),
('healthcare', 'Sağlık ve Hastane', 'Healthcare & Hospital', 'heart-pulse', '#EF4444', 5, 'Hastane, klinik, hemşirelik ve tıbbi hizmetler', 'Hospital, clinic, nursing and medical services'),
('medical_tourism', 'Sağlık Turizmi', 'Medical Tourism', 'stethoscope', '#EC4899', 6, 'Medikal turizm, hasta kabul ve uluslararası sağlık hizmetleri', 'Medical tourism, patient admission and international health services'),
('legal', 'Hukuk', 'Legal', 'scale', '#8B5CF6', 7, 'Avukatlık, sözleşmeler, ticaret hukuku ve yasal süreçler', 'Law practice, contracts, commercial law and legal processes'),
('automotive', 'Otomotiv', 'Automotive', 'car', '#6B7280', 8, 'Araç üretimi, satış, servis ve yedek parça', 'Vehicle manufacturing, sales, service and spare parts'),
('marketing', 'Pazarlama ve Dijital', 'Marketing & Digital', 'megaphone', '#F97316', 9, 'Dijital pazarlama, reklam, marka yönetimi ve sosyal medya', 'Digital marketing, advertising, brand management and social media'),
('engineering', 'Mühendislik', 'Engineering', 'wrench', '#0EA5E9', 10, 'İnşaat, makine, elektrik ve endüstriyel mühendislik', 'Construction, mechanical, electrical and industrial engineering'),
('retail', 'Perakende ve Satış', 'Retail & Sales', 'shopping-cart', '#84CC16', 11, 'Mağaza yönetimi, satış teknikleri ve müşteri ilişkileri', 'Store management, sales techniques and customer relations'),
('education', 'Eğitim ve Akademi', 'Education & Academia', 'graduation-cap', '#A855F7', 12, 'Öğretim, akademik yazım ve eğitim yönetimi', 'Teaching, academic writing and education management'),
('hr', 'İnsan Kaynakları', 'Human Resources', 'users', '#14B8A6', 13, 'İşe alım, performans yönetimi ve çalışan ilişkileri', 'Recruitment, performance management and employee relations'),
('real_estate', 'Gayrimenkul', 'Real Estate', 'building', '#78716C', 14, 'Emlak satışı, kiralama ve mülk yönetimi', 'Property sales, leasing and property management'),
('aviation', 'Havacılık', 'Aviation', 'plane-departure', '#0369A1', 15, 'Havayolu operasyonları, uçuş hizmetleri ve havacılık terimleri', 'Airline operations, flight services and aviation terminology'),
('manufacturing', 'Üretim ve İmalat', 'Manufacturing', 'industry', '#D97706', 16, 'Fabrika üretimi, kalite kontrol ve endüstriyel süreçler', 'Factory production, quality control and industrial processes')
ON CONFLICT (code) DO NOTHING;

-- RLS Policies
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sectors ENABLE ROW LEVEL SECURITY;

-- Sectors: Herkes okuyabilir
CREATE POLICY "sectors_select_policy" ON sectors
    FOR SELECT USING (true);

-- Sectors: Sadece admin yazabilir (admin kontrolü backend'de yapılacak)
CREATE POLICY "sectors_insert_policy" ON sectors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "sectors_update_policy" ON sectors
    FOR UPDATE USING (true);

-- User Sectors: Kullanıcı kendi kayıtlarını görebilir
CREATE POLICY "user_sectors_select_policy" ON user_sectors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_sectors_insert_policy" ON user_sectors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sectors_update_policy" ON user_sectors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_sectors_delete_policy" ON user_sectors
    FOR DELETE USING (auth.uid() = user_id);
