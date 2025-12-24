const { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } = require('@aws-sdk/client-polly');
const logger = require('./logger');

const REGION = process.env.AWS_REGION || 'us-east-1';
let polly = null;

// Initialize Polly client
function initializePollyClient() {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('Amazon Polly not initialized: AWS credentials not found');
      return false;
    }

    polly = new PollyClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    logger.info('Amazon Polly client initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Amazon Polly client:', error.message);
    polly = null;
    return false;
  }
}

// Initialize on module load
initializePollyClient();

// Popular English voices for Amazon Polly Neural engine
const POLLY_NEURAL_VOICES = [
  // US English
  { id: 'Joanna', gender: 'Female', languageCode: 'en-US', engine: 'neural' },
  { id: 'Matthew', gender: 'Male', languageCode: 'en-US', engine: 'neural' },
  { id: 'Ivy', gender: 'Female', languageCode: 'en-US', engine: 'neural' },
  { id: 'Kevin', gender: 'Male', languageCode: 'en-US', engine: 'neural' },
  { id: 'Kimberly', gender: 'Female', languageCode: 'en-US', engine: 'neural' },
  { id: 'Salli', gender: 'Female', languageCode: 'en-US', engine: 'neural' },
  { id: 'Joey', gender: 'Male', languageCode: 'en-US', engine: 'neural' },
  { id: 'Justin', gender: 'Male', languageCode: 'en-US', engine: 'neural' },
  { id: 'Kendra', gender: 'Female', languageCode: 'en-US', engine: 'neural' },
  // UK English
  { id: 'Amy', gender: 'Female', languageCode: 'en-GB', engine: 'neural' },
  { id: 'Emma', gender: 'Female', languageCode: 'en-GB', engine: 'neural' },
  { id: 'Brian', gender: 'Male', languageCode: 'en-GB', engine: 'neural' },
  { id: 'Arthur', gender: 'Male', languageCode: 'en-GB', engine: 'neural' },
  // Australian English
  { id: 'Olivia', gender: 'Female', languageCode: 'en-AU', engine: 'neural' },
  // Indian English
  { id: 'Kajal', gender: 'Female', languageCode: 'en-IN', engine: 'neural' },
];

/**
 * Clean text for timing - remove punctuation but keep word structure
 * @param {string} text - Text to clean
 * @returns {Object} Clean words and original words
 */
function cleanTextForTiming(text) {
  const originalWords = text.split(/\s+/).filter(word => word.length > 0);
  const cleanWords = originalWords.map(word => {
    return word.replace(/[^\w]/g, '').trim();
  }).filter(word => word.length > 0);

  return {
    originalWords,
    cleanWords,
    mapping: originalWords.map((original, index) => ({
      original,
      clean: original.replace(/[^\w]/g, '').trim(),
      index
    })).filter(item => item.clean.length > 0)
  };
}

/**
 * Synthesize speech using Amazon Polly with Speech Marks for word timing
 * @param {Object} options - Synthesis options
 * @param {string} options.text - The text to synthesize
 * @param {string} options.voiceName - The Polly voice ID (e.g., 'Joanna')
 * @param {string} options.languageCode - The language code (e.g., 'en-US')
 * @param {number} options.speakingRate - Speaking rate (0.5-2.0), Polly uses percentage
 * @returns {Promise<Object>} Audio buffer and word timings
 */
