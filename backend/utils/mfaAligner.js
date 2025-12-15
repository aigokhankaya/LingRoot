// backend/utils/mfaAligner.js
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('./logger');

const execAsync = promisify(exec);

class MFAAligner {
  constructor() {
    // Local model paths based on your setup
    this.localModelPaths = {
      dictFile: 'C:\\Users\\enesy\\mfa-models-main\\mfa-models-main\\dictionary\\english.dict',
      acousticDir: 'C:\\Users\\enesy\\mfa-models-main\\mfa-models-main\\acoustic\\english\\english'
    };
    this.useDocker = true; // Always use Docker with local models
    this.modelsReady = false;
    this._dictionaryWordSet = null;
  }

  async getDictionaryWordSet() {
    if (this._dictionaryWordSet) return this._dictionaryWordSet;
    try {
      const dictContent = await fs.readFile(this.localModelPaths.dictFile, 'utf-8');
      const set = new Set();
      for (const line of dictContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const word = trimmed.split(/\s+/)[0];
        if (!word) continue;
        set.add(word.toLowerCase());
      }
      this._dictionaryWordSet = set;
      return set;
    } catch {
      this._dictionaryWordSet = new Set();
      return this._dictionaryWordSet;
    }
  }

  async filterTranscriptToDictionary(text) {
    const cleaned = this.cleanTranscript(text == null ? '' : String(text));
    const set = await this.getDictionaryWordSet();
    if (!set || set.size === 0) return cleaned;
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return cleaned;
    const kept = [];
    for (const t of tokens) {
      const lower = String(t).toLowerCase();
      if (set.has(lower)) kept.push(lower);
    }
    if (kept.length === 0) return cleaned;
    return kept.join(' ');
  }

