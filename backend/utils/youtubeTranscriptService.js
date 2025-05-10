const fetch = require('node-fetch');
const logger = require('./logger');

/**
 * Fetches YouTube transcript using Supadata API
 * @param {string} youtubeUrl
 * @returns {Promise<string|null>}
 */
async function fetchYoutubeTranscript(youtubeUrl) {
    const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY;
    if (!SUPADATA_API_KEY) {
        logger.error('Supadata API key is not set in environment variables.');
        return null;
    }
    try {
        const res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(youtubeUrl)}`, {
            headers: {
                'x-api-key': SUPADATA_API_KEY
            }
        });
        if (!res.ok) {
            logger.error(`Supadata API transcript fetch failed. Status: ${res.status}`);
            return null;
        }
        const data = await res.json();
        logger.info('Supadata API response:', data);
        if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
            logger.error('Supadata API: Transcript not found or empty.');
            return null;
        }
        logger.info('Fetched YouTube transcript from Supadata API.');
        return data.content;
    } catch (err) {
        logger.error('Error fetching YouTube transcript from Supadata API:', err);
        return null;
    }
}

module.exports = { fetchYoutubeTranscript }; 