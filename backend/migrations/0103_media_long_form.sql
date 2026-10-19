ALTER TABLE media_campaigns
  DROP CONSTRAINT IF EXISTS media_campaigns_target_duration_seconds_check;

ALTER TABLE media_campaigns
  ADD CONSTRAINT media_campaigns_target_duration_seconds_check
  CHECK (target_duration_seconds BETWEEN 15 AND 600);
