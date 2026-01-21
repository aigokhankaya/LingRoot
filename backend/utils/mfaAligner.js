// backend/utils/mfaAligner.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

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

      // Call "align" (sync) or "align-async"
      // Using /align (sync) for simplicity, assuming service has long timeout
      const response = await axios.post(`${this.serviceUrl}/api/mfa/align`, formData, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 2400000 // 40 minutes client timeout
      });

      if (response.data && response.data.success) {
        this.recordRemoteMFASuccess();
        logger.info(`✅ Remote MFA success: ${response.data.wordCount} words aligned`);
        return response.data.timepoints;
      } else {
        throw new Error(response.data?.error || 'Unknown remote MFA error');
      }

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