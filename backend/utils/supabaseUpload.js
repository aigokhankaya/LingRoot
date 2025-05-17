const { supabase } = require('./supabaseClient');
const { v4: uuidv4 } = require('uuid');

/**
 * Google TTS çıktısı olan MP3 buffer'ını Supabase'e yükler
 * @param {Buffer} bufferAudio
 * @param {string} extension - default: mp3
 * @param {string} level - default: B1
 * @returns {Promise<string|null>} public URL
 */
async function uploadBase64ToSupabase({ bufferAudio, extension = 'mp3', level = 'B1' }) {
    try {
        const filename = `${level.toLowerCase()}_${uuidv4()}.${extension}`;
        const filePath = `outputs/${filename}`;
        const contentType = 'audio/mpeg';

        const { error: uploadError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET_NAME)
            .upload(filePath, bufferAudio, {
                contentType,
                upsert: false,
            });

        if (uploadError) {
            console.error('❌ Supabase upload error:', uploadError.message);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from(process.env.SUPABASE_BUCKET_NAME)
            .getPublicUrl(filePath);

        return publicUrlData?.publicUrl || null;
    } catch (err) {
        console.error('❌ Supabase upload failed:', err.message);
        return null;
    }
}

module.exports = {
    uploadBase64ToSupabase,
}; 