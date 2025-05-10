const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const logger = require('./logger');

const REGION = process.env.AWS_REGION || 'us-east-1';
const polly = new PollyClient({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Synthesize speech using Amazon Polly
 * @param {Object} params
 * @param {string} params.text - The text to synthesize
 * @param {string} params.voiceId - The Polly voice ID (e.g., 'Joanna')
 * @param {string} params.languageCode - The language code (e.g., 'en-US')
 * @returns {Promise<string|null>} Base64-encoded MP3 audio or null on error
 */
async function synthesizeWithPolly({ text, voiceId, languageCode }) {
    try {
        const command = new SynthesizeSpeechCommand({
            OutputFormat: 'mp3',
            Text: text,
            VoiceId: voiceId,
            LanguageCode: languageCode,
            Engine: 'standard', // or 'neural' if supported
        });
        const response = await polly.send(command);
        if (response.AudioStream) {
            const audioBuffer = Buffer.from(await response.AudioStream.transformToByteArray());
            return audioBuffer.toString('base64');
        } else {
            logger.error('Polly response did not contain AudioStream.');
            return null;
        }
    } catch (error) {
        logger.error('Amazon Polly TTS error:', { message: error.message, stack: error.stack });
        return null;
    }
}

module.exports = { synthesizeWithPolly }; 