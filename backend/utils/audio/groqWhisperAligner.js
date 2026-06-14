const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../common/logger');
const { alignWhisperWordsToReference } = require('./wordAlignmentMapper');

const GROQ_TRANSCRIPTIONS_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

function getNumberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

class GroqWhisperAligner {
  constructor() {
    this.endpoint = GROQ_TRANSCRIPTIONS_URL;
  }

  getConfig() {
    return {
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
      language: process.env.GROQ_WHISPER_LANGUAGE || 'en',
      timeoutMs: getNumberEnv('GROQ_WHISPER_TIMEOUT_MS', 60000),
      minMatchRatio: getNumberEnv('GROQ_WHISPER_MIN_MATCH_RATIO', 0.92),
      maxWordCountDeltaRatio: getNumberEnv('GROQ_WHISPER_MAX_WORD_COUNT_DELTA_RATIO', 0.12),
      maxNonMonotonicTimingRatio: getNumberEnv('GROQ_WHISPER_MAX_NON_MONOTONIC_TIMING_RATIO', 0.02),
    };
  }

  async transcribe(audioPath, options = {}) {
    const config = { ...this.getConfig(), ...options };

    if (!config.apiKey) {
      throw new Error('GROQ_API_KEY is required for Groq Whisper alignment');
    }

    if (!audioPath || !fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found for Groq Whisper alignment: ${audioPath}`);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioPath));
    formData.append('model', config.model);
    formData.append('language', config.language);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('temperature', '0');

    const startedAt = Date.now();
    const response = await axios.post(this.endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${config.apiKey}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: config.timeoutMs,
    });

    const latencyMs = Date.now() - startedAt;
    const words = response.data?.words;

    logger.info(`[GROQ-WHISPER] Transcription complete: words=${Array.isArray(words) ? words.length : 0}, latencyMs=${latencyMs}, model=${config.model}`);

    return {
      response: response.data,
      words: Array.isArray(words) ? words : [],
      latencyMs,
      model: config.model,
      language: config.language,
    };
  }

  async generateWordTimestamps(audioPath, referenceText, options = {}) {
    const config = { ...this.getConfig(), ...options };
    const transcription = await this.transcribe(audioPath, config);

    const alignment = alignWhisperWordsToReference(referenceText, transcription.words, {
      minMatchRatio: config.minMatchRatio,
      maxWordCountDeltaRatio: config.maxWordCountDeltaRatio,
      maxNonMonotonicTimingRatio: config.maxNonMonotonicTimingRatio,
      audioDurationSeconds: options.audioDurationSeconds,
    });

    logger.info(
      `[GROQ-WHISPER] Alignment quality passed=${alignment.passed} ` +
      `reasons=${alignment.failureReasons.join(',') || 'none'} ` +
      `matchRatio=${alignment.metrics.matchRatio.toFixed(3)} ` +
      `wordDelta=${alignment.metrics.wordCountDeltaRatio.toFixed(3)} ` +
      `nonMonotonic=${alignment.metrics.nonMonotonicTimingCount}/${alignment.metrics.maxNonMonotonicTimingCount} ` +
      `model=${transcription.model} latencyMs=${transcription.latencyMs}`
    );

    if (!alignment.passed) {
      const reason = alignment.failureReasons.join(',') || 'unknown_quality_failure';
      const error = new Error(`Groq Whisper alignment failed quality gate: ${reason}`);
      error.code = 'GROQ_ALIGNMENT_QUALITY_FAILED';
      error.metrics = alignment.metrics;
      error.failureReasons = alignment.failureReasons;
      error.model = transcription.model;
      error.latencyMs = transcription.latencyMs;
      throw error;
    }

    return {
      timings: alignment.timings,
      metrics: alignment.metrics,
      model: transcription.model,
      language: transcription.language,
      latencyMs: transcription.latencyMs,
    };
  }
}

module.exports = {
  groqWhisperAligner: new GroqWhisperAligner(),
  GroqWhisperAligner,
};
