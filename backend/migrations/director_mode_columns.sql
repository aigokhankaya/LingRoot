-- Yönetmen Ajansı analiz sonuçlarını saklamak için
ALTER TABLE book_chapters 
ADD COLUMN IF NOT EXISTS director_analysis JSONB;

-- chapter_audio tablosu için zaten uygun yapı var, ekstra değişiklik gerekmiyor.
