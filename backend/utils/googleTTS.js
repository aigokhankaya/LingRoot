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
        
        // Fallback mechanism for unsupported voices
        if (error.message.includes('not found') || error.message.includes('invalid') || error.message.includes('does not support')) {
            logger.warn(`Voice ${voiceName} not supported, trying fallback voices...`);
            
            // Define fallback voices based on language code and gender
            const fallbackVoices = {
                'en-GB': ['en-GB-Wavenet-A', 'en-GB-Wavenet-B', 'en-GB-Standard-A', 'en-GB-Standard-B'],
                'en-US': ['en-US-Neural2-J', 'en-US-Wavenet-D', 'en-US-Standard-B', 'en-US-Standard-C'],
                'en-AU': ['en-AU-Wavenet-A', 'en-AU-Wavenet-B', 'en-AU-Standard-A', 'en-AU-Standard-B'],
                'en-CA': ['en-CA-Wavenet-A', 'en-CA-Wavenet-B'],
                'en-IN': ['en-IN-Wavenet-A', 'en-IN-Wavenet-B']
            };
            
            const fallbacks = fallbackVoices[languageCode] || fallbackVoices['en-US'];
            
            for (const fallbackVoice of fallbacks) {
                if (fallbackVoice === voiceName) continue; // Skip the same voice
                
                try {
                    logger.info(`Trying fallback voice: ${fallbackVoice}`);
                    const fallbackRequest = {
                        input: { text },
                        voice: {
                            languageCode,
                            name: fallbackVoice
                        },
                        audioConfig: {
                            audioEncoding: 'MP3',
                            speakingRate: speakingRate
                        },
                    };
                    
                    const [fallbackResponse] = await googleClient.synthesizeSpeech(fallbackRequest);
                    if (fallbackResponse.audioContent) {
                        logger.info(`✅ Fallback successful with voice: ${fallbackVoice}`);
                        return fallbackResponse.audioContent;
                    }
                } catch (fallbackError) {
                    logger.warn(`Fallback voice ${fallbackVoice} also failed: ${fallbackError.message}`);
                    continue;
                }
            }
            
            logger.error('All fallback voices failed');
        }
        
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