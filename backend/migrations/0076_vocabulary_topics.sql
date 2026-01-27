-- =====================================================
-- Migration: 0076_vocabulary_topics.sql
-- Description: Kelime Yönetim ve AI Üretim Sistemi
-- Date: 2026-01-25
-- =====================================================

-- 1. Tüm konu tiplerini birleştiren tablo (sektör, gezgin, entellektüel)
CREATE TABLE IF NOT EXISTS vocabulary_topics (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    topic_type VARCHAR(30) NOT NULL CHECK (topic_type IN ('sector', 'travel', 'intellectual')),
    name_tr VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    description_tr TEXT,
    description_en TEXT,
    icon VARCHAR(50),
    sector_id INTEGER REFERENCES sectors(id), -- Sadece sector tipi için
    target_word_count INTEGER DEFAULT 200,
    current_word_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_topics_type ON vocabulary_topics(topic_type);
CREATE INDEX IF NOT EXISTS idx_vocab_topics_code ON vocabulary_topics(code);
CREATE INDEX IF NOT EXISTS idx_vocab_topics_active ON vocabulary_topics(is_active);

-- 2. Gezgin ve entellektüel konular için kelime tablosu (sector_vocabulary benzeri)
CREATE TABLE IF NOT EXISTS topic_vocabulary (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES vocabulary_topics(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    pronunciation VARCHAR(150),
    definition_en TEXT NOT NULL,
    definition_tr TEXT NOT NULL,
    example_sentence TEXT,
    example_sentence_tr TEXT,
    category VARCHAR(100),
    cefr_level VARCHAR(10) DEFAULT 'B1',
    frequency_rank INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, word)
);

CREATE INDEX IF NOT EXISTS idx_topic_vocab_topic ON topic_vocabulary(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_vocab_level ON topic_vocabulary(cefr_level);
CREATE INDEX IF NOT EXISTS idx_topic_vocab_word ON topic_vocabulary(word);

-- 3. AI üretim işlerini takip tablosu
CREATE TABLE IF NOT EXISTS vocabulary_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id INTEGER NOT NULL REFERENCES vocabulary_topics(id),
    target_count INTEGER DEFAULT 200,
    generated_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID,
    batch_logs JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_jobs_topic ON vocabulary_generation_jobs(topic_id);
CREATE INDEX IF NOT EXISTS idx_vocab_jobs_status ON vocabulary_generation_jobs(status);

-- =====================================================
-- SEED DATA: 77 Topics (16 sectors + 31 travel + 30 intellectual)
-- =====================================================

-- Sektörler (sectors tablosundan referansla)
INSERT INTO vocabulary_topics (code, topic_type, name_tr, name_en, description_tr, description_en, icon, sector_id, sort_order)
SELECT
    s.code,
    'sector',
    s.name_tr,
    s.name_en,
    s.description_tr,
    s.description_en,
    s.icon,
    s.id,
    s.sort_order
FROM sectors s
WHERE s.is_active = true
ON CONFLICT (code) DO NOTHING;

-- Gezgin kategorileri (31 kategori)
INSERT INTO vocabulary_topics (code, topic_type, name_tr, name_en, description_tr, description_en, icon, sort_order) VALUES
('travel_airport', 'travel', 'Havaalanı & Uçuş', 'Airport & Flight', 'Check-in, güvenlik, pasaport kontrolü', 'Check-in, security, passport control', '✈️', 1),
('travel_accommodation', 'travel', 'Otel & Konaklama', 'Hotel & Accommodation', 'Rezervasyon, oda servisi, şikayetler', 'Reservation, room service, complaints', '🏨', 2),
('travel_airbnb', 'travel', 'Airbnb & Ev Kiralama', 'Airbnb & Rentals', 'Ev sahibiyle iletişim, kurallar', 'Communication with host, rules', '🏡', 3),
('travel_transportation', 'travel', 'Şehir İçi Ulaşım', 'Public Transport', 'Metro, otobüs, bilet sistemleri', 'Metro, bus, ticket systems', '🚇', 4),
('travel_taxi', 'travel', 'Taksi & Ulaşım Apps', 'Taxi & Ride Apps', 'Uber, pazarlık, yol tarifi', 'Uber, bargaining, directions', '🚖', 5),
('travel_car_rental', 'travel', 'Araç Kiralama & Sürüş', 'Car Rental & Driving', 'Kiralama şartları, trafik kuralları', 'Rental terms, traffic rules', '🚗', 6),
('travel_dining', 'travel', 'Restoran & Yemek', 'Restaurant & Dining', 'Sipariş, menü, alerjenler, hesap', 'Ordering, menu, allergens, bill', '🍽️', 7),
('travel_street_food', 'travel', 'Sokak Lezzetleri', 'Street Food', 'Yerel tatlar, gıda pazarları', 'Local flavors, food markets', '🌮', 8),
('travel_cafe', 'travel', 'Kafe Kültürü', 'Cafe Culture', 'Kahve çeşitleri, dijital göçmenlik', 'Coffee varieties, digital nomad life', '☕', 9),
('travel_shopping', 'travel', 'Alışveriş & Pazarlık', 'Shopping', 'İade, beden, tax-free, pazarlık', 'Returns, sizes, tax-free, bargaining', '🛍️', 10),
('travel_luxury', 'travel', 'Lüks & Gurme', 'Luxury & Gourmet', 'Fine dining, concierge hizmetleri', 'Fine dining, concierge services', '💎', 11),
('travel_nightlife', 'travel', 'Gece Hayatı', 'Nightlife', 'Bar, kulüp, sosyalleşme', 'Bar, club, socializing', '🍸', 12),
('travel_social', 'travel', 'Tanışma & Small Talk', 'Meeting Locals', 'Yerlilerle sohbet, arkadaşlık', 'Chatting with locals, making friends', '🤝', 13),
('travel_museums', 'travel', 'Müze & Sanat', 'Museums & Art', 'Sergiler, rehberli turlar', 'Exhibitions, guided tours', '🖼️', 14),
('travel_landmarks', 'travel', 'Tarihi Yerler', 'Historical Landmarks', 'Tarihçe, efsaneler, kurallar', 'History, legends, rules', '🏛️', 15),
('travel_nature', 'travel', 'Doğa & Trekking', 'Nature & Hiking', 'Yürüyüş rotaları, kamp alanları', 'Hiking trails, camping areas', '🌲', 16),
('travel_beach', 'travel', 'Plaj & Deniz', 'Beach & Sea', 'Su sporları, güvenlik, güneş', 'Water sports, safety, sun', '🏖️', 17),
('travel_winter_sports', 'travel', 'Kış Sporları', 'Winter Sports', 'Kayak, ekipman kiralama', 'Skiing, equipment rental', '🏂', 18),
('travel_emergency', 'travel', 'Acil Durumlar & Polis', 'Emergencies', 'Kayıp eşya, hırsızlık, yardım', 'Lost items, theft, help', '🚨', 19),
('travel_health', 'travel', 'Sağlık & Eczane', 'Health & Pharmacy', 'Semptom anlatma, ilaç alma', 'Describing symptoms, buying medicine', '💊', 20),
('travel_wellness', 'travel', 'Wellness & Spa', 'Wellness & Spa', 'Masaj, yoga, rahatlama', 'Massage, yoga, relaxation', '🧘', 21),
('travel_connectivity', 'travel', 'İnternet & Teknoloji', 'Tech & Connectivity', 'Sim kart, Wi-Fi, adaptör', 'SIM card, Wi-Fi, adapter', '📱', 22),
('travel_banking', 'travel', 'Para & Döviz', 'Money & Exchange', 'ATM, döviz bürosu, komisyon', 'ATM, exchange office, commission', '💱', 23),
('travel_visa', 'travel', 'Vize & Göçmenlik', 'Visa & Immigration', 'Sınır kontrolü, evraklar', 'Border control, documents', '🛂', 24),
('travel_festivals', 'travel', 'Festival & Etkinlik', 'Festivals & Events', 'Konser, yerel kutlamalar', 'Concerts, local celebrations', '🎉', 25),
('travel_digital_nomad', 'travel', 'Dijital Göçmenlik', 'Digital Nomad', 'Co-working, networking', 'Co-working, networking', '💻', 26),
('travel_solo_travel', 'travel', 'Solo Seyahat', 'Solo Travel', 'Güvenlik, hosteller, tavsiyeler', 'Safety, hostels, tips', '🎒', 27),
('travel_cruise', 'travel', 'Kruvaziyer & Gemi', 'Cruise & Ship', 'Gemi yaşamı, liman turları', 'Ship life, port tours', '🚢', 28),
('travel_photography', 'travel', 'Fotoğrafçılık', 'Photography', 'İzin isteme, ekipman, noktalar', 'Asking permission, equipment, spots', '📸', 29),
('travel_sustainable', 'travel', 'Ekolojik Seyahat', 'Eco Travel', 'Sürdürülebilirlik, yerel destek', 'Sustainability, supporting locals', '♻️', 30),
('travel_family', 'travel', 'Aile ile Seyahat', 'Family Travel', 'Çocuk dostu aktiviteler, aile otelleri', 'Kid-friendly activities, family hotels', '👨‍👩‍👧‍👦', 31)
ON CONFLICT (code) DO NOTHING;

-- Entelektüel kategoriler (30 kategori)
INSERT INTO vocabulary_topics (code, topic_type, name_tr, name_en, description_tr, description_en, icon, sort_order) VALUES
('intel_ai_tech', 'intellectual', 'Yapay Zeka & Gelecek', 'AI & Futurism', 'Machine learning, etik, singularite', 'Machine learning, ethics, singularity', '🤖', 1),
('intel_philosophy', 'intellectual', 'Felsefe & Düşünce', 'Philosophy', 'Stoacılık, varoluşçuluk, etik', 'Stoicism, existentialism, ethics', '🤔', 2),
('intel_psychology', 'intellectual', 'Psikoloji & Zihin', 'Psychology', 'Davranış bilimi, kognitif önyargılar', 'Behavioral science, cognitive biases', '🧠', 3),
('intel_sociology', 'intellectual', 'Sosyoloji & Toplum', 'Sociology', 'Toplumsal dinamikler, kültürler', 'Social dynamics, cultures', '👥', 4),
('intel_anthropology', 'intellectual', 'Antropoloji', 'Anthropology', 'İnsanlık tarihi, evrim, kabileler', 'Human history, evolution, tribes', '🦴', 5),
('intel_history', 'intellectual', 'Dünya Tarihi', 'World History', 'Savaşlar, imparatorluklar, devrimler', 'Wars, empires, revolutions', '📜', 6),
('intel_ancient', 'intellectual', 'Antik Uygarlıklar', 'Ancient Civilizations', 'Mısır, Roma, Yunan, Mezopotamya', 'Egypt, Rome, Greece, Mesopotamia', '🏺', 7),
('intel_geopolitics', 'intellectual', 'Jeopolitik & Strateji', 'Geopolitics', 'Uluslararası ilişkiler, güç dengeleri', 'International relations, power balance', '🌐', 8),
('intel_economics', 'intellectual', 'Ekonomi & Finans', 'Economics', 'Makroekonomi, piyasalar, kripto', 'Macroeconomics, markets, crypto', '📈', 9),
('intel_business', 'intellectual', 'İş Dünyası & İnovasyon', 'Business & Innovation', 'Startuplar, liderlik, strateji', 'Startups, leadership, strategy', '💼', 10),
('intel_literature', 'intellectual', 'Klasik Edebiyat', 'Classic Literature', 'Dostoyevski, Orwell, Austen', 'Dostoyevsky, Orwell, Austen', '📖', 11),
('intel_cinema', 'intellectual', 'Sinema & Film Teorisi', 'Cinema Theory', 'Yönetmen sineması, senaryo, analiz', 'Auteur cinema, screenplay, analysis', '🎬', 12),
('intel_art_history', 'intellectual', 'Sanat Tarihi', 'Art History', 'Rönesans, modernizm, akımlar', 'Renaissance, modernism, movements', '🎨', 13),
('intel_architecture', 'intellectual', 'Mimari & Tasarım', 'Architecture', 'Şehir planlama, estetik, yapılar', 'Urban planning, aesthetics, buildings', '🏗️', 14),
('intel_music_theory', 'intellectual', 'Müzik & Opera', 'Music & Opera', 'Klasik batı müziği, caz, teori', 'Classical music, jazz, theory', '🎼', 15),
('intel_quantum', 'intellectual', 'Kuantum & Fizik', 'Quantum Physics', 'Evrenin kuralları, atom altı', 'Laws of universe, subatomic', '⚛️', 16),
('intel_neuroscience', 'intellectual', 'Sinirbilim', 'Neuroscience', 'Beyin plastisitesi, nöronlar', 'Brain plasticity, neurons', '🧬', 17),
('intel_climate', 'intellectual', 'Ekoloji & İklim', 'Ecology & Climate', 'Sürdürülebilirlik, yeşil enerji', 'Sustainability, green energy', '🌱', 18),
('intel_space', 'intellectual', 'Uzay & Astronomi', 'Space & Astronomy', 'Kara delikler, Mars kolonizasyonu', 'Black holes, Mars colonization', '🔭', 19),
('intel_cybersecurity', 'intellectual', 'Siber Güvenlik', 'Cybersecurity', 'Hacker kültürü, kriptografi, gizlilik', 'Hacker culture, cryptography, privacy', '🔒', 20),
('intel_law', 'intellectual', 'Hukuk & Adalet', 'Law & Justice', 'İnsan hakları, uluslararası hukuk', 'Human rights, international law', '⚖️', 21),
('intel_mythology', 'intellectual', 'Mitoloji & Efsaneler', 'Mythology', 'Yunan, İskandinav, Türk mitolojisi', 'Greek, Norse, Turkish mythology', '🐉', 22),
('intel_gastronomy', 'intellectual', 'Gastronomi Kültürü', 'Gastronomy', 'Dünya mutfakları, şarap, tarih', 'World cuisines, wine, history', '🍷', 23),
('intel_fashion', 'intellectual', 'Moda Tarihi', 'Fashion History', 'Trendler, haute couture, markalar', 'Trends, haute couture, brands', '👗', 24),
('intel_spirituality', 'intellectual', 'Spiritüalite & Farkındalık', 'Spirituality', 'Meditasyon, doğu felsefeleri', 'Meditation, eastern philosophies', '🧘‍♂️', 25),
('intel_game_theory', 'intellectual', 'Oyun Teorisi', 'Game Theory', 'Stratejik karar alma, olasılık', 'Strategic decision making, probability', '♟️', 26),
('intel_linguistics', 'intellectual', 'Dilbilim', 'Linguistics', 'Dilin kökeni, etimoloji, fonetik', 'Origin of language, etymology, phonetics', '🗣️', 27),
('intel_biographies', 'intellectual', 'Biyografiler', 'Biographies', 'Tarihe yön veren liderler', 'Leaders who shaped history', '🧔', 28),
('intel_education', 'intellectual', 'Eğitim Bilimleri', 'Education', 'Öğrenme psikolojisi, pedagoji', 'Learning psychology, pedagogy', '🎓', 29),
('intel_journalism', 'intellectual', 'Gazetecilik & Medya', 'Journalism', 'Medya okuryazarlığı, habercilik', 'Media literacy, news reporting', '📰', 30)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE vocabulary_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Vocabulary Topics: Herkes okuyabilir, admin yazabilir
CREATE POLICY "vocabulary_topics_select_policy" ON vocabulary_topics
    FOR SELECT USING (true);

CREATE POLICY "vocabulary_topics_insert_policy" ON vocabulary_topics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "vocabulary_topics_update_policy" ON vocabulary_topics
    FOR UPDATE USING (true);

CREATE POLICY "vocabulary_topics_delete_policy" ON vocabulary_topics
    FOR DELETE USING (true);

-- Topic Vocabulary: Herkes okuyabilir, admin yazabilir
CREATE POLICY "topic_vocabulary_select_policy" ON topic_vocabulary
    FOR SELECT USING (true);

CREATE POLICY "topic_vocabulary_insert_policy" ON topic_vocabulary
    FOR INSERT WITH CHECK (true);

CREATE POLICY "topic_vocabulary_update_policy" ON topic_vocabulary
    FOR UPDATE USING (true);

CREATE POLICY "topic_vocabulary_delete_policy" ON topic_vocabulary
    FOR DELETE USING (true);

-- Generation Jobs: Admin only
CREATE POLICY "vocab_generation_jobs_select_policy" ON vocabulary_generation_jobs
    FOR SELECT USING (true);

CREATE POLICY "vocab_generation_jobs_insert_policy" ON vocabulary_generation_jobs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "vocab_generation_jobs_update_policy" ON vocabulary_generation_jobs
    FOR UPDATE USING (true);

-- =====================================================
-- HELPER FUNCTION: Update topic word count
-- =====================================================

CREATE OR REPLACE FUNCTION update_topic_word_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count for the affected topic
    UPDATE vocabulary_topics
    SET current_word_count = (
        SELECT COUNT(*) FROM topic_vocabulary WHERE topic_id = COALESCE(NEW.topic_id, OLD.topic_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.topic_id, OLD.topic_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for topic_vocabulary changes
DROP TRIGGER IF EXISTS trigger_update_topic_word_count ON topic_vocabulary;
CREATE TRIGGER trigger_update_topic_word_count
    AFTER INSERT OR DELETE ON topic_vocabulary
    FOR EACH ROW
    EXECUTE FUNCTION update_topic_word_count();

-- =====================================================
-- ROLLBACK
-- =====================================================
-- DROP TRIGGER IF EXISTS trigger_update_topic_word_count ON topic_vocabulary;
-- DROP FUNCTION IF EXISTS update_topic_word_count();
-- DROP TABLE IF EXISTS vocabulary_generation_jobs;
-- DROP TABLE IF EXISTS topic_vocabulary;
-- DROP TABLE IF EXISTS vocabulary_topics;
