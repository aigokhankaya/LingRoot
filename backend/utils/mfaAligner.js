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
    return text
      .replace(/[.,!?;:"""''—–-]/g, '')
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

  async generateWordTimestamps(audioPath, transcript, locale = 'en_US') {
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
}

const mfaAligner = new MFAAligner();
module.exports = { mfaAligner, MFAAligner };