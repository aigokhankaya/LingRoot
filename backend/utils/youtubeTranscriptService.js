const fetch = require('node-fetch');
const logger = require('./logger');

/**
 * Fetches YouTube transcript using local Playwright FastAPI microservice
 * @param {string} youtubeUrl
 * @param {string} languageCode - Transcript language code (e.g., 'en', 'tr')
 * @returns {Promise<string|null>}
 */
async function fetchYoutubeTranscript(youtubeUrl, languageCode = 'en') {
    try {
        logger.info(`Fetching transcript for ${youtubeUrl} with language: ${languageCode}`);
        const res = await fetch('http://localhost:8000/scrape-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: youtubeUrl,
                language_code: languageCode
            })
        });
        if (!res.ok) {
            logger.error('Playwright transcript service error:', res.status, await res.text());
            return null;
        }
        const data = await res.json();
        logger.info('Playwright transcript service response received');
        if (!data.transcript || typeof data.transcript !== 'string' || !data.transcript.trim()) {
            logger.error('Transcript not found or empty from Playwright service.');
            return null;
        }
        return data.transcript.trim();
    } catch (err) {
        logger.error('Error calling Playwright transcript service:', err);
        return null;
    }
}

/**
 * Checks health of the transcript service
 * @returns {Promise<boolean>}
 */
async function checkTranscriptServiceHealth() {
    try {
        const res = await fetch('http://localhost:8000/health');
        if (!res.ok) return false;
        const data = await res.json();
        return data.status === 'ok';
    } catch (err) {
        logger.error('Error checking transcript service health:', err);
        return false;
    }
}

module.exports = { 
    fetchYoutubeTranscript,
    checkTranscriptServiceHealth
}; 