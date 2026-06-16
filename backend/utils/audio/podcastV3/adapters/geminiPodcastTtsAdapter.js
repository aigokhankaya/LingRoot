const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const logger = require('../../../common/logger.js');
const { runWithModelRateLimit } = require('../../../infra/modelRateLimiter.js');

const GEMINI_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT_MODEL = 'gemini-2.5-flash-tts';
const PROMPT_SUPPORTED_VOICES = ['Kore', 'Charon', 'Puck', 'Fenrir', 'Leda', 'Orus', 'Zephyr'];

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const tokenResult = await auth.getAccessToken();
  return typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
}

async function synthesizeChunkWithGemini(chunk, options = {}) {
  const {
    model = DEFAULT_MODEL,
    stylePrompt = 'Speak naturally and conversationally.',
    metadata = {},
    accessToken,
    projectId,
  } = options;

  const speakerId = chunk.voice.providerVoiceId;
  const supportsPrompt = PROMPT_SUPPORTED_VOICES.includes(speakerId);

  const buildRequestBody = (usePrompt) => ({
    input: usePrompt && supportsPrompt
      ? { text: chunk.combinedText, prompt: stylePrompt }
      : { text: chunk.combinedText },
    voice: {
      languageCode: 'en-us',
      name: speakerId,
      model_name: model,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 24000,
    },
  });

  let usePrompt = true;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const requestBody = buildRequestBody(usePrompt);
      const response = await runWithModelRateLimit({
        provider: 'vertex',
        model,
        taskName: 'podcast-v3-chunk-synthesis',
        metadata: {
          speakerId,
          chunkId: chunk.chunkId,
          speaker: chunk.speaker,
          ...metadata,
        },
        maxExecutionMs: 60000,
        fn: () => axios.post(
          GEMINI_TTS_ENDPOINT,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'x-goog-user-project': projectId,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        ),
      });

      if (!response.data?.audioContent) {
        throw new Error('No audio content received from Gemini TTS');
      }

      return {
        ...chunk,
        audioBuffer: Buffer.from(response.data.audioContent, 'base64'),
        byteLength: Buffer.byteLength(response.data.audioContent || '', 'base64'),
        wordCount: chunk.combinedWordCount,
        provider: 'gemini',
      };
    } catch (error) {
      lastError = error;
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.warn(`[PODCAST-V3] Gemini chunk attempt ${attempt}/3 failed for ${chunk.chunkId}: ${errMsg}`);

      if (errMsg.includes('prompt') && usePrompt) {
        usePrompt = false;
        continue;
      }

      const status = error?.response?.status || error?.status;
      const lowerMessage = String(errMsg || '').toLowerCase();
      const isRateLimit = status === 429 || lowerMessage.includes('quota exceeded') || lowerMessage.includes('resource_exhausted');
      if (isRateLimit) {
        error.code = error.code || 'PODCAST_V3_GEMINI_QUOTA';
      }

      if (attempt < 3 && !isRateLimit) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function createGeminiChunkSynthesizerContext() {
  return {
    accessToken: await getAccessToken(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  };
}

module.exports = {
  createGeminiChunkSynthesizerContext,
  synthesizeChunkWithGemini,
};
