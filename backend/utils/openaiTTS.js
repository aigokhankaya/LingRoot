/**
 * OpenAI TTS (Text-to-Speech) Utility
 * Uses OpenAI's TTS API for high-quality, human-like voice synthesis
 * 
 * Models:
 * - tts-1: Standard quality, faster, cheaper ($15/1M chars)
 * - tts-1-hd: High definition, better quality ($30/1M chars)
 * 
 * Voices: alloy, echo, fable, onyx, nova, shimmer
 */

const logger = require('./logger');

// OpenAI TTS API endpoint
const TTS_API_URL = 'https://api.openai.com/v1/audio/speech';

// Available OpenAI TTS voices with characteristics
const OPENAI_VOICES = {
    'alloy': { gender: 'neutral', style: 'balanced, versatile' },
    'echo': { gender: 'male', style: 'warm, conversational' },
    'fable': { gender: 'female', style: 'expressive, British accent' },
    'onyx': { gender: 'male', style: 'deep, authoritative' },
    'nova': { gender: 'female', style: 'friendly, upbeat' },
    'shimmer': { gender: 'female', style: 'soft, calm' },
};

// Default settings
const DEFAULT_MODEL = 'tts-1';
const DEFAULT_VOICE = 'nova';
const DEFAULT_SPEED = 1.0;
const DEFAULT_FORMAT = 'mp3';

/**
 * Check if OpenAI TTS is available (API key exists)
 * @returns {boolean}
 */
function isOpenAITTSAvailable() {
    return !!process.env.OPENAI_API_KEY;
}

/**
 * Get list of available OpenAI TTS voices
 * @returns {Array} Voice list with metadata
 */
function listOpenAIVoices() {
    return Object.entries(OPENAI_VOICES).map(([name, info]) => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        gender: info.gender,
        style: info.style,
        provider: 'openai',
        languageCode: 'en-US', // OpenAI voices are multilingual but optimized for English
    }));
}

/**
 * Synthesize speech using OpenAI TTS API with retry support
 * @param {Object} options - Synthesis options
 * @param {string} options.text - Text to synthesize
 * @param {string} [options.voice='nova'] - Voice name (alloy, echo, fable, onyx, nova, shimmer)
 * @param {string} [options.model='tts-1'] - Model (tts-1 or tts-1-hd)
 * @param {number} [options.speed=1.0] - Speed (0.25 to 4.0)
 * @param {string} [options.responseFormat='mp3'] - Output format (mp3, opus, aac, flac)
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @returns {Promise<Object>} Audio buffer and metadata
 */
async function synthesizeWithOpenAI(options) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
    }

    const {
        text,
        voice = DEFAULT_VOICE,
        model = DEFAULT_MODEL,
        speed = DEFAULT_SPEED,
        responseFormat = DEFAULT_FORMAT,
        maxRetries = 3,
    } = options;

    if (!text || text.trim().length === 0) {
        throw new Error('Text is required for speech synthesis');
    }

    // Validate voice
    const validVoice = OPENAI_VOICES[voice] ? voice : DEFAULT_VOICE;

    // Validate speed (0.25 to 4.0)
    const validSpeed = Math.max(0.25, Math.min(4.0, speed));

    // Validate model
    const validModel = ['tts-1', 'tts-1-hd'].includes(model) ? model : DEFAULT_MODEL;

    logger.info(`🎙️ OpenAI TTS synthesis - Voice: ${validVoice}, Model: ${validModel}, Speed: ${validSpeed}x, Length: ${text.length} chars`);

    const requestBody = {
        model: validModel,
        input: text,
        voice: validVoice,
        speed: validSpeed,
        response_format: responseFormat,
    };

    let lastError;

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(TTS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                logger.error('❌ OpenAI TTS API error:', {
                    status: response.status,
                    error: errorData,
                    attempt,
                });

                // Don't retry on client errors (4xx) except rate limits (429)
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    throw new Error(`OpenAI TTS API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }

                throw new Error(`OpenAI TTS API error: ${response.status}`);
            }

            // Get audio as buffer
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = Buffer.from(arrayBuffer);

            logger.info(`✅ OpenAI TTS synthesis complete - Audio size: ${audioBuffer.length} bytes${attempt > 1 ? ` (attempt ${attempt})` : ''}`);

            // Estimate word timings (OpenAI doesn't provide timestamps)
            const wordTimings = estimateWordTimings(text, validSpeed);

            return {
                audioContent: audioBuffer,
                wordTimings: wordTimings.timings,
                cleanWords: wordTimings.cleanWords,
                originalWords: wordTimings.originalWords,
                totalDuration: wordTimings.totalDuration,
                speakingRate: validSpeed,
                voiceName: validVoice,
                model: validModel,
                timingMethod: 'OpenAI Estimated Linear',
                provider: 'openai',
                success: true,
            };

        } catch (error) {
            lastError = error;
            const isNetworkError = error.message.includes('fetch failed') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('EAI_AGAIN');

            if (attempt < maxRetries && isNetworkError) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                logger.warn(`⚠️ OpenAI TTS attempt ${attempt}/${maxRetries} failed (network error), retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (attempt < maxRetries && error.message.includes('429')) {
                // Rate limit - wait longer
                const delay = 10000; // 10 seconds
                logger.warn(`⚠️ OpenAI TTS rate limited, waiting ${delay / 1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                logger.error(`❌ OpenAI TTS synthesis failed after ${attempt} attempts: ${error.message}`);
                throw error;
            }
        }
    }

    throw lastError;
}

/**
 * Estimate word timings for OpenAI TTS output
 * OpenAI TTS doesn't provide word-level timestamps, so we estimate based on text length
 * @param {string} text - Original text
 * @param {number} speed - Speaking speed multiplier
 * @returns {Object} Estimated timings
 */
function estimateWordTimings(text, speed = 1.0) {
    // Clean text and extract words
    const originalWords = text.split(/\s+/).filter(word => word.length > 0);
    const cleanWords = originalWords.map(word =>
        word.replace(/[^\w]/g, '').trim()
    ).filter(word => word.length > 0);

    // Average speaking rate: ~150 words per minute at 1x speed
    // That's about 2.5 words per second, or 0.4 seconds per word
    const baseWordDuration = 0.4 / speed;

    // Estimate total duration
    const totalDuration = cleanWords.length * baseWordDuration;

    // Generate linear timing estimates
    const timings = cleanWords.map((word, index) => ({
        word,
        timeSeconds: index * baseWordDuration,
        endTimeSeconds: (index + 1) * baseWordDuration,
        markName: `word_${index}`,
        hasDirectTiming: false, // These are estimates, not actual timestamps
    }));

    return {
        timings,
        cleanWords,
        originalWords,
        totalDuration,
    };
}

/**
 * Get voice gender for compatibility with existing code
 * @param {string} voiceName - OpenAI voice name
 * @returns {string} Gender (MALE, FEMALE, NEUTRAL)
 */
function getOpenAIVoiceGender(voiceName) {
    const voice = OPENAI_VOICES[voiceName];
    if (!voice) return 'NEUTRAL';

    switch (voice.gender) {
        case 'male': return 'MALE';
        case 'female': return 'FEMALE';
        default: return 'NEUTRAL';
    }
}

module.exports = {
    synthesizeWithOpenAI,
    listOpenAIVoices,
    isOpenAITTSAvailable,
    getOpenAIVoiceGender,
    OPENAI_VOICES,
};
