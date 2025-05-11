const fetch = require('node-fetch');
const logger = require('./logger');

/**
 * Fetches YouTube transcript using local Playwright FastAPI microservice
 * @param {string} youtubeUrl
 * @returns {Promise<string|null>}
 */
async function fetchYoutubeTranscript(youtubeUrl) {
    try {
        const res = await fetch('http://localhost:8000/scrape-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: youtubeUrl })
        });
        if (!res.ok) {
            logger.error('Playwright transcript service error:', res.status, await res.text());
            return null;
        }
        const data = await res.json();
        logger.info('Playwright transcript service response:', data);
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

module.exports = { fetchYoutubeTranscript }; 