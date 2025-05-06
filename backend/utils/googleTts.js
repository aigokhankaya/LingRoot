const textToSpeech = require("@google-cloud/text-to-speech");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const logger = require("./logger"); // Winston logger

// Constants for configuration
const DEFAULT_CONFIG = {
    languageCode: "en-US",
    voiceName: "en-US-Wavenet-D",
    speakingRate: 1.0,
    audioEncoding: "MP3",
    pitch: 0,
    volumeGainDb: 0,
    effectsProfileId: ["large-home-entertainment-class-device"]
};

// Cache for the TTS client
let client = null;

/**
 * Initialize the Google TTS client
 * @returns {Promise<textToSpeech.TextToSpeechClient>} The initialized client
 */
async function initializeClient() {
    if (client) return client;

    try {
        // Try to get credentials from environment variable first
        const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        
        // If no environment variable, try default location
        const defaultKeyPath = path.join(__dirname, "..", "gcp-service-account-key.json");
        
        const finalKeyPath = keyPath || defaultKeyPath;
        
        if (!fs.existsSync(finalKeyPath)) {
            logger.error(`Credential file not found at path: ${finalKeyPath}`);
            throw new Error(`Google Cloud credentials file not found. Please ensure the credentials file exists at: ${finalKeyPath}`);
        }

        client = new textToSpeech.TextToSpeechClient({
            keyFilename: finalKeyPath,
        });

        logger.info("✅ Google Cloud Text-to-Speech client initialized successfully.");
        return client;
    } catch (error) {
        logger.error("❌ Failed to initialize Google Cloud TTS client:", { 
            message: error.message,
            stack: error.stack 
        });
        throw new Error("Google TTS client failed to initialize. Please check your credentials and ensure the Text-to-Speech API is enabled in your Google Cloud project.");
    }
}

/**
 * Validate and sanitize input parameters
 * @param {Object} params Input parameters
 * @returns {Object} Sanitized parameters
 */
function validateAndSanitizeParams(params) {
    const {
        textChunk,
        languageCode = DEFAULT_CONFIG.languageCode,
        voiceName = DEFAULT_CONFIG.voiceName,
        speakingRate = DEFAULT_CONFIG.speakingRate,
        pitch = DEFAULT_CONFIG.pitch,
        volumeGainDb = DEFAULT_CONFIG.volumeGainDb
    } = params;

    // Validate text
    if (!textChunk || typeof textChunk !== 'string') {
        throw new Error('Invalid text input');
    }

    // Sanitize speaking rate
    const sanitizedRate = Math.max(0.25, Math.min(4.0, speakingRate));

    // Sanitize pitch
    const sanitizedPitch = Math.max(-20.0, Math.min(20.0, pitch));

    // Sanitize volume gain
    const sanitizedVolume = Math.max(-96.0, Math.min(16.0, volumeGainDb));

    return {
        textChunk,
        languageCode,
        voiceName,
        speakingRate: sanitizedRate,
        pitch: sanitizedPitch,
        volumeGainDb: sanitizedVolume
    };
}

/**
 * Synthesizes speech for a single text chunk using Google TTS API.
 * @param {string} textChunk The text chunk to synthesize.
 * @param {string} languageCode The language code (e.g., "en-US").
 * @param {string} voiceName The voice name (e.g., "en-US-Wavenet-D").
 * @param {number} speakingRate The speaking rate (1.0 is normal).
 * @param {number} pitch The pitch adjustment (-20.0 to 20.0).
 * @param {number} volumeGainDb The volume gain in decibels (-96.0 to 16.0).
 * @returns {Promise<Buffer|null>} The audio content as a Buffer, or null on error.
 */
async function synthesizeSingleChunk(textChunk, languageCode, voiceName, speakingRate, pitch, volumeGainDb) {
    try {
        const params = validateAndSanitizeParams({
            textChunk,
            languageCode,
            voiceName,
            speakingRate,
            pitch,
            volumeGainDb
        });

        const request = {
            input: { text: params.textChunk },
            voice: { 
                languageCode: params.languageCode, 
                name: params.voiceName 
            },
            audioConfig: {
                audioEncoding: DEFAULT_CONFIG.audioEncoding,
                speakingRate: params.speakingRate,
                pitch: params.pitch,
                volumeGainDb: params.volumeGainDb,
                effectsProfileId: DEFAULT_CONFIG.effectsProfileId
            },
        };

        logger.debug(`🔊 Sending TTS request for chunk (first 50 chars): "${params.textChunk.substring(0, 50)}..."`);
        const [response] = await client.synthesizeSpeech(request);
        logger.debug(`✅ TTS response received for chunk.`);
        return response.audioContent;
    } catch (error) {
        logger.error(`❌ TTS API error for chunk: "${textChunk.substring(0, 50)}..."`, { 
            message: error.message,
            stack: error.stack
        });
        return null;
    }
}

