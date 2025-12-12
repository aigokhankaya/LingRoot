const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');

const FILE_STORAGE_PROVIDER = (process.env.FILE_STORAGE_PROVIDER || 'supabase').toLowerCase();

// Cloudflare R2 config
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL; // e.g. https://cdn.example.com or https://<accountid>.r2.cloudflarestorage.com

let r2Client = null;

if (FILE_STORAGE_PROVIDER === 'cloudflare') {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_BASE_URL) {
    logger.warn('Cloudflare R2 configuration is incomplete. FILE_STORAGE_PROVIDER=cloudflare but some R2 env vars are missing.');
  } else {
    try {
      const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

      r2Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      });

      logger.info('Cloudflare R2 client initialized successfully.');
    } catch (err) {
      logger.error('Failed to initialize Cloudflare R2 client:', err);
      r2Client = null;
    }
  }
}

async function uploadToR2(buffer, key, contentType) {
  if (FILE_STORAGE_PROVIDER !== 'cloudflare') {
    return { success: false, error: 'Cloudflare R2 provider is not active' };
  }

  if (!r2Client) {
    return { success: false, error: 'Cloudflare R2 client not initialized' };
  }

  if (!R2_BUCKET_NAME || !R2_PUBLIC_BASE_URL) {
    return { success: false, error: 'Cloudflare R2 bucket or public base URL not configured' };
  }

  try {
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
      ACL: 'public-read',
    });

    await r2Client.send(putCommand);

    const publicUrl = `${R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;

    return { success: true, publicUrl, key };
  } catch (error) {
    logger.error('Cloudflare R2 upload error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteFromR2(key) {
  if (FILE_STORAGE_PROVIDER !== 'cloudflare') {
    return { success: false, error: 'Cloudflare R2 provider is not active' };
  }

  if (!r2Client) {
    return { success: false, error: 'Cloudflare R2 client not initialized' };
  }

  if (!R2_BUCKET_NAME) {
    return { success: false, error: 'Cloudflare R2 bucket not configured' };
  }

  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(deleteCommand);

    return { success: true };
  } catch (error) {
    logger.error('Cloudflare R2 delete error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  FILE_STORAGE_PROVIDER,
  uploadToR2,
  deleteFromR2,
};
