/**
 * Google TTS Multi-Speaker Podcast Generator
 * Uses Gemini-TTS models (gemini-2.5-flash-tts, gemini-2.5-pro-tts) for multi-speaker synthesis
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('./supabaseClient');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Google TTS Client
let ttsClient;

try {
  ttsClient = new textToSpeech.TextToSpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  logger.info('Google TTS Multi-Speaker client initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Google TTS Multi-Speaker client:', error.message);
  ttsClient = null;
}

const createWordLevelVTTFromTimings = (wordTimings) => {
  let vttContent = 'WEBVTT\n\n';

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
  };

  (wordTimings || []).forEach((timing) => {
    const startTime = timing.startTime ?? timing.timeSeconds ?? 0;
    const endTime = timing.endTime ?? timing.endTimeSeconds ?? (startTime + 0.5);
    const word = timing.word || '';
    vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${word}\n\n`;
  });

  return vttContent;
};

async function uploadPodcastVtt(vttContent, fileName) {
  const { uploadToSupabase } = require('./storageUploader');
  const vttBuffer = Buffer.from(vttContent || '', 'utf-8');
  const publicUrl = await uploadToSupabase(vttBuffer, `podcast_${fileName}`, 'text/vtt');
  return publicUrl;
}

// Available Gemini TTS Speaker IDs
const GEMINI_SPEAKERS = {
  // Female voices
  'Aoede': { gender: 'female', style: 'warm, friendly' },
  'Kore': { gender: 'female', style: 'clear, professional' },
  'Leda': { gender: 'female', style: 'soft, calm' },
  'Zephyr': { gender: 'female', style: 'energetic, youthful' },
  'Callirrhoe': { gender: 'female', style: 'expressive, dynamic' },
  // Male voices
  'Charon': { gender: 'male', style: 'deep, authoritative' },
  'Fenrir': { gender: 'male', style: 'warm, conversational' },
  'Orus': { gender: 'male', style: 'clear, neutral' },
  'Puck': { gender: 'male', style: 'friendly, casual' },
  'Achilles': { gender: 'male', style: 'strong, confident' },
};

// Podcast style to prompt mapping - enhanced for natural speech
const STYLE_PROMPTS = {
  'friendly_chat': 'Speak naturally like real friends having a genuine conversation. Use varied intonation, occasional pauses, and express emotions through your voice. Sound warm, relaxed, and genuinely interested. Avoid sounding like you are reading from a script.',
  'professional': 'Speak clearly and professionally but still conversationally. Use natural pacing with thoughtful pauses. Sound confident and knowledgeable while remaining approachable and engaging.',
  'educational': 'Speak with enthusiasm when explaining concepts. The teacher should sound patient and encouraging, while the learner should express genuine curiosity with varied reactions. Use natural speech patterns.',
  'casual': 'Speak very naturally and relaxed, like chatting with a close friend. Use casual intonation, laugh occasionally, and show genuine reactions. Avoid any formal or robotic tone.',
};

// Personality to speaker mapping - alternating genders for clear distinction
const PERSONALITY_SPEAKERS = {
  'curious_enthusiast': { speakerId: 'Kore', gender: 'female', style: 'curious and enthusiastic' },
  'skeptical_analyst': { speakerId: 'Charon', gender: 'male', style: 'thoughtful and analytical' },
  'friendly_guide': { speakerId: 'Aoede', gender: 'female', style: 'warm and guiding' },
  'professional_expert': { speakerId: 'Fenrir', gender: 'male', style: 'professional and knowledgeable' },
  'knowledgeable_friend': { speakerId: 'Puck', gender: 'male', style: 'friendly and informative' },
  'experienced_mentor': { speakerId: 'Orus', gender: 'male', style: 'wise and mentoring' },
  'curious_learner': { speakerId: 'Leda', gender: 'female', style: 'curious and learning' },
  'witty_commentator': { speakerId: 'Zephyr', gender: 'male', style: 'witty and entertaining' },
};

// Default speaker pairs for clear voice distinction (female + male)
const DEFAULT_SPEAKER_A = 'Kore';   // Female - Host
const DEFAULT_SPEAKER_B = 'Charon'; // Male - Guest

/**
 * Generate podcast script using OpenAI
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated script with turns
 */
