const { pool } = require('../config/db.js');
const {
  MEDIA_PLATFORMS,
  MEDIA_LEVELS,
  MEDIA_OBJECTIVES,
  MEDIA_TONES,
  MEDIA_FORMATS,
  MEDIA_VOICE_PROFILES,
  MEDIA_AUDIO_QUALITIES,
  YOUTUBE_LONG_DURATION_SECONDS,
  YOUTUBE_PRIVACY_STATUSES,
  YOUTUBE_CATEGORY_IDS,
} = require('../constants/mediaFactory.js');

class MediaValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'MediaValidationError';
    this.statusCode = statusCode;
  }
}

function normalizeTargetConfig(target) {
  const raw = target.config ?? {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new MediaValidationError('Platform ayarları nesne olmalıdır.');
  }
  if (target.platform !== 'youtube') return raw;

  const privacyStatus = raw.privacyStatus ?? 'private';
  const categoryId = String(raw.categoryId ?? '27');
  const madeForKids = raw.madeForKids ?? false;
  if (!YOUTUBE_PRIVACY_STATUSES.includes(privacyStatus)) {
    throw new MediaValidationError('YouTube gizlilik seçimi private veya public olmalıdır.');
  }
  if (!YOUTUBE_CATEGORY_IDS.includes(categoryId)) {
    throw new MediaValidationError('Geçersiz YouTube kategorisi.');
  }
  if (typeof madeForKids !== 'boolean') {
    throw new MediaValidationError('YouTube çocuk içeriği beyanı doğru/yanlış olmalıdır.');
  }
  return { privacyStatus, categoryId, madeForKids };
}

function normalizeTarget(target) {
  const title = typeof target.title === 'string' ? target.title.trim() || null : null;
  const caption = typeof target.caption === 'string' ? target.caption.trim() || null : null;
  const hashtags = (target.hashtags || []).map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean);
  if (target.platform === 'youtube' && title && title.length > 75) {
    throw new MediaValidationError('YouTube temel başlığı en fazla 75 karakter olmalıdır.');
  }
  if (target.platform === 'youtube' && caption && caption.length > 3500) {
    throw new MediaValidationError('YouTube açıklaması en fazla 3500 karakter olmalıdır.');
  }
  if (hashtags.length > 15 || hashtags.some((tag) => tag.length > 60)) {
    throw new MediaValidationError('En fazla 15 etiket girilebilir; her etiket 60 karakteri aşamaz.');
  }
  return {
    ...target,
    format: target.format || 'vertical_video',
    title,
    caption,
    hashtags: [...new Set(hashtags)],
    scheduledAt: target.scheduledAt || null,
    config: normalizeTargetConfig(target),
  };
}

