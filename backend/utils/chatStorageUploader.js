// backend/utils/chatStorageUploader.js
const { supabase, bucketName } = require('./supabaseClient');
const logger = require('./logger');

/**
 * Uploads a file buffer to Supabase storage for chat attachments
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} conversationId - Conversation ID for organizing files
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{success: boolean, publicUrl?: string, storagePath?: string, error?: string}>}
 */
async function uploadChatAttachment(fileBuffer, conversationId, originalFilename, mimeType) {
  if (!supabase) {
    logger.error('Supabase client is not initialized. Cannot upload chat attachment.');
    return { success: false, error: 'Storage service unavailable' };
  }

  if (!bucketName) {
    logger.error('SUPABASE_BUCKET_NAME not configured');
    return { success: false, error: 'Storage bucket not configured' };
  }

  try {
    // Create safe filename with timestamp
    const timestamp = Date.now();
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `chat/${conversationId}/${timestamp}-${safeFilename}`;

    logger.info(`Uploading chat attachment to Supabase: ${storagePath}`);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (uploadError) {
      logger.error(`Supabase upload error for chat attachment: ${uploadError.message}`, { error: uploadError });
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    logger.info(`Chat attachment uploaded successfully: ${data?.path || storagePath}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    if (urlData && urlData.publicUrl) {
      logger.info(`Chat attachment public URL: ${urlData.publicUrl}`);
      return {
        success: true,
        publicUrl: urlData.publicUrl,
        storagePath: storagePath
      };
    } else {
      // Fallback: construct URL manually
      const constructedUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${storagePath}`;
      logger.warn(`Using constructed URL for chat attachment: ${constructedUrl}`);
      return {
        success: true,
        publicUrl: constructedUrl,
        storagePath: storagePath
      };
    }

  } catch (error) {
    logger.error(`Error uploading chat attachment: ${error.message}`, { error });
    return { success: false, error: `Upload error: ${error.message}` };
  }
}

/**
 * Delete a chat attachment from Supabase storage
 * @param {string} storagePath - Storage path of the file to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteChatAttachment(storagePath) {
  if (!supabase || !bucketName) {
    logger.error('Supabase client or bucket not configured for deletion');
    return { success: false, error: 'Storage service unavailable' };
  }

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([storagePath]);

    if (error) {
      logger.error(`Error deleting chat attachment: ${error.message}`, { error });
      return { success: false, error: error.message };
    }

    logger.info(`Chat attachment deleted successfully: ${storagePath}`);
    return { success: true };
  } catch (error) {
    logger.error(`Exception deleting chat attachment: ${error.message}`, { error });
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadChatAttachment,
  deleteChatAttachment
};
