CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS media_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    topic TEXT NOT NULL,
    language VARCHAR(12) NOT NULL DEFAULT 'en',
    objective VARCHAR(32) NOT NULL DEFAULT 'education',
    tone VARCHAR(32) NOT NULL DEFAULT 'educational',
    cta TEXT,
    visual_style VARCHAR(64) NOT NULL DEFAULT 'documentary',
    voice_profile VARCHAR(64) NOT NULL DEFAULT 'english_female',
    levels TEXT[] NOT NULL DEFAULT ARRAY['A1','A2','B1','B2','C1','C2'],
    scene_count SMALLINT NOT NULL DEFAULT 4 CHECK (scene_count BETWEEN 1 AND 12),
    target_duration_seconds SMALLINT NOT NULL DEFAULT 45 CHECK (target_duration_seconds BETWEEN 15 AND 180),
    subtitles_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    human_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    current_stage VARCHAR(64) NOT NULL DEFAULT 'draft',
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    review_notes TEXT,
    error_message TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_campaign_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES media_campaigns(id) ON DELETE CASCADE,
    platform VARCHAR(24) NOT NULL CHECK (platform IN ('youtube','instagram','x','tiktok')),
    format VARCHAR(32) NOT NULL DEFAULT 'vertical_video',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    caption TEXT,
    title TEXT,
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    scheduled_at TIMESTAMPTZ,
    external_post_id TEXT,
    external_url TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, platform)
);

CREATE TABLE IF NOT EXISTS media_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES media_campaigns(id) ON DELETE CASCADE,
    status VARCHAR(24) NOT NULL DEFAULT 'queued',
    stage VARCHAR(64) NOT NULL DEFAULT 'queued',
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    attempt SMALLINT NOT NULL DEFAULT 0,
    max_attempts SMALLINT NOT NULL DEFAULT 3,
    priority SMALLINT NOT NULL DEFAULT 5,
    worker_id VARCHAR(160),
    lease_token UUID,
    lease_expires_at TIMESTAMPTZ,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES media_campaigns(id) ON DELETE CASCADE,
    target_id UUID REFERENCES media_campaign_targets(id) ON DELETE CASCADE,
    level VARCHAR(4),
    kind VARCHAR(32) NOT NULL,
    uri TEXT NOT NULL,
    content_type VARCHAR(120),
    bytes BIGINT,
    duration_seconds NUMERIC(8,3),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_campaigns_status_updated ON media_campaigns(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_targets_campaign ON media_campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_media_jobs_claim ON media_generation_jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_media_jobs_campaign ON media_generation_jobs(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_artifacts_campaign ON media_artifacts(campaign_id, level, kind);
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_jobs_one_active
    ON media_generation_jobs(campaign_id)
    WHERE status IN ('queued', 'processing');

ALTER TABLE media_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_artifacts ENABLE ROW LEVEL SECURITY;