async function generatePodcastScript(options) {
  const {
    topic,
    level = 'B1',
    duration = 5,
    styleType = 'friendly_chat',
    personalityA = 'curious_enthusiast',
    personalityB = 'knowledgeable_friend',
    includeHumor = true,
    includeFiller = true,
  } = options;

  // Calculate approximate word count based on duration (150 words per minute average)
  const targetWordCount = Math.round(duration * 150);

  let speakerAInfo = PERSONALITY_SPEAKERS[personalityA] || PERSONALITY_SPEAKERS['curious_enthusiast'];
  let speakerBInfo = PERSONALITY_SPEAKERS[personalityB] || PERSONALITY_SPEAKERS['knowledgeable_friend'];

  // Ensure speakers have different genders for clear voice distinction
  if (speakerAInfo.gender === speakerBInfo.gender) {
    logger.info(`[GOOGLE-PODCAST] Both speakers are ${speakerAInfo.gender}, swapping Speaker B for voice distinction`);
    // If both are same gender, swap speaker B to opposite gender
    if (speakerAInfo.gender === 'female') {
      speakerBInfo = PERSONALITY_SPEAKERS['skeptical_analyst']; // Male: Charon
    } else {
      speakerBInfo = PERSONALITY_SPEAKERS['curious_enthusiast']; // Female: Kore
    }
  }
  
  logger.info(`[GOOGLE-PODCAST] Using voices - A: ${speakerAInfo.speakerId} (${speakerAInfo.gender}), B: ${speakerBInfo.speakerId} (${speakerBInfo.gender})`);

  const prompt = `Generate a VERY NATURAL podcast conversation script about "${topic}" for English learners at ${level} CEFR level.

CRITICAL - MAKE IT SOUND HUMAN:
- Include natural reactions like "Oh wow!", "Hmm, interesting!", "Right, right", "Exactly!", "Oh I see!"
- Add thinking pauses like "Well...", "So...", "You know...", "I mean..."
- Include slight interruptions and agreements like "Yeah!", "Mhm!", "Oh really?"
- Vary sentence lengths - some short reactions, some longer explanations
- Add emotional expressions like laughing "(laughs)", surprised reactions, enthusiasm

REQUIREMENTS:
- Total word count: approximately ${targetWordCount} words (for ${duration} minutes of audio)
- Style: ${STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat']}
- Speaker A (Host): ${speakerAInfo.style}
- Speaker B (Guest/Co-host): ${speakerBInfo.style}
${includeHumor ? '- Include humor, jokes, and playful banter' : '- Keep it informative but friendly'}
${includeFiller ? '- Include natural filler words (um, uh, well, you know, like) throughout' : '- Minimal filler words'}
- Use vocabulary appropriate for ${level} level English learners
- Make speakers interrupt each other occasionally for realism
- Include back-and-forth quick exchanges, not just long monologues

OUTPUT FORMAT (JSON):
{
  "title": "Episode title",
  "turns": [
    { "speaker": "A", "text": "Speaker A's dialogue" },
    { "speaker": "B", "text": "Speaker B's dialogue" },
    ...
  ]
}

Generate dialogue that sounds like a REAL conversation between friends, NOT a scripted interview.`;

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing realistic, natural-sounding podcast conversations. Your dialogues should sound like two real people talking - with natural reactions, interruptions, laughter, and genuine emotion. Never write stiff or robotic dialogue. Always output valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9, // Higher for more natural variation
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const scriptData = JSON.parse(response.choices[0].message.content);
    
    logger.info(`[GOOGLE-PODCAST] Generated script with ${scriptData.turns?.length || 0} turns`);
    
    return {
      title: scriptData.title || topic,
      turns: scriptData.turns || [],
      speakerAId: speakerAInfo.speakerId,
      speakerBId: speakerBInfo.speakerId,
      usage: response.usage,
    };
  } catch (error) {
    logger.error('[GOOGLE-PODCAST] Script generation failed:', error.message);
    throw new Error(`Failed to generate podcast script: ${error.message}`);
  }
}

