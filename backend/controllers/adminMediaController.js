const { pool } = require('../config/db.js');
const logger = require('../utils/common/logger.js');
const { logAdminAction, extractRequestMeta } = require('../services/auditLogService.js');
const {
  MediaValidationError,
  normalizeCampaignInput,
  mapCampaign,
  mapTarget,
  getCampaignDetail,
} = require('../services/mediaCampaignService.js');

function handleError(res, error) {
  if (error instanceof MediaValidationError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  if (error?.code === '22P02') return res.status(400).json({ success: false, message: 'Geçersiz kayıt kimliği.' });
  logger.error('[ADMIN_MEDIA] Request failed:', error);
  return res.status(500).json({ success: false, message: 'LingRoot Media işlemi başarısız oldu.' });
}

function audit(req, action, targetId, details = null) {
  const meta = extractRequestMeta(req);
  return logAdminAction({
    adminUserId: req.user?.id,
    adminEmail: req.user?.email,
    action,
    targetType: 'media_campaign',
    targetId,
    details,
    ...meta,
  });
}

async function replaceTargets(client, campaignId, targets) {
  await client.query('DELETE FROM media_campaign_targets WHERE campaign_id = $1', [campaignId]);
  for (const target of targets) {
    await client.query(
      `INSERT INTO media_campaign_targets
       (campaign_id, platform, format, title, caption, hashtags, scheduled_at, config)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [campaignId, target.platform, target.format || 'vertical_video', target.title || null,
        target.caption || null, target.hashtags || [], target.scheduledAt || null, target.config || {}],
    );
  }
}

exports.listCampaigns = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const values = [];
    const filters = [];
    if (req.query.status && req.query.status !== 'all') {
      values.push(req.query.status);
      filters.push(`c.status = $${values.length}`);
    }
    if (req.query.search) {
      values.push(`%${String(req.query.search).trim()}%`);
      filters.push(`(c.name ILIKE $${values.length} OR c.topic ILIKE $${values.length})`);
    }
    if (req.query.platform && req.query.platform !== 'all') {
      values.push(req.query.platform);
      filters.push(`EXISTS (SELECT 1 FROM media_campaign_targets t WHERE t.campaign_id=c.id AND t.platform=$${values.length})`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const count = await pool.query(`SELECT COUNT(*) FROM media_campaigns c ${where}`, values);
    values.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `SELECT c.*,
        COALESCE((SELECT json_agg(t ORDER BY t.platform) FROM media_campaign_targets t WHERE t.campaign_id=c.id), '[]') AS targets
       FROM media_campaigns c ${where}
       ORDER BY c.updated_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return res.json({
      success: true,
      data: result.rows.map((row) => ({ ...mapCampaign(row), targets: row.targets.map(mapTarget) })),
      pagination: { total: Number(count.rows[0].count), page, limit, totalPages: Math.ceil(Number(count.rows[0].count) / limit) },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getCampaign = async (req, res) => {
  try {
    return res.json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.createCampaign = async (req, res) => {
  const client = await pool.connect();
  try {
    const input = normalizeCampaignInput(req.body);
    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO media_campaigns
       (name,topic,language,objective,tone,cta,visual_style,voice_profile,voice_quality,levels,scene_count,
        target_duration_seconds,subtitles_enabled,human_approval_required,config,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [input.name, input.topic, input.language || 'en', input.objective || 'education', input.tone || 'educational',
        input.cta, input.visualStyle || 'documentary', input.voiceProfile || 'english_female',
        input.voiceQuality || 'standard', input.levels, input.sceneCount || 4,
        input.targetDurationSeconds || 45, input.subtitlesEnabled !== false,
        input.humanApprovalRequired !== false, input.config || {}, req.user.id],
    );
    await replaceTargets(client, created.rows[0].id, input.targets);
    await client.query('COMMIT');
    await audit(req, 'media.campaign.create', created.rows[0].id, { platforms: input.targets.map((target) => target.platform) });
    return res.status(201).json({ success: true, data: await getCampaignDetail(created.rows[0].id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
};

exports.updateCampaign = async (req, res) => {
  const client = await pool.connect();
  try {
    const input = normalizeCampaignInput(req.body, { partial: true });
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM media_campaigns WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!current.rows[0]) throw new MediaValidationError('Kampanya bulunamadı.', 404);
    if (!['draft', 'failed', 'cancelled', 'review_ready'].includes(current.rows[0].status)) {
      throw new MediaValidationError('Aktif üretim sırasında kampanya düzenlenemez.', 409);
    }
    const fields = {
      name: input.name, topic: input.topic, language: input.language, objective: input.objective,
      tone: input.tone, cta: input.cta, visual_style: input.visualStyle, voice_profile: input.voiceProfile,
      voice_quality: input.voiceQuality,
      levels: input.levels, scene_count: input.sceneCount, target_duration_seconds: input.targetDurationSeconds,
      subtitles_enabled: input.subtitlesEnabled, human_approval_required: input.humanApprovalRequired,
      config: input.config,
    };
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (entries.length) {
      const values = entries.map(([, value]) => value);
      values.push(req.params.id);
      await client.query(
        `UPDATE media_campaigns SET ${entries.map(([key], index) => `${key}=$${index + 1}`).join(',')}, updated_at=NOW() WHERE id=$${values.length}`,
        values,
      );
    }
    if (input.targets) await replaceTargets(client, req.params.id, input.targets);
    await client.query('COMMIT');
    await audit(req, 'media.campaign.update', req.params.id);
    return res.json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
};

async function enqueueCampaign(req, res, action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM media_campaigns WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!current.rows[0]) throw new MediaValidationError('Kampanya bulunamadı.', 404);
    const active = await client.query("SELECT id FROM media_generation_jobs WHERE campaign_id=$1 AND status IN ('queued','processing')", [req.params.id]);
    if (active.rows[0]) throw new MediaValidationError('Bu kampanya için zaten aktif bir iş var.', 409);
    if (!['draft', 'failed', 'cancelled', 'review_ready', 'approved'].includes(current.rows[0].status)) {
      throw new MediaValidationError('Kampanya bu durumda üretim sırasına alınamaz.', 409);
    }
    const detail = await getCampaignDetail(req.params.id, client);
    const job = await client.query(
      `INSERT INTO media_generation_jobs (campaign_id,payload) VALUES ($1,$2) RETURNING id`,
      [req.params.id, { campaignId: req.params.id, resume: action === 'retry', campaign: detail }],
    );
    await client.query("UPDATE media_campaigns SET status='queued', current_stage='queued', progress=0, error_message=NULL, updated_at=NOW() WHERE id=$1", [req.params.id]);
    await client.query('COMMIT');
    await audit(req, `media.campaign.${action}`, req.params.id, { jobId: job.rows[0].id });
    return res.status(202).json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
}

exports.generateCampaign = (req, res) => enqueueCampaign(req, res, 'generate');
exports.retryCampaign = (req, res) => enqueueCampaign(req, res, 'retry');

exports.cancelCampaign = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE media_campaigns SET status='cancelled',current_stage='cancelled',updated_at=NOW()
       WHERE id=$1 AND status NOT IN ('published','cancelled') RETURNING id`, [req.params.id],
    );
    if (!result.rows[0]) throw new MediaValidationError('Kampanya iptal edilemedi.', 409);
    await pool.query("UPDATE media_generation_jobs SET status='cancelled',stage='cancelled',finished_at=NOW(),lease_token=NULL,lease_expires_at=NULL,updated_at=NOW() WHERE campaign_id=$1 AND status IN ('queued','processing')", [req.params.id]);
    await audit(req, 'media.campaign.cancel', req.params.id);
    return res.json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.approveCampaign = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE media_campaigns SET status='approved',current_stage='approved',approved_by=$2,approved_at=NOW(),review_notes=$3,updated_at=NOW()
       WHERE id=$1 AND status='review_ready' RETURNING id`, [req.params.id, req.user.id, req.body?.notes || null],
    );
    if (!result.rows[0]) throw new MediaValidationError('Yalnızca review_ready kampanya onaylanabilir.', 409);
    await client.query(
      "UPDATE media_campaign_targets SET status='approved',updated_at=NOW() WHERE campaign_id=$1",
      [req.params.id],
    );
    await client.query('COMMIT');
    await audit(req, 'media.campaign.approve', req.params.id);
    return res.json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
};

exports.publishCampaign = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const campaign = await client.query(
      "SELECT id,status FROM media_campaigns WHERE id=$1 FOR UPDATE",
      [req.params.id],
    );
    if (!campaign.rows[0]) throw new MediaValidationError('Kampanya bulunamadı.', 404);
    if (campaign.rows[0].status !== 'approved') {
      throw new MediaValidationError('YouTube gönderiminden önce içerik onaylanmalıdır.', 409);
    }
    const active = await client.query(
      "SELECT id FROM media_generation_jobs WHERE campaign_id=$1 AND status IN ('queued','processing')",
      [req.params.id],
    );
    if (active.rows[0]) throw new MediaValidationError('Bu kampanya için zaten aktif bir iş var.', 409);
    const targetResult = await client.query(
      "SELECT * FROM media_campaign_targets WHERE campaign_id=$1 AND platform='youtube' FOR UPDATE",
      [req.params.id],
    );
    if (targetResult.rows.length !== 1) {
      throw new MediaValidationError('YouTube gönderimi için tek bir YouTube hedefi gereklidir.', 409);
    }
    const target = mapTarget(targetResult.rows[0]);
    const generation = await client.query(
      `SELECT id,result->>'packageDir' AS package_ref FROM media_generation_jobs
       WHERE campaign_id=$1 AND status='completed'
         AND COALESCE(payload->>'action','generate') <> 'publish'
         AND COALESCE(result->>'packageDir','') <> ''
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.id],
    );
    const packageRef = generation.rows[0]?.package_ref;
    if (!packageRef) throw new MediaValidationError('Gönderilecek üretim paketi bulunamadı.', 409);
    const publishConfig = {
      targetId: target.id,
      packageRef,
      privacyStatus: target.config?.privacyStatus || 'private',
    };
    const job = await client.query(
      `INSERT INTO media_generation_jobs (campaign_id,stage,progress,payload)
       VALUES ($1,'publish_queued',99,$2) RETURNING id`,
      [req.params.id, { action: 'publish', ...publishConfig }],
    );
    await client.query(
      "UPDATE media_campaigns SET status='scheduled',current_stage='publish_queued',progress=99,error_message=NULL,updated_at=NOW() WHERE id=$1",
      [req.params.id],
    );
    await client.query(
      "UPDATE media_campaign_targets SET status='scheduled',updated_at=NOW() WHERE id=$1",
      [target.id],
    );
    await client.query('COMMIT');
    await audit(req, 'media.campaign.publish', req.params.id, {
      jobId: job.rows[0].id,
      targetId: target.id,
      privacyStatus: publishConfig.privacyStatus,
    });
    return res.status(202).json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
};

exports.requestRevision = async (req, res) => {
  try {
    const notes = String(req.body?.notes || '').trim();
    if (!notes) throw new MediaValidationError('Revizyon notu zorunludur.');
    const result = await pool.query(
      `UPDATE media_campaigns SET status='draft',current_stage='revision_requested',review_notes=$2,progress=0,updated_at=NOW()
       WHERE id=$1 AND status IN ('review_ready','approved') RETURNING id`, [req.params.id, notes],
    );
    if (!result.rows[0]) throw new MediaValidationError('Bu kampanya revizyona gönderilemez.', 409);
    await audit(req, 'media.campaign.request_revision', req.params.id, { notes });
    return res.json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM media_campaigns WHERE id=$1 AND status IN ('draft','failed','cancelled') RETURNING id", [req.params.id]);
    if (!result.rows[0]) throw new MediaValidationError('Yalnızca taslak, başarısız veya iptal edilmiş kampanya silinebilir.', 409);
    await audit(req, 'media.campaign.delete', req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.duplicateCampaign = async (req, res) => {
  try {
    const source = await getCampaignDetail(req.params.id);
    req.body = {
      ...source,
      name: `${source.name} - Kopya`,
      targets: source.targets.map((target) => ({
        platform: target.platform, format: target.format, title: target.title,
        caption: target.caption, hashtags: target.hashtags, config: target.config,
      })),
    };
    return exports.createCampaign(req, res);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.rerunQuality = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const campaign = await client.query('SELECT id,status FROM media_campaigns WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!campaign.rows[0]) throw new MediaValidationError('Kampanya bulunamadı.', 404);
    const active = await client.query("SELECT id FROM media_quality_runs WHERE campaign_id=$1 AND status IN ('queued','processing')", [req.params.id]);
    if (active.rows[0]) throw new MediaValidationError('Bu kampanya için aktif kalite incelemesi var.', 409);
    const source = await client.query(
      `SELECT package_ref,generation_job_id FROM media_quality_runs WHERE campaign_id=$1 AND package_ref IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`, [req.params.id],
    );
    let packageRef = source.rows[0]?.package_ref;
    let generationJobId = source.rows[0]?.generation_job_id;
    if (!packageRef) {
      const generation = await client.query(
        `SELECT id,result->>'packageDir' AS package_ref FROM media_generation_jobs
         WHERE campaign_id=$1 AND status='completed' ORDER BY created_at DESC LIMIT 1`, [req.params.id],
      );
      packageRef = generation.rows[0]?.package_ref;
      generationJobId = generation.rows[0]?.id;
    }
    if (!packageRef) throw new MediaValidationError('Kalite incelemesi için üretim paketi bulunamadı.', 409);
    const created = await client.query(
      `INSERT INTO media_quality_runs (campaign_id,generation_job_id,mode,package_ref)
       VALUES ($1,$2,'shadow',$3) RETURNING id`, [req.params.id, generationJobId || null, packageRef],
    );
    await client.query(
      "UPDATE media_campaigns SET status='quality_queued',current_stage='quality_queued',progress=96,updated_at=NOW() WHERE id=$1",
      [req.params.id],
    );
    await client.query('COMMIT');
    await audit(req, 'media.quality.rerun', req.params.id, { qualityRunId: created.rows[0].id });
    return res.status(202).json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
};

exports.submitQualityFeedback = async (req, res) => {
  const client = await pool.connect();
  try {
    const decision = String(req.body?.decision || '').trim();
    const notes = String(req.body?.notes || '').trim() || null;
    const findingId = req.body?.findingId || null;
    if (!['agree', 'disagree', 'override_accept', 'request_repair'].includes(decision)) {
      throw new MediaValidationError('Geçersiz kalite geri bildirim kararı.');
    }
    await client.query('BEGIN');
    const run = await client.query(
      'SELECT id,campaign_id FROM media_quality_runs WHERE id=$1 AND campaign_id=$2 FOR UPDATE',
      [req.params.runId, req.params.id],
    );
    if (!run.rows[0]) throw new MediaValidationError('Kalite incelemesi bulunamadı.', 404);
    if (findingId) {
      const finding = await client.query(
        'SELECT id FROM media_quality_findings WHERE id=$1 AND quality_run_id=$2', [findingId, req.params.runId],
      );
      if (!finding.rows[0]) throw new MediaValidationError('Kalite bulgusu bulunamadı.', 404);
      const findingStatus = decision === 'disagree' ? 'dismissed' : decision === 'request_repair' ? 'accepted' : 'accepted';
      await client.query('UPDATE media_quality_findings SET status=$2,updated_at=NOW() WHERE id=$1', [findingId, findingStatus]);
    }
    await client.query(
      `INSERT INTO media_quality_feedback (quality_run_id,finding_id,decision,notes,created_by)
       VALUES ($1,$2,$3,$4,$5)`, [req.params.runId, findingId, decision, notes, req.user.id],
    );
    if (decision === 'override_accept') {
      await client.query(
        "UPDATE media_campaigns SET status='review_ready',current_stage='quality_override',updated_at=NOW() WHERE id=$1",
        [req.params.id],
      );
    } else if (decision === 'request_repair') {
      await client.query(
        "UPDATE media_campaigns SET status='repair_required',current_stage='repair_requested',review_notes=$2,updated_at=NOW() WHERE id=$1",
        [req.params.id, notes],
      );
    }
    await client.query('COMMIT');
    await audit(req, 'media.quality.feedback', req.params.id, { qualityRunId: req.params.runId, findingId, decision, notes });
    return res.json({ success: true, data: await getCampaignDetail(req.params.id) });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleError(res, error);
  } finally {
    client.release();
  }
};