async function synthesizeWithPolly(options) {
  if (!polly) {
    throw new Error('Amazon Polly client not initialized');
  }

  const {
    text,
    voiceName = 'Joanna',
    languageCode = 'en-US',
    speakingRate = 1.0,
    engine = 'neural'
  } = options;

  logger.info(`🎯 Amazon Polly synthesis - Voice: ${voiceName}, Rate: ${speakingRate}x, Length: ${text.length} chars`);

  try {
    // Convert speaking rate to Polly's percentage format (50% to 200%)
    const pollyRate = Math.round(speakingRate * 100);
    const rateString = `${pollyRate}%`;

    // Build SSML with prosody rate
    const ssml = `<speak><prosody rate="${rateString}">${escapeSSML(text)}</prosody></speak>`;

    // Step 1: Get Speech Marks (word timings) - JSON output
    // NOTE: Generative and Long-form engines do not support speech marks.
    // We must check engine type or handle error.
    let speechMarks = [];
    const isGenerativeOrLongForm = engine === 'generative' || engine === 'long-form';

    if (!isGenerativeOrLongForm) {
      try {
        logger.info(`[Polly] Requesting speech marks for word timings...`);
        const speechMarksCommand = new SynthesizeSpeechCommand({
          OutputFormat: 'json',
          Text: ssml,
          TextType: 'ssml',
          VoiceId: voiceName,
          LanguageCode: languageCode,
          Engine: engine,
          SpeechMarkTypes: ['word'] // Get word-level timing marks
        });

        const speechMarksResponse = await polly.send(speechMarksCommand);

        if (speechMarksResponse.AudioStream) {
          // Parse speech marks JSON (each line is a separate JSON object)
          const speechMarksBuffer = Buffer.from(await speechMarksResponse.AudioStream.transformToByteArray());
          const speechMarksText = speechMarksBuffer.toString('utf-8');
          speechMarks = speechMarksText
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

          logger.info(`[Polly] Received ${speechMarks.length} speech marks`);
        }
      } catch (smError) {
        logger.warn(`[Polly] Speech marks request failed (likely unsupported by engine/voice): ${smError.message}. Proceeding with linear timing estimation byword.`);
        // Fallback to empty speechMarks array -> triggers linear estimation below
      }
    } else {
      logger.info(`[Polly] Engine '${engine}' does not support speech marks. Using linear timing estimation.`);
    }

    // Step 2: Get actual audio - MP3 output
    logger.info(`[Polly] Requesting audio synthesis...`);
    const audioCommand = new SynthesizeSpeechCommand({
      OutputFormat: 'mp3',
      Text: ssml,
      TextType: 'ssml',
      VoiceId: voiceName,
      LanguageCode: languageCode,
      Engine: engine
    });

    const audioResponse = await polly.send(audioCommand);

    if (!audioResponse.AudioStream) {
      throw new Error('Polly did not return audio stream');
    }

    const audioContent = Buffer.from(await audioResponse.AudioStream.transformToByteArray());
    logger.info(`[Polly] Audio synthesis completed - Size: ${audioContent.length} bytes`);

    // Step 3: Process speech marks into word timings
    const { cleanWords, originalWords } = cleanTextForTiming(text);
    const wordTimings = [];

    if (speechMarks.length > 0) {
      // Speech marks provide time in milliseconds, convert to seconds
      speechMarks.forEach((mark, index) => {
        if (mark.type === 'word') {
          const timeSeconds = mark.time / 1000; // Convert ms to seconds

          // Calculate end time (use next word's start or estimate)
          let endTimeSeconds;
          if (index < speechMarks.length - 1) {
            endTimeSeconds = speechMarks[index + 1].time / 1000;
          } else {
            // Last word: estimate duration
            const avgWordDuration = 0.5 / speakingRate;
            endTimeSeconds = timeSeconds + avgWordDuration;
          }

          // Ensure minimum word duration
          const minDuration = 0.1 / speakingRate;
          if (endTimeSeconds - timeSeconds < minDuration) {
            endTimeSeconds = timeSeconds + minDuration;
          }

          wordTimings.push({
            word: mark.value,
            timeSeconds: timeSeconds,
            endTimeSeconds: endTimeSeconds,
            hasDirectTiming: true
          });

          // Log first few words
          if (index < 5) {
            logger.info(`🎯 Word ${index}: "${mark.value}" | ${timeSeconds.toFixed(3)}s - ${endTimeSeconds.toFixed(3)}s`);
          }
        }
      });
    } else {
      // FALLBACK: Linear Timing Estimation
      // Used when speech marks are unsupported (Generative/Long-form) or failed
      const estimatedTotalDuration = cleanWords.length * (0.6 / speakingRate); // Roughly 0.6s per word for generative (often slower/more expressive)
      // Improve estimation using audio length if possible? 
      // Audio length in bytes roughly maps to duration for MP3 but depends on bitrate.
      // Polly MP3 usually variable bit rate? Let's stick to word count for simplicity similar to Google fallback.

      logger.info(`[Polly] Falling back to linear timing for ${cleanWords.length} words.`);

      cleanWords.forEach((word, index) => {
        const startTime = (index / cleanWords.length) * estimatedTotalDuration;
        const endTime = ((index + 1) / cleanWords.length) * estimatedTotalDuration;

        wordTimings.push({
          word: word,
          timeSeconds: startTime,
          endTimeSeconds: endTime,
          hasDirectTiming: false
        });
      });
    }

    // Calculate total duration
    const totalDuration = wordTimings.length > 0
      ? Math.max(...wordTimings.map(w => w.endTimeSeconds))
      : (cleanWords.length * (0.5 / speakingRate));

    // Timing quality analysis
    const timingQuality = {
      totalWords: cleanWords.length,
      markedWords: wordTimings.filter(w => w.hasDirectTiming).length,
      markAccuracy: (wordTimings.filter(w => w.hasDirectTiming).length / cleanWords.length) * 100,
      avgWordDuration: wordTimings.reduce((sum, w) => sum + (w.endTimeSeconds - w.timeSeconds), 0) / wordTimings.length
    };

    logger.info(`🎯 Amazon Polly synthesis completed:
      - Duration: ${totalDuration.toFixed(3)}s
      - Clean words: ${cleanWords.length}
      - Marked words: ${timingQuality.markedWords}/${timingQuality.totalWords} (${timingQuality.markAccuracy.toFixed(1)}%)
      - Audio size: ${audioContent.length} bytes
      - Average word duration: ${(timingQuality.avgWordDuration * 1000).toFixed(0)}ms`);

    return {
      audioContent: audioContent,
      wordTimings: wordTimings,
      cleanWords: cleanWords,
      originalWords: originalWords,
      totalDuration: totalDuration,
      speakingRate: speakingRate,
      voiceName: voiceName,
      timingMethod: speechMarks.length > 0 ? 'Amazon Polly Speech Marks' : 'Fallback Linear Estimation',
      speechMarks: speechMarks,
      timingQuality: timingQuality,
      success: true
    };

  } catch (error) {
    logger.error(`Amazon Polly synthesis failed: ${error.message}`);
    throw error;
  }
}

