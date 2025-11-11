// backend/utils/mfaAligner.js
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('./logger');

const execAsync = promisify(exec);

/**
 * MFA (Montreal Forced Aligner) Integration for High-Accuracy Word Alignment
 * 
 * This service uses MFA to generate precise word-level timestamps by analyzing
 * the actual audio waveform, eliminating the drift issues from TTS API timepoints.
 * 
 * Reference: MFA-Analiz.md - Section IV & V
 */

class MFAAligner {
  constructor() {
    // MFA model names for English (US)
    this.models = {
      en_US: {
        acoustic: 'english_mfa',
        dictionary: 'english_mfa',
        g2p: 'english_mfa'
      },
      en_GB: {
        acoustic: 'english_mfa', // Multi-dialect model
        dictionary: 'english_uk_mfa',
        g2p: 'english_uk_mfa'
      }
    };
  }

  /**
   * Check if MFA is installed and available
   */
  async checkMFAAvailability() {
    try {
      const { stdout } = await execAsync('mfa version');
      logger.info(`✅ MFA available: ${stdout.trim()}`);
      return true;
    } catch (error) {
      logger.warn('⚠️ MFA not available:', error.message);
      return false;
    }
  }

  /**
   * Ensure required MFA models are downloaded
   * @param {string} locale - Language locale (e.g., 'en_US', 'en_GB')
   */
  async ensureModels(locale = 'en_US') {
    const models = this.models[locale] || this.models.en_US;
    
    try {
      // Download acoustic model
      logger.info(`📥 Downloading MFA acoustic model: ${models.acoustic}`);
      await execAsync(`mfa model download acoustic ${models.acoustic}`);
      
      // Download dictionary
      logger.info(`📥 Downloading MFA dictionary: ${models.dictionary}`);
      await execAsync(`mfa model download dictionary ${models.dictionary}`);
      
      // Download G2P model
      logger.info(`📥 Downloading MFA G2P model: ${models.g2p}`);
      await execAsync(`mfa model download g2p ${models.g2p}`);
      
      logger.info('✅ All MFA models ready');
      return true;
    } catch (error) {
      logger.error('❌ Failed to download MFA models:', error);
      return false;
    }
  }

  /**
   * Prepare corpus directory structure for MFA
   * MFA requires: corpus_dir/audio.wav and corpus_dir/audio.txt
   * 
   * @param {string} audioPath - Path to audio file (.wav or .mp3)
   * @param {string} transcript - Text transcript
   * @returns {Promise<string>} - Path to corpus directory
   */
  async prepareCorpus(audioPath, transcript) {
    const corpusDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-corpus-'));
    const baseName = 'audio';
    
    // Copy audio file
    const audioExt = path.extname(audioPath);
    const corpusAudioPath = path.join(corpusDir, `${baseName}${audioExt}`);
    await fs.copyFile(audioPath, corpusAudioPath);
    
    // Create transcript file (clean text, no punctuation for better alignment)
    const cleanTranscript = this.cleanTranscript(transcript);
    const transcriptPath = path.join(corpusDir, `${baseName}.txt`);
    await fs.writeFile(transcriptPath, cleanTranscript, 'utf-8');
    
    logger.info(`📁 Corpus prepared: ${corpusDir}`);
    return corpusDir;
  }

