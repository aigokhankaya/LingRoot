const logger = require('../../common/logger.js');
const { createGeminiChunkSynthesizerContext, synthesizeChunkWithGemini } = require('./adapters/geminiPodcastTtsAdapter.js');
const { synthesizeChunkWithNeural2 } = require('./adapters/neural2PodcastTtsAdapter.js');

function isGeminiQuotaError(error) {
  const message = error?.response?.data?.error?.message || error?.message || '';
  return (
    typeof message === 'string' &&
    (
      message.includes('Quota exceeded')
      || message.includes('RESOURCE_EXHAUSTED')
      || message.includes('global_generate_content_requests_per_minute_per_project_per_base_model')
    )
  );
}

async function synthesizeSpeakerChunks(chunks, speakerAlias, provider, options = {}) {
  if (!chunks || chunks.length === 0) {
    return {
      segments: [],
      totalCharacters: 0,
      speakerAlias,
      provider,
    };
  }

  const segments = [];
  let totalCharacters = 0;
  const geminiContext = provider === 'gemini'
    ? await createGeminiChunkSynthesizerContext()
    : null;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const synthesized = provider === 'gemini'
        ? await synthesizeChunkWithGemini(chunk, {
          ...options,
          ...geminiContext,
        })
        : await synthesizeChunkWithNeural2(chunk, options);

      segments.push({
        originalIndex: chunk.originalIndex,
        speaker: chunk.speaker,
        speakerLabel: chunk.speakerLabel,
        text: chunk.combinedText,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        turns: chunk.turns,
        audioBuffer: synthesized.audioBuffer,
        wordCount: synthesized.wordCount,
        byteLength: synthesized.byteLength || synthesized.audioBuffer.length,
        duration: synthesized.duration || null,
        durationEstimated: synthesized.durationEstimated || false,
        provider: synthesized.provider,
        nativeWordTimings: synthesized.nativeWordTimings || [],
      });

      totalCharacters += chunk.combinedText.length;
    } catch (error) {
      if (provider === 'gemini' && isGeminiQuotaError(error)) {
        error.code = 'PODCAST_V3_GEMINI_QUOTA';
      }
      logger.warn(`[PODCAST-V3] ${provider} synthesis failed for ${speakerAlias} chunk ${chunk.chunkId}: ${error.message}`);
      throw error;
    }
  }

  return {
    segments,
    totalCharacters,
    speakerAlias,
    provider,
  };
}

async function synthesizePodcastChunks(options = {}) {
  const {
    hostChunks = [],
    guestChunks = [],
    providerOrder = ['gemini', 'neural2'],
    synthOptions = {},
  } = options;

  let lastError;
  for (const provider of providerOrder) {
    try {
      logger.info(`[PODCAST-V3] Synthesizing with provider=${provider} hostChunks=${hostChunks.length} guestChunks=${guestChunks.length}`);
      const [hostSynthResult, guestSynthResult] = await Promise.all([
        synthesizeSpeakerChunks(hostChunks, 'Host', provider, synthOptions),
        synthesizeSpeakerChunks(guestChunks, 'Guest', provider, synthOptions),
      ]);

      return {
        providerUsed: provider,
        hostSynthResult,
        guestSynthResult,
      };
    } catch (error) {
      lastError = error;
      if (provider === 'gemini' && error.code === 'PODCAST_V3_GEMINI_QUOTA' && providerOrder.includes('neural2')) {
        logger.warn('[PODCAST-V3] Gemini quota detected, degrading full job to Neural2');
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Podcast V3 synthesis failed');
}

module.exports = {
  isGeminiQuotaError,
  synthesizePodcastChunks,
};