/**
 * Escape XML special characters for SSML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeSSML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * List all available Amazon Polly voices
 * @param {string} languageCode - Language code filter (e.g., 'en-US')
 * @returns {Promise<Array>} Array of voice objects
 */
async function listPollyVoices(languageCode = 'en-US') {
  if (!polly) {
    throw new Error('Amazon Polly client not initialized');
  }

  try {
    logger.info(`Fetching Amazon Polly voices for language: ${languageCode}`);

    // Fetch all voices (both standard and neural)
    const command = new DescribeVoicesCommand({
      LanguageCode: languageCode
      // No Engine parameter - get all engines
    });

    const response = await polly.send(command);
    const voices = (response.Voices || []).map(voice => {
      // Determine primary engine based on supported engines
      // Prefer neural if available, otherwise use standard
      const supportedEngines = voice.SupportedEngines || [];
      let primaryEngine = 'standard';

      if (supportedEngines.includes('generative')) {
        primaryEngine = 'generative';
      } else if (supportedEngines.includes('long-form')) {
        primaryEngine = 'generative'; // Map long-form to generative category for UI simplicity or use distinct category
      } else if (supportedEngines.includes('neural')) {
        primaryEngine = 'neural';
      }

      return {
        name: voice.Id,
        displayName: voice.Name,
        languageCode: voice.LanguageCode,
        languageName: voice.LanguageName,
        gender: voice.Gender,
        engine: primaryEngine, // Set based on supported engines priority
        supportedEngines: supportedEngines,
        additionalLanguageCodes: voice.AdditionalLanguageCodes || []
      };
    });

    // Sort by Gender then Name for better UX
    voices.sort((a, b) => {
      if (a.gender === b.gender) return a.name.localeCompare(b.name);
      return a.gender.localeCompare(b.gender);
    });

    logger.info(`Retrieved ${voices.length} Amazon Polly voices for ${languageCode}`);
    return voices;

  } catch (error) {
    logger.error(`Failed to list Amazon Polly voices: ${error.message}`);
    throw error;
  }
}

/**
 * Check if Amazon Polly is available
 * @returns {boolean} True if Polly is initialized
 */
function isPollyAvailable() {
  return polly !== null;
}

module.exports = {
  synthesizeWithPolly,
  listPollyVoices,
  isPollyAvailable,
  POLLY_NEURAL_VOICES
};