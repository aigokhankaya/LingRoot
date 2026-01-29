-- Voice ID Migration: Old tier-based IDs → New Google voice-based IDs
-- Run this in Supabase SQL Editor
-- Date: 2026-01-29
--
-- Affected tables:
--   topic_contents.voice_model
--   contenthistory.tts_voice_name
--   chapter_audio.voice_model
--
-- NOTE: Some old IDs map to the same new ID (duplicates merged).
-- This is intentional — the new system has 1 Google voice = 1 Lingroot ID.

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. topic_contents.voice_model
-- ═══════════════════════════════════════════════

UPDATE topic_contents SET voice_model = 'lr_us_standard_c'  WHERE voice_model = 'lr_us_female_basic_1';
UPDATE topic_contents SET voice_model = 'lr_us_neural2_h'   WHERE voice_model = 'lr_us_female_silver_1';
UPDATE topic_contents SET voice_model = 'lr_us_chirphd_f'   WHERE voice_model IN ('lr_us_female_gold_1', 'lr_us_female_generative_1', 'lr_us_female_gold_2');
UPDATE topic_contents SET voice_model = 'lr_us_standard_d'  WHERE voice_model = 'lr_us_male_basic_1';
UPDATE topic_contents SET voice_model = 'lr_us_neural2_j'   WHERE voice_model = 'lr_us_male_silver_1';
UPDATE topic_contents SET voice_model = 'lr_us_chirphd_d'   WHERE voice_model IN ('lr_us_male_gold_1', 'lr_us_male_generative_1', 'lr_us_male_gold_2');
UPDATE topic_contents SET voice_model = 'lr_gb_standard_a'  WHERE voice_model = 'lr_gb_female_basic_1';
UPDATE topic_contents SET voice_model = 'lr_gb_neural2_c'   WHERE voice_model IN ('lr_gb_female_silver_1', 'lr_gb_female_generative_1');
UPDATE topic_contents SET voice_model = 'lr_gb_standard_b'  WHERE voice_model = 'lr_gb_male_basic_1';
UPDATE topic_contents SET voice_model = 'lr_gb_neural2_b'   WHERE voice_model IN ('lr_gb_male_silver_1', 'lr_gb_male_generative_1');
UPDATE topic_contents SET voice_model = 'lr_au_standard_c'  WHERE voice_model = 'lr_au_female_basic_1';
UPDATE topic_contents SET voice_model = 'lr_au_neural2_a'   WHERE voice_model = 'lr_au_female_silver_1';
UPDATE topic_contents SET voice_model = 'lr_in_standard_a'  WHERE voice_model = 'lr_in_female_basic_1';
UPDATE topic_contents SET voice_model = 'lr_in_wavenet_a'   WHERE voice_model = 'lr_in_female_silver_1';
UPDATE topic_contents SET voice_model = 'lr_us_studio_o'    WHERE voice_model IN ('lr_us_male_platinum_1', 'lr_us_female_platinum_1');

-- ═══════════════════════════════════════════════
-- 2. contenthistory.tts_voice_name
-- ═══════════════════════════════════════════════