/**
 * Synthesizes speech for multiple text chunks with parallel processing.
 * @param {string[]} textChunks Array of text chunks.
 * @param {Object} options Configuration options
 * @returns {Promise<Buffer[]|null>} Array of audio content Buffers, or null if critical failure occurs.
 */
async function synthesizeSpeechChunks(textChunks, options = {}) {
    if (!textChunks || textChunks.length === 0) {
        logger.warn("⚠️ No text chunks provided for speech synthesis.");
        return [];
    }

    try {
        // Initialize client if not already initialized
        await initializeClient();

        const {
            languageCode = DEFAULT_CONFIG.languageCode,
            voiceName = DEFAULT_CONFIG.voiceName,
            speakingRate = DEFAULT_CONFIG.speakingRate,
            pitch = DEFAULT_CONFIG.pitch,
            volumeGainDb = DEFAULT_CONFIG.volumeGainDb,
            maxConcurrent = 3 // Limit concurrent requests
        } = options;

        const audioSegments = [];
        logger.info(`🗣️ Starting TTS for ${textChunks.length} chunk(s). Language: ${languageCode}, Voice: ${voiceName}, Rate: ${speakingRate}`);

        // Process chunks in batches to limit concurrent requests
        for (let i = 0; i < textChunks.length; i += maxConcurrent) {
            const batch = textChunks.slice(i, i + maxConcurrent);
            const batchPromises = batch.map((chunk, index) => {
                const chunkIndex = i + index;
                logger.info(`▶️ Synthesizing chunk ${chunkIndex + 1}/${textChunks.length}: "${chunk.substring(0, 50)}..."`);
                return synthesizeSingleChunk(
                    chunk,
                    languageCode,
                    voiceName,
                    speakingRate,
                    pitch,
                    volumeGainDb
                );
            });

            const batchResults = await Promise.all(batchPromises);
            audioSegments.push(...batchResults.filter(Boolean));
        }

        if (audioSegments.length === 0) {
            logger.error("❌ No valid audio segments generated. Aborting.");
            return null;
        }

        logger.info(`🎉 Finished synthesis. ${audioSegments.length}/${textChunks.length} chunks succeeded.`);
        return audioSegments;
    } catch (error) {
        logger.error("❌ Critical error in synthesizeSpeechChunks:", {
            message: error.message,
            stack: error.stack
        });
        return null;
    }
}

/**
 * Synthesizes speech with timepoints for a single text chunk using Google TTS API and SSML <mark> tags.
 * @param {string} textChunk The text chunk to synthesize.
 * @param {string} languageCode The language code (e.g., "en-US").
 * @param {string} voiceName The voice name (e.g., "en-US-Wavenet-D").
 * @param {number} speakingRate The speaking rate (1.0 is normal).
 * @returns {Promise<{audioContent: Buffer, timepoints: Array, words: Array}>} The audio content, timepoints, and words.
 */
async function synthesizeChunkWithTimepoints(textChunk, languageCode, voiceName, speakingRate) {
    await initializeClient();
    // Kelimelere böl ve SSML <mark> ile işaretle
    const words = textChunk.split(/\s+/).filter(Boolean);
    let ssml = '<speak>';
    words.forEach((word, i) => {
        ssml += `<mark name="w${i}"/>${word}`; // Boşluk kaldırıldı
    });
    ssml += '</speak>';

    const request = {
        input: { ssml },
        voice: { languageCode, name: voiceName },
        audioConfig: {
            audioEncoding: DEFAULT_CONFIG.audioEncoding,
            speakingRate,
            effectsProfileId: DEFAULT_CONFIG.effectsProfileId
        },
        enableTimePointing: ['SSML_MARK']
    };
    const [response] = await client.synthesizeSpeech(request);
    console.log("Google TTS SSML:", ssml);
    console.log("Google TTS response.timepoints:", response.timepoints);
    return {
        audioContent: response.audioContent,
        timepoints: response.timepoints,
        words
    };
}

module.exports = {
    synthesizeSpeechChunks,
    DEFAULT_CONFIG,
    synthesizeChunkWithTimepoints
};
