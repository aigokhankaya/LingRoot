const sdk = require('microsoft-cognitiveservices-speech-sdk');
const logger = require('../common/logger.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Azure TTS Client Configuration
let speechConfig = null;

/**
 * Initialize Azure Speech SDK
 */
function initializeAzureTTS() {
  try {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!subscriptionKey) {
      logger.warn('Azure Speech SDK not initialized: AZURE_SPEECH_KEY not found in environment');
      return false;
    }

    speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
    
    logger.info('Azure Speech SDK initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Azure Speech SDK:', error.message);
    speechConfig = null;
    return false;
  }
}

// Initialize on module load
initializeAzureTTS();

/**
 * List available Azure TTS voices
 * @param {string} locale - Language locale (e.g., 'en-US')
 * @returns {Promise<Array>} Array of voice objects
 */
async function listAzureVoices(locale = 'en-US') {
  if (!speechConfig) {
    throw new Error('Azure Speech SDK not initialized');
  }

  try {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
    
    return new Promise((resolve, reject) => {
      synthesizer.getVoicesAsync(
        locale,
        (result) => {
          if (result.reason === sdk.ResultReason.VoicesListRetrieved) {
            const voices = result.voices.map(voice => ({
              name: voice.shortName,
              displayName: voice.localName,
              locale: voice.locale,
              gender: voice.gender === 1 ? 'MALE' : voice.gender === 2 ? 'FEMALE' : 'NEUTRAL',
              voiceType: voice.voiceType === 1 ? 'Neural' : 'Standard',
              styleList: voice.styleList || [],
              localName: voice.localName
            }));
            
            logger.info(`Retrieved ${voices.length} Azure voices for locale: ${locale}`);
            synthesizer.close();
            resolve(voices);
          } else {
            synthesizer.close();
            reject(new Error('Failed to retrieve voices'));
          }
        },
        (error) => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    logger.error(`Failed to list Azure voices: ${error.message}`);
    throw error;
  }
}

/**
 * Synthesize text with Azure TTS and capture word boundaries
 * @param {Object} options - Synthesis options
 * @param {string} options.text - Text to synthesize
 * @param {string} options.voiceName - Voice name (e.g., 'en-US-JennyNeural')
 * @param {string} options.languageCode - Language code (e.g., 'en-US')
 * @param {number} options.speakingRate - Speaking rate (0.5-2.0)
 * @param {number} options.pitch - Pitch adjustment (-50 to +50)
 * @returns {Promise<Object>} Audio buffer and word timings
 */
async function synthesizeWithAzure(options) {
  if (!speechConfig) {
    throw new Error('Azure Speech SDK not initialized');
  }

  const {
    text,
    voiceName = 'en-US-JennyNeural',
    languageCode = 'en-US',
    speakingRate = 1.0,
    pitch = 0
  } = options;

  logger.info(`🎯 Azure TTS synthesis - Voice: ${voiceName}, Rate: ${speakingRate}x, Length: ${text.length} chars`);

  try {
    // Create a unique temp file for audio output
    const tempFileName = `azure_tts_${uuidv4()}.mp3`;
    const tempFilePath = path.join(require('os').tmpdir(), tempFileName);

    // Configure audio output to file
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(tempFilePath);
    
    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // Arrays to store word boundary events
    const wordBoundaries = [];
    
    // Subscribe to word boundary events
    synthesizer.wordBoundary = (s, e) => {
      // AudioOffset is in 100-nanosecond units (ticks)
      // Convert to seconds: audioOffset / 10,000,000
      const timeSeconds = e.audioOffset / 10000000;
      
      // Filter out punctuation marks (only keep actual words)
      const isPunctuation = /^[.,!?;:'"()-]+$/.test(e.text);
      
      if (!isPunctuation) {
        wordBoundaries.push({
          word: e.text,
          timeSeconds: timeSeconds,
          audioOffset: e.audioOffset,
          duration: e.duration ? e.duration / 10000000 : 0,
          textOffset: e.textOffset,
          wordLength: e.wordLength,
          boundaryType: e.boundaryType
        });
        
        // Log first few words for debugging
        if (wordBoundaries.length <= 5) {
          logger.info(`🎯 Word boundary: "${e.text}" at ${timeSeconds.toFixed(3)}s`);
        }
      }
    };

    // Build SSML with rate and pitch adjustments
    const ssml = buildSSML(text, voiceName, speakingRate, pitch);
    
    logger.debug('🎯 Azure SSML:', ssml.substring(0, 200) + '...');

    // Perform synthesis
    return new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            logger.info(`🎯 Azure TTS synthesis completed successfully`);
            
            // Read the audio file
            const audioContent = fs.readFileSync(tempFilePath);
            
            // Clean up temp file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (err) {
              logger.warn(`Failed to delete temp file: ${tempFilePath}`);
            }

            // Calculate word timings with end times (only for words with boundaries)
            const wordTimings = calculateWordTimings(wordBoundaries, speakingRate);
            
            // Split text into words (including punctuation attached to words)
            const originalWords = text.split(/\s+/).filter(w => w.length > 0);
            
            // Clean words: remove punctuation for matching
            const cleanWords = originalWords.map(w => w.replace(/[^\w]/g, '')).filter(w => w.length > 0);
            
            // Calculate total duration
            const totalDuration = wordTimings.length > 0
              ? Math.max(...wordTimings.map(w => w.endTimeSeconds))
              : 0;

            // Timing quality analysis
            const timingQuality = {
              totalWords: originalWords.length,
              markedWords: wordBoundaries.length,
              boundaryAccuracy: (wordBoundaries.length / originalWords.length) * 100,
              avgWordDuration: wordTimings.reduce((sum, w) => sum + (w.endTimeSeconds - w.timeSeconds), 0) / wordTimings.length
            };

            logger.info(`🎯 Azure TTS synthesis result:
              - Duration: ${totalDuration.toFixed(3)}s
              - Word boundaries: ${wordBoundaries.length}
              - Marked words: ${timingQuality.markedWords}/${timingQuality.totalWords} (${timingQuality.boundaryAccuracy.toFixed(1)}%)
              - Audio size: ${audioContent.length} bytes
              - Average word duration: ${(timingQuality.avgWordDuration * 1000).toFixed(0)}ms`);

            synthesizer.close();
            
            resolve({
              audioContent: audioContent,
              wordTimings: wordTimings,
              cleanWords: cleanWords,
              originalWords: originalWords,
              totalDuration: totalDuration,
              speakingRate: speakingRate,
              voiceName: voiceName,
              timingMethod: 'Azure WordBoundary Events',
              wordBoundaries: wordBoundaries,
              timingQuality: timingQuality,
              success: true
            });
          } else if (result.reason === sdk.ResultReason.Canceled) {
            synthesizer.close();
            
            // Clean up temp file on error
            try {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (err) {
              // Ignore cleanup errors
            }
            
            // Try to get cancellation details if available
            let errorMessage = 'Azure TTS synthesis canceled';
            try {
              if (sdk.CancellationDetails && sdk.CancellationDetails.fromResult) {
                const cancellation = sdk.CancellationDetails.fromResult(result);
                errorMessage = `Azure TTS synthesis canceled: ${cancellation.reason} - ${cancellation.errorDetails || 'No details'}`;
              }
            } catch (detailErr) {
              logger.warn('Could not get cancellation details:', detailErr.message);
            }
            
            reject(new Error(errorMessage));
          } else {
            synthesizer.close();
            
            // Clean up temp file on error
            try {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (err) {
              // Ignore cleanup errors
            }
            
            reject(new Error(`Azure TTS synthesis failed with reason: ${result.reason}`));
          }
        },
        (error) => {
          synthesizer.close();
          
          // Clean up temp file on error
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          } catch (err) {
            // Ignore cleanup errors
          }
          
          reject(error);
        }
      );
    });
  } catch (error) {
    logger.error(`Azure TTS synthesis failed: ${error.message}`);
    throw error;
  }
}