UPDATE contenthistory SET tts_voice_name = 'lr_us_standard_c'  WHERE tts_voice_name = 'lr_us_female_basic_1';
UPDATE contenthistory SET tts_voice_name = 'lr_us_neural2_h'   WHERE tts_voice_name = 'lr_us_female_silver_1';
UPDATE contenthistory SET tts_voice_name = 'lr_us_chirphd_f'   WHERE tts_voice_name IN ('lr_us_female_gold_1', 'lr_us_female_generative_1', 'lr_us_female_gold_2');
UPDATE contenthistory SET tts_voice_name = 'lr_us_standard_d'  WHERE tts_voice_name = 'lr_us_male_basic_1';
UPDATE contenthistory SET tts_voice_name = 'lr_us_neural2_j'   WHERE tts_voice_name = 'lr_us_male_silver_1';
UPDATE contenthistory SET tts_voice_name = 'lr_us_chirphd_d'   WHERE tts_voice_name IN ('lr_us_male_gold_1', 'lr_us_male_generative_1', 'lr_us_male_gold_2');
UPDATE contenthistory SET tts_voice_name = 'lr_gb_standard_a'  WHERE tts_voice_name = 'lr_gb_female_basic_1';
UPDATE contenthistory SET tts_voice_name = 'lr_gb_neural2_c'   WHERE tts_voice_name IN ('lr_gb_female_silver_1', 'lr_gb_female_generative_1');
UPDATE contenthistory SET tts_voice_name = 'lr_gb_standard_b'  WHERE tts_voice_name = 'lr_gb_male_basic_1';
UPDATE contenthistory SET tts_voice_name = 'lr_gb_neural2_b'   WHERE tts_voice_name IN ('lr_gb_male_silver_1', 'lr_gb_male_generative_1');
UPDATE contenthistory SET tts_voice_name = 'lr_au_standard_c'  WHERE tts_voice_name = 'lr_au_female_basic_1';
UPDATE contenthistory SET tts_voice_name = 'lr_au_neural2_a'   WHERE tts_voice_name = 'lr_au_female_silver_1';
UPDATE contenthistory SET tts_voice_name = 'lr_in_standard_a'  WHERE tts_voice_name = 'lr_in_female_basic_1';
UPDATE contenthistory SET tts_voice_name = 'lr_in_wavenet_a'   WHERE tts_voice_name = 'lr_in_female_silver_1';
UPDATE contenthistory SET tts_voice_name = 'lr_us_studio_o'    WHERE tts_voice_name IN ('lr_us_male_platinum_1', 'lr_us_female_platinum_1');

-- ═══════════════════════════════════════════════
-- 3. chapter_audio.voice_model
-- ═══════════════════════════════════════════════
-- NOTE: chapter_audio has a composite unique key (chapter_id, voice_model, speaking_rate, level).
-- If duplicate rows emerge after rename (two old IDs mapping to same new ID for same chapter),
-- keep only the most recent one and delete the older duplicate.

-- First, handle potential duplicates by removing older entries
DELETE FROM chapter_audio a
USING chapter_audio b
WHERE a.chapter_id = b.chapter_id
  AND a.speaking_rate = b.speaking_rate
  AND a.level = b.level
  AND a.voice_model IN ('lr_us_female_gold_1', 'lr_us_female_generative_1', 'lr_us_female_gold_2')
  AND b.voice_model IN ('lr_us_female_gold_1', 'lr_us_female_generative_1', 'lr_us_female_gold_2')
  AND a.voice_model <> b.voice_model
  AND a.created_at < b.created_at;

DELETE FROM chapter_audio a
USING chapter_audio b
WHERE a.chapter_id = b.chapter_id
  AND a.speaking_rate = b.speaking_rate
  AND a.level = b.level
  AND a.voice_model IN ('lr_us_male_gold_1', 'lr_us_male_generative_1', 'lr_us_male_gold_2')
  AND b.voice_model IN ('lr_us_male_gold_1', 'lr_us_male_generative_1', 'lr_us_male_gold_2')
  AND a.voice_model <> b.voice_model
  AND a.created_at < b.created_at;

DELETE FROM chapter_audio a
USING chapter_audio b
WHERE a.chapter_id = b.chapter_id
  AND a.speaking_rate = b.speaking_rate
  AND a.level = b.level
  AND a.voice_model IN ('lr_gb_female_silver_1', 'lr_gb_female_generative_1')
  AND b.voice_model IN ('lr_gb_female_silver_1', 'lr_gb_female_generative_1')
  AND a.voice_model <> b.voice_model
  AND a.created_at < b.created_at;

