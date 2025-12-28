const axios = require('axios');
const logger = require('../utils/logger');
const { translate } = require('@vitalets/google-translate-api');

// Helper for DeepL
async function translateDeepL(text, targetLang) {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) throw new Error('DEEPL_API_KEY not configured');

    const response = await axios.post(
        'https://api-free.deepl.com/v2/translate',
        new URLSearchParams({
            auth_key: apiKey,
            text: text,
            target_lang: targetLang.toUpperCase()
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return response.data.translations[0].text;
}

// Helper for LibreTranslate
async function translateLibre(text, targetLang) {
    const apiUrl = process.env.LIBRE_TRANSLATE_URL || 'http://localhost:5000';

    const response = await axios.post(`${apiUrl}/translate`, {
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text'
    });

    return response.data.translatedText;
}

// Helper for Google (using free wrapper or official API if configured)
async function translateGoogle(text, targetLang) {
    // Using the library wrapper which uses the free endpoint logic mostly, 
    // or checks env vars. Simplest for 'lab' testing purposes.
    const { text: translated } = await translate(text, { to: targetLang });
    return translated;
}

exports.testTranslationAPI = async (req, res) => {
    try {
        const { provider, text, targetLang = 'tr' } = req.body;

        if (!text || !provider) {
            return res.status(400).json({ success: false, message: 'Missing provider or text' });
        }

        let result = '';
        const startTime = Date.now();

        switch (provider) {
            case 'deepl':
                result = await translateDeepL(text, targetLang);
                break;
            case 'libre':
                result = await translateLibre(text, targetLang);
                break;
            case 'google':
                result = await translateGoogle(text, targetLang);
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid provider' });
        }

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            provider,
            result,
            duration_ms: duration
        });

    } catch (err) {
        logger.error(`[TranslationController] ${req.body.provider} failed:`, err.message);
        res.status(500).json({
            success: false,
            message: 'Translation failed',
            error: err.message
        });
    }
};