function normalizeCampaignInput(body, { partial = false } = {}) {
  const value = body && typeof body === 'object' ? body : {};
  const required = (key, label) => {
    if (!partial && (typeof value[key] !== 'string' || !value[key].trim())) {
      throw new MediaValidationError(`${label} zorunludur.`);
    }
  };
  required('name', 'Kampanya adı');
  required('topic', 'Konu');
  const levels = value.levels ?? (partial ? undefined : MEDIA_LEVELS);
  if (levels !== undefined && (!Array.isArray(levels) || levels.length < 1 || levels.some((level) => !MEDIA_LEVELS.includes(level)))) {
    throw new MediaValidationError('En az bir geçerli CEFR seviyesi seçilmelidir.');
  }
  const targets = value.targets;
  if (!partial && (!Array.isArray(targets) || targets.length < 1)) {
    throw new MediaValidationError('En az bir platform seçilmelidir.');
  }
  if (targets !== undefined) {
    if (!Array.isArray(targets)) throw new MediaValidationError('Platform hedefleri liste olmalıdır.');
    if (targets.some((target) => !target || typeof target !== 'object')) {
      throw new MediaValidationError('Geçersiz platform hedefi.');
    }
    if (new Set(targets.map((target) => target.platform)).size !== targets.length) {
      throw new MediaValidationError('Platform hedefleri benzersiz olmalıdır.');
    }
    for (const target of targets) {
      if (!MEDIA_PLATFORMS.includes(target.platform)) throw new MediaValidationError('Geçersiz platform.');
      const format = target.format || 'vertical_video';
      if (!MEDIA_FORMATS[target.platform].includes(format)) throw new MediaValidationError('Platform için geçersiz içerik formatı.');
      if (target.hashtags !== undefined && (!Array.isArray(target.hashtags) || target.hashtags.some((tag) => typeof tag !== 'string'))) {
        throw new MediaValidationError('Etiketler metin listesi olmalıdır.');
      }
      if (target.scheduledAt && Number.isNaN(Date.parse(target.scheduledAt))) throw new MediaValidationError('Geçersiz yayın tarihi.');
      if (target.platform === 'youtube' && target.scheduledAt) {
        throw new MediaValidationError('YouTube zamanlaması henüz desteklenmiyor; onay sonrası doğrudan gönderim kullanın.');
      }
      normalizeTarget(target);
    }
    const hasHorizontal = targets.some((target) => target.format === 'horizontal_video');
    if (hasHorizontal && targets.some((target) => target.platform !== 'youtube' || target.format !== 'horizontal_video')) {
      throw new MediaValidationError('Yatay YouTube videosu ayrı bir kampanya olarak üretilmelidir.');
    }
  }
  if (value.objective !== undefined && !MEDIA_OBJECTIVES.includes(value.objective)) throw new MediaValidationError('Geçersiz içerik amacı.');
  if (value.tone !== undefined && !MEDIA_TONES.includes(value.tone)) throw new MediaValidationError('Geçersiz içerik tonu.');
  if (value.voiceProfile !== undefined && !MEDIA_VOICE_PROFILES.includes(value.voiceProfile)) throw new MediaValidationError('Geçersiz ses profili.');
  if (value.voiceQuality !== undefined && !MEDIA_AUDIO_QUALITIES.includes(value.voiceQuality)) throw new MediaValidationError('Geçersiz ses kalitesi.');
  const sceneCount = value.sceneCount === undefined ? undefined : Number(value.sceneCount);
  if (sceneCount !== undefined && (!Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > 12)) throw new MediaValidationError('Sahne sayısı 1-12 arasında olmalıdır.');
  const duration = value.targetDurationSeconds === undefined ? undefined : Number(value.targetDurationSeconds);
  if (duration !== undefined && (!Number.isInteger(duration) || duration < 15 || duration > 600)) throw new MediaValidationError('Süre 15-600 saniye arasında olmalıdır.');
  const hasHorizontal = targets?.some((target) => target.format === 'horizontal_video');
  if (duration !== undefined && hasHorizontal && !YOUTUBE_LONG_DURATION_SECONDS.includes(duration)) {
    throw new MediaValidationError('Yatay YouTube süresi 5-10 dakika arasında, tam dakika olarak seçilmelidir.');
  }
  if (duration !== undefined && targets?.length && !hasHorizontal && duration > 60) {
    throw new MediaValidationError('Dikey video süresi en fazla 60 saniye olmalıdır.');
  }
  if (targets?.some((target) => target.platform === 'youtube') && value.humanApprovalRequired === false) {
    throw new MediaValidationError('YouTube gönderimi için insan onayı zorunludur.');
  }
  return {
    name: value.name?.trim(), topic: value.topic?.trim(), language: value.language?.trim() || undefined,
    objective: value.objective, tone: value.tone,
    cta: Object.prototype.hasOwnProperty.call(value, 'cta') ? value.cta?.trim() || null : undefined,
    visualStyle: value.visualStyle?.trim(), voiceProfile: value.voiceProfile?.trim(),
    voiceQuality: value.voiceQuality, levels,
    sceneCount, targetDurationSeconds: duration,
    subtitlesEnabled: value.subtitlesEnabled, humanApprovalRequired: value.humanApprovalRequired,
    config: value.config && typeof value.config === 'object' ? value.config : undefined,
    targets: targets?.map(normalizeTarget),
  };
}

