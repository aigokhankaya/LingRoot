/**
 * Per-Speaker Synthesizer Module for Podcast V2
 * Synthesizes audio for each speaker's turns separately using Gemini TTS
 */

const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const logger = require('../../common/logger.js');
const { notifyAIError, AI_PROVIDERS } = require('../../notifications/aiErrorNotifier.js');

// Gemini TTS configuration
const GEMINI_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const MAX_INPUT_BYTES = 3000;
const DEFAULT_MODEL = 'gemini-2.5-flash-tts';

/**
 * Get UTF-8 byte length of a string
 */
function getUtf8ByteLength(str) {
  return Buffer.byteLength(String(str || ''), 'utf8');
}

/**
 * Get Google Auth access token
 */
async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const tokenResult = await auth.getAccessToken();
  return typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
}

/**
 * Synthesize a single turn's audio
 * @param {string} text - Turn text
 * @param {string} speakerId - Gemini speaker ID (e.g., 'Kore', 'Charon')
 * @param {string} speakerAlias - 'Host' or 'Guest'
 * @param {Object} options - Synthesis options
 * @returns {Object} Audio buffer and metadata
 */
async function synthesizeSingleTurn(text, speakerId, speakerAlias, options = {}) {
  const {
    accessToken,
    projectId,
    model = DEFAULT_MODEL,
    stylePrompt = 'Speak naturally and conversationally.',
  } = options;

  // Use text directly for single-speaker synthesis
  const formattedText = text;

  // Check byte limit
  if (getUtf8ByteLength(formattedText) > MAX_INPUT_BYTES) {
    logger.warn(`[PODCAST-V2] Turn text exceeds ${MAX_INPUT_BYTES} bytes, may need chunking`);
  }

  // Voices that support style prompts (Chirp3/Gemini native voices)
  const PROMPT_SUPPORTED_VOICES = ['Kore', 'Charon', 'Puck', 'Fenrir', 'Leda', 'Orus', 'Zephyr'];
  const supportsPrompt = PROMPT_SUPPORTED_VOICES.includes(speakerId);

  const buildRequestBody = (usePrompt) => ({
    input: usePrompt && supportsPrompt
      ? { text: formattedText, prompt: stylePrompt }
      : { text: formattedText },
    voice: {
      languageCode: 'en-us',
      name: speakerId,
      model_name: model,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 24000,
    },
  });

  // Retry logic with exponential backoff
  let lastError;
  let usePrompt = true;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const requestBody = buildRequestBody(usePrompt);

      const response = await axios.post(
        GEMINI_TTS_ENDPOINT,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-user-project': projectId,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      if (!response.data || !response.data.audioContent) {
        throw new Error('No audio content received from Gemini TTS');
      }

      const audioBuffer = Buffer.from(response.data.audioContent, 'base64');

      return {
        audioBuffer,
        byteLength: audioBuffer.length,
        textLength: text.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      };
    } catch (error) {
      lastError = error;
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.warn(`[PODCAST-V2] TTS attempt ${attempt}/3 failed: ${errMsg}`);

      // If prompt not supported, retry without prompt
      if (errMsg.includes('prompt') && usePrompt) {
        logger.info(`[PODCAST-V2] Voice ${speakerId} does not support prompt, retrying without it`);
        usePrompt = false;
        continue; // Retry immediately without prompt
      }

      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Synthesize all turns for a speaker
 * @param {Array} speakerTurns - Array of turns for one speaker (from turnGrouper)
 * @param {string} speakerId - Gemini speaker ID
 * @param {string} speakerAlias - 'Host' or 'Guest'
 * @param {Object} options - Synthesis options
 * @returns {Object} Synthesized segments with metadata
 */
async function synthesizeSpeakerTurns(speakerTurns, speakerId, speakerAlias, options = {}) {
  if (!speakerTurns || speakerTurns.length === 0) {
    logger.info(`[PODCAST-V2] No turns for ${speakerAlias}, returning empty segments`);
    return {
      segments: [],
      totalDuration: 0,
      totalCharacters: 0,
      speakerId,
      speakerAlias,
    };
  }

  const {
    model = DEFAULT_MODEL,
    stylePrompt = 'Speak naturally and conversationally.',
    userId = null,
  } = options;

  logger.info(`[PODCAST-V2] Synthesizing ${speakerTurns.length} turns for ${speakerAlias} (${speakerId})`);

  // Get auth token once for all turns
  const accessToken = await getAccessToken();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  const segments = [];
  let totalCharacters = 0;

  for (let i = 0; i < speakerTurns.length; i++) {
    const turn = speakerTurns[i];

    try {
      const result = await synthesizeSingleTurn(
        turn.text,
        speakerId,
        speakerAlias,
        {
          accessToken,
          projectId,
          model,
          stylePrompt,
        }
      );

      segments.push({
        originalIndex: turn.originalIndex,
        speaker: turn.speaker,
        text: turn.text,
        audioBuffer: result.audioBuffer,
        byteLength: result.byteLength,
        wordCount: result.wordCount,
        // Duration will be calculated after merge or via ffprobe
        duration: null,
      });

      totalCharacters += turn.text.length;

      if ((i + 1) % 5 === 0) {
        logger.info(`[PODCAST-V2] ${speakerAlias} progress: ${i + 1}/${speakerTurns.length} turns synthesized`);
      }

      // Small delay to avoid rate limiting
      if (i < speakerTurns.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      logger.error(`[PODCAST-V2] Failed to synthesize turn ${turn.originalIndex} for ${speakerAlias}: ${error.message}`);

      // Notify admin of TTS failure
      notifyAIError({
        provider: AI_PROVIDERS.GEMINI_TTS,
        method: 'synthesizeSpeakerTurns',
        error,
        userId,
        context: {
          speakerId,
          speakerAlias,
          turnIndex: turn.originalIndex,
          model,
        },
      }).catch(e => logger.warn('[PODCAST-V2] Failed to send error notification:', e.message));

      throw error;
    }
  }

  logger.info(`[PODCAST-V2] Completed ${speakerAlias} synthesis: ${segments.length} segments, ${totalCharacters} chars`);

  return {
    segments,
    totalDuration: null, // Will be calculated after audio analysis
    totalCharacters,
    speakerId,
    speakerAlias,
  };
}

/**
 * Get audio duration using ffprobe
 * @param {Buffer} audioBuffer - Audio buffer
 * @returns {number} Duration in seconds
 */
async function getAudioDuration(audioBuffer) {
  const ffmpeg = require('fluent-ffmpeg');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { v4: uuidv4 } = require('uuid');

  const tempFile = path.join(os.tmpdir(), `podcast_v2_duration_${uuidv4()}.mp3`);

  try {
    fs.writeFileSync(tempFile, audioBuffer);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempFile, (err, metadata) => {
        // Cleanup temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }

        if (err) {
          reject(err);
          return;
        }

        const duration = metadata?.format?.duration || 0;
        resolve(duration);
      });
    });
  } catch (error) {
    // Cleanup on error
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Calculate durations for all segments
 * @param {Array} segments - Array of synthesized segments
 * @returns {Array} Segments with duration populated
 */
async function calculateSegmentDurations(segments) {
  const segmentsWithDuration = [];

  for (const segment of segments) {
    try {
      const duration = await getAudioDuration(segment.audioBuffer);
      segmentsWithDuration.push({
        ...segment,
        duration,
      });
    } catch (error) {
      logger.warn(`[PODCAST-V2] Failed to get duration for segment ${segment.originalIndex}: ${error.message}`);
      // Estimate duration based on word count (roughly 150 words per minute)
      const estimatedDuration = (segment.wordCount / 150) * 60;
      segmentsWithDuration.push({
        ...segment,
        duration: estimatedDuration,
        durationEstimated: true,
      });
    }
  }

  return segmentsWithDuration;
}

module.exports = {
  synthesizeSpeakerTurns,
  synthesizeSingleTurn,
  getAudioDuration,
  calculateSegmentDurations,
};
