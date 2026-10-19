const crypto = require('crypto');
const { pool } = require('../config/db.js');
const logger = require('../utils/common/logger.js');
const { getCampaignDetail, MediaValidationError } = require('../services/mediaCampaignService.js');

function failure(res, error) {
  if (error instanceof MediaValidationError) return res.status(error.statusCode).json({ error: error.message });
  logger.error('[MEDIA_JOB] Internal worker request failed:', error);
  return res.status(500).json({ error: 'Media job operation failed.' });
}

exports.claimJob = async (req, res) => {
  const client = await pool.connect();
  try {
    const workerId = String(req.body?.worker_id || '').trim();
    if (!workerId) throw new MediaValidationError('worker_id is required.');
    const leaseToken = crypto.randomUUID();
    await client.query('BEGIN');
    const candidate = await client.query(
      `SELECT * FROM media_generation_jobs
       WHERE (status='queued' OR (status='processing' AND lease_expires_at < NOW()))
         AND attempt < max_attempts
       ORDER BY priority ASC, created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    if (!candidate.rows[0]) {
      await client.query('COMMIT');
      return res.status(204).end();
    }
    const job = candidate.rows[0];
    const isPublication = job.payload?.action === 'publish';
    const stage = isPublication ? 'publishing' : 'planning';
    const progress = isPublication ? 99 : 1;
    await client.query(
      `UPDATE media_generation_jobs SET status='processing',stage=$4,progress=$5,attempt=attempt+1,
       worker_id=$2,lease_token=$3,lease_expires_at=NOW()+INTERVAL '90 seconds',started_at=COALESCE(started_at,NOW()),updated_at=NOW()
       WHERE id=$1`, [job.id, workerId, leaseToken, stage, progress],
    );
    await client.query(
      `UPDATE media_campaigns SET status=$2,current_stage=$3,progress=$4,updated_at=NOW() WHERE id=$1`,
      [job.campaign_id, isPublication ? 'scheduled' : 'planning', stage, progress],
    );
    const campaign = await getCampaignDetail(job.campaign_id, client);
    await client.query('COMMIT');
    return res.json({
      schema_version: 1,
      job_id: job.id,
      lease_token: leaseToken,
      lease_seconds: 90,
      attempt: job.attempt + 1,
      action: isPublication ? 'publish' : 'generate',
      payload: job.payload || {},
      campaign,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};

async function requireLease(client, jobId, leaseToken) {
  const job = await client.query(
    `SELECT * FROM media_generation_jobs WHERE id=$1 AND status='processing' AND lease_token=$2 AND lease_expires_at > NOW() FOR UPDATE`,
    [jobId, leaseToken],
  );
  if (!job.rows[0]) throw new MediaValidationError('Invalid or expired job lease.', 409);
  return job.rows[0];
}

exports.heartbeatJob = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE media_generation_jobs SET lease_expires_at=NOW()+INTERVAL '90 seconds',updated_at=NOW()
       WHERE id=$1 AND status='processing' AND lease_token=$2 AND lease_expires_at > NOW() RETURNING id`,
      [req.params.id, req.body?.lease_token],
    );
    if (!result.rows[0]) throw new MediaValidationError('Invalid or expired job lease.', 409);
    return res.json({ ok: true, lease_seconds: 90 });
  } catch (error) {
    return failure(res, error);
  }
};

