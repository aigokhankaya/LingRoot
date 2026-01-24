-- =====================================================
-- Migration: 0068_sector_content_types.sql
-- Description: Yeni content type'lar ve collocation desteği
-- Date: 2026-01-19
-- =====================================================

-- 1. sector_vocabulary tablosuna ekstra alanlar
ALTER TABLE sector_vocabulary 
  ADD COLUMN IF NOT EXISTS collocations TEXT[],
  ADD COLUMN IF NOT EXISTS usage_notes TEXT,
  ADD COLUMN IF NOT EXISTS related_words TEXT[];

-- Örnek kullanım:
-- collocations: ['make a reservation', 'book a reservation', 'cancel a reservation']
-- usage_notes: 'Formal business context'
-- related_words: ['booking', 'appointment', 'schedule']

COMMENT ON COLUMN sector_vocabulary.collocations IS 'Common word combinations, e.g., ["make a", "book a"]';
COMMENT ON COLUMN sector_vocabulary.usage_notes IS 'Usage context notes, formal/informal, industry-specific tips';
COMMENT ON COLUMN sector_vocabulary.related_words IS 'Semantically related words for vocabulary expansion';
