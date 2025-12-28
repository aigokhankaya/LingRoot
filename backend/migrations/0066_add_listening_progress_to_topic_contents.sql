-- Migration: 0066_add_listening_progress_to_topic_contents.sql
-- Description: Yarıda kalan dinleme takibi için topic_contents tablosuna pozisyon ve ilerleme alanları eklenir
-- Date: 2025-12-28

-- Dinleme pozisyonu (saniye cinsinden)
ALTER TABLE topic_contents 
ADD COLUMN IF NOT EXISTS last_position_seconds FLOAT DEFAULT 0;

-- Toplam süre (saniye cinsinden)
ALTER TABLE topic_contents 
ADD COLUMN IF NOT EXISTS total_duration_seconds FLOAT DEFAULT 0;

-- İlerleme yüzdesi (0-100)
ALTER TABLE topic_contents 
ADD COLUMN IF NOT EXISTS progress_percentage FLOAT DEFAULT 0;

-- Son dinleme tarihi
ALTER TABLE topic_contents 
ADD COLUMN IF NOT EXISTS last_listened_at TIMESTAMP WITH TIME ZONE;

-- Tamamlanma durumu (progress >= 90% ise true)
ALTER TABLE topic_contents 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Performans için index
CREATE INDEX IF NOT EXISTS idx_topic_contents_incomplete 
ON topic_contents (topic_id, is_completed) 
WHERE is_completed = FALSE AND last_position_seconds > 0;

-- Kullanıcı bazlı yarıda kalan içerikleri hızlı sorgulamak için
CREATE INDEX IF NOT EXISTS idx_topic_contents_user_incomplete 
ON topic_contents (topic_id, last_listened_at DESC) 
WHERE is_completed = FALSE AND last_position_seconds > 0;

COMMENT ON COLUMN topic_contents.last_position_seconds IS 'Kullanıcının en son dinlediği pozisyon (saniye)';
COMMENT ON COLUMN topic_contents.total_duration_seconds IS 'Sesin toplam süresi (saniye)';
COMMENT ON COLUMN topic_contents.progress_percentage IS 'Dinleme ilerleme yüzdesi (0-100)';
COMMENT ON COLUMN topic_contents.last_listened_at IS 'Son dinleme tarihi';
COMMENT ON COLUMN topic_contents.is_completed IS 'Dinleme tamamlandı mı (>= 90%)';
