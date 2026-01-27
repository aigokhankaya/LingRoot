/**
 * YouTube Transcript Service V2
 * Uses Python youtube-transcript-api via child_process
 * 
 * This is more reliable than the npm package
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../common/logger.js');

/**
 * Extracts video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null if invalid
 */
function extractVideoId(url) {
    if (!url || typeof url !== 'string') return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Fetches YouTube transcript using Python youtube-transcript-api
 * @param {string} youtubeUrl - YouTube video URL
 * @param {string} languageCode - Preferred language code (default: 'tr')
 * @returns {Promise<{success: boolean, text?: string, error?: string, metadata?: object}>}
 */
async function fetchYoutubeTranscriptV2(youtubeUrl, languageCode = 'tr') {
    return new Promise((resolve) => {
        const videoId = extractVideoId(youtubeUrl);

        if (!videoId) {
            logger.warn(`[YT-V2] Invalid YouTube URL: ${youtubeUrl}`);
            return resolve({
                success: false,
                error: 'INVALID_URL',
                message: 'Geçerli bir YouTube URL\'si girin'
            });
        }

        logger.info(`[YT-V2] Fetching transcript via Python for video: ${videoId}, language: ${languageCode}`);

        const scriptPath = path.join(__dirname, '../../scripts/fetchYoutubeTranscript.py');
        const python = spawn('python3', [scriptPath, youtubeUrl, languageCode]);

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (stderr && !stderr.includes('NotOpenSSLWarning')) {
                logger.warn(`[YT-V2] Python stderr: ${stderr}`);
            }

            try {
                const result = JSON.parse(stdout.trim());

                if (result.success) {
                    logger.info(`[YT-V2] Successfully fetched transcript for ${videoId} (${result.text?.length || 0} chars)`);
                } else {
                    logger.warn(`[YT-V2] Failed to fetch transcript: ${result.message || result.error}`);
                }

                resolve(result);
            } catch (parseError) {
                logger.error(`[YT-V2] Failed to parse Python output: ${stdout}`);
                resolve({
                    success: false,
                    error: 'PARSE_ERROR',
                    message: 'Python çıktısı ayrıştırılamadı',
                    details: stdout.substring(0, 200)
                });
            }
        });

        python.on('error', (err) => {
            logger.error(`[YT-V2] Python process error: ${err.message}`);
            resolve({
                success: false,
                error: 'PYTHON_ERROR',
                message: 'Python scripti çalıştırılamadı',
                details: err.message
            });
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            python.kill();
            resolve({
                success: false,
                error: 'TIMEOUT',
                message: 'İstek zaman aşımına uğradı'
            });
        }, 30000);
    });
}

/**
 * Health check for V2 service
 * @returns {Promise<{healthy: boolean, service: string}>}
 */
async function checkTranscriptServiceHealthV2() {
    return {
        healthy: true,
        service: 'youtube-transcript-v2',
        provider: 'Python youtube-transcript-api',
        version: '2.1.0'
    };
}

module.exports = {
    fetchYoutubeTranscriptV2,
    checkTranscriptServiceHealthV2,
    extractVideoId
};
