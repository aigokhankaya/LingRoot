const crypto = require('crypto');
const { pool } = require('../config/db.js');
const logger = require('../utils/common/logger.js');
const { MediaValidationError } = require('../services/mediaCampaignService.js');

function failure(res, error) {
  if (error instanceof MediaValidationError) return res.status(error.statusCode).json({ error: error.message });
  if (error?.code === '22P02') return res.status(400).json({ error: 'Invalid quality run id.' });
  logger.error('[MEDIA_QUALITY] Internal worker request failed:', error);
  return res.status(500).json({ error: 'Media quality operation failed.' });
}

async function requireLease(client, id, leaseToken) {
  const result = await client.query(
    `SELECT * FROM media_quality_runs
     WHERE id=$1 AND status='processing' AND lease_token=$2 AND lease_expires_at>NOW() FOR UPDATE`,
    [id, leaseToken],
  );
  if (!result.rows[0]) throw new MediaValidationError('Invalid or expired quality lease.', 409);
  return result.rows[0];
}

exports.claimQualityRun = async (req, res) => {
  const client = await pool.connect();
  try {
    const workerId = String(req.body?.worker_id || '').trim();
    if (!workerId) throw new MediaValidationError('worker_id is required.');
    const leaseToken = crypto.randomUUID();
    await client.query('BEGIN');
    const candidate = await client.query(
      `SELECT * FROM media_quality_runs
       WHERE (status='queued' OR (status='processing' AND lease_expires_at<NOW()))
         AND attempt<max_attempts
       ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    if (!candidate.rows[0]) {
      await client.query('COMMIT');
      return res.status(204).end();
    }
    const run = candidate.rows[0];
    await client.query(
      `UPDATE media_quality_runs SET status='processing',stage='loading_package',progress=1,
       attempt=attempt+1,worker_id=$2,lease_token=$3,lease_expires_at=NOW()+INTERVAL '90 seconds',
       started_at=COALESCE(started_at,NOW()),error_message=NULL,updated_at=NOW() WHERE id=$1`,
      [run.id, workerId, leaseToken],
    );
    await client.query(
      "UPDATE media_campaigns SET status='quality_review',current_stage='quality_review',progress=97,updated_at=NOW() WHERE id=$1",
      [run.campaign_id],
    );
    await client.query('COMMIT');
    return res.json({
      schema_version: 1,
      quality_run_id: run.id,
      campaign_id: run.campaign_id,
      lease_token: leaseToken,
      lease_seconds: 90,
      attempt: run.attempt + 1,
      mode: run.mode,
      rubric_version: run.rubric_version,
      package_ref: run.package_ref,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};

exports.heartbeatQualityRun = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE media_quality_runs SET lease_expires_at=NOW()+INTERVAL '90 seconds',updated_at=NOW()
       WHERE id=$1 AND status='processing' AND lease_token=$2 AND lease_expires_at>NOW() RETURNING id`,
      [req.params.id, req.body?.lease_token],
    );
    if (!result.rows[0]) throw new MediaValidationError('Invalid or expired quality lease.', 409);
    return res.json({ ok: true, lease_seconds: 90 });
  } catch (error) {
    return failure(res, error);
  }
};