/**
 * Synthesize multi-speaker podcast using Gemini-TTS
 * @param {Object} options - Synthesis options
 * @returns {Promise<Object>} Audio content and metadata
 */
async function synthesizeMultiSpeakerPodcast(options) {
  if (!ttsClient) {
    throw new Error('Google TTS client not initialized');
  }

  const {
    turns,
    speakerAId = 'Kore',
    speakerBId = 'Charon',
    stylePrompt = 'Have a natural, engaging conversation.',
    model = 'gemini-2.5-flash-tts',
  } = options;

  logger.info(`[GOOGLE-PODCAST] Synthesizing ${turns.length} turns with ${model}`);
  logger.info(`[GOOGLE-PODCAST] Speaker A: ${speakerAId}, Speaker B: ${speakerBId}`);

  // Build the text with speaker labels for simple multi-speaker format
  const dialogueText = turns.map(turn => {
    const speakerName = turn.speaker === 'A' ? 'Host' : 'Guest';
    return `${speakerName}: ${turn.text}`;
  }).join('\n');

  // Build the full transcript (without labels) for display
  const fullTranscript = turns.map(turn => turn.text).join(' ');

  try {
    // Use REST API directly for better multi-speaker support
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const tokenResult = await auth.getAccessToken();
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    const requestBody = {
      input: {
        text: dialogueText,
        prompt: stylePrompt,
      },
      voice: {
        languageCode: 'en-US',
        modelName: model,
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speakerAlias: 'Host',
              speakerId: speakerAId,
            },
            {
              speakerAlias: 'Guest',
              speakerId: speakerBId,
            },
          ],
        },
      },
      audioConfig: {
        audioEncoding: 'MP3',
        sampleRateHertz: 24000,
      },
    };

    logger.info('[GOOGLE-PODCAST] Sending request to Gemini-TTS REST API (v1beta1)...');
    logger.info(`[GOOGLE-PODCAST] Request config: Host=${speakerAId}, Guest=${speakerBId}, Model=${model}`);
    logger.debug(`[GOOGLE-PODCAST] Request body: ${JSON.stringify(requestBody, null, 2)}`);
    
    // Retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Use v1beta1 endpoint for Gemini TTS multi-speaker support
        const response = await axios.post(
          `https://texttospeech.googleapis.com/v1beta1/text:synthesize`,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'x-goog-user-project': projectId,
              'Content-Type': 'application/json',
            },
            timeout: 120000, // 2 minutes timeout
          }
        );

        if (!response.data || !response.data.audioContent) {
          throw new Error('No audio content received from Gemini-TTS');
        }

        // REST API returns base64 encoded audio
        const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
        logger.info(`[GOOGLE-PODCAST] Received audio: ${audioBuffer.length} bytes`);

        return {
          audioContent: audioBuffer,
          transcript: fullTranscript,
          dialogueText: dialogueText,
          turns: turns,
        };
      } catch (retryError) {
        lastError = retryError;
        const errMsg = retryError.response?.data?.error?.message || retryError.message;
        const errCode = retryError.response?.data?.error?.code || retryError.code || 'UNKNOWN';
        const errStatus = retryError.response?.status || 'N/A';
        logger.warn(`[GOOGLE-PODCAST] Attempt ${attempt}/3 failed: [${errCode}] ${errMsg} (HTTP ${errStatus})`);
        if (retryError.response?.data) {
          logger.debug(`[GOOGLE-PODCAST] Error response: ${JSON.stringify(retryError.response.data)}`);
        }
        
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          logger.info(`[GOOGLE-PODCAST] Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed, throw the last error
    throw lastError;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    logger.error('[GOOGLE-PODCAST] Synthesis failed after retries:', errMsg);
    
    // Try fallback for any error (INTERNAL, multiSpeaker, rate limit, etc.)
    logger.info('[GOOGLE-PODCAST] Trying fallback synthesis with separate speakers...');
    try {
      return await synthesizeFallbackPodcast(turns, speakerAId, speakerBId);
    } catch (fallbackError) {
      logger.error('[GOOGLE-PODCAST] Fallback also failed:', fallbackError.message);
      throw error; // Throw original error
    }
  }
}

/**
 * Fallback: Synthesize each speaker separately and merge
 * @param {Array} turns - Dialogue turns
 * @param {string} speakerAId - Speaker A voice ID
 * @param {string} speakerBId - Speaker B voice ID
 * @returns {Promise<Object>} Audio content and metadata
 */
async function synthesizeFallbackPodcast(turns, speakerAId, speakerBId) {
  const { mergeAudioSegmentsToBuffer } = require('./audioMerger');

  logger.info('[GOOGLE-PODCAST] Using fallback separate synthesis method');
  logger.info(`[GOOGLE-PODCAST] Fallback requested speaker IDs (Gemini) - Host: ${speakerAId}, Guest: ${speakerBId}`);

  const audioBuffers = [];
  const fullTranscript = [];

  // Prefer a per-turn Gemini-TTS call so the selected speaker IDs still apply.
  // If this fails, we will fall back to classic Google TTS (Neural2) as a last resort.
  try {
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const tokenResult = await auth.getAccessToken();
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    logger.info(`[GOOGLE-PODCAST] Starting Gemini per-turn synthesis for ${turns.length} turns...`);
    
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const speakerAlias = turn.speaker === 'A' ? 'Host' : 'Guest';
      const turnText = `${speakerAlias}: ${turn.text}`;

      const requestBody = {
        input: {
          text: turnText,
        },
        voice: {
          languageCode: 'en-US',
          modelName: 'gemini-2.5-flash-tts',
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speakerAlias: 'Host',
                speakerId: speakerAId,
              },
              {
                speakerAlias: 'Guest',
                speakerId: speakerBId,
              },
            ],
          },
        },
        audioConfig: {
          audioEncoding: 'MP3',
          sampleRateHertz: 24000,
        },
      };

      // Use v1beta1 endpoint for Gemini TTS multi-speaker support
      const response = await axios.post(
        `https://texttospeech.googleapis.com/v1beta1/text:synthesize`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-user-project': projectId,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        }
      );

      if (!response.data || !response.data.audioContent) {
        throw new Error('No audio content received from Gemini-TTS (fallback per-turn)');
      }

      const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
      audioBuffers.push(audioBuffer);
      fullTranscript.push(turn.text);
      
      if ((i + 1) % 10 === 0) {
        logger.info(`[GOOGLE-PODCAST] Gemini per-turn progress: ${i + 1}/${turns.length} turns synthesized`);
      }
    }

    const mergedAudio = await mergeAudioSegmentsToBuffer(audioBuffers);
    return {
      audioContent: mergedAudio,
      transcript: fullTranscript.join(' '),
      dialogueText: turns.map(t => `${t.speaker === 'A' ? 'Host' : 'Guest'}: ${t.text}`).join('\n'),
      turns: turns,
      fallbackUsed: true,
      fallbackMode: 'gemini-per-turn',
    };
  } catch (geminiPerTurnErr) {
    const errMsg = geminiPerTurnErr.response?.data?.error?.message || geminiPerTurnErr.message;
    const errCode = geminiPerTurnErr.response?.data?.error?.code || geminiPerTurnErr.code || 'UNKNOWN';
    const errStatus = geminiPerTurnErr.response?.status || 'N/A';
    logger.warn(`[GOOGLE-PODCAST] Gemini per-turn fallback failed: [${errCode}] ${errMsg} (HTTP ${errStatus})`);
    logger.warn('[GOOGLE-PODCAST] Switching to Neural2 fallback as last resort...');
    if (geminiPerTurnErr.response?.data) {
      logger.debug(`[GOOGLE-PODCAST] Gemini per-turn error response: ${JSON.stringify(geminiPerTurnErr.response.data)}`);
    }
  }

  const { synthesizeWithGoogle } = require('./googleTTS');

  for (const turn of turns) {
    const voiceName = turn.speaker === 'A'
      ? `en-US-Neural2-C` // Female voice for Host
      : `en-US-Neural2-D`; // Male voice for Guest

    try {
      const result = await synthesizeWithGoogle({
        text: turn.text,
        voiceName: voiceName,
        languageCode: 'en-US',
        speakingRate: 1.0,
      });

      audioBuffers.push(Buffer.from(result.audioContent));
      fullTranscript.push(turn.text);
    } catch (err) {
      logger.warn(`[GOOGLE-PODCAST] Failed to synthesize turn (Neural2 fallback): ${err.message}`);
    }
  }

  // Merge all audio buffers
  const mergedAudio = await mergeAudioSegmentsToBuffer(audioBuffers);

  return {
    audioContent: mergedAudio,
    transcript: fullTranscript.join(' '),
    dialogueText: turns.map(t => `${t.speaker === 'A' ? 'Host' : 'Guest'}: ${t.text}`).join('\n'),
    turns: turns,
    fallbackUsed: true,
    fallbackMode: 'neural2-per-turn',
  };
}

