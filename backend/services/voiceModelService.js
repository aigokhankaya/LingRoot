const logger = require('../utils/common/logger.js');
const { supabase } = require('../utils/storage/supabaseClient.js');
const { listGoogleVoices } = require('../utils/audio/googleTTS.js');
const { listAzureVoices, isAzureTTSAvailable } = require('../utils/audio/azureTTS.js');
const { listPollyVoices, isPollyAvailable } = require('../utils/audio/amazonPolly.js');
const { getLingrootVoices, mapLingrootToProviderVoice, getDefaultLingrootVoiceId } = require('../utils/audio/lingrootVoices.js');

/**
 * tts_provider'ı settings tablosundan oku (default: google)
 * @returns {Promise<string>} Provider name (google, azure, polly, openai)
 */
async function getTtsProvider() {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'tts_provider')
        .single();
    if (error || !data) return 'google';
    return data.value;
}

/**
 * Provider'a göre varsayılan sesi getir (ses listesinin ilk sesi)
 * @param {string} ttsProvider 
 * @param {string} languageCode 
 * @returns {Promise<string>} Voice name
 */
async function getDefaultVoiceForProvider(ttsProvider, languageCode = 'en-US') {
    try {
        if (ttsProvider === 'polly' || ttsProvider === 'amazon') {
            // Amazon Polly için ilk sesi al
            if (isPollyAvailable()) {
                const pollyVoices = await listPollyVoices(languageCode);
                if (pollyVoices && pollyVoices.length > 0) {
                    logger.info(`🎯 Default voice for Polly: ${pollyVoices[0].name}`);
                    return pollyVoices[0].name;
                }
            }
            // Fallback
            return 'Joanna';
        } else if (ttsProvider === 'azure') {
            // Azure için ilk sesi al
            if (isAzureTTSAvailable()) {
                const locale = languageCode.replace('_', '-');
                const azureVoices = await listAzureVoices(locale);
                if (azureVoices && azureVoices.length > 0) {
                    logger.info(`🎯 Default voice for Azure: ${azureVoices[0].name}`);
                    return azureVoices[0].name;
                }
            }
            // Fallback
            return 'en-US-JennyNeural';
        } else {
            // Google TTS için ilk sesi al
            const googleVoices = await listGoogleVoices(languageCode);
            if (googleVoices && googleVoices.length > 0) {
                // Basic paket seslerini önceliklendir
                const basicVoices = googleVoices.filter(v => v.package === 'Basic');
                if (basicVoices.length > 0) {
                    logger.info(`🎯 Default voice for Google: ${basicVoices[0].name}`);
                    return basicVoices[0].name;
                }
                logger.info(`🎯 Default voice for Google: ${googleVoices[0].name}`);
                return googleVoices[0].name;
            }
            // Fallback
            return 'en-US-Standard-C';
        }
    } catch (error) {
        logger.error(`Error getting default voice for ${ttsProvider}: ${error.message}`);
        // Provider'a göre fallback
        if (ttsProvider === 'polly' || ttsProvider === 'amazon') return 'Joanna';
        if (ttsProvider === 'azure') return 'en-US-JennyNeural';
        return 'en-US-Standard-C';
    }
}

/**
 * Ses listesi (Lingroot abstraction) - provider-agnostik liste döner
 * @returns {Promise<Object>}
 */
const listVoices = async (languageCode = 'en-US') => {
    try {
        const ttsProvider = await getTtsProvider();

        const lingrootVoices = getLingrootVoices().map(v => ({
            id: v.id,
            name: v.id,
            displayName: v.label,
            gender: v.gender,
            accent: v.accent,
            quality: v.quality,
            // Provider-specific hints for debugging/admin tools
            providerVoice: mapLingrootToProviderVoice(v.id, ttsProvider),
        }));

        logger.info(`🎯 [VOICE LIST] Returning ${lingrootVoices.length} Lingroot voices for provider ${ttsProvider} and language ${languageCode}`);

        return {
            provider: ttsProvider,
            voices: lingrootVoices,
            defaultVoice: getDefaultLingrootVoiceId(languageCode),
            stats: {
                total: lingrootVoices.length,
            }
        };
    } catch (error) {
        logger.error(`🎯 [VOICE LIST] Error building Lingroot voice list: ${error.message}`);
        throw error;
    }
};

