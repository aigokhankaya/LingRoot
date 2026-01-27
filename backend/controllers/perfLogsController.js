const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const logger = require('../utils/common/logger.js');

// R2 config (reuse env vars from cloudflareR2Client)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

let r2Client = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
  try {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  } catch (err) {
    logger.error('[PerfLogs] Failed to initialize R2 client:', err);
  }
}

/**
 * Read an existing object from R2. Returns the body as a UTF-8 string or null.
 */
async function readFromR2(key) {
  if (!r2Client) return null;
  try {
    const res = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return await res.Body.transformToString('utf-8');
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Write (or overwrite) a text object in R2.
 */
async function writeToR2(key, text) {
  if (!r2Client) throw new Error('R2 client not initialised');
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: Buffer.from(text, 'utf-8'),
    ContentType: 'text/plain; charset=utf-8',
  }));
}

/**
 * POST /api/perf-logs
 * Mobile sends performance log lines; we append them to the user's daily log file in R2.
 */
exports.submitLogs = async (req, res) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ success: false, message: 'logs array is required' });
    }

    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `logs/perf/${userId}/${today}.log`;

    // Prefix each line with userId
    const newLines = logs.map(line => `[${userId}] ${line}`).join('\n');

    // Append: read existing, concat, write back
    const existing = await readFromR2(key);
    const combined = existing ? `${existing}\n${newLines}` : newLines;
    await writeToR2(key, combined);

    logger.info(`[PerfLogs] Appended ${logs.length} lines for user ${userId} date ${today}`);
    return res.json({ success: true });
  } catch (err) {
    logger.error('[PerfLogs] submitLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to store logs' });
  }
};

/**
 * GET /api/perf-logs/admin?userId=X&date=YYYY-MM-DD
 * Admin reads a specific user's log for a date, or lists all users for that date.
 */
exports.getLogs = async (req, res) => {
  try {
    const { userId, date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    if (userId) {
      // Return specific user's log
      const key = `logs/perf/${userId}/${targetDate}.log`;
      const content = await readFromR2(key);
      return res.json({
        success: true,
        logs: content || '',
        userId,
        date: targetDate,
      });
    }

    // No userId → list all users who have logs for that date
    const prefix = `logs/perf/`;
    const allKeys = [];
    let continuationToken;

    do {
      const listRes = await r2Client.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      if (listRes.Contents) {
        allKeys.push(...listRes.Contents.map(obj => obj.Key));
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);

    // Filter keys matching the target date: logs/perf/{userId}/{date}.log
    const dateFile = `${targetDate}.log`;
    const users = allKeys
      .filter(k => k.endsWith(dateFile))
      .map(k => {
        const parts = k.split('/');
        // logs/perf/{userId}/{date}.log → index 2 is userId
        return parts[2];
      })
      .filter(Boolean);

    return res.json({ success: true, users, date: targetDate });
  } catch (err) {
    logger.error('[PerfLogs] getLogs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to read logs' });
  }
};

/**
 * GET /api/perf-logs/admin/list?date=YYYY-MM-DD
 * Returns list of userIds that have logs for the given date.
 */
exports.listUsers = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const prefix = `logs/perf/`;
    const allKeys = [];
    let continuationToken;

    do {
      const listRes = await r2Client.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      if (listRes.Contents) {
        allKeys.push(...listRes.Contents.map(obj => obj.Key));
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);

    const dateFile = `${targetDate}.log`;
    const users = allKeys
      .filter(k => k.endsWith(dateFile))
      .map(k => {
        const parts = k.split('/');
        return parts[2];
      })
      .filter(Boolean);

    return res.json({ success: true, users, date: targetDate });
  } catch (err) {
    logger.error('[PerfLogs] listUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list users' });
  }
};