  async writeDebugLine(debug, payload) {
    try {
      if (!debug) return;
      const rawId = typeof debug === 'string' ? debug : (debug.id || debug.requestId || debug.tag);
      const debugId = rawId
        ? String(rawId)
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 120)
        : null;
      if (!debugId) return;
      const logsDir = path.join(__dirname, '../logs');
      await fs.mkdir(logsDir, { recursive: true }).catch(() => {});
      const debugPath = path.join(logsDir, `mfa_${debugId}.jsonl`);
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        debug,
        ...payload,
      }) + os.EOL;
      await fs.appendFile(debugPath, line, 'utf-8');
    } catch (e) {
      try {
        logger.warn(`[MFA DEBUG] Failed to write debug dump file: ${e?.message || String(e)}`);
      } catch {
        // ignore
      }
    }
  }

  async checkMFAAvailability() {
    try {
      const { stdout } = await execAsync('docker run --rm mmcauliffe/montreal-forced-aligner mfa version');
      logger.info(`✅ MFA available via Docker: ${stdout.trim()}`);
      return true;
    } catch (error) {
      logger.error('❌ MFA Docker not available:', error.message);
      return false;
    }
  }

  async checkLocalModels() {
    try {
      // Check if local model files exist
      const fs = require('fs');
      const dictExists = fs.existsSync(this.localModelPaths.dictFile);
      const acousticExists = fs.existsSync(path.join(this.localModelPaths.acousticDir, 'final.mdl'));
      
      if (dictExists && acousticExists) {
        logger.info('✅ MFA acoustic model already available: english');
        logger.info('✅ MFA dictionary already available: english.dict');
        logger.info('✅ All MFA models ready');
        this.modelsReady = true;
        return true;
      } else {
        logger.error('❌ Local MFA models not found');
        logger.error(`Dictionary: ${this.localModelPaths.dictFile} - ${dictExists ? 'OK' : 'MISSING'}`);
        logger.error(`Acoustic: ${path.join(this.localModelPaths.acousticDir, 'final.mdl')} - ${acousticExists ? 'OK' : 'MISSING'}`);
        return false;
      }
    } catch (error) {
      logger.error('Error checking local models:', error.message);
      return false;
    }
  }

  async ensureModels() {
    logger.info('🎯 Pre-cached common MFA models for Docker');
    return await this.checkLocalModels();
  }

  async prepareCorpus(audioPath, transcript) {
    const corpusDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-corpus-'));
    const baseName = 'audio';
    const audioExt = path.extname(audioPath);
    const corpusAudioPath = path.join(corpusDir, `${baseName}${audioExt}`);
    await fs.copyFile(audioPath, corpusAudioPath);

    const rawTranscript = transcript == null ? '' : String(transcript);
    const splitIntoSentences = (text) => {
      const raw = typeof text === 'string' ? text : '';
      return raw
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
    };

    const chunkByWordCount = (text, maxWords = 18) => {
      const raw = typeof text === 'string' ? text : '';
      const words = raw.split(/\s+/).map(w => w.trim()).filter(Boolean);
      if (words.length <= maxWords) return [raw.trim()].filter(Boolean);
      const chunks = [];
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      return chunks;
    };

    let sentences = splitIntoSentences(rawTranscript);
    if (sentences.length <= 1) {
      sentences = chunkByWordCount(rawTranscript, 18);
    }

    const cleanedLines = (sentences.length > 0 ? sentences : [rawTranscript])
      .map(s => this.cleanTranscript(s))
      .map(s => (s || '').trim())
      .filter(Boolean);

    const transcriptPath = path.join(corpusDir, `${baseName}.txt`);
    const transcriptForMfa = cleanedLines.length > 0 ? cleanedLines.join(os.EOL) : this.cleanTranscript(rawTranscript);
    await fs.writeFile(transcriptPath, transcriptForMfa, 'utf-8');

    logger.info(`🎯 MFA corpus transcript lines: ${cleanedLines.length}`);

    logger.info(`Corpus prepared: ${corpusDir}`);
    return corpusDir;
  }

  cleanTranscript(text) {
    return (text || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, ' ')
      .replace(/\u2026/g, ' ')
      .replace(/[.,!?;:\"\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async prepareDictionary(corpusDir) {
    const dictPath = path.join(corpusDir, 'english.dict');
    
    try {
      // Copy the local english.dict to corpus directory
      await fs.copyFile(this.localModelPaths.dictFile, dictPath);
      logger.info(`✅ Dictionary copied: ${dictPath}`);
      return dictPath;
    } catch (error) {
      logger.error('❌ Failed to copy dictionary:', error.message);
      throw error;
    }
  }

  async align(corpusDir, dictPath, outputDir, debug = null, alignOptions = {}) {
    const { beam = null, retryBeam = null, singleSpeaker = false } = alignOptions || {};
    // Convert Windows paths to Docker format
    const dockerCorpusDir = '//' + corpusDir.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);
    const dockerOutputDir = '//' + outputDir.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);
    const dockerDictDir = '//' + path.dirname(this.localModelPaths.dictFile).replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);
    const dockerAcousticDir = '//' + this.localModelPaths.acousticDir.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);

    const extraArgs = [];
    if (singleSpeaker) extraArgs.push('--single_speaker');
    if (beam != null) extraArgs.push(`--beam ${Number(beam)}`);
    if (retryBeam != null) extraArgs.push(`--retry_beam ${Number(retryBeam)}`);

    const command = `docker run --rm ` +
      `-v "${dockerCorpusDir}:/corpus" ` +
      `-v "${dockerOutputDir}:/output" ` +
      `-v "${dockerDictDir}:/dict" ` +
      `-v "${dockerAcousticDir}:/acoustic" ` +
      `mmcauliffe/montreal-forced-aligner ` +
      `mfa align /corpus /dict/english.dict /acoustic /output --clean --output_format long_textgrid --verbose ${extraArgs.join(' ')}`.trim();

    logger.info(`🎯 Running MFA alignment: ${command}`);
    await this.writeDebugLine(debug, {
      stage: 'local-align-command',
      command,
      dockerCorpusDir,
      dockerOutputDir,
      dockerDictDir,
      dockerAcousticDir,
      alignOptions: { beam, retryBeam, singleSpeaker },
    });
    
    try {
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
      const truncate = (s, max = 20000) => {
        if (s == null) return s;
        const str = String(s);
        if (str.length <= max) return str;
        return str.slice(0, max) + `... (truncated, total=${str.length})`;
      };
      await this.writeDebugLine(debug, {
        stage: 'local-align-output',
        stdout: truncate(stdout),
        stderr: truncate(stderr),
      });
      if (stderr) logger.warn('MFA stderr:', stderr);
      logger.info('✅ MFA alignment completed');
      return outputDir;
    } catch (error) {
      const truncate = (s, max = 20000) => {
        if (s == null) return s;
        const str = String(s);
        if (str.length <= max) return str;
        return str.slice(0, max) + `... (truncated, total=${str.length})`;
      };
      await this.writeDebugLine(debug, {
        stage: 'local-align-exec-error',
        errorMessage: error?.message || String(error),
        stdout: truncate(error?.stdout),
        stderr: truncate(error?.stderr),
      });
      logger.error('❌ MFA alignment failed:', error.message);
      throw error;
    }
  }

  async parseTextGrid(textGridPath) {
    try {
      const content = await fs.readFile(textGridPath, 'utf-8');
      const words = [];
      const lines = content.split('\n');
      
      let inWords = false;
      let start = null, end = null, text = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('name = "words"')) {
          inWords = true;
          continue;
        }
        if (trimmed.includes('name = "phones"')) {
          inWords = false;
          continue;
        }
        
        if (inWords) {
          const xminMatch = trimmed.match(/xmin = ([\d.]+)/);
          const xmaxMatch = trimmed.match(/xmax = ([\d.]+)/);
          const textMatch = trimmed.match(/text = "([^"]+)"/);
          
          if (xminMatch) start = parseFloat(xminMatch[1]);
          if (xmaxMatch) end = parseFloat(xmaxMatch[1]);
          if (textMatch) {
            text = textMatch[1];
            if (start !== null && end !== null && text && text !== '' && text !== 'sil' && text !== 'sp') {
              words.push({
                word: text,
                startTime: start,
                endTime: end
              });
            }
            start = null; end = null; text = null;
          }
        }
      }
      
      logger.info(`✅ Parsed ${words.length} words from TextGrid`);
      return words;
    } catch (error) {
      logger.error('❌ Failed to parse TextGrid:', error.message);
      throw error;
    }
  }

  async generateWordTimestamps(audioPath, transcript, locale = 'en_US', options = {}) {
    const { forceLocal = false, debug = null } = options;
    // Check if we should use remote MFA service (production)
    const useRemoteMFA = !forceLocal && process.env.USE_REMOTE_MFA === 'true';

    const transcriptText = transcript == null ? '' : String(transcript);
    const cleanedTranscript = this.cleanTranscript(transcriptText);
    const audioExt = path.extname(audioPath || '');
    let audioSize = null;
    try {
      const stat = await fs.stat(audioPath);
      audioSize = stat.size;
    } catch {
      audioSize = null;
    }

    await this.writeDebugLine(debug, {
      stage: 'start',
      audioPath,
      audioExt,
      audioSize,
      locale,
      forceLocal,
      useRemoteMFA,
      transcript: transcriptText,
      cleanedTranscript,
    });
    
    if (useRemoteMFA) {
      try {
        const result = await this.generateWordTimestampsRemote(audioPath, transcriptText, locale, { debug, cleanedTranscript });
        await this.writeDebugLine(debug, {
          stage: 'done',
          mode: 'remote',
          resultType: Array.isArray(result) ? 'array' : typeof result,
          resultCount: Array.isArray(result) ? result.length : null,
          sample: Array.isArray(result) && result.length > 0 ? result[0] : null,
        });
        return result;
      } catch (remoteErr) {
        const msg = remoteErr?.message || String(remoteErr);
        const shouldFallbackToLocal = msg.includes('HTTP 524') || msg.includes('status code 524') || msg.includes('timeout') || msg.includes('Remote MFA not available');
        await this.writeDebugLine(debug, {
          stage: 'remote-fallback-to-local',
          reason: shouldFallbackToLocal ? 'remote_error' : 'remote_error_no_fallback',
          errorMessage: msg,
        });
        if (!shouldFallbackToLocal) {
          throw remoteErr;
        }
        logger.warn(`[MFA] Remote MFA failed (${msg}). Falling back to local MFA...`);
        // Continue into local MFA processing below
      }
    }
    
    // Local MFA processing
    let corpusDir = null, outputDir = null;
    try {
      if (!await this.checkMFAAvailability()) throw new Error('MFA not available');
      await this.ensureModels();
      corpusDir = await this.prepareCorpus(audioPath, transcriptText);
      let dictPath = await this.prepareDictionary(corpusDir);

      outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-output-'));
      await this.writeDebugLine(debug, {
        stage: 'local-prepared',
        corpusDir,
        outputDir,
        dictPath,
        models: this.localModelPaths,
      });

      try {
        await this.align(corpusDir, dictPath, outputDir, debug);
      } catch (alignErr) {
        const msg = alignErr?.message || String(alignErr);
        const shouldRetry = msg.includes('NoAlignmentsError') || msg.includes('There were no successful alignments');

        if (shouldRetry) {
          await this.writeDebugLine(debug, {
            stage: 'local-align-retry',
            reason: 'NoAlignmentsError',
            retryWith: { beam: 100, retryBeam: 400, singleSpeaker: true },
          });

          try {
            await this.align(corpusDir, dictPath, outputDir, debug, { beam: 100, retryBeam: 400, singleSpeaker: true });
          } catch (retryErr) {
            const retryMsg = retryErr?.message || String(retryErr);
            const shouldRetryMore = retryMsg.includes('NoAlignmentsError') || retryMsg.includes('There were no successful alignments');
            if (shouldRetryMore) {
              await this.writeDebugLine(debug, {
                stage: 'local-align-retry',
                reason: 'NoAlignmentsError',
                retryWith: { beam: 1000, retryBeam: 4000, singleSpeaker: true },
              });
              try {
                await this.align(corpusDir, dictPath, outputDir, debug, { beam: 1000, retryBeam: 4000, singleSpeaker: true });
              } catch (retry2Err) {
                const retry2Msg = retry2Err?.message || String(retry2Err);
                const shouldTryOovFilter = retry2Msg.includes('NoAlignmentsError') || retry2Msg.includes('There were no successful alignments');
                if (shouldTryOovFilter) {
                  const filteredTranscript = await this.filterTranscriptToDictionary(transcriptText);
                  await this.writeDebugLine(debug, {
                    stage: 'local-align-retry',
                    reason: 'oov_filter',
                    originalTokenCount: cleanedTranscript.split(/\s+/).filter(Boolean).length,
                    filteredTokenCount: filteredTranscript.split(/\s+/).filter(Boolean).length,
                  });
                  try {
                    const transcriptPath = path.join(corpusDir, 'audio.txt');
                    const filteredTokens = filteredTranscript.split(/\s+/).filter(Boolean);
                    const chunked = [];
                    for (let i = 0; i < filteredTokens.length; i += 18) {
                      chunked.push(filteredTokens.slice(i, i + 18).join(' '));
                    }
                    await fs.writeFile(transcriptPath, chunked.join(os.EOL), 'utf-8');
                    await this.align(corpusDir, dictPath, outputDir, debug, { beam: 1000, retryBeam: 4000, singleSpeaker: true });
                  } catch (oovErr) {
                    await this.writeDebugLine(debug, {
                      stage: 'local-align-error',
                      errorMessage: oovErr?.message || String(oovErr),
                      stdout: oovErr?.stdout,
                      stderr: oovErr?.stderr,
                    });
                    throw oovErr;
                  }
                } else {
                  await this.writeDebugLine(debug, {
                    stage: 'local-align-error',
                    errorMessage: retry2Msg,
                    stdout: retry2Err?.stdout,
                    stderr: retry2Err?.stderr,
                  });
                  throw retry2Err;
                }
              }
            } else {
              await this.writeDebugLine(debug, {
                stage: 'local-align-error',
                errorMessage: retryMsg,
                stdout: retryErr?.stdout,
                stderr: retryErr?.stderr,
              });
              throw retryErr;
            }
          }
        } else {
          await this.writeDebugLine(debug, {
            stage: 'local-align-error',
            errorMessage: msg,
            stdout: alignErr?.stdout,
            stderr: alignErr?.stderr,
          });
          throw alignErr;
        }
      }

      const textGridPath = path.join(outputDir, 'audio.TextGrid');
      const parsed = await this.parseTextGrid(textGridPath);
      await this.writeDebugLine(debug, {
        stage: 'done',
        mode: 'local',
        resultType: Array.isArray(parsed) ? 'array' : typeof parsed,
        resultCount: Array.isArray(parsed) ? parsed.length : null,
        sample: Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null,
      });
      return parsed;
    } catch (error) {
      await this.writeDebugLine(debug, {
        stage: 'error',
        errorMessage: error?.message || String(error),
        stack: error?.stack,
      });
      logger.error('MFA pipeline failed:', error);
      throw error;
    } finally {
      if (corpusDir) await fs.rm(corpusDir, { recursive: true, force: true }).catch(() => {});
      if (outputDir) await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async generateWordTimestampsRemote(audioPath, transcript, locale = 'en_US', options = {}) {
    const { debug = null, cleanedTranscript: cleanedTranscriptFromCaller = null } = options;
    try {
      const axios = require('axios');
      const FormData = require('form-data');
      const path = require('path');
      
      const MFA_SERVICE_URL = process.env.MFA_SERVICE_URL || 'https://api.booklevel.store';
      
      logger.info(`🌐 Using remote MFA service: ${MFA_SERVICE_URL}`);

      const transcriptText = transcript == null ? '' : String(transcript);
      const cleanedTranscript = cleanedTranscriptFromCaller != null
        ? cleanedTranscriptFromCaller
        : this.cleanTranscript(transcriptText);
      
      // Send original MP3 to remote MFA - server handles conversion
      // This avoids sending large WAV files over the network
      const audioBuffer = await fs.readFile(audioPath);
      const isWav = audioPath.endsWith('.wav');
      
      await this.writeDebugLine(debug, {
        stage: 'remote-request',
        mfaServiceUrl: MFA_SERVICE_URL,
        audioPath,
        audioSize: audioBuffer.length,
        audioFormat: isWav ? 'WAV' : 'MP3',
        transcript: transcriptText,
        cleanedTranscript,
        locale,
      });
      
      logger.info(`🌐 [Remote MFA] Audio buffer size: ${audioBuffer.length} bytes, Format: ${isWav ? 'WAV' : 'MP3'}, Transcript length: ${cleanedTranscript.length} chars`);
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: isWav ? 'audio.wav' : 'audio.mp3',
        contentType: isWav ? 'audio/wav' : 'audio/mpeg'
      });
      formData.append('transcript', cleanedTranscript);
      formData.append('locale', locale);
      
      // Send request to remote MFA service
      const rawId = typeof debug === 'string' ? debug : (debug?.id || debug?.requestId || debug?.tag);
      const safeId = rawId
        ? String(rawId)
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 120)
        : null;

      const response = await axios.post(`${MFA_SERVICE_URL}/api/mfa/align`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...(safeId ? { 'x-mfa-debug-id': safeId } : {}),
        },
        timeout: Number(process.env.MFA_REMOTE_TIMEOUT_MS || 300000),
        maxContentLength: 50 * 1024 * 1024, // 50MB
        maxBodyLength: 50 * 1024 * 1024
      });

      await this.writeDebugLine(debug, {
        stage: 'remote-response',
        status: response?.status,
        responseData: response?.data,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Remote MFA alignment failed');
      }
      
      logger.info(`✅ Remote MFA alignment completed: ${response.data.wordCount} words`);
      return response.data.timepoints;
      
    } catch (error) {
      const errorDetail = error.response?.data?.error || error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 'N/A';
      await this.writeDebugLine(debug, {
        stage: 'remote-error',
        statusCode,
        errorDetail,
        responseData: error.response?.data,
        stack: error?.stack,
      });
      logger.error(`❌ Remote MFA alignment failed: [HTTP ${statusCode}] ${errorDetail}`);
      if (error.response?.data) {
        logger.debug(`Remote MFA error response: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Remote MFA not available: ${errorDetail}`);
    }
  }
}

const mfaAligner = new MFAAligner();
module.exports = { mfaAligner, MFAAligner };