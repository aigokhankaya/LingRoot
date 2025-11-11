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
      hasVttUrl: !!req.body.vtt_url,
      metadata: req.body.metadata,
      body: JSON.stringify(req.body)
    });

    const { audio_url, audio_buffer, subtitles, metadata, user_id } = req.body;

    // Validate input
    if (!audio_url && !audio_buffer) {
      return res.status(400).json({
        success: false,
        error: 'Either audio_url or audio_buffer must be provided'
      });
    }

    if (!subtitles || !subtitles.vtt) {
      logger.warn('⚠️ [PODCAST UPLOAD] No VTT subtitle provided, will skip subtitle upload');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const topic = metadata?.topic || 'podcast';
    const level = metadata?.level || 'A1';
    const cleanTopic = topic.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const audioFilename = `${cleanTopic}_${level}_${timestamp}.mp3`;

    // Check if audio is already uploaded (URL starts with https://)
    let audioPublicUrl;
    
    if (audio_url && (audio_url.startsWith('https://') || audio_url.startsWith('http://'))) {
      // Audio is already uploaded, use the URL directly
      logger.info('✅ [PODCAST UPLOAD] Using existing audio URL:', audio_url);
      audioPublicUrl = audio_url;
    } else {
      // Download or use audio buffer and upload
      let audioBuffer;
      if (audio_buffer) {
        // If base64 encoded buffer is provided
        audioBuffer = Buffer.from(audio_buffer, 'base64');
        logger.info('📤 [PODCAST UPLOAD] Using provided audio buffer');
      } else if (audio_url) {
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
      } else {
        throw new Error('No audio source provided');
      }

      // Upload audio to Supabase
      logger.info('📤 [PODCAST UPLOAD] Uploading audio to Supabase...');
      audioPublicUrl = await uploadToSupabase(audioBuffer, audioFilename);

      if (!audioPublicUrl) {
        throw new Error('Failed to upload audio to Supabase');
      }

      logger.info('✅ [PODCAST UPLOAD] Audio uploaded successfully:', audioPublicUrl);
    }

    // Handle VTT subtitle
    let vttPublicUrl = null;
    
    // Check if vtt_url is provided directly (already uploaded)
    logger.info('🔍 [PODCAST UPLOAD] Checking vtt_url:', req.body.vtt_url);
    if (req.body.vtt_url && (req.body.vtt_url.startsWith('https://') || req.body.vtt_url.startsWith('http://'))) {
      logger.info('✅ [PODCAST UPLOAD] Using existing VTT URL:', req.body.vtt_url);
      vttPublicUrl = req.body.vtt_url;
    } else if (subtitles && subtitles.vtt) {
      // Upload VTT subtitle to Supabase
      const vttFilename = audioFilename.replace('.mp3', '.vtt');
      const vttBuffer = Buffer.from(subtitles.vtt, 'utf-8');
      logger.info('📤 [PODCAST UPLOAD] Uploading VTT subtitle to Supabase...');
      vttPublicUrl = await uploadToSupabase(vttBuffer, vttFilename);

      if (!vttPublicUrl) {
        logger.warn('⚠️ [PODCAST UPLOAD] Failed to upload VTT subtitle');
      } else {
        logger.info('✅ [PODCAST UPLOAD] VTT uploaded successfully:', vttPublicUrl);
      }
    } else {
      logger.info('ℹ️ [PODCAST UPLOAD] No VTT subtitle to upload');
    }

    // Save to contenthistory
    let contentHistoryId = null;
    
    // Get user_id from request body or try to extract from JWT token
    let finalUserId = user_id;
    
    if (!finalUserId) {
      // Try to get user_id from JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          finalUserId = decoded.userId || decoded.id;
          logger.info('📝 [PODCAST UPLOAD] User ID extracted from JWT:', finalUserId);
        } catch (jwtError) {
          logger.warn('⚠️ [PODCAST UPLOAD] Could not decode JWT:', jwtError.message);
        }
      }
    }
    
    if (finalUserId) {
      try {
        // Extract text from VTT if available
        let extractedText = metadata?.topic || 'Podcast';
        
        if (subtitles && subtitles.vtt) {
          try {
            // Parse VTT to extract text content
            const vttLines = subtitles.vtt.split('\n');
            const textLines = [];
            
            for (let i = 0; i < vttLines.length; i++) {
              const line = vttLines[i].trim();
              // Skip WEBVTT header, timestamps, and empty lines
              if (line && 
                  !line.startsWith('WEBVTT') && 
                  !line.match(/^\d+$/) && 
                  !line.includes('-->')) {
                textLines.push(line);
              }
            }
            
            if (textLines.length > 0) {
              extractedText = textLines.join(' ');
              logger.info('📝 [PODCAST UPLOAD] Extracted text from VTT:', extractedText.substring(0, 100) + '...');
            }
          } catch (vttParseError) {
            logger.warn('⚠️ [PODCAST UPLOAD] Failed to parse VTT:', vttParseError.message);
          }
        } else if (vttPublicUrl) {
          // Try to download and parse VTT from URL
          try {
            logger.info('📥 [PODCAST UPLOAD] Downloading VTT from URL to extract text:', vttPublicUrl);
            const vttResponse = await axios.get(vttPublicUrl, { 
              timeout: 10000,
              validateStatus: function (status) {
                return status < 500; // Accept any status less than 500
              }
            });
            
            if (vttResponse.status === 200) {
              const vttContent = vttResponse.data;
              
              const vttLines = vttContent.split('\n');
              const textLines = [];
              
              for (let i = 0; i < vttLines.length; i++) {
                const line = vttLines[i].trim();
                if (line && 
                    !line.startsWith('WEBVTT') && 
                    !line.match(/^\d+$/) && 
                    !line.includes('-->')) {
                  textLines.push(line);
                }
              }
              
              if (textLines.length > 0) {
                extractedText = textLines.join(' ');
                logger.info('📝 [PODCAST UPLOAD] Extracted text from VTT URL:', extractedText.substring(0, 100) + '...');
              }
            } else {
              logger.warn('⚠️ [PODCAST UPLOAD] VTT download returned status:', vttResponse.status);
            }
          } catch (downloadError) {
            logger.warn('⚠️ [PODCAST UPLOAD] Failed to download VTT:', downloadError.message);
            logger.warn('⚠️ [PODCAST UPLOAD] VTT URL was:', vttPublicUrl);
          }
        } else {
          logger.warn('⚠️ [PODCAST UPLOAD] No VTT URL available to extract text from');
        }
        
        const contentRecord = {
          user_id: finalUserId,
          input: metadata?.topic || 'Podcast',
          translated_text: extractedText,
          adapted_text: extractedText,
          mp3_url: audioPublicUrl,
          vtt_url: vttPublicUrl,
          level: metadata?.level || 'A1',
          input_type: 'podcast',
          created_at: new Date().toISOString()
        };

        logger.info('💾 [PODCAST UPLOAD] Saving to contenthistory:', contentRecord);

        const { data, error } = await supabase
          .from('contenthistory')
          .insert([contentRecord])
          .select()
          .single();

        if (error) {
          logger.error('❌ [PODCAST UPLOAD] Failed to save to contenthistory:', error);
          logger.error('❌ [PODCAST UPLOAD] Error details:', JSON.stringify(error, null, 2));
        } else {
          contentHistoryId = data.id;
          logger.info('✅ [PODCAST UPLOAD] Saved to contenthistory:', contentHistoryId);
        }
      } catch (dbError) {
        logger.error('❌ [PODCAST UPLOAD] Database error:', dbError);
        logger.error('❌ [PODCAST UPLOAD] Stack trace:', dbError.stack);
      }
    } else {
      logger.warn('⚠️ [PODCAST UPLOAD] No user_id provided, skipping contenthistory save');
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
    logger.error('❌ [PODCAST UPLOAD] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload podcast',
      details: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  uploadPodcast
};