/**
 * Filtrelenmiş ses listesi (Lingroot abstraction)
 * @param {Object} filters { accent, gender, category }
 * @returns {Promise<Object>}
 */
const getFilteredVoices = async ({ accent, gender, category }) => {
    try {
        const ttsProvider = await getTtsProvider();

        let voices = getLingrootVoices();
        logger.info(`🎯 [VOICE FILTER] Starting with ${voices.length} Lingroot voices`);

        // Accent filter (american / british / australian / indian / all)
        if (accent && accent !== 'all') {
            const a = String(accent).toLowerCase();
            voices = voices.filter(v => v.accent === a);
        }

        // Gender filter
        if (gender && gender !== 'all') {
            const g = String(gender).toLowerCase();
            voices = voices.filter(v => v.gender === g);
        }

        // Category -> map to Lingroot quality tiers
        if (category && category !== 'all') {
            const c = String(category).toLowerCase();
            if (c === 'standard') {
                voices = voices.filter(v => v.quality === 'basic');
            } else if (c === 'neural' || c === 'wavenet' || c === 'neural2') {
                voices = voices.filter(v => v.quality === 'premium');
            } else if (c === 'chirp3d' || c === 'gold') {
                voices = voices.filter(v => v.quality === 'gold');
            } else if (c === 'studio' || c === 'platinum') {
                voices = voices.filter(v => v.quality === 'platinum');
            } else if (c === 'generative' || c === 'ultra') {
                voices = voices.filter(v => v.quality === 'generative' || v.quality === 'ultra');
            }
        }

        const payload = voices.map(v => ({
            id: v.id,
            name: v.id,
            displayName: v.label,
            gender: v.gender,
            accent: v.accent,
            quality: v.quality,
            providerVoice: mapLingrootToProviderVoice(v.id, ttsProvider),
        }));

        logger.info(`🎯 [VOICE FILTER] Applied filters - accent: ${accent}, gender: ${gender}, category: ${category} => ${payload.length} voices`);

        return {
            provider: ttsProvider,
            voices: payload,
            filters: { accent, gender, category },
            totalCount: getLingrootVoices().length,
            filteredCount: payload.length
        };

    } catch (error) {
        logger.error(`Error filtering Lingroot voices: ${error.message}`);
        throw error;
    }
};

/**
 * Test available voices for a given language directly from Google (or current provider)
 * @param {string} languageCode 
 * @returns {Promise<Object>}
 */
const testVoices = async (languageCode = 'en-GB') => {
    try {
        logger.info(`Testing available voices for language: ${languageCode}`);

        // Currently hardcoded to Google as per original controller logic
        const availableVoices = await listGoogleVoices(languageCode);

        // Filter for Neural2 voices specifically
        const neural2Voices = availableVoices.filter(voice =>
            voice.name.includes('Neural2') && voice.name.includes(languageCode)
        );

        logger.info(`Found ${neural2Voices.length} Neural2 voices for ${languageCode}:`);
        neural2Voices.forEach(voice => {
            logger.info(`- ${voice.name} (${voice.gender})`);
        });

        return {
            languageCode,
            totalVoices: availableVoices.length,
            neural2Voices: neural2Voices,
            allVoices: availableVoices
        };

    } catch (error) {
        logger.error(`Error testing voices: ${error.message}`);
        throw error;
    }
};

module.exports = {
    getTtsProvider,
    getDefaultVoiceForProvider,
    listVoices,
    getFilteredVoices,
    testVoices
};