DELETE FROM chapter_audio a
USING chapter_audio b
WHERE a.chapter_id = b.chapter_id
  AND a.speaking_rate = b.speaking_rate
  AND a.level = b.level
  AND a.voice_model IN ('lr_gb_male_silver_1', 'lr_gb_male_generative_1')
  AND b.voice_model IN ('lr_gb_male_silver_1', 'lr_gb_male_generative_1')
  AND a.voice_model <> b.voice_model
  AND a.created_at < b.created_at;

DELETE FROM chapter_audio a
USING chapter_audio b
WHERE a.chapter_id = b.chapter_id
  AND a.speaking_rate = b.speaking_rate
  AND a.level = b.level
  AND a.voice_model IN ('lr_us_male_platinum_1', 'lr_us_female_platinum_1')
  AND b.voice_model IN ('lr_us_male_platinum_1', 'lr_us_female_platinum_1')
  AND a.voice_model <> b.voice_model
  AND a.created_at < b.created_at;

-- Now apply the renames
UPDATE chapter_audio SET voice_model = 'lr_us_standard_c'  WHERE voice_model = 'lr_us_female_basic_1';
UPDATE chapter_audio SET voice_model = 'lr_us_neural2_h'   WHERE voice_model = 'lr_us_female_silver_1';
UPDATE chapter_audio SET voice_model = 'lr_us_chirphd_f'   WHERE voice_model IN ('lr_us_female_gold_1', 'lr_us_female_generative_1', 'lr_us_female_gold_2');
UPDATE chapter_audio SET voice_model = 'lr_us_standard_d'  WHERE voice_model = 'lr_us_male_basic_1';
UPDATE chapter_audio SET voice_model = 'lr_us_neural2_j'   WHERE voice_model = 'lr_us_male_silver_1';
UPDATE chapter_audio SET voice_model = 'lr_us_chirphd_d'   WHERE voice_model IN ('lr_us_male_gold_1', 'lr_us_male_generative_1', 'lr_us_male_gold_2');
UPDATE chapter_audio SET voice_model = 'lr_gb_standard_a'  WHERE voice_model = 'lr_gb_female_basic_1';
UPDATE chapter_audio SET voice_model = 'lr_gb_neural2_c'   WHERE voice_model IN ('lr_gb_female_silver_1', 'lr_gb_female_generative_1');
UPDATE chapter_audio SET voice_model = 'lr_gb_standard_b'  WHERE voice_model = 'lr_gb_male_basic_1';
UPDATE chapter_audio SET voice_model = 'lr_gb_neural2_b'   WHERE voice_model IN ('lr_gb_male_silver_1', 'lr_gb_male_generative_1');
UPDATE chapter_audio SET voice_model = 'lr_au_standard_c'  WHERE voice_model = 'lr_au_female_basic_1';
UPDATE chapter_audio SET voice_model = 'lr_au_neural2_a'   WHERE voice_model = 'lr_au_female_silver_1';
UPDATE chapter_audio SET voice_model = 'lr_in_standard_a'  WHERE voice_model = 'lr_in_female_basic_1';
UPDATE chapter_audio SET voice_model = 'lr_in_wavenet_a'   WHERE voice_model = 'lr_in_female_silver_1';
UPDATE chapter_audio SET voice_model = 'lr_us_studio_o'    WHERE voice_model IN ('lr_us_male_platinum_1', 'lr_us_female_platinum_1');

COMMIT;

-- ═══════════════════════════════════════════════
-- Verification queries (run after migration)
-- ═══════════════════════════════════════════════

-- Check for any remaining old IDs
-- SELECT DISTINCT voice_model FROM topic_contents WHERE voice_model LIKE 'lr_%_female_%' OR voice_model LIKE 'lr_%_male_%';
-- SELECT DISTINCT tts_voice_name FROM contenthistory WHERE tts_voice_name LIKE 'lr_%_female_%' OR tts_voice_name LIKE 'lr_%_male_%';
-- SELECT DISTINCT voice_model FROM chapter_audio WHERE voice_model LIKE 'lr_%_female_%' OR voice_model LIKE 'lr_%_male_%';