  /**
   * Clean transcript for MFA alignment
   * Remove punctuation, keep only spoken words
   */
  cleanTranscript(text) {
    return text
      .replace(/[.,!?;:"""''—–-]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate comprehensive dictionary using G2P model
   * This handles OOV (out-of-vocabulary) words
   * 
   * @param {string} corpusDir - Corpus directory path
   * @param {string} locale - Language locale
   * @returns {Promise<string>} - Path to generated dictionary
   */
  async generateDictionary(corpusDir, locale = 'en_US') {
    const models = this.models[locale] || this.models.en_US;
    const dictPath = path.join(corpusDir, 'custom_dict.txt');
    
    try {
      const command = `mfa g2p ${corpusDir} ${models.g2p} ${dictPath}`;
      logger.info(`🔤 Generating dictionary: ${command}`);
      
      await execAsync(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
      
      logger.info(`✅ Dictionary generated: ${dictPath}`);
      return dictPath;
    } catch (error) {
      logger.error('❌ Dictionary generation failed:', error);
      throw error;
    }
  }

  /**
   * Run MFA alignment
   * 
   * @param {string} corpusDir - Corpus directory
   * @param {string} dictPath - Dictionary path
   * @param {string} outputDir - Output directory for alignment results
   * @param {string} locale - Language locale
   * @returns {Promise<string>} - Path to output directory
   */
  async align(corpusDir, dictPath, outputDir, locale = 'en_US') {
    const models = this.models[locale] || this.models.en_US;
    
    try {
      const command = `mfa align ${corpusDir} ${dictPath} ${models.acoustic} ${outputDir} --output_format json --clean`;
      logger.info(`🎯 Running MFA alignment: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, { 
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
        timeout: 300000 // 5 minute timeout
      });
      
      if (stderr) {
        logger.warn('MFA stderr:', stderr);
      }
      
      logger.info('✅ MFA alignment completed');
      return outputDir;
    } catch (error) {
      logger.error('❌ MFA alignment failed:', error);
      throw error;
    }
  }

  /**
   * Parse MFA JSON output to extract word-level timestamps
   * 
   * @param {string} jsonPath - Path to MFA JSON output
   * @returns {Promise<Array>} - Array of {word, startTime, endTime}
   */
  async parseAlignmentJSON(jsonPath) {
    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(jsonContent);
      
      // Extract word tier
      const wordTier = data.tiers?.words;
      if (!wordTier || !wordTier.entries) {
        throw new Error('Invalid MFA JSON format: missing word tier');
      }
      
      // Convert to our format: {word, startTime, endTime}
      const wordTimings = wordTier.entries
        .filter(entry => entry[2] !== 'sil' && entry[2] !== 'sp') // Filter out silence markers
        .map(entry => ({
          word: entry[2],
          startTime: parseFloat(entry[0]),
          endTime: parseFloat(entry[1])
        }));
      
      logger.info(`✅ Parsed ${wordTimings.length} word timings from MFA output`);
      return wordTimings;
    } catch (error) {
      logger.error('❌ Failed to parse MFA JSON:', error);
      throw error;
    }
  }

  /**
   * Main pipeline: Generate accurate word-level timestamps using MFA
   * 
   * @param {string} audioPath - Path to audio file
   * @param {string} transcript - Text transcript
   * @param {string} locale - Language locale (default: en_US)
   * @returns {Promise<Array>} - Array of {word, startTime, endTime}
   */
  async generateWordTimestamps(audioPath, transcript, locale = 'en_US') {
    let corpusDir = null;
    let outputDir = null;
    
    try {
      // Step 1: Check MFA availability
      const isAvailable = await this.checkMFAAvailability();
      if (!isAvailable) {
        throw new Error('MFA is not installed. Please install MFA first.');
      }
      
      // Step 2: Ensure models are downloaded
      await this.ensureModels(locale);
      
      // Step 3: Prepare corpus
      corpusDir = await this.prepareCorpus(audioPath, transcript);
      
      // Step 4: Generate dictionary with G2P
      const dictPath = await this.generateDictionary(corpusDir, locale);
      
      // Step 5: Create output directory
      outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mfa-output-'));
      
      // Step 6: Run alignment
      await this.align(corpusDir, dictPath, outputDir, locale);
      
      // Step 7: Parse results
      const jsonPath = path.join(outputDir, 'audio.json');
      const wordTimings = await this.parseAlignmentJSON(jsonPath);
      
      return wordTimings;
      
    } catch (error) {
      logger.error('❌ MFA pipeline failed:', error);
      throw error;
    } finally {
      // Cleanup temporary directories
      if (corpusDir) {
        await fs.rm(corpusDir, { recursive: true, force: true }).catch(() => {});
      }
      if (outputDir) {
        await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}

// Singleton instance
const mfaAligner = new MFAAligner();

module.exports = {
  mfaAligner,
  MFAAligner
};