/**
 * Build SSML markup for Azure TTS
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice name
 * @param {number} speakingRate - Speaking rate
 * @param {number} pitch - Pitch adjustment
 * @returns {string} SSML markup
 */
function buildSSML(text, voiceName, speakingRate = 1.0, pitch = 0) {
  // Escape XML special characters
  const escapeXML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const escapedText = escapeXML(text);
  
  // Convert rate to percentage string
  const ratePercent = Math.round((speakingRate - 1) * 100);
  const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
  
  // Convert pitch to percentage string
  const pitchStr = pitch >= 0 ? `+${pitch}%` : `${pitch}%`;

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="${voiceName}">
      <prosody rate="${rateStr}" pitch="${pitchStr}">
        ${escapedText}
      </prosody>
    </voice>
  </speak>`;
}

/**
 * Calculate word timings with end times
 * @param {Array} wordBoundaries - Word boundary events from Azure
 * @param {number} speakingRate - Speaking rate
 * @returns {Array} Word timings with start and end times
 */
function calculateWordTimings(wordBoundaries, speakingRate) {
  const wordTimings = [];
  
  for (let i = 0; i < wordBoundaries.length; i++) {
    const boundary = wordBoundaries[i];
    let endTime;
    
    // If there's a next word, use its start time as this word's end time
    if (i < wordBoundaries.length - 1) {
      endTime = wordBoundaries[i + 1].timeSeconds;
    } else {
      // For the last word, estimate duration based on average
      const avgDuration = boundary.duration || (0.5 / speakingRate);
      endTime = boundary.timeSeconds + avgDuration;
    }
    
    // Ensure minimum word duration
    const minDuration = 0.1 / speakingRate;
    if (endTime - boundary.timeSeconds < minDuration) {
      endTime = boundary.timeSeconds + minDuration;
    }
    
    wordTimings.push({
      word: boundary.word,
      timeSeconds: boundary.timeSeconds,
      endTimeSeconds: endTime,
      textOffset: boundary.textOffset,
      wordLength: boundary.wordLength,
      hasDirectTiming: true
    });
  }
  
  return wordTimings;
}

/**
 * Check if Azure TTS is available
 * @returns {boolean} True if Azure TTS is initialized
 */
function isAzureTTSAvailable() {
  return speechConfig !== null;
}

module.exports = {
  synthesizeWithAzure,
  listAzureVoices,
  isAzureTTSAvailable,
  initializeAzureTTS
};