/**
 * Upload audio to storage using existing storageUploader
 * @param {Buffer} audioContent - Audio buffer
 * @param {string} fileName - File name
 * @returns {Promise<string>} Public URL
 */
async function uploadPodcastAudio(audioContent, fileName) {
  const { uploadToSupabase } = require('./storageUploader');
  
  try {
    // Ensure audioContent is a Buffer (Google TTS may return Uint8Array or base64)
    let audioBuffer;
    if (Buffer.isBuffer(audioContent)) {
      audioBuffer = audioContent;
    } else if (audioContent instanceof Uint8Array) {
      audioBuffer = Buffer.from(audioContent);
    } else if (typeof audioContent === 'string') {
      // Assume base64 encoded
      audioBuffer = Buffer.from(audioContent, 'base64');
    } else {
      throw new Error('Invalid audio content type');
    }
    
    logger.info(`[GOOGLE-PODCAST] Uploading audio: ${audioBuffer.length} bytes`);
    
    const publicUrl = await uploadToSupabase(audioBuffer, `podcast_${fileName}`, 'audio/mpeg');
    
    if (!publicUrl) {
      throw new Error('Upload returned null URL');
    }
    
    logger.info(`[GOOGLE-PODCAST] Audio uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    logger.error('[GOOGLE-PODCAST] Audio upload failed:', error.message);
    throw error;
  }
}

/**
 * Main function to create a Google TTS multi-speaker podcast
 * @param {Object} options - Podcast options
 * @returns {Promise<Object>} Podcast result
 */
async function createGoogleTTSPodcast(options) {
  const {
    topic,
    level = 'B1',
    duration = 5,
    styleType = 'friendly_chat',
    personalityA = 'curious_enthusiast',
    personalityB = 'knowledgeable_friend',
    hostSpeakerId,
    guestSpeakerId,
    includeHumor = true,
    includeFiller = true,
    userId = null,
  } = options;

  logger.info(`[GOOGLE-PODCAST] Creating podcast - Topic: "${topic}", Level: ${level}, Duration: ${duration}min`);

  try {
    // Step 1: Generate podcast script
    const scriptResult = await generatePodcastScript({
      topic,
      level,
      duration,
      styleType,
      personalityA,
      personalityB,
      includeHumor,
      includeFiller,
    });

    if (!scriptResult.turns || scriptResult.turns.length === 0) {
      throw new Error('Failed to generate podcast script');
    }

    logger.info(`[GOOGLE-PODCAST] Script generated: ${scriptResult.turns.length} turns`);

    // Determine final speaker IDs (UI override > script-derived personalities > defaults)
    const isValidGeminiSpeaker = (id) => typeof id === 'string' && !!GEMINI_SPEAKERS[id];
    let finalHostSpeakerId = isValidGeminiSpeaker(hostSpeakerId)
      ? hostSpeakerId
      : (isValidGeminiSpeaker(scriptResult.speakerAId) ? scriptResult.speakerAId : DEFAULT_SPEAKER_A);

    let finalGuestSpeakerId = isValidGeminiSpeaker(guestSpeakerId)
      ? guestSpeakerId
      : (isValidGeminiSpeaker(scriptResult.speakerBId) ? scriptResult.speakerBId : DEFAULT_SPEAKER_B);

    // Avoid same voice for both speakers
    if (finalHostSpeakerId === finalGuestSpeakerId) {
      logger.warn(`[GOOGLE-PODCAST] Host and Guest speakerId are the same (${finalHostSpeakerId}). Applying fallback guest voice.`);
      const hostGender = GEMINI_SPEAKERS[finalHostSpeakerId]?.gender;
      const fallbackGuest = hostGender === 'female' ? DEFAULT_SPEAKER_B : DEFAULT_SPEAKER_A;
      finalGuestSpeakerId = fallbackGuest === finalHostSpeakerId
        ? (finalHostSpeakerId === 'Kore' ? 'Charon' : 'Kore')
        : fallbackGuest;
    }

    logger.info(`[GOOGLE-PODCAST] Final voices - Host: ${finalHostSpeakerId}, Guest: ${finalGuestSpeakerId}`);

    // Step 2: Synthesize audio with Gemini-TTS
    const stylePrompt = STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat'];
    
    const audioResult = await synthesizeMultiSpeakerPodcast({
      turns: scriptResult.turns,
      speakerAId: finalHostSpeakerId,
      speakerBId: finalGuestSpeakerId,
      stylePrompt: stylePrompt,
      model: 'gemini-2.5-flash-tts',
    });

    // Step 3: Upload audio to storage
    const fileName = `podcast_${uuidv4()}.mp3`;
    const audioUrl = await uploadPodcastAudio(audioResult.audioContent, fileName);

    let wordsForTiming = null;
    let timepoints = null;
    let vttUrl = null;
    const useMFAAlignment = process.env.USE_MFA_ALIGNMENT === 'true';

    if (useMFAAlignment && audioUrl && (audioResult.dialogueText || audioResult.transcript)) {
      const { mfaAligner } = require('./mfaAligner');
      const { execSync } = require('child_process');
      try {
        // Save as MP3 first, then convert to WAV for MFA (same as text mode)
        const tempMp3Path = path.join(os.tmpdir(), `podcast_mfa_${Date.now()}.mp3`);
        const tempWavPath = tempMp3Path.replace('.mp3', '.wav');

        await fs.promises.writeFile(tempMp3Path, audioResult.audioContent);
        
        // Convert MP3 to WAV (16kHz mono) - MFA works better with WAV
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        try {
          execSync(`"${ffmpegPath}" -y -i "${tempMp3Path}" -ar 16000 -ac 1 -acodec pcm_s16le "${tempWavPath}"`, {
            stdio: 'pipe',
            timeout: 30000
          });
          logger.info(`[GOOGLE-PODCAST] Converted MP3 to WAV for MFA: ${tempWavPath}`);
        } catch (ffmpegErr) {
          logger.warn(`[GOOGLE-PODCAST] FFmpeg conversion failed, using MP3: ${ffmpegErr.message}`);
        }
        
        // Use WAV if conversion succeeded, otherwise use MP3
        const tempAudioPath = require('fs').existsSync(tempWavPath) ? tempWavPath : tempMp3Path;
        const locale = 'en_US';

        // Choose correct transcript for MFA based on synthesis mode:
        // - Main Gemini multi-speaker: labels are NOT spoken, use transcript (no labels)
        // - Fallback modes (gemini-per-turn, neural2-per-turn): labels ARE spoken, use dialogueText
        let mfaTranscript;
        if (audioResult.fallbackUsed) {
          // Fallback modes speak the labels
          mfaTranscript = audioResult.dialogueText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          logger.info(`[GOOGLE-PODCAST] Using dialogueText for MFA (fallback mode: ${audioResult.fallbackMode})`);
        } else {
          // Main Gemini multi-speaker doesn't speak labels
          mfaTranscript = audioResult.transcript;
          logger.info(`[GOOGLE-PODCAST] Using transcript for MFA (main Gemini multi-speaker mode)`);
        }
        logger.info(`[GOOGLE-PODCAST] MFA transcript (first 200 chars): ${mfaTranscript.substring(0, 200)}`);

        // Debug: Log audio file info before MFA
        const audioStats = await fs.promises.stat(tempAudioPath);
        logger.info(`[GOOGLE-PODCAST] MFA input - Audio size: ${audioStats.size} bytes, Transcript length: ${mfaTranscript.length} chars, Words: ${mfaTranscript.split(/\s+/).length}`);

        const mfaWordTimings = await mfaAligner.generateWordTimestamps(
          tempAudioPath,
          mfaTranscript,
          locale
        );

        // Cleanup temp files (both MP3 and WAV)
        await fs.promises.unlink(tempMp3Path).catch(() => {});
        await fs.promises.unlink(tempWavPath).catch(() => {});

        if (Array.isArray(mfaWordTimings) && mfaWordTimings.length > 0) {
          wordsForTiming = mfaWordTimings.map(t => t.word);
          timepoints = mfaWordTimings.map((timing, index) => ({
            word: timing.word,
            timeSeconds: timing.startTime,
            endTimeSeconds: timing.endTime,
            index,
            hasRealTiming: true,
            source: 'mfa',
          }));

          const vttContent = createWordLevelVTTFromTimings(mfaWordTimings);
          const vttFileName = `${fileName.replace(/\.mp3$/i, '')}.vtt`;
          vttUrl = await uploadPodcastVtt(vttContent, vttFileName);
        }
      } catch (mfaErr) {
        logger.warn('[GOOGLE-PODCAST] MFA alignment failed, continuing without timepoints/vtt:', mfaErr.message);
      }
    }

    // Step 4: Estimate duration (roughly 150 words per minute)
    const wordCount = audioResult.transcript.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    // Step 5: Save to contenthistory if user is authenticated
    let contentHistoryId = null;
    if (userId && supabase) {
      try {
        const insertData = {
          user_id: userId,
          level: level,
          mp3_url: audioUrl,
          vtt_url: vttUrl,
          input: topic,
          translated_text: audioResult.transcript,
          adapted_text: audioResult.transcript,
          input_type: 'podcast',
          created_at: new Date().toISOString(),
          words: Array.isArray(wordsForTiming) && wordsForTiming.length > 0 ? JSON.stringify(wordsForTiming) : null,
          timepoints: Array.isArray(timepoints) && timepoints.length > 0 ? JSON.stringify(timepoints) : null,
          tts_provider: 'google-gemini',
          tts_voice_name: 'gemini-2.5-flash-tts',
          audio_duration_seconds: estimatedDuration,
          entry_source: 'google-podcast',
        };

        const { data, error } = await supabase
          .from('contenthistory')
          .insert(insertData)
          .select();

        if (!error && data && data.length > 0) {
          contentHistoryId = data[0].id;
          logger.info(`[GOOGLE-PODCAST] Saved to contenthistory: ${contentHistoryId}`);
        }
      } catch (dbErr) {
        logger.warn('[GOOGLE-PODCAST] Failed to save to contenthistory:', dbErr.message);
      }
    }

    return {
      success: true,
      status: 'success',
      message: `Podcast created: ${scriptResult.title}`,
      podcast_url: audioUrl,
      audio_url: audioUrl,
      mp3_url: audioUrl,
      vtt_url: vttUrl,
      vtt_subtitles: vttUrl,
      transcript: audioResult.transcript,
      dialogue: audioResult.dialogueText,
      turns: audioResult.turns,
      title: scriptResult.title,
      topic: topic,
      level: level,
      duration_seconds: estimatedDuration,
      file_name: fileName,
      contenthistory_id: contentHistoryId,
      tts_provider: 'google-gemini',
      fallback_used: audioResult.fallbackUsed || false,
      fallback_mode: audioResult.fallbackMode || null,
      words: wordsForTiming || null,
      timepoints: timepoints || null,
      costs: {
        openai_tokens: scriptResult.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    logger.error('[GOOGLE-PODCAST] Podcast creation failed:', error.message);
    throw error;
  }
}

module.exports = {
  createGoogleTTSPodcast,
  generatePodcastScript,
  synthesizeMultiSpeakerPodcast,
  uploadPodcastAudio,
  GEMINI_SPEAKERS,
  STYLE_PROMPTS,
  PERSONALITY_SPEAKERS,
};
