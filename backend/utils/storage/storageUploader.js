// backend/utils/storageUploader.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const logger = require('../common/logger.js'); // Import Winston logger
const { FILE_STORAGE_PROVIDER, uploadToR2 } = require('./cloudflareR2Client.js');

// Initialize Supabase client (used when FILE_STORAGE_PROVIDER === 'supabase')
let supabase;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME;

if (FILE_STORAGE_PROVIDER === 'supabase') {
    if (supabaseUrl && supabaseServiceKey) {
        try {
            supabase = createClient(supabaseUrl, supabaseServiceKey);
            logger.info("Supabase client initialized successfully.");
        } catch (error) {
            logger.error(`Failed to initialize Supabase client: ${error.message}`);
            supabase = null;
        }
    } else {
        logger.warn("Supabase URL or Service Key not found in environment variables. File uploads will not work.");
        supabase = null;
    }
} else {
    supabase = null;
}

/**
 * Uploads a local file or Buffer to storage and returns the public URL.
 * Provider is selected via FILE_STORAGE_PROVIDER env ("supabase" | "cloudflare").
 * @param {string|Buffer} localFilePathOrBuffer Path to the local file or Buffer to upload.
 * @param {string} destinationFilename Desired filename in the bucket.
 * @param {string} contentType Optional MIME type (default: auto-detect from extension)
 * @returns {Promise<string|null>} The public URL of the uploaded file, or null on error.
 */
async function uploadToSupabase(localFilePathOrBuffer, destinationFilename, contentType = null) {
    // Load test mock: skip real storage upload
    const { isLoadTestMode, getLoadTestDelay } = require('../../tests/load/mocks/mockConfig');
    if (isLoadTestMode()) {
        const { getMockStorageUrl } = require('../../tests/load/mocks/storageMock');
        await new Promise(r => setTimeout(r, getLoadTestDelay('storage')));
        return getMockStorageUrl(destinationFilename);
    }

    const cleanFilename = destinationFilename.replace(/\s+/g, "_");
    const storagePath = `audio/${cleanFilename}`;

    let fileBuffer;
    
    // Check if input is a Buffer or file path
    if (Buffer.isBuffer(localFilePathOrBuffer)) {
        logger.info(`Attempting to upload Buffer (${localFilePathOrBuffer.length} bytes) to storage at path '${storagePath}'`);
        fileBuffer = localFilePathOrBuffer;
    } else {
        // It's a file path
        if (!fs.existsSync(localFilePathOrBuffer)) {
            logger.error(`Local file not found for upload: ${localFilePathOrBuffer}`);
            return null;
        }
        logger.info(`Attempting to upload ${localFilePathOrBuffer} to storage at path '${storagePath}'`);
        fileBuffer = fs.readFileSync(localFilePathOrBuffer);
    }

    try {
        // Auto-detect content type if not provided
        if (!contentType) {
            const ext = cleanFilename.split('.').pop().toLowerCase();
            const mimeTypes = {
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'aac': 'audio/aac',
                'vtt': 'text/vtt',
                'srt': 'text/plain',
                'txt': 'text/plain',
                'json': 'application/json'
            };
            contentType = mimeTypes[ext] || 'application/octet-stream';
        }

        logger.info(`Uploading with content type: ${contentType}`);

        if (FILE_STORAGE_PROVIDER === 'cloudflare') {
            const r2Result = await uploadToR2(fileBuffer, storagePath, contentType);
            if (!r2Result.success) {
                logger.error(`Cloudflare R2 upload error: ${r2Result.error}`);
                return null;
            }
            logger.info(`File uploaded to Cloudflare R2 path: ${storagePath}`);
            return r2Result.publicUrl;
        }

        if (FILE_STORAGE_PROVIDER === 'supabase') {
            if (!supabase) {
                logger.error("Supabase client is not initialized. Cannot upload file.");
                return null;
            }

            const { data, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(storagePath, fileBuffer, {
                    contentType: contentType,
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                logger.error(`Supabase upload error: ${uploadError.message}`, { error: uploadError });
                throw uploadError;
            }

            logger.info(`File uploaded to Supabase path: ${data?.path || storagePath}`);

            // Get the public URL
            const { data: urlData, error: urlError } = supabase.storage
                .from(bucketName)
                .getPublicUrl(storagePath);

            if (urlError) {
                logger.error(`Supabase getPublicUrl error: ${urlError.message}`, { error: urlError });
                // Fallback: Construct URL manually assuming public bucket
                const constructedUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
                logger.warn(`Could not retrieve public URL via API. Attempting to use manually constructed URL: ${constructedUrl}`);
                return constructedUrl; 
            }

            if (urlData && urlData.publicUrl) {
                logger.info(`Successfully retrieved public URL: ${urlData.publicUrl}`);
                return urlData.publicUrl;
            } else {
                // This case might happen if urlData is returned but publicUrl is missing
                logger.error("Could not retrieve public URL from Supabase response, although no explicit error was thrown.", { urlData });
                // Fallback: Construct URL manually
                const constructedUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
                logger.warn(`Could not retrieve public URL from response data. Attempting to use manually constructed URL: ${constructedUrl}`);
                return constructedUrl;
            }
        }

        logger.error(`Unsupported FILE_STORAGE_PROVIDER: ${FILE_STORAGE_PROVIDER}`);
        return null;
    } catch (error) {
        // Catch errors from upload or manual URL construction
        logger.error(`Supabase operation error during upload/URL retrieval: ${error.message}`, { error });
        return null;
    }
    // Temporary file cleanup is handled by the controller (ttsController.js)
}

module.exports = { uploadToSupabase };