function mapCampaign(row) {
  return {
    id: row.id, name: row.name, topic: row.topic, language: row.language,
    objective: row.objective, tone: row.tone, cta: row.cta, visualStyle: row.visual_style,
    voiceProfile: row.voice_profile, voiceQuality: row.voice_quality || 'standard',
    levels: row.levels, sceneCount: row.scene_count,
    targetDurationSeconds: row.target_duration_seconds, subtitlesEnabled: row.subtitles_enabled,
    humanApprovalRequired: row.human_approval_required, status: row.status,
    currentStage: row.current_stage, progress: row.progress, reviewNotes: row.review_notes,
    errorMessage: row.error_message, config: row.config || {}, createdBy: row.created_by,
    approvedBy: row.approved_by, approvedAt: row.approved_at, createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTarget(row) {
  return {
    id: row.id, campaignId: row.campaign_id, platform: row.platform, format: row.format,
    status: row.status, title: row.title, caption: row.caption, hashtags: row.hashtags || [],
    scheduledAt: row.scheduled_at, externalPostId: row.external_post_id,
    externalUrl: row.external_url, config: row.config || {}, createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQualityAssessment(row) {
  return {
    id: row.id, qualityRunId: row.quality_run_id, agentType: row.agent_type,
    scope: row.scope, level: row.level, sceneId: row.scene_id, platform: row.platform,
    score: Number(row.score), confidence: Number(row.confidence), summary: row.summary,
    dimensionScores: row.dimension_scores || {}, provider: row.provider, model: row.model,
    promptVersion: row.prompt_version, usage: row.usage || {}, createdAt: row.created_at,
  };
}

function mapQualityFinding(row) {
  return {
    id: row.id, qualityRunId: row.quality_run_id, assessmentId: row.assessment_id,
    agentType: row.agent_type, severity: row.severity, category: row.category,
    scope: row.scope, level: row.level, sceneId: row.scene_id, platform: row.platform,
    artifactUri: row.artifact_uri, evidence: row.evidence,
    suggestedAction: row.suggested_action, autoFixable: row.auto_fixable,
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapQualityRun(row) {
  return {
    id: row.id, campaignId: row.campaign_id, generationJobId: row.generation_job_id,
    status: row.status, mode: row.mode, stage: row.stage, progress: row.progress,
    rubricVersion: row.rubric_version, provider: row.provider, model: row.model,
    overallScore: row.overall_score == null ? null : Number(row.overall_score),
    recommendation: row.recommendation, summary: row.summary,
    dimensionScores: row.dimension_scores || {}, usage: row.usage || {},
    promptVersions: row.prompt_versions || {}, packageRef: row.package_ref,
    attempt: row.attempt, maxAttempts: row.max_attempts, workerId: row.worker_id,
    errorMessage: row.error_message, createdAt: row.created_at, startedAt: row.started_at,
    finishedAt: row.finished_at, updatedAt: row.updated_at,
  };
}

async function getCampaignDetail(id, client = pool) {
  const campaignResult = await client.query('SELECT * FROM media_campaigns WHERE id = $1', [id]);
  if (!campaignResult.rows[0]) throw new MediaValidationError('Kampanya bulunamadı.', 404);
  const [targets, jobs, artifacts, qualityRuns] = await Promise.all([
    client.query('SELECT * FROM media_campaign_targets WHERE campaign_id = $1 ORDER BY platform', [id]),
    client.query('SELECT * FROM media_generation_jobs WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 20', [id]),
    client.query('SELECT * FROM media_artifacts WHERE campaign_id = $1 ORDER BY created_at DESC', [id]),
    client.query('SELECT * FROM media_quality_runs WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 10', [id]),
  ]);
  const latestQualityRun = qualityRuns.rows[0];
  const [assessments, findings] = latestQualityRun ? await Promise.all([
    client.query('SELECT * FROM media_quality_assessments WHERE quality_run_id=$1 ORDER BY created_at, agent_type', [latestQualityRun.id]),
    client.query('SELECT * FROM media_quality_findings WHERE quality_run_id=$1 ORDER BY CASE severity WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 WHEN \'low\' THEN 4 ELSE 5 END, created_at', [latestQualityRun.id]),
  ]) : [{ rows: [] }, { rows: [] }];
  return {
    ...mapCampaign(campaignResult.rows[0]),
    targets: targets.rows.map(mapTarget),
    jobs: jobs.rows.map((row) => ({
      id: row.id, status: row.status, stage: row.stage, progress: row.progress,
      action: row.payload?.action || 'generate',
      attempt: row.attempt, maxAttempts: row.max_attempts, workerId: row.worker_id,
      errorMessage: row.error_message, createdAt: row.created_at, startedAt: row.started_at,
      finishedAt: row.finished_at, updatedAt: row.updated_at,
    })),
    artifacts: artifacts.rows.map((row) => ({
      id: row.id, targetId: row.target_id, level: row.level, kind: row.kind, uri: row.uri,
      contentType: row.content_type, bytes: row.bytes == null ? null : Number(row.bytes),
      durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
      metadata: row.metadata || {}, createdAt: row.created_at,
    })),
    qualityRuns: qualityRuns.rows.map(mapQualityRun),
    latestQualityRun: latestQualityRun ? {
      ...mapQualityRun(latestQualityRun),
      assessments: assessments.rows.map(mapQualityAssessment),
      findings: findings.rows.map(mapQualityFinding),
    } : null,
  };
}

module.exports = {
  MediaValidationError,
  normalizeCampaignInput,
  mapCampaign,
  mapTarget,
  mapQualityRun,
  mapQualityAssessment,
  mapQualityFinding,
  getCampaignDetail,
};
