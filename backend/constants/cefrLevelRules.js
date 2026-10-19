// backend/constants/cefrLevelRules.js
// CEFR level rubric for the Video Factory level-package endpoint.
// Mirrors lingroot-video-factory/config/level-rules.json so generated
// script/audio truly differentiate per level (A1 != C2).

const CEFR_LEVEL_RULES = {
  A1: {
    label: 'Beginner',
    maxSentenceWords: 6,
    vocabulary: 'high-frequency everyday words only',
    grammar: 'present simple; basic nouns/verbs',
    speechRateWpm: 90,
    minimumSceneSentences: 4,
    rubric: 'Very short sentences, concrete vocabulary, no idioms.',
    // Google TTS speakingRate (1.0 = natural). Slower for lower levels.
    speakingRate: 0.80,
  },
  A2: {
    label: 'Elementary',
    maxSentenceWords: 9,
    vocabulary: 'common everyday topics',
    grammar: 'present/past simple; simple connectors',
    speechRateWpm: 100,
    minimumSceneSentences: 3,
    rubric: 'Simple connected sentences about familiar topics.',
    speakingRate: 0.88,
  },
  B1: {
    label: 'Intermediate',
    maxSentenceWords: 14,
    vocabulary: 'everyday + some abstract',
    grammar: 'present perfect, future, conditionals (1st)',
    speechRateWpm: 115,
    minimumSceneSentences: 3,
    rubric: 'Connected text on familiar/abstract topics; clear main points.',
    speakingRate: 0.95,
  },
  B2: {
    label: 'Upper-Intermediate',
    maxSentenceWords: 20,
    vocabulary: 'broad incl. abstract/technical basics',
    grammar: 'passive, conditionals (2nd/3rd), relative clauses',
    speechRateWpm: 130,
    minimumSceneSentences: 3,
    rubric: 'Detailed, nuanced text; clear argumentation.',
    speakingRate: 1.02,
  },
  C1: {
    label: 'Advanced',
    maxSentenceWords: 28,
    vocabulary: 'wide incl. idiomatic and specialized',
    grammar: 'full range incl. complex subordination',
    speechRateWpm: 145,
    minimumSceneSentences: 2,
    rubric: 'Fluent, flexible, well-structured; implicit meaning.',
    speakingRate: 1.08,
  },
  C2: {
    label: 'Proficiency',
    maxSentenceWords: 40,
    vocabulary: 'near-native, precise and idiomatic',
    grammar: 'unrestricted',
    speechRateWpm: 160,
    minimumSceneSentences: 2,
    rubric: 'Effortless, precise, fully natural register.',
    speakingRate: 1.15,
  },
};

const CEFR_LEVELS = Object.keys(CEFR_LEVEL_RULES);

// Maps the contract `voice_profile` strings to Google TTS voices.
// Google Neural2 voices support timing marks and are consistent across levels.
const VOICE_PROFILE_MAP = {
  english_female: { provider: 'google', voiceName: 'en-US-Neural2-F', languageCode: 'en-US', ssmlGender: 'FEMALE' },
  english_male: { provider: 'google', voiceName: 'en-US-Neural2-D', languageCode: 'en-US', ssmlGender: 'MALE' },
  british_female: { provider: 'google', voiceName: 'en-GB-Neural2-A', languageCode: 'en-GB', ssmlGender: 'FEMALE' },
  british_male: { provider: 'google', voiceName: 'en-GB-Neural2-B', languageCode: 'en-GB', ssmlGender: 'MALE' },
  openai_marin: { provider: 'openai', voiceName: 'marin', languageCode: 'en-US' },
  openai_cedar: { provider: 'openai', voiceName: 'cedar', languageCode: 'en-US' },
};

const DEFAULT_VOICE_PROFILE = 'english_female';

module.exports = {
  CEFR_LEVEL_RULES,
  CEFR_LEVELS,
  VOICE_PROFILE_MAP,
  DEFAULT_VOICE_PROFILE,
};
