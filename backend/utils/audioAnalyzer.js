const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const logger = require('./logger');

const execPromise = promisify(exec);

/**
 * Get actual audio duration using ffprobe
 * @param {Buffer} audioBuffer - Audio file buffer
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(audioBuffer) {
  let tempFilePath = null;
  
  try {
    // Create temp file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `audio_${Date.now()}.mp3`);
    
    // Write buffer to temp file
    await fs.writeFile(tempFilePath, audioBuffer);
    
    // Use ffprobe to get duration
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFilePath}"`
    );
    
    const duration = parseFloat(stdout.trim());
    
    if (isNaN(duration)) {
      throw new Error('Invalid duration from ffprobe');
    }
    
    logger.info(`🎵 Audio duration detected: ${duration.toFixed(2)}s`);
    
    return duration;
    
  } catch (error) {
    logger.error(`Failed to get audio duration: ${error.message}`);
    return null;
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Analyze audio and adjust word timings based on actual duration
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {Array} wordTimings - Original word timings
 * @param {number} estimatedDuration - Estimated duration
 * @returns {Promise<Object>} Adjusted timings and drift info
 */
async function analyzeAndAdjustTimings(audioBuffer, wordTimings, estimatedDuration) {
  try {
    const actualDuration = await getAudioDuration(audioBuffer);
    
    if (!actualDuration) {
      logger.warn('⚠️ Could not detect audio duration, using estimated');
      return {
        wordTimings: wordTimings,
        actualDuration: estimatedDuration,
        driftDetected: false,
        driftAmount: 0
      };
    }
    
    // Calculate drift
    const drift = actualDuration - estimatedDuration;
    const driftPercentage = (drift / estimatedDuration) * 100;
    
    logger.info(`🎯 Duration Analysis:
      - Estimated: ${estimatedDuration.toFixed(2)}s
      - Actual: ${actualDuration.toFixed(2)}s
      - Drift: ${drift.toFixed(2)}s (${driftPercentage.toFixed(1)}%)`);
    
    // If drift is significant (>5%), adjust timings
    if (Math.abs(driftPercentage) > 5) {
      logger.warn(`⚠️ Significant drift detected (${driftPercentage.toFixed(1)}%), adjusting timings...`);
      
      const scaleFactor = actualDuration / estimatedDuration;
      
      const adjustedTimings = wordTimings.map(timing => ({
        ...timing,
        timeSeconds: timing.timeSeconds * scaleFactor,
        endTimeSeconds: timing.endTimeSeconds * scaleFactor,
        adjusted: true
      }));
      
      logger.info(`✅ Timings adjusted with scale factor: ${scaleFactor.toFixed(4)}`);
      
      return {
        wordTimings: adjustedTimings,
        actualDuration: actualDuration,
        driftDetected: true,
        driftAmount: drift,
        driftPercentage: driftPercentage,
        scaleFactor: scaleFactor
      };
    }
    
    // Drift is acceptable, use original timings
    logger.info(`✅ Drift is acceptable (${driftPercentage.toFixed(1)}%), using original timings`);
    
    return {
      wordTimings: wordTimings,
      actualDuration: actualDuration,
      driftDetected: false,
      driftAmount: drift,
      driftPercentage: driftPercentage
    };
    
  } catch (error) {
    logger.error(`Audio analysis failed: ${error.message}`);
    return {
      wordTimings: wordTimings,
      actualDuration: estimatedDuration,
      driftDetected: false,
      driftAmount: 0,
      error: error.message
    };
  }
}

module.exports = {
  getAudioDuration,
  analyzeAndAdjustTimings
};