exports.progressQualityRun = async (req, res) => {
  const client = await pool.connect();
  try {
    const progress = Number(req.body?.progress);
    const stage = String(req.body?.stage || '').trim();
    if (!Number.isInteger(progress) || progress < 0 || progress > 99 || !stage) {
      throw new MediaValidationError('Valid quality stage and progress are required.');
    }
    await client.query('BEGIN');
    const run = await requireLease(client, req.params.id, req.body?.lease_token);
    await client.query(
      `UPDATE media_quality_runs SET stage=$2,progress=$3,lease_expires_at=NOW()+INTERVAL '90 seconds',updated_at=NOW() WHERE id=$1`,
      [run.id, stage, progress],
    );
    const campaignProgress = Math.min(99, 97 + Math.floor(progress / 40));
    await client.query(
      "UPDATE media_campaigns SET status='quality_review',current_stage=$2,progress=$3,updated_at=NOW() WHERE id=$1",
      [run.campaign_id, stage, campaignProgress],
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

function validateReport(report) {
  if (!report || typeof report !== 'object') throw new MediaValidationError('quality report is required.');
  if (!Array.isArray(report.assessments) || report.assessments.length < 1) throw new MediaValidationError('quality assessments are required.');
  if (!Number.isFinite(report.overallScore) || report.overallScore < 0 || report.overallScore > 100) throw new MediaValidationError('invalid quality score.');
  if (!['accept', 'human_review', 'repair_required', 'blocked'].includes(report.recommendation)) throw new MediaValidationError('invalid quality recommendation.');
}

exports.completeQualityRun = async (req, res) => {
  const client = await pool.connect();
  try {
    const report = req.body?.report;
    validateReport(report);
    await client.query('BEGIN');
    const run = await requireLease(client, req.params.id, req.body?.lease_token);
    await client.query('DELETE FROM media_quality_assessments WHERE quality_run_id=$1', [run.id]);
    const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const promptVersions = {};
    let provider = null;
    let model = null;
    for (const assessment of report.assessments) {
      if (!assessment.agentType || !Number.isFinite(assessment.score) || !assessment.summary) {
        throw new MediaValidationError('invalid quality assessment.');
      }
      const inserted = await client.query(
        `INSERT INTO media_quality_assessments
         (quality_run_id,agent_type,scope,level,scene_id,platform,score,confidence,summary,
          dimension_scores,provider,model,prompt_version,usage,raw_response)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [run.id, assessment.agentType, assessment.scope || 'package', assessment.level || null,
          assessment.sceneId || null, assessment.platform || null, assessment.score,
          assessment.confidence, assessment.summary, assessment.dimensionScores || {},
          assessment.provider, assessment.model, assessment.promptVersion, assessment.usage || {}, assessment],
      );
      promptVersions[assessment.agentType] = assessment.promptVersion;
      if (assessment.provider !== 'policy') {
        provider ||= assessment.provider;
        model ||= assessment.model;
      }
      for (const key of Object.keys(usage)) usage[key] += Number(assessment.usage?.[key] || 0);
      for (const finding of assessment.findings || []) {
        await client.query(
          `INSERT INTO media_quality_findings
           (quality_run_id,assessment_id,agent_type,severity,category,scope,level,scene_id,platform,
            artifact_uri,evidence,suggested_action,auto_fixable)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [run.id, inserted.rows[0].id, assessment.agentType, finding.severity, finding.category,
            finding.scope || 'package', finding.level || null, finding.sceneId || null,
            finding.platform || null, finding.artifactUri || null, finding.evidence,
            finding.suggestedAction, finding.autoFixable === true],
        );
      }
    }
    await client.query(
      `UPDATE media_quality_runs SET status='completed',stage='completed',progress=100,provider=$2,model=$3,
       overall_score=$4,recommendation=$5,summary=$6,dimension_scores=$7,usage=$8,prompt_versions=$9,
       lease_token=NULL,lease_expires_at=NULL,finished_at=NOW(),updated_at=NOW() WHERE id=$1`,
      [run.id, provider, model, report.overallScore, report.recommendation, report.summary,
        report.dimensionScores || {}, usage, promptVersions],
    );
    const nextStatus = run.mode === 'enforced' && ['repair_required', 'blocked'].includes(report.recommendation)
      ? 'repair_required' : 'review_ready';
    await client.query(
      `UPDATE media_campaigns SET status=$2,current_stage=$3,progress=100,error_message=NULL,updated_at=NOW() WHERE id=$1`,
      [run.campaign_id, nextStatus, nextStatus === 'review_ready' ? 'agent_qa_complete' : 'agent_repair_recommended'],
    );
    await client.query("UPDATE media_campaign_targets SET status=$2,updated_at=NOW() WHERE campaign_id=$1", [run.campaign_id, nextStatus]);
    await client.query('COMMIT');
    return res.json({ ok: true, campaign_status: nextStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};

exports.failQualityRun = async (req, res) => {
  const client = await pool.connect();
  try {
    const message = String(req.body?.error || 'Quality worker failed.').slice(0, 2000);
    await client.query('BEGIN');
    const run = await requireLease(client, req.params.id, req.body?.lease_token);
    const retry = req.body?.retryable !== false && run.attempt < run.max_attempts;
    await client.query(
      `UPDATE media_quality_runs SET status=$2,stage=$2,error_message=$3,lease_token=NULL,lease_expires_at=NULL,
       finished_at=CASE WHEN $2='failed' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1`,
      [run.id, retry ? 'queued' : 'failed', message],
    );
    await client.query(
      `UPDATE media_campaigns SET status=$2,current_stage=$3,progress=$4,updated_at=NOW() WHERE id=$1`,
      [run.campaign_id, retry ? 'quality_queued' : 'review_ready', retry ? 'quality_retry_queued' : 'agent_qa_unavailable', retry ? 96 : 100],
    );
    await client.query('COMMIT');
    return res.json({ ok: true, retry_queued: retry });
  } catch (error) {
    await client.query('ROLLBACK');
    return failure(res, error);
  } finally {
    client.release();
  }
};
