// backend/utils/mfaAligner.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../common/logger');

/**
 * MFA Aligner Client
 * Connects to the standalone MFA Service (Main/MFA)
 * Does NOT run local Docker/MFA anymore.
 */
class MFAAligner {
  constructor() {
    this.modelsReady = true; // Remote service assumed ready

    // Config
    const rawUrl = process.env.MFA_SERVICE_URL || 'http://localhost:5002';
    this.serviceUrl = String(rawUrl).trim().replace(/\/+$/, '').replace(/\/api$/, '');

    logger.info(`🔌 MFA Client initialized. Target Service: ${this.serviceUrl}`);

    // Circuit breaker for remote MFA service
    this._remoteCircuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      isOpen: false,
      maxFailures: 3,
      resetTimeMs: 5 * 60 * 1000 // 5 minutes
    };
  }

  /**
   * Check if circuit breaker allows remote MFA requests
   */
  isRemoteMFAAllowed() {
    const cb = this._remoteCircuitBreaker;
    if (cb.isOpen && cb.lastFailureTime) {
      const timeSinceFailure = Date.now() - cb.lastFailureTime;
      if (timeSinceFailure >= cb.resetTimeMs) {
        logger.info(`🔄 [MFA Circuit Breaker] Reset after ${Math.round(timeSinceFailure / 1000)}s - allowing remote MFA attempt`);
        cb.isOpen = false;
        cb.failures = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  recordRemoteMFAFailure(errorType) {
    const cb = this._remoteCircuitBreaker;
    cb.failures++;
    cb.lastFailureTime = Date.now();
    logger.warn(`⚠️ [MFA Circuit Breaker] Failure ${cb.failures}/${cb.maxFailures} (${errorType})`);

    if (cb.failures >= cb.maxFailures) {
      cb.isOpen = true;
      logger.warn(`🔴 [MFA Circuit Breaker] OPEN - Skipping remote MFA for 5 minutes.`);
    }
  }

  recordRemoteMFASuccess() {
    const cb = this._remoteCircuitBreaker;
    if (cb.failures > 0 || cb.isOpen) {
      logger.info(`🟢 [MFA Circuit Breaker] Remote MFA success - resetting circuit breaker`);
    }
    cb.failures = 0;
    cb.isOpen = false;
    cb.lastFailureTime = null;
  }

  /**
   * Check if remote MFA service is available
   */
  async checkMFAAvailability() {
    if (!this.isRemoteMFAAllowed()) return false;

    try {
      const response = await axios.get(`${this.serviceUrl}/health`, { timeout: 2000 });
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      logger.warn(`❌ MFA Service check failed: ${error.message} (${this.serviceUrl})`);
    }
    return false;
  }

  // Compatibility method
  async ensureModels() {
    return true;
  }

  // Cleaner (client-side validation only)
  cleanTranscript(text) {
    return (text || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,!?;:\"\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Main entry point - Calls Remote Service
   */
  async generateWordTimestamps(audioPath, transcript, locale = 'en_US', options = {}) {
    // Load test mock: skip real MFA alignment
    const { isLoadTestMode, getLoadTestDelay } = require('../../tests/load/mocks/mockConfig');
    if (isLoadTestMode()) {
      const { generateMockTimestamps } = require('../../tests/load/mocks/mfaMock');
      await new Promise(r => setTimeout(r, getLoadTestDelay('mfa')));
      return generateMockTimestamps(transcript);
    }

    const { debug = null } = options;
    const transcriptText = transcript == null ? '' : String(transcript);

    // Circuit Breaker Check
    if (!this.isRemoteMFAAllowed()) {
      logger.info(`⏭️ [MFA] Skipping remote MFA - circuit breaker is open`);
      return []; // Return empty alignments
    }

    try {
      logger.info(`🌐 Calling Remote MFA Service: ${this.serviceUrl}`);

      // Prepare Form Data
      const audioBuffer = await fs.readFile(audioPath);
      const isWav = audioPath.endsWith('.wav');

      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: isWav ? 'audio.wav' : 'audio.mp3',
        contentType: isWav ? 'audio/wav' : 'audio/mpeg'
      });
      formData.append('transcript', transcriptText);
      formData.append('locale', locale);

      // Add debug header if needed
      const headers = {
        ...formData.getHeaders(),
        'x-mfa-debug-id': debug ? (typeof debug === 'string' ? debug : debug.id) : ''
      };

      // Call "align-async" to avoid timeouts (524 error)
      logger.info(`🚀 Starting Async MFA Job at ${this.serviceUrl}/api/mfa/align-async`);

      const startResponse = await axios.post(`${this.serviceUrl}/api/mfa/align-async`, formData, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000 // 30s timeout just for submission
      });

      if (!startResponse.data || !startResponse.data.success || !startResponse.data.jobId) {
        throw new Error(startResponse.data?.error || 'Failed to start async MFA job');
      }

      const jobId = startResponse.data.jobId;
      logger.info(`⏳ MFA Job Started: ${jobId}. Waiting for completion...`);

      // Poll for result
      const POLLING_INTERVAL = 5000; // 5s
      const MAX_WAIT_TIME = 25 * 60 * 1000; // 25 min
      const startTime = Date.now();

      while (Date.now() - startTime < MAX_WAIT_TIME) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

        try {
          const statusUrl = `${this.serviceUrl}/api/mfa/job/${jobId}`;
          const statusResponse = await axios.get(statusUrl, { timeout: 5000 });
          const jobData = statusResponse.data?.job;

          if (statusResponse.data?.success && jobData) {
            if (jobData.status === 'completed') {
              this.recordRemoteMFASuccess();
              const words = jobData.result?.timepoints || [];
              // Log details for debugging
              const count = Array.isArray(words) ? words.length : 0;
              logger.info(`✅ Async MFA Completed: ${count} words aligned (Job: ${jobId})`);

              if (count === 0) {
                logger.warn(`⚠️ MFA Job completed but returned 0 timepoints.`);
              }
              return words;
            } else if (jobData.status === 'failed') {
              throw new Error(jobData.error || 'Async MFA job returned failed status');
            } else {
              // pending or processing
              // optionally log progress every ~30s
              if (Math.round((Date.now() - startTime) / 1000) % 30 === 0) {
                logger.info(`Still waiting for MFA Job ${jobId} (Status: ${jobData.status})...`);
              }
            }
          }
        } catch (pollErr) {
          // If polling request fails (temporary network blip), just warn and continue waiting unless 404
          if (pollErr.response && pollErr.response.status === 404) {
            throw new Error(`MFA Job ${jobId} not found during polling`);
          }
          logger.warn(`⚠️ MFA Polling warning: ${pollErr.message}`);
        }
      }

      throw new Error(`MFA Job ${jobId} timed out after ${MAX_WAIT_TIME / 1000}s polling`);

    } catch (error) {
      const msg = error.message || String(error);
      this.recordRemoteMFAFailure(msg);
      logger.error(`❌ Remote MFA failed: ${msg}`);

      // If client debug enabled
      if (debug) {
        await this.writeDebugLine(debug, { error: msg, stage: 'remote-client-error' });
      }

      throw error;
    }
  }

  // Debug logger helper
  async writeDebugLine(debug, payload) {
    try {
      if (!debug) return;
      const rawId = typeof debug === 'string' ? debug : (debug.id || debug.requestId);
      if (!rawId) return;

      const logsDir = path.join(__dirname, '../logs');
      await fs.mkdir(logsDir, { recursive: true }).catch(() => { });
      const debugPath = path.join(logsDir, `mfa_client_${rawId.replace(/[^a-zA-Z0-9]/g, '_')}.jsonl`);

      const line = JSON.stringify({
        ts: new Date().toISOString(),
        ...payload,
      }) + os.EOL;
      await fs.appendFile(debugPath, line, 'utf-8');
    } catch { }
  }
}

module.exports = { mfaAligner: new MFAAligner() };