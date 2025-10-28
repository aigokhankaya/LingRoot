const { uploadToSupabase } = require('../utils/storageUploader');
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Podcast upload endpoint for n8n
 * Expects:
 * - audio_url: URL to download the audio file OR audio_buffer as base64
 * - subtitles: { srt: string, vtt: string }
 * - metadata: { topic, level, duration_seconds, file_name }
 * - user_id: (optional) to associate with a user
 */
const uploadPodcast = async (req, res) => {
  try {
    logger.info('📤 [PODCAST UPLOAD] Request received', {
      hasAudioUrl: !!req.body.audio_url,
      hasAudioBuffer: !!req.body.audio_buffer,
      hasSubtitles: !!req.body.subtitles,
      metadata: req.body.metadata
    });

    const { audio_url, audio_buffer, subtitles, metadata, user_id } = req.body;

    // Validate input
    if (!audio_url && !audio_buffer) {
      return res.status(400).json({
        success: false,
        error: 'Either audio_url or audio_buffer must be provided'
      });
    }

    if (!subtitles || !subtitles.vtt || !subtitles.srt) {
      return res.status(400).json({
        success: false,
        error: 'Subtitles (both vtt and srt) must be provided'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const topic = metadata?.topic || 'podcast';
    const level = metadata?.level || 'A1';
    const cleanTopic = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const audioFilename = `${cleanTopic}_${level}_${timestamp}.mp3`;

    // Download or use audio buffer
    let audioBuffer;
    if (audio_buffer) {
      // If base64 encoded buffer is provided
      audioBuffer = Buffer.from(audio_buffer, 'base64');
      logger.info('📤 [PODCAST UPLOAD] Using provided audio buffer');
    } else {
      // Download from URL
      logger.info('📤 [PODCAST UPLOAD] Downloading audio from URL:', audio_url);
      const audioResponse = await axios.get(audio_url, {
        responseType: 'arraybuffer',
        timeout: 60000 // 60 seconds timeout
      });
      audioBuffer = Buffer.from(audioResponse.data);
      logger.info('📤 [PODCAST UPLOAD] Audio downloaded successfully', {
        size: audioBuffer.length
      });
    }

    // Upload audio to Supabase
    logger.info('📤 [PODCAST UPLOAD] Uploading audio to Supabase...');
    const audioPublicUrl = await uploadToSupabase(audioBuffer, audioFilename);

    if (!audioPublicUrl) {
      throw new Error('Failed to upload audio to Supabase');
    }

    logger.info('✅ [PODCAST UPLOAD] Audio uploaded successfully:', audioPublicUrl);

    // Upload VTT subtitle to Supabase
    const vttFilename = audioFilename.replace('.mp3', '.vtt');
    const vttBuffer = Buffer.from(subtitles.vtt, 'utf-8');
    logger.info('📤 [PODCAST UPLOAD] Uploading VTT subtitle to Supabase...');
    const vttPublicUrl = await uploadToSupabase(vttBuffer, vttFilename);

    if (!vttPublicUrl) {
      logger.warn('⚠️ [PODCAST UPLOAD] Failed to upload VTT subtitle');
    } else {
      logger.info('✅ [PODCAST UPLOAD] VTT uploaded successfully:', vttPublicUrl);
    }

    // Optionally save to contenthistory if user_id is provided
    let contentHistoryId = null;
    if (user_id) {
      try {
        const contentRecord = {
          user_id,
          input: metadata?.topic || 'Podcast',
          adapted_text: metadata?.topic || 'Podcast',
          mp3_url: audioPublicUrl,
          vtt_url: vttPublicUrl,
          level: metadata?.level || 'A1',
          content_type: 'podcast',
          speaking_rate: metadata?.speaking_rate || 1.0,
          duration_seconds: parseFloat(metadata?.duration_seconds || 0),
          file_name: audioFilename,
          subtitles_srt: subtitles.srt,
          subtitles_vtt: subtitles.vtt,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('contenthistory')
          .insert([contentRecord])
          .select()
          .single();

        if (error) {
          logger.error('❌ [PODCAST UPLOAD] Failed to save to contenthistory:', error);
        } else {
          contentHistoryId = data.id;
          logger.info('✅ [PODCAST UPLOAD] Saved to contenthistory:', contentHistoryId);
        }
      } catch (dbError) {
        logger.error('❌ [PODCAST UPLOAD] Database error:', dbError);
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Podcast uploaded successfully',
      data: {
        audio: {
          public_url: audioPublicUrl,
          file_name: audioFilename
        },
        subtitles: {
          vtt_url: vttPublicUrl,
          srt: subtitles.srt,
          vtt: subtitles.vtt
        },
        metadata: {
          duration_seconds: metadata?.duration_seconds,
          level: metadata?.level,
          topic: metadata?.topic
        },
        content_history_id: contentHistoryId
      }
    });

  } catch (error) {
    logger.error('❌ [PODCAST UPLOAD] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload podcast',
      details: error.toString()
    });
  }
};

module.exports = {
  uploadPodcast
};
