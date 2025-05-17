const fs = require('fs');
const { google } = require('@google-cloud/text-to-speech');
const logger = require('../config/logger');
const { chunkText } = require('./textProcessor');

const googleClient = new google.TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './backend/google-credentials.json',
});

/**
 * Google TTS ile tek bir metni sese çevirir
 * @param {Object} params
 * @param {string} params.text
 * @param {string} params.voiceName
 * @param {string} params.languageCode
 * @returns {Promise<string|null>} Base64 MP3
 */
async function synthesizeWithGoogle({ text, voiceName, languageCode }) {
    try {
        const request = {
            input: { text },
            voice: { languageCode, name: voiceName },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [response] = await googleClient.synthesizeSpeech(request);
        if (response.audioContent) {
            return Buffer.from(response.audioContent).toString('base64');
        } else {
            logger.error('Google TTS response did not contain audioContent.');
            return null;
        }
    } catch (error) {
        logger.error('Google TTS error:', { message: error.message, stack: error.stack });
        return null;
    }
}

/**
 * Uzun metni Google TTS ile parçalara bölerek sese çevirir
 * @param {Object} params
 * @param {string} params.text
 * @param {string} params.voiceName
 * @param {string} params.languageCode
 * @param {number} [params.maxBytes] - Default 4500
 * @returns {Promise<string|null>} Base64 birleşik MP3
 */
async function synthesizeLongTextWithGoogle({ text, voiceName, languageCode, maxBytes = 4500 }) {
    const chunks = chunkText(text, maxBytes);
    logger.debug(`🧩 [Google TTS] Chunk count: ${chunks.length}`);

    const audioBuffers = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        logger.debug(`▶️ [Chunk ${i + 1}/${chunks.length}] Sending to Google TTS...`);
        const base64Audio = await synthesizeWithGoogle({ text: chunk, voiceName, languageCode });
        if (!base64Audio) {
            logger.error(`❌ [Chunk ${i + 1}] Google TTS failed.`);
            return null;
        }
        audioBuffers.push(Buffer.from(base64Audio, 'base64'));
    }

    const mergedAudio = Buffer.concat(audioBuffers);
    return mergedAudio.toString('base64');
}

/**
 * Google TTS destekli sesleri getirir
 * @param {string} [languageCode] - opsiyonel, sadece belirli bir dil için
 * @returns {Promise<Array>} Array of voice objects
 */
async function listGoogleVoices(languageCode) {
    try {
        const request = languageCode ? { languageCode } : {};
        const [result] = await googleClient.listVoices(request);
        return (result.voices || []).map(v => ({
            name: v.name,
            languageCodes: v.languageCodes,
            gender: v.ssmlGender,
            naturalSampleRateHertz: v.naturalSampleRateHertz
        }));
    } catch (error) {
        logger.error('Google TTS list voices error:', { message: error.message, stack: error.stack });
        return [];
    }
}

module.exports = {
    synthesizeWithGoogle,
    synthesizeLongTextWithGoogle,
    listGoogleVoices,
}; 