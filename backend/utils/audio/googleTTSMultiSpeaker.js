/**
 * Google TTS Multi-Speaker Podcast Generator
 * Uses Gemini-TTS models (gemini-2.5-flash-tts, gemini-2.5-pro-tts) for multi-speaker synthesis
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const logger = require('../common/logger.js');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../storage/supabaseClient.js');
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

/**
 * Write detailed debug log to file
 */
async function writeDebugLog(message, data = {}) {
  try {
    const logsDir = path.join(__dirname, '../logs');
    const logFile = path.join(logsDir, 'podcast_openai_debug.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n${'='.repeat(80)}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (e) {
    logger.error('[DEBUG LOG] Failed to write debug log:', e.message);
  }
}

/**
 * Retry wrapper with exponential backoff for rate limit (429) errors
 */
async function withRetry(fn, maxRetries = 3, baseDelayMs = 5000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        await writeDebugLog('OpenAI request succeeded after retry', { attempt: attempt + 1 });
      }
      return result;
    } catch (error) {
      lastError = error;
      const isRateLimit = error.status === 429 || error.message?.includes('429');

      // Log detailed error info to file
      await writeDebugLog('OpenAI API Error', {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        isRateLimit,
        errorStatus: error.status,
        errorCode: error.code,
        errorType: error.type,
        errorMessage: error.message,
        errorHeaders: error.headers,
        errorResponse: error.response?.data || error.error,
        rateLimitInfo: {
          'x-ratelimit-limit-requests': error.headers?.['x-ratelimit-limit-requests'],
          'x-ratelimit-limit-tokens': error.headers?.['x-ratelimit-limit-tokens'],
          'x-ratelimit-remaining-requests': error.headers?.['x-ratelimit-remaining-requests'],
          'x-ratelimit-remaining-tokens': error.headers?.['x-ratelimit-remaining-tokens'],
          'x-ratelimit-reset-requests': error.headers?.['x-ratelimit-reset-requests'],
          'x-ratelimit-reset-tokens': error.headers?.['x-ratelimit-reset-tokens'],
          'retry-after': error.headers?.['retry-after'],
        },
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      });

      if (!isRateLimit || attempt === maxRetries) {
        await writeDebugLog('OpenAI request failed - not retrying', {
          reason: !isRateLimit ? 'not a rate limit error' : 'max retries reached',
          willThrow: true
        });
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt); // 5s, 10s, 20s
      logger.warn(`[OpenAI] Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${delay / 1000}s before retry...`);
      await writeDebugLog('OpenAI rate limit - waiting before retry', {
        delayMs: delay,
        nextAttempt: attempt + 2
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Validate and correct speaker assignments in podcast script
 * Fixes common LLM errors like short reactions assigned to wrong speaker
 * @param {Array} turns - Array of {speaker, text} objects
 * @returns {Object} - {turns: correctedTurns, corrections: correctionDetails}
 */
function validateAndCorrectSpeakerAssignments(turns) {
  if (!turns || turns.length === 0) {
    return { turns: [], corrections: [] };
  }

  const corrections = [];
  const correctedTurns = JSON.parse(JSON.stringify(turns)); // Deep copy

  // Pattern definitions for speaker assignment rules
  const HOST_PATTERNS = [
    /^(so|well|now|let'?s|shall we|can you|could you|what|why|how|when|where|who|have you|do you|did you|are you|is it|isn't it|don't you)/i,
    /\?$/,  // Questions typically from Host
    /^(welcome|today we|in this episode|let me introduce)/i,
  ];

  const GUEST_PATTERNS = [
    /^(yes|yeah|exactly|absolutely|definitely|certainly|of course|sure|right|correct|that's right|indeed|precisely)/i,
    /^(well,? actually|you see|the thing is|in fact|basically|essentially)/i,
    /^(it'?s|there'?s|we|they|this|that|one|the|a |an )/i, // Explanations start
  ];

  const SHORT_REACTION_PATTERNS = [
    /^(oh|ah|hmm|wow|really|yeah|yes|no|right|exactly|absolutely|interesting|fascinating|amazing|incredible|cool|great|nice|sure|okay|ok|mhm|uh-huh|I see|got it)[\s!?.]*$/i,
  ];

  for (let i = 0; i < correctedTurns.length; i++) {
    const turn = correctedTurns[i];
    const prevTurn = correctedTurns[i - 1];
    const text = (turn.text || '').trim();
    const isShortReaction = SHORT_REACTION_PATTERNS.some(p => p.test(text)) || text.length < 25;

    // Rule 1: Short reactions should alternate speakers
    if (isShortReaction && prevTurn && turn.speaker === prevTurn.speaker) {
      const suggestedSpeaker = turn.speaker === 'A' ? 'B' : 'A';
      corrections.push({
        index: i,
        original: turn.speaker,
        corrected: suggestedSpeaker,
        reason: 'short_reaction_same_speaker',
        text: text.substring(0, 50)
      });
      turn.speaker = suggestedSpeaker;
      continue;
    }

    // Rule 2: Questions (ending with ?) typically from Host (A)
    if (text.endsWith('?') && turn.speaker !== 'A' && !isShortReaction) {
      // Check if it's a clarifying question from Guest (shorter, starts with specific words)
      const isGuestQuestion = /^(you mean|so you're saying|like|wait)/i.test(text);
      if (!isGuestQuestion && text.length > 30) {
        corrections.push({
          index: i,
          original: turn.speaker,
          corrected: 'A',
          reason: 'question_from_guest',
          text: text.substring(0, 50)
        });
        turn.speaker = 'A';
        continue;
      }
    }

    // Rule 3: Long explanations (>100 chars) typically from Guest (B)
    if (text.length > 100 && turn.speaker === 'A' && !text.endsWith('?')) {
      const hasHostPatterns = HOST_PATTERNS.some(p => p.test(text));
      const hasGuestPatterns = GUEST_PATTERNS.some(p => p.test(text));

      if (hasGuestPatterns && !hasHostPatterns) {
        corrections.push({
          index: i,
          original: turn.speaker,
          corrected: 'B',
          reason: 'long_explanation_from_host',
          text: text.substring(0, 50)
        });
        turn.speaker = 'B';
        continue;
      }
    }

    // Rule 4: Consecutive same-speaker turns (except for continuation) - fix the second one
    if (prevTurn && turn.speaker === prevTurn.speaker) {
      const prevEndsWithComma = prevTurn.text.trim().endsWith(',');
      const currentStartsLower = /^[a-z]/.test(text);
      const isContinuation = prevEndsWithComma || currentStartsLower;

      if (!isContinuation && !isShortReaction) {
        const suggestedSpeaker = turn.speaker === 'A' ? 'B' : 'A';
        corrections.push({
          index: i,
          original: turn.speaker,
          corrected: suggestedSpeaker,
          reason: 'consecutive_same_speaker',
          text: text.substring(0, 50)
        });
        turn.speaker = suggestedSpeaker;
      }
    }
  }

  if (corrections.length > 0) {
    logger.info(`[SPEAKER-VALIDATION] Made ${corrections.length} speaker corrections`);
    corrections.forEach(c => {
      logger.debug(`[SPEAKER-VALIDATION] Turn ${c.index}: ${c.original} → ${c.corrected} (${c.reason}): "${c.text}..."`);
    });
  }

  return { turns: correctedTurns, corrections };
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
  const { uploadToSupabase } = require('../storage/storageUploader.js');
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

const ALLOWED_GEMINI_TTS_MODELS = new Set([
  'gemini-2.5-flash-tts',
  'gemini-2.5-pro-tts',
]);

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

  // CEFR seviyelerine göre dil kuralları
  const CEFR_LANGUAGE_RULES = {
    'A1': `VOCABULARY & GRAMMAR (A1 - Beginner):
- Use ONLY basic, everyday vocabulary (Oxford 3000 A1 subset)
- Simple present tense, basic "to be" and "have"
- Very short sentences (5-10 words maximum)
- No idioms, phrasal verbs, or complex expressions
- Basic connectors: "and", "but", "because"
- Repeat key words for reinforcement
- Examples: "I like...", "This is...", "It is good"`,

    'A2': `VOCABULARY & GRAMMAR (A2 - Elementary):
- Use common everyday vocabulary (Oxford 3000 A2 subset)
- Simple past tense, basic future with "will" and "going to"
- Short sentences (8-12 words)
- Simple phrasal verbs: "get up", "look at", "come back"
- Basic connectors: "then", "so", "when", "if"
- Avoid complex grammar structures
- Examples: "I went to...", "We will see...", "That was interesting"`,

    'B1': `VOCABULARY & GRAMMAR (B1 - Intermediate):
- Use intermediate vocabulary from NGSL Core 2000
- Past continuous, present perfect, conditionals type 1
- Medium sentences (10-15 words)
- Common idioms: "on the other hand", "as far as I know"
- Connectors: "however", "although", "therefore", "meanwhile"
- Can express opinions with simple reasoning
- Examples: "In my opinion...", "I believe that...", "It seems like..."`,

    'B2': `VOCABULARY & GRAMMAR (B2 - Upper-Intermediate):
- Use upper-intermediate vocabulary from NGSL Core 3000
- All tenses, passive voice, reported speech, conditionals type 2-3
- Complex sentences with multiple clauses (15-25 words)
- Idiomatic expressions: "to be honest", "at the end of the day", "when it comes to"
- Academic connectors: "consequently", "furthermore", "nevertheless", "in contrast"
- Express nuanced opinions with supporting arguments
- Examples: "From my perspective...", "Taking into account...", "It could be argued that..."`,

    'C1': `VOCABULARY & GRAMMAR (C1 - Advanced):
- Use sophisticated, precise vocabulary including academic and technical terms
- Complex grammatical structures, subjunctive mood, inversion
- Elaborate sentences with embedded clauses (20-30 words)
- Advanced idioms and collocations: "to shed light on", "on the grounds that", "by virtue of"
- Discourse markers: "notwithstanding", "insofar as", "be that as it may"
- Express complex ideas with clarity, nuance, and rhetorical skill
- Use subtle humor, irony, and wordplay
- Examples: "One might argue...", "It stands to reason that...", "Paradoxically speaking..."`,

    'C2': `VOCABULARY & GRAMMAR (C2 - Mastery/Near-Native):
- Use full range of vocabulary: erudite, conceptual, abstract, domain-specific terminology
- Highly sophisticated grammatical structures, archaic forms when stylistically appropriate
- Rhetorically crafted sentences with layered meaning (25-40 words)
- Literary and academic expressions: "quintessentially", "paradigmatic", "notwithstanding the foregoing"
- Advanced discourse: "be that as it may", "in contradistinction to", "ipso facto"
- Express deeply nuanced ideas with elegance and precision
- Use sophisticated wordplay, literary allusions, and intellectual wit
- Demonstrate mastery through varied register and stylistic range
- CRITICAL: Do NOT use simple phrases like "Oh wow!", "That's cool!", "Really?"
- Instead use: "How utterly fascinating!", "A compelling observation indeed", "That's a paradigm-shifting perspective"
- Examples: "To posit such a thesis would be...", "The ramifications of which are...", "One cannot help but marvel at..."

SPEAKER STYLE FOR C2:
- Host: Erudite, intellectually rigorous, uses academic vocabulary, poses thought-provoking questions
- Guest: Scholarly, articulate, provides nuanced analysis, references historical/cultural context
- Avoid casual fillers; use sophisticated transitions: "Indeed", "Precisely", "Quite so"
- Include intellectual banter, not casual chat`
  };

  const levelRules = CEFR_LANGUAGE_RULES[level] || CEFR_LANGUAGE_RULES['B1'];

  const prompt = `Generate a VERY NATURAL podcast conversation script about "${topic}" for English learners at ${level} CEFR level.

CRITICAL - LANGUAGE LEVEL:
${levelRules}

CRITICAL:
- Output must be 100% English. Do not include Turkish words or phrases.
- If you need to reference a Turkish concept, translate it fully into English and do not include the original Turkish term.

${level === 'C2' || level === 'C1' ? `SOPHISTICATED DIALOGUE STYLE:
- Replace casual reactions with intellectual observations
- Instead of "Oh wow!" use "How utterly fascinating!" or "What a compelling observation!"
- Instead of "Really?" use "Is that so?" or "Extraordinary!"
- Instead of "Right, right" use "Precisely" or "Indeed" or "Quite so"
- Use thoughtful transitions like "This brings to mind..." or "The implications of which..."
- Include references to broader contexts, historical parallels, or theoretical frameworks` : `NATURAL DIALOGUE STYLE:
- Include natural reactions like "Oh wow!", "Hmm, interesting!", "Right, right", "Exactly!", "Oh I see!"
- Add thinking pauses like "Well...", "So...", "You know...", "I mean..."
- Include slight interruptions and agreements like "Yeah!", "Mhm!", "Oh really?"
- Vary sentence lengths - some short reactions, some longer explanations
- Add emotional expressions like laughing "(laughs)", surprised reactions, enthusiasm`}

REQUIREMENTS:
- CRITICAL: Total word count must be EXACTLY approximately ${targetWordCount} words (for ${duration} minutes of audio at 150 words/minute)
- This is a ${duration}-minute podcast - generate enough content to fill ${duration} FULL minutes
- Minimum ${Math.round(targetWordCount * 0.9)} words, maximum ${Math.round(targetWordCount * 1.1)} words
- Style: ${STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat']}
- Speaker A (Host): ${speakerAInfo.style}
- Speaker B (Guest/Co-host): ${speakerBInfo.style}
${includeHumor ? (level === 'C2' ? '- Include sophisticated wit, intellectual humor, and erudite wordplay' : '- Include humor, jokes, and playful banter') : '- Keep it informative but friendly'}
${includeFiller ? (level === 'C2' || level === 'C1' ? '- Use sophisticated transitions and discourse markers instead of casual fillers' : '- Include natural filler words (um, uh, well, you know, like) throughout') : '- Minimal filler words'}
- Make speakers interact naturally for realism
- Include back-and-forth exchanges, not just long monologues

OUTPUT FORMAT (JSON):
{
  "title": "Episode title",
  "turns": [
    { "speaker": "A", "text": "Speaker A's dialogue" },
    { "speaker": "B", "text": "Speaker B's dialogue" },
    ...
  ],
  "turns_original": [
    { "speaker": "A", "text": "Original-language version of Speaker A's dialogue" },
    { "speaker": "B", "text": "Original-language version of Speaker B's dialogue" },
    ...
  ]
}

IMPORTANT FOR turns_original:
- turns_original MUST be Turkish (the user's original language).
- It MUST have the SAME number of items as turns.
- Each turns_original[i] MUST be a faithful Turkish translation of turns[i] (same meaning, same speaker).

Generate dialogue that sounds like a REAL conversation at the ${level} level, NOT a scripted interview.`;

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // For podcasts longer than 5 minutes, split into segments and generate multiple times
    const MAX_SEGMENT_DURATION = 5; // minutes per segment
    const segmentCount = Math.ceil(duration / MAX_SEGMENT_DURATION);

    if (segmentCount > 1) {
      logger.info(`[GOOGLE-PODCAST] Long podcast (${duration} min) - splitting into ${segmentCount} segments`);

      const allTurns = [];
      const allTurnsOriginal = [];
      let previousContext = '';

      for (let seg = 0; seg < segmentCount; seg++) {
        const segmentDuration = seg === segmentCount - 1
          ? duration - (seg * MAX_SEGMENT_DURATION)
          : MAX_SEGMENT_DURATION;
        const segmentWordCount = Math.round(segmentDuration * 150);

        const segmentPrompt = `Generate segment ${seg + 1} of ${segmentCount} of a podcast conversation about "${topic}" for English learners at ${level} CEFR level.

${seg === 0 ? 'This is the OPENING segment - introduce the topic and speakers.' : ''}
${seg === segmentCount - 1 ? 'This is the CLOSING segment - wrap up the discussion and conclude.' : ''}
${seg > 0 && seg < segmentCount - 1 ? 'This is a MIDDLE segment - continue the discussion naturally.' : ''}

${previousContext ? `PREVIOUS CONTEXT (continue from here naturally):\n${previousContext}\n` : ''}

CRITICAL - LANGUAGE LEVEL:
${levelRules}

CRITICAL - WORD COUNT:
- This segment must be EXACTLY ${segmentWordCount} words (${segmentDuration} minutes at 150 words/minute)
- Minimum ${Math.round(segmentWordCount * 0.9)} words, maximum ${Math.round(segmentWordCount * 1.1)} words

${level === 'C2' || level === 'C1' ? `SOPHISTICATED DIALOGUE STYLE:
- Replace casual reactions with intellectual observations
- Instead of "Oh wow!" use "How utterly fascinating!" or "What a compelling observation!"
- Instead of "Really?" use "Is that so?" or "Extraordinary!"
- Use thoughtful transitions like "This brings to mind..." or "The implications of which..."` : `NATURAL DIALOGUE STYLE:
- Include natural reactions like "Oh wow!", "Hmm, interesting!", "Right, right", "Exactly!", "Oh I see!"
- Add thinking pauses like "Well...", "So...", "You know...", "I mean..."
- Include slight interruptions and agreements like "Yeah!", "Mhm!", "Oh really?"
- Vary sentence lengths - some short reactions, some longer explanations`}

REQUIREMENTS:
- Style: ${STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat']}
- Speaker A (Host): ${speakerAInfo.style}
- Speaker B (Guest/Co-host): ${speakerBInfo.style}
${includeHumor ? (level === 'C2' ? '- Include sophisticated wit and intellectual humor' : '- Include humor, jokes, and playful banter') : '- Keep it informative but friendly'}
${includeFiller ? (level === 'C2' || level === 'C1' ? '- Use sophisticated transitions instead of casual fillers' : '- Include natural filler words (um, uh, well, you know, like)') : '- Minimal filler words'}
- Output 100% English only

OUTPUT FORMAT (JSON):
{
  "turns": [
    { "speaker": "A", "text": "Speaker A's dialogue" },
    { "speaker": "B", "text": "Speaker B's dialogue" }
  ],
  "turns_original": [
    { "speaker": "A", "text": "Turkish translation of Speaker A's dialogue" },
    { "speaker": "B", "text": "Turkish translation of Speaker B's dialogue" }
  ]
}`;

        // C1/C2 için system prompt'u da sofistike yap
        const systemPromptForLevel = (level === 'C2' || level === 'C1')
          ? `You are an expert at writing sophisticated, intellectually engaging podcast conversations for advanced English learners. Generate dialogue that demonstrates mastery-level vocabulary, complex grammatical structures, and erudite discourse. Avoid casual language - use refined, academic expressions. Generate EXACTLY the word count requested. Always output valid JSON.`
          : `You are an expert at writing realistic, natural-sounding podcast conversations. Generate EXACTLY the word count requested. Always output valid JSON.`;

        const segResponse = await withRetry(() => openai.chat.completions.create({
          model: 'gpt-4o-mini',  // Use cost-effective model for all podcasts
          messages: [
            {
              role: 'system',
              content: systemPromptForLevel,
            },
            { role: 'user', content: segmentPrompt },
          ],
          temperature: 0.9,
          max_tokens: 8000,
          response_format: { type: 'json_object' },
        }));

        const segData = JSON.parse(segResponse.choices[0].message.content);

        if (segData.turns && segData.turns.length > 0) {
          allTurns.push(...segData.turns);

          // CRITICAL FIX: Ensure turns_original stays strictly in sync with turns to prevent UI misalignment
          // GPT sometimes generates different number of items in the arrays
          const segmentOriginals = segData.turns_original || [];

          if (segmentOriginals.length !== segData.turns.length) {
            logger.warn(`[GOOGLE-PODCAST] Segment ${seg + 1} sync mismatch: ${segData.turns.length} turns vs ${segmentOriginals.length} translations. Auto-fixing to prevent offset.`);
          }

          // Push exactly as many original turns as English turns
          for (let i = 0; i < segData.turns.length; i++) {
            if (i < segmentOriginals.length) {
              allTurnsOriginal.push(segmentOriginals[i]);
            } else {
              // Fallback to avoid index shift
              // We use empty string or original text as placeholder
              allTurnsOriginal.push({
                speaker: segData.turns[i].speaker,
                text: ""
              });
            }
          }

          // Keep last 2 turns as context for next segment
          const lastTurns = segData.turns.slice(-2);
          previousContext = lastTurns.map(t => `${t.speaker === 'A' ? 'Host' : 'Guest'}: ${t.text}`).join('\n');
        }

        logger.info(`[GOOGLE-PODCAST] Segment ${seg + 1}/${segmentCount}: ${segData.turns?.length || 0} turns generated`);

        // Add delay between segments to avoid rate limiting
        if (seg < segmentCount - 1) {
          logger.info(`[GOOGLE-PODCAST] Waiting 2 seconds before next segment to avoid rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      logger.info(`[GOOGLE-PODCAST] Generated total ${allTurns.length} turns for ${duration}-minute podcast`);

      // Apply speaker assignment validation and correction for long podcasts
      const { turns: correctedTurns, corrections } = validateAndCorrectSpeakerAssignments(allTurns);

      // Also correct turns_original to match corrected turns
      let correctedTurnsOriginal = allTurnsOriginal;
      if (corrections.length > 0 && correctedTurnsOriginal.length === correctedTurns.length) {
        correctedTurnsOriginal = correctedTurnsOriginal.map((turn, i) => ({
          ...turn,
          speaker: correctedTurns[i].speaker
        }));
        logger.info(`[GOOGLE-PODCAST] Applied ${corrections.length} speaker corrections to long podcast script`);
      }

      return {
        title: topic,
        turns: correctedTurns,
        turns_original: correctedTurnsOriginal,
        speakerAId: speakerAInfo.speakerId,
        speakerBId: speakerBInfo.speakerId,
        usage: { segmentCount },
        speakerCorrections: corrections,
      };
    }

    // For short podcasts (<=5 min), use single generation
    // C1/C2 için system prompt'u da sofistike yap
    const systemPrompt = (level === 'C2' || level === 'C1')
      ? `You are an expert at writing sophisticated, intellectually engaging podcast conversations for advanced English learners. Generate dialogue that demonstrates mastery-level vocabulary, complex grammatical structures, and erudite discourse. The speakers should sound like two intellectuals having a refined discussion - with thoughtful observations, scholarly references, and elegant expressions. Avoid casual fillers and simple reactions. Always output valid JSON.`
      : `You are an expert at writing realistic, natural-sounding podcast conversations. Your dialogues should sound like two real people talking - with natural reactions, interruptions, laughter, and genuine emotion. Never write stiff or robotic dialogue. Always output valid JSON.`;

    const response = await withRetry(() => openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: Math.min(8000, Math.max(4000, Math.round(duration * 1500))),
      response_format: { type: 'json_object' },
    }));

    const scriptData = JSON.parse(response.choices[0].message.content);

    logger.info(`[GOOGLE-PODCAST] Generated script with ${scriptData.turns?.length || 0} turns`);

    // Apply speaker assignment validation and correction
    const { turns: correctedTurns, corrections } = validateAndCorrectSpeakerAssignments(scriptData.turns || []);

    // Also correct turns_original to match corrected turns
    let correctedTurnsOriginal = scriptData.turns_original || [];
    if (corrections.length > 0 && correctedTurnsOriginal.length === correctedTurns.length) {
      correctedTurnsOriginal = correctedTurnsOriginal.map((turn, i) => ({
        ...turn,
        speaker: correctedTurns[i].speaker
      }));
      logger.info(`[GOOGLE-PODCAST] Applied ${corrections.length} speaker corrections to script`);
    }

    return {
      title: scriptData.title || topic,
      turns: correctedTurns,
      turns_original: correctedTurnsOriginal,
      speakerAId: speakerAInfo.speakerId,
      speakerBId: speakerBInfo.speakerId,
      usage: response.usage,
      speakerCorrections: corrections,
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
    _attemptedVoicePairs = null,
  } = options;

  const femaleSpeakers = Object.keys(GEMINI_SPEAKERS).filter(
    (id) => GEMINI_SPEAKERS[id] && GEMINI_SPEAKERS[id].gender === 'female'
  );
  const maleSpeakers = Object.keys(GEMINI_SPEAKERS).filter(
    (id) => GEMINI_SPEAKERS[id] && GEMINI_SPEAKERS[id].gender === 'male'
  );

  const toPairKey = (a, b) => `${String(a || '')}|${String(b || '')}`;

  const buildCandidatePairs = () => {
    const pairs = [];
    for (const f of femaleSpeakers) {
      for (const m of maleSpeakers) {
        pairs.push([f, m]);
        pairs.push([m, f]);
      }
    }

    const defaultKey1 = `${DEFAULT_SPEAKER_A}|${DEFAULT_SPEAKER_B}`;
    const defaultKey2 = `${DEFAULT_SPEAKER_B}|${DEFAULT_SPEAKER_A}`;
    pairs.sort((p1, p2) => {
      const k1 = `${p1[0]}|${p1[1]}`;
      const k2 = `${p2[0]}|${p2[1]}`;
      if (k1 === defaultKey1) return -1;
      if (k2 === defaultKey1) return 1;
      if (k1 === defaultKey2) return -1;
      if (k2 === defaultKey2) return 1;
      return 0;
    });

    return pairs;
  };

  logger.info(`[GOOGLE-PODCAST] Synthesizing ${turns.length} turns with ${model}`);
  logger.info(`[GOOGLE-PODCAST] Speaker A: ${speakerAId}, Speaker B: ${speakerBId}`);

  // Build the text with speaker labels for simple multi-speaker format
  const dialogueLines = turns.map(turn => {
    const speakerName = turn.speaker === 'A' ? 'Host' : 'Guest';
    return `${speakerName}: ${turn.text}`;
  });
  const dialogueText = dialogueLines.join('\n');

  // Build the full transcript (without labels) for display
  const fullTranscript = turns.map(turn => turn.text).join(' ');

  const getUtf8ByteLength = (str) => Buffer.byteLength(String(str || ''), 'utf8');
  const MAX_INPUT_TEXT_BYTES = 3900;

  const chunkLinesByByteLimit = (lines, maxBytes) => {
    const chunks = [];
    let current = '';

    for (const line of (lines || [])) {
      const safeLine = String(line || '').trim();
      if (!safeLine) continue;

      const candidate = current ? `${current}\n${safeLine}` : safeLine;
      if (getUtf8ByteLength(candidate) <= maxBytes) {
        current = candidate;
        continue;
      }

      if (current) chunks.push(current);

      if (getUtf8ByteLength(safeLine) <= maxBytes) {
        current = safeLine;
      } else {
        // If a single line is too long, hard-split it (last resort)
        let remaining = safeLine;
        while (remaining.length > 0) {
          let sliceLen = Math.min(remaining.length, 1000);
          while (sliceLen > 50 && getUtf8ByteLength(remaining.slice(0, sliceLen)) > maxBytes) {
            sliceLen = Math.floor(sliceLen * 0.8);
          }
          const part = remaining.slice(0, sliceLen).trim();
          if (part) chunks.push(part);
          remaining = remaining.slice(sliceLen).trim();
        }
        current = '';
      }
    }

    if (current) chunks.push(current);
    return chunks;
  };

  try {
    // Use REST API directly for better multi-speaker support
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const tokenResult = await auth.getAccessToken();
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (getUtf8ByteLength(stylePrompt) > 4000) {
      throw new Error('stylePrompt exceeds 4000 byte limit for Gemini TTS input.prompt');
    }

    // If the dialogue text is too long for Gemini TTS (4000 bytes limit), chunk it.
    // This avoids per-turn fallback (quota-heavy) while staying within API limits.
    if (getUtf8ByteLength(dialogueText) > MAX_INPUT_TEXT_BYTES) {
      logger.warn(`[GOOGLE-PODCAST] dialogueText too long (${getUtf8ByteLength(dialogueText)} bytes). Using chunked multi-speaker synthesis...`);

      const { mergeAudioSegmentsToBuffer } = require('./audioMerger.js');
      const chunks = chunkLinesByByteLimit(dialogueLines, MAX_INPUT_TEXT_BYTES);
      logger.info(`[GOOGLE-PODCAST] Chunked synthesis: ${chunks.length} chunks (max ${MAX_INPUT_TEXT_BYTES} bytes each)`);

      const audioBuffers = [];
      let ttsCharactersTotal = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        ttsCharactersTotal += String(chunkText || '').length;
        logger.info(`[GOOGLE-PODCAST] Synthesizing chunk ${i + 1}/${chunks.length} (${getUtf8ByteLength(chunkText)} bytes)`);

        const requestBody = {
          input: {
            text: chunkText,
            prompt: stylePrompt,
          },
          voice: {
            languageCode: 'en-us',
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

        logger.info(`[GOOGLE-PODCAST] Chunk ${i + 1}/${chunks.length} - bytes=${getUtf8ByteLength(chunkText)}`);

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
                timeout: 120000,
              }
            );

            if (!response.data || !response.data.audioContent) {
              throw new Error('No audio content received from Gemini-TTS (chunked)');
            }

            const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
            audioBuffers.push(audioBuffer);
            break;
          } catch (retryError) {
            lastError = retryError;
            const errMsg = retryError.response?.data?.error?.message || retryError.message;
            const errCode = retryError.response?.data?.error?.code || retryError.code || 'UNKNOWN';
            const errStatus = retryError.response?.status || 'N/A';
            logger.warn(`[GOOGLE-PODCAST] Chunk ${i + 1}/${chunks.length} attempt ${attempt}/3 failed: [${errCode}] ${errMsg} (HTTP ${errStatus})`);

            if (attempt < 3) {
              const delay = Math.pow(2, attempt) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (audioBuffers.length !== i + 1) {
          throw lastError || new Error('Chunked synthesis failed');
        }

        // Small pacing to reduce chance of per-minute quota bursts
        await new Promise(resolve => setTimeout(resolve, 350));
      }

      const merged = await mergeAudioSegmentsToBuffer(audioBuffers);
      logger.info(`[GOOGLE-PODCAST] Merged chunked audio: ${merged.length} bytes`);

      return {
        audioContent: merged,
        transcript: fullTranscript,
        dialogueText: dialogueText,
        turns: turns,
        ttsCharacters: ttsCharactersTotal,
      };
    }

    const requestBody = {
      input: {
        text: dialogueText,
        prompt: stylePrompt,
      },
      voice: {
        languageCode: 'en-us',
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

    logger.info('[GOOGLE-PODCAST] Sending request to Gemini-TTS REST API (v1)...');
    logger.info(`[GOOGLE-PODCAST] Request config: Host=${speakerAId}, Guest=${speakerBId}, Model=${model}`);
    logger.debug(`[GOOGLE-PODCAST] Request body: ${JSON.stringify(requestBody, null, 2)}`);

    // Retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Use v1 endpoint for Gemini TTS multi-speaker support
        const response = await axios.post(
          `https://texttospeech.googleapis.com/v1/text:synthesize`,
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
          ttsCharacters: String(dialogueText || '').length,
        };
      } catch (retryError) {
        lastError = retryError;
        const errMsg = retryError.response?.data?.error?.message || retryError.message;
        const errCode = retryError.response?.data?.error?.code || retryError.code || 'UNKNOWN';
        const errStatus = retryError.response?.status || 'N/A';
        const apiStatus = retryError.response?.data?.error?.status;
        const httpStatus = retryError.response?.status;
        const isInvalidArgument = apiStatus === 'INVALID_ARGUMENT' || httpStatus === 400;
        logger.warn(`[GOOGLE-PODCAST] Attempt ${attempt}/3 failed: [${errCode}] ${errMsg} (HTTP ${errStatus})`);
        if (retryError.response?.data) {
          logger.debug(`[GOOGLE-PODCAST] Error response: ${JSON.stringify(retryError.response.data)}`);
        }

        if (isInvalidArgument) {
          break;
        }

        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          logger.info(`[GOOGLE-PODCAST] Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, throw the last error
    throw lastError;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    const apiStatus = error.response?.data?.error?.status;
    const httpStatus = error.response?.status;
    const isInvalidArgument = apiStatus === 'INVALID_ARGUMENT' || httpStatus === 400;
    logger.error('[GOOGLE-PODCAST] Synthesis failed after retries:', errMsg);

    if (isInvalidArgument) {
      const attemptedSet = new Set(Array.isArray(_attemptedVoicePairs) ? _attemptedVoicePairs : []);
      attemptedSet.add(toPairKey(speakerAId, speakerBId));

      const candidates = buildCandidatePairs();
      const nextPair = candidates.find(([a, b]) => !attemptedSet.has(`${a}|${b}`));

      if (nextPair) {
        const [nextA, nextB] = nextPair;
        const attemptNumber = attemptedSet.size + 1;
        logger.warn(`[GOOGLE-PODCAST] INVALID_ARGUMENT for Host=${speakerAId}, Guest=${speakerBId}. Trying another female/male voice pair (attempt ${attemptNumber}/${candidates.length}): Host=${nextA}, Guest=${nextB}`);
        logger.info(`[SELECTED-HOST]:${nextA} (fallback)`);
        logger.info(`[SELECTED-GUEST]:${nextB} (fallback)`);
        return await synthesizeMultiSpeakerPodcast({
          ...options,
          speakerAId: nextA,
          speakerBId: nextB,
          _attemptedVoicePairs: Array.from(attemptedSet),
        });
      }

      const finalErr = new Error('Gemini TTS rejected all available female/male voice pairs (INVALID_ARGUMENT).');
      finalErr.code = 'GEMINI_INVALID_ARGUMENT';
      throw finalErr;
    }

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
  const { mergeAudioSegmentsToBuffer } = require('./audioMerger.js');

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
          languageCode: 'en-us',
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

      // Use v1 endpoint for Gemini TTS multi-speaker support
      const response = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize`,
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

  const { synthesizeWithGoogle } = require('./googleTTS.js');

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
  const { uploadToSupabase } = require('../storage/storageUploader.js');

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
    ttsModel,
    userId = null,
  } = options;

  logger.info(`[GOOGLE-PODCAST] Creating podcast - Topic: "${topic}", Level: ${level}, Duration: ${duration}min`);

  try {
    let topicForScript = topic;
    try {
      const rawTopic = typeof topic === 'string' ? topic.trim() : '';
      if (rawTopic) {
        const { translateToEnglishWithOpenAI } = require('../ai/inputExtractor.js');
        const translated = await translateToEnglishWithOpenAI(rawTopic, level);
        if (translated && translated.text && typeof translated.text === 'string') {
          topicForScript = translated.text.trim() || topicForScript;
          logger.info(`[GOOGLE-PODCAST] Topic translated to English for script: "${topicForScript}"`);
        }
      }
    } catch (translateErr) {
      logger.warn(`[GOOGLE-PODCAST] Topic translation failed, continuing with original topic: ${translateErr.message}`);
    }

    // Step 1: Generate podcast script
    const scriptResult = await generatePodcastScript({
      topic: topicForScript,
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

    /* 
    DISABLED SENTENCE SPLITTING TO FIX ALIGNMENT ISSUES
    Splitting into sentences caused 'turns' (English) and 'turns_original' (Turkish) 
    to have different lengths because translation sentence counts often differ from source.
    We now keep the original turn-based structure (paragraph/block based) which guarantees 1:1 sync.
    */

    // const splitIntoSentences = (text) => { ... }
    // const sentenceTurns = ...
    // const sentenceTurnsOriginal = ...

    logger.info(`[GOOGLE-PODCAST] Script generated: ${scriptResult.turns.length} turns (Using turn-based sync)`);

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
    logger.info(`[SELECTED-HOST]:${finalHostSpeakerId}`);
    logger.info(`[SELECTED-GUEST]:${finalGuestSpeakerId}`);

    const requestedModel = (typeof ttsModel === 'string' && ttsModel.trim().length > 0)
      ? ttsModel.trim()
      : 'gemini-2.5-flash-tts';

    if (!ALLOWED_GEMINI_TTS_MODELS.has(requestedModel)) {
      const modelErr = new Error(`Unsupported Gemini TTS model: ${requestedModel}. Allowed: ${Array.from(ALLOWED_GEMINI_TTS_MODELS).join(', ')}`);
      modelErr.code = 'TTS_MODEL_NOT_SUPPORTED';
      throw modelErr;
    }

    // Step 2: Synthesize audio with Gemini-TTS
    const stylePrompt = STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat'];

    // CRITICAL FIX: Use original turns directly to maintain 1:1 mapping
    const turnsForTts = scriptResult.turns;
    const turnsOriginalForSave = (Array.isArray(scriptResult.turns_original) && scriptResult.turns_original.length > 0)
      ? scriptResult.turns_original
      : null;


    const audioResult = await synthesizeMultiSpeakerPodcast({
      turns: turnsForTts,
      speakerAId: finalHostSpeakerId,
      speakerBId: finalGuestSpeakerId,
      stylePrompt: stylePrompt,
      model: requestedModel,
    });

    // Step 3: Upload audio to storage
    const fileName = `podcast_${uuidv4()}.mp3`;
    const audioUrl = await uploadPodcastAudio(audioResult.audioContent, fileName);

    let wordsForTiming = null;
    let timepoints = null;
    let dialogueSegments = null;
    let vttUrl = null;
    const useMFAAlignment = process.env.USE_MFA_ALIGNMENT === 'true';
    const mfaDebugEnabled = process.env.MFA_DEBUG_DUMP === 'true';

    logger.info(`[GOOGLE-PODCAST] MFA alignment enabled: ${useMFAAlignment}`);
    if (mfaDebugEnabled) {
      logger.info(`[GOOGLE-PODCAST] MFA debug dump enabled (file id will be: google_podcast_${fileName.replace(/\.mp3$/i, '')})`);
    }

    if (audioResult.transcript && typeof audioResult.transcript === 'string') {
      const fallbackWords = audioResult.transcript.split(/\s+/).filter(w => w.length > 0);
      wordsForTiming = fallbackWords.length > 0 ? fallbackWords : wordsForTiming;
    }

    if (useMFAAlignment && audioUrl && (audioResult.dialogueText || audioResult.transcript)) {
      const { mfaAligner } = require('./mfaAligner.js');
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

        const useRemoteMFA = process.env.USE_REMOTE_MFA === 'true';
        // Use MP3 when remote MFA is enabled (remote server handles conversion and upload is smaller)
        // Use WAV when running local MFA (WAV tends to align better locally)
        const tempAudioPath = useRemoteMFA
          ? tempMp3Path
          : (require('fs').existsSync(tempWavPath) ? tempWavPath : tempMp3Path);
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
          locale,
          {
            debug: mfaDebugEnabled
              ? {
                id: `google_podcast_${fileName.replace(/\.mp3$/i, '')}`,
                source: 'googleTTSMultiSpeaker',
                fileName,
                fallbackUsed: audioResult.fallbackUsed || false,
                fallbackMode: audioResult.fallbackMode || null,
              }
              : null,
          }
        );

        logger.info(`[GOOGLE-PODCAST] MFA output timings: ${Array.isArray(mfaWordTimings) ? mfaWordTimings.length : 'non-array'}`);
        if (Array.isArray(mfaWordTimings) && mfaWordTimings.length > 0) {
          logger.info(`[GOOGLE-PODCAST] MFA sample timing[0]: ${JSON.stringify(mfaWordTimings[0])}`);
        }

        // Cleanup temp files (both MP3 and WAV)
        await fs.promises.unlink(tempMp3Path).catch(() => { });
        await fs.promises.unlink(tempWavPath).catch(() => { });

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

          // MFA-based speaker correction (Phase 2 of hybrid approach)
          // Analyze pauses to detect and correct speaker assignment errors
          try {
            const mfaServiceUrl = process.env.MFA_SERVICE_URL || 'http://localhost:3002';
            const speakerCorrectionResponse = await axios.post(
              `${mfaServiceUrl}/mfa/correct-speakers`,
              {
                wordTimings: mfaWordTimings.map(t => ({
                  word: t.word,
                  startTime: t.startTime,
                  endTime: t.endTime
                })),
                turns: turns
              },
              { timeout: 10000 }
            );

            if (speakerCorrectionResponse.data?.success && speakerCorrectionResponse.data?.corrections?.length > 0) {
              const mfaCorrections = speakerCorrectionResponse.data.corrections;
              logger.info(`[GOOGLE-PODCAST] MFA Speaker Correction: ${mfaCorrections.length} additional corrections from pause analysis`);

              // Apply corrections to turns and turns_original
              for (const correction of mfaCorrections) {
                if (turns[correction.turnIndex]) {
                  turns[correction.turnIndex].speaker = correction.correctedSpeaker;
                }
                if (turnsOriginal && turnsOriginal[correction.turnIndex]) {
                  turnsOriginal[correction.turnIndex].speaker = correction.correctedSpeaker;
                }
              }

              // Log summary
              const summary = speakerCorrectionResponse.data.summary;
              if (summary) {
                logger.info(`[GOOGLE-PODCAST] MFA Pause Analysis: ${summary.significantPauses} significant pauses detected, ${summary.totalCorrections} corrections applied`);
              }
            }
          } catch (speakerCorrectionErr) {
            logger.warn(`[GOOGLE-PODCAST] MFA speaker correction skipped: ${speakerCorrectionErr.message}`);
          }

          try {
            const normalizeToken = (t) => {
              return (t || '')
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '')
                .trim();
            };

            const tokenizeForAlignment = (text) => {
              return (text || '')
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
                .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
                .replace(/[\u2013\u2014]/g, ' ')
                .replace(/\u2026/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .split(/\s+/)
                .map(normalizeToken)
                .filter(Boolean);
            };

            const mfaNorm = (mfaWordTimings || []).map(t => normalizeToken(t?.word));
            const turns = audioResult.turns || [];

            const findBestWindow = (tokens, startFrom) => {
              if (!tokens || tokens.length === 0) return null;
              const first = tokens[0];
              if (!first) return null;

              const maxSearchAhead = 500;
              const searchEnd = Math.min(mfaNorm.length - 1, startFrom + maxSearchAhead);

              let best = null;
              for (let i = startFrom; i <= searchEnd; i++) {
                if (mfaNorm[i] !== first) continue;

                let j = i;
                let ti = 0;
                let matched = 0;
                let lastMatchIndex = i;
                let skips = 0;
                const maxSkips = Math.max(20, tokens.length * 3);

                while (j < mfaNorm.length && ti < tokens.length) {
                  if (mfaNorm[j] === tokens[ti]) {
                    matched += 1;
                    lastMatchIndex = j;
                    ti += 1;
                    j += 1;
                    continue;
                  }
                  skips += 1;
                  if (skips > maxSkips) break;
                  j += 1;
                }

                const score = tokens.length > 0 ? matched / tokens.length : 0;
                const minMatched = Math.min(tokens.length, Math.max(3, Math.floor(tokens.length * 0.6)));
                if (matched >= minMatched) {
                  if (!best || score > best.score) {
                    best = { startIndex: i, endIndex: lastMatchIndex, score, matched, tokenCount: tokens.length };
                    if (score >= 0.95) break;
                  }
                }
              }

              return best;
            };

            let cursor = 0;
            const segments = [];

            for (let lineIndex = 0; lineIndex < turns.length; lineIndex++) {
              const turn = turns[lineIndex];
              const tokens = tokenizeForAlignment(turn?.text || '');
              if (tokens.length === 0) continue;

              const best = findBestWindow(tokens, cursor);
              let startWordIndex = null;
              let endWordIndex = null;
              let usedFallback = false;

              if (best && best.startIndex != null && best.endIndex != null) {
                startWordIndex = best.startIndex;
                endWordIndex = best.endIndex;
              } else {
                const approxCount = tokens.length;
                startWordIndex = Math.min(Math.max(0, cursor), mfaWordTimings.length - 1);
                endWordIndex = Math.min(Math.max(0, startWordIndex + approxCount - 1), mfaWordTimings.length - 1);
                usedFallback = true;
              }

              const startTimeSeconds = mfaWordTimings[startWordIndex]?.startTime ?? null;
              const endTimeSeconds = mfaWordTimings[endWordIndex]?.endTime ?? null;
              const speaker = turn?.speaker === 'A' ? 'Host' : 'Guest';

              if (startTimeSeconds != null && endTimeSeconds != null) {
                segments.push({
                  lineIndex,
                  speaker,
                  startTimeSeconds,
                  endTimeSeconds,
                  startWordIndex,
                  endWordIndex,
                });
              }

              cursor = Math.min(mfaWordTimings.length, (endWordIndex != null ? endWordIndex + 1 : cursor));

              if (usedFallback) {
                logger.warn(`[GOOGLE-PODCAST] dialogue_segments fallback used for lineIndex=${lineIndex} tokens=${tokens.length} cursorNow=${cursor}`);
              }
            }

            dialogueSegments = segments.length > 0 ? segments : null;
          } catch (segErr) {
            logger.warn(`[GOOGLE-PODCAST] Failed to compute dialogue segments from MFA: ${segErr.message}`);
          }

          const vttContent = createWordLevelVTTFromTimings(mfaWordTimings);
          const vttFileName = `${fileName.replace(/\.mp3$/i, '')}.vtt`;
          vttUrl = await uploadPodcastVtt(vttContent, vttFileName);
        } else {
          logger.warn(`[GOOGLE-PODCAST] MFA returned empty or invalid timepoints: ${JSON.stringify(mfaWordTimings)}`);
        }
      } catch (mfaErr) {
        logger.error('[GOOGLE-PODCAST] MFA alignment FAILED (caught exception):', {
          message: mfaErr.message,
          stack: mfaErr.stack,
          code: mfaErr.code
        });
        // Do not throw, continue without alignment
      }
    } else {
      logger.info(`[GOOGLE-PODCAST] Skipping MFA alignment. Conditions: useMFA=${useMFAAlignment}, audioUrl=${!!audioUrl}, hasText=${!!(audioResult.dialogueText || audioResult.transcript)}`);
    }

    // Step 4: Estimate duration (roughly 150 words per minute)
    const wordCount = audioResult.transcript.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 150) * 60);

    // Step 5: Save to contenthistory if user is authenticated
    let contentHistoryId = null;
    if (userId && supabase) {
      try {
        logger.info('[GOOGLE-PODCAST] Step 5.1: Loading costTracker...');
        const { calculateOpenAiCost, calculateTtsCost, logApiCost } = require('../infra/costTracker.js');

        logger.info('[GOOGLE-PODCAST] Step 5.2: Calculating OpenAI cost...');
        const openaiCost = calculateOpenAiCost(scriptResult.usage || {}, 'gpt-4o-mini');

        logger.info('[GOOGLE-PODCAST] Step 5.3: Calculating TTS cost...', { audioResultTtsChars: audioResult?.ttsCharacters });
        const ttsCharacters = typeof audioResult?.ttsCharacters === 'number'
          ? audioResult.ttsCharacters
          : String(audioResult?.dialogueText || '').length;
        const ttsCategory = 'Premium';
        const ttsCostUsd = calculateTtsCost(ttsCharacters, ttsCategory);
        const totalCostUsd = Number(((openaiCost.totalCostUsd || 0) + (ttsCostUsd || 0)).toFixed(6));

        logger.info('[GOOGLE-PODCAST] Step 5.4: Costs calculated', { openaiCost: openaiCost.totalCostUsd, ttsCostUsd, totalCostUsd });

        const turnsOriginalDialogueText = Array.isArray(turnsOriginalForSave) && turnsOriginalForSave.length > 0
          ? turnsOriginalForSave
            .map(turn => `${turn?.speaker === 'A' ? 'Host' : 'Guest'}: ${turn?.text || ''}`)
            .join('\n')
          : '';

        const insertData = {
          user_id: userId,
          level: level,
          mp3_url: audioUrl,
          vtt_url: vttUrl,
          input: (turnsOriginalDialogueText && turnsOriginalDialogueText.trim().length > 0)
            ? turnsOriginalDialogueText
            : topic,
          translated_text: (audioResult.dialogueText && typeof audioResult.dialogueText === 'string' && audioResult.dialogueText.trim().length > 0)
            ? audioResult.dialogueText
            : audioResult.transcript,
          adapted_text: audioResult.transcript,
          input_type: 'podcast',
          created_at: new Date().toISOString(),
          words: Array.isArray(wordsForTiming) && wordsForTiming.length > 0 ? JSON.stringify(wordsForTiming) : null,
          timepoints: Array.isArray(timepoints) && timepoints.length > 0 ? JSON.stringify(timepoints) : (function () {
            logger.warn('[GOOGLE-PODCAST] Warning: Pre-insert check - timepoints is NULL or empty array');
            return null;
          })(),
          dialogue_segments: Array.isArray(dialogueSegments) && dialogueSegments.length > 0 ? JSON.stringify(dialogueSegments) : null,
          tts_provider: 'google-gemini',
          tts_voice_name: requestedModel,
          audio_duration_seconds: estimatedDuration,
          entry_source: 'google-podcast',
          openai_prompt_tokens: openaiCost.promptTokens || 0,
          openai_completion_tokens: openaiCost.completionTokens || 0,
          openai_total_tokens: openaiCost.totalTokens || 0,
          openai_cost_usd: openaiCost.totalCostUsd || 0,
          tts_characters: ttsCharacters,
          tts_category: ttsCategory,
          tts_cost_usd: ttsCostUsd,
          total_cost_usd: totalCostUsd,
        };

        logger.info('[GOOGLE-PODCAST] Cost fields computed for contenthistory', {
          openai_total_tokens: insertData.openai_total_tokens,
          openai_cost_usd: insertData.openai_cost_usd,
          tts_characters: insertData.tts_characters,
          tts_category: insertData.tts_category,
          tts_cost_usd: insertData.tts_cost_usd,
          total_cost_usd: insertData.total_cost_usd,
        });

        // Log costs to api_costs table
        // Log OpenAI script generation cost
        await logApiCost({
          userId,
          feature: 'podcast_script',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputQuantity: openaiCost.promptTokens,
          outputQuantity: openaiCost.completionTokens,
          costUsd: openaiCost.totalCostUsd,
          metadata: { topic, level },
        });
        // Log Google TTS synthesis cost
        await logApiCost({
          userId,
          feature: 'podcast_tts',
          provider: 'google_tts',
          model: requestedModel,
          inputQuantity: ttsCharacters,
          outputQuantity: 0,
          costUsd: ttsCostUsd,
          metadata: { duration_seconds: estimatedDuration },
        });

        const { data, error } = await supabase
          .from('contenthistory')
          .insert(insertData)
          .select();

        if (error) {
          logger.error(`[GOOGLE-PODCAST] Database error saving to contenthistory: ${error.message}`, { code: error.code, details: error.details, hint: error.hint });
        } else if (data && data.length > 0) {
          contentHistoryId = data[0].id;
          logger.info(`[GOOGLE-PODCAST] Saved to contenthistory: ${contentHistoryId}`);
        } else {
          logger.warn('[GOOGLE-PODCAST] Insert returned no data');
        }
      } catch (dbErr) {
        logger.error('[GOOGLE-PODCAST] Failed to save to contenthistory:', {
          message: dbErr?.message,
          name: dbErr?.name,
          code: dbErr?.code,
          stack: dbErr?.stack?.split('\n')[0],
          fullError: JSON.stringify(dbErr, Object.getOwnPropertyNames(dbErr || {}))
        });
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
      dialogue_segments: dialogueSegments || null,
      turns: audioResult.turns,
      turns_original: turnsOriginalForSave,
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
