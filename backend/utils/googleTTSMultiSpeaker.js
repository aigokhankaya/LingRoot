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
    
    const accessToken = await auth.getAccessToken();
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

    logger.info('[GOOGLE-PODCAST] Sending request to Gemini-TTS REST API...');
    logger.info(`[GOOGLE-PODCAST] Request config: Host=${speakerAId}, Guest=${speakerBId}`);
    
    // Retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.post(
          `https://texttospeech.googleapis.com/v1/text:synthesize`,
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
        logger.warn(`[GOOGLE-PODCAST] Attempt ${attempt}/3 failed: ${errMsg}`);
        
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
  const { synthesizeWithGoogle } = require('./googleTTS');
  const { mergeAudioSegmentsToBuffer } = require('./audioMerger');
  
  logger.info('[GOOGLE-PODCAST] Using fallback separate synthesis method');
  
  const audioBuffers = [];
  const fullTranscript = [];
  
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
      logger.warn(`[GOOGLE-PODCAST] Failed to synthesize turn: ${err.message}`);
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

    // Step 2: Synthesize audio with Gemini-TTS
    const stylePrompt = STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat'];
    
    const audioResult = await synthesizeMultiSpeakerPodcast({
      turns: scriptResult.turns,
      speakerAId: scriptResult.speakerAId,
      speakerBId: scriptResult.speakerBId,
      stylePrompt: stylePrompt,
      model: 'gemini-2.5-flash-tts',
    });

    // Step 3: Upload audio to storage
    const fileName = `podcast_${uuidv4()}.mp3`;
    const audioUrl = await uploadPodcastAudio(audioResult.audioContent, fileName);

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
          input: topic,
          translated_text: audioResult.transcript,
          adapted_text: audioResult.transcript,
          input_type: 'podcast',
          created_at: new Date().toISOString(),
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
