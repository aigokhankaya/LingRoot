-- =====================================================
-- Migration: 0077_daily_quest_descriptions.sql
-- Description: Günlük görevlere açıklama kolonu ekle
-- Date: 2026-01-25
-- =====================================================

-- daily_quests tablosuna description kolonu ekle
ALTER TABLE daily_quests
ADD COLUMN IF NOT EXISTS description TEXT;

-- Varsayılan açıklamaları güncelle (mevcut görevler için)
UPDATE daily_quests
SET description = CASE task_type
    -- Dinleme görevleri
    WHEN 'listen_minutes' THEN 'Ana sayfadan veya içerik sayfalarından bir içerik seç ve dinlemeye başla. Dinlediğin süre otomatik olarak sayılacak.'
    WHEN 'listen_content' THEN 'Ana sayfadan veya "İçeriklerim" bölümünden bir içerik seç ve dinlemeye başla.'
    WHEN 'complete_content' THEN 'Bir içeriği sonuna kadar dinleyerek tamamla. İçerik sayfasında ilerleme çubuğu %100 olduğunda tamamlanmış sayılır.'

    -- Kelime görevleri
    WHEN 'learn_words' THEN 'Kelime Kartları bölümüne git ve yeni kelimeler öğren. Her kelimeyi kartla çalıştığında sayılır.'
    WHEN 'review_words' THEN 'Kelime Kartları bölümündeki "Tekrar Et" sekmesine git ve öğrendiğin kelimeleri tekrar et.'

    -- Quiz görevleri
    WHEN 'complete_quiz' THEN 'Bir içeriği dinledikten sonra içerik sayfasındaki quiz''i tamamla.'

    -- İçerik oluşturma
    WHEN 'create_content' THEN 'Ana sayfadan "Yeni İçerik Oluştur" butonuna tıkla ve ilgi alanlarına göre içerik üret.'

    -- Sektör görevleri
    WHEN 'sector_vocab' THEN 'Sektörler sayfasına git, sektörünü seç ve sektörel kelimeleri öğren.'
    WHEN 'sector_vocabulary' THEN 'Sektörler sayfasına git, sektörünü seç ve sektörel kelimeleri öğren.'
    WHEN 'sector_content' THEN 'Sektörler sayfasından sektörel içerik dinle.'
    WHEN 'sector_quiz' THEN 'Sektörler sayfasındaki bir içeriğin quiz''ini tamamla.'
    WHEN 'sector_podcast' THEN 'Sektörler sayfasından bir podcast bölümü dinle.'
    WHEN 'sector_roleplay' THEN 'Sektörler sayfasından bir roleplay senaryosunu tamamla.'

    ELSE NULL
END
WHERE description IS NULL;

-- Comment: Açıklama kolonu görev kartlarında kullanıcıya ne yapması gerektiğini gösterir
COMMENT ON COLUMN daily_quests.description IS 'Görevin nasıl tamamlanacağını açıklayan metin';

-- Rollback:
-- ALTER TABLE daily_quests DROP COLUMN IF EXISTS description;
