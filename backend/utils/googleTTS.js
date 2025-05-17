const textToSpeech = require('@google-cloud/text-to-speech');
const logger = require('./logger');

// Google TTS client (GOOGLE_APPLICATION_CREDENTIALS env ile çalışır)
const googleClient = new textToSpeech.TextToSpeechClient();

/**
 * Google TTS ile ses sentezle
 * @param {Object} params
 * @param {string} params.text
 * @param {string} params.voiceName - Google voice name (ör: 'en-US-Wavenet-D')
 * @param {string} params.languageCode - (ör: 'en-US')
 * @param {number} params.speakingRate - (ör: 1.0)
 * @returns {Promise<string|null>} Base64-encoded MP3 audio
 */
async function synthesizeWithGoogle({ text, voiceName, languageCode, speakingRate = 1.0 }) {
    try {
        // 🛡️ Boş değer kontrolü
        if (!voiceName || !languageCode) {
            throw new Error("Voice name and language code must be provided.");
        }

        const request = {
            input: { text },
            voice: {
                languageCode,
                name: voiceName
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: speakingRate
            },
        };

        const [response] = await googleClient.synthesizeSpeech(request);
        if (response.audioContent) {
            return response.audioContent;
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

module.exports = { synthesizeWithGoogle, listGoogleVoices }; 