-- Migration: add_duration_seconds_to_contenthistory.sql
-- Description: Add duration_seconds column to contenthistory for fast aggregate queries
-- Instead of parsing timepoints JSON on every request, pre-compute duration.

-- 1. Add column
ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- 2. Backfill existing records from timepoints JSON (last timestamp)
-- Row-level exception handling: malformed JSON rows are skipped safely
DO $$
DECLARE
  r RECORD;
  tp_jsonb JSONB;
  last_time NUMERIC;
BEGIN
  FOR r IN
    SELECT id, timepoints
    FROM contenthistory
    WHERE duration_seconds = 0
      AND timepoints IS NOT NULL
      AND timepoints LIKE '[%'
  LOOP
    BEGIN
      tp_jsonb := r.timepoints::jsonb;
      IF jsonb_array_length(tp_jsonb) > 0 THEN
        last_time := COALESCE(
          (tp_jsonb->(jsonb_array_length(tp_jsonb) - 1)->>'endTimeSeconds')::NUMERIC,
          (tp_jsonb->(jsonb_array_length(tp_jsonb) - 1)->>'timeSeconds')::NUMERIC,
          0
        );
        IF last_time > 0 THEN
          UPDATE contenthistory SET duration_seconds = CAST(last_time AS INTEGER) WHERE id = r.id;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping row % - invalid JSON', r.id;
    END;
  END LOOP;
END $$;

-- 3. Performance index for user duration aggregation
CREATE INDEX IF NOT EXISTS idx_contenthistory_user_duration
ON contenthistory(user_id, duration_seconds);