exports.progressJob = async (req, res) => {
  const client = await pool.connect();
  try {
    const progress = Number(req.body?.progress);
    const stage = String(req.body?.stage || '').trim();
    if (!Number.isInteger(progress) || progress < 0 || progress > 99 || !stage) throw new MediaValidationError('Valid stage and progress are required.');
    await client.query('BEGIN');
    const job = await requireLease(client, req.params.id, req.body?.lease_token);
    await client.query(
      `UPDATE media_generation_jobs SET stage=$2,progress=$3,lease_expires_at=NOW()+INTERVAL '90 seconds',updated_at=NOW() WHERE id=$1`,
      [job.id, stage, progress],
    );
    const isPublication = job.payload?.action === 'publish';
    await client.query(
      `UPDATE media_campaigns SET status=$2,current_stage=$3,progress=$4,updated_at=NOW() WHERE id=$1`,
      [job.campaign_id, isPublication ? 'scheduled' : stage, stage, progress],
    );
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};

exports.completeJob = async (req, res) => {
  const client = await pool.connect();
  try {
    const artifacts = Array.isArray(req.body?.artifacts) ? req.body.artifacts : [];
    await client.query('BEGIN');
    const job = await requireLease(client, req.params.id, req.body?.lease_token);
    if (job.payload?.action === 'publish') {
      const result = req.body?.result && typeof req.body.result === 'object' ? req.body.result : {};
      const targetId = job.payload?.targetId;
      const videoIds = result.youtubeVideoIds && typeof result.youtubeVideoIds === 'object'
        ? result.youtubeVideoIds : {};
      const firstVideoId = Object.values(videoIds).find((value) => typeof value === 'string');
      const playlistId = typeof result.topicPlaylistId === 'string' ? result.topicPlaylistId : null;
      if (!targetId || (!firstVideoId && !playlistId)) {
        throw new MediaValidationError('Published YouTube IDs and targetId are required.');
      }
      const externalUrl = playlistId
        ? `https://www.youtube.com/playlist?list=${playlistId}`
        : `https://youtu.be/${firstVideoId}`;
      await client.query(
        `UPDATE media_generation_jobs SET status='completed',stage='published',progress=100,result=$2,
         lease_token=NULL,lease_expires_at=NULL,finished_at=NOW(),updated_at=NOW() WHERE id=$1`,
        [job.id, result],
      );
      await client.query(
        "UPDATE media_campaigns SET status='published',current_stage='published',progress=100,error_message=NULL,updated_at=NOW() WHERE id=$1",
        [job.campaign_id],
      );
      await client.query(
        `UPDATE media_campaign_targets SET status='published',external_post_id=$2,external_url=$3,
         config=COALESCE(config,'{}'::jsonb) || $4::jsonb,updated_at=NOW() WHERE id=$1`,
        [targetId, playlistId || firstVideoId, externalUrl, JSON.stringify({ release: result })],
      );
      await client.query('COMMIT');
      return res.json({ ok: true });
    }
    await client.query('DELETE FROM media_artifacts WHERE campaign_id=$1', [job.campaign_id]);
    for (const artifact of artifacts) {
      if (!artifact.kind || !artifact.uri) throw new MediaValidationError('Artifact kind and uri are required.');
      await client.query(
        `INSERT INTO media_artifacts (campaign_id,target_id,level,kind,uri,content_type,bytes,duration_seconds,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [job.campaign_id, artifact.target_id || null, artifact.level || null, artifact.kind, artifact.uri,
          artifact.content_type || null, artifact.bytes || null, artifact.duration_seconds || null, artifact.metadata || {}],
      );
    }
    await client.query(
      `UPDATE media_generation_jobs SET status='completed',stage='review_ready',progress=100,result=$2,
       lease_token=NULL,lease_expires_at=NULL,finished_at=NOW(),updated_at=NOW() WHERE id=$1`,
      [job.id, req.body?.result || {}],
    );
    const packageRef = String(req.body?.result?.packageDir || '').trim();
    if (packageRef) {
      await client.query(
        `INSERT INTO media_quality_runs (campaign_id,generation_job_id,mode,package_ref)
         VALUES ($1,$2,$3,$4)`,
        [job.campaign_id, job.id, process.env.QUALITY_AGENT_MODE === 'enforced' ? 'enforced' : 'shadow', packageRef],
      );
      await client.query("UPDATE media_campaigns SET status='quality_queued',current_stage='quality_queued',progress=96,error_message=NULL,updated_at=NOW() WHERE id=$1", [job.campaign_id]);
      await client.query("UPDATE media_campaign_targets SET status='quality_queued',updated_at=NOW() WHERE campaign_id=$1", [job.campaign_id]);
    } else {
      await client.query("UPDATE media_campaigns SET status='review_ready',current_stage='review_ready',progress=100,error_message=NULL,updated_at=NOW() WHERE id=$1", [job.campaign_id]);
      await client.query("UPDATE media_campaign_targets SET status='review_ready',updated_at=NOW() WHERE campaign_id=$1", [job.campaign_id]);
    }
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};

exports.failJob = async (req, res) => {
  const client = await pool.connect();
  try {
    const message = String(req.body?.error || 'Worker failed.').slice(0, 2000);
    await client.query('BEGIN');
    const job = await requireLease(client, req.params.id, req.body?.lease_token);
    const retry = req.body?.retryable !== false && job.attempt < job.max_attempts;
    const isPublication = job.payload?.action === 'publish';
    await client.query(
      `UPDATE media_generation_jobs SET status=$2,stage=$3,error_message=$4,lease_token=NULL,lease_expires_at=NULL,
       finished_at=CASE WHEN $2='failed' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1`,
      [job.id, retry ? 'queued' : 'failed', retry ? 'queued' : 'failed', message],
    );
    if (isPublication) {
      await client.query(
        `UPDATE media_campaigns SET status=$2,current_stage=$3,progress=99,error_message=$4,updated_at=NOW() WHERE id=$1`,
        [job.campaign_id, retry ? 'scheduled' : 'approved', retry ? 'publish_retry' : 'publish_failed', message],
      );
      await client.query(
        `UPDATE media_campaign_targets SET status=$2,updated_at=NOW() WHERE id=$1`,
        [job.payload?.targetId, retry ? 'scheduled' : 'publish_failed'],
      );
    } else {
      await client.query(
        `UPDATE media_campaigns SET status=$2,current_stage=$2,progress=CASE WHEN $2='queued' THEN 0 ELSE progress END,
         error_message=$3,updated_at=NOW() WHERE id=$1`, [job.campaign_id, retry ? 'queued' : 'failed', message],
      );
    }
    await client.query('COMMIT');
    return res.json({ ok: true, retry_queued: retry });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};
