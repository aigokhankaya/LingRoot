ALTER TABLE media_campaigns
  ADD COLUMN IF NOT EXISTS voice_quality VARCHAR(16) NOT NULL DEFAULT 'standard';

ALTER TABLE media_campaigns
  DROP CONSTRAINT IF EXISTS media_campaigns_voice_quality_check;

ALTER TABLE media_campaigns
  ADD CONSTRAINT media_campaigns_voice_quality_check
  CHECK (voice_quality IN ('standard', 'high'));
