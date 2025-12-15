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

    const cleanTranscript = this.cleanTranscript(transcript);
    const transcriptPath = path.join(corpusDir, `${baseName}.txt`);
    await fs.writeFile(transcriptPath, cleanTranscript, 'utf-8');

    logger.info(`Corpus prepared: ${corpusDir}`);
    return corpusDir;
  }

  cleanTranscript(text) {
    return (text || '')
      .normalize('NFKD')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, ' ')
      .replace(/\u2026/g, ' ')
      .replace(/[.,!?;:\"'\-]/g, '')
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

  async align(corpusDir, dictPath, outputDir) {
    // Convert Windows paths to Docker format
    const dockerCorpusDir = '//' + corpusDir.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);
    const dockerOutputDir = '//' + outputDir.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);
    const dockerDictDir = '//' + path.dirname(this.localModelPaths.dictFile).replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);
    const dockerAcousticDir = '//' + this.localModelPaths.acousticDir.replace(/\\/g, '/').replace(/^([A-Z]):/, (m, d) => `${d.toLowerCase()}`);

    const command = `docker run --rm ` +
      `-v "${dockerCorpusDir}:/corpus" ` +
      `-v "${dockerOutputDir}:/output" ` +
      `-v "${dockerDictDir}:/dict" ` +
      `-v "${dockerAcousticDir}:/acoustic" ` +
      `mmcauliffe/montreal-forced-aligner ` +
      `mfa align /corpus /dict/english.dict /acoustic /output --clean --output_format long_textgrid --verbose`;

    logger.info(`🎯 Running MFA alignment: ${command}`);
    
    try {
      const { stderr } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024, timeout: 300000 });
      if (stderr) logger.warn('MFA stderr:', stderr);
      logger.info('✅ MFA alignment completed');
      return outputDir;
    } catch (error) {
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
    const { forceLocal = false } = options;
    // Check if we should use remote MFA service (production)
    const useRemoteMFA = !forceLocal && process.env.USE_REMOTE_MFA === 'true';
    
    if (useRemoteMFA) {
      return await this.generateWordTimestampsRemote(audioPath, transcript, locale);
    }
    
    // Local MFA processing
    let corpusDir = null, outputDir = null;
    try {
      if (!await this.checkMFAAvailability()) throw new Error('MFA not available');
      await this.ensureModels();
      corpusDir = await this.prepareCorpus(audioPath, transcript);
      const dictPath = await this.prepareDictionary(corpusDir);

      outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-output-'));
      await this.align(corpusDir, dictPath, outputDir);

      const textGridPath = path.join(outputDir, 'audio.TextGrid');
      return await this.parseTextGrid(textGridPath);
    } catch (error) {
      logger.error('MFA pipeline failed:', error);
      throw error;
    } finally {
      if (corpusDir) await fs.rm(corpusDir, { recursive: true, force: true }).catch(() => {});
      if (outputDir) await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async generateWordTimestampsRemote(audioPath, transcript, locale = 'en_US') {
    try {
      const axios = require('axios');
      const FormData = require('form-data');
      const path = require('path');
      
      const MFA_SERVICE_URL = process.env.MFA_SERVICE_URL || 'https://api.booklevel.store';
      
      logger.info(`🌐 Using remote MFA service: ${MFA_SERVICE_URL}`);

      const cleanedTranscript = this.cleanTranscript(transcript);
      
      // Send original MP3 to remote MFA - server handles conversion
      // This avoids sending large WAV files over the network
      const audioBuffer = await fs.readFile(audioPath);
      const isWav = audioPath.endsWith('.wav');
      
      // DEBUG: Write detailed comparison log to file
      const debugLogPath = path.join(process.cwd(), 'logs', 'mfa_debug.log');
      const debugInfo = {
        timestamp: new Date().toISOString(),
        mode: audioPath.includes('podcast') ? 'PODCAST' : 'TEXT',
        audioPath,
        audioSize: audioBuffer.length,
        audioFormat: isWav ? 'WAV' : 'MP3',
        transcriptLength: transcript.length,
        cleanedTranscriptLength: cleanedTranscript.length,
        transcriptFirst500: transcript.substring(0, 500),
        cleanedTranscriptFirst500: cleanedTranscript.substring(0, 500),
        locale,
        mfaServiceUrl: MFA_SERVICE_URL
      };
      const logLine = `\n${'='.repeat(80)}\n${JSON.stringify(debugInfo, null, 2)}\n`;
      await fs.appendFile(debugLogPath, logLine).catch(() => {});
      
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
      const response = await axios.post(`${MFA_SERVICE_URL}/api/mfa/align`, formData, {
        headers: formData.getHeaders(),
        timeout: 120000, // 2 minutes
        maxContentLength: 50 * 1024 * 1024, // 50MB
        maxBodyLength: 50 * 1024 * 1024
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Remote MFA alignment failed');
      }
      
      logger.info(`✅ Remote MFA alignment completed: ${response.data.wordCount} words`);
      return response.data.timepoints;
      
    } catch (error) {
      const errorDetail = error.response?.data?.error || error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 'N/A';
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