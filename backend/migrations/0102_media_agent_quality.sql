CREATE TABLE IF NOT EXISTS media_quality_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES media_campaigns(id) ON DELETE CASCADE,
    generation_job_id UUID REFERENCES media_generation_jobs(id) ON DELETE SET NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued','processing','completed','failed','cancelled')),
    mode VARCHAR(16) NOT NULL DEFAULT 'shadow'
        CHECK (mode IN ('shadow','enforced')),
    stage VARCHAR(64) NOT NULL DEFAULT 'queued',
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    rubric_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    provider VARCHAR(32),
    model VARCHAR(120),
    overall_score NUMERIC(5,2),
    recommendation VARCHAR(32)
        CHECK (recommendation IS NULL OR recommendation IN ('accept','human_review','repair_required','blocked')),
    summary TEXT,
    dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    prompt_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
    package_ref TEXT,
    attempt SMALLINT NOT NULL DEFAULT 0,
    max_attempts SMALLINT NOT NULL DEFAULT 3,
    worker_id VARCHAR(160),
    lease_token UUID,
    lease_expires_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_quality_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_run_id UUID NOT NULL REFERENCES media_quality_runs(id) ON DELETE CASCADE,
    agent_type VARCHAR(24) NOT NULL
        CHECK (agent_type IN ('content','visual','av_sync','platform','supervisor')),
    scope VARCHAR(24) NOT NULL DEFAULT 'package',
    level VARCHAR(4),
    scene_id VARCHAR(80),
    platform VARCHAR(24),
    score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    confidence NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    summary TEXT NOT NULL,
    dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(120) NOT NULL,
    prompt_version VARCHAR(32) NOT NULL,
    usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_quality_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_run_id UUID NOT NULL REFERENCES media_quality_runs(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES media_quality_assessments(id) ON DELETE CASCADE,
    agent_type VARCHAR(24) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
    category VARCHAR(80) NOT NULL,
    scope VARCHAR(24) NOT NULL DEFAULT 'package',
    level VARCHAR(4),
    scene_id VARCHAR(80),
    platform VARCHAR(24),
    artifact_uri TEXT,
    evidence TEXT NOT NULL,
    suggested_action VARCHAR(48) NOT NULL,
    auto_fixable BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(24) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','accepted','dismissed','resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_quality_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_run_id UUID NOT NULL REFERENCES media_quality_runs(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES media_quality_findings(id) ON DELETE CASCADE,
    decision VARCHAR(24) NOT NULL CHECK (decision IN ('agree','disagree','override_accept','request_repair')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_quality_claim
    ON media_quality_runs(status, created_at)
    WHERE status IN ('queued','processing');
CREATE INDEX IF NOT EXISTS idx_media_quality_campaign
    ON media_quality_runs(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_quality_assessments_run
    ON media_quality_assessments(quality_run_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_media_quality_findings_run
    ON media_quality_findings(quality_run_id, severity, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_quality_one_active
    ON media_quality_runs(campaign_id)
    WHERE status IN ('queued','processing');

ALTER TABLE media_quality_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_quality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_quality_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_quality_feedback ENABLE ROW LEVEL SECURITY;
